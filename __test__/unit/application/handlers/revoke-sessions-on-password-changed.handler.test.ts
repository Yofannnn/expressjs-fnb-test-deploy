import { RevokeSessionsOnPasswordChangedHandler } from "@/application/handlers/revoke-sessions-on-password-changed.handler";
import { DomainEventType } from "@/domain/types/domain-event.type";
import { EventExecutionStrategy } from "@/application/ports/driven/event-handler.port";
import { SessionRepositoryPort } from "@/application/ports/driven/session.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UserPasswordChangedEvent } from "@/domain/events/user.events";

/**
 * NOTE: This is a thin handler built on the already-tested `BaseEventHandler`
 * (see base.handler.test.ts). That suite already covers the start/finish/error
 * logging lifecycle, timing, and error-stringification exhaustively - this
 * suite doesn't re-derive all of that. It focuses on what's unique to this
 * handler: what it wires up in its constructor, and what `handle()` actually
 * does with the event. It re-confirms the base class's success/failure paths
 * are wired correctly (a couple of integration-style assertions), but relies
 * on base.handler.test.ts for exhaustive coverage of that machinery itself.
 *
 * ASSUMPTIONS (flag if wrong):
 *   - `SessionRepositoryPort` is mocked down to just the one method this
 *     handler calls, `revokeAllSessionsForUser(userId, reason): Promise<void>`,
 *     the same permissive-cast pattern used for every other port in this
 *     conversation. If the real interface has more required methods, this
 *     still compiles/runs fine - only that method's behavior is exercised.
 *   - `BaseDomainEvent`'s internals (how `occurredOn`/`version` get set) are
 *     inferred, not confirmed - but `handle()` never reads either field, only
 *     `event.aggregateId`, so it doesn't affect this handler's behavior either way.
 *
 * IMPORT PATH: assumes this test is colocated with the handler (standard
 * `*_test.ts`-next-to-source layout); adjust `./revoke-sessions-on-password-changed.handler`
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

function makeRepo(): jest.Mocked<SessionRepositoryPort> {
  return {
    revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SessionRepositoryPort>;
}

describe("RevokeSessionsOnPasswordChangedHandler", () => {
  let logger: jest.Mocked<LoggerPort>;
  let repo: jest.Mocked<SessionRepositoryPort>;
  let handler: RevokeSessionsOnPasswordChangedHandler;

  beforeEach(() => {
    logger = makeLogger();
    repo = makeRepo();
    handler = new RevokeSessionsOnPasswordChangedHandler(repo, logger);
  });

  // ---------------------------------------------------------------------
  // Construction / EventHandlerPort wiring
  // ---------------------------------------------------------------------
  describe("construction", () => {
    it("sets handlerName to its own class name", () => {
      expect(handler.handlerName).toBe("RevokeSessionsOnPasswordChangedHandler");
    });

    it("registers exactly one supported event: USER_PASSWORD_CHANGED", () => {
      expect(handler.supportedEvents.size).toBe(1);
      expect(handler.supportedEvents.has(DomainEventType.USER_PASSWORD_CHANGED)).toBe(true);
    });

    it("configures USER_PASSWORD_CHANGED with the expected options", () => {
      expect(handler.supportedEvents.get(DomainEventType.USER_PASSWORD_CHANGED)).toEqual({
        priority: 1,
        strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
        retryAttempts: 3,
        timeoutMs: 15000,
      });
    });

    it("does not register any other event type", () => {
      expect(handler.supportedEvents.get(DomainEventType.USER_CREATED)).toBeUndefined();
      expect(handler.supportedEvents.get(DomainEventType.SESSION_CREATED)).toBeUndefined();
    });

    it("builds a fresh supportedEvents map per instance (not a shared static)", () => {
      const other = new RevokeSessionsOnPasswordChangedHandler(makeRepo(), makeLogger());

      expect(other.supportedEvents).not.toBe(handler.supportedEvents);
      expect(other.supportedEvents.get(DomainEventType.USER_PASSWORD_CHANGED)).toEqual(
        handler.supportedEvents.get(DomainEventType.USER_PASSWORD_CHANGED),
      );
    });
  });

  // ---------------------------------------------------------------------
  // handle() - via execute(), the real entry point per EventHandlerPort
  // ---------------------------------------------------------------------
  describe("handling USER_PASSWORD_CHANGED", () => {
    it("revokes all sessions for the event's aggregateId with reason 'Password changed'", async () => {
      const event = new UserPasswordChangedEvent("user-123", new Date("2026-01-01T00:00:00.000Z"));

      await handler.execute(event);

      expect(repo.revokeAllSessionsForUser).toHaveBeenCalledTimes(1);
      expect(repo.revokeAllSessionsForUser).toHaveBeenCalledWith("user-123", "Password changed");
    });

    it("uses the aggregateId as-is for different users", async () => {
      const event = new UserPasswordChangedEvent("another-user-456", new Date());

      await handler.execute(event);

      expect(repo.revokeAllSessionsForUser).toHaveBeenCalledWith("another-user-456", "Password changed");
    });

    it("does not depend on the event's payload.changedAt value", async () => {
      // handle() only reads event.aggregateId - the changedAt timestamp in the
      // payload is informational and unused by this handler.
      const earlier = new UserPasswordChangedEvent("user-1", new Date("2020-01-01T00:00:00.000Z"));
      const later = new UserPasswordChangedEvent("user-1", new Date("2030-01-01T00:00:00.000Z"));

      await handler.execute(earlier);
      await handler.execute(later);

      expect(repo.revokeAllSessionsForUser).toHaveBeenNthCalledWith(1, "user-1", "Password changed");
      expect(repo.revokeAllSessionsForUser).toHaveBeenNthCalledWith(2, "user-1", "Password changed");
    });

    it("calls no other repository method", async () => {
      const event = new UserPasswordChangedEvent("user-123", new Date());

      await handler.execute(event);

      expect(Object.keys(repo)).toEqual(["revokeAllSessionsForUser"]);
    });

    it("resolves once the repository call resolves", async () => {
      const event = new UserPasswordChangedEvent("user-123", new Date());

      await expect(handler.execute(event)).resolves.toBeUndefined();
    });

    it("awaits the repository call before completing (does not fire-and-forget)", async () => {
      let repoResolved = false;
      repo.revokeAllSessionsForUser.mockImplementation(async () => {
        await Promise.resolve();
        repoResolved = true;
      });
      const event = new UserPasswordChangedEvent("user-123", new Date());

      await handler.execute(event);

      expect(repoResolved).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // Integration with BaseEventHandler's execute() lifecycle
  // (kept minimal - exhaustive coverage lives in base.handler.test.ts)
  // ---------------------------------------------------------------------
  describe("execute() lifecycle integration", () => {
    it("logs a debug start and info finish on success, tagged with this handler's class name", async () => {
      const event = new UserPasswordChangedEvent("user-123", new Date());

      await handler.execute(event);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ context: "RevokeSessionsOnPasswordChangedHandler", message: "Event handler start" }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: "RevokeSessionsOnPasswordChangedHandler", message: "Event handler finish" }),
      );
    });

    it("propagates a repository failure and logs it, without swallowing the error", async () => {
      const error = new Error("database unavailable");
      repo.revokeAllSessionsForUser.mockRejectedValue(error);
      const event = new UserPasswordChangedEvent("user-123", new Date());

      await expect(handler.execute(event)).rejects.toBe(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RevokeSessionsOnPasswordChangedHandler",
          message: "database unavailable",
          stack: error.stack,
        }),
      );
      expect(logger.info).not.toHaveBeenCalled();
    });

    it("propagates a non-Error repository rejection unchanged", async () => {
      repo.revokeAllSessionsForUser.mockRejectedValue("connection reset");
      const event = new UserPasswordChangedEvent("user-123", new Date());

      await expect(handler.execute(event)).rejects.toBe("connection reset");

      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: "connection reset", stack: undefined }));
    });
  });
});
