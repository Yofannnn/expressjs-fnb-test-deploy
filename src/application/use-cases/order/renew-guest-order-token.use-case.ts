import { RenewGuestOrderTokenUseCasePort, RenewGuestOrderTokenCommand } from "@/application/ports/driving/renew-guest-order-token.use-case.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { GuestOrderManagementPolicy } from "@/domain/policies/guest-order-management.policy";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { TimeUtil } from "@/utils/time.util";
import {
  GuestOrderTokenRenewCooldownActiveException,
  GuestOrderTokenRenewRateLimitExceededException,
} from "@/application/exceptions/application-token.exceptions";

export class RenewGuestOrderTokenUseCase implements RenewGuestOrderTokenUseCasePort {
  private readonly maxResendAttemptsPerHour: number;
  private readonly resendCooldownInSeconds: number;

  constructor(
    private readonly guestOrderManagementPolicy: GuestOrderManagementPolicy,
    private readonly uow: UnitOfWorkPort,
    private readonly applicationTokenFactory: ApplicationTokenFactory,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {
    this.maxResendAttemptsPerHour = this.guestOrderManagementPolicy.maxResendAttemptsPerHour;
    this.resendCooldownInSeconds = this.guestOrderManagementPolicy.resendCooldownInSeconds;
  }

  async execute({ orderId, email }: RenewGuestOrderTokenCommand): Promise<void> {
    const startTime = Date.now();

    this.logRenewGuestOrderTokenStart(orderId);

    const result = await this.uow.commit(async (repos) => {
      const order = await repos.orderRepository.findById(orderId);

      await this.checkRenewRateLimit(email, repos.applicationTokenRepository);

      if (!order || !order.getCustomer().isGuest()) {
        this.logRenewGuestOrderTokenNoOp(orderId, "order_not_found_or_not_guest");
        return { events: [] as DomainEvent[] };
      }

      const storedEmail = order.getCustomer().getGuestEmail();
      if (!storedEmail || storedEmail.toLowerCase() !== email.trim().toLowerCase()) {
        this.logRenewGuestOrderTokenNoOp(orderId, "email_mismatch");
        return { events: [] as DomainEvent[] };
      }

      await repos.applicationTokenRepository.invalidateByTypeAndIdentifier(ApplicationTokenType.GUEST_ORDER_MANAGEMENT, email);

      const renewedToken = this.applicationTokenFactory.reissueGuestOrderManagement(order);
      await repos.applicationTokenRepository.insert(renewedToken);

      return { events: renewedToken.pullDomainEvents() };
    });

    this.logSuccessfulRenewGuestOrderToken(orderId, startTime);

    await this.eventBus.publishAll(result.events);
  }

  private async checkRenewRateLimit(email: string, applicationTokenRepository: ApplicationTokenRepositoryPort): Promise<void> {
    const recentAttempts = await applicationTokenRepository.countByTypeAndIdentifierWithin(
      ApplicationTokenType.GUEST_ORDER_MANAGEMENT,
      email,
      TimeUtil.hoursToMs(1),
    );

    if (recentAttempts >= this.maxResendAttemptsPerHour) {
      throw new GuestOrderTokenRenewRateLimitExceededException();
    }

    const lastToken = await applicationTokenRepository.findLastTokenByTypeAndIdentifier(ApplicationTokenType.GUEST_ORDER_MANAGEMENT, email);

    if (lastToken) {
      const lastIssuedAt = lastToken.getCreatedAt();
      const secondsSinceLast = (Date.now() - lastIssuedAt.getTime()) / 1000;
      if (secondsSinceLast < this.resendCooldownInSeconds) {
        throw new GuestOrderTokenRenewCooldownActiveException(Math.ceil(this.resendCooldownInSeconds - secondsSinceLast));
      }
    }
  }

  private logRenewGuestOrderTokenStart(orderId: string): void {
    this.logger.debug({
      context: "RenewGuestOrderTokenUseCase",
      event: "GUEST_ORDER_TOKEN_RENEW_STARTED",
      message: "Guest order token renewal started",
      data: { orderId },
    });
  }

  private logRenewGuestOrderTokenNoOp(orderId: string, reason: string): void {
    this.logger.info({
      context: "RenewGuestOrderTokenUseCase",
      event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
      message: "Guest order token renewal request did not result in a new token",
      data: { orderId, reason },
    });
  }

  private logSuccessfulRenewGuestOrderToken(orderId: string, startTime: number): void {
    this.logger.info({
      context: "RenewGuestOrderTokenUseCase",
      event: "GUEST_ORDER_TOKEN_RENEW_COMPLETED",
      message: "Guest order token renewal request completed",
      durationMs: Date.now() - startTime,
      data: { orderId },
    });
  }
}
