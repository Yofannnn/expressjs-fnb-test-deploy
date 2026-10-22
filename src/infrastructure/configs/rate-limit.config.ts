import { env } from "./env-reader";

export type RateLimitStrategyOnCircuitOpen = "allow" | "deny" | "throttle";

export type RateLimitStrategyOnError = "allow" | "deny";

export interface RateLimitConfig {
  cooldownPeriodInMs: number;
  rateLimitErrorStrategy: RateLimitStrategyOnError;
  circuitOpenStrategy: RateLimitStrategyOnCircuitOpen;
  securityAlertsEnabled: boolean;
}

export class RateLimitEnvConfig implements RateLimitConfig {
  readonly cooldownPeriodInMs: number;
  readonly rateLimitErrorStrategy: RateLimitStrategyOnError;
  readonly circuitOpenStrategy: RateLimitStrategyOnCircuitOpen;
  readonly securityAlertsEnabled: boolean;

  constructor() {
    this.cooldownPeriodInMs = env.number("RATE_LIMIT_COOLDOWN_PERIOD_IN_MS", 30000);
    this.rateLimitErrorStrategy = env.string("RATE_LIMIT_ERROR_STRATEGY", "allow") as RateLimitStrategyOnError;
    this.circuitOpenStrategy = env.string("RATE_LIMIT_CIRCUIT_OPEN_STRATEGY", "throttle") as RateLimitStrategyOnCircuitOpen;
    this.securityAlertsEnabled = env.boolean("RATE_LIMIT_SECURITY_ALERTS");
    this.validate();
  }

  private validate(): void {
    if (this.cooldownPeriodInMs <= 0) throw new Error("RATE_LIMIT_COOLDOWN_PERIOD_IN_MS must be greater than 0");
  }
}
