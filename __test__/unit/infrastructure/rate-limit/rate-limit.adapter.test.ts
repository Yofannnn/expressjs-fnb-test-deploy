import { RedisApiRateLimiter } from "@/infrastructure/rate-limit/redis-api-rate-limiter";
import { ApiRateLimitPolicy } from "@/infrastructure/rate-limit/api-rate-limit.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { RequestContextPort, RequestContextData } from "@/application/ports/driven/request-context.port";
import { RateLimitConfig } from "@/infrastructure/config/rate-limit.config";
import { RedisConnectionManager } from "@/infrastructure/cache/redis-connection";
import { BaseInfrastructureException } from "@/infrastructure/exceptions/infrastructure.exceptions";
import { CircuitBreaker, CircuitBreakerConfig } from "@/infrastructure/circuit-breaker/circuit-breaker";
import { CircuitBreakerFactory } from "@/infrastructure/circuit-breaker/circuit-breaker.factory";
import {
  BurstLimitExceededException,
  EmergencyThrottleException,
  RequestLimitExceededException,
} from "@/infrastructure/rate-limit/api-rate-limit.exceptions";
import type Redis from "ioredis";

/**
 * NOTE ON SCOPE:
 * This is a ground-up rewrite, not a patch of the old test. The class this
 * covers is a different shape entirely from the old `RateLimitAdapter`:
 *   - It's `RedisApiRateLimiter implements ApiRateLimit` now - no adapter/port
 *     naming, per the note that core/app layers don't consume this; only the
 *     presentation layer does.
 *   - The circuit breaker is injected via a `CircuitBreakerFactory`, not
 *     baked into the class via inheritance (there is no `circuitBreakerConfig`
 *     or `state` field on the instance anymore).
 *   - There is no `validateOptions()` / policy validation at all anymore.
 *     Malformed policies (missing tiers, negative numbers, zero window) are
 *     no longer rejected up front - they just fail naturally wherever they're
 *     used (see "malformed policy" tests below) and are covered by the
 *     generic unexpected-error handling instead of a dedicated validation path.
 *   - `RedisConnectionManager.getClient()` returns a real ioredis `Redis`
 *     client (confirmed against the actual `redis-connection.ts`), not the
 *     app's old `CacheClient` port. The fallback path no longer calls `GET`
 *     at all - it relies on `INCR`'s atomic return value directly. The mock
 *     client below only stubs the four ioredis commands this class actually
 *     calls (`eval`, `incr`, `expire`, `ttl`); everything else
 *     `RedisConnectionManager` does (event handlers, health checks, retry
 *     logic in `executeWithErrorHandling`) is irrelevant here since
 *     `RedisApiRateLimiter` only ever calls `getClient()`.
 *   - Config field names changed: `cacheErrorStrategy` -> `rateLimitErrorStrategy`,
 *     and there's no more "CONFIG_WARNING" for authenticated < anonymous limits.
 *   - `ApiRateLimitPolicy.windowSeconds` is a *required* field now (confirmed
 *     against the real `api-rate-limit.type.ts`), unlike the optional field I
 *     originally assumed - every inline policy below supplies it via the
 *     `simplePolicy()` helper, except the one test that deliberately checks
 *     the `windowSeconds ?? DEFAULT_WINDOW_SECONDS` fallback, which bypasses
 *     the type via an explicit cast since that can only happen at runtime for
 *     an untyped/JS caller.
 *   - Exceptions are now real classes (`RequestLimitExceededException`,
 *     `BurstLimitExceededException`, `EmergencyThrottleException`, all
 *     extending `BaseApiRateLimitException`), confirmed against the real
 *     `api-rate-limit.exceptions.ts`, instead of factory functions from
 *     `RATE_LIMIT_EXCEPTIONS`. Infra failures raise a generic
 *     `BaseInfrastructureException("Rate Limit")` instead of
 *     `SERVER_EXCEPTIONS.EXTERNAL_SERVICE_ERROR("Cache Service")`.
 *   - The `RateLimitEnvConfig` tests from the old file aren't reproduced here
 *     since `rate-limit.config.ts` wasn't part of what changed / was shared
 *     for this pass - keep those separately if that file is unchanged.
 *
 * IMPORT PATHS: `../common/circuit-breaker`, `../common/circuit-breaker.factory`,
 * and `./api-rate-limit.exceptions` are plain relative imports in the source
 * file. This suite assumes it is colocated with the source (standard
 * `*_test.ts`-next-to-source layout); adjust if yours lives elsewhere.
 */

jest.useFakeTimers();

function makeLogger(): jest.Mocked<LoggerPort> {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  } as unknown as jest.Mocked<LoggerPort>;
}

function makeRedisClient(): jest.Mocked<Pick<Redis, "eval" | "incr" | "expire" | "ttl">> {
  return {
    eval: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  } as unknown as jest.Mocked<Pick<Redis, "eval" | "incr" | "expire" | "ttl">>;
}

function makeRedisConnection(client: jest.Mocked<Pick<Redis, "eval" | "incr" | "expire" | "ttl">>): jest.Mocked<RedisConnectionManager> {
  return {
    getClient: jest.fn().mockReturnValue(client as unknown as Redis),
  } as unknown as jest.Mocked<RedisConnectionManager>;
}

function makeRequestContext(overrides: Partial<RequestContextData> = {}): jest.Mocked<RequestContextPort> {
  return {
    get: jest.fn().mockReturnValue({
      requestId: "test-request-id",
      ipAddress: "192.168.1.1",
      userAgent: "test-agent",
      ...overrides,
    }),
  } as unknown as jest.Mocked<RequestContextPort>;
}

function makeStrategy(overrides: Partial<RateLimitConfig> = {}): RateLimitConfig {
  return {
    cooldownPeriodInMs: 30_000,
    circuitOpenStrategy: "throttle",
    rateLimitErrorStrategy: "allow",
    securityAlertsEnabled: false,
    ...overrides,
  };
}

/**
 * Real CircuitBreaker, wired exactly the way the class's own constructor
 * wires it, via a factory. Using the genuine implementation (rather than a
 * bare pass-through mock) matters here because so much of this class's
 * interesting behavior - the `isFailure` exemption for rate-limit exceptions,
 * threshold tripping, cooldown recovery - is specifically about how it
 * integrates with a real circuit breaker.
 */
function makeCircuitBreakerFactory(logger: LoggerPort): jest.Mocked<CircuitBreakerFactory> {
  return {
    create: jest.fn((config: CircuitBreakerConfig) => new CircuitBreaker(config, logger)),
  } as unknown as jest.Mocked<CircuitBreakerFactory>;
}

const defaultPolicy: ApiRateLimitPolicy = {
  anonymous: { maxAttempts: 10, burst: 5 },
  authenticated: { maxAttempts: 100, burst: 20 },
  windowSeconds: 300,
};

/** A minimal, valid policy for tests that don't care about its specifics. */
function simplePolicy(overrides: Partial<ApiRateLimitPolicy> = {}): ApiRateLimitPolicy {
  return {
    windowSeconds: 300,
    anonymous: { maxAttempts: 10 },
    authenticated: { maxAttempts: 100 },
    ...overrides,
  };
}

/** [allowed(1/0), count, ttl, limit] shape returned by the Lua script / fallback. */
function scriptResult(allowed: 0 | 1, count: number, ttl: number, limit: number) {
  return [allowed, count, ttl, limit];
}

describe("RedisApiRateLimiter", () => {
  let logger: jest.Mocked<LoggerPort>;
  let redisClient: jest.Mocked<Pick<Redis, "eval" | "incr" | "expire" | "ttl">>;
  let redisConnection: jest.Mocked<RedisConnectionManager>;
  let requestContext: jest.Mocked<RequestContextPort>;
  let strategy: RateLimitConfig;
  let circuitBreakerFactory: jest.Mocked<CircuitBreakerFactory>;
  let limiter: RedisApiRateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    logger = makeLogger();
    redisClient = makeRedisClient();
    redisConnection = makeRedisConnection(redisClient);
    requestContext = makeRequestContext();
    strategy = makeStrategy();
    circuitBreakerFactory = makeCircuitBreakerFactory(logger);

    limiter = new RedisApiRateLimiter(strategy, redisConnection, circuitBreakerFactory, requestContext, logger);
  });

  afterEach(() => {
    limiter.destroy();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------------
  describe("construction", () => {
    it("builds its circuit breaker through the factory with the expected config", () => {
      expect(circuitBreakerFactory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          failureThreshold: 1,
          cooldownPeriod: strategy.cooldownPeriodInMs,
          halfOpenMaxCalls: 1,
          timeWindow: 60_000,
          name: "RateLimitCircuitBreaker",
          isFailure: expect.any(Function),
        }),
      );
    });

    it("uses the strategy's cooldownPeriodInMs for the circuit breaker's cooldown", () => {
      circuitBreakerFactory.create.mockClear();
      new RedisApiRateLimiter(makeStrategy({ cooldownPeriodInMs: 90_000 }), redisConnection, circuitBreakerFactory, requestContext, logger).destroy();

      expect(circuitBreakerFactory.create).toHaveBeenCalledWith(expect.objectContaining({ cooldownPeriod: 90_000 }));
    });

    it("configures isFailure to exempt rate-limit exceptions but count generic errors", () => {
      const [config] = circuitBreakerFactory.create.mock.calls[0];
      const isFailure = config.isFailure!;

      expect(isFailure(new RequestLimitExceededException({ attempts: 1, maxAttempts: 1, ttl: 10 }))).toBe(false);
      expect(isFailure(new BurstLimitExceededException({ attempts: 1, maxAttempts: 1, ttl: 10 }))).toBe(false);
      expect(isFailure(new Error("redis connection reset"))).toBe(true);
      expect(isFailure(new BaseInfrastructureException("Rate Limit"))).toBe(true);
    });

    it("starts a cleanup timer on the documented interval", () => {
      const setIntervalSpy = jest.spyOn(global, "setInterval");

      new RedisApiRateLimiter(strategy, redisConnection, circuitBreakerFactory, requestContext, logger).destroy();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    });
  });

  describe("destroy", () => {
    it("clears the cleanup interval", () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      limiter.destroy();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------
  // Successful checks
  // ---------------------------------------------------------------------
  describe("check - successful rate limiting", () => {
    it("resolves and logs RATE_LIMIT_PASSED when under the limit", async () => {
      redisClient.eval.mockResolvedValue(scriptResult(1, 5, 295, 10));
      const optionsNoBurst: ApiRateLimitPolicy = simplePolicy();

      await expect(limiter.check("test-endpoint", optionsNoBurst)).resolves.toBeUndefined();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "RATE_LIMIT_PASSED",
          data: expect.objectContaining({ attempts: 5, maxAttempts: 10, remaining: 5, ttl: 295, isBurstLimit: false }),
        }),
      );
    });

    it("checks both the burst and normal limits concurrently when burst is configured", async () => {
      redisClient.eval.mockResolvedValueOnce(scriptResult(1, 3, 58, 5)).mockResolvedValueOnce(scriptResult(1, 5, 295, 10));

      await limiter.check("test-endpoint", defaultPolicy);

      expect(redisClient.eval).toHaveBeenCalledTimes(2);
    });

    it("uses the authenticated tier and identifier when userId is present", async () => {
      requestContext.get.mockReturnValue({ requestId: "r", userId: "user-123", ipAddress: "1.2.3.4" });
      redisClient.eval.mockResolvedValueOnce(scriptResult(1, 10, 58, 20)).mockResolvedValueOnce(scriptResult(1, 50, 295, 100));

      await limiter.check("test-endpoint", defaultPolicy);

      const keysUsed = redisClient.eval.mock.calls.map((call) => call[2] as string);
      expect(keysUsed.every((key) => key.includes("user-123"))).toBe(true);
    });

    it("falls back to ipAddress as the identifier when there is no userId", async () => {
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 58, 10));

      await limiter.check("test-endpoint", defaultPolicy);

      const keysUsed = redisClient.eval.mock.calls.map((call) => call[2] as string);
      expect(keysUsed.some((key) => key.includes("192.168.1.1"))).toBe(true);
    });

    it("falls back to 'unknown-ip' when neither userId nor ipAddress is present", async () => {
      requestContext.get.mockReturnValue({ requestId: "r", ipAddress: undefined });
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 58, 10));

      await limiter.check("test-endpoint", defaultPolicy);

      const keysUsed = redisClient.eval.mock.calls.map((call) => call[2] as string);
      expect(keysUsed.some((key) => key.includes("unknown-ip"))).toBe(true);
    });

    it("treats a null ipAddress the same as a missing one", async () => {
      requestContext.get.mockReturnValue({ requestId: "r", ipAddress: null as unknown as undefined });
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 58, 10));

      await limiter.check("test-endpoint", defaultPolicy);

      const keysUsed = redisClient.eval.mock.calls.map((call) => call[2] as string);
      expect(keysUsed.some((key) => key.includes("unknown-ip"))).toBe(true);
    });

    it("skips the burst check when burst is 0", async () => {
      redisClient.eval.mockResolvedValue(scriptResult(1, 5, 295, 10));

      await limiter.check("test-endpoint", simplePolicy({ anonymous: { maxAttempts: 10, burst: 0 }, authenticated: { maxAttempts: 100, burst: 0 } }));

      expect(redisClient.eval).toHaveBeenCalledTimes(1);
    });

    it("skips the burst check when burst is undefined", async () => {
      redisClient.eval.mockResolvedValue(scriptResult(1, 5, 295, 10));

      await limiter.check("test-endpoint", simplePolicy());

      expect(redisClient.eval).toHaveBeenCalledTimes(1);
    });

    it("defaults windowSeconds to 300 when the policy doesn't specify one", async () => {
      redisClient.eval.mockResolvedValue(scriptResult(1, 5, 295, 10));

      // windowSeconds is a required field on ApiRateLimitPolicy at the type
      // level, but the source still guards it with `?? DEFAULT_WINDOW_SECONDS`
      // - presumably for callers that bypass the type system (plain JS, a
      // deserialized/parsed policy, etc.). The cast below simulates that.
      const policyWithoutWindow = { anonymous: { maxAttempts: 10 }, authenticated: { maxAttempts: 100 } } as unknown as ApiRateLimitPolicy;

      await limiter.check("test-endpoint", policyWithoutWindow);

      const windowArg = redisClient.eval.mock.calls[0][4] as string;
      expect(windowArg).toBe("300");
    });

    it("always uses the fixed 60s burst window, independent of policy.windowSeconds", async () => {
      redisClient.eval.mockResolvedValueOnce(scriptResult(1, 1, 58, 5)).mockResolvedValueOnce(scriptResult(1, 1, 295, 10));

      await limiter.check("test-endpoint", { ...defaultPolicy, windowSeconds: 900 });

      // The ":burst" suffix on the execution context gets sanitized to "_burst"
      // by buildKey()/sanitizeKeyPart() before it ever reaches the key.
      const burstCall = redisClient.eval.mock.calls.find((call) => (call[2] as string).includes("_burst"));
      expect(burstCall?.[4]).toBe("60");
    });
  });

  // ---------------------------------------------------------------------
  // Tier blocked (maxAttempts === 0)
  // ---------------------------------------------------------------------
  describe("check - tier blocked", () => {
    it("rejects with RequestLimitExceededException and never touches Redis when the caller's tier is disabled", async () => {
      const options: ApiRateLimitPolicy = simplePolicy({ anonymous: { maxAttempts: 0 } });

      await expect(limiter.check("test-endpoint", options)).rejects.toBeInstanceOf(RequestLimitExceededException);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "TIER_BLOCKED",
          message: "Anonymous access is disabled for this action",
          data: { executionContext: "test-endpoint", isAuthenticated: false },
        }),
      );
      expect(redisClient.eval).not.toHaveBeenCalled();
    });

    it("uses the 'Authenticated' wording when the blocked tier is the authenticated one", async () => {
      const options: ApiRateLimitPolicy = simplePolicy({ authenticated: { maxAttempts: 0 } });
      requestContext.get.mockReturnValue({ requestId: "r", userId: "user-123" });

      await expect(limiter.check("test-endpoint", options)).rejects.toBeInstanceOf(RequestLimitExceededException);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "TIER_BLOCKED",
          message: "Authenticated access is disabled for this action",
          data: { executionContext: "test-endpoint", isAuthenticated: true },
        }),
      );
    });

    it("blocks only the disabled tier, letting the other tier through normally", async () => {
      const options: ApiRateLimitPolicy = simplePolicy({ anonymous: { maxAttempts: 0 } });
      requestContext.get.mockReturnValue({ requestId: "r", userId: "user-123" });
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 295, 100));

      await expect(limiter.check("test-endpoint", options)).resolves.toBeUndefined();
    });

    it("does not trip the circuit breaker (TIER_BLOCKED is an ApiRateLimitException)", async () => {
      const options: ApiRateLimitPolicy = simplePolicy({ anonymous: { maxAttempts: 0 } });

      for (let i = 0; i < 5; i++) {
        await expect(limiter.check("test-endpoint", options)).rejects.toBeInstanceOf(RequestLimitExceededException);
      }

      // If this had tripped the (failureThreshold: 1) circuit, this call would
      // instead reject with the circuit-open error / circuitOpenStrategy path.
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 295, 100));
      requestContext.get.mockReturnValue({ requestId: "r", userId: "user-999" });
      await expect(limiter.check("test-endpoint", simplePolicy())).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------
  // Limit exceeded
  // ---------------------------------------------------------------------
  describe("check - limit exceeded", () => {
    it("rejects with RequestLimitExceededException and logs RATE_LIMIT_EXCEEDED when the normal limit is hit", async () => {
      // Burst and normal run concurrently via Promise.all; keep burst passing
      // so only the normal check's rejection is observed.
      redisClient.eval.mockResolvedValueOnce(scriptResult(1, 3, 58, 5)).mockResolvedValueOnce(scriptResult(0, 11, 250, 10));

      await expect(limiter.check("test-endpoint", defaultPolicy)).rejects.toBeInstanceOf(RequestLimitExceededException);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "RATE_LIMIT_EXCEEDED",
          data: expect.objectContaining({ attempts: 11, maxAttempts: 10, ttl: 250, isBurstLimit: false, key: expect.stringContaining("rate_limit") }),
        }),
      );
    });

    it("rejects with BurstLimitExceededException and logs BURST_LIMIT_EXCEEDED when the burst limit is hit", async () => {
      redisClient.eval.mockResolvedValueOnce(scriptResult(0, 6, 55, 5)).mockResolvedValueOnce(scriptResult(1, 5, 295, 10));

      await expect(limiter.check("test-endpoint", defaultPolicy)).rejects.toBeInstanceOf(BurstLimitExceededException);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "BURST_LIMIT_EXCEEDED",
          data: expect.objectContaining({ attempts: 6, maxAttempts: 5, ttl: 55, isBurstLimit: true }),
        }),
      );
    });

    it("does not trip the circuit breaker on legitimate rate-limit-exceeded responses", async () => {
      redisClient.eval.mockResolvedValue(scriptResult(0, 11, 250, 10));

      for (let i = 0; i < 5; i++) {
        await expect(limiter.check(`endpoint-${i}`, simplePolicy())).rejects.toBeInstanceOf(RequestLimitExceededException);
      }

      // Confirm we're still CLOSED, not silently in circuitOpenStrategy territory.
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 295, 10));
      await expect(limiter.check("another-endpoint", simplePolicy())).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------
  // Fallback (Lua EVAL failure)
  // ---------------------------------------------------------------------
  describe("script execution and fallback", () => {
    it("falls back to INCR/EXPIRE/TTL and still passes the check when the Lua script fails", async () => {
      redisClient.eval.mockRejectedValue(new Error("NOSCRIPT / Lua not supported"));
      redisClient.incr.mockResolvedValue(4);
      redisClient.ttl.mockResolvedValue(300);
      redisClient.expire.mockResolvedValue(1);

      await expect(limiter.check("test-endpoint", simplePolicy())).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "SCRIPT_EXECUTION_FAILED" }));
      expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({ event: "RATE_LIMIT_PASSED" }));
      expect(logger.error).not.toHaveBeenCalledWith(expect.objectContaining({ event: "CHECK_ERROR" }));
    });

    it("calls EXPIRE only on the first increment (count === 1) within the fallback", async () => {
      redisClient.eval.mockRejectedValue(new Error("no lua"));
      redisClient.incr.mockResolvedValue(1);
      redisClient.ttl.mockResolvedValue(300);

      await limiter.check("test-endpoint", simplePolicy());

      expect(redisClient.expire).toHaveBeenCalledWith(expect.stringContaining("rate_limit"), 300);
    });

    it("does not call EXPIRE when the fallback count is already above 1", async () => {
      redisClient.eval.mockRejectedValue(new Error("no lua"));
      redisClient.incr.mockResolvedValue(4);
      redisClient.ttl.mockResolvedValue(300);

      await limiter.check("test-endpoint", simplePolicy());

      expect(redisClient.expire).not.toHaveBeenCalled();
    });

    it("falls back to windowSeconds as ttl when Redis reports no TTL is set", async () => {
      redisClient.eval.mockRejectedValue(new Error("no lua"));
      redisClient.incr.mockResolvedValue(1);
      redisClient.ttl.mockResolvedValue(-1);
      redisClient.expire.mockResolvedValue(1);

      await limiter.check("test-endpoint", simplePolicy());

      expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ttl: 300 }) }));
    });

    it("denies through the fallback once the incremented count exceeds the limit", async () => {
      redisClient.eval.mockRejectedValue(new Error("no lua"));
      redisClient.incr.mockResolvedValue(11);
      redisClient.ttl.mockResolvedValue(120);

      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toBeInstanceOf(RequestLimitExceededException);
    });

    it("logs FALLBACK_FAILED and denies via the generic script-failure path when both EVAL and the fallback fail (rateLimitErrorStrategy: deny)", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      redisClient.eval.mockRejectedValue(new Error("script down"));
      redisClient.incr.mockRejectedValue(new Error("connection reset"));

      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toBeInstanceOf(BaseInfrastructureException);

      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ event: "FALLBACK_FAILED" }));
    });

    it("stringifies non-Error rejections in both SCRIPT_EXECUTION_FAILED and FALLBACK_FAILED logs", async () => {
      redisClient.eval.mockRejectedValue("lua unavailable");
      redisClient.incr.mockRejectedValue("connection dropped");

      await limiter.check("test-endpoint", simplePolicy()).catch(() => undefined);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: "SCRIPT_EXECUTION_FAILED", data: expect.objectContaining({ error: "lua unavailable" }) }),
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ event: "FALLBACK_FAILED", data: expect.objectContaining({ error: "connection dropped" }) }),
      );
    });

    it("swallows a full outage silently when rateLimitErrorStrategy is 'allow'", async () => {
      strategy.rateLimitErrorStrategy = "allow";
      redisClient.eval.mockRejectedValue(new Error("script down"));
      redisClient.incr.mockRejectedValue(new Error("connection reset"));

      await expect(limiter.check("test-endpoint", simplePolicy())).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ event: "CHECK_ERROR" }));
      // Swallowed cleanly: only ever logged once, no secondary UNEXPECTED_ERROR pass.
      expect(logger.error).not.toHaveBeenCalledWith(expect.objectContaining({ event: "UNEXPECTED_ERROR" }));
    });

    it("throws the generic 'Rate limit script execution failed' error when the script returns malformed data (wrong array length)", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      redisClient.eval.mockResolvedValue([1, 2]); // wrong length -> parseScriptResult would throw, but the
      // shape only reaches parseScriptResult via a truthy result, so this
      // exercises "Invalid script result format" specifically.

      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toBeInstanceOf(BaseInfrastructureException);
    });

    it("treats a non-array script result the same as a failed script execution", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      redisClient.eval.mockResolvedValue("not-an-array" as unknown as unknown[]);
      redisClient.incr.mockRejectedValue(new Error("fallback also down"));

      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toBeInstanceOf(BaseInfrastructureException);
    });

    // --- Documented behavior (not a "fix") ---
    //
    // When rateLimitErrorStrategy is "deny", an infra failure inside
    // checkLimit() is handled twice: once by checkLimit's own catch (which
    // logs CHECK_ERROR and throws BaseInfrastructureException("Rate Limit")),
    // and then a second time because that thrown error propagates up through
    // performRateLimit -> the circuit breaker -> back into check()'s own
    // catch block. Since BaseInfrastructureException is neither an
    // ApiRateLimitException nor a "circuit breaker is open" error, check()
    // falls through to its own UNEXPECTED_ERROR branch and calls
    // handleUnexpectedError() a *second* time with a different key
    // (`${executionContext}:unexpected`) - producing two CHECK_ERROR logs
    // (and, if enabled, two security alerts) for what is really one failure.
    // This test documents that actual, current behavior.
    it("logs CHECK_ERROR twice (and UNEXPECTED_ERROR once) for a single infra failure under 'deny'", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      strategy.securityAlertsEnabled = true;
      redisClient.eval.mockRejectedValue(new Error("script down"));
      redisClient.incr.mockRejectedValue(new Error("connection reset"));

      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toBeInstanceOf(BaseInfrastructureException);

      const checkErrorLogs = logger.error.mock.calls.filter(([arg]) => arg.event === "CHECK_ERROR");
      const unexpectedErrorLogs = logger.error.mock.calls.filter(([arg]) => arg.event === "UNEXPECTED_ERROR");
      const securityAlertLogs = logger.debug.mock.calls.filter(([arg]) => arg.event === "SECURITY_ALERT_INFRASTRUCTURE_FAILURE");

      expect(checkErrorLogs).toHaveLength(2);
      expect(unexpectedErrorLogs).toHaveLength(1);
      expect(securityAlertLogs).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------
  // Circuit breaker integration
  // ---------------------------------------------------------------------
  describe("circuit breaker integration", () => {
    it("trips the circuit (failureThreshold: 1) on a genuine infra failure when rateLimitErrorStrategy is 'deny'", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      redisClient.eval.mockRejectedValue(new Error("down"));
      redisClient.incr.mockRejectedValue(new Error("down"));

      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toBeInstanceOf(BaseInfrastructureException);

      redisClient.eval.mockClear();

      // Second call: circuit is now open; whatever circuitOpenStrategy says
      // happens without ever touching Redis again.
      await limiter.check("test-endpoint", simplePolicy()).catch(() => undefined);

      expect(redisClient.eval).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "CIRCUIT_BREAKER_OPEN" }));
    });

    it("applies the 'deny' circuitOpenStrategy once open: rejects with BaseInfrastructureException, cleanly (no double logging)", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      strategy.circuitOpenStrategy = "deny";
      redisClient.eval.mockRejectedValue(new Error("down"));
      redisClient.incr.mockRejectedValue(new Error("down"));

      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toThrow(); // trips it

      logger.error.mockClear();
      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toBeInstanceOf(BaseInfrastructureException);

      // Clean single path this time: handleCircuitOpen() throws directly, it
      // never goes through handleUnexpectedError/CHECK_ERROR at all.
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("applies the 'allow' circuitOpenStrategy once open: lets the request through and logs CIRCUIT_OPEN_REQUEST_ALLOWED", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      strategy.circuitOpenStrategy = "allow";
      redisClient.eval.mockRejectedValue(new Error("down"));
      redisClient.incr.mockRejectedValue(new Error("down"));

      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toThrow(); // trips it

      await expect(limiter.check("test-endpoint", simplePolicy())).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "CIRCUIT_OPEN_REQUEST_ALLOWED" }));
    });

    it("applies the 'throttle' circuitOpenStrategy: first hit passes, second hit within the interval is blocked", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      strategy.circuitOpenStrategy = "throttle";
      redisClient.eval.mockRejectedValue(new Error("down"));
      redisClient.incr.mockRejectedValue(new Error("down"));

      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toThrow(); // trips it

      // First hit of the emergency throttle for this identifier: no prior
      // entry, so it just records the attempt and lets the request through.
      await expect(limiter.check("test-endpoint", simplePolicy())).resolves.toBeUndefined();

      // Second hit, still inside EMERGENCY_THROTTLE_INTERVAL (5s): blocked.
      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toBeInstanceOf(EmergencyThrottleException);

      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "EMERGENCY_THROTTLE_TRIGGERED" }));
    });

    it("allows a throttled identifier through again once the emergency throttle interval elapses", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      strategy.circuitOpenStrategy = "throttle";
      redisClient.eval.mockRejectedValue(new Error("down"));
      redisClient.incr.mockRejectedValue(new Error("down"));

      await limiter.check("test-endpoint", simplePolicy()).catch(() => undefined); // trips it
      await limiter.check("test-endpoint", simplePolicy()); // first throttle hit: allowed
      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toThrow(); // blocked

      // Past the 5s emergency-throttle interval, but nowhere near the 30s
      // circuit cooldown - Redis is still never actually called again.
      jest.advanceTimersByTime(5_001);

      await expect(limiter.check("test-endpoint", simplePolicy())).resolves.toBeUndefined();
      expect(redisClient.eval).toHaveBeenCalledTimes(1); // only the original tripping call
    });

    it("keeps emergency throttling independent per identifier", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      strategy.circuitOpenStrategy = "throttle";
      redisClient.eval.mockRejectedValue(new Error("down"));
      redisClient.incr.mockRejectedValue(new Error("down"));

      await limiter.check("test-endpoint", simplePolicy()).catch(() => undefined); // trips it (shared, global)
      await limiter.check("test-endpoint", simplePolicy()); // first hit for 192.168.1.1: allowed
      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toThrow(); // second hit: blocked

      // A different identifier hitting the (still globally open) circuit for
      // the first time is independently allowed - the throttle map is keyed
      // per executionContext+identifier, even though the circuit itself is shared.
      requestContext.get.mockReturnValue({ requestId: "r", ipAddress: "10.0.0.99" });
      await expect(limiter.check("test-endpoint", simplePolicy())).resolves.toBeUndefined();
    });

    it("recovers to CLOSED after the cooldown elapses and a probe succeeds", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      strategy.circuitOpenStrategy = "throttle";
      redisClient.eval.mockRejectedValue(new Error("down"));
      redisClient.incr.mockRejectedValue(new Error("down"));

      await limiter.check("test-endpoint", simplePolicy()).catch(() => undefined); // trips it

      jest.advanceTimersByTime(strategy.cooldownPeriodInMs + 1_000);

      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 295, 10));
      await expect(limiter.check("test-endpoint", simplePolicy())).resolves.toBeUndefined();

      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "CIRCUIT_RESET" }));

      // Fully closed again: a normal exceeded response now behaves normally,
      // not like a circuit-open response.
      redisClient.eval.mockResolvedValue(scriptResult(0, 11, 250, 10));
      await expect(limiter.check("test-endpoint", simplePolicy())).rejects.toBeInstanceOf(RequestLimitExceededException);
    });

    it("gives each check() call a unique circuit-breaker operation name", async () => {
      const executeSpy = jest.spyOn(CircuitBreaker.prototype, "execute");
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 295, 10));

      await limiter.check("a", simplePolicy());
      await limiter.check("b", simplePolicy());

      const [, firstName] = executeSpy.mock.calls[0];
      const [, secondName] = executeSpy.mock.calls[1];
      expect(firstName).not.toBe(secondName);

      executeSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------
  // Top-level unexpected errors (outside checkLimit's own try/catch)
  // ---------------------------------------------------------------------
  describe("unexpected errors outside checkLimit", () => {
    it("handles an error thrown by resolveIdentity via the single, non-duplicated UNEXPECTED_ERROR path", async () => {
      // Unlike the checkLimit-internal failures above, this error is thrown
      // directly inside performRateLimit (before checkLimit's own try/catch
      // ever runs), so it's only ever processed once by check()'s catch.
      requestContext.get.mockImplementation(() => {
        throw new Error("context unavailable");
      });

      await limiter.check("test-endpoint", defaultPolicy).catch(() => undefined);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "UNEXPECTED_ERROR",
          data: expect.objectContaining({ executionContext: "test-endpoint", error: "context unavailable" }),
        }),
      );
      const checkErrorLogs = logger.error.mock.calls.filter(([arg]) => arg.event === "CHECK_ERROR");
      expect(checkErrorLogs).toHaveLength(1);
    });

    it("stringifies a non-Error thrown value in the UNEXPECTED_ERROR log", async () => {
      requestContext.get.mockImplementation(() => {
        throw "plain string failure";
      });

      await limiter.check("test-endpoint", defaultPolicy).catch(() => undefined);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "UNEXPECTED_ERROR",
          stack: undefined,
          data: expect.objectContaining({ error: "plain string failure" }),
        }),
      );
    });

    it("stringifies a non-Error thrown value in the SECURITY_ALERT_INFRASTRUCTURE_FAILURE log", async () => {
      strategy.securityAlertsEnabled = true;
      requestContext.get.mockImplementation(() => {
        throw "plain string failure";
      });

      await limiter.check("test-endpoint", defaultPolicy).catch(() => undefined);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "SECURITY_ALERT_INFRASTRUCTURE_FAILURE",
          data: expect.objectContaining({ error: "plain string failure" }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------
  // Key building / sanitization
  // ---------------------------------------------------------------------
  describe("key building and sanitization", () => {
    it("sanitizes special characters in the execution context", async () => {
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 295, 10));

      await limiter.check("test/endpoint:with@special#chars", simplePolicy());

      const keysUsed = redisClient.eval.mock.calls.map((call) => call[2] as string);
      expect(keysUsed.some((key) => key.includes("test_endpoint_with_special_chars"))).toBe(true);
    });

    it("lowercases the identifier", async () => {
      requestContext.get.mockReturnValue({ requestId: "r", userId: "User@Example.COM" });
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 295, 100));

      await limiter.check("test-endpoint", defaultPolicy);

      const keysUsed = redisClient.eval.mock.calls.map((call) => call[2] as string);
      expect(keysUsed.some((key) => key.includes("user_example.com"))).toBe(true);
    });

    it("truncates the context portion of the key to 100 characters", async () => {
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 295, 10));

      await limiter.check("a".repeat(150), simplePolicy());

      const [key] = redisClient.eval.mock.calls.map((call) => call[2] as string);
      const withoutPrefix = key.replace("rate_limit:", "");
      const [contextPart] = withoutPrefix.split(":");
      expect(contextPart).toHaveLength(100);
      expect(contextPart).toMatch(/^a{100}$/);
    });

    it("builds the key as rate_limit:<context>:<identifier>", async () => {
      redisClient.eval.mockResolvedValue(scriptResult(1, 1, 295, 10));

      await limiter.check("orders", simplePolicy());

      const [key] = redisClient.eval.mock.calls.map((call) => call[2] as string);
      expect(key).toBe("rate_limit:orders:192.168.1.1");
    });
  });

  // ---------------------------------------------------------------------
  // Emergency throttle cleanup
  // ---------------------------------------------------------------------
  describe("emergency throttle cleanup", () => {
    it("removes stale emergency-throttle entries once they're older than 2x the cleanup interval", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      strategy.circuitOpenStrategy = "throttle";
      redisClient.eval.mockRejectedValue(new Error("down"));
      redisClient.incr.mockRejectedValue(new Error("down"));

      await limiter.check("test-endpoint", simplePolicy()).catch(() => undefined); // trips it
      await limiter.check("test-endpoint", simplePolicy()); // creates a throttle map entry

      const throttleMap = (limiter as unknown as { emergencyThrottleMap: Map<string, unknown> }).emergencyThrottleMap;
      expect(throttleMap.size).toBeGreaterThan(0);

      // CLEANUP_INTERVAL is 60s and entries expire once older than 2x that
      // (120s); advance well past several ticks to guarantee a cleanup run
      // after the entry has aged out.
      jest.advanceTimersByTime(300_000);

      expect(throttleMap.size).toBe(0);
    });

    it("keeps a fresh entry across a cleanup tick that runs before it has aged out", async () => {
      strategy.rateLimitErrorStrategy = "deny";
      strategy.circuitOpenStrategy = "throttle";
      redisClient.eval.mockRejectedValue(new Error("down"));
      redisClient.incr.mockRejectedValue(new Error("down"));

      await limiter.check("test-endpoint", simplePolicy()).catch(() => undefined);
      await limiter.check("test-endpoint", simplePolicy());

      const throttleMap = (limiter as unknown as { emergencyThrottleMap: Map<string, unknown> }).emergencyThrottleMap;

      // One cleanup tick (60s) - nowhere near the 120s expiry.
      jest.advanceTimersByTime(60_000);

      expect(throttleMap.size).toBeGreaterThan(0);
    });

    it("runs cleanupEmergencyThrottle on the scheduled interval", () => {
      const cleanupSpy = jest.spyOn(limiter as unknown as { cleanupEmergencyThrottle: () => void }, "cleanupEmergencyThrottle" as never);

      jest.advanceTimersByTime(60_000);

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});
