import { RecordUserActivityHandler } from "@/application/handlers/record-user-activity.handler";
import { DomainEvent, DomainEventType } from "@/domain/types/domain-event.type";
import { EventExecutionStrategy } from "@/application/ports/driven/event-handler.port";
import { RequestContextPort, RequestContextData } from "@/application/ports/driven/request-context.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UserActivityRepositoryPort } from "@/application/ports/driven/user-activity.repository.port";
import { UserActivityType } from "@/domain/types/user.type";
import { UserActivity } from "@/domain/value-objects/user-activity.vo";
import {
  UserCreatedEvent,
  UserActivatedEvent,
  UserSuspendedEvent,
  UserBannedEvent,
  UserDeactivatedEvent,
  UserAccountLockedEvent,
  UserAccountUnlockedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserEmailChangedEvent,
  UserEmailVerifiedEvent,
  UserProfileUpdatedEvent,
  UserRoleChangedEvent,
  UserPasswordChangedEvent,
} from "@/domain/events/user.events";
import { UserRoleType } from "@/domain/types/user.type";

/**
 * NOTE: Like the other handler built on `BaseEventHandler`, exhaustive
 * coverage of the start/finish/error logging lifecycle lives in
 * base.handler.test.ts - this suite focuses on what's unique to
 * RecordUserActivityHandler: the event-type -> activity mapping, the
 * userId/description derivation logic, and what actually gets built and
 * persisted.
 *
 * `UserActivity` here is the *real* class (not a stub), so assertions read
 * back through its actual public getters rather than guessing internal
 * shape.
 *
 * IMPORT PATH: assumes this test is colocated with the handler (standard
 * `*_test.ts`-next-to-source layout); adjust `./record-user-activity.handler`
 * if yours lives elsewhere.
 */

function makeLogger(): jest.Mocked<LoggerPort> {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  } as unknown as jest.Mocked<LoggerPort>;
}

function makeRequestContext(overrides: Partial<RequestContextData> = {}): jest.Mocked<RequestContextPort> {
  return {
    get: jest.fn().mockReturnValue({
      requestId: "request-abc",
      ipAddress: "10.0.0.1",
      userAgent: "test-agent",
      ...overrides,
    }),
  } as unknown as jest.Mocked<RequestContextPort>;
}

function makeRepo(): jest.Mocked<UserActivityRepositoryPort> {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    findLatestByUserId: jest.fn(),
    findByUserId: jest.fn(),
  } as unknown as jest.Mocked<UserActivityRepositoryPort>;
}

/** A generic literal event for edge cases the provided concrete event classes don't express. */
function makeEvent(overrides: Partial<DomainEvent<unknown>> = {}): DomainEvent<unknown> {
  return {
    aggregateId: "aggregate-1",
    eventType: DomainEventType.USER_LOGGED_IN,
    occurredOn: new Date("2026-01-01T00:00:00.000Z"),
    payload: {},
    version: 1,
    ...overrides,
  };
}

describe("RecordUserActivityHandler", () => {
  let logger: jest.Mocked<LoggerPort>;
  let requestContext: jest.Mocked<RequestContextPort>;
  let repo: jest.Mocked<UserActivityRepositoryPort>;
  let handler: RecordUserActivityHandler;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));

    logger = makeLogger();
    requestContext = makeRequestContext();
    repo = makeRepo();
    handler = new RecordUserActivityHandler(repo, requestContext, logger);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------
  // Construction / EventHandlerPort wiring
  // ---------------------------------------------------------------------
  describe("construction", () => {
    it("sets handlerName to its own class name", () => {
      expect(handler.handlerName).toBe("RecordUserActivityHandler");
    });

    it("registers all 16 mapped event types", () => {
      expect(handler.supportedEvents.size).toBe(16);
    });

    it("configures every supported event with the same options object", () => {
      const expectedOptions = {
        strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
        priority: 5,
        retryAttempts: 2,
      };

      for (const [, options] of handler.supportedEvents) {
        expect(options).toEqual(expectedOptions);
      }

      // The handler builds one `config` object and reuses the same reference
      // for every map entry - confirm that sharing, not just structural equality.
      const values = [...handler.supportedEvents.values()];
      expect(new Set(values).size).toBe(1);
    });

    it("does not register an unmapped event type", () => {
      expect(handler.supportedEvents.has(DomainEventType.ORDER_CONFIRMED)).toBe(false);
    });

    it("builds a fresh supportedEvents map per instance", () => {
      const other = new RecordUserActivityHandler(makeRepo(), makeRequestContext(), makeLogger());
      expect(other.supportedEvents).not.toBe(handler.supportedEvents);
    });
  });

  // ---------------------------------------------------------------------
  // Table-driven: every supported event type maps to the right activity
  // ---------------------------------------------------------------------
  describe("handling each supported event type", () => {
    const cases: Array<{
      name: string;
      event: DomainEvent<unknown>;
      activityType: UserActivityType;
      description: string;
    }> = [
      {
        name: "USER_CREATED",
        event: new UserCreatedEvent("user-1", "a@b.com", "Alice", new Date("2026-01-01T00:00:00.000Z")),
        activityType: UserActivityType.REGISTERED,
        description: "User account created successfully",
      },
      {
        name: "USER_ACTIVATED",
        event: new UserActivatedEvent("user-1"),
        activityType: UserActivityType.ACCOUNT_ACTIVATED,
        description: "User account activated",
      },
      {
        name: "USER_SUSPENDED",
        event: new UserSuspendedEvent("user-1", "policy violation", new Date()),
        activityType: UserActivityType.ACCOUNT_SUSPENDED,
        // UserSuspendedEvent's payload always carries a truthy "reason",
        // so this always goes through the enrichDescription "reason" branch.
        description: "User account suspended (reason: policy violation)",
      },
      {
        name: "USER_BANNED",
        event: new UserBannedEvent("user-1", "repeated violations", new Date()),
        activityType: UserActivityType.ACCOUNT_BANNED,
        description: "User account banned (reason: repeated violations)",
      },
      {
        name: "USER_DEACTIVATED",
        event: new UserDeactivatedEvent("user-1"),
        activityType: UserActivityType.ACCOUNT_DEACTIVATED,
        description: "User account deactivated",
      },
      {
        name: "USER_ACCOUNT_LOCKED",
        event: new UserAccountLockedEvent("user-1", new Date(), 5),
        activityType: UserActivityType.ACCOUNT_LOCKED,
        description: "User account locked for security reasons",
      },
      {
        name: "USER_ACCOUNT_UNLOCKED",
        event: new UserAccountUnlockedEvent("user-1", "a@b.com"),
        activityType: UserActivityType.ACCOUNT_UNLOCKED,
        description: "User account unlocked",
      },
      {
        name: "USER_LOGGED_IN",
        event: new UserLoggedInEvent("user-1", new Date()),
        activityType: UserActivityType.LOGGED_IN,
        description: "User successfully logged in",
      },
      {
        name: "USER_LOGGED_OUT",
        event: new UserLoggedOutEvent("user-1", new Date()),
        activityType: UserActivityType.LOGGED_OUT,
        description: "User logged out",
      },
      {
        name: "USER_EMAIL_CHANGED",
        event: new UserEmailChangedEvent("user-1", "new@b.com", new Date()),
        activityType: UserActivityType.EMAIL_CHANGED,
        description: "User email address changed",
      },
      {
        name: "USER_EMAIL_VERIFIED",
        event: new UserEmailVerifiedEvent("user-1", "a@b.com", new Date()),
        activityType: UserActivityType.EMAIL_VERIFIED,
        description: "User email address verified",
      },
      {
        name: "USER_PROFILE_UPDATED",
        event: new UserProfileUpdatedEvent("user-1", "Alice"),
        activityType: UserActivityType.PROFILE_UPDATED,
        description: "User profile information updated",
      },
      {
        name: "USER_ROLE_CHANGED",
        event: new UserRoleChangedEvent("user-1", UserRoleType.CASHIER, UserRoleType.MANAGER),
        activityType: UserActivityType.ROLE_CHANGED,
        description: "User role/permissions changed",
      },
      {
        name: "USER_PASSWORD_CHANGED",
        event: new UserPasswordChangedEvent("user-1", new Date()),
        activityType: UserActivityType.PASSWORD_CHANGED,
        description: "User password changed",
      },
      // {
      //   // Not defined in the provided user.events.ts (presumably lives in a
      //   // token/session events file) - a generic literal event is used instead.
      //   name: "PASSWORD_RESET_TOKEN_ISSUED",
      //   event: makeEvent({ aggregateId: "user-1", eventType: DomainEventType.PASSWORD_RESET_TOKEN_ISSUED, payload: {} }),
      //   activityType: UserActivityType.PASSWORD_RESET,
      //   description: "User password reset",
      // },
      // {
      //   name: "SESSION_CREATED",
      //   event: makeEvent({ aggregateId: "user-1", eventType: DomainEventType.SESSION_CREATED, payload: {} }),
      //   activityType: UserActivityType.SESSION_REFRESHED,
      //   description: "User session refreshed",
      // },
    ];

    it.each(cases)("records a $activityType activity for $name", async ({ event, activityType, description }) => {
      await handler.execute(event);

      expect(repo.insert).toHaveBeenCalledTimes(1);
      const activity: UserActivity = repo.insert.mock.calls[0][0];

      expect(activity.getUserId()).toBe(event.aggregateId);
      expect(activity.getAction()).toBe(activityType);
      expect(activity.getDescription()).toBe(description);
      expect(activity.getIpAddress()).toBe("10.0.0.1");
      expect(activity.getUserAgent()).toBe("test-agent");
      expect(activity.getOccurredAt().getTime()).toBe(event.occurredOn.getTime());
    });

    it.each(cases)("attaches correct metadata for $name", async ({ event }) => {
      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      const metadata = activity.getMetadata()!;

      expect(metadata.eventType).toBe(event.eventType);
      expect(metadata.eventVersion).toBe(event.version);
      expect(metadata.processingContext).toEqual({
        requestId: "request-abc",
        processedAt: new Date("2026-06-01T12:00:00.000Z"),
        handlerName: "RecordUserActivityHandler",
      });
    });
  });

  // ---------------------------------------------------------------------
  // userId resolution
  // ---------------------------------------------------------------------
  describe("userId resolution", () => {
    it("falls back to aggregateId when the payload has no userId field", async () => {
      const event = makeEvent({ aggregateId: "aggregate-42", payload: { loginAt: new Date() } });

      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getUserId()).toBe("aggregate-42");
    });

    it("prefers payload.userId over aggregateId when present", async () => {
      const event = makeEvent({ aggregateId: "admin-aggregate", payload: { userId: "target-user-999" } });

      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getUserId()).toBe("target-user-999");
    });

    it("falls back to aggregateId when payload is not an object", async () => {
      for (const payload of [null, undefined, "a string payload", 42]) {
        repo.insert.mockClear();
        const event = makeEvent({ aggregateId: "aggregate-x", payload });

        await handler.execute(event);

        const activity: UserActivity = repo.insert.mock.calls[0][0];
        expect(activity.getUserId()).toBe("aggregate-x");
      }
    });
  });

  // ---------------------------------------------------------------------
  // Description enrichment
  // ---------------------------------------------------------------------
  describe("description enrichment", () => {
    it("appends '(via <source>)' when payload.source is truthy", async () => {
      const event = makeEvent({ eventType: DomainEventType.USER_LOGGED_IN, payload: { source: "mobile-app" } });

      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getDescription()).toBe("User successfully logged in (via mobile-app)");
    });

    it("appends '(reason: <reason>)' when payload.reason is truthy", async () => {
      const event = makeEvent({ eventType: DomainEventType.USER_LOGGED_OUT, payload: { reason: "session expired" } });

      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getDescription()).toBe("User logged out (reason: session expired)");
    });

    it("combines both source and reason when both are present", async () => {
      const event = makeEvent({ eventType: DomainEventType.USER_LOGGED_IN, payload: { source: "mobile-app", reason: "biometric retry" } });

      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getDescription()).toBe("User successfully logged in (via mobile-app, reason: biometric retry)");
    });

    it("does not enrich when payload.source is present but falsy", async () => {
      const event = makeEvent({ eventType: DomainEventType.USER_LOGGED_IN, payload: { source: "" } });

      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getDescription()).toBe("User successfully logged in");
    });

    it("does not enrich when payload.reason is present but falsy", async () => {
      const event = makeEvent({ eventType: DomainEventType.USER_LOGGED_IN, payload: { reason: "" } });

      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getDescription()).toBe("User successfully logged in");
    });

    it("leaves the base description untouched when neither source nor reason are present", async () => {
      const event = makeEvent({ eventType: DomainEventType.USER_LOGGED_IN, payload: { loginAt: new Date() } });

      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getDescription()).toBe("User successfully logged in");
    });

    it.each([null, undefined, "a string payload", 42])("leaves the base description untouched for a non-object payload (%p)", async (payload) => {
      const event = makeEvent({ eventType: DomainEventType.USER_LOGGED_IN, payload });

      await handler.execute(event);

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getDescription()).toBe("User successfully logged in");
    });
  });

  // ---------------------------------------------------------------------
  // Network info (ipAddress / userAgent) via requestContext
  // ---------------------------------------------------------------------
  describe("network info from request context", () => {
    it("calls requestContext.get() exactly once per handled event", async () => {
      await handler.execute(makeEvent());

      expect(requestContext.get).toHaveBeenCalledTimes(1);
    });

    it("stores null (not undefined) for ipAddress/userAgent when the request context doesn't have them", async () => {
      requestContext.get.mockReturnValue({ requestId: "request-abc", ipAddress: undefined, userAgent: undefined });

      await handler.execute(makeEvent());

      const activity: UserActivity = repo.insert.mock.calls[0][0];
      expect(activity.getIpAddress()).toBeNull();
      expect(activity.getUserAgent()).toBeNull();
      expect(activity.hasNetworkInfo()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // Unsupported event type
  // ---------------------------------------------------------------------
  describe("unsupported event type", () => {
    it("throws and never calls the repository when there is no activity mapping for the event", async () => {
      const event = makeEvent({ eventType: DomainEventType.ORDER_CONFIRMED });

      await expect(handler.execute(event)).rejects.toThrow(`No activity type mapping found for event: ${DomainEventType.ORDER_CONFIRMED}`);
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it("logs the failure through the base handler's error path", async () => {
      const event = makeEvent({ eventType: DomainEventType.ORDER_CONFIRMED });

      await handler.execute(event).catch(() => undefined);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RecordUserActivityHandler",
          message: `No activity type mapping found for event: ${DomainEventType.ORDER_CONFIRMED}`,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------
  // Integration with BaseEventHandler's execute() lifecycle
  // (kept minimal - exhaustive coverage lives in base.handler.test.ts)
  // ---------------------------------------------------------------------
  describe("execute() lifecycle integration", () => {
    it("resolves on success", async () => {
      await expect(handler.execute(makeEvent())).resolves.toBeUndefined();
    });

    it("propagates a repository failure without swallowing it", async () => {
      const error = new Error("insert failed");
      repo.insert.mockRejectedValue(error);

      await expect(handler.execute(makeEvent())).rejects.toBe(error);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: "insert failed" }));
    });
  });
});
