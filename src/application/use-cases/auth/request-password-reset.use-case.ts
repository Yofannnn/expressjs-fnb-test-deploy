import { RequestPasswordResetUseCasePort, RequestPasswordResetCommand } from "@/application/ports/driving/request-password-reset.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { User } from "@/domain/entities/user.entity";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { TimeUtil } from "@/utils/time.util";
import { PasswordResetPolicy } from "@/domain/policies/password-reset.policy";
import { ResetTokenRateLimitExceededException } from "@/application/exceptions/application-token.exceptions";

export class RequestPasswordResetUseCase implements RequestPasswordResetUseCasePort {
  private readonly maxResendAttemptsPerHour: number;
  private readonly passwordResetResendCooldownInSeconds: number;

  constructor(
    private readonly passwordResetPolicy: PasswordResetPolicy,
    private readonly uow: UnitOfWorkPort,
    private readonly applicationTokenFactory: ApplicationTokenFactory,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {
    this.maxResendAttemptsPerHour = this.passwordResetPolicy.maxResendAttemptsPerHour;
    this.passwordResetResendCooldownInSeconds = this.passwordResetPolicy.resendCooldownInSeconds;
  }

  async execute({ email }: RequestPasswordResetCommand): Promise<void> {
    const startTime = Date.now();

    this.logRequestPasswordResetStart();

    const result = await this.uow.commit(async (repos) => {
      const user = await repos.userRepository.findByEmail(email);
      if (!user) return { events: [] };

      await this.checkPasswordResetRateLimit(user, repos.applicationTokenRepository);
      await repos.applicationTokenRepository.invalidateByTypeAndIdentifier(ApplicationTokenType.PASSWORD_RESET, user.getEmail());

      const newResetToken = this.applicationTokenFactory.issuePasswordReset(user);
      await repos.applicationTokenRepository.insert(newResetToken);

      const events = newResetToken.pullDomainEvents();

      return { events, user };
    });

    this.logSuccessfulRequestPasswordReset(email, startTime);

    await this.eventBus.publishAll(result.events);
  }

  private async checkPasswordResetRateLimit(user: User, applicationTokenRepository: ApplicationTokenRepositoryPort): Promise<void> {
    const recentTokenCount = await applicationTokenRepository.countByTypeAndIdentifierWithin(
      ApplicationTokenType.PASSWORD_RESET,
      user.getEmail(),
      TimeUtil.hoursToMs(1),
    );

    if (recentTokenCount >= this.maxResendAttemptsPerHour) {
      throw new ResetTokenRateLimitExceededException(3600);
    }

    const lastToken = await applicationTokenRepository.findLastTokenByTypeAndIdentifier(ApplicationTokenType.PASSWORD_RESET, user.getEmail());
    if (lastToken) {
      const lastTokenCreatedAt = lastToken.getCreatedAt().getTime();
      const retryAfterInSeconds = this.passwordResetResendCooldownInSeconds - Math.floor((Date.now() - lastTokenCreatedAt) / 1000);
      if (retryAfterInSeconds > 0) {
        throw new ResetTokenRateLimitExceededException(retryAfterInSeconds);
      }
    }
  }

  private logRequestPasswordResetStart(): void {
    this.logger.debug({
      context: "RequestPasswordResetUseCase",
      event: "REQUEST_PASSWORD_RESET_STARTED",
      message: "Request password reset started",
    });
  }

  private logSuccessfulRequestPasswordReset(email: string, startTime: number): void {
    this.logger.info({
      context: "RequestPasswordResetUseCase",
      event: "REQUEST_PASSWORD_RESET_SUCCESSFUL",
      message: `User requested password reset successfully`,
      durationMs: Date.now() - startTime,
      data: {
        email,
      },
    });
  }
}
