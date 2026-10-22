import { ApiRateLimitPolicy } from "@/infrastructure/rate-limit/api-rate-limit.type";

export const USER_RATE_LIMIT_POLICY = {
  GET_PROFILE: {
    authenticated: { maxAttempts: 60, burst: 10 },
    anonymous: { maxAttempts: 5, burst: 2 },
    windowSeconds: 300,
  },
} as const satisfies Record<string, ApiRateLimitPolicy>;
