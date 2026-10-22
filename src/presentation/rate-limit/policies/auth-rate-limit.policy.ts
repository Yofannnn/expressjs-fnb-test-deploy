import { ApiRateLimitPolicy } from "@/infrastructure/rate-limit/api-rate-limit.type";

export const AUTH_RATE_LIMIT_POLICY = {
  REGISTER: {
    authenticated: { maxAttempts: 1, burst: 2 },
    anonymous: { maxAttempts: 3, burst: 5 },
    windowSeconds: 300,
  },

  LOGIN: {
    authenticated: { maxAttempts: 10, burst: 20 },
    anonymous: { maxAttempts: 5, burst: 10 },
    windowSeconds: 300,
  },

  LOGOUT: {
    authenticated: { maxAttempts: 10, burst: 20 },
    anonymous: { maxAttempts: 5, burst: 10 },
    windowSeconds: 300,
  },

  REFRESH_SESSION: {
    authenticated: { maxAttempts: 20, burst: 30 },
    anonymous: { maxAttempts: 20, burst: 30 },
    windowSeconds: 300,
  },

  VERIFY_EMAIL: {
    authenticated: { maxAttempts: 10, burst: 15 },
    anonymous: { maxAttempts: 5, burst: 8 },
    windowSeconds: 300,
  },

  RESEND_VERIFICATION_EMAIL: {
    authenticated: { maxAttempts: 3, burst: 5 },
    anonymous: { maxAttempts: 2, burst: 3 },
    windowSeconds: 600,
  },

  PASSWORD_RESET_REQUEST: {
    authenticated: { maxAttempts: 3, burst: 5 },
    anonymous: { maxAttempts: 2, burst: 3 },
    windowSeconds: 600,
  },

  VALIDATE_RESET_TOKEN: {
    authenticated: { maxAttempts: 10, burst: 15 },
    anonymous: { maxAttempts: 5, burst: 8 },
    windowSeconds: 300,
  },

  RESET_PASSWORD: {
    authenticated: { maxAttempts: 10, burst: 15 },
    anonymous: { maxAttempts: 5, burst: 10 },
    windowSeconds: 300,
  },
} as const satisfies Record<string, ApiRateLimitPolicy>;
