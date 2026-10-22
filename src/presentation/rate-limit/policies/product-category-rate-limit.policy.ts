import { ApiRateLimitPolicy } from "@/infrastructure/rate-limit/api-rate-limit.type";

export const PRODUCT_CATEGORY_RATE_LIMIT_POLICY = {
  CREATE_PRODUCT_CATEGORY: {
    authenticated: { maxAttempts: 30, burst: 10 },
    anonymous: { maxAttempts: 0, burst: 0 },
    windowSeconds: 60,
  },

  UPDATE_PRODUCT_CATEGORY: {
    authenticated: { maxAttempts: 60, burst: 20 },
    anonymous: { maxAttempts: 0, burst: 0 },
    windowSeconds: 60,
  },

  REORDER_PRODUCT_CATEGORIES: {
    authenticated: { maxAttempts: 60, burst: 20 },
    anonymous: { maxAttempts: 0, burst: 0 },
    windowSeconds: 60,
  },

  GET_PRODUCT_CATEGORY_DETAIL: {
    authenticated: { maxAttempts: 600, burst: 100 },
    anonymous: { maxAttempts: 300, burst: 50 },
    windowSeconds: 60,
  },

  BROWSE_PRODUCT_CATEGORIES: {
    authenticated: { maxAttempts: 300, burst: 50 },
    anonymous: { maxAttempts: 120, burst: 20 },
    windowSeconds: 60,
  },
} as const satisfies Record<string, ApiRateLimitPolicy>;
