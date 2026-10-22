export interface LimitOptions {
  maxAttempts: number;
  burst?: number;
}

export interface ApiRateLimitPolicy {
  windowSeconds: number;
  anonymous: LimitOptions;
  authenticated: LimitOptions;
}

export interface ApiRateLimit {
  check(executionContext: string, options: ApiRateLimitPolicy): Promise<void>;
}
