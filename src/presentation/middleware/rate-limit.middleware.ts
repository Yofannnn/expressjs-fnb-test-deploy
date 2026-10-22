import { Request, Response, NextFunction } from "express";
import { ApiRateLimit, ApiRateLimitPolicy } from "@/infrastructure/rate-limit/api-rate-limit.type";

export function rateLimitMiddleware(apiRateLimit: ApiRateLimit, apiRateLimitPolicy: ApiRateLimitPolicy) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await apiRateLimit.check(`${req.method}:${req.baseUrl}${req.path}`, apiRateLimitPolicy);
    next();
  };
}
