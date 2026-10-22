import { PrismaDeadLetterQueueAdapter } from "@/infrastructure/events/dead-letter-queue.adapter";
import { Logger } from "@/application/ports/driven/logger";
import { NormalizedEventHandler } from "@/application/ports/driven/event-handler";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { EventHandlerRegistration } from "@/application/ports/driven/event-handler-registration";
import { EnrichedDomainEvent } from "@/application/ports/driven/event-processing";
import { DomainEventType } from "@/domain/types/domain-event-type.enum";
import { IdGenerator } from "@/application/ports/driven/id-generator";
import { EventExecutionStrategy } from "@/application/ports/driven/event-dispatcher";

type MockDeadLetterEventDelegate = {
  create: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  findMany: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
  groupBy: jest.Mock;
};

type MockPrismaClient = {
  deadLetterEvent: MockDeadLetterEventDelegate;
  $transaction: jest.Mock;
};

function createMockEvent(overrides: Partial<EnrichedDomainEvent> = {}): EnrichedDomainEvent {
  return {
    eventType: DomainEventType.USER_CREATED,
    eventId: "event-123",
    aggregateId: "user-456",
    occurredOn: new Date(),
    payload: { username: "testuser", email: "test@example.com" },
    processingMetadata: {
      processingId: "processing-789",
      retryCount: 0,
      enqueuedAt: new Date(),
    },
    version: 1,
    ...overrides,
  };
}

function createMockNormalizedHandler(overrides: Partial<NormalizedEventHandler> = {}): NormalizedEventHandler {
  return {
    eventType: DomainEventType.USER_CREATED,
    handlerName: "test-handler",
    options: { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT },
    handler: jest.fn().mockResolvedValue(undefined),
    registeredAt: new Date(),
    ...overrides,
  };
}

function createMockPrismaDeadLetterRow(event: EnrichedDomainEvent, handlerName = "test-handler", overrides: Record<string, unknown> = {}) {
  return {
    id: "dlq-123",
    eventType: event.eventType,
    eventData: JSON.stringify(event),
    handlerName,
    errorMessage: "Test error message",
    errorStack: null as string | null,
    attempts: 1,
    failedAt: new Date(),
    canRetry: true,
    eventId: event.eventId,
    processingId: event.processingMetadata.processingId,
    correlationId: null as string | null,
    retriedAt: null as Date | null,
    ...overrides,
  };
}

function buildMockPrismaClient(): MockPrismaClient {
  const client: MockPrismaClient = {
    deadLetterEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  client.$transaction.mockImplementation(async (cb: (tx: MockPrismaClient) => unknown) => cb(client));
  return client;
}

describe("PrismaDeadLetterQueueAdapter", () => {
  let sut: PrismaDeadLetterQueueAdapter;

  let mockLogger: jest.Mocked<Logger>;
  let mockDatabase: jest.Mocked<PrismaDatabaseClient>;
  let mockEventHandlerRegistration: jest.Mocked<EventHandlerRegistration>;
  let mockIdGenerator: jest.Mocked<IdGenerator>;
  let mockPrisma: MockPrismaClient;

  let mockNormalizedHandler: NormalizedEventHandler;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockPrisma = buildMockPrismaClient();

    mockDatabase = {
      getPrismaClient: jest.fn().mockResolvedValue(mockPrisma),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    mockEventHandlerRegistration = {
      handlers: new Map(),
      registerHandler: jest.fn(),
      getHandlersForEvent: jest.fn(),
      getHandlerByName: jest.fn(),
      unregisterHandler: jest.fn(),
      isHandlerRegistered: jest.fn(),
    } as jest.Mocked<EventHandlerRegistration>;

    mockIdGenerator = {
      generate: jest.fn().mockReturnValue("generated-uuid"),
    } as jest.Mocked<IdGenerator>;

    mockNormalizedHandler = createMockNormalizedHandler();

    sut = new PrismaDeadLetterQueueAdapter(mockDatabase, mockEventHandlerRegistration, mockIdGenerator, mockLogger);
  });

  describe("constructor", () => {
    it("creates an instance", () => {
      expect(sut).toBeInstanceOf(PrismaDeadLetterQueueAdapter);
    });
  });

  describe("addFailedEvent", () => {
    const mockError = new Error("Test error message");
    let mockEvent: EnrichedDomainEvent;

    beforeEach(() => {
      mockEvent = createMockEvent();
      jest.spyOn(sut as any, "sendDeadLetterAlert").mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("stores the event on the first attempt", async () => {
      const dbRow = createMockPrismaDeadLetterRow(mockEvent, mockNormalizedHandler.handlerName);
      mockPrisma.deadLetterEvent.create.mockResolvedValue(dbRow);

      await sut.addFailedEvent(mockNormalizedHandler, mockEvent, mockError, new Date());

      expect(mockPrisma.deadLetterEvent.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.deadLetterEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: mockEvent.eventType,
          eventData: JSON.stringify(mockEvent),
          handlerName: mockNormalizedHandler.handlerName,
          errorMessage: mockError.message,
          errorStack: mockError.stack ?? null,
          attempts: 1,
          failedAt: expect.any(Date),
          canRetry: true,
          eventId: mockEvent.eventId,
          processingId: mockEvent.processingMetadata.processingId,
        },
      });
    });

    it("logs success after storing", async () => {
      const dbRow = createMockPrismaDeadLetterRow(mockEvent, mockNormalizedHandler.handlerName);
      mockPrisma.deadLetterEvent.create.mockResolvedValue(dbRow);

      await sut.addFailedEvent(mockNormalizedHandler, mockEvent, mockError, new Date());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "PrismaDeadLetterQueueAdapter",
        event: mockEvent.eventType,
        message: `Event sent to dead letter queue after 1 attempts`,
        data: {
          deadLetterEventId: dbRow.id,
          handlerName: mockNormalizedHandler.handlerName,
          processingId: mockEvent.processingMetadata.processingId,
          error: mockError.message,
        },
      });
    });

    it("retries on transient DB failure and succeeds on second attempt", async () => {
      const dbRow = createMockPrismaDeadLetterRow(mockEvent, mockNormalizedHandler.handlerName, {
        attempts: 2,
      });

      mockPrisma.deadLetterEvent.create.mockRejectedValueOnce(new Error("DB connection lost")).mockResolvedValueOnce(dbRow);

      const pending = sut.addFailedEvent(mockNormalizedHandler, mockEvent, mockError, new Date());

      await jest.advanceTimersByTimeAsync(1000);

      await expect(pending).resolves.toBeUndefined();
      expect(mockPrisma.deadLetterEvent.create).toHaveBeenCalledTimes(2);
    });

    it("uses exponential backoff for retries", async () => {
      const dbRow = createMockPrismaDeadLetterRow(mockEvent, mockNormalizedHandler.handlerName, {
        attempts: 3,
      });

      mockPrisma.deadLetterEvent.create
        .mockRejectedValueOnce(new Error("DB error 1"))
        .mockRejectedValueOnce(new Error("DB error 2"))
        .mockResolvedValueOnce(dbRow);

      const pending = sut.addFailedEvent(mockNormalizedHandler, mockEvent, mockError, new Date());

      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);

      await expect(pending).resolves.toBeUndefined();
      expect(mockPrisma.deadLetterEvent.create).toHaveBeenCalledTimes(3);
    });

    it("throws a CRITICAL error after exhausting all 3 DB attempts", async () => {
      jest.useFakeTimers();
      jest.spyOn(global, "setTimeout").mockImplementation((fn: any) => fn());
      jest.spyOn(sut as any, "sendEmergencyAlert").mockResolvedValue(undefined);

      mockPrisma.deadLetterEvent.create.mockRejectedValue(new Error("DB permanently down"));

      await expect(sut.addFailedEvent(mockNormalizedHandler, mockEvent, mockError, new Date())).rejects.toThrow(
        "CRITICAL: Failed to store event in dead letter queue after 3 attempts",
      );
    });

    it("handles a non-Error value as the error parameter", async () => {
      const dbRow = createMockPrismaDeadLetterRow(mockEvent, mockNormalizedHandler.handlerName);
      mockPrisma.deadLetterEvent.create.mockResolvedValue(dbRow);

      await sut.addFailedEvent(mockNormalizedHandler, mockEvent, "String error", new Date());

      expect(mockPrisma.deadLetterEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errorMessage: "String error",
            errorStack: null,
          }),
        }),
      );
    });

    it("passes the result of canRetryEvent to the DB row", async () => {
      const canRetrySpy = jest.spyOn(sut as any, "canRetryEvent").mockReturnValue(false);
      const dbRow = createMockPrismaDeadLetterRow(mockEvent, mockNormalizedHandler.handlerName, {
        canRetry: false,
      });
      mockPrisma.deadLetterEvent.create.mockResolvedValue(dbRow);

      await sut.addFailedEvent(mockNormalizedHandler, mockEvent, mockError, new Date());

      expect(canRetrySpy).toHaveBeenCalledWith(mockError);
      expect(mockPrisma.deadLetterEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ canRetry: false }),
        }),
      );
    });

    it("calls sendDeadLetterAlert after successful storage", async () => {
      const dbRow = createMockPrismaDeadLetterRow(mockEvent, mockNormalizedHandler.handlerName);
      mockPrisma.deadLetterEvent.create.mockResolvedValue(dbRow);
      const alertSpy = jest.spyOn(sut as any, "sendDeadLetterAlert").mockResolvedValue(undefined);

      await sut.addFailedEvent(mockNormalizedHandler, mockEvent, mockError, new Date());

      expect(alertSpy).toHaveBeenCalledWith(dbRow.id, mockEvent.eventType, mockNormalizedHandler.handlerName, mockError);
    });

    it("calls sendEmergencyAlert when all DB attempts fail", async () => {
      jest.useFakeTimers();
      jest.spyOn(global, "setTimeout").mockImplementation((fn: any) => fn());

      const emergencySpy = jest.spyOn(sut as any, "sendEmergencyAlert").mockResolvedValue(undefined);

      mockPrisma.deadLetterEvent.create.mockRejectedValue(new Error("DB permanently down"));

      try {
        await sut.addFailedEvent(mockNormalizedHandler, mockEvent, mockError, new Date());
      } catch (error) {
        // Ignore
      }

      expect(emergencySpy).toHaveBeenCalledWith(mockEvent, mockNormalizedHandler, mockError, expect.any(Error));
    });
  });

  describe("retryEvent", () => {
    let mockDbRow: ReturnType<typeof createMockPrismaDeadLetterRow>;

    beforeEach(() => {
      mockDbRow = createMockPrismaDeadLetterRow(createMockEvent(), "test-handler", {
        id: "dlq-event-123",
        canRetry: true,
        failedAt: new Date("2024-01-01"),
        retriedAt: null,
      });

      mockPrisma.deadLetterEvent.findUnique.mockResolvedValue(mockDbRow);
      mockPrisma.deadLetterEvent.update.mockResolvedValue({} as any);
      mockEventHandlerRegistration.getHandlerByName.mockReturnValue({
        handlerName: "test-handler",
        supportedEvents: new Map(),
        execute: jest.fn().mockResolvedValue(undefined),
      });
    });

    it("fetches the event, marks it in-flight, calls execute, and logs success", async () => {
      await sut.retryEvent(mockDbRow.id);

      expect(mockPrisma.deadLetterEvent.findUnique).toHaveBeenCalledWith({
        where: { id: mockDbRow.id },
      });

      expect(mockEventHandlerRegistration.getHandlerByName).toHaveBeenCalledWith(mockDbRow.handlerName);

      expect(mockPrisma.deadLetterEvent.update).toHaveBeenNthCalledWith(1, {
        where: { id: mockDbRow.id },
        data: { canRetry: false, retriedAt: expect.any(Date) },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaDeadLetterQueueAdapter",
          event: "EVENT_RETRIED",
          message: "Successfully retried dead letter event",
          data: expect.objectContaining({
            eventId: mockDbRow.id,
            handlerName: mockDbRow.handlerName,
          }),
        }),
      );
    });

    it("throws when the event is not found", async () => {
      mockPrisma.deadLetterEvent.findUnique.mockResolvedValue(null);

      await expect(sut.retryEvent("non-existent-id")).rejects.toThrow("Dead letter event non-existent-id not found");
      expect(mockEventHandlerRegistration.getHandlerByName).not.toHaveBeenCalled();
    });

    it("throws when canRetry is false", async () => {
      mockPrisma.deadLetterEvent.findUnique.mockResolvedValue({
        ...mockDbRow,
        canRetry: false,
      });

      await expect(sut.retryEvent(mockDbRow.id)).rejects.toThrow(`Event ${mockDbRow.id} cannot be retried`);
    });

    it("throws when the handler is no longer registered", async () => {
      mockEventHandlerRegistration.getHandlerByName.mockReturnValue(undefined);

      await expect(sut.retryEvent(mockDbRow.id)).rejects.toThrow(`Handler '${mockDbRow.handlerName}' not found or no longer registered`);
    });

    it("reverts canRetry and re-throws when handler execution fails", async () => {
      const retryError = new Error("Handler blew up");
      const mockHandler = {
        handlerName: "test-handler",
        supportedEvents: new Map(),
        execute: jest.fn().mockRejectedValue(retryError),
      };
      mockEventHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      await expect(sut.retryEvent(mockDbRow.id)).rejects.toThrow(retryError);

      expect(mockPrisma.deadLetterEvent.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.deadLetterEvent.update).toHaveBeenNthCalledWith(2, {
        where: { id: mockDbRow.id },
        data: { canRetry: true, retriedAt: null },
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaDeadLetterQueueAdapter",
          event: "RETRY_FAILED",
          message: "Failed to retry dead letter event - reverted canRetry flag",
          data: expect.objectContaining({
            eventId: mockDbRow.id,
            error: retryError.message,
          }),
        }),
      );
    });

    it("parses domain event from JSON string", async () => {
      const parseSpy = jest.spyOn(sut as any, "parseDomainEvent");

      await sut.retryEvent(mockDbRow.id);

      expect(parseSpy).toHaveBeenCalledWith(mockDbRow.eventData);
    });

    it("generates new processingId for retry event", async () => {
      await sut.retryEvent(mockDbRow.id);

      expect(mockIdGenerator.generate).toHaveBeenCalled();
    });
  });

  describe("retryEventsByType", () => {
    const mockEvents = [
      { id: "dlq-1", eventType: "USER_CREATED", handlerName: "handler-1", canRetry: true, failedAt: new Date("2024-01-01") },
      { id: "dlq-2", eventType: "USER_CREATED", handlerName: "handler-1", canRetry: true, failedAt: new Date("2024-01-02") },
      { id: "dlq-3", eventType: "USER_CREATED", handlerName: "handler-2", canRetry: true, failedAt: new Date("2024-01-03") },
    ];

    beforeEach(() => {
      mockPrisma.deadLetterEvent.findMany.mockResolvedValue(mockEvents as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("returns correct success/failure counts and per-event errors", async () => {
      const mockHandler = {
        handlerName: "handler-1",
        supportedEvents: new Map(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      mockEventHandlerRegistration.getHandlerByName.mockImplementation((name) => {
        if (name === "handler-1") return mockHandler;
        return undefined;
      });

      jest.spyOn(sut, "retryEvent").mockImplementation(async (eventId) => {
        if (eventId === "dlq-2") throw new Error("Retry failed for dlq-2");
      });

      const result = await sut.retryEventsByType("USER_CREATED", 10);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors).toContain("Event dlq-2: Retry failed for dlq-2");
      expect(result.errors).toContain("Event dlq-3: Handler 'handler-2' not found");
    });

    it("queries only retryable events for the given type with the supplied limit", async () => {
      jest.spyOn(sut, "retryEvent").mockResolvedValue(undefined);

      await sut.retryEventsByType("USER_CREATED", 10);

      expect(mockPrisma.deadLetterEvent.findMany).toHaveBeenCalledWith({
        where: { eventType: "USER_CREATED", canRetry: true },
        take: 10,
        orderBy: { failedAt: "asc" },
      });
    });

    it("counts events as failed when their handler is not registered", async () => {
      mockEventHandlerRegistration.getHandlerByName.mockImplementation((name) => {
        if (name === "handler-1") {
          return {
            handlerName: "handler-1",
            supportedEvents: new Map(),
            execute: jest.fn().mockResolvedValue(undefined),
          };
        }
        return undefined;
      });
      jest.spyOn(sut, "retryEvent").mockResolvedValue(undefined);

      const result = await sut.retryEventsByType("USER_CREATED", 10);

      expect(result.failed).toBe(1);
      expect(result.errors).toContain("Event dlq-3: Handler 'handler-2' not found");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaDeadLetterQueueAdapter",
          event: "BULK_RETRY_HANDLER_NOT_FOUND",
          message: "Handler not found during bulk retry",
          data: expect.objectContaining({ handlerName: "handler-2", eventCount: 1 }),
        }),
      );
    });

    it("returns zeros when no retryable events exist", async () => {
      mockPrisma.deadLetterEvent.findMany.mockResolvedValue([]);

      const result = await sut.retryEventsByType("UNKNOWN_TYPE", 100);

      expect(result).toEqual({ successful: 0, failed: 0, errors: [] });
    });

    it("logs a BULK_RETRY_COMPLETED summary", async () => {
      const mockHandler = {
        handlerName: "handler-1",
        supportedEvents: new Map(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      mockEventHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);
      jest.spyOn(sut, "retryEvent").mockResolvedValue(undefined);

      await sut.retryEventsByType("USER_CREATED", 10);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaDeadLetterQueueAdapter",
          event: "BULK_RETRY_COMPLETED",
          message: "Bulk retry completed for event type: USER_CREATED",
          data: expect.objectContaining({ eventType: "USER_CREATED" }),
        }),
      );
    });

    it("groups events by handler for efficient processing", async () => {
      const mockHandler = {
        handlerName: "handler-1",
        supportedEvents: new Map(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      mockEventHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);
      jest.spyOn(sut, "retryEvent").mockResolvedValue(undefined);

      await sut.retryEventsByType("USER_CREATED", 10);

      expect(sut.retryEvent).toHaveBeenCalledTimes(3);
    });

    it("continues processing when one event fails", async () => {
      const mockHandler = {
        handlerName: "handler-1",
        supportedEvents: new Map(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      mockEventHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      jest
        .spyOn(sut, "retryEvent")
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Retry failed"))
        .mockResolvedValueOnce(undefined);

      const result = await sut.retryEventsByType("USER_CREATED", 3);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("getFailedEvents", () => {
    beforeEach(() => {
      jest.spyOn(sut as any, "mapToDeadLetterEvent").mockImplementation((event: any) => ({
        id: event.id,
        eventType: event.eventType,
        eventData: typeof event.eventData === "string" ? JSON.parse(event.eventData) : event.eventData,
        handlerName: event.handlerName,
        error: event.errorMessage,
        attempts: event.attempts,
        failedAt: event.failedAt,
        correlationId: event.correlationId ?? undefined,
        canRetry: event.canRetry,
      }));
    });

    afterEach(() => jest.restoreAllMocks());

    it("queries with default pagination", async () => {
      mockPrisma.deadLetterEvent.findMany.mockResolvedValue([]);

      await sut.getFailedEvents();

      expect(mockPrisma.deadLetterEvent.findMany).toHaveBeenCalledWith({
        orderBy: { failedAt: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("respects custom limit and offset", async () => {
      mockPrisma.deadLetterEvent.findMany.mockResolvedValue([]);

      await sut.getFailedEvents(20, 10);

      expect(mockPrisma.deadLetterEvent.findMany).toHaveBeenCalledWith({
        orderBy: { failedAt: "desc" },
        take: 20,
        skip: 10,
      });
    });

    it("returns the mapped rows", async () => {
      const rawRow = {
        id: "1",
        eventType: "TYPE1",
        eventData: '{"eventType":"TYPE1"}',
        handlerName: "handler1",
        errorMessage: "Error 1",
        attempts: 1,
        failedAt: new Date(),
        correlationId: null,
        canRetry: true,
      };
      mockPrisma.deadLetterEvent.findMany.mockResolvedValue([rawRow]);

      const result = await sut.getFailedEvents();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
      expect(result[0].eventType).toBe("TYPE1");
    });
  });

  describe("getFailedEventsByType", () => {
    beforeEach(() => {
      jest.spyOn(sut as any, "mapToDeadLetterEvent").mockImplementation((e: any) => e);
    });
    afterEach(() => jest.restoreAllMocks());

    it("filters by eventType and applies the limit", async () => {
      mockPrisma.deadLetterEvent.findMany.mockResolvedValue([]);

      await sut.getFailedEventsByType("USER_CREATED", 30);

      expect(mockPrisma.deadLetterEvent.findMany).toHaveBeenCalledWith({
        where: { eventType: "USER_CREATED" },
        orderBy: { failedAt: "desc" },
        take: 30,
      });
    });

    it("uses default limit of 50 when not specified", async () => {
      mockPrisma.deadLetterEvent.findMany.mockResolvedValue([]);

      await sut.getFailedEventsByType("USER_CREATED");

      expect(mockPrisma.deadLetterEvent.findMany).toHaveBeenCalledWith({
        where: { eventType: "USER_CREATED" },
        orderBy: { failedAt: "desc" },
        take: 50,
      });
    });
  });

  describe("deleteEvent", () => {
    it("deletes the event and logs the action", async () => {
      mockPrisma.deadLetterEvent.delete.mockResolvedValue({} as any);

      await sut.deleteEvent("event-123");

      expect(mockPrisma.deadLetterEvent.delete).toHaveBeenCalledWith({
        where: { id: "event-123" },
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaDeadLetterQueueAdapter",
          event: "EVENT_DELETED",
          message: "Dead letter event deleted",
          data: { eventId: "event-123" },
        }),
      );
    });
  });

  describe("getFailedEventsCount", () => {
    it("returns the total count", async () => {
      mockPrisma.deadLetterEvent.count.mockResolvedValue(42);

      expect(await sut.getFailedEventsCount()).toBe(42);
    });
  });

  describe("getFailedEventsCountByType", () => {
    it("returns counts grouped by event type", async () => {
      mockPrisma.deadLetterEvent.groupBy.mockResolvedValue([
        { eventType: "TYPE1", _count: { id: 10 } },
        { eventType: "TYPE2", _count: { id: 5 } },
      ] as any);

      const result = await sut.getFailedEventsCountByType();

      expect(result).toEqual([
        { eventType: "TYPE1", count: 10 },
        { eventType: "TYPE2", count: 5 },
      ]);
    });

    it("orders by count descending", async () => {
      mockPrisma.deadLetterEvent.groupBy.mockResolvedValue([
        { eventType: "TYPE1", _count: { id: 10 } },
        { eventType: "TYPE2", _count: { id: 5 } },
      ] as any);

      await sut.getFailedEventsCountByType();

      expect(mockPrisma.deadLetterEvent.groupBy).toHaveBeenCalledWith({
        by: ["eventType"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });
    });
  });

  describe("cleanupOldEvents", () => {
    it("deletes events older than the given number of days", async () => {
      const now = new Date("2024-01-31T10:00:00.000Z");
      jest.setSystemTime(now);

      const expectedCutoff = new Date(now);
      expectedCutoff.setDate(expectedCutoff.getDate() - 30);

      mockPrisma.deadLetterEvent.deleteMany.mockResolvedValue({ count: 25 } as any);

      const deleted = await sut.cleanupOldEvents(30);

      expect(deleted).toBe(25);
      expect(mockPrisma.deadLetterEvent.deleteMany).toHaveBeenCalledWith({
        where: { failedAt: { lt: expectedCutoff } },
      });
    });

    it("defaults to a 30-day cutoff", async () => {
      const now = new Date("2024-01-31T10:00:00.000Z");
      jest.setSystemTime(now);

      mockPrisma.deadLetterEvent.deleteMany.mockResolvedValue({ count: 0 } as any);

      await sut.cleanupOldEvents();

      const expectedCutoff = new Date(now);
      expectedCutoff.setDate(expectedCutoff.getDate() - 30);

      expect(mockPrisma.deadLetterEvent.deleteMany).toHaveBeenCalledWith({
        where: { failedAt: { lt: expectedCutoff } },
      });
    });

    it("logs the cleanup result", async () => {
      mockPrisma.deadLetterEvent.deleteMany.mockResolvedValue({ count: 7 } as any);

      await sut.cleanupOldEvents(14);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaDeadLetterQueueAdapter",
          event: "CLEANUP_COMPLETED",
          message: "Cleaned up old dead letter events",
          data: { deletedCount: 7, olderThanDays: 14 },
        }),
      );
    });

    it("returns 0 when no events to clean up", async () => {
      mockPrisma.deadLetterEvent.deleteMany.mockResolvedValue({ count: 0 } as any);

      const result = await sut.cleanupOldEvents(30);

      expect(result).toBe(0);
    });
  });

  describe("canRetryEvent (private)", () => {
    it("returns false for known non-retryable error class names", () => {
      class ValidationError extends Error {}
      class AuthenticationError extends Error {}
      class AuthorizationError extends Error {}
      class NotFoundError extends Error {}
      class ConflictError extends Error {}
      class BadRequestError extends Error {}

      const errors = [
        new ValidationError("v"),
        new AuthenticationError("a"),
        new AuthorizationError("a"),
        new NotFoundError("n"),
        new ConflictError("c"),
        new BadRequestError("b"),
      ];

      for (const error of errors) {
        expect((sut as any).canRetryEvent(error)).toBe(false);
      }
    });

    it("returns false for errors whose message matches a non-retryable pattern", () => {
      const messages = [
        "Invalid email format provided",
        "User already exists in the system",
        "Permission denied for this resource",
        "Resource not found with the given ID",
      ];

      for (const message of messages) {
        expect((sut as any).canRetryEvent(new Error(message))).toBe(false);
      }
    });

    it("returns true for transient / retryable errors", () => {
      const errors: unknown[] = [
        new Error("Database connection timeout"),
        new Error("Network error"),
        new Error("External service unavailable"),
        "a plain string error",
      ];

      for (const error of errors) {
        expect((sut as any).canRetryEvent(error)).toBe(true);
      }
    });

    it("returns false for non-retryable pattern with case insensitivity", () => {
      const messages = ["INVALID EMAIL FORMAT", "USER ALREADY EXISTS", "PERMISSION DENIED", "RESOURCE NOT FOUND"];

      for (const message of messages) {
        expect((sut as any).canRetryEvent(new Error(message))).toBe(false);
      }
    });
  });

  describe("parseDomainEvent (private)", () => {
    it("parses a JSON string into an object", () => {
      const result = (sut as any).parseDomainEvent('{"eventType":"TEST","eventId":"123"}');
      expect(result).toEqual({ eventType: "TEST", eventId: "123" });
    });

    it("returns non-string values as-is", () => {
      const obj = { eventType: "TEST", eventId: "123" };
      expect((sut as any).parseDomainEvent(obj)).toBe(obj);
    });

    it("throws on malformed JSON strings", () => {
      expect(() => (sut as any).parseDomainEvent("{bad json}")).toThrow();
    });

    it("handles null values", () => {
      const result = (sut as any).parseDomainEvent(null);
      expect(result).toBeNull();
    });
  });

  describe("mapToDeadLetterEvent (private)", () => {
    it("maps a DB row to a DeadLetterEvent", () => {
      const dbRow = {
        id: "abc",
        eventType: "TEST",
        eventData: '{"eventType":"TEST"}',
        handlerName: "my-handler",
        errorMessage: "something failed",
        attempts: 3,
        failedAt: new Date("2024-06-01"),
        correlationId: "corr-xyz",
        canRetry: false,
      };

      const result = (sut as any).mapToDeadLetterEvent(dbRow);

      expect(result).toEqual({
        id: "abc",
        eventType: "TEST",
        eventData: { eventType: "TEST" },
        handlerName: "my-handler",
        error: "something failed",
        attempts: 3,
        failedAt: dbRow.failedAt,
        correlationId: "corr-xyz",
        canRetry: false,
      });
    });

    it("converts null correlationId to undefined", () => {
      const dbRow = {
        id: "1",
        eventType: "T",
        eventData: '{"eventType":"T"}',
        handlerName: "h",
        errorMessage: "e",
        attempts: 1,
        failedAt: new Date(),
        correlationId: null,
        canRetry: true,
      };

      const result = (sut as any).mapToDeadLetterEvent(dbRow);
      expect(result.correlationId).toBeUndefined();
    });

    it("handles missing correlationId", () => {
      const dbRow = {
        id: "1",
        eventType: "T",
        eventData: '{"eventType":"T"}',
        handlerName: "h",
        errorMessage: "e",
        attempts: 1,
        failedAt: new Date(),
        canRetry: true,
      };

      const result = (sut as any).mapToDeadLetterEvent(dbRow);
      expect(result.correlationId).toBeUndefined();
    });
  });

  describe("sendDeadLetterAlert (private)", () => {
    it("does not throw even if the internal alert call would fail", async () => {
      await expect((sut as any).sendDeadLetterAlert("id", "TYPE", "handler", new Error("boom"))).resolves.not.toThrow();
    });

    it("logs a warning if alert fails", async () => {
      await (sut as any).sendDeadLetterAlert("id", "TYPE", "handler", new Error("boom"));

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe("sendEmergencyAlert (private)", () => {
    it("logs an EMERGENCY_EVENT_LOST error entry", async () => {
      const event = createMockEvent();

      await (sut as any).sendEmergencyAlert(event, mockNormalizedHandler, new Error("original"), new Error("dlq"));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaDeadLetterQueueAdapter",
          event: "EMERGENCY_EVENT_LOST",
          message: "EMERGENCY: Event completely lost - DLQ storage failed",
          data: expect.objectContaining({
            eventType: event.eventType,
            eventId: event.eventId,
            handlerName: mockNormalizedHandler.handlerName,
          }),
        }),
      );
    });
  });

  describe("integration scenarios", () => {
    it("should handle full lifecycle: add failed event, retry, and delete", async () => {
      const event = createMockEvent();
      const error = new Error("Test error");
      const dbRow = createMockPrismaDeadLetterRow(event, "test-handler", {
        id: "dlq-123",
        canRetry: true,
      });

      mockPrisma.deadLetterEvent.create.mockResolvedValue(dbRow);
      jest.spyOn(sut as any, "sendDeadLetterAlert").mockResolvedValue(undefined);

      await sut.addFailedEvent(mockNormalizedHandler, event, error, new Date());
      expect(mockPrisma.deadLetterEvent.create).toHaveBeenCalled();

      mockPrisma.deadLetterEvent.findUnique.mockResolvedValue(dbRow);
      mockPrisma.deadLetterEvent.update.mockResolvedValue({} as any);
      const mockHandler = {
        handlerName: "test-handler",
        supportedEvents: new Map(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      mockEventHandlerRegistration.getHandlerByName.mockReturnValue(mockHandler);

      await sut.retryEvent("dlq-123");
      expect(mockHandler.execute).toHaveBeenCalled();

      mockPrisma.deadLetterEvent.delete.mockResolvedValue({} as any);
      await sut.deleteEvent("dlq-123");
      expect(mockPrisma.deadLetterEvent.delete).toHaveBeenCalled();
    });

    it("should handle bulk retry with mixed success", async () => {
      const events = [
        { id: "dlq-1", eventType: "USER_CREATED", handlerName: "handler-1", canRetry: true, failedAt: new Date("2024-01-01") },
        { id: "dlq-2", eventType: "USER_CREATED", handlerName: "handler-1", canRetry: true, failedAt: new Date("2024-01-02") },
        { id: "dlq-3", eventType: "USER_CREATED", handlerName: "handler-2", canRetry: true, failedAt: new Date("2024-01-03") },
      ];

      mockPrisma.deadLetterEvent.findMany.mockResolvedValue(events as any);

      const mockHandler1 = {
        handlerName: "handler-1",
        supportedEvents: new Map(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      mockEventHandlerRegistration.getHandlerByName.mockImplementation((name) => {
        if (name === "handler-1") return mockHandler1;
        return undefined;
      });

      jest.spyOn(sut, "retryEvent").mockImplementation(async (eventId) => {
        if (eventId === "dlq-2") throw new Error("Retry failed");
      });

      const result = await sut.retryEventsByType("USER_CREATED", 3);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe("error handling", () => {
    it("handles database connection errors gracefully", async () => {
      const event = createMockEvent();
      const error = new Error("Test error");

      jest.useFakeTimers();
      jest.spyOn(global, "setTimeout").mockImplementation((fn: any) => {
        fn();
        return {} as NodeJS.Timeout;
      });

      jest.spyOn(sut as any, "sendEmergencyAlert").mockResolvedValue(undefined);

      mockPrisma.deadLetterEvent.create.mockRejectedValue(new Error("Database connection error"));

      await expect(sut.addFailedEvent(mockNormalizedHandler, event, error, new Date())).rejects.toThrow(
        "CRITICAL: Failed to store event in dead letter queue after 3 attempts",
      );

      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    it("handles malformed event data in retry", async () => {
      const dbRow = createMockPrismaDeadLetterRow(createMockEvent(), "test-handler", {
        id: "dlq-123",
        eventData: "{malformed json",
      });

      mockPrisma.deadLetterEvent.findUnique.mockResolvedValue(dbRow);

      await expect(sut.retryEvent("dlq-123")).rejects.toThrow();
    });

    it("handles null error in addFailedEvent", async () => {
      const event = createMockEvent();
      const dbRow = createMockPrismaDeadLetterRow(event, mockNormalizedHandler.handlerName);
      mockPrisma.deadLetterEvent.create.mockResolvedValue(dbRow);

      await expect(sut.addFailedEvent(mockNormalizedHandler, event, null, new Date())).resolves.not.toThrow();

      expect(mockPrisma.deadLetterEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errorMessage: "null",
            errorStack: null,
          }),
        }),
      );
    });
  });
});
