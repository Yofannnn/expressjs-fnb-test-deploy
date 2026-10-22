import { BaseDomainException } from "./base-domain.exception";

export class VerificationEmailTokenExpiredException extends BaseDomainException {
  override readonly name = "VerificationEmailTokenExpiredException";
  constructor(expiresAt: Date) {
    super("Verification email token has expired.");
    this.withDetails({ expiresAt });
  }
}

export class VerificationEmailTokenAlreadyUsedException extends BaseDomainException {
  override readonly name = "VerificationEmailTokenAlreadyUsedException";
  constructor(usedAt: Date) {
    super("Verification email token already used.");
    this.withDetails({ usedAt });
  }
}

export class PasswordResetTokenExpiredException extends BaseDomainException {
  override readonly name = "PasswordResetTokenExpiredException";
  constructor(expiresAt: Date) {
    super("Password reset token has expired.");
    this.withDetails({ expiresAt });
  }
}

export class PasswordResetTokenExpiredBeyondGracePeriodException extends BaseDomainException {
  override readonly name = "PasswordResetTokenExpiredBeyondGracePeriodException";
  constructor(expiresAt: Date) {
    super("Password reset token expired beyond grace period");
    this.withDetails({ expiresAt });
  }
}

export class PasswordResetTokenAlreadyUsedException extends BaseDomainException {
  override readonly name = "PasswordResetTokenAlreadyUsedException";
  constructor(usedAt: Date) {
    super("Password reset token already used.");
    this.withDetails({ usedAt });
  }
}

export class GuestOrderManagementTokenExpiredException extends BaseDomainException {
  override readonly name = "GuestOrderManagementTokenExpiredException";
  constructor(expiresAt: Date) {
    super("Guest order management token has expired.");
    this.withDetails({ expiresAt });
  }
}
