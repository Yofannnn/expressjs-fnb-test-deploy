import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
import { PrismaDatabaseConfig } from "@/infrastructure/config/prisma-database.config";
import { CircuitBreaker, CircuitBreakerConfig } from "@/infrastructure/circuit-breaker/circuit-breaker";
import { CircuitBreakerFactory } from "@/infrastructure/circuit-breaker/circuit-breaker.factory";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../prisma/generated";

/**
 * NOTE ON IMPORT PATHS:
 * `prisma-database-client.ts` reaches `../common/circuit-breaker`,
 * `../common/circuit-breaker.factory`, and `../../../prisma/generated` with
 * plain relative paths rather than the `@/...` alias used elsewhere in the
 * file. This suite assumes it is colocated with the source file (standard
 * `*_test.ts`-next-to-source layout) and mirrors those same relative paths.
 * If your test actually lives somewhere else (e.g. a `__tests__` folder),
 * adjust the `../../../prisma/generated` and `../common/circuit-breaker*`
 * import/mock paths accordingly.
 */

jest.mock("../../../../prisma/generated", () => ({
  PrismaClient: jest.fn(),
}));

jest.mock("@/infrastructure/database/prisma-transaction-context");

// The client builds its own pg Pool + PrismaPg adapter in the constructor.
// Mocked out so tests exercise PrismaDatabaseClient's own logic without
// needing a real Postgres connection string or driver.
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

function makeMockPrismaClient() {
  return {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $on: jest.fn(),
  };
}

function makeLogger(): jest.Mocked<LoggerPort> {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  } as unknown as jest.Mocked<LoggerPort>;
}

// NOTE: prisma-database.config.ts wasn't part of the files shared for this
// pass. The only field the client actually reads is `databaseUrl` (used to
// construct the pg Pool), so this mock covers what's needed; cast for safety
// in case the real interface has more required fields.
function makeDbConfig(overrides?: Partial<PrismaDatabaseConfig>): PrismaDatabaseConfig {
  return {
    databaseUrl: "postgresql://user:pass@localhost:5432/test",
    ...overrides,
  } as PrismaDatabaseConfig;
}

/**
 * A stand-in for the CircuitBreaker the factory hands back. By default it's a
 * transparent pass-through (`execute` just invokes and returns the wrapped
 * operation), so most PrismaDatabaseClient tests exercise only the client's
 * own logic — the CircuitBreaker's internal state machine, thresholds, and
 * cooldowns already have their own dedicated unit tests and shouldn't be
 * re-verified here.
 */
function makeMockCircuitBreaker() {
  return {
    execute: jest.fn(async (operation: () => Promise<unknown>, _operationName?: string) => operation()),
  };
}

function makeCircuitBreakerFactory(breaker: ReturnType<typeof makeMockCircuitBreaker>): jest.Mocked<CircuitBreakerFactory> {
  return {
    create: jest.fn().mockReturnValue(breaker),
  } as unknown as jest.Mocked<CircuitBreakerFactory>;
}

/**
 * Configures mockPrismaClient.$transaction to run the callback with the
 * supplied prismaTx object (defaults to `{}`).
 */
function mockTransactionSuccess(mockPrismaClient: ReturnType<typeof makeMockPrismaClient>, prismaTx: object = {}) {
  mockPrismaClient.$transaction.mockImplementation(async (cb: (...args: unknown[]) => unknown) => cb(prismaTx));
}

describe("PrismaDatabaseClient", () => {
  let logger: jest.Mocked<LoggerPort>;
  let dbConfig: PrismaDatabaseConfig;
  let mockPrismaClient: ReturnType<typeof makeMockPrismaClient>;
  let mockCircuitBreaker: ReturnType<typeof makeMockCircuitBreaker>;
  let circuitBreakerFactory: jest.Mocked<CircuitBreakerFactory>;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = makeLogger();
    dbConfig = makeDbConfig();
    mockPrismaClient = makeMockPrismaClient();
    mockCircuitBreaker = makeMockCircuitBreaker();
    circuitBreakerFactory = makeCircuitBreakerFactory(mockCircuitBreaker);

    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrismaClient as unknown as PrismaClient);
  });

  function makeClient() {
    return new PrismaDatabaseClient(dbConfig, logger, circuitBreakerFactory);
  }

  describe("constructor", () => {
    it("creates a pg Pool using the configured connection string", () => {
      makeClient();

      expect(Pool).toHaveBeenCalledTimes(1);
      expect(Pool).toHaveBeenCalledWith({ connectionString: dbConfig.databaseUrl });
    });

    it("wraps the pool in a PrismaPg adapter", () => {
      makeClient();

      const poolInstance = (Pool as unknown as jest.Mock).mock.results[0].value;

      expect(PrismaPg).toHaveBeenCalledTimes(1);
      expect(PrismaPg).toHaveBeenCalledWith(poolInstance);
    });

    it("creates PrismaClient with the adapter and full log config", () => {
      makeClient();

      const adapterInstance = (PrismaPg as unknown as jest.Mock).mock.results[0].value;

      expect(PrismaClient).toHaveBeenCalledTimes(1);
      expect(PrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          adapter: adapterInstance,
          log: expect.arrayContaining([
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
            { emit: "event", level: "info" },
            { emit: "event", level: "warn" },
          ]),
        }),
      );
    });

    it("builds its circuit breaker through the injected factory with the DATABASE-style config", () => {
      makeClient();

      expect(circuitBreakerFactory.create).toHaveBeenCalledTimes(1);
      expect(circuitBreakerFactory.create).toHaveBeenCalledWith({
        failureThreshold: 3,
        cooldownPeriod: 30_000,
        halfOpenMaxCalls: 1,
        timeWindow: 180_000,
        name: "DatabaseCircuitBreaker",
        isFailure: expect.any(Function),
      });
    });

    it("does NOT connect to the database eagerly", () => {
      makeClient();
      expect(mockPrismaClient.$connect).not.toHaveBeenCalled();
    });
  });

  describe("lazy initialization", () => {
    it("connects to the database on the first executeInTransaction call", async () => {
      const client = makeClient();
      mockTransactionSuccess(mockPrismaClient);

      await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
    });

    it("registers info, warn, and error event listeners on first use", async () => {
      const client = makeClient();
      mockTransactionSuccess(mockPrismaClient);

      await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

      expect(mockPrismaClient.$on).toHaveBeenCalledWith("info", expect.any(Function));
      expect(mockPrismaClient.$on).toHaveBeenCalledWith("warn", expect.any(Function));
      expect(mockPrismaClient.$on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("logs a successful initialization message", async () => {
      const client = makeClient();
      mockTransactionSuccess(mockPrismaClient);

      await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client.initialized",
          message: "Prisma client initialized successfully",
        }),
      );
    });

    it("connects only once across multiple sequential executeInTransaction calls", async () => {
      const client = makeClient();
      mockTransactionSuccess(mockPrismaClient);
      const op = jest.fn().mockResolvedValue("ok");

      await client.executeInTransaction(op);
      await client.executeInTransaction(op);

      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
    });

    it("connects only once when calls race each other concurrently", async () => {
      // Unlike the sequential test above, this fires both calls before the
      // first $connect() has resolved, to actually exercise the initPromise
      // de-duplication in ensureInitialized() rather than just its cached
      // isInitialized flag.
      let resolveConnect!: () => void;
      mockPrismaClient.$connect.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveConnect = resolve;
          }),
      );

      const client = makeClient();
      mockTransactionSuccess(mockPrismaClient);

      const call1 = client.executeInTransaction(jest.fn().mockResolvedValue("r1"));
      const call2 = client.executeInTransaction(jest.fn().mockResolvedValue("r2"));

      resolveConnect();
      const [r1, r2] = await Promise.all([call1, call2]);

      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
      expect(r1).toBe("r1");
      expect(r2).toBe("r2");
    });

    it("logs an error and resets initPromise when $connect rejects", async () => {
      const connectError = new Error("Connection refused");
      mockPrismaClient.$connect.mockRejectedValueOnce(connectError);

      const client = makeClient();

      await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("Connection refused");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client.initialization_failed",
          message: "Connection refused",
          stack: connectError.stack,
        }),
      );
    });

    it("logs a fallback initialization-failure message for non-Error rejections", async () => {
      mockPrismaClient.$connect.mockRejectedValueOnce("connection string malformed");

      const client = makeClient();

      await expect(client.executeInTransaction(jest.fn())).rejects.toBe("connection string malformed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client.initialization_failed",
          message: "Prisma client initialization failed",
          stack: undefined,
        }),
      );
    });

    it("retries initialization after a previous failure", async () => {
      const connectError = new Error("Transient failure");
      mockPrismaClient.$connect.mockRejectedValueOnce(connectError).mockResolvedValueOnce(undefined);

      const client = makeClient();
      mockTransactionSuccess(mockPrismaClient);

      await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("Transient failure");

      const result = await client.executeInTransaction(jest.fn().mockResolvedValue("recovered"));

      expect(result).toBe("recovered");
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(2);
    });

    it("does not swallow an initialization failure into the transaction try/catch (no duplicate error log)", async () => {
      // executeInTransaction awaits ensureInitialized() *before* entering its
      // own try/catch. A connect failure should only ever be logged once, by
      // initialize() itself ("client.initialization_failed") — never a
      // second time as "prisma.transaction.error".
      mockPrismaClient.$connect.mockRejectedValueOnce(new Error("down"));

      const client = makeClient();

      await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("down");

      expect(logger.error).not.toHaveBeenCalledWith(expect.objectContaining({ event: "prisma.transaction.error" }));
    });
  });

  describe("Prisma event listeners", () => {
    let client: PrismaDatabaseClient;
    let capturedListeners: Record<string, (...args: unknown[]) => unknown>;

    beforeEach(async () => {
      capturedListeners = {};
      mockPrismaClient.$on.mockImplementation((event: string, handler: (...args: unknown[]) => unknown) => {
        capturedListeners[event] = handler;
      });

      client = makeClient();
      mockTransactionSuccess(mockPrismaClient);
      await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));
    });

    it("forwards info events to the logger", () => {
      const evt = { timestamp: new Date(), message: "Query executed", target: "db" };
      capturedListeners["info"](evt);

      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "prisma.info", data: evt }));
    });

    it("forwards warn events to the logger", () => {
      const evt = { timestamp: new Date(), message: "Slow query", target: "db" };
      capturedListeners["warn"](evt);

      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "prisma.warn", data: evt }));
    });

    it("forwards error events to the logger", () => {
      const evt = { timestamp: new Date(), message: "Query failed", target: "db" };
      capturedListeners["error"](evt);

      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ event: "prisma.error", data: evt }));
    });
  });

  describe("executeInTransaction", () => {
    let client: PrismaDatabaseClient;

    beforeEach(async () => {
      client = makeClient();
      mockTransactionSuccess(mockPrismaClient);
      await client.executeInTransaction(jest.fn().mockResolvedValue("prime"));
      jest.clearAllMocks();
      mockCircuitBreaker.execute.mockImplementation(async (operation: () => Promise<unknown>, _operationName?: string) => operation());
    });

    it("returns the value produced by the operation", async () => {
      mockTransactionSuccess(mockPrismaClient);

      const result = await client.executeInTransaction(jest.fn().mockResolvedValue("value"));

      expect(result).toBe("value");
    });

    it("passes a PrismaTransactionContext to the operation", async () => {
      const prismaTx = { __prisma: true };
      mockTransactionSuccess(mockPrismaClient, prismaTx);

      const op = jest.fn().mockResolvedValue("ok");
      await client.executeInTransaction(op);

      expect(PrismaTransactionContext).toHaveBeenCalledWith(prismaTx);
      expect(op).toHaveBeenCalledWith(expect.any(PrismaTransactionContext));
    });

    it("routes the transaction through the injected circuit breaker", async () => {
      mockTransactionSuccess(mockPrismaClient);

      await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

      expect(mockCircuitBreaker.execute).toHaveBeenCalledTimes(1);
      expect(mockCircuitBreaker.execute).toHaveBeenCalledWith(expect.any(Function), expect.stringMatching(/^executeInTransaction-\d+$/));
    });

    it("gives each call a unique circuit-breaker operation name", async () => {
      mockTransactionSuccess(mockPrismaClient);

      await client.executeInTransaction(jest.fn().mockResolvedValue("a"));
      await client.executeInTransaction(jest.fn().mockResolvedValue("b"));

      const [, firstName] = mockCircuitBreaker.execute.mock.calls[0];
      const [, secondName] = mockCircuitBreaker.execute.mock.calls[1];

      expect(firstName).not.toBe(secondName);
    });

    it("logs transaction start", async () => {
      mockTransactionSuccess(mockPrismaClient);

      await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "transaction.start",
          message: "Starting database transaction",
        }),
      );
    });

    it("logs transaction success with a numeric durationMs", async () => {
      mockTransactionSuccess(mockPrismaClient);

      await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "transaction.success",
          durationMs: expect.any(Number),
        }),
      );
    });

    it("logs an error (context 'PrismaService') and rethrows when the operation rejects with an Error", async () => {
      const error = new Error("Transaction failed");
      mockPrismaClient.$transaction.mockImplementation(async (cb: (...args: unknown[]) => unknown) => cb({}));
      const op = jest.fn().mockRejectedValue(error);

      await expect(client.executeInTransaction(op)).rejects.toThrow("Transaction failed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "prisma.transaction.error",
          context: "PrismaService",
          message: "Transaction failed",
          stack: error.stack,
          durationMs: expect.any(Number),
        }),
      );
    });

    it("logs a fallback message when the operation rejects with a non-Error value", async () => {
      mockPrismaClient.$transaction.mockImplementation(async (cb: (...args: unknown[]) => unknown) => cb({}));
      const op = jest.fn().mockRejectedValue("plain string error");

      await expect(client.executeInTransaction(op)).rejects.toBe("plain string error");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Database transaction failed",
          stack: undefined,
        }),
      );
    });

    it("logs and rethrows when the circuit breaker itself rejects, without ever touching $transaction", async () => {
      // Simulates an open circuit: the breaker rejects before invoking the
      // wrapped operation at all.
      const breakerError = new Error("Circuit breaker 'DatabaseCircuitBreaker' is open. Time until reset: 12000ms");
      mockCircuitBreaker.execute.mockRejectedValueOnce(breakerError);

      await expect(client.executeInTransaction(jest.fn())).rejects.toThrow(/Circuit breaker/);

      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "prisma.transaction.error",
          message: breakerError.message,
        }),
      );
    });

    // --- Regression test for a fixed bug ---
    //
    // executeInTransaction used to have:
    //   if (result === undefined) throw new Error("Transaction rejected due to circuit breaker");
    // left over from before the circuit breaker was factory-injected. The
    // real CircuitBreaker.execute() never returns undefined on success - it
    // always either returns the operation's real result or throws when the
    // circuit is open, so that check could never actually detect an open
    // circuit. It only ever misfired on operations that legitimately resolve
    // to `undefined` (e.g. a transactional write with no return value),
    // turning a successful, already-committed transaction into a false
    // "circuit breaker" rejection. This check has been removed - this test
    // guards against it (or anything equivalent) being reintroduced.
    it("resolves with undefined when the operation legitimately returns nothing (no false circuit-breaker rejection)", async () => {
      mockTransactionSuccess(mockPrismaClient);

      await expect(client.executeInTransaction(jest.fn().mockResolvedValue(undefined))).resolves.toBeUndefined();

      // The transaction genuinely ran and committed - confirm it wasn't
      // short-circuited before ever reaching Prisma.
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it("does NOT throw for falsy-but-not-undefined return values (null, false, 0, '')", async () => {
      mockTransactionSuccess(mockPrismaClient);

      await expect(client.executeInTransaction(jest.fn().mockResolvedValue(null))).resolves.toBeNull();
      await expect(client.executeInTransaction(jest.fn().mockResolvedValue(false))).resolves.toBe(false);
      await expect(client.executeInTransaction(jest.fn().mockResolvedValue(0))).resolves.toBe(0);
      await expect(client.executeInTransaction(jest.fn().mockResolvedValue(""))).resolves.toBe("");
    });

    it("handles concurrent transactions independently", async () => {
      mockTransactionSuccess(mockPrismaClient);

      const [r1, r2] = await Promise.all([
        client.executeInTransaction(jest.fn().mockResolvedValue("r1")),
        client.executeInTransaction(jest.fn().mockResolvedValue("r2")),
      ]);

      expect(r1).toBe("r1");
      expect(r2).toBe("r2");
    });

    it("does not serialize unrelated concurrent transactions behind a shared lock key", async () => {
      // Because each call gets a unique circuit-breaker operation name, a
      // slow transaction must never block a faster, unrelated one.
      let resolveSlow!: (value: string) => void;
      const slowOp = jest.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolveSlow = resolve;
          }),
      );
      const fastOp = jest.fn().mockResolvedValue("fast-result");

      mockPrismaClient.$transaction.mockImplementation(async (cb: (...args: unknown[]) => unknown) => cb({}));

      const slowPromise = client.executeInTransaction(slowOp);
      const fastPromise = client.executeInTransaction(fastOp);

      await expect(fastPromise).resolves.toBe("fast-result");
      expect(fastOp).toHaveBeenCalled();

      resolveSlow("slow-result");
      await expect(slowPromise).resolves.toBe("slow-result");
    });

    it("keeps incrementing the operation-name counter across both successes and failures", async () => {
      mockTransactionSuccess(mockPrismaClient);
      await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

      mockPrismaClient.$transaction.mockRejectedValueOnce(new Error("fail"));
      await client.executeInTransaction(jest.fn()).catch(() => {});

      mockTransactionSuccess(mockPrismaClient);
      await client.executeInTransaction(jest.fn().mockResolvedValue("ok again"));

      const names = mockCircuitBreaker.execute.mock.calls.map(([, name]) => name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("records an accurate durationMs for long-running operations", async () => {
      mockTransactionSuccess(mockPrismaClient);
      const op = jest.fn().mockImplementation(async () => {
        await new Promise((res) => setTimeout(res, 50));
        return "slow";
      });

      await client.executeInTransaction(op);

      const debugCalls = (logger.debug as jest.Mock).mock.calls as Array<[{ event: string; durationMs: number }]>;
      const [call] = debugCalls.filter(([arg]) => arg.event === "transaction.success");
      expect(call[0].durationMs).toBeGreaterThanOrEqual(50);
    });

    // --- Defensive/dead-code branch ---
    //
    // executeInTransaction re-checks `if (!this.isInitialized)` immediately
    // after awaiting ensureInitialized(). In practice ensureInitialized()
    // either resolves with isInitialized already true, or its awaited
    // initPromise rejects and propagates out before this line is ever
    // reached — so this branch cannot be hit through the public API alone.
    // It's only reachable by forcing the private flag back to false while a
    // resolved initPromise is still cached, which we do here purely for
    // coverage of that defensive check.
    it("throws 'Database client not initialized' if isInitialized is unexpectedly false after ensureInitialized resolves", async () => {
      (client as unknown as { isInitialized: boolean }).isInitialized = false;

      await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("Database client not initialized");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "transaction.not_initialized",
          message: "Database client not initialized",
        }),
      );
    });
  });

  describe("healthCheck", () => {
    let client: PrismaDatabaseClient;

    beforeEach(() => {
      client = makeClient();
    });

    it("returns true and logs success when the query succeeds", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "health_check.success",
          message: "Database health check passed",
        }),
      );
    });

    it("returns false and logs an error when the query rejects with an Error", async () => {
      const error = new Error("Connection refused");
      mockPrismaClient.$queryRaw.mockRejectedValue(error);

      const result = await client.healthCheck();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "health_check.error",
          message: "Connection refused",
          stack: error.stack,
        }),
      );
    });

    it("returns false with a fallback message for non-Error rejections", async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue("string error");

      const result = await client.healthCheck();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Database health check failed",
          stack: undefined,
        }),
      );
    });

    it("does not require prior initialization", async () => {
      expect(mockPrismaClient.$connect).not.toHaveBeenCalled();

      mockPrismaClient.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      await expect(client.healthCheck()).resolves.toBe(true);
      expect(mockPrismaClient.$connect).not.toHaveBeenCalled();
    });

    it("does not go through the circuit breaker", async () => {
      // healthCheck() calls prisma.$queryRaw directly, not through the
      // circuit breaker - so it keeps reporting real status even while the
      // circuit is open for executeInTransaction.
      mockPrismaClient.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      await client.healthCheck();

      expect(mockCircuitBreaker.execute).not.toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    let client: PrismaDatabaseClient;

    beforeEach(() => {
      client = makeClient();
    });

    it("calls $disconnect on the underlying PrismaClient", async () => {
      await client.disconnect();

      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
    });

    it("logs a successful disconnection", async () => {
      await client.disconnect();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client.disconnected",
          message: "Database client disconnected successfully",
        }),
      );
    });

    it("logs an error and rethrows when $disconnect rejects with an Error", async () => {
      const error = new Error("Disconnect failed");
      mockPrismaClient.$disconnect.mockRejectedValue(error);

      await expect(client.disconnect()).rejects.toThrow("Disconnect failed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "disconnect.error",
          message: "Disconnect failed",
          stack: error.stack,
        }),
      );
    });

    it("logs 'Unknown error' and rethrows for non-Error rejections", async () => {
      mockPrismaClient.$disconnect.mockRejectedValue("plain string");

      await expect(client.disconnect()).rejects.toBe("plain string");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Unknown error",
        }),
      );
    });

    it("does not require prior initialization", async () => {
      expect(mockPrismaClient.$connect).not.toHaveBeenCalled();

      await client.disconnect();

      expect(mockPrismaClient.$connect).not.toHaveBeenCalled();
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPrismaClient", () => {
    it("returns the underlying PrismaClient after a prior executeInTransaction call", async () => {
      const client = makeClient();
      mockTransactionSuccess(mockPrismaClient);

      await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

      expect(await client.getPrismaClient()).toBe(mockPrismaClient);
    });

    it("initializes lazily on its own, without a prior executeInTransaction call", async () => {
      const client = makeClient();

      expect(mockPrismaClient.$connect).not.toHaveBeenCalled();

      const prisma = await client.getPrismaClient();

      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
      expect(prisma).toBe(mockPrismaClient);
    });
  });

  // ---------------------------------------------------------------------
  // Wiring test using the *real* CircuitBreaker implementation.
  //
  // Everything above mocks the circuit breaker to isolate PrismaDatabaseClient's
  // own logic (already covered exhaustively in the CircuitBreaker unit
  // tests). This section instead has the factory return a genuine
  // CircuitBreaker built from the exact config PrismaDatabaseClient passes in,
  // as a smoke test that the wiring between the two classes actually behaves
  // as configured end-to-end.
  // ---------------------------------------------------------------------
  describe("circuit breaker wiring (real CircuitBreaker instance)", () => {
    function makeClientWithRealBreaker() {
      const realFactory: jest.Mocked<CircuitBreakerFactory> = {
        create: jest.fn((config: CircuitBreakerConfig) => new CircuitBreaker(config, logger)),
      } as unknown as jest.Mocked<CircuitBreakerFactory>;

      return new PrismaDatabaseClient(dbConfig, logger, realFactory);
    }

    it("trips open after 3 consecutive failures (the configured failureThreshold) and rejects the next call without touching Prisma", async () => {
      const client = makeClientWithRealBreaker();
      mockPrismaClient.$transaction.mockRejectedValue(new Error("DB down"));

      for (let i = 0; i < 3; i++) {
        await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("DB down");
      }

      mockPrismaClient.$transaction.mockClear();

      await expect(client.executeInTransaction(jest.fn())).rejects.toThrow(/Circuit breaker/);
      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
    });

    it("closes again after the configured 30s cooldown once a probe transaction succeeds", async () => {
      jest.useFakeTimers();

      try {
        const client = makeClientWithRealBreaker();
        mockPrismaClient.$transaction.mockRejectedValue(new Error("DB down"));

        for (let i = 0; i < 3; i++) {
          await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("DB down");
        }

        jest.advanceTimersByTime(30_001);

        mockTransactionSuccess(mockPrismaClient);
        const op = jest.fn().mockResolvedValue("recovered");

        await expect(client.executeInTransaction(op)).resolves.toBe("recovered");
        expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "CIRCUIT_RESET" }));
      } finally {
        jest.useRealTimers();
      }
    });
  });
});

// import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
// import { Logger } from "@/application/ports/driven/logger";
// import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
// import { PrismaDatabaseConfig } from "@/infrastructure/config/prisma-database.config";
// import { Pool } from "pg";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../../../../prisma/generated";

// jest.mock("../../../../prisma/generated", () => ({
//   PrismaClient: jest.fn(),
// }));

// jest.mock("@/infrastructure/database/prisma-transaction-context");

// // The client now builds its own pg Pool + PrismaPg adapter in the
// // constructor. Mocked out so tests exercise PrismaDatabaseClient's own logic
// // without needing a real Postgres connection string or driver.
// jest.mock("pg", () => ({
//   Pool: jest.fn().mockImplementation(() => ({})),
// }));

// jest.mock("@prisma/adapter-pg", () => ({
//   PrismaPg: jest.fn().mockImplementation(() => ({})),
// }));

// function makeMockPrismaClient() {
//   return {
//     $connect: jest.fn().mockResolvedValue(undefined),
//     $disconnect: jest.fn().mockResolvedValue(undefined),
//     $transaction: jest.fn(),
//     $queryRaw: jest.fn(),
//     $on: jest.fn(),
//   };
// }

// function makeLogger(): jest.Mocked<Logger> {
//   return {
//     info: jest.fn(),
//     error: jest.fn(),
//     warn: jest.fn(),
//     debug: jest.fn(),
//     fatal: jest.fn(),
//   } as unknown as jest.Mocked<Logger>;
// }

// // NOTE: prisma-database.config.ts wasn't part of the files shared for this
// // pass. The only field the client actually reads is `databaseUrl` (used to
// // construct the pg Pool), so this mock covers what's needed; cast for safety
// // in case the real interface has more required fields.
// function makeDbConfig(overrides?: Partial<PrismaDatabaseConfig>): PrismaDatabaseConfig {
//   return {
//     databaseUrl: "postgresql://user:pass@localhost:5432/test",
//     ...overrides,
//   } as PrismaDatabaseConfig;
// }

// /**
//  * Configures mockPrismaClient.$transaction to run the callback synchronously
//  * with the supplied prismaTx object (defaults to `{}`).
//  */
// function mockTransactionSuccess(mockPrismaClient: ReturnType<typeof makeMockPrismaClient>, prismaTx: object = {}) {
//   mockPrismaClient.$transaction.mockImplementation(async (cb: (...args: unknown[]) => unknown) => cb(prismaTx));
// }

// describe("PrismaDatabaseClient", () => {
//   let logger: jest.Mocked<Logger>;
//   let dbConfig: PrismaDatabaseConfig;
//   let mockPrismaClient: ReturnType<typeof makeMockPrismaClient>;

//   beforeEach(() => {
//     jest.clearAllMocks();

//     logger = makeLogger();
//     dbConfig = makeDbConfig();
//     mockPrismaClient = makeMockPrismaClient();

//     (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrismaClient as unknown as PrismaClient);
//   });

//   describe("constructor", () => {
//     it("creates a pg Pool using the configured connection string", () => {
//       new PrismaDatabaseClient(dbConfig, logger);

//       expect(Pool).toHaveBeenCalledTimes(1);
//       expect(Pool).toHaveBeenCalledWith({ connectionString: dbConfig.databaseUrl });
//     });

//     it("wraps the pool in a PrismaPg adapter", () => {
//       new PrismaDatabaseClient(dbConfig, logger);

//       const poolInstance = (Pool as unknown as jest.Mock).mock.results[0].value;

//       expect(PrismaPg).toHaveBeenCalledTimes(1);
//       expect(PrismaPg).toHaveBeenCalledWith(poolInstance);
//     });

//     it("creates PrismaClient with the adapter and full log config", () => {
//       new PrismaDatabaseClient(dbConfig, logger);

//       const adapterInstance = (PrismaPg as unknown as jest.Mock).mock.results[0].value;

//       expect(PrismaClient).toHaveBeenCalledTimes(1);
//       expect(PrismaClient).toHaveBeenCalledWith(
//         expect.objectContaining({
//           adapter: adapterInstance,
//           log: expect.arrayContaining([
//             { emit: "event", level: "query" },
//             { emit: "event", level: "error" },
//             { emit: "event", level: "info" },
//             { emit: "event", level: "warn" },
//           ]),
//         }),
//       );
//     });

//     it("does NOT connect to the database eagerly", () => {
//       new PrismaDatabaseClient(dbConfig, logger);
//       expect(mockPrismaClient.$connect).not.toHaveBeenCalled();
//     });
//   });

//   describe("lazy initialization", () => {
//     it("connects to the database on the first executeInTransaction call", async () => {
//       const client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);

//       await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

//       expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
//     });

//     it("registers info, warn, and error event listeners on first use", async () => {
//       const client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);

//       await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

//       expect(mockPrismaClient.$on).toHaveBeenCalledWith("info", expect.any(Function));
//       expect(mockPrismaClient.$on).toHaveBeenCalledWith("warn", expect.any(Function));
//       expect(mockPrismaClient.$on).toHaveBeenCalledWith("error", expect.any(Function));
//     });

//     it("logs a successful initialization message", async () => {
//       const client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);

//       await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

//       expect(logger.info).toHaveBeenCalledWith(
//         expect.objectContaining({
//           event: "client.initialized",
//           message: "Prisma client initialized successfully",
//         }),
//       );
//     });

//     it("connects only once across multiple sequential executeInTransaction calls", async () => {
//       const client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);
//       const op = jest.fn().mockResolvedValue("ok");

//       await client.executeInTransaction(op);
//       await client.executeInTransaction(op);

//       expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
//     });

//     it("connects only once when calls race each other concurrently", async () => {
//       // Unlike the sequential test above, this fires both calls before the
//       // first $connect() has resolved, to actually exercise the initPromise
//       // de-duplication in ensureInitialized() rather than just its cached
//       // isInitialized flag.
//       let resolveConnect!: () => void;
//       mockPrismaClient.$connect.mockImplementation(
//         () =>
//           new Promise<void>((resolve) => {
//             resolveConnect = resolve;
//           }),
//       );

//       const client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);

//       const call1 = client.executeInTransaction(jest.fn().mockResolvedValue("r1"));
//       const call2 = client.executeInTransaction(jest.fn().mockResolvedValue("r2"));

//       resolveConnect();
//       const [r1, r2] = await Promise.all([call1, call2]);

//       expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
//       expect(r1).toBe("r1");
//       expect(r2).toBe("r2");
//     });

//     it("logs an error and resets initPromise when $connect rejects", async () => {
//       const connectError = new Error("Connection refused");
//       mockPrismaClient.$connect.mockRejectedValueOnce(connectError);

//       const client = new PrismaDatabaseClient(dbConfig, logger);

//       await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("Connection refused");

//       expect(logger.error).toHaveBeenCalledWith(
//         expect.objectContaining({
//           event: "client.initialization_failed",
//           message: "Connection refused",
//         }),
//       );
//     });

//     it("retries initialization after a previous failure", async () => {
//       const connectError = new Error("Transient failure");
//       mockPrismaClient.$connect.mockRejectedValueOnce(connectError).mockResolvedValueOnce(undefined);

//       const client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);

//       await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("Transient failure");

//       const result = await client.executeInTransaction(jest.fn().mockResolvedValue("recovered"));

//       expect(result).toBe("recovered");
//       expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(2);
//     });
//   });

//   describe("Prisma event listeners", () => {
//     let client: PrismaDatabaseClient;
//     let capturedListeners: Record<string, (...args: unknown[]) => unknown>;

//     beforeEach(async () => {
//       capturedListeners = {};
//       mockPrismaClient.$on.mockImplementation((event: string, handler: (...args: unknown[]) => unknown) => {
//         capturedListeners[event] = handler;
//       });

//       client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);
//       await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));
//     });

//     it("forwards info events to the logger", () => {
//       const evt = { timestamp: new Date(), message: "Query executed", target: "db" };
//       capturedListeners["info"](evt);

//       expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "prisma.info", data: evt }));
//     });

//     it("forwards warn events to the logger", () => {
//       const evt = { timestamp: new Date(), message: "Slow query", target: "db" };
//       capturedListeners["warn"](evt);

//       expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "prisma.warn", data: evt }));
//     });

//     it("forwards error events to the logger", () => {
//       const evt = { timestamp: new Date(), message: "Query failed", target: "db" };
//       capturedListeners["error"](evt);

//       expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ event: "prisma.error", data: evt }));
//     });
//   });

//   describe("executeInTransaction", () => {
//     let client: PrismaDatabaseClient;

//     beforeEach(async () => {
//       client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);
//       await client.executeInTransaction(jest.fn().mockResolvedValue("prime"));
//       jest.clearAllMocks();
//     });

//     it("returns the value produced by the operation", async () => {
//       mockTransactionSuccess(mockPrismaClient);

//       const result = await client.executeInTransaction(jest.fn().mockResolvedValue("value"));

//       expect(result).toBe("value");
//     });

//     it("passes a PrismaTransactionContext to the operation", async () => {
//       const prismaTx = { __prisma: true };
//       mockTransactionSuccess(mockPrismaClient, prismaTx);

//       const op = jest.fn().mockResolvedValue("ok");
//       await client.executeInTransaction(op);

//       expect(PrismaTransactionContext).toHaveBeenCalledWith(prismaTx);
//       expect(op).toHaveBeenCalledWith(expect.any(PrismaTransactionContext));
//     });

//     it("logs transaction start", async () => {
//       mockTransactionSuccess(mockPrismaClient);

//       await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

//       expect(logger.debug).toHaveBeenCalledWith(
//         expect.objectContaining({
//           event: "transaction.start",
//           message: "Starting database transaction",
//         }),
//       );
//     });

//     it("logs transaction success with a numeric durationMs", async () => {
//       mockTransactionSuccess(mockPrismaClient);

//       await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

//       expect(logger.debug).toHaveBeenCalledWith(
//         expect.objectContaining({
//           event: "transaction.success",
//           durationMs: expect.any(Number),
//         }),
//       );
//     });

//     it("logs an error and rethrows when the operation rejects with an Error", async () => {
//       const error = new Error("Transaction failed");
//       mockPrismaClient.$transaction.mockImplementation(async (cb: (...args: unknown[]) => unknown) => cb({}));
//       const op = jest.fn().mockRejectedValue(error);

//       await expect(client.executeInTransaction(op)).rejects.toThrow("Transaction failed");

//       expect(logger.error).toHaveBeenCalledWith(
//         expect.objectContaining({
//           event: "prisma.transaction.error",
//           message: "Transaction failed",
//           stack: error.stack,
//         }),
//       );
//     });

//     it("logs a fallback message when the operation rejects with a non-Error value", async () => {
//       mockPrismaClient.$transaction.mockImplementation(async (cb: (...args: unknown[]) => unknown) => cb({}));
//       const op = jest.fn().mockRejectedValue("plain string error");

//       await expect(client.executeInTransaction(op)).rejects.toBe("plain string error");

//       expect(logger.error).toHaveBeenCalledWith(
//         expect.objectContaining({
//           message: "Database transaction failed",
//           stack: undefined,
//         }),
//       );
//     });

//     // --- Regression test for a fixed bug ---
//     //
//     // executeInTransaction used to have:
//     //   if (result === undefined) throw new Error("Transaction rejected due to circuit breaker");
//     // left over from before circuit-breaker.adapter.ts was available. The real
//     // CircuitBreaker.executeWithCircuitBreaker() never returns undefined - it
//     // always either returns the operation's real result or throws (a plain
//     // Error) when the circuit is open, so that check could never actually
//     // detect an open circuit. It only ever misfired on operations that
//     // legitimately resolve to `undefined` (e.g. a transactional write with no
//     // return value), turning a successful, already-committed transaction into
//     // a false "circuit breaker" rejection. This check has been removed - this
//     // test guards against it (or anything equivalent) being reintroduced.
//     it("resolves with undefined when the operation legitimately returns nothing (no false circuit-breaker rejection)", async () => {
//       mockTransactionSuccess(mockPrismaClient);

//       await expect(client.executeInTransaction(jest.fn().mockResolvedValue(undefined))).resolves.toBeUndefined();

//       // The transaction genuinely ran and committed - confirm it wasn't
//       // short-circuited before ever reaching Prisma.
//       expect(mockPrismaClient.$transaction).toHaveBeenCalled();
//     });

//     it("does NOT throw for falsy-but-not-undefined return values (null, false, 0, '')", async () => {
//       mockTransactionSuccess(mockPrismaClient);

//       await expect(client.executeInTransaction(jest.fn().mockResolvedValue(null))).resolves.toBeNull();
//       await expect(client.executeInTransaction(jest.fn().mockResolvedValue(false))).resolves.toBe(false);
//       await expect(client.executeInTransaction(jest.fn().mockResolvedValue(0))).resolves.toBe(0);
//       await expect(client.executeInTransaction(jest.fn().mockResolvedValue(""))).resolves.toBe("");
//     });

//     it("handles concurrent transactions independently", async () => {
//       mockTransactionSuccess(mockPrismaClient);

//       const [r1, r2] = await Promise.all([
//         client.executeInTransaction(jest.fn().mockResolvedValue("r1")),
//         client.executeInTransaction(jest.fn().mockResolvedValue("r2")),
//       ]);

//       expect(r1).toBe("r1");
//       expect(r2).toBe("r2");
//     });

//     // --- Regression test for a fixed bug ---
//     //
//     // executeInTransaction used to call executeWithCircuitBreaker with the same
//     // literal operationName ("executeInTransaction") on every call. Since
//     // withLock() serializes any calls sharing a lock key, this meant every
//     // transaction in the entire app - across every use case - queued behind
//     // whichever transaction happened to start first, one at a time, silently
//     // defeating the connection pool. The circuit breaker's actual state
//     // (failure counts, open/closed) lives on the instance itself and was never
//     // keyed by operationName, so this was pure accidental serialization with
//     // no corresponding safety benefit. Each call now gets a unique name
//     // (`executeInTransaction-${counter}`) so unrelated transactions never
//     // share a lock.
//     it("does not serialize unrelated concurrent transactions behind a shared lock key", async () => {
//       let resolveSlow!: (value: string) => void;
//       const slowOp = jest.fn().mockImplementation(
//         () =>
//           new Promise<string>((resolve) => {
//             resolveSlow = resolve;
//           }),
//       );
//       const fastOp = jest.fn().mockResolvedValue("fast-result");

//       mockPrismaClient.$transaction.mockImplementation(async (cb: (...args: unknown[]) => unknown) => cb({}));

//       const slowPromise = client.executeInTransaction(slowOp);
//       const fastPromise = client.executeInTransaction(fastOp);

//       // If these were serialized behind a shared lock key, fastOp would never
//       // even start until slowOp's transaction finished - so this resolving
//       // before we ever call resolveSlow() proves they ran independently.
//       await expect(fastPromise).resolves.toBe("fast-result");
//       expect(fastOp).toHaveBeenCalled();

//       resolveSlow("slow-result");
//       await expect(slowPromise).resolves.toBe("slow-result");
//     });

//     it("uses a unique circuit breaker operation name per call", async () => {
//       const executeSpy = jest.spyOn(client as any, "executeWithCircuitBreaker");
//       mockTransactionSuccess(mockPrismaClient);

//       await client.executeInTransaction(jest.fn().mockResolvedValue("a"));
//       await client.executeInTransaction(jest.fn().mockResolvedValue("b"));

//       const [, firstName] = executeSpy.mock.calls[0];
//       const [, secondName] = executeSpy.mock.calls[1];

//       expect(firstName).not.toBe(secondName);
//       executeSpy.mockRestore();
//     });

//     it("records an accurate durationMs for long-running operations", async () => {
//       mockTransactionSuccess(mockPrismaClient);
//       const op = jest.fn().mockImplementation(async () => {
//         await new Promise((res) => setTimeout(res, 100));
//         return "slow";
//       });

//       await client.executeInTransaction(op);

//       const [call] = logger.debug.mock.calls.filter(([arg]) => arg.event === "transaction.success");
//       expect(call[0].durationMs).toBeGreaterThanOrEqual(100);
//     });
//   });

//   describe("healthCheck", () => {
//     let client: PrismaDatabaseClient;

//     beforeEach(() => {
//       client = new PrismaDatabaseClient(dbConfig, logger);
//     });

//     it("returns true and logs success when the query succeeds", async () => {
//       mockPrismaClient.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

//       const result = await client.healthCheck();

//       expect(result).toBe(true);
//       expect(logger.info).toHaveBeenCalledWith(
//         expect.objectContaining({
//           event: "health_check.success",
//           message: "Database health check passed",
//         }),
//       );
//     });

//     it("returns false and logs an error when the query rejects with an Error", async () => {
//       const error = new Error("Connection refused");
//       mockPrismaClient.$queryRaw.mockRejectedValue(error);

//       const result = await client.healthCheck();

//       expect(result).toBe(false);
//       expect(logger.error).toHaveBeenCalledWith(
//         expect.objectContaining({
//           event: "health_check.error",
//           message: "Connection refused",
//           stack: error.stack,
//         }),
//       );
//     });

//     it("returns false with a fallback message for non-Error rejections", async () => {
//       mockPrismaClient.$queryRaw.mockRejectedValue("string error");

//       const result = await client.healthCheck();

//       expect(result).toBe(false);
//       expect(logger.error).toHaveBeenCalledWith(
//         expect.objectContaining({
//           message: "Database health check failed",
//           stack: undefined,
//         }),
//       );
//     });

//     it("does not require prior initialization", async () => {
//       expect(mockPrismaClient.$connect).not.toHaveBeenCalled();

//       mockPrismaClient.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

//       await expect(client.healthCheck()).resolves.toBe(true);
//     });

//     it("does not go through the circuit breaker (bypasses executeWithCircuitBreaker entirely)", async () => {
//       // healthCheck() calls prisma.$queryRaw directly, not through
//       // executeWithCircuitBreaker - so it should keep working (and keep
//       // reporting real status) even while the circuit is open for
//       // executeInTransaction.
//       const executeSpy = jest.spyOn(client as any, "executeWithCircuitBreaker");
//       mockPrismaClient.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

//       await client.healthCheck();

//       expect(executeSpy).not.toHaveBeenCalled();
//       executeSpy.mockRestore();
//     });
//   });

//   describe("disconnect", () => {
//     let client: PrismaDatabaseClient;

//     beforeEach(() => {
//       client = new PrismaDatabaseClient(dbConfig, logger);
//     });

//     it("calls $disconnect on the underlying PrismaClient", async () => {
//       await client.disconnect();

//       expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
//     });

//     it("logs a successful disconnection", async () => {
//       await client.disconnect();

//       expect(logger.info).toHaveBeenCalledWith(
//         expect.objectContaining({
//           event: "client.disconnected",
//           message: "Database client disconnected successfully",
//         }),
//       );
//     });

//     it("logs an error and rethrows when $disconnect rejects with an Error", async () => {
//       const error = new Error("Disconnect failed");
//       mockPrismaClient.$disconnect.mockRejectedValue(error);

//       await expect(client.disconnect()).rejects.toThrow("Disconnect failed");

//       expect(logger.error).toHaveBeenCalledWith(
//         expect.objectContaining({
//           event: "disconnect.error",
//           message: "Disconnect failed",
//           stack: error.stack,
//         }),
//       );
//     });

//     it("logs 'Unknown error' and rethrows for non-Error rejections", async () => {
//       mockPrismaClient.$disconnect.mockRejectedValue("plain string");

//       await expect(client.disconnect()).rejects.toBe("plain string");

//       expect(logger.error).toHaveBeenCalledWith(
//         expect.objectContaining({
//           message: "Unknown error",
//         }),
//       );
//     });
//   });

//   describe("getPrismaClient", () => {
//     it("returns the underlying PrismaClient after a prior executeInTransaction call", async () => {
//       const client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);

//       await client.executeInTransaction(jest.fn().mockResolvedValue("ok"));

//       expect(await client.getPrismaClient()).toBe(mockPrismaClient);
//     });

//     it("initializes lazily on its own, without a prior executeInTransaction call", async () => {
//       const client = new PrismaDatabaseClient(dbConfig, logger);

//       expect(mockPrismaClient.$connect).not.toHaveBeenCalled();

//       const prisma = await client.getPrismaClient();

//       expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
//       expect(prisma).toBe(mockPrismaClient);
//     });
//   });

//   describe("circuit breaker integration", () => {
//     let client: PrismaDatabaseClient;

//     beforeEach(async () => {
//       client = new PrismaDatabaseClient(dbConfig, logger);
//       mockTransactionSuccess(mockPrismaClient);
//       await client.executeInTransaction(jest.fn().mockResolvedValue("prime"));
//       jest.clearAllMocks();
//     });

//     it("allows successful transactions through the circuit breaker", async () => {
//       mockTransactionSuccess(mockPrismaClient);
//       const op = jest.fn().mockResolvedValue("ok");

//       await expect(client.executeInTransaction(op)).resolves.toBe("ok");
//       expect(op).toHaveBeenCalled();
//     });

//     it("accumulates error logs across repeated $transaction failures", async () => {
//       mockPrismaClient.$transaction.mockRejectedValue(new Error("DB down"));

//       for (let i = 0; i < 4; i++) {
//         await client.executeInTransaction(jest.fn()).catch(() => {});
//       }

//       expect(logger.error).toHaveBeenCalled();
//     });

//     it("trips the circuit for real after 3 consecutive failures (DATABASE default failureThreshold) and rejects the next call without touching Prisma", async () => {
//       mockPrismaClient.$transaction.mockRejectedValue(new Error("DB down"));

//       for (let i = 0; i < 3; i++) {
//         await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("DB down");
//       }

//       mockPrismaClient.$transaction.mockClear();

//       // 4th call: circuit is open, executeWithCircuitBreaker throws before
//       // $transaction is ever called again.
//       await expect(client.executeInTransaction(jest.fn())).rejects.toThrow(/Circuit breaker/);
//       expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
//     });

//     it("closes the circuit again after the cooldown once a probe transaction succeeds", async () => {
//       jest.useFakeTimers();

//       try {
//         mockPrismaClient.$transaction.mockRejectedValue(new Error("DB down"));

//         for (let i = 0; i < 3; i++) {
//           await expect(client.executeInTransaction(jest.fn())).rejects.toThrow("DB down");
//         }

//         // DATABASE circuits default to a 30_000ms cooldown.
//         jest.advanceTimersByTime(30_001);

//         mockTransactionSuccess(mockPrismaClient);
//         const op = jest.fn().mockResolvedValue("recovered");

//         await expect(client.executeInTransaction(op)).resolves.toBe("recovered");
//         expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "CIRCUIT_RESET" }));
//       } finally {
//         jest.useRealTimers();
//       }
//     });
//   });
// });
