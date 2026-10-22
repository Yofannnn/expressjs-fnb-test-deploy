import { ApiRateLimitPolicy } from "@/infrastructure/rate-limit/api-rate-limit.type";

export const ORDER_RATE_LIMIT_POLICY = {
  CREATE_ONLINE_ORDER: {
    authenticated: { maxAttempts: 5, burst: 10 },
    anonymous: { maxAttempts: 3, burst: 5 },
    windowSeconds: 300,
  },

  CREATE_DINEIN_ORDER: {
    authenticated: { maxAttempts: 5, burst: 10 },
    anonymous: { maxAttempts: 0, burst: 0 },
    windowSeconds: 300,
  },

  CREATE_RESERVATION_ORDER: {
    authenticated: { maxAttempts: 5, burst: 10 },
    anonymous: { maxAttempts: 3, burst: 5 },
    windowSeconds: 300,
  },

  GET_ORDER_DETAILS: {
    authenticated: { maxAttempts: 600, burst: 100 },
    anonymous: { maxAttempts: 300, burst: 50 },
    windowSeconds: 60,
  },

  GET_ONLINE_ORDER_QUOTE: {
    authenticated: { maxAttempts: 800, burst: 150 },
    anonymous: { maxAttempts: 600, burst: 100 },
    windowSeconds: 60,
  },

  BROWSE_ORDERS: {
    authenticated: { maxAttempts: 300, burst: 50 },
    anonymous: { maxAttempts: 120, burst: 20 },
    windowSeconds: 60,
  },

  RENEW_GUEST_ORDER_TOKEN: {
    authenticated: { maxAttempts: 0, burst: 0 },
    anonymous: { maxAttempts: 5, burst: 10 },
    windowSeconds: 300,
  },
} as const satisfies Record<string, ApiRateLimitPolicy>;
