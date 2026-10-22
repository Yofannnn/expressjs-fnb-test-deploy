import { PasswordResetPolicy } from "@/domain/policies/password-reset.policy";
import { env } from "./env-reader";

export class PasswordResetPolicyEnvConfig implements PasswordResetPolicy {
  readonly resendCooldownInSeconds: number;
  readonly expiryInMinutes: number;
  readonly gracePeriodMs: number;
  readonly maxResendAttemptsPerHour: number;

  constructor() {
    this.resendCooldownInSeconds = env.number("PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS", 60);
    this.expiryInMinutes = env.number("PASSWORD_RESET_EXPIRY_IN_MINUTES", 15);
    this.gracePeriodMs = env.number("PASSWORD_RESET_GRACE_PERIOD_IN_MS", 30000);
    this.maxResendAttemptsPerHour = env.number("MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR", 3);
    this.validate();
  }

  private validate(): void {
    if (this.expiryInMinutes <= 0) throw new Error("PASSWORD_RESET_EXPIRY_IN_MINUTES must be greater than 0");
    if (this.maxResendAttemptsPerHour <= 0) throw new Error("MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR must be greater than 0");
  }
}
