import { ApiRateLimitPolicy } from "@/infrastructure/rate-limit/api-rate-limit.type";

export const PAYMENT_RATE_LIMIT_POLICY = {
  INIT_CHARGE: {
    authenticated: { maxAttempts: 5, burst: 10 },
    anonymous: { maxAttempts: 3, burst: 5 },
    windowSeconds: 300,
  },

  GET_PAYMENT_DETAILS: {
    authenticated: { maxAttempts: 600, burst: 100 },
    anonymous: { maxAttempts: 300, burst: 50 },
    windowSeconds: 60,
  },

  GET_PAYMENTS_BY_ORDER_ID: {
    authenticated: { maxAttempts: 600, burst: 100 },
    anonymous: { maxAttempts: 300, burst: 50 },
    windowSeconds: 60,
  },
} as const satisfies Record<string, ApiRateLimitPolicy>;
