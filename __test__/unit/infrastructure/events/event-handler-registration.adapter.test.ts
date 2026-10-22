import { EventHandlerRegistrationAdapter } from "@/infrastructure/events/event-handler-registration.adapter";
import { EventHandler, EventHandlerConfig } from "@/application/ports/driven/event-handler";
import { Logger } from "@/application/ports/driven/logger";
import { DomainEventType } from "@/domain/types/domain-event-type.enum";
import { EventExecutionStrategy } from "@/application/ports/driven/event-dispatcher";
import { RecordUserActivityHandler } from "@/infrastructure/events/handlers/record-user-activity.handler";
import { SendEmailHandler } from "@/infrastructure/events/handlers/send-email.handler";
import { RevokeSessionsOnPasswordChangedHandler } from "@/infrastructure/events/handlers/revoke-sessions-on-password-changed.handler";

jest.mock("@/infrastructure/events/handlers/record-user-activity.handler");
jest.mock("@/infrastructure/events/handlers/send-email.handler");
jest.mock("@/infrastructure/events/handlers/revoke-sessions-on-password-changed.handler");

describe("EventHandlerRegistrationAdapter", () => {
  let registration: EventHandlerRegistrationAdapter;
  let mockLogger: jest.Mocked<Logger>;
  let mockRecordUserActivityHandler: jest.Mocked<RecordUserActivityHandler>;
  let mockSendEmailHandler: jest.Mocked<SendEmailHandler>;
  let mockRevokeSessionsOnPasswordChangedHandler: jest.Mocked<RevokeSessionsOnPasswordChangedHandler>;

  const createMockHandler = (name: string, supportedEvents: Map<DomainEventType, EventHandlerConfig>): jest.Mocked<EventHandler> => ({
    handlerName: name,
    supportedEvents,
    execute: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    const recordUserActivityEvents = new Map<DomainEventType, EventHandlerConfig>([
      [DomainEventType.USER_CREATED, { priority: 2, strategy: EventExecutionStrategy.QUEUED_BATCH, retryAttempts: 2 }],
      [DomainEventType.USER_ACTIVATED, { priority: 2, strategy: EventExecutionStrategy.QUEUED_BATCH, retryAttempts: 2 }],
      [DomainEventType.USER_LOGGED_IN, { priority: 2, strategy: EventExecutionStrategy.QUEUED_BATCH, retryAttempts: 2 }],
    ]);

    const sendEmailEvents = new Map<DomainEventType, EventHandlerConfig>([
      [DomainEventType.USER_EMAIL_VERIFIED, { priority: 4, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      [DomainEventType.USER_ACCOUNT_LOCKED, { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      [DomainEventType.PASSWORD_RESET_TOKEN_ISSUED, { priority: 2, strategy: EventExecutionStrategy.DELAYED, retryAttempts: 5 }],
    ]);

    const revokeSessionsEvents = new Map<DomainEventType, EventHandlerConfig>([
      [DomainEventType.PASSWORD_RESET_TOKEN_USED, { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
    ]);

    mockRecordUserActivityHandler = {
      handlerName: "RecordUserActivityHandler",
      supportedEvents: recordUserActivityEvents,
      execute: jest.fn(),
    } as unknown as jest.Mocked<RecordUserActivityHandler>;

    mockSendEmailHandler = {
      handlerName: "SendEmailHandler",
      supportedEvents: sendEmailEvents,
      execute: jest.fn(),
    } as unknown as jest.Mocked<SendEmailHandler>;

    mockRevokeSessionsOnPasswordChangedHandler = {
      handlerName: "RevokeSessionsOnPasswordChangedHandler",
      supportedEvents: revokeSessionsEvents,
      execute: jest.fn(),
    } as unknown as jest.Mocked<RevokeSessionsOnPasswordChangedHandler>;

    registration = new EventHandlerRegistrationAdapter(
      mockRecordUserActivityHandler,
      mockSendEmailHandler,
      mockRevokeSessionsOnPasswordChangedHandler,
      mockLogger,
    );
  });

  describe("Constructor", () => {
    it("should initialize successfully with all handlers", () => {
      expect(registration).toBeInstanceOf(EventHandlerRegistrationAdapter);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "INITIALIZATION_COMPLETE",
        message: "Successfully registered 3 handlers",
        data: { totalHandlers: 3 },
      });
    });

    it("should register all handlers on initialization", () => {
      const handlers = registration.handlers;

      const allEventTypes = [
        DomainEventType.USER_CREATED,
        DomainEventType.USER_ACTIVATED,
        DomainEventType.USER_LOGGED_IN,
        DomainEventType.USER_EMAIL_VERIFIED,
        DomainEventType.USER_ACCOUNT_LOCKED,
        DomainEventType.PASSWORD_RESET_TOKEN_ISSUED,
        DomainEventType.PASSWORD_RESET_TOKEN_USED,
      ];

      allEventTypes.forEach((eventType) => {
        expect(handlers.has(eventType)).toBe(true);
        const handlersForEvent = handlers.get(eventType);
        expect(handlersForEvent).toBeDefined();
        expect(handlersForEvent!.length).toBeGreaterThan(0);
      });
    });

    it("should log initialization failure and throw error", () => {
      const originalBuildHandlers = EventHandlerRegistrationAdapter.prototype["buildHandlers"];
      EventHandlerRegistrationAdapter.prototype["buildHandlers"] = jest.fn().mockImplementation(() => {
        throw new Error("Handler registration failed");
      });

      expect(() => {
        new EventHandlerRegistrationAdapter(
          mockRecordUserActivityHandler,
          mockSendEmailHandler,
          mockRevokeSessionsOnPasswordChangedHandler,
          mockLogger,
        );
      }).toThrow("Handler registration failed");

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "INITIALIZATION_FAILED",
        message: "Failed to initialize event handlers",
        data: { error: "Handler registration failed" },
      });

      EventHandlerRegistrationAdapter.prototype["buildHandlers"] = originalBuildHandlers;
    });

    it("should handle unknown error during initialization", () => {
      const originalBuildHandlers = EventHandlerRegistrationAdapter.prototype["buildHandlers"];
      EventHandlerRegistrationAdapter.prototype["buildHandlers"] = jest.fn().mockImplementation(() => {
        throw "String error";
      });

      expect(() => {
        new EventHandlerRegistrationAdapter(
          mockRecordUserActivityHandler,
          mockSendEmailHandler,
          mockRevokeSessionsOnPasswordChangedHandler,
          mockLogger,
        );
      }).toThrow("String error");

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "INITIALIZATION_FAILED",
        message: "Failed to initialize event handlers",
        data: { error: "Unknown error" },
      });

      EventHandlerRegistrationAdapter.prototype["buildHandlers"] = originalBuildHandlers;
    });
  });

  describe("registerHandler", () => {
    it("should register a new handler successfully", () => {
      const newHandlerEvents = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_BANNED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
        [DomainEventType.USER_SUSPENDED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);

      const newHandler = createMockHandler("NewTestHandler", newHandlerEvents);

      registration.registerHandler(newHandler);

      expect(registration.isHandlerRegistered("NewTestHandler")).toBe(true);
      expect(registration.getHandlerByName("NewTestHandler")).toBe(newHandler);
      expect(registration.handlers.has(DomainEventType.USER_BANNED)).toBe(true);
      expect(registration.handlers.has(DomainEventType.USER_SUSPENDED)).toBe(true);

      const bannedHandlers = registration.handlers.get(DomainEventType.USER_BANNED);
      expect(bannedHandlers).toBeDefined();
      expect(bannedHandlers!.length).toBe(1);
      expect(bannedHandlers![0].handlerName).toBe("NewTestHandler");

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "HANDLER_REGISTERED",
        message: "Registered handler NewTestHandler",
        data: {
          handlerName: "NewTestHandler",
          supportedEvents: [DomainEventType.USER_BANNED, DomainEventType.USER_SUSPENDED],
        },
      });
    });

    it("should throw error when registering duplicate handler", () => {
      const duplicateHandlerEvents = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_DEACTIVATED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);

      const duplicateHandler = createMockHandler("RecordUserActivityHandler", duplicateHandlerEvents);

      expect(() => {
        registration.registerHandler(duplicateHandler);
      }).toThrow("Handler with id RecordUserActivityHandler is already registered");

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "HANDLER_REGISTRATION_FAILED",
        message: "Failed to register handler: Handler with id RecordUserActivityHandler is already registered",
        data: { handlerName: "RecordUserActivityHandler" },
      });
    });

    it("should handle registration errors gracefully", () => {
      const errorHandler = {
        handlerName: "ErrorHandler",
        supportedEvents: null as unknown as Map<DomainEventType, EventHandlerConfig>,
        execute: jest.fn(),
      } as jest.Mocked<EventHandler>;

      expect(() => {
        registration.registerHandler(errorHandler);
      }).toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "HANDLER_REGISTRATION_FAILED",
        message: expect.stringContaining("Failed to register handler:"),
        data: { handlerName: "ErrorHandler" },
      });
    });
  });

  describe("unregisterHandler", () => {
    it("should unregister an existing handler successfully", () => {
      const result = registration.unregisterHandler("RecordUserActivityHandler");

      expect(result).toBe(true);
      expect(registration.isHandlerRegistered("RecordUserActivityHandler")).toBe(false);
      expect(registration.getHandlerByName("RecordUserActivityHandler")).toBeUndefined();
      expect(registration.handlers.has(DomainEventType.USER_CREATED)).toBe(false);
      expect(registration.handlers.has(DomainEventType.USER_ACTIVATED)).toBe(false);
      expect(registration.handlers.has(DomainEventType.USER_LOGGED_IN)).toBe(false);
      expect(registration.handlers.has(DomainEventType.USER_EMAIL_VERIFIED)).toBe(true);
      expect(registration.handlers.has(DomainEventType.PASSWORD_RESET_TOKEN_USED)).toBe(true);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "HANDLER_UNREGISTERED",
        message: "Unregistered handler RecordUserActivityHandler",
        data: {
          eventTypes: [DomainEventType.USER_CREATED, DomainEventType.USER_ACTIVATED, DomainEventType.USER_LOGGED_IN],
        },
      });
    });

    it("should return false when unregistering non-existent handler", () => {
      const result = registration.unregisterHandler("NonExistentHandler");

      expect(result).toBe(false);
      expect(mockLogger.debug).not.toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "HANDLER_UNREGISTERED",
        expect: expect.any(String),
      });
    });

    it("should remove event entry when no handlers remain for an event type", () => {
      const singleEvent = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_BANNED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);

      const singleHandler = createMockHandler("SingleEventHandler", singleEvent);
      registration.registerHandler(singleHandler);

      expect(registration.handlers.has(DomainEventType.USER_BANNED)).toBe(true);

      registration.unregisterHandler("SingleEventHandler");

      expect(registration.handlers.has(DomainEventType.USER_BANNED)).toBe(false);
    });
  });

  describe("getHandlersForEvent", () => {
    it("should return handlers for an existing event type", () => {
      const handlers = registration.getHandlersForEvent(DomainEventType.USER_CREATED);

      expect(handlers).toBeDefined();
      expect(handlers.length).toBe(1);
      expect(handlers[0].handlerName).toBe("RecordUserActivityHandler");
      expect(handlers[0].eventType).toBe(DomainEventType.USER_CREATED);
      expect(handlers[0].options).toEqual({
        priority: 2,
        strategy: EventExecutionStrategy.QUEUED_BATCH,
        retryAttempts: 2,
      });
      expect(handlers[0].registeredAt).toBeInstanceOf(Date);
    });

    it("should return handlers sorted by priority", () => {
      const additionalHandlerEvents = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_CREATED, { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 5 }],
      ]);

      const additionalHandler = createMockHandler("AdditionalHandler", additionalHandlerEvents);
      registration.registerHandler(additionalHandler);

      const handlers = registration.getHandlersForEvent(DomainEventType.USER_CREATED);

      expect(handlers.length).toBe(2);
      expect(handlers[0].handlerName).toBe("AdditionalHandler");
      expect(handlers[0].options.priority).toBe(1);
      expect(handlers[1].handlerName).toBe("RecordUserActivityHandler");
      expect(handlers[1].options.priority).toBe(2);
    });

    it("should return empty array for non-existent event type", () => {
      const handlers = registration.getHandlersForEvent(DomainEventType.SESSION_CREATED);
      expect(handlers).toEqual([]);
    });

    it("should return a copy of handlers array (not reference)", () => {
      const handlers1 = registration.getHandlersForEvent(DomainEventType.USER_CREATED);
      const handlers2 = registration.getHandlersForEvent(DomainEventType.USER_CREATED);

      expect(handlers1).not.toBe(handlers2);
      expect(handlers1).toEqual(handlers2);
    });
  });

  describe("getHandlerByName", () => {
    it("should return handler by name if registered", () => {
      const handler = registration.getHandlerByName("RecordUserActivityHandler");
      expect(handler).toBe(mockRecordUserActivityHandler);
    });

    it("should return undefined for non-registered handler", () => {
      const handler = registration.getHandlerByName("NonExistentHandler");
      expect(handler).toBeUndefined();
    });

    it("should return correct handler when multiple handlers are registered", () => {
      const handler = registration.getHandlerByName("SendEmailHandler");
      expect(handler).toBe(mockSendEmailHandler);

      const revokeHandler = registration.getHandlerByName("RevokeSessionsOnPasswordChangedHandler");
      expect(revokeHandler).toBe(mockRevokeSessionsOnPasswordChangedHandler);
    });
  });

  describe("isHandlerRegistered", () => {
    it("should return true for registered handler", () => {
      expect(registration.isHandlerRegistered("RecordUserActivityHandler")).toBe(true);
      expect(registration.isHandlerRegistered("SendEmailHandler")).toBe(true);
      expect(registration.isHandlerRegistered("RevokeSessionsOnPasswordChangedHandler")).toBe(true);
    });

    it("should return false for non-registered handler", () => {
      expect(registration.isHandlerRegistered("NonExistentHandler")).toBe(false);
    });

    it("should return false after handler is unregistered", () => {
      expect(registration.isHandlerRegistered("RecordUserActivityHandler")).toBe(true);

      registration.unregisterHandler("RecordUserActivityHandler");

      expect(registration.isHandlerRegistered("RecordUserActivityHandler")).toBe(false);
    });
  });

  describe("buildHandlers (private method)", () => {
    it("should return array of all handlers in correct order", () => {
      const buildHandlers = (registration as unknown as { buildHandlers: () => EventHandler[] }).buildHandlers.bind(registration);
      const handlers = buildHandlers();

      expect(handlers).toBeInstanceOf(Array);
      expect(handlers.length).toBe(3);
      expect(handlers[0]).toBe(mockRecordUserActivityHandler);
      expect(handlers[1]).toBe(mockSendEmailHandler);
      expect(handlers[2]).toBe(mockRevokeSessionsOnPasswordChangedHandler);
    });
  });

  describe("Handlers property", () => {
    it("should have correct structure for each event type", () => {
      const handlers = registration.handlers;
      const userCreatedHandlers = handlers.get(DomainEventType.USER_CREATED);
      expect(userCreatedHandlers).toBeDefined();
      expect(userCreatedHandlers!.length).toBe(1);

      const normalizedHandler = userCreatedHandlers![0];
      expect(normalizedHandler).toMatchObject({
        eventType: DomainEventType.USER_CREATED,
        handlerName: "RecordUserActivityHandler",
        options: {
          priority: 2,
          strategy: EventExecutionStrategy.QUEUED_BATCH,
          retryAttempts: 2,
        },
      });

      expect(typeof normalizedHandler.handler).toBe("function");
      expect(normalizedHandler.registeredAt).toBeInstanceOf(Date);

      const emailVerifiedHandlers = handlers.get(DomainEventType.USER_EMAIL_VERIFIED);
      expect(emailVerifiedHandlers).toBeDefined();
      expect(emailVerifiedHandlers!.length).toBe(1);

      const emailHandler = emailVerifiedHandlers![0];
      expect(emailHandler).toMatchObject({
        eventType: DomainEventType.USER_EMAIL_VERIFIED,
        handlerName: "SendEmailHandler",
        options: {
          priority: 4,
          strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
          retryAttempts: 3,
        },
      });

      const passwordResetUsedHandlers = handlers.get(DomainEventType.PASSWORD_RESET_TOKEN_USED);
      expect(passwordResetUsedHandlers).toBeDefined();
      expect(passwordResetUsedHandlers!.length).toBe(1);

      const revokeHandler = passwordResetUsedHandlers![0];
      expect(revokeHandler).toMatchObject({
        eventType: DomainEventType.PASSWORD_RESET_TOKEN_USED,
        handlerName: "RevokeSessionsOnPasswordChangedHandler",
        options: {
          priority: 1,
          strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
          retryAttempts: 3,
        },
      });
    });
  });

  describe("Complex scenarios", () => {
    it("should handle multiple handlers for the same event", () => {
      const additionalHandlerEvents = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_CREATED, { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 5 }],
      ]);

      const additionalHandler = createMockHandler("AdditionalUserHandler", additionalHandlerEvents);
      registration.registerHandler(additionalHandler);

      const handlers = registration.getHandlersForEvent(DomainEventType.USER_CREATED);
      expect(handlers.length).toBe(2);
      expect(handlers.map((h) => h.handlerName)).toEqual(["AdditionalUserHandler", "RecordUserActivityHandler"]);
    });

    it("should maintain handler index integrity after unregister", () => {
      const handlerIndex = (registration as unknown as { handlerIndex: Map<string, number> }).handlerIndex;

      expect(handlerIndex.size).toBe(3);

      registration.unregisterHandler("RecordUserActivityHandler");

      expect(handlerIndex.size).toBe(2);
      expect(handlerIndex.has("RecordUserActivityHandler")).toBe(false);
      expect(handlerIndex.has("SendEmailHandler")).toBe(true);
      expect(handlerIndex.has("RevokeSessionsOnPasswordChangedHandler")).toBe(true);

      expect(registration.isHandlerRegistered("RecordUserActivityHandler")).toBe(false);
      expect(registration.isHandlerRegistered("SendEmailHandler")).toBe(true);
      expect(registration.isHandlerRegistered("RevokeSessionsOnPasswordChangedHandler")).toBe(true);
    });

    it("should handle registering handler with overlapping events partially", () => {
      const overlappingHandlerEvents = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_CREATED, { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 5 }],
        [DomainEventType.USER_BANNED, { priority: 2, strategy: EventExecutionStrategy.QUEUED_BATCH, retryAttempts: 3 }],
      ]);

      const overlappingHandler = createMockHandler("OverlappingHandler", overlappingHandlerEvents);
      registration.registerHandler(overlappingHandler);

      const userCreatedHandlers = registration.getHandlersForEvent(DomainEventType.USER_CREATED);
      expect(userCreatedHandlers.length).toBe(2);

      const userBannedHandlers = registration.getHandlersForEvent(DomainEventType.USER_BANNED);
      expect(userBannedHandlers.length).toBe(1);
      expect(userBannedHandlers[0].handlerName).toBe("OverlappingHandler");
    });

    it("should handle registering handler with no events", () => {
      const emptyHandlerEvents = new Map<DomainEventType, EventHandlerConfig>();
      const emptyHandler = createMockHandler("EmptyHandler", emptyHandlerEvents);

      registration.registerHandler(emptyHandler);

      expect(registration.isHandlerRegistered("EmptyHandler")).toBe(true);
      expect(registration.handlers.size).toBe(7);
    });

    it("should handle registering handler with multiple events", () => {
      const multiEventHandlerEvents = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_BANNED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
        [DomainEventType.USER_SUSPENDED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
        [DomainEventType.USER_DEACTIVATED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);

      const multiHandler = createMockHandler("MultiEventHandler", multiEventHandlerEvents);
      registration.registerHandler(multiHandler);

      expect(registration.isHandlerRegistered("MultiEventHandler")).toBe(true);
      expect(registration.handlers.has(DomainEventType.USER_BANNED)).toBe(true);
      expect(registration.handlers.has(DomainEventType.USER_SUSPENDED)).toBe(true);
      expect(registration.handlers.has(DomainEventType.USER_DEACTIVATED)).toBe(true);

      const bannedHandlers = registration.getHandlersForEvent(DomainEventType.USER_BANNED);
      expect(bannedHandlers.length).toBe(1);
      expect(bannedHandlers[0].handlerName).toBe("MultiEventHandler");
    });
  });

  describe("Logging", () => {
    it("should log debug when registering handler", () => {
      const newHandlerEvents = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_BANNED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);

      const newHandler = createMockHandler("TestHandler", newHandlerEvents);
      registration.registerHandler(newHandler);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "HANDLER_REGISTERED",
        message: "Registered handler TestHandler",
        data: {
          handlerName: "TestHandler",
          supportedEvents: [DomainEventType.USER_BANNED],
        },
      });
    });

    it("should log debug when unregistering handler", () => {
      registration.unregisterHandler("RecordUserActivityHandler");

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "HANDLER_UNREGISTERED",
        message: "Unregistered handler RecordUserActivityHandler",
        data: {
          eventTypes: [DomainEventType.USER_CREATED, DomainEventType.USER_ACTIVATED, DomainEventType.USER_LOGGED_IN],
        },
      });
    });

    it("should log error when handler registration fails", () => {
      const errorHandler = {
        handlerName: "ErrorHandler",
        supportedEvents: null as unknown as Map<DomainEventType, EventHandlerConfig>,
        execute: jest.fn(),
      } as jest.Mocked<EventHandler>;

      try {
        registration.registerHandler(errorHandler);
      } catch {
        // Ignore
      }

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "HANDLER_REGISTRATION_FAILED",
        message: expect.stringContaining("Failed to register handler:"),
        data: { handlerName: "ErrorHandler" },
      });
    });

    it("should log info on successful initialization", () => {
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "INITIALIZATION_COMPLETE",
        message: "Successfully registered 3 handlers",
        data: { totalHandlers: 3 },
      });
    });

    it("should log error on initialization failure", () => {
      const originalBuildHandlers = EventHandlerRegistrationAdapter.prototype["buildHandlers"];
      EventHandlerRegistrationAdapter.prototype["buildHandlers"] = jest.fn().mockImplementation(() => {
        throw new Error("Init failed");
      });

      expect(() => {
        new EventHandlerRegistrationAdapter(
          mockRecordUserActivityHandler,
          mockSendEmailHandler,
          mockRevokeSessionsOnPasswordChangedHandler,
          mockLogger,
        );
      }).toThrow("Init failed");

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "EventHandlerRegistrationAdapter",
        event: "INITIALIZATION_FAILED",
        message: "Failed to initialize event handlers",
        data: { error: "Init failed" },
      });

      EventHandlerRegistrationAdapter.prototype["buildHandlers"] = originalBuildHandlers;
    });
  });

  describe("Concurrent access", () => {
    it("should handle multiple handlers for same event type correctly", () => {
      for (let i = 1; i <= 3; i++) {
        const handlerEvents = new Map<DomainEventType, EventHandlerConfig>([
          [DomainEventType.USER_BANNED, { priority: i, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
        ]);

        const handler = createMockHandler(`Handler${i}`, handlerEvents);
        registration.registerHandler(handler);
      }

      const handlers = registration.getHandlersForEvent(DomainEventType.USER_BANNED);
      expect(handlers.length).toBe(3);
      expect(handlers[0].handlerName).toBe("Handler1");
      expect(handlers[1].handlerName).toBe("Handler2");
      expect(handlers[2].handlerName).toBe("Handler3");
    });

    it("should handle unregistering one of multiple handlers for same event", () => {
      const handler1Events = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_BANNED, { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);
      const handler1 = createMockHandler("Handler1", handler1Events);
      registration.registerHandler(handler1);

      const handler2Events = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_BANNED, { priority: 2, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);
      const handler2 = createMockHandler("Handler2", handler2Events);
      registration.registerHandler(handler2);

      expect(registration.getHandlersForEvent(DomainEventType.USER_BANNED).length).toBe(2);

      registration.unregisterHandler("Handler1");

      const remainingHandlers = registration.getHandlersForEvent(DomainEventType.USER_BANNED);
      expect(remainingHandlers.length).toBe(1);
      expect(remainingHandlers[0].handlerName).toBe("Handler2");
      expect(registration.handlers.has(DomainEventType.USER_BANNED)).toBe(true);
    });

    it("should handle registering handlers in different order", () => {
      const handler1Events = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_BANNED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);
      const handler1 = createMockHandler("HandlerA", handler1Events);

      const handler2Events = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_BANNED, { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);
      const handler2 = createMockHandler("HandlerB", handler2Events);

      registration.registerHandler(handler1);
      registration.registerHandler(handler2);

      const handlers = registration.getHandlersForEvent(DomainEventType.USER_BANNED);
      expect(handlers.length).toBe(2);
      expect(handlers[0].handlerName).toBe("HandlerB");
      expect(handlers[1].handlerName).toBe("HandlerA");
    });
  });

  describe("Edge cases", () => {
    it("should handle handler with empty string name", () => {
      const emptyNameEvents = new Map<DomainEventType, EventHandlerConfig>([
        [DomainEventType.USER_BANNED, { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3 }],
      ]);

      const emptyNameHandler = createMockHandler("", emptyNameEvents);

      expect(() => {
        registration.registerHandler(emptyNameHandler);
      }).not.toThrow();

      expect(registration.isHandlerRegistered("")).toBe(true);
      expect(registration.getHandlerByName("")).toBe(emptyNameHandler);
      expect(registration.handlers.has(DomainEventType.USER_BANNED)).toBe(true);

      const bannedHandlers = registration.getHandlersForEvent(DomainEventType.USER_BANNED);
      expect(bannedHandlers.length).toBe(1);
      expect(bannedHandlers[0].handlerName).toBe("");
    });

    it("should handle handler with undefined supportedEvents", () => {
      const undefinedEventsHandler = {
        handlerName: "UndefinedEvents",
        supportedEvents: undefined as unknown as Map<DomainEventType, EventHandlerConfig>,
        execute: jest.fn(),
      } as jest.Mocked<EventHandler>;

      expect(() => {
        registration.registerHandler(undefinedEventsHandler);
      }).toThrow();
    });

    it("should handle handler with null supportedEvents", () => {
      const nullEventsHandler = {
        handlerName: "NullEvents",
        supportedEvents: null as unknown as Map<DomainEventType, EventHandlerConfig>,
        execute: jest.fn(),
      } as jest.Mocked<EventHandler>;

      expect(() => {
        registration.registerHandler(nullEventsHandler);
      }).toThrow();
    });
  });
});
