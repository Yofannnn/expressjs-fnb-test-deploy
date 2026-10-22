import { EventDispatcherAdapter } from "@/infrastructure/events/event-dispatcher.adapter";
import { EventExecutionStrategy } from "@/application/ports/driven/event-dispatcher";
import { Logger } from "@/application/ports/driven/logger";
import { EventQueue } from "@/application/ports/driven/event-queue";
import { EventBatcher } from "@/application/ports/driven/event-batcher";
import { DeadLetterQueue } from "@/application/ports/driven/dead-letter-queue";
import { EventHandlerRegistration } from "@/application/ports/driven/event-handler-registration";
import { EnrichedDomainEvent } from "@/application/ports/driven/event-processing";
import { NormalizedEventHandler } from "@/application/ports/driven/event-handler";
import { DomainEventType } from "@/domain/types/domain-event-type.enum";

jest.useFakeTimers();

describe("EventDispatcherAdapter", () => {
  let eventDispatcher: EventDispatcherAdapter;
  let mockEventHandlerRegistration: jest.Mocked<EventHandlerRegistration>;
  let mockEventBatcher: jest.Mocked<EventBatcher>;
  let mockEventQueue: jest.Mocked<EventQueue>;
  let mockDeadLetterQueue: jest.Mocked<DeadLetterQueue>;
  let mockLogger: jest.Mocked<Logger>;

  // NOTE: event-processing.ts (EnrichedDomainEvent) wasn't part of the files
  // shared for this pass, so this helper builds a reasonable shape and casts
  // it. Only `eventType` is actually read by EventDispatcherAdapter itself;
  // everything else just needs to round-trip through handlers/DLQ/queue.
  const createMockEvent = (eventType: DomainEventType, eventId: string = "event-1"): EnrichedDomainEvent =>
    ({
      eventId,
      eventType,
      payload: {},
      occurredOn: new Date(),
      aggregateId: "aggregate-1",
      version: 1,
      processingMetadata: {
        processingId: `processing-${eventId}`,
        enqueuedAt: new Date(),
        retryCount: 0,
      },
    }) as EnrichedDomainEvent;

  beforeEach(() => {
    mockEventHandlerRegistration = {
      handlers: new Map(),
      registerHandler: jest.fn(),
      getHandlersForEvent: jest.fn(),
      getHandlerByName: jest.fn(),
      unregisterHandler: jest.fn(),
      isHandlerRegistered: jest.fn(),
    } as unknown as jest.Mocked<EventHandlerRegistration>;

    mockEventBatcher = {
      addEvents: jest.fn(),
      flush: jest.fn().mockReturnValue([]),
      shouldFlush: jest.fn().mockReturnValue(false),
      hasEvents: jest.fn().mockReturnValue(false),
      clear: jest.fn(),
      getSize: jest.fn().mockReturnValue(0),
    } as jest.Mocked<EventBatcher>;

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

    mockDeadLetterQueue = {
      addFailedEvent: jest.fn().mockResolvedValue(undefined),
      retryEvent: jest.fn().mockResolvedValue(undefined),
      retryEventsByType: jest.fn().mockResolvedValue({ successful: 0, failed: 0 }),
      deleteEvent: jest.fn().mockResolvedValue(undefined),
      getFailedEvents: jest.fn().mockResolvedValue([]),
      getFailedEventsCount: jest.fn().mockResolvedValue(0),
      cleanupOldEvents: jest.fn().mockResolvedValue(0),
    } as jest.Mocked<DeadLetterQueue>;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    eventDispatcher = new EventDispatcherAdapter(
      mockEventHandlerRegistration,
      mockEventBatcher,
      mockEventQueue,
      mockDeadLetterQueue,
      mockLogger,
      0.5,
      3,
    );
  });

  afterEach(() => {
    eventDispatcher.destroy();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should create instance with dependencies", () => {
      expect(eventDispatcher).toBeInstanceOf(EventDispatcherAdapter);
    });

    it("should start cleanup interval", () => {
      const setIntervalSpy = jest.spyOn(global, "setInterval");

      new EventDispatcherAdapter(mockEventHandlerRegistration, mockEventBatcher, mockEventQueue, mockDeadLetterQueue, mockLogger);

      expect(setIntervalSpy).toHaveBeenCalled();
    });

    it("should use default async failure threshold values", () => {
      const dispatcher = new EventDispatcherAdapter(mockEventHandlerRegistration, mockEventBatcher, mockEventQueue, mockDeadLetterQueue, mockLogger);

      expect((dispatcher as unknown as { asyncFailureRateThreshold: number; asyncFailureMinSampleSize: number }).asyncFailureRateThreshold).toBe(0.5);
      expect((dispatcher as unknown as { asyncFailureRateThreshold: number; asyncFailureMinSampleSize: number }).asyncFailureMinSampleSize).toBe(3);

      dispatcher.destroy();
    });

    it("should accept custom async failure threshold values", () => {
      expect((eventDispatcher as unknown as { asyncFailureRateThreshold: number; asyncFailureMinSampleSize: number }).asyncFailureRateThreshold).toBe(
        0.5,
      );
      expect((eventDispatcher as unknown as { asyncFailureRateThreshold: number; asyncFailureMinSampleSize: number }).asyncFailureMinSampleSize).toBe(
        3,
      );
    });
  });

  describe("dispatch - empty events", () => {
    it("should return early when no events provided", async () => {
      await eventDispatcher.dispatch([]);

      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.objectContaining({ event: "DISPATCH_SUMMARY" }));
    });
  });

  describe("dispatch - IMMEDIATE_CRITICAL", () => {
    it("should execute transactional handlers in priority order", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const executionOrder: number[] = [];
      const handler1: NormalizedEventHandler = {
        handler: jest.fn().mockImplementation(async () => {
          executionOrder.push(1);
        }),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "handler1",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 2,
        },
        registeredAt: new Date(),
      };

      const handler2: NormalizedEventHandler = {
        handler: jest.fn().mockImplementation(async () => {
          executionOrder.push(2);
        }),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "handler2",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler1, handler2]);

      await eventDispatcher.dispatch([event]);

      expect(executionOrder).toEqual([2, 1]);
      expect(handler1.handler).toHaveBeenCalled();
      expect(handler2.handler).toHaveBeenCalled();
    });

    it("should throw error if transactional handler fails", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockRejectedValue(new Error("Handler failed")),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "failingHandler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      await expect(eventDispatcher.dispatch([event])).rejects.toThrow("Handler failed");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "CRITICAL_HANDLER_FAILED",
        }),
      );
    });

    it("should not run a lower-priority handler once an earlier one throws", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const firstHandler: NormalizedEventHandler = {
        handler: jest.fn().mockRejectedValue(new Error("Handler failed")),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "firstHandler",
        options: { strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, priority: 1 },
        registeredAt: new Date(),
      };

      const secondHandler: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "secondHandler",
        options: { strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, priority: 2 },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [firstHandler, secondHandler]);

      await expect(eventDispatcher.dispatch([event])).rejects.toThrow("Handler failed");

      expect(secondHandler.handler).not.toHaveBeenCalled();
    });

    it("should not process a later event in the same batch once an earlier event's handler throws", async () => {
      const eventA = createMockEvent(DomainEventType.USER_CREATED, "event-a");
      const eventB = createMockEvent(DomainEventType.USER_CREATED, "event-b");

      const failingHandler: NormalizedEventHandler = {
        handler: jest.fn().mockRejectedValue(new Error("Handler failed")),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "failingHandler",
        options: { strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, priority: 1, retryAttempts: 1 },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [failingHandler]);

      await expect(eventDispatcher.dispatch([eventA, eventB])).rejects.toThrow("Handler failed");

      expect(failingHandler.handler).toHaveBeenCalledTimes(1);
    });

    it("should retry handler on failure", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      let attempts = 0;
      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockImplementation(async () => {
          attempts++;
          if (attempts < 2) throw new Error("Temporary failure");
        }),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "retryHandler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
          retryAttempts: 3,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      jest.useFakeTimers();
      const promise = eventDispatcher.dispatch([event]);

      await jest.advanceTimersByTimeAsync(1000);
      await promise;
      jest.useRealTimers();

      expect(handler.handler).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "HANDLER_RETRY",
        }),
      );
    });

    it("should add to DLQ after all retries fail", async () => {
      jest.useFakeTimers();

      try {
        const event = createMockEvent(DomainEventType.USER_CREATED);

        const handler: NormalizedEventHandler = {
          handler: jest.fn().mockRejectedValue(new Error("Always fails")),
          eventType: DomainEventType.USER_CREATED,
          handlerName: "failingHandler",
          options: {
            strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
            priority: 1,
            retryAttempts: 2,
          },
          registeredAt: new Date(),
        };

        mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

        const promise = eventDispatcher.dispatch([event]);
        const result = promise.catch((err) => err);

        await jest.advanceTimersByTimeAsync(5000);

        await result;

        expect(mockDeadLetterQueue.addFailedEvent).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it("should timeout long-running handlers", async () => {
      jest.useFakeTimers();

      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 60000))),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "slowHandler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
          timeoutMs: 100,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      const promise = eventDispatcher.dispatch([event]);

      jest.advanceTimersByTime(200);

      await expect(promise).rejects.toThrow("Handler timeout after 100ms");
    });
  });

  describe("dispatch - IMMEDIATE_TOLERANT", () => {
    it("should execute async handlers in parallel", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler1: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "handler1",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      const handler2: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "handler2",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler1, handler2]);

      await eventDispatcher.dispatch([event]);

      expect(handler1.handler).toHaveBeenCalled();
      expect(handler2.handler).toHaveBeenCalled();
    });

    it("should throw error if failure rate exceeds threshold", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handlers: NormalizedEventHandler[] = [];

      for (let i = 0; i < 5; i++) {
        handlers.push({
          handler: jest.fn().mockImplementation(async () => {
            if (i < 3) throw new Error("Handler failed");
          }),
          eventType: DomainEventType.USER_CREATED,
          handlerName: `handler${i}`,
          options: {
            strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
            priority: 1,
            retryAttempts: 1,
          },
          registeredAt: new Date(),
        });
      }

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, handlers);

      await expect(eventDispatcher.dispatch([event])).rejects.toThrow("Async handler failure rate too high: 3/5 failed (threshold: 0.5)");
    });

    it("should not throw if failure rate is below threshold", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handlers: NormalizedEventHandler[] = [];

      for (let i = 0; i < 5; i++) {
        handlers.push({
          handler: jest.fn().mockImplementation(async () => {
            if (i < 2) throw new Error("Handler failed");
          }),
          eventType: DomainEventType.USER_CREATED,
          handlerName: `handler${i}`,
          options: {
            strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
            priority: 1,
            retryAttempts: 1,
          },
          registeredAt: new Date(),
        });
      }

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, handlers);

      await eventDispatcher.dispatch([event]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DISPATCH_SUMMARY",
        }),
      );
    });

    it("should not throw when sample size is below minimum", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handlers: NormalizedEventHandler[] = [];

      for (let i = 0; i < 2; i++) {
        handlers.push({
          handler: jest.fn().mockRejectedValue(new Error("Handler failed")),
          eventType: DomainEventType.USER_CREATED,
          handlerName: `handler${i}`,
          options: {
            strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
            priority: 1,
            retryAttempts: 1,
          },
          registeredAt: new Date(),
        });
      }

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, handlers);

      await eventDispatcher.dispatch([event]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DISPATCH_SUMMARY",
        }),
      );
    });

    it("should handle no promises case", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, []);

      await eventDispatcher.dispatch([event]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DISPATCH_SUMMARY",
        }),
      );
    });
  });

  describe("dispatch - QUEUED_BATCH", () => {
    it("should queue events for batch processing", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn(),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "queuedHandler",
        options: {
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      await eventDispatcher.dispatch([event]);

      expect(mockEventBatcher.addEvents).toHaveBeenCalled();
      expect(handler.handler).not.toHaveBeenCalled();
    });

    it("should flush batch if shouldFlush returns true", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        eventType: DomainEventType.USER_CREATED,
        handler: jest.fn(),
        handlerName: "queuedHandler",
        options: {
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      const queuedEvent = {
        event,
        handlerName: "queuedHandler",
        handlerOptions: handler.options,
        enqueuedAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue([queuedEvent]);

      await eventDispatcher.dispatch([event]);

      expect(mockEventBatcher.flush).toHaveBeenCalled();
      expect(mockEventQueue.enqueue).toHaveBeenCalledWith([queuedEvent]);
    });

    it("should not enqueue if flush returns empty array", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        eventType: DomainEventType.USER_CREATED,
        handler: jest.fn(),
        handlerName: "queuedHandler",
        options: {
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue([]);

      await eventDispatcher.dispatch([event]);

      expect(mockEventQueue.enqueue).not.toHaveBeenCalled();
    });

    it("should handle concurrent flush calls correctly", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        eventType: DomainEventType.USER_CREATED,
        handler: jest.fn(),
        handlerName: "queuedHandler",
        options: {
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      const queuedEvent = {
        event,
        handlerName: "queuedHandler",
        handlerOptions: handler.options,
        enqueuedAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue([queuedEvent]);

      await Promise.all([eventDispatcher.dispatch([event]), eventDispatcher.dispatch([event])]);

      expect(mockEventQueue.enqueue).toHaveBeenCalledTimes(2);
    });

    it("should not throw and should fall back to the DLQ when the underlying queue rejects on flush", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        eventType: DomainEventType.USER_CREATED,
        handler: jest.fn(),
        handlerName: "queuedHandler",
        options: {
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      const queuedEvent = {
        event,
        handlerName: "queuedHandler",
        handlerOptions: handler.options,
        enqueuedAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(true);
      mockEventBatcher.flush.mockReturnValue([queuedEvent]);
      mockEventQueue.enqueue.mockRejectedValue(new Error("queue backend unavailable"));

      await expect(eventDispatcher.dispatch([event])).resolves.toBeUndefined();

      expect(mockDeadLetterQueue.addFailedEvent).toHaveBeenCalledWith(handler, event, expect.any(Error), expect.any(Date));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "FALLBACK_TO_DLQ" }));
    });
  });

  describe("dispatch - DELAYED", () => {
    it("should enqueue delayed events", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn(),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "delayedHandler",
        options: {
          strategy: EventExecutionStrategy.DELAYED,
          priority: 1,
          delayMs: 5000,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      await eventDispatcher.dispatch([event]);

      expect(mockEventQueue.enqueueDelayed).toHaveBeenCalledWith(
        expect.objectContaining({
          event,
          handlerName: "delayedHandler",
        }),
        5000,
      );
    });

    it("should use 0 delay if delayMs not specified", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn(),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "delayedHandler",
        options: {
          strategy: EventExecutionStrategy.DELAYED,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      await eventDispatcher.dispatch([event]);

      expect(mockEventQueue.enqueueDelayed).toHaveBeenCalledWith(expect.anything(), 0);
    });

    it("should not throw and should fall back to the DLQ when enqueueDelayed rejects", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn(),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "delayedHandler",
        options: {
          strategy: EventExecutionStrategy.DELAYED,
          priority: 1,
          delayMs: 5000,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);
      mockEventQueue.enqueueDelayed.mockRejectedValue(new Error("queue backend unavailable"));

      await expect(eventDispatcher.dispatch([event])).resolves.toBeUndefined();

      expect(mockDeadLetterQueue.addFailedEvent).toHaveBeenCalledWith(handler, event, expect.any(Error), expect.any(Date));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "FALLBACK_TO_DLQ" }));
    });
  });

  describe("dispatch - no handlers", () => {
    it("should log warning when no handlers registered", async () => {
      const event = createMockEvent("UNKNOWN_EVENT" as DomainEventType);

      mockEventHandlerRegistration.handlers.set("UNKNOWN_EVENT" as DomainEventType, []);

      await eventDispatcher.dispatch([event]);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "NO_HANDLERS_REGISTERED",
        }),
      );
    });
  });

  describe("dispatch - circuit breaker fallback", () => {
    it("should use queue_fallback when circuit breaker opens", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);
      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "handler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      // NOTE: with the current strategyExecutors config, every executor whose
      // requiresCircuitBreaker is true also has failureStrategy "throw", and
      // every executor with failureStrategy "queue_fallback" never touches the
      // circuit breaker. So under real conditions this branch of dispatch()'s
      // catch block can't actually be reached - we mutate the config here to
      // exercise it directly, which also documents that gap.
      const executors = (eventDispatcher as any).strategyExecutors;
      const original = executors[EventExecutionStrategy.IMMEDIATE_CRITICAL].failureStrategy;
      executors[EventExecutionStrategy.IMMEDIATE_CRITICAL].failureStrategy = "queue_fallback";

      const circuitError = new Error("Circuit breaker EventHandlerCircuitBreaker is open");
      const executeSpy = jest.spyOn(eventDispatcher as any, "executeWithCircuitBreaker");
      executeSpy.mockRejectedValueOnce(circuitError);

      await eventDispatcher.dispatch([event]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "CIRCUIT_BREAKER_FALLBACK_SUCCESS",
        }),
      );

      executors[EventExecutionStrategy.IMMEDIATE_CRITICAL].failureStrategy = original;
      executeSpy.mockRestore();
    });

    it("should trip the circuit for real after repeated transactional failures and reject subsequent dispatches", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);
      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockRejectedValue(new Error("downstream unavailable")),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "failingHandler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
          retryAttempts: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      for (let i = 0; i < 5; i++) {
        await expect(eventDispatcher.dispatch([event])).rejects.toThrow();
      }

      mockLogger.error.mockClear();
      await expect(eventDispatcher.dispatch([event])).rejects.toThrow(/Circuit breaker/);

      expect(handler.handler).toHaveBeenCalledTimes(5);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ event: "CRITICAL_DISPATCH_FAILURE" }));
    });

    it("should close the circuit again after cooldown once a probe succeeds", async () => {
      const failingEvent = createMockEvent(DomainEventType.USER_CREATED);
      const failingHandler: NormalizedEventHandler = {
        handler: jest.fn().mockRejectedValue(new Error("downstream unavailable")),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "failingHandler",
        options: { strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, priority: 1, retryAttempts: 1 },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [failingHandler]);

      for (let i = 0; i < 5; i++) {
        await expect(eventDispatcher.dispatch([failingEvent])).rejects.toThrow();
      }

      jest.advanceTimersByTime(60_001);

      const recoveredHandler: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "recoveredHandler",
        options: { strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, priority: 1 },
        registeredAt: new Date(),
      };
      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [recoveredHandler]);

      await eventDispatcher.dispatch([failingEvent]);

      expect(recoveredHandler.handler).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ event: "CIRCUIT_RESET" }));
    });
  });

  describe("dispatch - strategy failure handling", () => {
    it("should handle queue_fallback when DLQ succeeds", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockRejectedValue(new Error("Handler failed")),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "failingHandler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
          priority: 1,
          retryAttempts: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      try {
        await eventDispatcher.dispatch([event]);
      } catch (e) {
        expect(e).not.toThrow();
      }

      expect(mockDeadLetterQueue.addFailedEvent).toHaveBeenCalled();
    });

    it("should handle DLQ failure gracefully", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "handler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      const executors = (eventDispatcher as any).strategyExecutors;
      const original = executors[EventExecutionStrategy.IMMEDIATE_CRITICAL].failureStrategy;
      executors[EventExecutionStrategy.IMMEDIATE_CRITICAL].failureStrategy = "queue_fallback";

      const circuitError = new Error("Circuit breaker EventHandlerCircuitBreaker is open");
      const executeSpy = jest.spyOn(eventDispatcher as any, "executeWithCircuitBreaker");
      executeSpy.mockRejectedValueOnce(circuitError);

      mockDeadLetterQueue.addFailedEvent.mockRejectedValue(new Error("DLQ failed"));

      await eventDispatcher.dispatch([event]);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DLQ_FALLBACK_FAILED",
        }),
      );

      executors[EventExecutionStrategy.IMMEDIATE_CRITICAL].failureStrategy = original;
      executeSpy.mockRestore();
    });

    it("should log dispatch summary with errors", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockRejectedValue(new Error("Handler failed")),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "failingHandler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
          retryAttempts: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      try {
        await eventDispatcher.dispatch([event]);
      } catch {
        // Ignore
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DISPATCH_SUMMARY",
        }),
      );
    });

    it("should log (not throw or queue to DLQ) when failureStrategy is 'log'", async () => {
      // Same situation as the circuit-breaker-fallback tests above: every
      // entry in strategyExecutors today is either "throw" or "queue_fallback" -
      // nothing sets failureStrategy to "log", so this branch of
      // handleStrategyFailure can't currently be reached through dispatch().
      // Exercising it directly so it's covered once something does use it.
      const pairs = [{ event: createMockEvent(DomainEventType.USER_CREATED), handlers: [] }];
      const error = new Error("some transient issue");

      await (eventDispatcher as any).handleStrategyFailure(EventExecutionStrategy.IMMEDIATE_TOLERANT, "log", pairs, error);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "ASYNC_DISPATCH_FAILURE",
          data: expect.objectContaining({ strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, error: error.message }),
        }),
      );
      expect(mockDeadLetterQueue.addFailedEvent).not.toHaveBeenCalled();
    });

    it("should stop dispatching later strategy groups once a 'throw' strategy fails", async () => {
      // A single event routed to both IMMEDIATE_CRITICAL (throws) and
      // QUEUED_BATCH (comes later in EventExecutionStrategy enum order).
      // Because dispatch()'s for-loop has no per-iteration catch that lets it
      // continue, a thrown "throw"-strategy failure aborts the whole dispatch
      // call - QUEUED_BATCH never runs for this call at all.
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const transactionalHandler: NormalizedEventHandler = {
        handler: jest.fn().mockRejectedValue(new Error("Handler failed")),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "transactionalHandler",
        options: { strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, priority: 1, retryAttempts: 1 },
        registeredAt: new Date(),
      };

      const queuedHandler: NormalizedEventHandler = {
        handler: jest.fn(),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "queuedHandler",
        options: { strategy: EventExecutionStrategy.QUEUED_BATCH, priority: 1 },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [transactionalHandler, queuedHandler]);

      await expect(eventDispatcher.dispatch([event])).rejects.toThrow("Handler failed");

      expect(mockEventBatcher.addEvents).not.toHaveBeenCalled();
    });
  });

  describe("dispatchSingle", () => {
    it("should dispatch single event", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "handler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      await eventDispatcher.dispatchSingle(event);

      expect(handler.handler).toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("should clear cleanup interval", () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      eventDispatcher.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("cleanup interval", () => {
    it("should not throw and should not touch the registration when the cleanup tick fires", () => {
      // cleanupStaleHandlers is currently a stub (`// TODO: implement`).
      // This is a trip-wire: once it's implemented, this test should be
      // updated to assert the real cleanup behavior instead of "does nothing".
      expect(() => jest.advanceTimersByTime(3_600_001)).not.toThrow();

      expect(mockEventHandlerRegistration.unregisterHandler).not.toHaveBeenCalled();
      expect(mockEventHandlerRegistration.getHandlersForEvent).not.toHaveBeenCalled();
    });
  });

  describe("multiple strategies", () => {
    it("should handle events with multiple strategies", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const transactionalHandler: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "transactionalHandler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      const queuedHandler: NormalizedEventHandler = {
        handler: jest.fn(),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "queuedHandler",
        options: {
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [transactionalHandler, queuedHandler]);

      await eventDispatcher.dispatch([event]);

      expect(transactionalHandler.handler).toHaveBeenCalled();
      expect(mockEventBatcher.addEvents).toHaveBeenCalled();
    });

    it("should handle multiple events with different types", async () => {
      const event1 = createMockEvent(DomainEventType.USER_CREATED, "event-1");
      const event2 = createMockEvent(DomainEventType.USER_DEACTIVATED, "event-2");

      const handler1: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "handler1",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      const handler2: NormalizedEventHandler = {
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_DEACTIVATED,
        handlerName: "handler2",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler1]);
      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_DEACTIVATED, [handler2]);

      await eventDispatcher.dispatch([event1, event2]);

      expect(handler1.handler).toHaveBeenCalled();
      expect(handler2.handler).toHaveBeenCalled();
    });

    it("should route the same event to all four strategies independently", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const makeHandler = (name: string, strategy: EventExecutionStrategy): NormalizedEventHandler => ({
        handler: jest.fn().mockResolvedValue(undefined),
        eventType: DomainEventType.USER_CREATED,
        handlerName: name,
        options: { strategy, priority: 1 },
        registeredAt: new Date(),
      });

      const transactional = makeHandler("transactional", EventExecutionStrategy.IMMEDIATE_CRITICAL);
      const async_ = makeHandler("async", EventExecutionStrategy.IMMEDIATE_TOLERANT);
      const queued = makeHandler("queued", EventExecutionStrategy.QUEUED_BATCH);
      const delayed = makeHandler("delayed", EventExecutionStrategy.DELAYED);

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [transactional, async_, queued, delayed]);

      await eventDispatcher.dispatch([event]);

      expect(transactional.handler).toHaveBeenCalled();
      expect(async_.handler).toHaveBeenCalled();
      expect(mockEventBatcher.addEvents).toHaveBeenCalled();
      expect(mockEventQueue.enqueueDelayed).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "DISPATCH_SUMMARY",
          data: expect.objectContaining({ successful: 4, failed: 0 }),
        }),
      );
    });
  });

  describe("circuit breaker error detection", () => {
    it("should correctly identify circuit breaker errors", () => {
      const circuitError = new Error("Circuit breaker is open");
      const normalError = new Error("Normal error");
      const isCircuitBreakerError = (eventDispatcher as unknown as { isCircuitBreakerError: (error: Error) => boolean }).isCircuitBreakerError.bind(
        eventDispatcher,
      );

      expect(isCircuitBreakerError(circuitError)).toBe(true);
      expect(isCircuitBreakerError(normalError)).toBe(false);
    });

    it("should require both phrases, not just one", () => {
      const isCircuitBreakerError = (eventDispatcher as unknown as { isCircuitBreakerError: (error: Error) => boolean }).isCircuitBreakerError.bind(
        eventDispatcher,
      );

      expect(isCircuitBreakerError(new Error("Circuit breaker tripped"))).toBe(false);
      expect(isCircuitBreakerError(new Error("The door is open"))).toBe(false);
      expect(isCircuitBreakerError(new Error("Circuit breaker 'X' is open. Time until reset: 30000ms"))).toBe(true);
    });
  });

  describe("flushBatchIfNeeded edge cases", () => {
    it("should not flush when hasEvents returns false", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        eventType: DomainEventType.USER_CREATED,
        handler: jest.fn(),
        handlerName: "queuedHandler",
        options: {
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);
      mockEventBatcher.hasEvents.mockReturnValue(false);
      mockEventBatcher.shouldFlush.mockReturnValue(true);

      await eventDispatcher.dispatch([event]);

      expect(mockEventBatcher.flush).not.toHaveBeenCalled();
    });

    it("should not flush when shouldFlush returns false", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        eventType: DomainEventType.USER_CREATED,
        handler: jest.fn(),
        handlerName: "queuedHandler",
        options: {
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          priority: 1,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);
      mockEventBatcher.hasEvents.mockReturnValue(true);
      mockEventBatcher.shouldFlush.mockReturnValue(false);

      await eventDispatcher.dispatch([event]);

      expect(mockEventBatcher.flush).not.toHaveBeenCalled();
    });
  });

  describe("handler timeout", () => {
    it("should clear timeout on successful completion", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockImplementation(async () => {
          await Promise.resolve();
        }),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "fastHandler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
          timeoutMs: 1000,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      await eventDispatcher.dispatch([event]);

      expect(handler.handler).toHaveBeenCalled();
    });

    it("should use default timeout of 30000ms when not specified", async () => {
      jest.useFakeTimers();

      try {
        const event = createMockEvent(DomainEventType.USER_CREATED);
        const handler: NormalizedEventHandler = {
          handler: jest.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 40000))),
          eventType: DomainEventType.USER_CREATED,
          handlerName: "slowHandler",
          options: {
            strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
            priority: 1,
          },
          registeredAt: new Date(),
        };
        mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);
        const promise = eventDispatcher.dispatch([event]);
        jest.advanceTimersByTime(30000);
        await expect(promise).rejects.toThrow("Handler timeout");
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("retry exponential backoff", () => {
    it("should use exponential backoff between retries", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED);

      let attempts = 0;

      const handler: NormalizedEventHandler = {
        handler: jest.fn().mockImplementation(async () => {
          attempts++;
          if (attempts < 3) throw new Error("Temporary failure");
        }),
        eventType: DomainEventType.USER_CREATED,
        handlerName: "retryHandler",
        options: {
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          priority: 1,
          retryAttempts: 3,
        },
        registeredAt: new Date(),
      };

      mockEventHandlerRegistration.handlers.set(DomainEventType.USER_CREATED, [handler]);

      jest.useFakeTimers();
      const promise = eventDispatcher.dispatch([event]);
      await jest.advanceTimersByTimeAsync(5000);
      await promise;
      jest.useRealTimers();

      expect(handler.handler).toHaveBeenCalledTimes(3);
    });
  });
});
