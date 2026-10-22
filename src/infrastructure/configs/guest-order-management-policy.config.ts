import { GuestOrderManagementPolicy } from "@/domain/policies/guest-order-management.policy";
import { env } from "./env-reader";

export class GuestOrderManagementPolicyEnvConfig implements GuestOrderManagementPolicy {
  maxResendAttemptsPerHour: number;
  resendCooldownInSeconds: number;
  tokenExpiryInHours: number;

  constructor() {
    this.maxResendAttemptsPerHour = env.number("MAX_RESEND_GUEST_ORDER_MANAGEMENT_ATTEMPTS_PER_HOUR", 3);
    this.resendCooldownInSeconds = env.number("GUEST_ORDER_MANAGEMENT_RESEND_COOLDOWN_IN_SECONDS", 60);
    this.tokenExpiryInHours = env.number("GUEST_ORDER_MANAGEMENT_TOKEN_EXPIRY_IN_HOURS", 24);
    this.validate();
  }

  private validate(): void {
    if (this.maxResendAttemptsPerHour <= 0) throw new Error("MAX_RESEND_GUEST_ORDER_MANAGEMENT_ATTEMPTS_PER_HOUR must be greater than 0");
    if (this.resendCooldownInSeconds <= 0) throw new Error("GUEST_ORDER_MANAGEMENT_RESEND_COOLDOWN_IN_SECONDS must be greater than 0");
    if (this.tokenExpiryInHours <= 0) throw new Error("GUEST_ORDER_MANAGEMENT_TOKEN_EXPIRY_IN_HOURS must be greater than 0");
  }
}
