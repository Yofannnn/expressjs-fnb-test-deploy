import { Request, Response } from "express";
import { RedisConnectionManager } from "@/infrastructure/cache/redis-connection";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";

export class HealthController {
  constructor(
    private readonly dbClient: PrismaDatabaseClient,
    private readonly redisConnection: RedisConnectionManager,
  ) {}

  async check(req: Request, res: Response) {
    const startTime = Date.now();

    const timeout = (promise: Promise<unknown>, timeoutMs: number) =>
      Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs))]);

    const results = await Promise.allSettled([timeout(this.dbClient.healthCheck(), 3000), timeout(this.redisConnection.checkHealth(), 2000)]);

    const [dbResult, redisResult] = results;

    const dbHealthy = dbResult.status === "fulfilled" && dbResult.value === true;
    const cacheHealthy = redisResult.status === "fulfilled" && redisResult.value === true;

    const isHealthy = dbHealthy && cacheHealthy;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      responseTime: `${Date.now() - startTime}ms`,
    });
  }
}
