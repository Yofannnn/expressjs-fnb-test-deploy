import { EventBusAdapter } from "@/infrastructure/events/event-bus.adapter";
import { EventDispatcher } from "@/application/ports/driven/event-dispatcher";
import { EventHandlerRegistration } from "@/application/ports/driven/event-handler-registration";
import { IdGenerator } from "@/application/ports/driven/id-generator";
import { DomainEventType } from "@/domain/types/domain-event-type.enum";
import { DomainEvent } from "@/domain/types/domain-event.interface";
import { EventHandler, NormalizedEventHandler } from "@/application/ports/driven/event-handler";
import { EventExecutionStrategy } from "@/application/ports/driven/event-dispatcher";

describe("EventBusAdapter", () => {
  let eventBus: EventBusAdapter;
  let mockDispatcher: jest.Mocked<EventDispatcher>;
  let mockRegistrator: jest.Mocked<EventHandlerRegistration>;
  let mockIdGenerator: jest.Mocked<IdGenerator>;
  let mockDomainEvent: DomainEvent;

  beforeEach(() => {
    mockDispatcher = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      dispatchSingle: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
    };

    mockRegistrator = {
      handlers: new Map<DomainEventType, NormalizedEventHandler[]>(),
      registerHandler: jest.fn(),
      getHandlersForEvent: jest.fn(),
      getHandlerByName: jest.fn(),
      unregisterHandler: jest.fn(),
      isHandlerRegistered: jest.fn(),
    };

    mockIdGenerator = {
      generate: jest.fn().mockReturnValue("mock-uuid-123"),
    };

    eventBus = new EventBusAdapter(mockDispatcher, mockRegistrator, mockIdGenerator);

    mockDomainEvent = {
      aggregateId: "agg-123",
      eventType: DomainEventType.USER_CREATED,
      occurredOn: new Date("2024-01-01T00:00:00Z"),
      payload: { key: "value" },
      version: 1,
    };

    jest.clearAllMocks();
  });

  describe("publish", () => {
    it("should enrich and dispatch a single event successfully", async () => {
      await eventBus.publish(mockDomainEvent);

      expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
      expect(mockDispatcher.dispatchSingle).toHaveBeenCalledTimes(1);
      expect(mockDispatcher.dispatchSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockDomainEvent,
          eventId: "mock-uuid-123",
          processingMetadata: expect.objectContaining({
            processingId: "mock-uuid-123",
            retryCount: 0,
            enqueuedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should handle errors when dispatching a single event fails", async () => {
      const error = new Error("Dispatch failed");
      mockDispatcher.dispatchSingle.mockRejectedValue(error);

      await expect(eventBus.publish(mockDomainEvent)).rejects.toThrow("Dispatch failed");
      expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
      expect(mockDispatcher.dispatchSingle).toHaveBeenCalledTimes(1);
    });

    it("should preserve original event properties during enrichment", async () => {
      const customEvent: DomainEvent = {
        aggregateId: "custom-agg",
        eventType: DomainEventType.USER_LOGGED_IN,
        occurredOn: new Date("2024-02-01T00:00:00Z"),
        payload: { custom: "data", nested: { value: 123 } },
        version: 2,
      };

      await eventBus.publish(customEvent);

      expect(mockDispatcher.dispatchSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: "custom-agg",
          eventType: DomainEventType.USER_LOGGED_IN,
          occurredOn: customEvent.occurredOn,
          payload: { custom: "data", nested: { value: 123 } },
          version: 2,
        }),
      );
    });

    it("should include enqueuedAt in processing metadata", async () => {
      const before = new Date();
      await eventBus.publish(mockDomainEvent);
      const after = new Date();

      const callArg = mockDispatcher.dispatchSingle.mock.calls[0][0];
      expect(callArg.processingMetadata.enqueuedAt).toBeInstanceOf(Date);
      expect(callArg.processingMetadata.enqueuedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(callArg.processingMetadata.enqueuedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("publishAll", () => {
    it("should enrich and dispatch multiple events successfully", async () => {
      const events: DomainEvent[] = [
        mockDomainEvent,
        {
          aggregateId: "agg-456",
          eventType: DomainEventType.USER_LOGGED_IN,
          occurredOn: new Date("2024-01-01T00:00:00Z"),
          payload: { key2: "value2" },
          version: 1,
        },
      ];

      await eventBus.publishAll(events);

      expect(mockIdGenerator.generate).toHaveBeenCalledTimes(4);
      expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
      const dispatchedEvents = mockDispatcher.dispatch.mock.calls[0][0];
      expect(dispatchedEvents).toHaveLength(2);
      expect(dispatchedEvents[0]).toMatchObject({
        ...mockDomainEvent,
        eventId: "mock-uuid-123",
        processingMetadata: expect.objectContaining({
          processingId: "mock-uuid-123",
          retryCount: 0,
          enqueuedAt: expect.any(Date),
        }),
      });
      expect(dispatchedEvents[1]).toMatchObject({
        aggregateId: "agg-456",
        eventType: DomainEventType.USER_LOGGED_IN,
        eventId: "mock-uuid-123",
        processingMetadata: expect.objectContaining({
          processingId: "mock-uuid-123",
          retryCount: 0,
          enqueuedAt: expect.any(Date),
        }),
      });
    });

    it("should handle empty events array", async () => {
      const emptyEvents: DomainEvent[] = [];

      await eventBus.publishAll(emptyEvents);

      expect(mockIdGenerator.generate).toHaveBeenCalledTimes(0);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith([]);
    });

    it("should handle errors when dispatching multiple events fails", async () => {
      const events: DomainEvent[] = [mockDomainEvent];
      const error = new Error("Batch dispatch failed");
      mockDispatcher.dispatch.mockRejectedValue(error);

      await expect(eventBus.publishAll(events)).rejects.toThrow("Batch dispatch failed");
      expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
      expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
    });

    it("should preserve all event properties during enrichment", async () => {
      const events: DomainEvent[] = [
        {
          aggregateId: "agg-1",
          eventType: DomainEventType.USER_CREATED,
          occurredOn: new Date("2024-01-01T00:00:00Z"),
          payload: { type: "create" },
          version: 1,
        },
        {
          aggregateId: "agg-2",
          eventType: DomainEventType.USER_PROFILE_UPDATED,
          occurredOn: new Date("2024-01-01T00:00:00Z"),
          payload: { type: "update" },
          version: 2,
        },
      ];

      await eventBus.publishAll(events);

      const dispatchedEvents = mockDispatcher.dispatch.mock.calls[0][0];
      expect(dispatchedEvents[0]).toMatchObject(events[0]);
      expect(dispatchedEvents[1]).toMatchObject(events[1]);
    });

    it("should generate unique IDs for each event", async () => {
      const events: DomainEvent[] = [
        mockDomainEvent,
        {
          aggregateId: "agg-456",
          eventType: DomainEventType.USER_LOGGED_IN,
          occurredOn: new Date(),
          payload: {},
          version: 1,
        },
        {
          aggregateId: "agg-789",
          eventType: DomainEventType.USER_ACTIVATED,
          occurredOn: new Date(),
          payload: {},
          version: 1,
        },
      ];

      await eventBus.publishAll(events);

      const dispatchedEvents = mockDispatcher.dispatch.mock.calls[0][0];
      expect(dispatchedEvents[0].eventId).toBe("mock-uuid-123");
      expect(dispatchedEvents[1].eventId).toBe("mock-uuid-123");
      expect(dispatchedEvents[2].eventId).toBe("mock-uuid-123");
      expect(dispatchedEvents[0].processingMetadata.processingId).toBe("mock-uuid-123");
      expect(dispatchedEvents[1].processingMetadata.processingId).toBe("mock-uuid-123");
      expect(dispatchedEvents[2].processingMetadata.processingId).toBe("mock-uuid-123");
    });

    it("should handle events with null values in metadata", async () => {
      const events: DomainEvent[] = [
        {
          aggregateId: "agg-1",
          eventType: DomainEventType.USER_CREATED,
          occurredOn: new Date(),
          payload: { key: null, nested: { value: null } },
          version: 1,
        },
      ];

      await eventBus.publishAll(events);

      const dispatchedEvents = mockDispatcher.dispatch.mock.calls[0][0];
      expect(dispatchedEvents[0].payload).toEqual({ key: null, nested: { value: null } });
    });
  });

  describe("subscribe", () => {
    it("should register a handler successfully", () => {
      const mockHandler: EventHandler = {
        handlerName: "TestHandler",
        supportedEvents: new Map([
          [
            DomainEventType.USER_CREATED,
            {
              priority: 1,
              strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
            },
          ],
        ]),
        execute: jest.fn(),
      };

      eventBus.subscribe(mockHandler);

      expect(mockRegistrator.registerHandler).toHaveBeenCalledTimes(1);
      expect(mockRegistrator.registerHandler).toHaveBeenCalledWith(mockHandler);
    });

    it("should handle handler registration with multiple supported events", () => {
      const mockHandler: EventHandler = {
        handlerName: "MultiEventHandler",
        supportedEvents: new Map([
          [
            DomainEventType.USER_CREATED,
            {
              priority: 1,
              strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
            },
          ],
          [
            DomainEventType.USER_LOGGED_IN,
            {
              priority: 2,
              strategy: EventExecutionStrategy.QUEUED_BATCH,
            },
          ],
          [
            DomainEventType.USER_ACTIVATED,
            {
              priority: 3,
              strategy: EventExecutionStrategy.DELAYED,
              delayMs: 1000,
            },
          ],
        ]),
        execute: jest.fn(),
      };

      eventBus.subscribe(mockHandler);

      expect(mockRegistrator.registerHandler).toHaveBeenCalledWith(mockHandler);
    });

    it("should handle handler with retryAttempts configuration", () => {
      const mockHandler: EventHandler = {
        handlerName: "RetryHandler",
        supportedEvents: new Map([
          [
            DomainEventType.USER_CREATED,
            {
              priority: 1,
              strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
              retryAttempts: 3,
              timeoutMs: 5000,
            },
          ],
        ]),
        execute: jest.fn(),
      };

      eventBus.subscribe(mockHandler);

      expect(mockRegistrator.registerHandler).toHaveBeenCalledWith(mockHandler);
    });
  });

  describe("unsubscribe", () => {
    it("should unregister a handler by name successfully", () => {
      const handlerName = "TestHandler";
      mockRegistrator.unregisterHandler.mockReturnValue(true);

      const mockHandler: EventHandler = {
        handlerName,
        supportedEvents: new Map(),
        execute: jest.fn(),
      };
      eventBus.unsubscribe(mockHandler);

      expect(mockRegistrator.unregisterHandler).toHaveBeenCalledTimes(1);
      expect(mockRegistrator.unregisterHandler).toHaveBeenCalledWith(handlerName);
    });

    it("should handle unregistering non-existent handler gracefully", () => {
      const handlerName = "NonExistentHandler";
      mockRegistrator.unregisterHandler.mockReturnValue(false);

      const mockHandler: EventHandler = {
        handlerName,
        supportedEvents: new Map(),
        execute: jest.fn(),
      };
      eventBus.unsubscribe(mockHandler);

      expect(mockRegistrator.unregisterHandler).toHaveBeenCalledWith(handlerName);
      expect(mockRegistrator.unregisterHandler).toHaveReturnedWith(false);
    });

    it("should call unregisterHandler with the correct handler name", () => {
      const mockHandler: EventHandler = {
        handlerName: "SpecificHandler",
        supportedEvents: new Map(),
        execute: jest.fn(),
      };

      eventBus.unsubscribe(mockHandler);

      expect(mockRegistrator.unregisterHandler).toHaveBeenCalledWith("SpecificHandler");
    });
  });

  describe("getSubscribers", () => {
    it("should return handlers for a specific event type", () => {
      const eventType = DomainEventType.USER_CREATED;
      const expectedHandlers: NormalizedEventHandler[] = [
        {
          eventType: DomainEventType.USER_CREATED,
          handlerName: "Handler1",
          options: {
            priority: 1,
            strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          },
          handler: jest.fn(),
          registeredAt: new Date(),
        },
        {
          eventType: DomainEventType.USER_CREATED,
          handlerName: "Handler2",
          options: {
            priority: 2,
            strategy: EventExecutionStrategy.QUEUED_BATCH,
          },
          handler: jest.fn(),
          registeredAt: new Date(),
        },
      ];
      mockRegistrator.getHandlersForEvent.mockReturnValue(expectedHandlers);

      const result = eventBus.getSubscribers(eventType);

      expect(mockRegistrator.getHandlersForEvent).toHaveBeenCalledTimes(1);
      expect(mockRegistrator.getHandlersForEvent).toHaveBeenCalledWith(eventType);
      expect(result).toBe(expectedHandlers);
    });

    it("should return empty array when no handlers are registered for event type", () => {
      const eventType = DomainEventType.USER_SUSPENDED;
      mockRegistrator.getHandlersForEvent.mockReturnValue([]);

      const result = eventBus.getSubscribers(eventType);

      expect(result).toEqual([]);
      expect(mockRegistrator.getHandlersForEvent).toHaveBeenCalledWith(eventType);
    });

    it("should handle undefined result from registrator by returning empty array", () => {
      const eventType = DomainEventType.USER_BANNED;
      mockRegistrator.getHandlersForEvent.mockReturnValue(undefined as unknown as NormalizedEventHandler[]);

      const result = eventBus.getSubscribers(eventType);

      expect(result).toEqual([]);
      expect(mockRegistrator.getHandlersForEvent).toHaveBeenCalledWith(eventType);
    });

    it("should return handlers with correct structure", () => {
      const eventType = DomainEventType.USER_EMAIL_VERIFIED;
      const mockDate = new Date("2024-01-01T00:00:00Z");
      const handlers: NormalizedEventHandler[] = [
        {
          eventType: DomainEventType.USER_EMAIL_VERIFIED,
          handlerName: "EmailVerificationHandler",
          options: {
            priority: 5,
            strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
            retryAttempts: 3,
            timeoutMs: 5000,
          },
          handler: jest.fn(),
          registeredAt: mockDate,
        },
      ];
      mockRegistrator.getHandlersForEvent.mockReturnValue(handlers);

      const result = eventBus.getSubscribers(eventType);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        eventType: DomainEventType.USER_EMAIL_VERIFIED,
        handlerName: "EmailVerificationHandler",
        options: {
          priority: 5,
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
          retryAttempts: 3,
          timeoutMs: 5000,
        },
        registeredAt: mockDate,
      });
      expect(typeof result[0].handler).toBe("function");
    });
  });

  describe("integration scenarios", () => {
    it("should handle publish and getSubscribers workflow", async () => {
      const mockHandler: EventHandler = {
        handlerName: "UserCreatedHandler",
        supportedEvents: new Map([
          [
            DomainEventType.USER_CREATED,
            {
              priority: 1,
              strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
            },
          ],
        ]),
        execute: jest.fn(),
      };

      const normalizedHandler: NormalizedEventHandler = {
        eventType: DomainEventType.USER_CREATED,
        handlerName: "UserCreatedHandler",
        options: {
          priority: 1,
          strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
        },
        handler: jest.fn(),
        registeredAt: new Date(),
      };

      mockRegistrator.getHandlersForEvent.mockReturnValue([normalizedHandler]);
      mockDispatcher.dispatchSingle.mockResolvedValue(undefined);

      eventBus.subscribe(mockHandler);
      const subscribers = eventBus.getSubscribers(DomainEventType.USER_CREATED);
      await eventBus.publish(mockDomainEvent);

      expect(mockRegistrator.registerHandler).toHaveBeenCalledWith(mockHandler);
      expect(mockRegistrator.getHandlersForEvent).toHaveBeenCalledWith(DomainEventType.USER_CREATED);
      expect(subscribers).toHaveLength(1);
      expect(mockDispatcher.dispatchSingle).toHaveBeenCalled();
    });

    it("should handle publishAll and unsubscribe workflow", async () => {
      const mockHandler: EventHandler = {
        handlerName: "BatchHandler",
        supportedEvents: new Map([
          [
            DomainEventType.USER_LOGGED_IN,
            {
              priority: 1,
              strategy: EventExecutionStrategy.QUEUED_BATCH,
            },
          ],
        ]),
        execute: jest.fn(),
      };

      const events: DomainEvent[] = [
        {
          aggregateId: "agg-1",
          eventType: DomainEventType.USER_LOGGED_IN,
          occurredOn: new Date(),
          payload: {},
          version: 1,
        },
      ];

      mockDispatcher.dispatch.mockResolvedValue(undefined);

      eventBus.subscribe(mockHandler);
      await eventBus.publishAll(events);
      eventBus.unsubscribe(mockHandler);

      expect(mockRegistrator.registerHandler).toHaveBeenCalledWith(mockHandler);
      expect(mockDispatcher.dispatch).toHaveBeenCalled();
      expect(mockRegistrator.unregisterHandler).toHaveBeenCalledWith("BatchHandler");
    });

    it("should maintain independence between multiple event publishers", async () => {
      const events: DomainEvent[] = [
        {
          aggregateId: "agg-1",
          eventType: DomainEventType.USER_CREATED,
          occurredOn: new Date(),
          payload: { order: 1 },
          version: 1,
        },
        {
          aggregateId: "agg-2",
          eventType: DomainEventType.USER_LOGGED_IN,
          occurredOn: new Date(),
          payload: { order: 2 },
          version: 1,
        },
      ];

      mockDispatcher.dispatch.mockResolvedValue(undefined);
      mockDispatcher.dispatchSingle.mockResolvedValue(undefined);

      await eventBus.publish(events[0]);
      await eventBus.publishAll([events[1]]);

      expect(mockDispatcher.dispatchSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: "agg-1",
          eventType: DomainEventType.USER_CREATED,
        }),
      );
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            aggregateId: "agg-2",
            eventType: DomainEventType.USER_LOGGED_IN,
          }),
        ]),
      );
    });

    it("should handle multiple subscribers for same event type", async () => {
      const handler1: EventHandler = {
        handlerName: "Handler1",
        supportedEvents: new Map([
          [
            DomainEventType.USER_CREATED,
            {
              priority: 1,
              strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
            },
          ],
        ]),
        execute: jest.fn(),
      };

      const handler2: EventHandler = {
        handlerName: "Handler2",
        supportedEvents: new Map([
          [
            DomainEventType.USER_CREATED,
            {
              priority: 2,
              strategy: EventExecutionStrategy.QUEUED_BATCH,
            },
          ],
        ]),
        execute: jest.fn(),
      };

      const normalizedHandlers: NormalizedEventHandler[] = [
        {
          eventType: DomainEventType.USER_CREATED,
          handlerName: "Handler1",
          options: { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL },
          handler: jest.fn(),
          registeredAt: new Date(),
        },
        {
          eventType: DomainEventType.USER_CREATED,
          handlerName: "Handler2",
          options: { priority: 2, strategy: EventExecutionStrategy.QUEUED_BATCH },
          handler: jest.fn(),
          registeredAt: new Date(),
        },
      ];

      mockRegistrator.getHandlersForEvent.mockReturnValue(normalizedHandlers);

      eventBus.subscribe(handler1);
      eventBus.subscribe(handler2);

      const subscribers = eventBus.getSubscribers(DomainEventType.USER_CREATED);

      expect(subscribers).toHaveLength(2);
      expect(mockRegistrator.registerHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("should handle dispatcher destroy gracefully", () => {
      eventBus["dispatcher"].destroy();

      expect(mockDispatcher.destroy).toHaveBeenCalledTimes(1);
    });

    it("should handle IdGenerator errors during publish", async () => {
      mockIdGenerator.generate.mockImplementation(() => {
        throw new Error("ID generation failed");
      });

      await expect(eventBus.publish(mockDomainEvent)).rejects.toThrow("ID generation failed");
      expect(mockDispatcher.dispatchSingle).not.toHaveBeenCalled();
    });

    it("should handle IdGenerator errors during publishAll", async () => {
      mockIdGenerator.generate.mockImplementation(() => {
        throw new Error("ID generation failed");
      });

      const events: DomainEvent[] = [mockDomainEvent];
      await expect(eventBus.publishAll(events)).rejects.toThrow("ID generation failed");
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
    });

    it("should handle undefined handler in unsubscribe", () => {
      expect(() => eventBus.unsubscribe(undefined as unknown as EventHandler)).toThrow("Cannot read properties of undefined");
    });
  });

  describe("edge cases", () => {
    it("should handle events with very large metadata", async () => {
      const largeMetadata: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`;
      }

      const event: DomainEvent = {
        aggregateId: "agg-1",
        eventType: DomainEventType.USER_CREATED,
        occurredOn: new Date(),
        payload: largeMetadata,
        version: 1,
      };

      await eventBus.publish(event);

      expect(mockDispatcher.dispatchSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: largeMetadata,
        }),
      );
    });

    it("should handle events with nested metadata objects", async () => {
      const event: DomainEvent = {
        aggregateId: "agg-1",
        eventType: DomainEventType.USER_CREATED,
        occurredOn: new Date(),
        payload: {
          user: {
            id: "user-123",
            profile: {
              name: "John Doe",
              settings: {
                theme: "dark",
                notifications: true,
              },
            },
          },
          session: {
            id: "session-456",
            device: "mobile",
          },
        },
        version: 1,
      };

      await eventBus.publish(event);

      expect(mockDispatcher.dispatchSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: event.payload,
        }),
      );
    });

    it("should handle publishAll with mixed event types", async () => {
      const events: DomainEvent[] = [
        {
          aggregateId: "agg-1",
          eventType: DomainEventType.USER_CREATED,
          occurredOn: new Date(),
          payload: { type: "create" },
          version: 1,
        },
        {
          aggregateId: "agg-2",
          eventType: DomainEventType.USER_LOGGED_IN,
          occurredOn: new Date(),
          payload: { type: "login" },
          version: 1,
        },
        {
          aggregateId: "agg-3",
          eventType: DomainEventType.USER_LOGGED_OUT,
          occurredOn: new Date(),
          payload: { type: "logout" },
          version: 1,
        },
      ];

      await eventBus.publishAll(events);

      const dispatchedEvents = mockDispatcher.dispatch.mock.calls[0][0];
      expect(dispatchedEvents).toHaveLength(3);
      expect(dispatchedEvents[0].eventType).toBe(DomainEventType.USER_CREATED);
      expect(dispatchedEvents[1].eventType).toBe(DomainEventType.USER_LOGGED_IN);
      expect(dispatchedEvents[2].eventType).toBe(DomainEventType.USER_LOGGED_OUT);
    });

    it("should handle multiple subscribe/unsubscribe cycles", () => {
      const mockHandler: EventHandler = {
        handlerName: "CyclicHandler",
        supportedEvents: new Map([
          [
            DomainEventType.USER_CREATED,
            {
              priority: 1,
              strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
            },
          ],
        ]),
        execute: jest.fn(),
      };

      for (let i = 0; i < 5; i++) {
        eventBus.subscribe(mockHandler);
        eventBus.unsubscribe(mockHandler);
      }

      expect(mockRegistrator.registerHandler).toHaveBeenCalledTimes(5);
      expect(mockRegistrator.unregisterHandler).toHaveBeenCalledTimes(5);
    });
  });
});
