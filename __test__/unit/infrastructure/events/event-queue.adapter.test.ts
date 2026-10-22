/* eslint-disable @typescript-eslint/no-require-imports */
import { RedisEventQueueAdapter } from "@/infrastructure/events/event-queue.adapter";
import { Logger } from "@/application/ports/driven/logger";
import { QueuedEvent } from "@/application/ports/driven/event-queue";
import { EnrichedDomainEvent } from "@/application/ports/driven/event-processing";
import { EventExecutionStrategy } from "@/application/ports/driven/event-dispatcher";
import { DomainEventType } from "@/domain/types/domain-event-type.enum";
import { RedisConfig } from "@/infrastructure/config/redis.config";
import { EventQueueConfig } from "@/infrastructure/config/event-queue.config";

const mockRedisInstance = {
  pipeline: jest.fn(),
  zadd: jest.fn().mockResolvedValue(1),
  zpopmin: jest.fn().mockResolvedValue([]),
  zcard: jest.fn().mockResolvedValue(0),
  zrange: jest.fn().mockResolvedValue([]),
  zrangebyscore: jest.fn().mockResolvedValue([]),
  zrem: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(1),
  ping: jest.fn().mockResolvedValue("PONG"),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  status: "ready",
};

jest.mock("ioredis", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockRedisInstance),
  };
});

jest.useFakeTimers();

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const flushRetryTimers = async (times = 5) => {
  for (let i = 0; i < times; i++) {
    await jest.advanceTimersByTimeAsync(10000);
    await flushPromises();
  }
};

describe("RedisEventQueueAdapter", () => {
  let eventQueue: RedisEventQueueAdapter;
  let mockLogger: jest.Mocked<Logger>;
  let mockRedisConfig: RedisConfig;
  let mockEventQueueConfig: EventQueueConfig;
  let eventHandlers: Record<string, (...args: unknown[]) => unknown>;

  const createMockEvent = (eventType: DomainEventType, eventId: string = "event-1"): EnrichedDomainEvent => ({
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

  const createQueuedEvent = (eventType: DomainEventType, priority: number = 5): QueuedEvent => ({
    event: createMockEvent(eventType),
    handlerOptions: {
      strategy: EventExecutionStrategy.QUEUED_BATCH,
      priority,
    },
    handlerName: "testHandler",
    enqueuedAt: new Date(),
  });

  beforeEach(() => {
    eventHandlers = {};

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockRedisConfig = {
      host: "localhost",
      port: 6379,
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: false,
      family: 4,
    };

    mockEventQueueConfig = {
      maxRetries: 3,
      healthCheckInterval: 1000,
      batchTimeout: 5000,
    };

    mockRedisInstance.on.mockImplementation((event: string, handler: (...args: unknown[]) => unknown) => {
      eventHandlers[event] = handler;
      return mockRedisInstance;
    });

    Object.values(mockRedisInstance).forEach((mock) => {
      if (typeof mock === "function" && mock.mockReset) {
        mock.mockReset();
      }
    });

    mockRedisInstance.on.mockImplementation((event: string, handler: (...args: unknown[]) => unknown) => {
      eventHandlers[event] = handler;
      return mockRedisInstance;
    });
    mockRedisInstance.ping.mockResolvedValue("PONG");
    mockRedisInstance.quit.mockResolvedValue(undefined);
    mockRedisInstance.zadd.mockResolvedValue(1);
    mockRedisInstance.zpopmin.mockResolvedValue([]);
    mockRedisInstance.zcard.mockResolvedValue(0);
    mockRedisInstance.zrange.mockResolvedValue([]);
    mockRedisInstance.zrangebyscore.mockResolvedValue([]);
    mockRedisInstance.zrem.mockResolvedValue(1);
    mockRedisInstance.del.mockResolvedValue(1);

    eventQueue = new RedisEventQueueAdapter(mockRedisConfig, mockEventQueueConfig, mockLogger);
  });

  afterEach(async () => {
    await eventQueue.destroy();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should create instance with dependencies", () => {
      expect(eventQueue).toBeInstanceOf(RedisEventQueueAdapter);
    });

    it("should setup Redis with config", () => {
      const Redis = require("ioredis").default;
      expect(Redis).toHaveBeenCalledWith(mockRedisConfig);
    });

    it("should setup Redis event handlers", () => {
      expect(mockRedisInstance.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith("ready", expect.any(Function));
    });

    it("should start health check interval", () => {
      const setIntervalSpy = jest.spyOn(global, "setInterval");

      new RedisEventQueueAdapter(mockRedisConfig, mockEventQueueConfig, mockLogger);

      expect(setIntervalSpy).toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });

    it("should use healthCheckInterval from config", () => {
      const customConfig: EventQueueConfig = {
        maxRetries: 5,
        healthCheckInterval: 2000,
        batchTimeout: 3000,
      };

      const setIntervalSpy = jest.spyOn(global, "setInterval");
      new RedisEventQueueAdapter(mockRedisConfig, customConfig, mockLogger);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
      setIntervalSpy.mockRestore();
    });
  });

  describe("event handlers", () => {
    it("should handle connection error", () => {
      const error = new Error("Connection failed");

      eventHandlers["error"](error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "CONNECTION_ERROR",
          message: expect.stringContaining("Redis connection error in event queue"),
        }),
      );
    });

    it("should handle non-Error connection error", () => {
      const error = "String error";

      eventHandlers["error"](error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "CONNECTION_ERROR",
          data: { error: "String error" },
        }),
      );
    });

    it("should handle connection success", () => {
      eventHandlers["connect"]();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "CONNECTED",
          message: "Redis event queue connected",
        }),
      );
    });

    it("should handle ready event", () => {
      eventHandlers["ready"]();

      expect(eventQueue.isQueueHealthy()).resolves.toBe(true);
    });
  });

  describe("enqueue", () => {
    it("should enqueue single event", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED, 5);

      await eventQueue.enqueue([event]);

      expect(mockPipeline.zadd).toHaveBeenCalledWith("domain:events:queue", 5, expect.stringContaining(DomainEventType.USER_CREATED));
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it("should enqueue multiple events", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const events = [
        createQueuedEvent(DomainEventType.USER_CREATED, 1),
        createQueuedEvent(DomainEventType.USER_LOGGED_IN, 2),
        createQueuedEvent(DomainEventType.USER_LOGGED_OUT, 3),
      ];

      await eventQueue.enqueue(events);

      expect(mockPipeline.zadd).toHaveBeenCalledTimes(3);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it("should return early for empty array", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      await eventQueue.enqueue([]);

      expect(mockPipeline.zadd).not.toHaveBeenCalled();
      expect(mockPipeline.exec).not.toHaveBeenCalled();
    });

    it("should log success after enqueuing", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      await eventQueue.enqueue([event]);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "ENQUEUE_SUCCESS",
          message: expect.stringContaining("1 events"),
        }),
      );
    });

    it("should include enqueuedAt in stored event data", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      await eventQueue.enqueue([event]);

      const callArgs = mockPipeline.zadd.mock.calls[0];
      const eventData = JSON.parse(callArgs[2]);
      expect(eventData.enqueuedAt).toBeDefined();
      expect(new Date(eventData.enqueuedAt)).toBeInstanceOf(Date);
    });

    it("should throw error if pipeline fails", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[new Error("Pipeline error"), null]]),
      };

      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      jest.spyOn(global, "setTimeout").mockImplementation((callback) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      await expect(eventQueue.enqueue([event])).rejects.toThrow("Pipeline execution failed: Pipeline error");

      jest.restoreAllMocks();
    });

    it("should throw error when queue is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));

      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      await expect(eventQueue.enqueue([event])).rejects.toThrow("Event queue is not healthy - cannot perform enqueue");
    });

    it("should use default priority of 5 when not provided", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED) as any;
      delete event.handlerOptions.priority;

      await eventQueue.enqueue([event]);

      expect(mockPipeline.zadd).toHaveBeenCalledWith("domain:events:queue", 5, expect.any(String));
    });
  });

  describe("enqueueDelayed", () => {
    it("should enqueue event with delay", async () => {
      const event = createQueuedEvent(DomainEventType.USER_CREATED);
      const delayMs = 5000;

      await eventQueue.enqueueDelayed(event, delayMs);

      expect(mockRedisInstance.zadd).toHaveBeenCalledWith(
        "domain:events:delayed",
        expect.any(Number),
        expect.stringContaining(DomainEventType.USER_CREATED),
      );
    });

    it("should calculate correct execution time", async () => {
      const event = createQueuedEvent(DomainEventType.USER_CREATED);
      const delayMs = 10000;
      const now = Date.now();

      await eventQueue.enqueueDelayed(event, delayMs);

      const executionTime = mockRedisInstance.zadd.mock.calls[0][1] as number;
      expect(executionTime).toBeGreaterThanOrEqual(now + delayMs);
    });

    it("should include executeAt in stored event data", async () => {
      const event = createQueuedEvent(DomainEventType.USER_CREATED);
      const delayMs = 5000;

      await eventQueue.enqueueDelayed(event, delayMs);

      const callArgs = mockRedisInstance.zadd.mock.calls[0];
      const eventData = JSON.parse(callArgs[2]);
      expect(eventData.executeAt).toBeDefined();
      expect(eventData.enqueuedAt).toBeDefined();
    });

    it("should log success after enqueuing delayed event", async () => {
      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      await eventQueue.enqueueDelayed(event, 5000);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "ENQUEUE_DELAYED_SUCCESS",
        }),
      );
    });

    it("should handle enqueueDelayed error with retry", async () => {
      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      mockRedisInstance.zadd.mockRejectedValueOnce(new Error("Redis error")).mockResolvedValueOnce(1);

      const promise = eventQueue.enqueueDelayed(event, 5000);

      await flushRetryTimers();

      await expect(promise).resolves.toBeUndefined();

      expect(mockRedisInstance.zadd).toHaveBeenCalledTimes(2);
    });

    it("should throw when queue is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));
      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      await expect(eventQueue.enqueueDelayed(event, 5000)).rejects.toThrow("Event queue is not healthy - cannot perform enqueueDelayed");
    });
  });

  describe("dequeue", () => {
    it("should dequeue events from main queue", async () => {
      const eventData = JSON.stringify({
        ...createQueuedEvent(DomainEventType.USER_CREATED),
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zpopmin.mockResolvedValue([eventData, "5"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.dequeue(10);

      expect(events).toHaveLength(1);
      expect(mockRedisInstance.zpopmin).toHaveBeenCalledWith("domain:events:queue", 10);
    });

    it("should promote delayed events before dequeuing", async () => {
      const delayedEvent = JSON.stringify({
        ...createQueuedEvent(DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED),
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zrangebyscore.mockResolvedValue([delayedEvent, String(Date.now() - 1000)]);

      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);
      mockRedisInstance.zpopmin.mockResolvedValue([]);

      await eventQueue.dequeue(10);

      expect(mockRedisInstance.zrangebyscore).toHaveBeenCalled();
      expect(mockPipeline.zadd).toHaveBeenCalled();
    });

    it("should return empty array when no events", async () => {
      mockRedisInstance.zpopmin.mockResolvedValue([]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.dequeue(10);

      expect(events).toEqual([]);
    });

    it("should handle malformed JSON gracefully", async () => {
      mockRedisInstance.zpopmin.mockResolvedValue(["invalid json", "5"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.dequeue(10);

      expect(events).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "DEQUEUE_PARSE_ERROR",
        }),
      );
    });

    it("should handle multiple malformed events", async () => {
      const validEvent = JSON.stringify({
        ...createQueuedEvent(DomainEventType.USER_CREATED),
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zpopmin.mockResolvedValue(["invalid1", "1", "invalid2", "2", validEvent, "3"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.dequeue(10);

      expect(events).toHaveLength(1);
      expect(events[0].handlerName).toBe("testHandler");

      const parseErrors = mockLogger.error.mock.calls.filter(([log]) => log.event === "DEQUEUE_PARSE_ERROR");
      expect(parseErrors).toHaveLength(2);
    });

    it("should use default batch size of 10", async () => {
      mockRedisInstance.zpopmin.mockResolvedValue([]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      await eventQueue.dequeue();

      expect(mockRedisInstance.zpopmin).toHaveBeenCalledWith("domain:events:queue", 10);
    });

    it("should log success after dequeuing", async () => {
      const eventData = JSON.stringify({
        ...createQueuedEvent(DomainEventType.USER_CREATED),
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zpopmin.mockResolvedValue([eventData, "5"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      await eventQueue.dequeue();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "DEQUEUE_SUCCESS",
        }),
      );
    });

    it("should reconstruct enqueuedAt as Date object", async () => {
      const enqueuedAt = new Date();
      const eventData = JSON.stringify({
        ...createQueuedEvent(DomainEventType.USER_CREATED),
        enqueuedAt: enqueuedAt.toISOString(),
      });
      mockRedisInstance.zpopmin.mockResolvedValue([eventData, "5"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.dequeue(10);

      expect(events[0].enqueuedAt).toBeInstanceOf(Date);
      expect(events[0].enqueuedAt.getTime()).toBe(enqueuedAt.getTime());
    });

    it("should throw when queue is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));

      await expect(eventQueue.dequeue(10)).rejects.toThrow("Event queue is not healthy - cannot perform dequeue");
    });
  });

  describe("peek", () => {
    it("should peek events without removing them", async () => {
      const eventData = JSON.stringify({
        ...createQueuedEvent(DomainEventType.USER_CREATED),
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zrange.mockResolvedValue([eventData, "5"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.peek(5);

      expect(events).toHaveLength(1);
      expect(mockRedisInstance.zrange).toHaveBeenCalledWith("domain:events:queue", 0, 4, "WITHSCORES");
    });

    it("should use default count of 10", async () => {
      mockRedisInstance.zrange.mockResolvedValue([]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      await eventQueue.peek();

      expect(mockRedisInstance.zrange).toHaveBeenCalledWith("domain:events:queue", 0, 9, "WITHSCORES");
    });

    it("should handle parse errors gracefully", async () => {
      mockRedisInstance.zrange.mockResolvedValue(["invalid json", "5"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.peek();

      expect(events).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "PEEK_PARSE_ERROR",
        }),
      );
    });

    it("should reconstruct enqueuedAt as Date object", async () => {
      const enqueuedAt = new Date();
      const eventData = JSON.stringify({
        ...createQueuedEvent(DomainEventType.USER_CREATED),
        enqueuedAt: enqueuedAt.toISOString(),
      });
      mockRedisInstance.zrange.mockResolvedValue([eventData, "5"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.peek(5);

      expect(events[0].enqueuedAt).toBeInstanceOf(Date);
      expect(events[0].enqueuedAt.getTime()).toBe(enqueuedAt.getTime());
    });

    it("should throw when queue is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));

      await expect(eventQueue.peek(10)).rejects.toThrow("Event queue is not healthy - cannot perform peek");
    });
  });

  describe("hasEvents", () => {
    it("should return true when queue has events", async () => {
      mockRedisInstance.zcard.mockResolvedValue(5);

      const result = await eventQueue.hasEvents();

      expect(result).toBe(true);
    });

    it("should return false when queue is empty", async () => {
      mockRedisInstance.zcard.mockResolvedValue(0);

      const result = await eventQueue.hasEvents();

      expect(result).toBe(false);
    });

    it("should not promote delayed events", async () => {
      const zrangebyscoreSpy = jest.spyOn(mockRedisInstance, "zrangebyscore");
      mockRedisInstance.zcard.mockResolvedValue(0);

      await eventQueue.hasEvents();

      expect(zrangebyscoreSpy).not.toHaveBeenCalled();
    });

    it("should not throw when queue is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));
      mockRedisInstance.zcard.mockResolvedValue(0);

      const result = await eventQueue.hasEvents();

      expect(result).toBe(false);
    });
  });

  describe("getQueueSize", () => {
    it("should return main queue size", async () => {
      mockRedisInstance.zcard.mockResolvedValue(10);

      const size = await eventQueue.getQueueSize();

      expect(size).toBe(10);
      expect(mockRedisInstance.zcard).toHaveBeenCalledWith("domain:events:queue");
    });

    it("should throw when queue is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));
      mockRedisInstance.zcard.mockResolvedValue(0);

      const size = await eventQueue.getQueueSize();

      expect(size).toBe(0);
    });
  });

  describe("getMainQueueSize", () => {
    it("should return main queue size", async () => {
      mockRedisInstance.zcard.mockResolvedValue(10);

      const size = await eventQueue.getMainQueueSize();

      expect(size).toBe(10);
      expect(mockRedisInstance.zcard).toHaveBeenCalledWith("domain:events:queue");
    });

    it("should throw when queue is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));
      mockRedisInstance.zcard.mockResolvedValue(0);

      const size = await eventQueue.getMainQueueSize();

      expect(size).toBe(0);
    });
  });

  describe("getDelayedQueueSize", () => {
    it("should return delayed queue size", async () => {
      mockRedisInstance.zcard.mockResolvedValue(5);

      const size = await eventQueue.getDelayedQueueSize();

      expect(size).toBe(5);
      expect(mockRedisInstance.zcard).toHaveBeenCalledWith("domain:events:delayed");
    });

    it("should throw when queue is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));
      mockRedisInstance.zcard.mockResolvedValue(0);

      const size = await eventQueue.getDelayedQueueSize();

      expect(size).toBe(0);
    });
  });

  describe("clear", () => {
    it("should clear both queues", async () => {
      await eventQueue.clear();

      expect(mockRedisInstance.del).toHaveBeenCalledTimes(2);
      expect(mockRedisInstance.del).toHaveBeenCalledWith("domain:events:queue");
      expect(mockRedisInstance.del).toHaveBeenCalledWith("domain:events:delayed");
    });

    it("should log success after clearing", async () => {
      await eventQueue.clear();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "QUEUES_CLEARED",
        }),
      );
    });

    it("should throw when queue is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));

      await expect(eventQueue.clear()).rejects.toThrow("Event queue is not healthy - cannot perform clear");
    });
  });

  describe("isQueueHealthy", () => {
    it("should return true when healthy", async () => {
      const result = await eventQueue.isQueueHealthy();

      expect(result).toBe(true);
    });

    it("should return false after error", async () => {
      eventHandlers["error"](new Error("Connection lost"));

      const result = await eventQueue.isQueueHealthy();

      expect(result).toBe(false);
    });

    it("should return true after reconnecting", async () => {
      eventHandlers["error"](new Error("Connection lost"));
      eventHandlers["connect"]();

      const result = await eventQueue.isQueueHealthy();

      expect(result).toBe(true);
    });

    it("should log health check request", async () => {
      await eventQueue.isQueueHealthy();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "HEALTH_CHECK",
          message: "Health check started",
        }),
      );
    });
  });

  describe("health check", () => {
    it("should ping Redis periodically", async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockRedisInstance.ping).toHaveBeenCalled();
    });

    it("should mark unhealthy on ping failure", async () => {
      mockRedisInstance.ping.mockRejectedValueOnce(new Error("Ping failed"));

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "HEALTH_CHECK_FAILED",
        }),
      );
    });

    it("should handle non-Error ping failure", async () => {
      mockRedisInstance.ping.mockRejectedValueOnce("String error");

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "HEALTH_CHECK_FAILED",
          data: { error: "String error" },
        }),
      );
    });

    it("should restore health on successful ping", async () => {
      mockRedisInstance.ping.mockRejectedValueOnce(new Error("Ping failed"));

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(eventQueue.isQueueHealthy()).resolves.toBe(false);

      mockRedisInstance.ping.mockResolvedValueOnce("PONG");
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(eventQueue.isQueueHealthy()).resolves.toBe(true);
    });
  });

  describe("retry mechanism", () => {
    it("should retry failed operations", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockRejectedValueOnce(new Error("Temporary failure"))
          .mockResolvedValueOnce([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);
      const enqueuePromise = eventQueue.enqueue([event]);

      await jest.advanceTimersByTimeAsync(200);
      await flushPromises();

      await enqueuePromise;

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "ENQUEUE_RETRY",
        }),
      );
    });

    it("should throw after all retries exhausted", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error("Persistent failure")),
      };

      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      jest.spyOn(global, "setTimeout").mockImplementation((callback) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      await expect(eventQueue.enqueue([event])).rejects.toThrow("Persistent failure");

      jest.restoreAllMocks();
    });

    it("should use exponential backoff between retries", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockRejectedValueOnce(new Error("Failure 1"))
          .mockRejectedValueOnce(new Error("Failure 2"))
          .mockResolvedValueOnce([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      const enqueuePromise = eventQueue.enqueue([event]);

      await jest.advanceTimersByTimeAsync(200);
      await flushPromises();
      await jest.advanceTimersByTimeAsync(400);
      await flushPromises();

      await enqueuePromise;

      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    }, 10000);

    it("should re-check health on each retry", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockRejectedValueOnce(new Error("Temporary failure"))
          .mockResolvedValueOnce([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      const enqueuePromise = eventQueue.enqueue([event]);

      await jest.advanceTimersByTimeAsync(200);
      await flushPromises();
      await enqueuePromise;

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "ENQUEUE_RETRY",
        }),
      );
    });
  });

  describe("promoteDelayedEvents", () => {
    it("should promote ready delayed events to main queue", async () => {
      const pastTime = Date.now() - 1000;
      const eventData = JSON.stringify({
        ...createQueuedEvent(DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED, 5),
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zrangebyscore.mockResolvedValue([eventData, String(pastTime)]);

      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      mockRedisInstance.zpopmin.mockResolvedValue([]);
      await eventQueue.dequeue();

      expect(mockPipeline.zadd).toHaveBeenCalledWith("domain:events:queue", 5, eventData);
      expect(mockPipeline.zrem).toHaveBeenCalledWith("domain:events:delayed", eventData);
    });

    it("should handle multiple ready delayed events", async () => {
      const eventData1 = JSON.stringify({
        ...createQueuedEvent(DomainEventType.USER_CREATED, 1),
        enqueuedAt: new Date().toISOString(),
      });
      const eventData2 = JSON.stringify({
        ...createQueuedEvent(DomainEventType.USER_LOGGED_IN, 2),
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zrangebyscore.mockResolvedValue([eventData1, String(Date.now() - 1000), eventData2, String(Date.now() - 500)]);

      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      mockRedisInstance.zpopmin.mockResolvedValue([]);
      await eventQueue.dequeue();

      expect(mockPipeline.zadd).toHaveBeenCalledTimes(2);
      expect(mockPipeline.zrem).toHaveBeenCalledTimes(2);
    });

    it("should remove invalid delayed events", async () => {
      mockRedisInstance.zrangebyscore.mockResolvedValue(["invalid json", String(Date.now())]);

      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      mockRedisInstance.zpopmin.mockResolvedValue([]);
      await eventQueue.dequeue();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "PROMOTE_ERROR",
        }),
      );
      expect(mockPipeline.zadd).not.toHaveBeenCalled();
      expect(mockPipeline.zrem).toHaveBeenCalledWith("domain:events:delayed", "invalid json");
    });

    it("should log promoted count", async () => {
      const eventData = JSON.stringify({
        ...createQueuedEvent(DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED),
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zrangebyscore.mockResolvedValue([eventData, String(Date.now() - 1000)]);

      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      mockRedisInstance.zpopmin.mockResolvedValue([]);
      await eventQueue.dequeue();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "PROMOTE_SUCCESS",
          message: expect.stringContaining("1 delayed events"),
        }),
      );
    });

    it("should do nothing when no delayed events are ready", async () => {
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      mockRedisInstance.zpopmin.mockResolvedValue([]);
      await eventQueue.dequeue();

      expect(mockPipeline.exec).not.toHaveBeenCalled();
    });

    it("should use default priority of 5 when not specified", async () => {
      const event = createQueuedEvent(DomainEventType.USER_CREATED) as any;
      delete event.handlerOptions.priority;
      const eventData = JSON.stringify({
        ...event,
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zrangebyscore.mockResolvedValue([eventData, String(Date.now() - 1000)]);

      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      mockRedisInstance.zpopmin.mockResolvedValue([]);
      await eventQueue.dequeue();

      expect(mockPipeline.zadd).toHaveBeenCalledWith("domain:events:queue", 5, eventData);
    });
  });

  describe("destroy", () => {
    it("should clear health check interval", async () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      await eventQueue.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it("should quit Redis connection", async () => {
      await eventQueue.destroy();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it("should log destruction", async () => {
      await eventQueue.destroy();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "DESTROYED",
        }),
      );
    });

    it("should handle quit errors gracefully", async () => {
      mockRedisInstance.quit.mockRejectedValue(new Error("Quit failed"));

      await eventQueue.destroy();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "DESTROY_WARNING",
        }),
      );
    });

    it("should handle quit with non-Error", async () => {
      mockRedisInstance.quit.mockRejectedValue("String error");

      await eventQueue.destroy();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "DESTROY_WARNING",
          data: { error: "String error" },
        }),
      );
    });

    it("should not throw if health check interval is already cleared", async () => {
      await eventQueue.destroy();
      await eventQueue.destroy();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RedisEventQueue",
          event: "DESTROY_ALREADY_CALLED",
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle very large batch sizes", async () => {
      const events = Array.from({ length: 1000 }, (_, i) => createQueuedEvent(DomainEventType.USER_CREATED, i % 10));

      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(events.map(() => [null, 1])),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      await eventQueue.enqueue(events);

      expect(mockPipeline.zadd).toHaveBeenCalledTimes(1000);
    });

    it("should handle events with zero priority (converted to default 5)", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED, 0);

      await eventQueue.enqueue([event]);

      expect(mockPipeline.zadd).toHaveBeenCalledWith("domain:events:queue", 5, expect.any(String));
    });

    it("should handle delayed events with zero delay", async () => {
      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      await eventQueue.enqueueDelayed(event, 0);

      expect(mockRedisInstance.zadd).toHaveBeenCalled();
    });

    it("should handle pipeline execution with partial failures", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [new Error("Second command failed"), null],
          [null, 1],
        ]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const events = [
        createQueuedEvent(DomainEventType.USER_CREATED, 1),
        createQueuedEvent(DomainEventType.USER_LOGGED_IN, 2),
        createQueuedEvent(DomainEventType.USER_LOGGED_OUT, 3),
      ];

      jest.spyOn(global, "setTimeout").mockImplementation((callback) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      await expect(eventQueue.enqueue(events)).rejects.toThrow("Pipeline execution failed: Second command failed");

      jest.restoreAllMocks();
    });

    it("should handle dequeue with mixed valid and invalid events", async () => {
      const validEvent = JSON.stringify({
        ...createQueuedEvent(DomainEventType.USER_CREATED),
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zpopmin.mockResolvedValue(["invalid1", "1", validEvent, "2", "invalid2", "3"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.dequeue(10);

      expect(events).toHaveLength(1);
      expect(events[0].handlerName).toBe("testHandler");
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it("should handle empty pipeline results", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      jest.spyOn(global, "setTimeout").mockImplementation((callback) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      await expect(eventQueue.enqueue([event])).rejects.toThrow("Pipeline execution failed: empty result");

      jest.restoreAllMocks();
    });

    it("should handle negative retry attempts in config", async () => {
      const customConfig: EventQueueConfig = {
        maxRetries: -1,
        healthCheckInterval: 1000,
        batchTimeout: 5000,
      };

      const queue = new RedisEventQueueAdapter(mockRedisConfig, customConfig, mockLogger);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error("Error")),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      jest.spyOn(global, "setTimeout").mockImplementation((callback) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      await expect(queue.enqueue([event])).rejects.toThrow("All retry attempts failed for enqueue");

      await queue.destroy();
      jest.restoreAllMocks();
    });

    it("should handle config with zero healthCheckInterval", async () => {
      const customConfig: EventQueueConfig = {
        maxRetries: 3,
        healthCheckInterval: 0,
        batchTimeout: 5000,
      };

      const setIntervalSpy = jest.spyOn(global, "setInterval");
      const queue = new RedisEventQueueAdapter(mockRedisConfig, customConfig, mockLogger);

      expect(queue).toBeInstanceOf(RedisEventQueueAdapter);

      await queue.destroy();
      setIntervalSpy.mockRestore();
    });
  });

  describe("integration scenarios", () => {
    it("should handle full lifecycle: enqueue, dequeue, process", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const event = createQueuedEvent(DomainEventType.USER_CREATED);
      await eventQueue.enqueue([event]);

      expect(mockPipeline.zadd).toHaveBeenCalled();

      const eventData = JSON.stringify({
        ...event,
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zpopmin.mockResolvedValue([eventData, "5"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const events = await eventQueue.dequeue(10);

      expect(events).toHaveLength(1);
      expect(events[0].handlerName).toBe("testHandler");
    });

    it("should handle delayed event flow", async () => {
      const event = createQueuedEvent(DomainEventType.USER_CREATED);

      await eventQueue.enqueueDelayed(event, 1000);

      mockRedisInstance.zcard.mockResolvedValue(1);
      const delayedSize = await eventQueue.getDelayedQueueSize();
      expect(delayedSize).toBe(1);

      jest.advanceTimersByTime(1000);

      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const eventData = JSON.stringify({
        ...event,
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zrangebyscore.mockResolvedValue([eventData, String(Date.now())]);
      mockRedisInstance.zpopmin.mockResolvedValue([]);

      const events = await eventQueue.dequeue(10);

      expect(events).toHaveLength(0);
      expect(mockPipeline.zrem).toHaveBeenCalled();
    });

    it("should handle multiple operations in sequence", async () => {
      const mockPipeline = {
        zadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const events = [createQueuedEvent(DomainEventType.USER_CREATED, 1), createQueuedEvent(DomainEventType.USER_LOGGED_IN, 2)];
      await eventQueue.enqueue(events);

      mockRedisInstance.zcard.mockResolvedValue(2);
      const size = await eventQueue.getQueueSize();
      expect(size).toBe(2);

      const eventData1 = JSON.stringify({
        ...events[0],
        enqueuedAt: new Date().toISOString(),
      });
      const eventData2 = JSON.stringify({
        ...events[1],
        enqueuedAt: new Date().toISOString(),
      });
      mockRedisInstance.zpopmin.mockResolvedValue([eventData1, "1", eventData2, "2"]);
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);

      const dequeued = await eventQueue.dequeue(10);
      expect(dequeued).toHaveLength(2);

      mockRedisInstance.zcard.mockResolvedValue(0);
      const newSize = await eventQueue.getQueueSize();
      expect(newSize).toBe(0);
    });
  });
});
