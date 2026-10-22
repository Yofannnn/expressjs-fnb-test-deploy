import { LoginSecurityPolicy } from "@/domain/policies/login-security.policy";
import { env } from "./env-reader";

export class LoginSecurityPolicyEnvConfig implements LoginSecurityPolicy {
  readonly accountLockDurationInMinutes: number;
  readonly maxLoginAttempts: number;

  constructor() {
    this.accountLockDurationInMinutes = env.number("ACCOUNT_LOCK_DURATION_IN_MINUTES", 5);
    this.maxLoginAttempts = env.number("MAX_LOGIN_ATTEMPTS", 5);
    this.validate();
  }

  private validate(): void {
    if (this.maxLoginAttempts <= 0) throw new Error("MAX_LOGIN_ATTEMPTS must be positive");
    if (this.accountLockDurationInMinutes <= 0) throw new Error("ACCOUNT_LOCK_DURATION_IN_MINUTES must be positive");
  }
}
