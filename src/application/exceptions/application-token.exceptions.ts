import { BaseApplicationException } from "./base-application.exception";

export class VerificationTokenNotFoundException extends BaseApplicationException {
  override readonly name = "VerificationTokenNotFoundException";
  constructor() {
    super("Email verification token is invalid or has expired");
  }
}

export class VerificationTokenRateLimitExceededException extends BaseApplicationException {
  override readonly name = "VerificationTokenRateLimitExceededException";
  constructor(retryAfterInSeconds: number) {
    super(`Email verification token resend rate limit exceeded, please try again in ${retryAfterInSeconds} seconds`);
    this.withDetails({ retryAfterInSeconds });
  }
}

export class ResetTokenNotFoundException extends BaseApplicationException {
  override readonly name = "ResetTokenNotFoundException";
  constructor() {
    super("Password reset token is invalid or has expired");
  }
}

export class ResetTokenRateLimitExceededException extends BaseApplicationException {
  override readonly name = "ResetTokenRateLimitExceededException";
  constructor(retryAfterInSeconds: number) {
    super(`Password reset token resend rate limit exceeded, please try again in ${retryAfterInSeconds} seconds`);
    this.withDetails({ retryAfterInSeconds });
  }
}

export class GuestOrderTokenNotFoundException extends BaseApplicationException {
  override readonly name = "GuestOrderTokenNotFoundException";
  constructor() {
    super("Guest token is invalid or has expired");
  }
}

export class GuestOrderTokenRenewRateLimitExceededException extends BaseApplicationException {
  override readonly name = "GuestOrderTokenRenewRateLimitExceededException";
  constructor() {
    super("Guest token renew rate limit exceeded");
  }
}

export class GuestOrderTokenRenewCooldownActiveException extends BaseApplicationException {
  override readonly name = "GuestOrderTokenRenewCooldownActiveException";
  constructor(retryAfterSeconds: number) {
    super(`Guest token renew cooldown active, retry after ${retryAfterSeconds} seconds`);
    this.withDetails({ retryAfterSeconds });
  }
}
