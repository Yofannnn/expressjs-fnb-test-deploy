import { VerifyEmailUseCasePort, VerifyEmailCommand, VerifyEmailResult } from "@/application/ports/driving/verify-email.use-case.port";
import { User } from "@/domain/entities/user.entity";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { VerificationEmailToken } from "@/domain/entities/application-token.entity";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { VerificationTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";

export class VerifyEmailUseCase implements VerifyEmailUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ verifyEmailToken }: VerifyEmailCommand): Promise<VerifyEmailResult> {
    const startTime = Date.now();

    this.logEmailVerificationStart();

    const result = await this.uow.commit(async (repos) => {
      const verificationEmailToken = await this.findVerificationEmail(verifyEmailToken, repos.applicationTokenRepository);
      const user = await this.findUser(verificationEmailToken.getUserId(), repos.userRepository);

      user.verifyEmail();
      verificationEmailToken.use();

      await Promise.all([repos.userRepository.update(user), repos.applicationTokenRepository.update(verificationEmailToken)]);

      const events = [...user.pullDomainEvents(), ...verificationEmailToken.pullDomainEvents()];

      return { events, user, verificationEmailToken };
    });

    this.logSuccessfulEmailVerification(result.user, startTime);

    await this.eventBus.publishAll(result.events);

    return { userId: result.user.getId() };
  }

  private async findVerificationEmail(token: string, applicationTokenRepo: ApplicationTokenRepositoryPort): Promise<VerificationEmailToken> {
    const tokenFingerprint = this.fingerprintProvider.fingerprint(token);

    const verificationEmailToken = await applicationTokenRepo.findByTokenFingerprint(tokenFingerprint);
    if (!verificationEmailToken || !(verificationEmailToken instanceof VerificationEmailToken)) throw new VerificationTokenNotFoundException();

    return verificationEmailToken;
  }

  private async findUser(userId: string, userRepo: UserRepositoryPort): Promise<User> {
    const user = await userRepo.findById(userId);
    if (!user) throw new UserNotFoundException();
    return user;
  }

  private logEmailVerificationStart() {
    this.logger.debug({
      context: "VerifyEmailUseCase",
      event: "EMAIL_VERIFICATION_STARTED",
      message: "Email verification started",
    });
  }

  private logSuccessfulEmailVerification(user: User, startTime: number) {
    this.logger.info({
      context: "VerifyEmailUseCase",
      event: "EMAIL_VERIFICATION_SUCCESSFUL",
      message: `User verified email successfully`,
      userId: user.getId(),
      durationMs: Date.now() - startTime,
      data: {
        role: user.getRole(),
      },
    });
  }
}
