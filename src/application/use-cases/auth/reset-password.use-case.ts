import { ResetPasswordUseCasePort, ResetPasswordCommand } from "@/application/ports/driving/reset-password.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { User } from "@/domain/entities/user.entity";
import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { PasswordResetToken } from "@/domain/entities/application-token.entity";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { PasswordResetPolicy } from "@/domain/policies/password-reset.policy";
import { ResetTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";
import { PasswordHasherPort } from "@/application/ports/driven/password-hasher.port";

export class ResetPasswordUseCase implements ResetPasswordUseCasePort {
  constructor(
    private readonly PasswordResetPolicy: PasswordResetPolicy,
    private readonly uow: UnitOfWorkPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ resetPasswordToken, newPassword }: ResetPasswordCommand): Promise<void> {
    const startTime = Date.now();

    this.logResetPasswordStart();

    const result = await this.uow.commit(async (repos) => {
      const passwordResetToken = await this.findPasswordReset(resetPasswordToken, repos.applicationTokenRepository);
      const user = await this.findUser(passwordResetToken.getUserId(), repos.userRepository);

      await this.processResetPassword(newPassword, user, passwordResetToken);

      /**
       * change password
       * update token
       * and invalidate all sessions
       */
      await Promise.all([
        repos.userRepository.update(user),
        repos.applicationTokenRepository.update(passwordResetToken),
        repos.sessionRepository.revokeAllSessionsForUser(user.getId()),
      ]);

      const events = [...user.pullDomainEvents(), ...passwordResetToken.pullDomainEvents()];

      return { events, user };
    });

    this.logSuccessfulResetPassword(result.user, startTime);

    await this.eventBus.publishAll(result.events);
  }

  private async findPasswordReset(token: string, applicationTokenRepo: ApplicationTokenRepositoryPort): Promise<PasswordResetToken> {
    const tokenFingerprint = this.fingerprintProvider.fingerprint(token);

    const passwordResetToken = await applicationTokenRepo.findByTokenFingerprint(tokenFingerprint);
    if (!passwordResetToken || !(passwordResetToken instanceof PasswordResetToken)) throw new ResetTokenNotFoundException();

    return passwordResetToken;
  }

  private async findUser(userId: string, userRepo: UserRepositoryPort): Promise<User> {
    const user = await userRepo.findById(userId);
    if (!user) throw new UserNotFoundException();
    return user;
  }

  private async processResetPassword(newPassword: string, user: User, passwordResetToken: PasswordResetToken): Promise<void> {
    const isSameAsCurrentPassword = await this.passwordHasher.comparePassword(newPassword, user.getHashedPasswordForAuthentication());

    passwordResetToken.assertWithinGracePeriod(this.PasswordResetPolicy.gracePeriodMs);

    const newPasswordHash = await this.passwordHasher.hashPassword(newPassword);
    user.changePassword(newPasswordHash, isSameAsCurrentPassword);

    passwordResetToken.use();
  }

  private logResetPasswordStart() {
    this.logger.debug({
      context: "ResetPasswordUseCase",
      event: "RESET_PASSWORD_STARTED",
      message: "Reset password started",
    });
  }

  private logSuccessfulResetPassword(user: User, startTime: number) {
    this.logger.info({
      context: "ResetPasswordUseCase",
      event: "RESET_PASSWORD_SUCCESSFUL",
      message: `User reset password successfully`,
      userId: user.getId(),
      durationMs: Date.now() - startTime,
      data: {
        role: user.getRole(),
      },
    });
  }
}
