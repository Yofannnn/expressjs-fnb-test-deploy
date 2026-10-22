import { InMemoryEventBatcherAdapter } from "@/infrastructure/events/event-batcher.adapter";
import { Logger } from "@/application/ports/driven/logger";
import { QueuedEvent } from "@/application/ports/driven/event-queue";
import { EnrichedDomainEvent } from "@/application/ports/driven/event-processing";
import { EventExecutionStrategy } from "@/application/ports/driven/event-dispatcher";
import { DomainEventType } from "@/domain/types/domain-event-type.enum";
import { EventBatchConfig } from "@/infrastructure/config/event-batch.config";

jest.useFakeTimers();

describe("InMemoryEventBatcherAdapter", () => {
  let eventBatcher: InMemoryEventBatcherAdapter;
  let mockLogger: jest.Mocked<Logger>;
  let mockConfig: EventBatchConfig;

  const createMockEvent = (eventType: DomainEventType, eventId: string = "event-1"): EnrichedDomainEvent => ({
    eventId,
    eventType,
    occurredOn: new Date(),
    aggregateId: "aggregate-1",
    payload: {},
    version: 1,
    processingMetadata: {
      processingId: `processing-${eventId}`,
      enqueuedAt: new Date(),
      retryCount: 0,
    },
  });

  const createQueuedEvent = (eventType: DomainEventType, eventId: string = "event-1"): QueuedEvent => ({
    event: createMockEvent(eventType, eventId),
    handlerOptions: {
      strategy: EventExecutionStrategy.QUEUED_BATCH,
      priority: 1,
    },
    handlerName: "testHandler",
    enqueuedAt: new Date(),
  });

  const defaultConfig: EventBatchConfig = {
    flushIntervalInMs: 1000,
    maxRetries: 3,
    retryDelayInMs: 1000,
    maxWaitTimeInMs: 5000,
    batchSize: 100,
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockConfig = { ...defaultConfig };

    eventBatcher = new InMemoryEventBatcherAdapter(mockConfig, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should create instance with config", () => {
      expect(eventBatcher).toBeInstanceOf(InMemoryEventBatcherAdapter);
    });

    it("should initialize with empty events array", () => {
      expect(eventBatcher.getSize()).toBe(0);
      expect(eventBatcher.hasEvents()).toBe(false);
    });

    it("should store config values correctly", () => {
      const customConfig: EventBatchConfig = {
        flushIntervalInMs: 2000,
        maxRetries: 5,
        retryDelayInMs: 2000,
        maxWaitTimeInMs: 10000,
        batchSize: 50,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      expect(batcher).toBeInstanceOf(InMemoryEventBatcherAdapter);
    });
  });

  describe("addEvents", () => {
    it("should add multiple events at once", () => {
      const events = [
        createQueuedEvent(DomainEventType.USER_CREATED, "event-1"),
        createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2"),
        createQueuedEvent(DomainEventType.USER_BANNED, "event-3"),
      ];

      eventBatcher.addEvents(events);

      expect(eventBatcher.getSize()).toBe(3);
    });

    it("should return early when adding empty array", () => {
      eventBatcher.addEvents([]);

      expect(eventBatcher.getSize()).toBe(0);
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it("should set firstEventTime when adding first events", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1")];

      eventBatcher.addEvents(events);

      expect(eventBatcher.hasEvents()).toBe(true);
    });

    it("should handle large batches", () => {
      const events = Array.from({ length: 50 }, (_, i) => createQueuedEvent(DomainEventType.USER_CREATED, `event-${i}`));

      eventBatcher.addEvents(events);

      expect(eventBatcher.getSize()).toBe(50);
    });

    it("should not reset firstEventTime when adding more events", () => {
      const events1 = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1")];
      eventBatcher.addEvents(events1);

      const firstEventTime = (eventBatcher as any).firstEventTime;

      jest.advanceTimersByTime(1000);

      const events2 = [createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")];
      eventBatcher.addEvents(events2);

      expect((eventBatcher as any).firstEventTime).toBe(firstEventTime);
    });

    it("should set firstEventTime only on first addition", () => {
      expect((eventBatcher as any).firstEventTime).toBeNull();

      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED, "event-1")]);
      const firstTime = (eventBatcher as any).firstEventTime;
      expect(firstTime).not.toBeNull();

      jest.advanceTimersByTime(100);
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")]);

      expect((eventBatcher as any).firstEventTime).toBe(firstTime);
    });
  });

  describe("shouldFlush", () => {
    it("should return false when batch is empty", () => {
      expect(eventBatcher.shouldFlush()).toBe(false);
    });

    it("should return true when batch size reaches max", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: 5,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      const events = Array.from({ length: 5 }, (_, i) => createQueuedEvent(DomainEventType.USER_CREATED, `event-${i}`));
      batcher.addEvents(events);

      expect(batcher.shouldFlush()).toBe(true);
    });

    it("should return true when time threshold is reached", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED)];
      eventBatcher.addEvents(events);

      jest.advanceTimersByTime(5000);

      expect(eventBatcher.shouldFlush()).toBe(true);
    });

    it("should return false when neither threshold is reached", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED)];
      eventBatcher.addEvents(events);

      jest.advanceTimersByTime(3000);

      expect(eventBatcher.shouldFlush()).toBe(false);
    });

    it("should return true when size exceeds max even with time remaining", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: 3,
        maxWaitTimeInMs: 10000,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      batcher.addEvents([
        createQueuedEvent(DomainEventType.USER_CREATED, "event-1"),
        createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2"),
        createQueuedEvent(DomainEventType.USER_BANNED, "event-3"),
      ]);

      expect(batcher.shouldFlush()).toBe(true);
    });

    it("should return false when firstEventTime is null and events exist", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED)];
      eventBatcher.addEvents(events);

      (eventBatcher as any).firstEventTime = null;

      expect(eventBatcher.shouldFlush()).toBe(false);
    });

    it("should return false when events array is empty even if firstEventTime exists", () => {
      (eventBatcher as any).firstEventTime = Date.now();
      (eventBatcher as any).events = [];

      expect(eventBatcher.shouldFlush()).toBe(false);
    });

    it("should return true when batch size equals max", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: 2,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")]);

      expect(batcher.shouldFlush()).toBe(true);
    });
  });

  describe("hasEvents", () => {
    it("should return false when batch is empty", () => {
      expect(eventBatcher.hasEvents()).toBe(false);
    });

    it("should return true when batch has events", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(eventBatcher.hasEvents()).toBe(true);
    });

    it("should return false after clearing", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);
      eventBatcher.clear();

      expect(eventBatcher.hasEvents()).toBe(false);
    });

    it("should return false after flush", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);
      eventBatcher.flush();

      expect(eventBatcher.hasEvents()).toBe(false);
    });
  });

  describe("flush", () => {
    it("should return all events and clear batch", () => {
      const events = [
        createQueuedEvent(DomainEventType.USER_CREATED, "event-1"),
        createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2"),
        createQueuedEvent(DomainEventType.USER_BANNED, "event-3"),
      ];
      eventBatcher.addEvents(events);

      const flushedEvents = eventBatcher.flush();

      expect(flushedEvents).toHaveLength(3);
      expect(eventBatcher.getSize()).toBe(0);
    });

    it("should log debug message with event count and types", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")];
      eventBatcher.addEvents(events);

      eventBatcher.flush();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventBatcher",
          event: "FLUSH",
          message: expect.stringContaining("2 events"),
        }),
      );
    });

    it("should return empty array when flushing empty batch", () => {
      const flushedEvents = eventBatcher.flush();

      expect(flushedEvents).toHaveLength(0);
    });

    it("should return copy of events, not reference", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1")];
      eventBatcher.addEvents(events);

      const flushedEvents = eventBatcher.flush();

      expect(flushedEvents).not.toBe(events);
    });

    it("should reset time tracking after flush", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);
      eventBatcher.flush();

      expect((eventBatcher as any).firstEventTime).toBeNull();
      expect(eventBatcher.hasEvents()).toBe(false);
    });

    it("should clear internal events array after flush", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")];
      eventBatcher.addEvents(events);

      eventBatcher.flush();

      expect((eventBatcher as any).events).toHaveLength(0);
    });

    it("should log zero events on empty flush", () => {
      eventBatcher.flush();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("0 events"),
        }),
      );
    });

    it("should include event types in debug log", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")];
      eventBatcher.addEvents(events);

      eventBatcher.flush();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventTypes: expect.arrayContaining([DomainEventType.USER_CREATED, DomainEventType.USER_DEACTIVATED]),
          }),
        }),
      );
    });
  });

  describe("getSize", () => {
    it("should return 0 for empty batch", () => {
      expect(eventBatcher.getSize()).toBe(0);
    });

    it("should return correct size after adding events", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);
      expect(eventBatcher.getSize()).toBe(1);

      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_DEACTIVATED)]);
      expect(eventBatcher.getSize()).toBe(2);
    });

    it("should return 0 after flush", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED), createQueuedEvent(DomainEventType.USER_DEACTIVATED)]);

      eventBatcher.flush();

      expect(eventBatcher.getSize()).toBe(0);
    });

    it("should return 0 after clear", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);
      eventBatcher.clear();

      expect(eventBatcher.getSize()).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all events from batch", () => {
      eventBatcher.addEvents([
        createQueuedEvent(DomainEventType.USER_CREATED, "event-1"),
        createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2"),
        createQueuedEvent(DomainEventType.USER_BANNED, "event-3"),
      ]);

      eventBatcher.clear();

      expect(eventBatcher.getSize()).toBe(0);
      expect(eventBatcher.hasEvents()).toBe(false);
    });

    it("should reset firstEventTime to null", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);
      expect((eventBatcher as any).firstEventTime).not.toBeNull();

      eventBatcher.clear();

      expect((eventBatcher as any).firstEventTime).toBeNull();
    });

    it("should be idempotent", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      eventBatcher.clear();
      eventBatcher.clear();

      expect(eventBatcher.getSize()).toBe(0);
      expect((eventBatcher as any).firstEventTime).toBeNull();
    });

    it("should handle clear on empty batch", () => {
      eventBatcher.clear();

      expect(eventBatcher.getSize()).toBe(0);
      expect((eventBatcher as any).firstEventTime).toBeNull();
    });
  });

  describe("forceFlush", () => {
    it("should force flush events regardless of thresholds", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1")];
      eventBatcher.addEvents(events);

      expect(eventBatcher.shouldFlush()).toBe(false);

      const flushedEvents = eventBatcher.forceFlush();

      expect(flushedEvents).toHaveLength(1);
      expect(eventBatcher.getSize()).toBe(0);
    });

    it("should return empty array when forcing flush on empty batch", () => {
      const flushedEvents = eventBatcher.forceFlush();

      expect(flushedEvents).toHaveLength(0);
    });

    it("should reset state after forceFlush", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED, "event-1")]);
      eventBatcher.forceFlush();

      expect((eventBatcher as any).firstEventTime).toBeNull();
      expect(eventBatcher.hasEvents()).toBe(false);
    });

    it("should log debug message on forceFlush", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1")];
      eventBatcher.addEvents(events);

      eventBatcher.forceFlush();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventBatcher",
          event: "FLUSH",
          message: expect.stringContaining("1 events"),
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle adding same event multiple times", () => {
      const queuedEvent = createQueuedEvent(DomainEventType.USER_CREATED);

      eventBatcher.addEvents([queuedEvent, queuedEvent]);

      expect(eventBatcher.getSize()).toBe(2);
    });

    it("should handle events with different strategies", () => {
      const event1: QueuedEvent = {
        event: createMockEvent(DomainEventType.USER_CREATED),
        handlerOptions: {
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          priority: 1,
        },
        handlerName: "handler1",
        enqueuedAt: new Date(),
      };

      const event2: QueuedEvent = {
        event: createMockEvent(DomainEventType.USER_DEACTIVATED),
        handlerOptions: {
          strategy: EventExecutionStrategy.DELAYED,
          priority: 2,
        },
        handlerName: "handler2",
        enqueuedAt: new Date(),
      };

      eventBatcher.addEvents([event1, event2]);

      expect(eventBatcher.getSize()).toBe(2);
    });

    it("should handle very large batch sizes", () => {
      const events = Array.from({ length: 1000 }, (_, i) => createQueuedEvent(DomainEventType.USER_CREATED, `event-${i}`));

      eventBatcher.addEvents(events);

      expect(eventBatcher.getSize()).toBe(1000);
    });

    it("should handle custom batch size configuration", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: 10,
        maxWaitTimeInMs: 1000,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      const events = Array.from({ length: 10 }, (_, i) => createQueuedEvent(DomainEventType.USER_CREATED, `event-${i}`));
      batcher.addEvents(events);

      expect(batcher.shouldFlush()).toBe(true);
    });

    it("should handle custom wait time configuration", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: 100,
        maxWaitTimeInMs: 2000,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);
      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      jest.advanceTimersByTime(1999);
      expect(batcher.shouldFlush()).toBe(false);

      jest.advanceTimersByTime(1);
      expect(batcher.shouldFlush()).toBe(true);
    });

    it("should handle zero events in flush", () => {
      const result = eventBatcher.flush();

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("0 events"),
        }),
      );
    });

    it("should handle isTimeThresholdReached when firstEventTime is null", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED)];
      eventBatcher.addEvents(events);

      (eventBatcher as any).firstEventTime = null;

      expect(eventBatcher.shouldFlush()).toBe(false);
    });

    it("should handle isTimeThresholdReached when events length is 0", () => {
      (eventBatcher as any).firstEventTime = Date.now();
      (eventBatcher as any).events = [];

      expect(eventBatcher.shouldFlush()).toBe(false);
    });

    it("should handle configuration with zero maxWaitTimeInMs", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        maxWaitTimeInMs: 0,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);
      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      jest.advanceTimersByTime(0);

      expect(batcher.shouldFlush()).toBe(true);
    });

    it("should handle configuration with negative maxWaitTimeInMs", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        maxWaitTimeInMs: -100,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);
      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(batcher.shouldFlush()).toBe(true);
    });

    it("should handle configuration with zero batchSize", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: 0,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);
      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(batcher.shouldFlush()).toBe(true);
    });
  });

  describe("integration scenarios", () => {
    it("should handle full lifecycle: add, check, flush", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")];

      eventBatcher.addEvents(events);
      expect(eventBatcher.hasEvents()).toBe(true);
      expect(eventBatcher.getSize()).toBe(2);
      expect(eventBatcher.shouldFlush()).toBe(false);

      const flushedEvents = eventBatcher.flush();
      expect(flushedEvents).toHaveLength(2);
      expect(eventBatcher.hasEvents()).toBe(false);
    });

    it("should handle multiple flush cycles", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);
      let flushedEvents = eventBatcher.flush();
      expect(flushedEvents).toHaveLength(1);

      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_DEACTIVATED)]);
      flushedEvents = eventBatcher.flush();
      expect(flushedEvents).toHaveLength(1);

      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_BANNED)]);
      const result = eventBatcher.flush();

      expect(result).toHaveLength(1);
      expect(eventBatcher.getSize()).toBe(0);
    });

    it("should handle batch size threshold flush", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: 3,
        maxWaitTimeInMs: 10000,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")]);

      expect(batcher.shouldFlush()).toBe(false);

      batcher.addEvents([createQueuedEvent(DomainEventType.USER_BANNED, "event-3")]);

      expect(batcher.shouldFlush()).toBe(true);

      const flushedEvents = batcher.flush();
      expect(flushedEvents).toHaveLength(3);
    });

    it("should handle time threshold flush", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(eventBatcher.shouldFlush()).toBe(false);

      jest.advanceTimersByTime(5000);

      expect(eventBatcher.shouldFlush()).toBe(true);

      const flushedEvents = eventBatcher.flush();
      expect(flushedEvents).toHaveLength(1);
    });

    it("should handle mixed add operations", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED, "event-1")]);
      eventBatcher.addEvents([
        createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2"),
        createQueuedEvent(DomainEventType.USER_BANNED, "event-3"),
      ]);
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_LOGGED_IN, "event-4")]);

      expect(eventBatcher.getSize()).toBe(4);

      const flushedEvents = eventBatcher.flush();
      expect(flushedEvents).toHaveLength(4);
    });

    it("should preserve event order", () => {
      const events = [
        createQueuedEvent(DomainEventType.USER_CREATED, "event-1"),
        createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2"),
        createQueuedEvent(DomainEventType.USER_BANNED, "event-3"),
      ];

      eventBatcher.addEvents(events);
      const flushedEvents = eventBatcher.flush();

      expect(flushedEvents[0].event.eventId).toBe("event-1");
      expect(flushedEvents[1].event.eventId).toBe("event-2");
      expect(flushedEvents[2].event.eventId).toBe("event-3");
    });

    it("should handle partial flushes with forceFlush", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED, "event-1")]);
      let flushed = eventBatcher.forceFlush();
      expect(flushed).toHaveLength(1);

      eventBatcher.addEvents([
        createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2"),
        createQueuedEvent(DomainEventType.USER_BANNED, "event-3"),
      ]);

      flushed = eventBatcher.forceFlush();
      expect(flushed).toHaveLength(2);
    });

    it("should handle clear followed by add", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED, "event-1")]);
      expect(eventBatcher.getSize()).toBe(1);

      eventBatcher.clear();
      expect(eventBatcher.getSize()).toBe(0);

      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")]);
      expect(eventBatcher.getSize()).toBe(1);
      expect(eventBatcher.hasEvents()).toBe(true);
    });

    it("should handle multiple flush triggers: size and time", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: 3,
        maxWaitTimeInMs: 5000,
        flushIntervalInMs: 1000,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")]);
      expect(batcher.shouldFlush()).toBe(false);

      jest.advanceTimersByTime(1000);
      expect(batcher.shouldFlush()).toBe(false);

      jest.advanceTimersByTime(4000);
      expect(batcher.shouldFlush()).toBe(true);

      batcher.flush();
      expect(batcher.getSize()).toBe(0);

      batcher.addEvents([
        createQueuedEvent(DomainEventType.USER_CREATED, "event-3"),
        createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-4"),
        createQueuedEvent(DomainEventType.USER_BANNED, "event-5"),
      ]);
      expect(batcher.shouldFlush()).toBe(true);
    });
  });

  describe("config edge cases", () => {
    it("should handle zero maxBatchSize", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: 0,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);
      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(batcher.shouldFlush()).toBe(true);
    });

    it("should handle zero maxWaitTimeMs", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        maxWaitTimeInMs: 0,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);
      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      jest.advanceTimersByTime(0);

      expect(batcher.shouldFlush()).toBe(true);
    });

    it("should handle negative maxBatchSize", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        batchSize: -1,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);
      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(batcher.shouldFlush()).toBe(true);
    });

    it("should handle large configuration values", () => {
      const customConfig: EventBatchConfig = {
        flushIntervalInMs: 999999,
        maxRetries: 999,
        retryDelayInMs: 999999,
        maxWaitTimeInMs: 999999,
        batchSize: 999999,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(batcher.getSize()).toBe(1);
      expect(batcher.shouldFlush()).toBe(false);

      jest.advanceTimersByTime(999999);
      expect(batcher.shouldFlush()).toBe(true);
    });
  });

  describe("concurrent scenarios", () => {
    it("should handle multiple add operations interleaved", () => {
      const events1 = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")];
      const events2 = [createQueuedEvent(DomainEventType.USER_BANNED, "event-3"), createQueuedEvent(DomainEventType.USER_LOGGED_IN, "event-4")];

      eventBatcher.addEvents(events1);
      eventBatcher.addEvents(events2);

      expect(eventBatcher.getSize()).toBe(4);
    });

    it("should handle rapid add and flush operations", () => {
      for (let i = 0; i < 10; i++) {
        eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED, `event-${i}`)]);
        if (i % 3 === 0) {
          const flushed = eventBatcher.flush();
          expect(flushed.length).toBeLessThanOrEqual(3);
        }
      }
    });

    it("should handle multiple forceFlush calls in succession", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")];
      eventBatcher.addEvents(events);

      const firstFlush = eventBatcher.forceFlush();
      expect(firstFlush).toHaveLength(2);
      expect(eventBatcher.getSize()).toBe(0);

      const secondFlush = eventBatcher.forceFlush();
      expect(secondFlush).toHaveLength(0);
    });
  });

  describe("logging behavior", () => {
    it("should log debug on flush with event types", () => {
      const events = [createQueuedEvent(DomainEventType.USER_CREATED, "event-1"), createQueuedEvent(DomainEventType.USER_DEACTIVATED, "event-2")];
      eventBatcher.addEvents(events);
      eventBatcher.flush();

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "EventBatcher",
          event: "FLUSH",
          message: "Flushing batch of 2 events",
          data: expect.objectContaining({
            eventTypes: [DomainEventType.USER_CREATED, DomainEventType.USER_DEACTIVATED],
          }),
        }),
      );
    });

    it("should not log debug on addEvents", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it("should log debug on forceFlush", () => {
      eventBatcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);
      eventBatcher.forceFlush();

      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe("retry configuration", () => {
    it("should store maxRetries configuration", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        maxRetries: 5,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      expect(batcher).toBeInstanceOf(InMemoryEventBatcherAdapter);
    });

    it("should store retryDelayInMs configuration", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        retryDelayInMs: 2000,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);

      expect(batcher).toBeInstanceOf(InMemoryEventBatcherAdapter);
    });

    it("should handle zero maxRetries", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        maxRetries: 0,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);
      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(batcher.getSize()).toBe(1);
    });

    it("should handle zero retryDelayInMs", () => {
      const customConfig: EventBatchConfig = {
        ...defaultConfig,
        retryDelayInMs: 0,
      };
      const batcher = new InMemoryEventBatcherAdapter(customConfig, mockLogger);
      batcher.addEvents([createQueuedEvent(DomainEventType.USER_CREATED)]);

      expect(batcher.getSize()).toBe(1);
    });
  });
});
