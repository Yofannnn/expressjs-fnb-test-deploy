import { CircuitBreaker, CircuitBreakerConfig } from "@/infrastructure/circuit-breaker/circuit-breaker";
import { LoggerPort } from "@/application/ports/driven/logger.port";

/**
 * NOTE ON IMPORT PATHS:
 * The provided `circuit-breaker.ts` exports a plain `CircuitBreaker` (no `.adapter`
 * suffix, no `type: "RATE_LIMIT" | "EVENT_HANDLER" | "DATABASE"` presets, no
 * `AppException`-aware `shouldCountFailure`). The original test file was written
 * against a different, older version of this class. This suite targets the class
 * as it is actually implemented today. Adjust the `./circuit-breaker` import path
 * to match your project's real file location if it differs.
 */

// Fake timers make Date.now() controllable, which is what canExecute(),
// getTimeUntilReset(), and the time-window failure logic all depend on.
jest.useFakeTimers();

function createMockLogger(): jest.Mocked<LoggerPort> {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  } as unknown as jest.Mocked<LoggerPort>;
}

function createConfig(overrides: Partial<CircuitBreakerConfig> = {}): CircuitBreakerConfig {
  return {
    name: "TestCircuitBreaker",
    failureThreshold: 3,
    cooldownPeriod: 30_000,
    halfOpenMaxCalls: 1,
    timeWindow: 60_000,
    ...overrides,
  };
}

/**
 * Advances the fake clock by `ms` from *inside* an async operation, so that
 * `Date.now() - startTime` inside `execute()` measures a controlled duration.
 * Because the callback has no `await` before the `advanceTimersByTime` call,
 * it runs synchronously before the returned promise is awaited, which moves
 * the fake clock forward before `execute()` takes its "after" timestamp.
 */
function operationWithDuration<T>(ms: number, result: T): jest.Mock<Promise<T>, []> {
  return jest.fn().mockImplementation(async () => {
    jest.advanceTimersByTime(ms);
    return result;
  });
}

function failingOperationWithDuration(ms: number, error: unknown): jest.Mock<Promise<never>, []> {
  return jest.fn().mockImplementation(async () => {
    jest.advanceTimersByTime(ms);
    throw error;
  });
}

describe("CircuitBreaker", () => {
  let logger: jest.Mocked<LoggerPort>;

  beforeEach(() => {
    logger = createMockLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------
  // Construction / initial state
  // ---------------------------------------------------------------------
  describe("construction and initial state", () => {
    it("stores the provided config verbatim", () => {
      const config = createConfig({ name: "Custom", failureThreshold: 7, cooldownPeriod: 1_234, halfOpenMaxCalls: 2, timeWindow: 9_999 });
      const breaker = new CircuitBreaker(config, logger);

      expect(breaker.getConfig()).toEqual(config);
    });

    it("defaults isFailure to a predicate that treats every error as a failure", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1 }), logger);
      const operation = jest.fn().mockRejectedValue(new Error("boom"));

      await expect(breaker.execute(operation, "op")).rejects.toThrow("boom");

      expect(breaker.getState().state).toBe("OPEN");
    });

    it("starts in the CLOSED state with zeroed counters", () => {
      const breaker = new CircuitBreaker(createConfig(), logger);
      const state = breaker.getState();

      expect(state.state).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
      expect(state.halfOpenAttempts).toBe(0);
      expect(state.lastFailureTime).toBe(0);
      expect(state.lastSuccessTime).toBe(0);
    });

    it("starts with zeroed metrics", () => {
      const breaker = new CircuitBreaker(createConfig(), logger);
      const metrics = breaker.getMetrics();

      expect(metrics).toMatchObject({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        circuitOpenDuration: 0,
        averageResponseTime: 0,
      });
    });
  });

  // ---------------------------------------------------------------------
  // Successful execution
  // ---------------------------------------------------------------------
  describe("successful execution", () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker(createConfig(), logger);
    });

    it("resolves with the operation's result", async () => {
      const operation = jest.fn().mockResolvedValue("payload");

      await expect(breaker.execute(operation, "op")).resolves.toBe("payload");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("increments totalRequests and successfulRequests, leaves failedRequests at 0", async () => {
      await breaker.execute(jest.fn().mockResolvedValue("ok"), "op");

      const metrics = breaker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
    });

    it("updates lastSuccessTime and keeps failureCount at 0", async () => {
      await breaker.execute(jest.fn().mockResolvedValue("ok"), "op");

      const state = breaker.getState();
      expect(state.lastSuccessTime).toBeGreaterThan(0);
      expect(state.failureCount).toBe(0);
    });

    it("computes a running weighted average response time across calls", async () => {
      await breaker.execute(operationWithDuration(100, "a"), "op-a");
      expect(breaker.getMetrics().averageResponseTime).toBe(100);

      await breaker.execute(operationWithDuration(200, "b"), "op-b");
      // (100 * (2-1) + 200) / 2 = 150
      expect(breaker.getMetrics().averageResponseTime).toBe(150);

      await breaker.execute(operationWithDuration(0, "c"), "op-c");
      // (150 * (3-1) + 0) / 3 = 100
      expect(breaker.getMetrics().averageResponseTime).toBe(100);
    });
  });

  // ---------------------------------------------------------------------
  // Failure handling / threshold logic
  // ---------------------------------------------------------------------
  describe("failure handling", () => {
    it("re-throws the original error", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 5 }), logger);
      const error = new Error("downstream failure");

      await expect(breaker.execute(jest.fn().mockRejectedValue(error), "op")).rejects.toBe(error);
    });

    it("propagates non-Error rejection values unchanged", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 5 }), logger);

      await expect(breaker.execute(jest.fn().mockRejectedValue("string error"), "op")).rejects.toBe("string error");
    });

    it("stringifies a non-Error rejection when logging CIRCUIT_TRIPPED", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1 }), logger);

      await expect(breaker.execute(jest.fn().mockRejectedValue("plain string failure"), "op")).rejects.toBe("plain string failure");

      expect(breaker.getState().state).toBe("OPEN");
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "CIRCUIT_TRIPPED",
          data: expect.objectContaining({ error: "plain string failure" }),
        }),
      );
    });

    it("increments failedRequests and totalRequests but not successfulRequests", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 5 }), logger);

      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      const metrics = breaker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
    });

    it("stays CLOSED and does not log CIRCUIT_TRIPPED while below the failure threshold", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 3 }), logger);

      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      expect(breaker.getState().state).toBe("CLOSED");
      expect(breaker.getState().failureCount).toBe(2);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("trips to OPEN exactly when failureCount reaches the threshold", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 3 }), logger);
      const operation = jest.fn().mockRejectedValue(new Error("x"));

      await expect(breaker.execute(operation, "op")).rejects.toThrow();
      expect(breaker.getState().state).toBe("CLOSED");

      await expect(breaker.execute(operation, "op")).rejects.toThrow();
      expect(breaker.getState().state).toBe("CLOSED");

      await expect(breaker.execute(operation, "op")).rejects.toThrow();
      expect(breaker.getState().state).toBe("OPEN");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "CIRCUIT_TRIPPED",
          message: expect.stringContaining("threshold_exceeded"),
        }),
      );
    });

    it("resets failureCount once the time window has elapsed", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 3, timeWindow: 60_000 }), logger);
      const operation = jest.fn().mockRejectedValue(new Error("x"));

      await expect(breaker.execute(operation, "op")).rejects.toThrow();
      await expect(breaker.execute(operation, "op")).rejects.toThrow();
      expect(breaker.getState().failureCount).toBe(2);

      jest.advanceTimersByTime(61_000);

      await expect(breaker.execute(operation, "op")).rejects.toThrow();

      expect(breaker.getState().failureCount).toBe(1);
      expect(breaker.getState().state).toBe("CLOSED");
    });

    it("resets failureCount when the window has elapsed by exactly timeWindow ms (inclusive boundary)", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 5, timeWindow: 60_000 }), logger);
      const operation = jest.fn().mockRejectedValue(new Error("x"));

      await expect(breaker.execute(operation, "op")).rejects.toThrow();
      expect(breaker.getState().failureCount).toBe(1);

      jest.advanceTimersByTime(60_000);

      await expect(breaker.execute(operation, "op")).rejects.toThrow();

      expect(breaker.getState().failureCount).toBe(1);
    });

    it("does not reset failureCount before the time window elapses", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 5, timeWindow: 60_000 }), logger);
      const operation = jest.fn().mockRejectedValue(new Error("x"));

      await expect(breaker.execute(operation, "op")).rejects.toThrow();

      jest.advanceTimersByTime(30_000);

      await expect(breaker.execute(operation, "op")).rejects.toThrow();

      expect(breaker.getState().failureCount).toBe(2);
    });

    it("uses a custom isFailure predicate to ignore certain errors entirely", async () => {
      class RateLimitError extends Error {}
      const breaker = new CircuitBreaker(
        createConfig({
          failureThreshold: 1,
          isFailure: (error) => !(error instanceof RateLimitError),
        }),
        logger,
      );

      await expect(breaker.execute(jest.fn().mockRejectedValue(new RateLimitError("slow down")), "op")).rejects.toThrow();

      const state = breaker.getState();
      const metrics = breaker.getMetrics();
      expect(state.state).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
      // totalRequests is still counted (it's incremented before the operation runs);
      // only the failure bookkeeping is skipped.
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
    });

    it("falls back to a generic 'failures' wording when logCircuitTripped is called with no reason (defensive default)", () => {
      // `reason` is only ever omitted if logCircuitTripped() is called directly;
      // every real call site in the class always supplies one. This exercises
      // the `reason || "failures"` fallback for completeness.
      const breaker = new CircuitBreaker(createConfig(), logger) as unknown as {
        logCircuitTripped: (error: unknown, operationName?: string) => void;
      };

      breaker.logCircuitTripped(new Error("x"), "op");

      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: "Circuit breaker opened due to failures" }));
    });

    it("counts errors the isFailure predicate does not exempt", async () => {
      class RateLimitError extends Error {}
      const breaker = new CircuitBreaker(
        createConfig({
          failureThreshold: 1,
          isFailure: (error) => !(error instanceof RateLimitError),
        }),
        logger,
      );

      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("other error")), "op")).rejects.toThrow();

      expect(breaker.getState().state).toBe("OPEN");
    });
  });

  // ---------------------------------------------------------------------
  // OPEN state behavior
  // ---------------------------------------------------------------------
  describe("OPEN state", () => {
    let breaker: CircuitBreaker;

    beforeEach(async () => {
      breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("trip it")), "op")).rejects.toThrow();
      expect(breaker.getState().state).toBe("OPEN");
      logger.warn.mockClear();
      logger.error.mockClear();
    });

    it("rejects new calls without invoking the operation", async () => {
      const operation = jest.fn().mockResolvedValue("should not run");

      await expect(breaker.execute(operation, "op")).rejects.toThrow(/Circuit breaker 'TestCircuitBreaker' is open/);
      expect(operation).not.toHaveBeenCalled();
    });

    it("includes the remaining cooldown time in the rejection message", async () => {
      jest.advanceTimersByTime(10_000);

      await expect(breaker.execute(jest.fn(), "op")).rejects.toThrow("Time until reset: 20000ms");
    });

    it("logs a CIRCUIT_OPEN warning with diagnostic data", async () => {
      await expect(breaker.execute(jest.fn(), "op")).rejects.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "CIRCUIT_OPEN",
          data: expect.objectContaining({
            operationName: "op",
            state: "OPEN",
          }),
        }),
      );
    });

    it("still counts rejected-while-open calls toward totalRequests", async () => {
      const before = breaker.getMetrics().totalRequests;

      await expect(breaker.execute(jest.fn(), "op")).rejects.toThrow();

      expect(breaker.getMetrics().totalRequests).toBe(before + 1);
    });

    it("transitions to HALF_OPEN and allows the call through once the cooldown elapses", async () => {
      jest.advanceTimersByTime(30_000);

      const operation = jest.fn().mockResolvedValue("recovered");
      await expect(breaker.execute(operation, "op")).resolves.toBe("recovered");

      expect(operation).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "TRANSITION_TO_HALF_OPEN" }));
    });

    it("does not transition before the cooldown elapses", async () => {
      jest.advanceTimersByTime(29_999);

      await expect(breaker.execute(jest.fn(), "op")).rejects.toThrow();
      expect(breaker.getState().state).toBe("OPEN");
    });

    it("accumulates circuitOpenDuration once the circuit recovers", async () => {
      jest.advanceTimersByTime(30_000);

      await breaker.execute(jest.fn().mockResolvedValue("ok"), "op");

      expect(breaker.getMetrics().circuitOpenDuration).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------
  // HALF_OPEN state behavior
  // ---------------------------------------------------------------------
  describe("HALF_OPEN state", () => {
    async function tripAndAdvanceToHalfOpen(breaker: CircuitBreaker, cooldownPeriod: number) {
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("trip it")), "op")).rejects.toThrow();
      jest.advanceTimersByTime(cooldownPeriod + 1);
    }

    it("closes the circuit and resets counters after a successful half-open call", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await tripAndAdvanceToHalfOpen(breaker, 30_000);

      await breaker.execute(jest.fn().mockResolvedValue("ok"), "op");

      const state = breaker.getState();
      expect(state.state).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
      expect(state.halfOpenAttempts).toBe(0);

      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "CIRCUIT_RESET" }));
    });

    it("re-opens the circuit if the half-open probe fails, logging the half_open_failure reason", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await tripAndAdvanceToHalfOpen(breaker, 30_000);

      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("still broken")), "op")).rejects.toThrow();

      const state = breaker.getState();
      expect(state.state).toBe("OPEN");
      expect(state.halfOpenAttempts).toBe(1);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "CIRCUIT_TRIPPED",
          message: expect.stringContaining("half_open_failure"),
        }),
      );
    });

    it("rejects calls once halfOpenAttempts reaches halfOpenMaxCalls", () => {
      // The implementation only increments halfOpenAttempts inside onFailure's
      // HALF_OPEN branch (which simultaneously flips state back to OPEN), so
      // this branch of canExecute() cannot be reached through the public
      // execute() API alone in a single-threaded test. We drive it directly
      // via the (documented, internal) state to verify the guard itself.
      const breaker = new CircuitBreaker(createConfig({ halfOpenMaxCalls: 2 }), logger) as unknown as {
        state: { state: string; halfOpenAttempts: number };
        canExecute: () => boolean;
      };
      breaker.state.state = "HALF_OPEN";
      breaker.state.halfOpenAttempts = 2;

      expect(breaker.canExecute()).toBe(false);
    });

    it("allows calls while halfOpenAttempts is below halfOpenMaxCalls", () => {
      const breaker = new CircuitBreaker(createConfig({ halfOpenMaxCalls: 2 }), logger) as unknown as {
        state: { state: string; halfOpenAttempts: number };
        canExecute: () => boolean;
      };
      breaker.state.state = "HALF_OPEN";
      breaker.state.halfOpenAttempts = 1;

      expect(breaker.canExecute()).toBe(true);
    });

    it("falls through to false for any state value outside the known union (defensive default branch)", () => {
      // The `state` field is typed as a closed union, so this branch is
      // unreachable through normal, type-safe usage. It's exercised here only
      // to cover the defensive `default` case in the switch statement.
      const breaker = new CircuitBreaker(createConfig(), logger) as unknown as {
        state: { state: string };
        canExecute: () => boolean;
      };
      breaker.state.state = "UNKNOWN" as any;

      expect(breaker.canExecute()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // Operation locking (per operationName mutex)
  // ---------------------------------------------------------------------
  describe("operation locking", () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker(createConfig({ failureThreshold: 5 }), logger);
    });

    it("serializes calls that share the same operationName", async () => {
      const order: number[] = [];

      const slow = jest.fn().mockImplementation(async () => {
        order.push(1);
        await new Promise((resolve) => setTimeout(resolve, 100));
        order.push(2);
        return "slow";
      });
      const fast = jest.fn().mockImplementation(async () => {
        order.push(3);
        return "fast";
      });

      const p1 = breaker.execute(slow, "same-op");
      const p2 = breaker.execute(fast, "same-op");

      jest.advanceTimersByTime(100);
      await Promise.all([p1, p2]);

      expect(order).toEqual([1, 2, 3]);
    });

    it("runs calls with different operationNames concurrently", async () => {
      const op1 = jest.fn().mockResolvedValue("op1");
      const op2 = jest.fn().mockResolvedValue("op2");

      const [r1, r2] = await Promise.all([breaker.execute(op1, "name-a"), breaker.execute(op2, "name-b")]);

      expect(r1).toBe("op1");
      expect(r2).toBe("op2");
    });

    it("releases the lock when the running operation throws, so the next same-named call proceeds", async () => {
      const order: number[] = [];

      const failing = jest.fn().mockImplementation(async () => {
        order.push(1);
        await new Promise((resolve) => setTimeout(resolve, 100));
        order.push(2);
        throw new Error("first failed");
      });
      const next = jest.fn().mockImplementation(async () => {
        order.push(3);
        return "second result";
      });

      const p1 = breaker.execute(failing, "same-op");
      const p2 = breaker.execute(next, "same-op");

      jest.advanceTimersByTime(100);

      await expect(p1).rejects.toThrow("first failed");
      await expect(p2).resolves.toBe("second result");
      expect(order).toEqual([1, 2, 3]);
    });
  });

  // ---------------------------------------------------------------------
  // Getters: immutability / defensive copies
  // ---------------------------------------------------------------------
  describe("getState, getConfig, getMetrics", () => {
    it("expose the expected shape", () => {
      const breaker = new CircuitBreaker(createConfig(), logger);

      expect(breaker.getState()).toEqual(
        expect.objectContaining({
          state: "CLOSED",
          failureCount: 0,
          lastFailureTime: 0,
          lastSuccessTime: 0,
          halfOpenAttempts: 0,
        }),
      );
      expect(breaker.getConfig()).toEqual(expect.objectContaining({ name: "TestCircuitBreaker" }));
      expect(breaker.getMetrics()).toEqual(expect.objectContaining({ totalRequests: 0 }));
    });

    it("return copies that cannot be used to mutate internal state", () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1 }), logger);

      const state = breaker.getState() as any;
      const config = breaker.getConfig() as any;
      const metrics = breaker.getMetrics() as any;

      state.state = "OPEN";
      config.failureThreshold = 999;
      metrics.totalRequests = 999;

      expect(breaker.getState().state).toBe("CLOSED");
      expect(breaker.getConfig().failureThreshold).toBe(1);
      expect(breaker.getMetrics().totalRequests).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // isOpen()
  // ---------------------------------------------------------------------
  describe("isOpen", () => {
    it("is false when CLOSED", () => {
      const breaker = new CircuitBreaker(createConfig(), logger);
      expect(breaker.isOpen()).toBe(false);
    });

    it("is true immediately after tripping, before the cooldown elapses", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      expect(breaker.isOpen()).toBe(true);
    });

    it("becomes false (and side-effects a transition to HALF_OPEN) once the cooldown has elapsed", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      jest.advanceTimersByTime(30_000);

      // isOpen() calls canExecute() internally, which transitions OPEN -> HALF_OPEN
      // as a side effect once the cooldown has elapsed.
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getState().state).toBe("HALF_OPEN");
    });
  });

  // ---------------------------------------------------------------------
  // getHealthStatus()
  // ---------------------------------------------------------------------
  describe("getHealthStatus", () => {
    it("is healthy when CLOSED", () => {
      const breaker = new CircuitBreaker(createConfig(), logger);
      const health = breaker.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.details.state).toBe("CLOSED");
    });

    it("is unhealthy when OPEN", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      const health = breaker.getHealthStatus();
      expect(health.healthy).toBe(false);
      expect(health.details.state).toBe("OPEN");
    });

    it("is healthy when HALF_OPEN with zero attempts used", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();
      jest.advanceTimersByTime(30_000);

      // Trigger the OPEN -> HALF_OPEN transition without consuming an attempt.
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getState().state).toBe("HALF_OPEN");

      expect(breaker.getHealthStatus().healthy).toBe(true);
    });

    it("is unhealthy when HALF_OPEN with at least one attempt used", () => {
      const breaker = new CircuitBreaker(createConfig(), logger) as unknown as {
        state: { state: string; halfOpenAttempts: number };
        getHealthStatus: () => { healthy: boolean; details: Record<string, unknown> };
      };
      breaker.state.state = "HALF_OPEN";
      breaker.state.halfOpenAttempts = 1;

      expect(breaker.getHealthStatus().healthy).toBe(false);
    });

    it("reports a 0 failureRate when there have been no requests", () => {
      const breaker = new CircuitBreaker(createConfig(), logger);
      expect(breaker.getHealthStatus().details.failureRate).toBe(0);
    });

    it("computes failureRate as failedRequests / totalRequests", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 5 }), logger);

      await breaker.execute(jest.fn().mockResolvedValue("ok"), "op");
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      expect(breaker.getHealthStatus().details.failureRate).toBe(0.5);
    });

    it("surfaces averageResponseTime, timeUntilReset, and uptime", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      jest.advanceTimersByTime(10_000);

      const health = breaker.getHealthStatus();
      expect(health.details.timeUntilReset).toBe(20_000);
      expect(health.details.uptime).toBeGreaterThanOrEqual(0);
      expect(health.details.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------
  // getTimeUntilReset() via public surfaces (isOpen / getHealthStatus / error message)
  // ---------------------------------------------------------------------
  describe("time-until-reset accounting", () => {
    it("is 0 while CLOSED", () => {
      const breaker = new CircuitBreaker(createConfig(), logger);
      expect(breaker.getHealthStatus().details.timeUntilReset).toBe(0);
    });

    it("counts down linearly while OPEN", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      jest.advanceTimersByTime(5_000);
      expect(breaker.getHealthStatus().details.timeUntilReset).toBe(25_000);

      jest.advanceTimersByTime(20_000);
      expect(breaker.getHealthStatus().details.timeUntilReset).toBe(5_000);
    });

    it("floors at 0 once the cooldown has fully elapsed", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      jest.advanceTimersByTime(60_000);

      // Note: reading getHealthStatus() here does not go through canExecute(),
      // so it will not have transitioned to HALF_OPEN yet; getTimeUntilReset()
      // still reports 0 because it clamps with Math.max(0, ...).
      expect(breaker.getHealthStatus().details.timeUntilReset).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // forceReset()
  // ---------------------------------------------------------------------
  describe("forceReset", () => {
    it("restores CLOSED state and zeroed failure/half-open counters", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();
      expect(breaker.getState().state).toBe("OPEN");

      breaker.forceReset();

      const state = breaker.getState();
      expect(state.state).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
      expect(state.halfOpenAttempts).toBe(0);
    });

    it("does not reset accumulated request/response metrics", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      breaker.forceReset();

      // totalRequests/failedRequests live on `metrics`, which forceReset()
      // does not recreate (only lastResetTime is touched on it).
      expect(breaker.getMetrics().totalRequests).toBe(1);
      expect(breaker.getMetrics().failedRequests).toBe(1);
    });

    it("bumps metrics.lastResetTime", () => {
      const breaker = new CircuitBreaker(createConfig(), logger);
      const before = breaker.getMetrics().lastResetTime;

      jest.advanceTimersByTime(5_000);
      breaker.forceReset();

      expect(breaker.getMetrics().lastResetTime).toBeGreaterThan(before);
    });

    it("logs a CIRCUIT_FORCE_RESET warning", () => {
      const breaker = new CircuitBreaker(createConfig(), logger);
      breaker.forceReset();

      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "CIRCUIT_FORCE_RESET" }));
    });

    it("allows operations to run again immediately after a forced reset from OPEN", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      breaker.forceReset();

      await expect(breaker.execute(jest.fn().mockResolvedValue("recovered"), "op")).resolves.toBe("recovered");
    });
  });

  // ---------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------
  describe("edge cases", () => {
    it("with cooldownPeriod 0, the very next call after tripping is treated as past cooldown", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 0 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      const result = await breaker.execute(jest.fn().mockResolvedValue("ok"), "op");

      expect(result).toBe("ok");
      expect(breaker.getState().state).toBe("CLOSED");
    });

    it("with halfOpenMaxCalls 0, the transitioning probe call is still let through, but the next check is blocked", async () => {
      // The OPEN branch of canExecute() returns `true` unconditionally as soon as
      // it transitions to HALF_OPEN — it does not re-check halfOpenAttempts on
      // that same call. The halfOpenMaxCalls guard only bites on a *subsequent*
      // canExecute() while already in HALF_OPEN.
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 1, cooldownPeriod: 30_000, halfOpenMaxCalls: 0 }), logger);
      await expect(breaker.execute(jest.fn().mockRejectedValue(new Error("x")), "op")).rejects.toThrow();

      jest.advanceTimersByTime(30_000);

      // First check after cooldown: transitions OPEN -> HALF_OPEN and returns true.
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getState().state).toBe("HALF_OPEN");

      // Second check, still HALF_OPEN with 0 attempts used: 0 < 0 is false.
      expect(breaker.isOpen()).toBe(true);
    });

    it("supports multiple independent trip/recover cycles", async () => {
      const breaker = new CircuitBreaker(createConfig({ failureThreshold: 2, cooldownPeriod: 10_000 }), logger);
      const failing = jest.fn().mockRejectedValue(new Error("x"));

      await expect(breaker.execute(failing, "op")).rejects.toThrow();
      await expect(breaker.execute(failing, "op")).rejects.toThrow();
      expect(breaker.getState().state).toBe("OPEN");

      jest.advanceTimersByTime(11_000);
      await breaker.execute(jest.fn().mockResolvedValue("ok"), "op");
      expect(breaker.getState().state).toBe("CLOSED");

      await expect(breaker.execute(failing, "op")).rejects.toThrow();
      await expect(breaker.execute(failing, "op")).rejects.toThrow();
      expect(breaker.getState().state).toBe("OPEN");

      expect(breaker.getMetrics().circuitOpenDuration).toBeGreaterThan(0);
    });
  });
});
