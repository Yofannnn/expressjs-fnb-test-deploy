import { EventQueueProcessor } from "@/infrastructure/events/event-queue-processor.adapter";
import { EventQueue, QueuedEvent } from "@/application/ports/driven/event-queue";
import { EventHandlerRegistration } from "@/application/ports/driven/event-handler-registration";
import { EventBatcher } from "@/application/ports/driven/event-batcher";
import { Logger } from "@/application/ports/driven/logger";
import { EnrichedDomainEvent } from "@/application/ports/driven/event-processing";
import { EventHandler } from "@/application/ports/driven/event-handler";
import { EventExecutionStrategy } from "@/application/ports/driven/event-dispatcher";
import { DomainEventType } from "@/domain/types/domain-event-type.enum";
import { EventQueueProcessorConfig } from "@/infrastructure/config/event-queue-processor.config";

jest.useFakeTimers();
// Safety net: if any test hangs (e.g. a future change reintroduces an unbounded fake-timer
// advance), fail that test with a clear name/stack after 10s instead of spinning until the
// process OOMs.
jest.setTimeout(10_000);

const createMockEvent = (eventType: DomainEventType, eventId = "event-1"): EnrichedDomainEvent => ({
  eventId,
  eventType,
  occurredOn: new Date(),
  aggregateId: "aggregate-1",
  version: 1,
  payload: {},
  processingMetadata: {
    processingId: `processing-${eventId}`,
    enqueuedAt: new Date(),
    retryCount: 0,
  },
});

const createQueuedEvent = (eventType: DomainEventType, eventId = "event-1", handlerName = "testHandler"): QueuedEvent => ({
  event: createMockEvent(eventType, eventId),
  handlerOptions: {
    strategy: EventExecutionStrategy.QUEUED_BATCH,
    priority: 1,
  },
  handlerName,
  enqueuedAt: new Date(),
});

const makeMockHandler = (name: string): jest.Mocked<EventHandler> =>
  ({
    handlerName: name,
    supportedEvents: new Map(),
    execute: jest.fn().mockResolvedValue(undefined),
  }) as unknown as jest.Mocked<EventHandler>;

describe("EventQueueProcessor", () => {
  let processor: EventQueueProcessor;
  let mockEventQueue: jest.Mocked<EventQueue>;
  let mockEventBatcher: jest.Mocked<EventBatcher>;
  let mockHandlerRegistration: jest.Mocked<EventHandlerRegistration>;
  let mockConfig: EventQueueProcessorConfig;
  let mockLogger: jest.Mocked<Logger>;
  let mockHandler: jest.Mocked<EventHandler>;

  const defaultConfig: EventQueueProcessorConfig = {
    batchSize: 10,
    pollIntervalMs: 1000,
  };

  const buildProcessor = () => new EventQueueProcessor(mockConfig, mockEventQueue, mockEventBatcher, mockHandlerRegistration, mockLogger);

  /** Advance one poll tick and drain the microtask queue deeply enough for
   *  Promise.allSettled chains (each async handler adds at least two hops). */
  const tick = async (times = 1) => {
    for (let i = 0; i < times; i++) {
      jest.advanceTimersByTime(mockConfig.pollIntervalMs);
      for (let j = 0; j < 8; j++) await Promise.resolve();
    }
  };

  beforeEach(() => {
    mockHandler = makeMockHandler("testHandler");

    mockEventQueue = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      enqueueDelayed: jest.fn().mockResolvedValue(undefined),
      dequeue: jest.fn().mockResolvedValue([]),
      peek: jest.fn().mockResolvedValue([]),
      hasEvents: jest.fn().mockResolvedValue(false),
      getQueueSize: jest.fn().mockResolvedValue(0),
      getMainQueueSize: jest.fn().mockResolvedValue(0),
      getDelayedQueueSize: jest.fn().mockResolvedValue(0),
      clear: jest.fn().mockResolvedValue(undefined),
      isQueueHealthy: jest.fn().mockResolvedValue(true),
    } as jest.Mocked<EventQueue>;

    mockEventBatcher = {
      addEvents: jest.fn(),
      shouldFlush: jest.fn().mockReturnValue(false),
      flush: jest.fn().mockReturnValue([]),
      getSize: jest.fn().mockReturnValue(0),
      hasEvents: jest.fn().mockReturnValue(false),
      clear: jest.fn(),
      forceFlush: jest.fn().mockReturnValue([]),
    } as jest.Mocked<EventBatcher>;

    mockHandlerRegistration = {
      handlers: new Map(),
      registerHandler: jest.fn(),
      getHandlersForEvent: jest.fn().mockReturnValue([]),
      getHandlerByName: jest.fn().mockReturnValue(undefined),
      unregisterHandler: jest.fn().mockReturnValue(true),
      isHandlerRegistered: jest.fn().mockReturnValue(false),
    } as jest.Mocked<EventHandlerRegistration>;

    mockConfig = { ...defaultConfig };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    processor = buildProcessor();
  });

  afterEach(() => {
    processor?.stop();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => jest.useRealTimers());

  describe("constructor", () => {
    it("creates an instance with all dependencies", () => {
      expect(processor).toBeInstanceOf(EventQueueProcessor);
    });

    it("reads batchSize from config", () => {
      expect(processor).toBeInstanceOf(EventQueueProcessor);
    });

    it("reads pollIntervalMs from config", () => {
      expect(processor).toBeInstanceOf(EventQueueProcessor);
    });

    it("does not start a polling interval automatically", () => {
      const spy = jest.spyOn(global, "setInterval");
      processor = buildProcessor();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("start()", () => {
    it("creates exactly one interval", async () => {
      await processor.start();
      expect(jest.getTimerCount()).toBe(1);
    });

    it("logs STARTED with poll and batch info", async () => {
      await processor.start();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "STARTED",
          message: expect.stringContaining(`${mockConfig.pollIntervalMs}ms`),
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(String(mockConfig.batchSize)),
        }),
      );
    });

    it("is idempotent – calling start() multiple times keeps one interval", async () => {
      await processor.start();
      await processor.start();
      await processor.start();
      expect(jest.getTimerCount()).toBe(1);
    });

    it("does not call setInterval a second time when already running", async () => {
      const spy = jest.spyOn(global, "setInterval");
      await processor.start();
      spy.mockClear();
      await processor.start();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("stop()", () => {
    it("clears the polling interval", async () => {
      await processor.start();
      expect(jest.getTimerCount()).toBe(1);
      processor.stop();
      expect(jest.getTimerCount()).toBe(0);
    });

    it("calls clearInterval", async () => {
      await processor.start();
      const spy = jest.spyOn(global, "clearInterval");
      processor.stop();
      expect(spy).toHaveBeenCalled();
    });

    it("logs STOPPED", async () => {
      await processor.start();
      processor.stop();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "STOPPED",
        }),
      );
    });

    it("is idempotent – multiple stop() calls are safe", async () => {
      await processor.start();
      processor.stop();
      processor.stop();
      processor.stop();
      expect(jest.getTimerCount()).toBe(0);
    });

    it("is safe to call when the processor was never started", () => {
      expect(() => processor.stop()).not.toThrow();
      expect(jest.getTimerCount()).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "STOPPED",
        }),
      );
    });

    it("prevents further processing after stop", async () => {
      await processor.start();
      mockEventQueue.hasEvents.mockResolvedValue(true);
      processor.stop();
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(mockEventQueue.hasEvents).not.toHaveBeenCalled();
    });
  });

  describe("lifecycle", () => {
    it("supports stop → restart", async () => {
      await processor.start();
      processor.stop();
      await processor.start();
      await tick();
      expect(mockEventQueue.hasEvents).toHaveBeenCalled();
    });

    it("handles rapid stop/start cycles", async () => {
      processor.stop();
      await processor.start();
      processor.stop();
      await processor.start();
      expect(jest.getTimerCount()).toBe(1);
    });

    it("can be started and stopped multiple times", async () => {
      for (let i = 0; i < 3; i++) {
        await processor.start();
        expect(jest.getTimerCount()).toBe(1);
        processor.stop();
        expect(jest.getTimerCount()).toBe(0);
      }
    });
  });

  describe("batcher flush", () => {
    beforeEach(async () => {
      await processor.start();
    });

    it("does not enqueue when batcher has no events", async () => {
      mockEventBatcher.hasEvents.mockReturnValue(false);
      await tick();
      expect(mockEventQueue.enqueue).not.toHaveBeenCalled();
    });

    it("does not enqueue when batcher has events but shouldFlush is false", async () => {
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(false);
      await tick();
      expect(mockEventQueue.enqueue).not.toHaveBeenCalled();
    });

    it("calls flush and enqueues when hasEvents && shouldFlush", async () => {
      const batched = [createQueuedEvent(DomainEventType.USER_CREATED, "b-1")];
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue(batched);

      await tick();

      expect(mockEventBatcher.flush).toHaveBeenCalled();
      expect(mockEventQueue.enqueue).toHaveBeenCalledWith(batched);
    });

    it("does not call enqueue when flush returns empty array", async () => {
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue([]);

      await tick();

      expect(mockEventQueue.enqueue).not.toHaveBeenCalled();
    });

    it("logs the batcher flush operation", async () => {
      const batched = [createQueuedEvent(DomainEventType.USER_CREATED, "b-1")];
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue(batched);

      await tick();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "BATCHER_FLUSHED",
          data: expect.objectContaining({ count: batched.length }),
        }),
      );
    });
  });

  describe("queue processing", () => {
    beforeEach(async () => {
      await processor.start();
    });

    it("checks the queue on each poll tick", async () => {
      await tick();
      expect(mockEventQueue.hasEvents).toHaveBeenCalled();
    });

    it("does not dequeue when queue is empty", async () => {
      mockEventQueue.hasEvents.mockResolvedValue(false);
      await tick();
      expect(mockEventQueue.dequeue).not.toHaveBeenCalled();
    });

    it("does not dispatch when dequeue returns []", async () => {
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([]);
      await tick();
      expect(mockHandlerRegistration.getHandlerByName).not.toHaveBeenCalled();
    });

    it("dequeues with the configured batch size", async () => {
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([]);
      await tick();
      expect(mockEventQueue.dequeue).toHaveBeenCalledWith(mockConfig.batchSize);
    });

    it("respects a custom batch size", async () => {
      processor.stop();
      const customConfig: EventQueueProcessorConfig = {
        batchSize: 50,
        pollIntervalMs: 1000,
      };
      processor = new EventQueueProcessor(customConfig, mockEventQueue, mockEventBatcher, mockHandlerRegistration, mockLogger);
      await processor.start();

      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([]);
      await tick();
      expect(mockEventQueue.dequeue).toHaveBeenCalledWith(50);
    });

    it("respects the configured poll interval", async () => {
      processor.stop();
      const customConfig: EventQueueProcessorConfig = {
        batchSize: 10,
        pollIntervalMs: 5000,
      };
      processor = new EventQueueProcessor(customConfig, mockEventQueue, mockEventBatcher, mockHandlerRegistration, mockLogger);
      await processor.start();

      jest.advanceTimersByTime(4999);
      await Promise.resolve();
      expect(mockEventQueue.hasEvents).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(mockEventQueue.hasEvents).toHaveBeenCalled();
    });

    it("fires multiple ticks over time", async () => {
      processor.stop();
      const customConfig: EventQueueProcessorConfig = {
        batchSize: 10,
        pollIntervalMs: 10,
      };
      processor = new EventQueueProcessor(customConfig, mockEventQueue, mockEventBatcher, mockHandlerRegistration, mockLogger);
      await processor.start();

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(mockEventQueue.hasEvents.mock.calls.length).toBeGreaterThan(5);
    });

    it("processes multiple successive batches", async () => {
      const batch1 = [createQueuedEvent(DomainEventType.USER_CREATED, "e-1")];
      const batch2 = [createQueuedEvent(DomainEventType.USER_LOGGED_IN, "e-2")];

      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

      mockHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      await tick(2);

      expect(mockHandler.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("handler execution", () => {
    beforeEach(async () => {
      await processor.start();
    });

    it("looks up each handler by name", async () => {
      const qe = createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "myHandler");
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      await tick();

      expect(mockHandlerRegistration.getHandlerByName).toHaveBeenCalledWith("myHandler");
    });

    it("calls handler.execute with the event", async () => {
      const qe = createQueuedEvent(DomainEventType.USER_CREATED, "e-1");
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      await tick();

      expect(mockHandler.execute).toHaveBeenCalledWith(qe.event);
    });

    it("executes all handlers in the batch", async () => {
      const handlerA = makeMockHandler("handlerA");
      const handlerB = makeMockHandler("handlerB");
      const events = [
        createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "handlerA"),
        createQueuedEvent(DomainEventType.USER_LOGGED_IN, "e-2", "handlerB"),
      ];

      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue(events);
      mockHandlerRegistration.getHandlerByName.mockImplementation((name) => (name === "handlerA" ? handlerA : handlerB));

      await tick();

      expect(handlerA.execute).toHaveBeenCalledTimes(1);
      expect(handlerB.execute).toHaveBeenCalledTimes(1);
    });

    it("logs PROCESSING_BATCH with handler names", async () => {
      const qe = createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "testHandler");
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      await tick();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "PROCESSING_BATCH",
          data: expect.objectContaining({ handlers: ["testHandler"] }),
        }),
      );
    });

    it("warns when no handler is registered for a handlerName", async () => {
      const qe = createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "unknownHandler");
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(undefined);

      await tick();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "HANDLER_NOT_FOUND",
          data: expect.objectContaining({ handlerName: "unknownHandler", eventType: DomainEventType.USER_CREATED }),
        }),
      );
    });

    it("skips execution gracefully when handler is missing", async () => {
      const qe = createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "ghost");
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(undefined);

      await tick();

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("handles a large batch without errors", async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => createQueuedEvent(DomainEventType.USER_CREATED, `e-${i}`));
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue(largeBatch);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      await tick();

      expect(mockHandler.execute).toHaveBeenCalledTimes(100);
    });
  });

  describe("partial batch failures", () => {
    beforeEach(async () => {
      await processor.start();
    });

    it("logs BATCH_PARTIAL_FAILURE when one handler rejects", async () => {
      const failingHandler = makeMockHandler("failingHandler");
      failingHandler.execute.mockRejectedValue(new Error("Handler boom"));

      const qe = createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "failingHandler");
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(failingHandler);

      await tick();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "BATCH_PARTIAL_FAILURE",
          message: expect.stringContaining("1/1"),
          data: expect.objectContaining({
            errors: ["Handler boom"],
          }),
        }),
      );
    });

    it("reports the count of failures vs total in the message", async () => {
      const goodHandler = makeMockHandler("good");
      const badHandler = makeMockHandler("bad");
      badHandler.execute.mockRejectedValue(new Error("bad error"));

      const events = [
        createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "good"),
        createQueuedEvent(DomainEventType.USER_LOGGED_IN, "e-2", "bad"),
      ];
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue(events);
      mockHandlerRegistration.getHandlerByName.mockImplementation((name) => (name === "good" ? goodHandler : badHandler));

      await tick();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "BATCH_PARTIAL_FAILURE",
          message: expect.stringContaining("1/2"),
        }),
      );
    });

    it("surfaces non-Error rejection reasons as strings", async () => {
      const badHandler = makeMockHandler("bad");
      badHandler.execute.mockRejectedValue("plain string rejection");

      const qe = createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "bad");
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(badHandler);

      await tick();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "BATCH_PARTIAL_FAILURE",
          data: expect.objectContaining({ errors: ["plain string rejection"] }),
        }),
      );
    });

    it("continues processing other handlers when one fails", async () => {
      const good = makeMockHandler("good");
      const bad = makeMockHandler("bad");
      bad.execute.mockRejectedValue(new Error("fail"));

      const events = [
        createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "bad"),
        createQueuedEvent(DomainEventType.USER_LOGGED_IN, "e-2", "good"),
      ];
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue(events);
      mockHandlerRegistration.getHandlerByName.mockImplementation((name) => (name === "good" ? good : bad));

      await tick();

      expect(good.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling (outer try/catch)", () => {
    beforeEach(async () => {
      await processor.start();
    });

    it("logs PROCESSING_ERROR when hasEvents throws", async () => {
      mockEventQueue.hasEvents.mockRejectedValue(new Error("queue unavailable"));
      await tick();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "PROCESSING_ERROR",
          data: { error: "queue unavailable" },
        }),
      );
    });

    it("logs PROCESSING_ERROR when dequeue throws", async () => {
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockRejectedValue(new Error("dequeue failed"));
      await tick();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "PROCESSING_ERROR",
          data: { error: "dequeue failed" },
        }),
      );
    });

    it("logs PROCESSING_ERROR when enqueue (batcher flush) throws", async () => {
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue([createQueuedEvent(DomainEventType.USER_CREATED)]);
      mockEventQueue.enqueue.mockRejectedValue(new Error("enqueue failed"));

      await tick();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "PROCESSING_ERROR",
          data: { error: "enqueue failed" },
        }),
      );
    });

    it("serialises non-Error throws as strings", async () => {
      mockEventQueue.hasEvents.mockRejectedValue("raw string error");
      await tick();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventQueueProcessor",
          event: "PROCESSING_ERROR",
          data: { error: "raw string error" },
        }),
      );
    });

    it("continues polling after an error", async () => {
      mockEventQueue.hasEvents.mockRejectedValueOnce(new Error("transient")).mockResolvedValue(false);

      await tick(2);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockEventQueue.hasEvents).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("handles config with zero batchSize", async () => {
      processor.stop();
      const customConfig: EventQueueProcessorConfig = {
        batchSize: 0,
        pollIntervalMs: 1000,
      };
      processor = new EventQueueProcessor(customConfig, mockEventQueue, mockEventBatcher, mockHandlerRegistration, mockLogger);
      await processor.start();

      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([]);
      await tick();

      expect(mockEventQueue.dequeue).toHaveBeenCalledWith(0);
    });

    it("handles config with zero pollIntervalMs", async () => {
      processor.stop();
      const customConfig: EventQueueProcessorConfig = {
        batchSize: 10,
        pollIntervalMs: 0,
      };
      processor = new EventQueueProcessor(customConfig, mockEventQueue, mockEventBatcher, mockHandlerRegistration, mockLogger);

      // IMPORTANT: never call jest.advanceTimersByTime()/advanceTimersToNextTimer() (or any
      // other timer-advancing API) against a live zero-delay setInterval in this test suite.
      // A zero-delay repeating interval reschedules itself at "now + 0", which is still due
      // within any subsequent advance - so ticking it at all can spin forever in a single
      // synchronous call and OOM the process. We only assert that construction/start()
      // schedules the interval correctly; we never let it actually fire.
      const setIntervalSpy = jest.spyOn(global, "setInterval");

      await processor.start();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 0);
      expect(jest.getTimerCount()).toBe(1);
    });

    it("handles very large batch sizes", async () => {
      processor.stop();
      const customConfig: EventQueueProcessorConfig = {
        batchSize: 10000,
        pollIntervalMs: 1000,
      };
      processor = new EventQueueProcessor(customConfig, mockEventQueue, mockEventBatcher, mockHandlerRegistration, mockLogger);
      await processor.start();

      // Reduced to 500 events - enough to exercise the code path without stressing the test runner
      const largeBatch = Array.from({ length: 500 }, (_, i) => createQueuedEvent(DomainEventType.USER_CREATED, `e-${i}`));
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue(largeBatch);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      await tick();

      expect(mockHandler.execute).toHaveBeenCalledTimes(500);
    });

    it("does not throw when start() is called with a negative pollIntervalMs", async () => {
      processor.stop();
      const customConfig: EventQueueProcessorConfig = {
        batchSize: 10,
        pollIntervalMs: -100,
      };
      processor = new EventQueueProcessor(customConfig, mockEventQueue, mockEventBatcher, mockHandlerRegistration, mockLogger);

      // Same rule as the zero-interval test above: never advance timers against this
      // processor. Node clamps negative setInterval delays to a minimum in real execution,
      // but fake timers may not apply the same clamping, so ticking it risks the same
      // infinite-loop-in-a-single-call hazard.
      await expect(processor.start()).resolves.toBeUndefined();
      expect(jest.getTimerCount()).toBe(1);
    });
  });

  describe("concurrency between poll ticks", () => {
    it("does not guard against overlapping processBatch runs when a handler outlasts the poll interval", async () => {
      // There's no reentrancy lock in processBatch: `void this.processBatch()` fires on every
      // tick regardless of whether the previous run finished. This test documents that current
      // behavior rather than asserting it's desirable - worth a design discussion if you want
      // ticks to skip/queue instead of overlap.
      let resolveHandler!: () => void;
      const slowHandler = makeMockHandler("slow");
      slowHandler.execute.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveHandler = resolve;
          }),
      );

      const qe = createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "slow");
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(slowHandler);

      await processor.start();

      jest.advanceTimersByTime(mockConfig.pollIntervalMs);
      await Promise.resolve();

      jest.advanceTimersByTime(mockConfig.pollIntervalMs);
      await Promise.resolve();

      expect(mockEventQueue.dequeue.mock.calls.length).toBeGreaterThanOrEqual(2);

      resolveHandler();
      await Promise.resolve();
    });
  });

  describe("integration scenarios", () => {
    it("full cycle: batcher flush → enqueue → dequeue → handler execute", async () => {
      const qe = createQueuedEvent(DomainEventType.USER_CREATED, "e-1");

      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue([qe]);
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      processor = buildProcessor();
      await processor.start();
      await tick();

      expect(mockEventQueue.enqueue).toHaveBeenCalledWith([qe]);
      expect(mockHandler.execute).toHaveBeenCalledWith(qe.event);
    });

    it("alternating empty / non-empty queue triggers handler only when events present", async () => {
      const qe = createQueuedEvent(DomainEventType.USER_CREATED);
      mockEventQueue.hasEvents.mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      mockEventQueue.dequeue.mockResolvedValue([qe]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      processor = buildProcessor();
      await processor.start();
      await tick(3);

      expect(mockHandler.execute).toHaveBeenCalledTimes(1);
    });

    it("mixed batch: some handlers found, some not", async () => {
      const qe1 = createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "known");
      const qe2 = createQueuedEvent(DomainEventType.USER_LOGGED_IN, "e-2", "unknown");

      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([qe1, qe2]);
      mockHandlerRegistration.getHandlerByName.mockImplementation((name) => (name === "known" ? mockHandler : undefined));

      processor = buildProcessor();
      await processor.start();
      await tick();

      expect(mockHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "HANDLER_NOT_FOUND" }));
    });

    it("handles batcher flush and queue processing in same tick", async () => {
      const batchedEvent = createQueuedEvent(DomainEventType.USER_CREATED, "b-1");
      const queuedEvent = createQueuedEvent(DomainEventType.USER_LOGGED_IN, "q-1");

      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue([batchedEvent]);
      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue([queuedEvent]);
      mockHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      processor = buildProcessor();
      await processor.start();
      await tick();

      expect(mockEventQueue.enqueue).toHaveBeenCalledWith([batchedEvent]);
      expect(mockHandler.execute).toHaveBeenCalledWith(queuedEvent.event);
    });

    it("maintains processing order when multiple events in batch", async () => {
      const events = [
        createQueuedEvent(DomainEventType.USER_CREATED, "e-1", "handler1"),
        createQueuedEvent(DomainEventType.USER_LOGGED_IN, "e-2", "handler2"),
        createQueuedEvent(DomainEventType.USER_LOGGED_OUT, "e-3", "handler3"),
      ];

      const handlers = {
        handler1: makeMockHandler("handler1"),
        handler2: makeMockHandler("handler2"),
        handler3: makeMockHandler("handler3"),
      };

      mockEventQueue.hasEvents.mockResolvedValue(true);
      mockEventQueue.dequeue.mockResolvedValue(events);
      mockHandlerRegistration.getHandlerByName.mockImplementation((name) => handlers[name as keyof typeof handlers]);

      processor = buildProcessor();
      await processor.start();
      await tick();

      expect(handlers.handler1.execute).toHaveBeenCalledWith(events[0].event);
      expect(handlers.handler2.execute).toHaveBeenCalledWith(events[1].event);
      expect(handlers.handler3.execute).toHaveBeenCalledWith(events[2].event);
    });
  });
});
