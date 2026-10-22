import {
  ResendVerificationEmailUseCasePort,
  ResendVerificationEmailCommand,
} from "@/application/ports/driving/resend-verification-email.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { User } from "@/domain/entities/user.entity";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { TimeUtil } from "@/utils/time.util";
import { VerificationEmailPolicy } from "@/domain/policies/verification-email.policy";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { VerificationTokenRateLimitExceededException } from "@/application/exceptions/application-token.exceptions";

export class ResendVerificationEmailUseCase implements ResendVerificationEmailUseCasePort {
  private readonly maxResendAttemptsPerHour: number;
  private readonly verificationEmailResendCooldownInSeconds: number;

  constructor(
    private readonly verificationEmailPolicy: VerificationEmailPolicy,
    private readonly uow: UnitOfWorkPort,
    private readonly applicationTokenFactory: ApplicationTokenFactory,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {
    this.maxResendAttemptsPerHour = this.verificationEmailPolicy.maxResendAttemptsPerHour;
    this.verificationEmailResendCooldownInSeconds = this.verificationEmailPolicy.resendCooldownInSeconds;
  }

  async execute({ userId }: ResendVerificationEmailCommand): Promise<void> {
    const startTime = Date.now();

    this.logResendVerificationEmailStart();

    const result = await this.uow.commit(async (repos) => {
      const user = await repos.userRepository.findById(userId);
      if (!user) throw new UserNotFoundException();

      await this.checkVerificationEmailRateLimit(user, repos.applicationTokenRepository);
      await repos.applicationTokenRepository.invalidateByTypeAndIdentifier(ApplicationTokenType.VERIFICATION_EMAIL, user.getEmail());

      const newVerificationToken = this.applicationTokenFactory.reissueVerificationEmail(user);
      await repos.applicationTokenRepository.insert(newVerificationToken);

      const events = newVerificationToken.pullDomainEvents();

      return { events, user };
    });

    this.logSuccessfulResendVerificationEmail(result.user, startTime);

    await this.eventBus.publishAll(result.events);

    return;
  }

  private async checkVerificationEmailRateLimit(user: User, applicationTokenRepository: ApplicationTokenRepositoryPort): Promise<void> {
    const recentTokenCount = await applicationTokenRepository.countByTypeAndIdentifierWithin(
      ApplicationTokenType.VERIFICATION_EMAIL,
      user.getEmail(),
      TimeUtil.hoursToMs(1),
    );

    if (recentTokenCount >= this.maxResendAttemptsPerHour) {
      throw new VerificationTokenRateLimitExceededException(3600);
    }

    const lastToken = await applicationTokenRepository.findLastTokenByTypeAndIdentifier(ApplicationTokenType.VERIFICATION_EMAIL, user.getEmail());
    if (lastToken) {
      const lastTokenCreatedAt = lastToken.getCreatedAt().getTime();
      const retryAfterInSeconds = this.verificationEmailResendCooldownInSeconds - Math.floor((Date.now() - lastTokenCreatedAt) / 1000);
      if (retryAfterInSeconds > 0) {
        throw new VerificationTokenRateLimitExceededException(retryAfterInSeconds);
      }
    }
  }

  private logResendVerificationEmailStart(): void {
    this.logger.debug({
      context: "ResendVerificationEmailUseCase",
      event: "RESEND_VERIFICATION_EMAIL_STARTED",
      message: "Resend verification email started",
    });
  }

  private logSuccessfulResendVerificationEmail(user: User, startTime: number): void {
    this.logger.info({
      context: "ResendVerificationEmailUseCase",
      event: "RESEND_VERIFICATION_EMAIL_SUCCESSFUL",
      message: "Resend verification email successfully",
      durationMs: Date.now() - startTime,
      userId: user.getId(),
      data: {
        role: user.getRole(),
      },
    });
  }
}
