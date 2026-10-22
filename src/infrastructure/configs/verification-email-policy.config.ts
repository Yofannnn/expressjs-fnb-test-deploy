import { VerificationEmailPolicy } from "@/domain/policies/verification-email.policy";
import { env } from "./env-reader";

export class VerificationEmailPolicyEnvConfig implements VerificationEmailPolicy {
  readonly expiryInHours: number;
  readonly resendCooldownInSeconds: number;
  readonly maxResendAttemptsPerHour: number;

  constructor() {
    this.expiryInHours = env.number("VERIFICATION_EMAIL_EXPIRY_IN_HOURS", 24);
    this.resendCooldownInSeconds = env.number("VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS", 60);
    this.maxResendAttemptsPerHour = env.number("MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR", 3);
    this.validate();
  }

  private validate(): void {
    if (this.expiryInHours <= 0) throw new Error("VERIFICATION_EMAIL_EXPIRY_IN_HOURS must be greater than 0");
    if (this.maxResendAttemptsPerHour <= 0) throw new Error("MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR must be greater than 0");
  }
}
