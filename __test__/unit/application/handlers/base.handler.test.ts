import { BaseEventHandler } from "@/application/handlers/base.handler";
import { DomainEvent, DomainEventType } from "@/domain/types/domain-event.type";
import { EventExecutionStrategy, EventHandlerOptions } from "@/application/ports/driven/event-handler.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";

/**
 * NOTE: `BaseEventHandler` is abstract, so it's exercised here through small
 * concrete test subclasses defined below rather than instantiated directly.
 *
 * IMPORT PATH: this suite assumes it is colocated with `base.handler.ts`
 * (standard `*_test.ts`-next-to-source layout); adjust the `./base.handler`
 * import if yours lives elsewhere.
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

function makeEvent<T = unknown>(overrides: Partial<DomainEvent<T>> = {}): DomainEvent<T> {
  return {
    aggregateId: "aggregate-123",
    eventType: DomainEventType.USER_CREATED,
    occurredOn: new Date("2026-01-01T00:00:00.000Z"),
    payload: {} as T,
    version: 1,
    ...overrides,
  };
}

/** A concrete handler whose `handle()` behavior is fully controlled per test. */
class TestEventHandler extends BaseEventHandler {
  readonly handlerName = "TestEventHandler";
  readonly supportedEvents = new Map<DomainEventType, EventHandlerOptions>([
    [DomainEventType.USER_CREATED, { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL }],
  ]);

  constructor(
    logger: LoggerPort,
    private readonly handleImpl: (event: DomainEvent<unknown>) => Promise<void>,
  ) {
    super(logger);
  }

  protected async handle(event: DomainEvent<unknown>): Promise<void> {
    return this.handleImpl(event);
  }
}

/** A second, differently-named subclass, used to confirm `context` reflects the actual runtime class, not a hardcoded string. */
class AnotherEventHandler extends BaseEventHandler {
  readonly handlerName = "AnotherEventHandler";
  readonly supportedEvents = new Map<DomainEventType, EventHandlerOptions>();

  constructor(
    logger: LoggerPort,
    private readonly handleImpl: (event: DomainEvent<unknown>) => Promise<void>,
  ) {
    super(logger);
  }

  protected async handle(event: DomainEvent<unknown>): Promise<void> {
    return this.handleImpl(event);
  }
}

/**
 * Advances the fake clock by `ms` from *inside* the handler, so that
 * `Date.now() - start` in `execute()` measures a controlled duration. See the
 * CircuitBreaker/PrismaDatabaseClient suites for the same technique.
 */
function handlerWithDuration(ms: number): jest.Mock<Promise<void>, [DomainEvent<unknown>]> {
  return jest.fn().mockImplementation(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe("BaseEventHandler", () => {
  let logger: jest.Mocked<LoggerPort>;

  beforeEach(() => {
    logger = makeLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------
  // Successful execution
  // ---------------------------------------------------------------------
  describe("successful execution", () => {
    it("resolves when the concrete handle() implementation succeeds", async () => {
      const handleImpl = jest.fn().mockResolvedValue(undefined);
      const handler = new TestEventHandler(logger, handleImpl);
      const event = makeEvent();

      await expect(handler.execute(event)).resolves.toBeUndefined();
    });

    it("calls the concrete handle() exactly once with the exact event passed in", async () => {
      const handleImpl = jest.fn().mockResolvedValue(undefined);
      const handler = new TestEventHandler(logger, handleImpl);
      const event = makeEvent();

      await handler.execute(event);

      expect(handleImpl).toHaveBeenCalledTimes(1);
      expect(handleImpl).toHaveBeenCalledWith(event);
    });

    it("logs a debug 'start' event before calling handle()", async () => {
      const order: string[] = [];
      logger.debug.mockImplementation(() => order.push("log"));
      const handleImpl = jest.fn().mockImplementation(async () => {
        order.push("handle");
      });
      const handler = new TestEventHandler(logger, handleImpl);

      await handler.execute(makeEvent());

      expect(order).toEqual(["log", "handle"]);
    });

    it("logs the debug 'start' event with the expected shape", async () => {
      const handler = new TestEventHandler(logger, jest.fn().mockResolvedValue(undefined));
      const event = makeEvent({ eventType: DomainEventType.ORDER_CONFIRMED });

      await handler.execute(event);

      expect(logger.debug).toHaveBeenCalledWith({
        context: "TestEventHandler",
        event: DomainEventType.ORDER_CONFIRMED,
        message: "Event handler start",
        data: { occurredOn: event.occurredOn },
      });
    });

    it("logs an info 'finish' event with a numeric durationMs after handle() succeeds", async () => {
      const handler = new TestEventHandler(logger, handlerWithDuration(150));
      const event = makeEvent();

      await handler.execute(event);

      expect(logger.info).toHaveBeenCalledWith({
        context: "TestEventHandler",
        event: event.eventType,
        message: "Event handler finish",
        durationMs: 150,
        data: { occurredOn: event.occurredOn },
      });
    });

    it("does not log an error when handle() succeeds", async () => {
      const handler = new TestEventHandler(logger, jest.fn().mockResolvedValue(undefined));

      await handler.execute(makeEvent());

      expect(logger.error).not.toHaveBeenCalled();
    });

    it("uses the runtime subclass name as the log context, not a hardcoded 'BaseEventHandler'", async () => {
      const handler = new AnotherEventHandler(logger, jest.fn().mockResolvedValue(undefined));

      await handler.execute(makeEvent());

      expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({ context: "AnotherEventHandler" }));
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ context: "AnotherEventHandler" }));
    });

    it("uses the event's own eventType in every log line, for any supported event type", async () => {
      const handler = new TestEventHandler(logger, jest.fn().mockResolvedValue(undefined));
      const event = makeEvent({ eventType: DomainEventType.PAYMENT_TRANSACTION_SUCCEEDED });

      await handler.execute(event);

      expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({ event: DomainEventType.PAYMENT_TRANSACTION_SUCCEEDED }));
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: DomainEventType.PAYMENT_TRANSACTION_SUCCEEDED }));
    });

    it("passes through the event's occurredOn value verbatim in both start and finish logs", async () => {
      const occurredOn = new Date("2025-06-15T10:30:00.000Z");
      const handler = new TestEventHandler(logger, jest.fn().mockResolvedValue(undefined));

      await handler.execute(makeEvent({ occurredOn }));

      expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({ data: { occurredOn } }));
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ data: { occurredOn } }));
    });

    it("measures durationMs independently across multiple sequential calls", async () => {
      const first = new TestEventHandler(logger, handlerWithDuration(50));
      await first.execute(makeEvent());
      expect(logger.info).toHaveBeenLastCalledWith(expect.objectContaining({ durationMs: 50 }));

      const second = new TestEventHandler(logger, handlerWithDuration(300));
      await second.execute(makeEvent());
      expect(logger.info).toHaveBeenLastCalledWith(expect.objectContaining({ durationMs: 300 }));
    });

    it("resolves independently for concurrent execute() calls on the same handler instance", async () => {
      let resolveSlow!: () => void;
      const handleImpl = jest
        .fn()
        .mockImplementationOnce(() => new Promise<void>((resolve) => (resolveSlow = resolve)))
        .mockImplementationOnce(async () => undefined);

      const handler = new TestEventHandler(logger, handleImpl);

      const slow = handler.execute(makeEvent({ aggregateId: "slow" }));
      const fast = handler.execute(makeEvent({ aggregateId: "fast" }));

      await expect(fast).resolves.toBeUndefined();
      resolveSlow();
      await expect(slow).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------
  // Failed execution
  // ---------------------------------------------------------------------
  describe("failed execution", () => {
    it("rethrows the exact error handle() rejects with", async () => {
      const error = new Error("handler blew up");
      const handler = new TestEventHandler(logger, jest.fn().mockRejectedValue(error));

      await expect(handler.execute(makeEvent())).rejects.toBe(error);
    });

    it("propagates a non-Error rejection value unchanged", async () => {
      const handler = new TestEventHandler(logger, jest.fn().mockRejectedValue("plain string failure"));

      await expect(handler.execute(makeEvent())).rejects.toBe("plain string failure");
    });

    it("logs an error with the Error's message and stack", async () => {
      const error = new Error("handler blew up");
      const handler = new TestEventHandler(logger, jest.fn().mockRejectedValue(error));
      const event = makeEvent();

      await handler.execute(event).catch(() => undefined);

      expect(logger.error).toHaveBeenCalledWith({
        context: "TestEventHandler",
        event: event.eventType,
        message: "handler blew up",
        stack: error.stack,
        data: { occurredOn: event.occurredOn },
      });
    });

    it("stringifies a non-Error rejection in the error log and omits stack", async () => {
      const handler = new TestEventHandler(logger, jest.fn().mockRejectedValue("plain string failure"));
      const event = makeEvent();

      await handler.execute(event).catch(() => undefined);

      expect(logger.error).toHaveBeenCalledWith({
        context: "TestEventHandler",
        event: event.eventType,
        message: "plain string failure",
        stack: undefined,
        data: { occurredOn: event.occurredOn },
      });
    });

    it("does not log a success/finish message when handle() fails", async () => {
      const handler = new TestEventHandler(logger, jest.fn().mockRejectedValue(new Error("boom")));

      await handler.execute(makeEvent()).catch(() => undefined);

      expect(logger.info).not.toHaveBeenCalled();
    });

    it("still logs the debug 'start' event before the failure is logged", async () => {
      const handler = new TestEventHandler(logger, jest.fn().mockRejectedValue(new Error("boom")));

      await handler.execute(makeEvent()).catch(() => undefined);

      expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({ message: "Event handler start" }));
    });

    it("uses the runtime subclass name as the log context on failure too", async () => {
      const handler = new AnotherEventHandler(logger, jest.fn().mockRejectedValue(new Error("boom")));

      await handler.execute(makeEvent()).catch(() => undefined);

      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ context: "AnotherEventHandler" }));
    });

    it("handles a rejection that occurs asynchronously partway through a slow handler", async () => {
      const error = new Error("failed after delay");
      const handleImpl = jest.fn().mockImplementation(async () => {
        jest.advanceTimersByTime(200);
        throw error;
      });
      const handler = new TestEventHandler(logger, handleImpl);

      await expect(handler.execute(makeEvent())).rejects.toBe(error);
      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: "failed after delay" }));
    });
  });

  // ---------------------------------------------------------------------
  // EventHandlerPort compliance (the abstract contract subclasses fulfil)
  // ---------------------------------------------------------------------
  describe("EventHandlerPort contract", () => {
    it("exposes handlerName and supportedEvents as instance properties", () => {
      const handler = new TestEventHandler(logger, jest.fn().mockResolvedValue(undefined));

      expect(handler.handlerName).toBe("TestEventHandler");
      expect(handler.supportedEvents).toBeInstanceOf(Map);
      expect(handler.supportedEvents.get(DomainEventType.USER_CREATED)).toEqual({
        priority: 1,
        strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
      });
    });

    it("exposes execute as a bindable, promise-returning function matching the Handler type", async () => {
      const handler = new TestEventHandler(logger, jest.fn().mockResolvedValue(undefined));
      const { execute } = handler;

      // Confirms `execute` doesn't implicitly rely on `this` in a way that
      // breaks when destructured/passed around as a plain `Handler` callback
      // (e.g. registered in an event bus's handler map).
      await expect(execute.call(handler, makeEvent())).resolves.toBeUndefined();
    });
  });
});
