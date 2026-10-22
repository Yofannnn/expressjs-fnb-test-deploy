import { ApiRateLimitPolicy } from "@/infrastructure/rate-limit/api-rate-limit.type";

export const PRODUCT_RATE_LIMIT_POLICY = {
  CREATE_PRODUCT: {
    authenticated: { maxAttempts: 30, burst: 10 },
    anonymous: { maxAttempts: 0, burst: 0 },
    windowSeconds: 60,
  },

  UPDATE_PRODUCT: {
    authenticated: { maxAttempts: 60, burst: 20 },
    anonymous: { maxAttempts: 0, burst: 0 },
    windowSeconds: 60,
  },

  UPDATE_PRODUCT_STOCK: {
    authenticated: { maxAttempts: 60, burst: 20 },
    anonymous: { maxAttempts: 0, burst: 0 },
    windowSeconds: 60,
  },

  UPDATE_PRODUCT_STATUS: {
    authenticated: { maxAttempts: 60, burst: 20 },
    anonymous: { maxAttempts: 0, burst: 0 },
    windowSeconds: 60,
  },

  UPDATE_PRODUCT_IMAGE: {
    authenticated: { maxAttempts: 60, burst: 20 },
    anonymous: { maxAttempts: 0, burst: 0 },
    windowSeconds: 60,
  },

  GET_PRODUCT_DETAILS: {
    authenticated: { maxAttempts: 600, burst: 100 },
    anonymous: { maxAttempts: 300, burst: 50 },
    windowSeconds: 60,
  },

  GET_PRODUCTS_BY_IDS: {
    authenticated: { maxAttempts: 600, burst: 100 },
    anonymous: { maxAttempts: 300, burst: 50 },
    windowSeconds: 60,
  },

  BROWSE_PRODUCTS: {
    authenticated: { maxAttempts: 300, burst: 50 },
    anonymous: { maxAttempts: 120, burst: 20 },
    windowSeconds: 60,
  },

  SEARCH_PRODUCTS: {
    authenticated: { maxAttempts: 180, burst: 30 },
    anonymous: { maxAttempts: 60, burst: 10 },
    windowSeconds: 60,
  },
} as const satisfies Record<string, ApiRateLimitPolicy>;
