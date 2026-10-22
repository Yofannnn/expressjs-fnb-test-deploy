import { SessionPolicy } from "@/domain/policies/session.policy";
import { env } from "./env-reader";

export class SessionPolicyEnvConfig implements SessionPolicy {
  readonly accessTokenLifetimeMinutes: number;
  readonly refreshTokenLifetimeDays: number;

  constructor() {
    this.accessTokenLifetimeMinutes = env.number("ACCESS_TOKEN_LIFETIME_MINUTES", 15);
    this.refreshTokenLifetimeDays = env.number("REFRESH_TOKEN_LIFETIME_DAYS", 30);
    this.validate();
  }

  private validate(): void {
    if (this.accessTokenLifetimeMinutes <= 0) throw new Error("ACCESS_TOKEN_LIFETIME_MINUTES must be greater than 0");
    if (this.refreshTokenLifetimeDays <= 0) throw new Error("REFRESH_TOKEN_LIFETIME_DAYS must be greater than 0");
    if (this.refreshTokenLifetimeDays * 24 * 60 <= this.accessTokenLifetimeMinutes) {
      throw new Error("REFRESH_TOKEN_LIFETIME_DAYS must outlast ACCESS_TOKEN_LIFETIME_MINUTES");
    }
  }
}
