import { env } from "./env-reader";

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
}

export class JwtEnvConfig implements JwtConfig {
  readonly accessSecret: string;
  readonly refreshSecret: string;

  constructor() {
    this.accessSecret = env.string("JWT_ACCESS_SECRET");
    this.refreshSecret = env.string("JWT_REFRESH_SECRET");
    this.validate();
  }

  private validate(): void {
    if (this.accessSecret.length < 32) throw new Error("JWT_ACCESS_SECRET must be at least 32 chars");
    if (this.refreshSecret.length < 32) throw new Error("JWT_REFRESH_SECRET must be at least 32 chars");
  }
}
