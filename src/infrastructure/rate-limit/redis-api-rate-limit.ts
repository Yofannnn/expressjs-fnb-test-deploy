import { ApiRateLimit, ApiRateLimitPolicy } from "@/infrastructure/rate-limit/api-rate-limit.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { RateLimitConfig } from "../configs/rate-limit.config";
import { RedisConnectionManager } from "../cache/redis-connection";
import { BaseInfrastructureException } from "../exceptions/infrastructure.exceptions";
import { CircuitBreaker } from "../circuit-breaker/circuit-breaker";
import { CircuitBreakerFactory } from "../circuit-breaker/circuit-breaker.factory";
import {
  BaseApiRateLimitException,
  BurstLimitExceededException,
  EmergencyThrottleException,
  RequestLimitExceededException,
} from "./api-rate-limit.exceptions";

interface RateLimitResult {
  allowed: boolean;
  count: number;
  ttl: number;
  limit: number;
}

interface EmergencyThrottleEntry {
  lastRequest: number;
  count: number;
}

export class RedisApiRateLimit implements ApiRateLimit {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly DEFAULT_WINDOW_SECONDS = 300;
  private readonly BURST_WINDOW_SECONDS = 60;
  private readonly EMERGENCY_THROTTLE_INTERVAL = 5000;
  private readonly CLEANUP_INTERVAL = 60000;
  private readonly emergencyThrottleMap = new Map<string, EmergencyThrottleEntry>();
  private checkCounter = 0;

  private readonly RATE_LIMIT_SCRIPT = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    
    if not limit or limit <= 0 then
      return redis.error_reply("Invalid limit value")
    end
    if not window or window <= 0 then
      return redis.error_reply("Invalid window value")  
    end
    
    local current = redis.call('GET', key)
    current = current and tonumber(current) or 0
    
    if current < limit then
      local count = redis.call('INCR', key)
      if count == 1 then
        redis.call('EXPIRE', key, window)
      end
      local ttl = redis.call('TTL', key)
      return {1, count, ttl > 0 and ttl or window, limit}
    else
      local ttl = redis.call('TTL', key)
      return {0, current, ttl > 0 and ttl or 0, limit}
    end
  `;

  constructor(
    private readonly strategy: RateLimitConfig,
    private readonly redisConnection: RedisConnectionManager,
    private readonly circuitBreakerFactory: CircuitBreakerFactory,
    private readonly requestContext: RequestContextPort,
    protected readonly logger: LoggerPort,
  ) {
    this.circuitBreaker = this.circuitBreakerFactory.create({
      failureThreshold: 1,
      cooldownPeriod: strategy.cooldownPeriodInMs,
      halfOpenMaxCalls: 1,
      timeWindow: 60_000,
      name: "RateLimitCircuitBreaker",
      isFailure: (error: unknown) => !BaseApiRateLimitException.isApiRateLimitException(error),
    });
    this.cleanupInterval = this.startCleanupTimer();
  }

  private startCleanupTimer(): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanupEmergencyThrottle();
    }, this.CLEANUP_INTERVAL);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }

  private cleanupEmergencyThrottle(): void {
    const now = Date.now();
    const expireTime = now - this.CLEANUP_INTERVAL * 2;

    for (const [key, entry] of this.emergencyThrottleMap.entries()) {
      if (entry.lastRequest < expireTime) {
        this.emergencyThrottleMap.delete(key);
      }
    }
  }

  async check(executionContext: string, policy: ApiRateLimitPolicy): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        return this.performRateLimit(executionContext, policy);
      }, `RateLimit-${++this.checkCounter}`);
    } catch (error) {
      if (BaseApiRateLimitException.isApiRateLimitException(error)) {
        throw error;
      }

      if (this.isCircuitOpenError(error)) {
        this.handleCircuitOpen(executionContext);
        return;
      }

      this.logger.error({
        context: "RateLimitAdapter",
        event: "UNEXPECTED_ERROR",
        message: "Unexpected error in rate limit check",
        stack: error instanceof Error ? error.stack : undefined,
        data: { executionContext, error: error instanceof Error ? error.message : String(error) },
      });

      await this.handleUnexpectedError(error, `${executionContext}:unexpected`);
    }
  }

  private isCircuitOpenError(error: unknown): boolean {
    return error instanceof Error && /^Circuit breaker '.*' is open\./.test(error.message);
  }

  private handleCircuitOpen(executionContext: string): void {
    this.logger.warn({
      context: "RateLimitAdapter",
      event: "CIRCUIT_BREAKER_OPEN",
      message: `Circuit breaker is open for rate limiting - applying ${this.strategy.circuitOpenStrategy} strategy`,
      data: { executionContext, strategy: this.strategy.circuitOpenStrategy },
    });

    switch (this.strategy.circuitOpenStrategy) {
      case "deny":
        throw new BaseInfrastructureException("Rate Limit");

      case "throttle":
        this.applyEmergencyThrottle(executionContext);
        break;

      case "allow":
      default:
        this.logger.warn({
          context: "RateLimitAdapter",
          event: "CIRCUIT_OPEN_REQUEST_ALLOWED",
          message: "Request allowed despite circuit breaker being open",
          data: { executionContext },
        });
        break;
    }
  }

  private applyEmergencyThrottle(executionContext: string): void {
    const { identifier } = this.resolveIdentity();
    const throttleKey = `${executionContext}:${identifier}`;
    const now = Date.now();

    const entry = this.emergencyThrottleMap.get(throttleKey);

    if (entry) {
      const timeSinceLastRequest = now - entry.lastRequest;

      if (timeSinceLastRequest < this.EMERGENCY_THROTTLE_INTERVAL) {
        const remainingTime = Math.ceil((this.EMERGENCY_THROTTLE_INTERVAL - timeSinceLastRequest) / 1000);

        this.logger.warn({
          context: "RateLimitAdapter",
          event: "EMERGENCY_THROTTLE_TRIGGERED",
          message: "Emergency throttle applied due to circuit breaker",
          data: {
            executionContext,
            remainingTime,
            attempts: entry.count + 1,
          },
        });

        entry.count += 1;

        throw new EmergencyThrottleException({ attempts: entry.count, maxAttempts: 1, ttl: remainingTime });
      }
    }

    this.emergencyThrottleMap.set(throttleKey, {
      lastRequest: now,
      count: entry ? entry.count + 1 : 1,
    });
  }

  private async performRateLimit(executionContext: string, policy: ApiRateLimitPolicy): Promise<void> {
    const { identifier, isAuthenticated } = this.resolveIdentity();

    const limitConfig = isAuthenticated ? policy.authenticated : policy.anonymous;
    const windowSeconds = policy.windowSeconds ?? this.DEFAULT_WINDOW_SECONDS;

    if (limitConfig.maxAttempts === 0) {
      this.logger.warn({
        context: "RateLimitAdapter",
        event: "TIER_BLOCKED",
        message: `${isAuthenticated ? "Authenticated" : "Anonymous"} access is disabled for this action`,
        data: { executionContext, isAuthenticated },
      });

      throw new RequestLimitExceededException({ attempts: 0, maxAttempts: 0, ttl: windowSeconds });
    }

    const checks: Promise<void>[] = [];

    if (limitConfig.burst && limitConfig.burst > 0) {
      checks.push(this.checkLimit(`${executionContext}:burst`, identifier, limitConfig.burst, this.BURST_WINDOW_SECONDS, true));
    }

    checks.push(this.checkLimit(executionContext, identifier, limitConfig.maxAttempts, windowSeconds, false));

    await Promise.all(checks);
  }

  private async checkLimit(executionContext: string, identifier: string, limit: number, windowSeconds: number, isBurst: boolean): Promise<void> {
    const key = this.buildKey(executionContext, identifier);

    try {
      const result = await this.executeRateLimitScript(key, limit, windowSeconds);

      if (!result) {
        throw new Error("Rate limit script execution failed");
      }

      const rateLimitResult = this.parseScriptResult(result);

      if (!rateLimitResult.allowed) {
        this.logRateLimitExceeded(key, rateLimitResult, isBurst);

        const errorFactory = isBurst ? BurstLimitExceededException : RequestLimitExceededException;

        throw new errorFactory({
          attempts: rateLimitResult.count,
          maxAttempts: rateLimitResult.limit,
          ttl: rateLimitResult.ttl,
        });
      }

      this.logRateLimitPassed(rateLimitResult, isBurst);
    } catch (error) {
      if (BaseApiRateLimitException.isApiRateLimitException(error)) {
        throw error;
      }

      await this.handleUnexpectedError(error, key);
    }
  }

  private parseScriptResult(result: unknown[]): RateLimitResult {
    if (!Array.isArray(result) || result.length !== 4) {
      throw new Error("Invalid script result format");
    }

    const [allowed, count, ttl, limit] = result;

    return {
      allowed: Boolean(allowed),
      count: Number(count),
      ttl: Number(ttl),
      limit: Number(limit),
    };
  }

  private logRateLimitExceeded(key: string, result: RateLimitResult, isBurst: boolean): void {
    this.logger.warn({
      context: "RateLimitAdapter",
      event: isBurst ? "BURST_LIMIT_EXCEEDED" : "RATE_LIMIT_EXCEEDED",
      message: `${isBurst ? "Burst" : "Rate"} limit exceeded`,
      data: {
        attempts: result.count,
        maxAttempts: result.limit,
        ttl: result.ttl,
        isBurstLimit: isBurst,
        key,
      },
    });
  }

  private logRateLimitPassed(result: RateLimitResult, isBurst: boolean): void {
    this.logger.debug({
      context: "RateLimitAdapter",
      event: "RATE_LIMIT_PASSED",
      message: `${isBurst ? "Burst" : "Rate"} limit check passed`,
      data: {
        attempts: result.count,
        maxAttempts: result.limit,
        remaining: result.limit - result.count,
        ttl: result.ttl,
        isBurstLimit: isBurst,
      },
    });
  }

  private async handleUnexpectedError(error: unknown, key: string): Promise<void> {
    this.logger.error({
      context: "RateLimitAdapter",
      event: "CHECK_ERROR",
      message: "Failed to check rate limit due to unexpected error",
      stack: error instanceof Error ? error.stack : undefined,
      data: {
        key,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    if (this.strategy.securityAlertsEnabled) {
      await this.triggerSecurityAlert(error, key);
    }

    if (this.strategy.rateLimitErrorStrategy === "deny") {
      throw new BaseInfrastructureException("Rate Limit");
    }
  }

  private async triggerSecurityAlert(error: unknown, key: string): Promise<void> {
    /* TODO: Implement actual notification system (email, Slack, PagerDuty, etc.)
       For now, log as critical for monitoring systems
       Additional alerting mechanisms can be added here:
       - Send to monitoring service (DataDog, New Relic, etc.)
       - Trigger incident management system
       - Send notification via messaging service
     */
    this.logger.debug({
      context: "RateLimitAdapter",
      event: "SECURITY_ALERT_INFRASTRUCTURE_FAILURE",
      message: "CRITICAL: Rate limiting infrastructure failure detected",
      data: {
        alertType: "RATE_LIMIT_FAILURE",
        key,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
    });
  }

  private async executeRateLimitScript(key: string, limit: number, windowSeconds: number): Promise<number[] | null> {
    try {
      const redis = this.redisConnection.getClient();
      const result = await redis.eval(this.RATE_LIMIT_SCRIPT, 1, key, String(limit), String(windowSeconds));

      return Array.isArray(result) ? result : null;
    } catch (error) {
      this.logger.warn({
        context: "RateLimitAdapter",
        event: "SCRIPT_EXECUTION_FAILED",
        message: "Lua script failed, attempting fallback method",
        data: {
          error: error instanceof Error ? error.message : String(error),
          key,
          limit,
          windowSeconds,
        },
      });
      return this.fallbackRateLimit(key, limit, windowSeconds);
    }
  }

  private resolveIdentity(): { identifier: string; isAuthenticated: boolean } {
    const { userId, ipAddress } = this.requestContext.get();
    return {
      identifier: userId ?? ipAddress ?? "unknown-ip",
      isAuthenticated: !!userId,
    };
  }

  private buildKey(executionContext: string, identifier: string): string {
    const sanitizedContext = this.sanitizeKeyPart(executionContext);
    const sanitizedIdentifier = this.sanitizeKeyPart(identifier);

    return `rate_limit:${sanitizedContext}:${sanitizedIdentifier}`;
  }

  private sanitizeKeyPart(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9_.-]/g, "_")
      .substring(0, 100)
      .toLowerCase();
  }

  private async fallbackRateLimit(key: string, limit: number, windowSeconds: number): Promise<[number, number, number, number] | null> {
    try {
      const redis = this.redisConnection.getClient();
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);
      const allowed = count <= limit;

      return [allowed ? 1 : 0, count, ttl > 0 ? ttl : windowSeconds, limit];
    } catch (error) {
      this.logger.error({
        context: "RateLimitAdapter",
        event: "FALLBACK_FAILED",
        message: "Both script and fallback methods failed",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return null;
    }
  }
}
