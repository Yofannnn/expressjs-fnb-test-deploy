import {
  ValidateResetTokenUseCasePort,
  ValidateResetTokenCommand,
  ValidateResetTokenResult,
} from "@/application/ports/driving/validate-reset-token.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PasswordResetToken } from "@/domain/entities/application-token.entity";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { PasswordResetPolicy } from "@/domain/policies/password-reset.policy";
import { ResetTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";

export class ValidateResetTokenUseCase implements ValidateResetTokenUseCasePort {
  constructor(
    private readonly passwordResetPolicy: PasswordResetPolicy,
    private readonly applicationTokenRepository: ApplicationTokenRepositoryPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ resetPasswordToken }: ValidateResetTokenCommand): Promise<ValidateResetTokenResult> {
    const startTime = Date.now();

    this.logValidateResetTokenStart();

    const tokenEntity = await this.findAndValidateTokenForUI(resetPasswordToken, this.applicationTokenRepository);

    this.logSuccessfulValidateResetToken(startTime);

    return {
      expiresAt: tokenEntity.getExpiresAt(),
      remainingTimeMs: tokenEntity.getRemainingTimeMs(),
    };
  }

  private async findAndValidateTokenForUI(token: string, applicationTokenRepository: ApplicationTokenRepositoryPort): Promise<PasswordResetToken> {
    const tokenFingerprint = this.fingerprintProvider.fingerprint(token);

    const passwordResetToken = await applicationTokenRepository.findByTokenFingerprint(tokenFingerprint);
    if (!passwordResetToken || !(passwordResetToken instanceof PasswordResetToken)) throw new ResetTokenNotFoundException();

    passwordResetToken.assertWithinGracePeriod(this.passwordResetPolicy.gracePeriodMs);

    return passwordResetToken;
  }

  private logValidateResetTokenStart(): void {
    this.logger.debug({
      context: "ValidateResetTokenUseCase",
      event: "VALIDATE_RESET_TOKEN_STARTED",
      message: "Validate reset token started",
    });
  }

  private logSuccessfulValidateResetToken(startTime: number): void {
    this.logger.debug({
      context: "ValidateResetTokenUseCase",
      event: "VALIDATE_RESET_TOKEN_COMPLETED",
      message: "Validate reset token completed",
      durationMs: Date.now() - startTime,
    });
  }
}
