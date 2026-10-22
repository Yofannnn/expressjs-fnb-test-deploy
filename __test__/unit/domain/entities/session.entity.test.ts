import { Session } from "@/domain/entities/session.entity";
import { Expiration } from "@/domain/value-objects/expiration.vo";
import { SessionCreationData, SessionRebuildData } from "@/domain/types/session.type";
import { SessionCreatedEvent, SessionRevokedEvent } from "@/domain/events/session.events";
import { SessionAlreadyExpiredException, SessionAlreadyRevokedException } from "@/domain/exceptions/session.exceptions";

jest.mock("@/domain/events/session.events");

describe("Session", () => {
  const mockNow = new Date("2023-01-01T00:00:00.000Z");
  const defaultExpiresAt = new Date("2023-01-01T00:15:00.000Z");
  const customExpiresAt = new Date("2023-01-01T00:30:00.000Z");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSessionData = {
    id: "session-123",
    tokenFingerprint: "token-fingerprint-123",
    tokenFamily: "token-family-123",
    userId: "user-123",
    userAgent: "Mozilla/5.0",
    ipAddress: "192.168.1.1",
    deviceId: "device-123",
    createdAt: mockNow,
    updatedAt: mockNow,
  };

  describe("constructor", () => {
    it("should create a session instance with all properties", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.getId()).toBe(mockSessionData.id);
      expect(session.getTokenFingerprint()).toBe(mockSessionData.tokenFingerprint);
      expect(session.getTokenFamily()).toBe(mockSessionData.tokenFamily);
      expect(session.getUserId()).toBe(mockSessionData.userId);
      expect(session.getUserAgent()).toBe(mockSessionData.userAgent);
      expect(session.getIpAddress()).toBe(mockSessionData.ipAddress);
      expect(session.getDeviceId()).toBe(mockSessionData.deviceId);
      expect(session.getCreatedAt()).toEqual(mockSessionData.createdAt);
      expect(session.getUpdatedAt()).toEqual(mockSessionData.updatedAt);
      expect(session.getRevokedAt()).toBeNull();
      expect(session.getRevokeReason()).toBeNull();
      expect(session.getExpiresAt()).toEqual(defaultExpiresAt);
    });

    it("should create a session instance with optional null values", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        null,
        null,
        null,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.getUserAgent()).toBeNull();
      expect(session.getIpAddress()).toBeNull();
      expect(session.getDeviceId()).toBeNull();
    });

    it("should create a session instance with revoked data", () => {
      const expiration = new Expiration(defaultExpiresAt);
      const revokedAt = new Date("2023-01-01T00:30:00.000Z");
      const revokeReason = "user_logout";

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        revokedAt,
        revokeReason,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.getRevokedAt()).toEqual(revokedAt);
      expect(session.getRevokeReason()).toBe(revokeReason);
      expect(session.isRevoked()).toBe(true);
    });
  });

  describe("create", () => {
    it("should create a new session with default duration", () => {
      const creationData: SessionCreationData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt: defaultExpiresAt,
        userAgent: mockSessionData.userAgent,
        ipAddress: mockSessionData.ipAddress,
        deviceId: mockSessionData.deviceId,
      };

      const session = Session.create(creationData);

      expect(session.getId()).toBe(mockSessionData.id);
      expect(session.getTokenFingerprint()).toBe(mockSessionData.tokenFingerprint);
      expect(session.getTokenFamily()).toBe(mockSessionData.tokenFamily);
      expect(session.getUserId()).toBe(mockSessionData.userId);
      expect(session.getUserAgent()).toBe(mockSessionData.userAgent);
      expect(session.getIpAddress()).toBe(mockSessionData.ipAddress);
      expect(session.getDeviceId()).toBe(mockSessionData.deviceId);
      expect(session.getRevokedAt()).toBeNull();
      expect(session.getRevokeReason()).toBeNull();
      expect(session.getCreatedAt()).toEqual(mockNow);
      expect(session.getUpdatedAt()).toEqual(mockNow);
      expect(session.isActive()).toBe(true);
      expect(session.isExpired()).toBe(false);
      expect(session.isRevoked()).toBe(false);
      expect(session.getExpiresAt()).toEqual(defaultExpiresAt);
      expect(SessionCreatedEvent).toHaveBeenCalledWith(mockSessionData.id, mockSessionData.userId);
      expect(SessionCreatedEvent).toHaveBeenCalledTimes(1);
    });

    it("should create a new session with custom duration", () => {
      const creationData: SessionCreationData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt: customExpiresAt,
      };

      const session = Session.create(creationData);

      expect(session.getExpiresAt()).toEqual(customExpiresAt);
      expect(SessionCreatedEvent).toHaveBeenCalledWith(mockSessionData.id, mockSessionData.userId);
    });

    it("should create a new session with provided dates", () => {
      const customDate = new Date("2023-01-01T12:00:00.000Z");

      const creationData: SessionCreationData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt: defaultExpiresAt,
        createdAt: customDate,
        updatedAt: customDate,
      };

      const session = Session.create(creationData);

      expect(session.getCreatedAt()).toEqual(customDate);
      expect(session.getUpdatedAt()).toEqual(customDate);
    });

    it("should handle null values for optional fields in creation data", () => {
      const creationData: SessionCreationData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt: defaultExpiresAt,
      };

      const session = Session.create(creationData);

      expect(session.getUserAgent()).toBeNull();
      expect(session.getIpAddress()).toBeNull();
      expect(session.getDeviceId()).toBeNull();
      expect(session.getCreatedAt()).toEqual(mockNow);
      expect(session.getUpdatedAt()).toEqual(mockNow);
    });

    it("should handle partial optional fields in creation data", () => {
      const creationData: SessionCreationData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt: defaultExpiresAt,
        userAgent: mockSessionData.userAgent,
      };

      const session = Session.create(creationData);

      expect(session.getUserAgent()).toBe(mockSessionData.userAgent);
      expect(session.getIpAddress()).toBeNull();
      expect(session.getDeviceId()).toBeNull();
    });

    it("should create session with all fields provided", () => {
      const customDate = new Date("2023-01-01T12:00:00.000Z");

      const creationData: SessionCreationData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt: customExpiresAt,
        userAgent: mockSessionData.userAgent,
        ipAddress: mockSessionData.ipAddress,
        deviceId: mockSessionData.deviceId,
        createdAt: customDate,
        updatedAt: customDate,
      };

      const session = Session.create(creationData);

      expect(session.getCreatedAt()).toEqual(customDate);
      expect(session.getUpdatedAt()).toEqual(customDate);
      expect(session.getExpiresAt().getTime()).toBe(customExpiresAt.getTime());
    });
  });

  describe("rebuild", () => {
    it("should rebuild a session from existing data", () => {
      const expiresAt = new Date("2023-01-01T02:00:00.000Z");
      const revokedAt = new Date("2023-01-01T01:00:00.000Z");

      const rebuildData: SessionRebuildData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt,
        revokedAt,
        revokeReason: "user_logout",
        userAgent: mockSessionData.userAgent,
        ipAddress: mockSessionData.ipAddress,
        deviceId: mockSessionData.deviceId,
        createdAt: mockSessionData.createdAt,
        updatedAt: mockSessionData.updatedAt,
      };

      const session = Session.rebuild(rebuildData);

      expect(session.getId()).toBe(mockSessionData.id);
      expect(session.getTokenFingerprint()).toBe(mockSessionData.tokenFingerprint);
      expect(session.getTokenFamily()).toBe(mockSessionData.tokenFamily);
      expect(session.getUserId()).toBe(mockSessionData.userId);
      expect(session.getExpiresAt()).toEqual(expiresAt);
      expect(session.getRevokedAt()).toEqual(revokedAt);
      expect(session.getRevokeReason()).toBe("user_logout");
      expect(session.getUserAgent()).toBe(mockSessionData.userAgent);
      expect(session.getIpAddress()).toBe(mockSessionData.ipAddress);
      expect(session.getDeviceId()).toBe(mockSessionData.deviceId);
      expect(session.getCreatedAt()).toEqual(mockSessionData.createdAt);
      expect(session.getUpdatedAt()).toEqual(mockSessionData.updatedAt);
    });

    it("should rebuild a session with null optional values", () => {
      const expiresAt = new Date("2023-01-01T02:00:00.000Z");
      const rebuildData: SessionRebuildData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt,
        revokedAt: null,
        revokeReason: null,
        userAgent: null,
        ipAddress: null,
        deviceId: null,
        createdAt: mockSessionData.createdAt,
        updatedAt: mockSessionData.updatedAt,
      };

      const session = Session.rebuild(rebuildData);

      expect(session.getRevokedAt()).toBeNull();
      expect(session.getRevokeReason()).toBeNull();
      expect(session.getUserAgent()).toBeNull();
      expect(session.getIpAddress()).toBeNull();
      expect(session.getDeviceId()).toBeNull();
    });

    it("should rebuild a session with only required fields", () => {
      const expiresAt = new Date("2023-01-01T02:00:00.000Z");
      const rebuildData: SessionRebuildData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt,
        revokedAt: null,
        revokeReason: null,
        userAgent: null,
        ipAddress: null,
        deviceId: null,
        createdAt: mockSessionData.createdAt,
        updatedAt: mockSessionData.updatedAt,
      };

      const session = Session.rebuild(rebuildData);

      expect(session.getId()).toBe(mockSessionData.id);
      expect(session.getTokenFingerprint()).toBe(mockSessionData.tokenFingerprint);
      expect(session.getTokenFamily()).toBe(mockSessionData.tokenFamily);
      expect(session.getUserId()).toBe(mockSessionData.userId);
      expect(session.getExpiresAt()).toEqual(expiresAt);
    });
  });

  describe("revoke", () => {
    it("should revoke an active session and emit SessionRevokedEvent", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      const revokeReason = "user_request";
      jest.advanceTimersByTime(60000);

      session.revoke(revokeReason);

      expect(session.getRevokedAt()).not.toBeNull();
      expect(session.getRevokeReason()).toBe(revokeReason);
      expect(session.isRevoked()).toBe(true);
      expect(session.isActive()).toBe(false);
      expect(session.getUpdatedAt().getTime()).toBe(mockNow.getTime() + 60000);
      expect(SessionRevokedEvent).toHaveBeenCalledWith(mockSessionData.id, mockSessionData.userId, revokeReason, expect.any(Date));
      expect(SessionRevokedEvent).toHaveBeenCalledTimes(1);
    });

    it("should throw SessionAlreadyExpiredException when trying to revoke an expired session", () => {
      const expiresAt = new Date(mockNow.getTime() - 1000);
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(() => session.revoke("user_request")).toThrow(SessionAlreadyExpiredException);
      expect(session.getRevokedAt()).toBeNull();
      expect(session.getRevokeReason()).toBeNull();
      expect(SessionRevokedEvent).not.toHaveBeenCalled();
    });

    it("should throw SessionAlreadyRevokedException when trying to revoke an already revoked session", () => {
      const expiration = new Expiration(defaultExpiresAt);
      const originalRevokedAt = new Date("2023-01-01T00:30:00.000Z");
      const originalRevokeReason = "auto_logout";

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        originalRevokedAt,
        originalRevokeReason,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      const newRevokeReason = "new_reason";
      expect(() => session.revoke(newRevokeReason)).toThrow(SessionAlreadyRevokedException);
      expect(session.getRevokedAt()).toEqual(originalRevokedAt);
      expect(session.getRevokeReason()).toBe(originalRevokeReason);
      expect(SessionRevokedEvent).not.toHaveBeenCalled();
    });

    it("should handle revoke with empty reason string", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      session.revoke("");

      expect(session.getRevokedAt()).not.toBeNull();
      expect(session.getRevokeReason()).toBe("");
      expect(SessionRevokedEvent).toHaveBeenCalledWith(mockSessionData.id, mockSessionData.userId, "", expect.any(Date));
    });

    it("should update touch timestamp when revoking", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      const beforeUpdate = session.getUpdatedAt();
      jest.advanceTimersByTime(5000);
      session.revoke("test");

      expect(session.getUpdatedAt().getTime()).toBeGreaterThan(beforeUpdate.getTime());
    });
  });

  describe("status checks", () => {
    it("should return correct expiration status when expired", () => {
      const expiresAt = new Date(mockNow.getTime() - 1000);
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isExpired()).toBe(true);
    });

    it("should return correct expiration status when not expired", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isExpired()).toBe(false);
    });

    it("should return correct revocation status when revoked", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        new Date(),
        "test_reason",
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isRevoked()).toBe(true);
    });

    it("should return correct revocation status when not revoked", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isRevoked()).toBe(false);
    });

    it("should return correct active status for active session", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isActive()).toBe(true);
    });

    it("should return correct active status for revoked session", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        new Date(),
        "test_reason",
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isActive()).toBe(false);
    });

    it("should return correct active status for expired session", () => {
      const expiresAt = new Date(mockNow.getTime() - 1000);
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isActive()).toBe(false);
    });

    it("should return correct active status for expired and revoked session", () => {
      const expiresAt = new Date(mockNow.getTime() - 1000);
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        new Date(),
        "test_reason",
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isActive()).toBe(false);
    });
  });

  describe("getters", () => {
    it("should return remaining time from expiration", () => {
      const expiresAt = new Date(mockNow.getTime() + 1800000);
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      const remaining = session.getRemainingTimeMs();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(1800000);
    });

    it("should return expiration date", () => {
      const expiresAt = new Date("2023-01-01T01:00:00.000Z");
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.getExpiresAt()).toEqual(expiresAt);
    });

    it("should return date copies for revokedAt", () => {
      const expiration = new Expiration(defaultExpiresAt);
      const revokedAt = new Date("2023-01-01T00:30:00.000Z");

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        revokedAt,
        "test_reason",
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      const revokedAtCopy = session.getRevokedAt();

      expect(revokedAtCopy).toEqual(revokedAt);
      expect(revokedAtCopy).not.toBe(revokedAt);
    });

    it("should return null for revokedAt when not revoked", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.getRevokedAt()).toBeNull();
    });

    it("should return date copies for createdAt", () => {
      const expiration = new Expiration(defaultExpiresAt);
      const createdAt = new Date("2023-01-01T00:00:00.000Z");

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        createdAt,
        mockSessionData.updatedAt,
      );

      const createdAtCopy = session.getCreatedAt();

      expect(createdAtCopy).toEqual(createdAt);
      expect(createdAtCopy).not.toBe(createdAt);
    });

    it("should return date copies for updatedAt", () => {
      const expiration = new Expiration(defaultExpiresAt);
      const updatedAt = new Date("2023-01-01T00:15:00.000Z");

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        updatedAt,
      );

      const updatedAtCopy = session.getUpdatedAt();

      expect(updatedAtCopy).toEqual(updatedAt);
      expect(updatedAtCopy).not.toBe(updatedAt);
    });

    it("should return all getters correctly", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.getId()).toBe(mockSessionData.id);
      expect(session.getTokenFingerprint()).toBe(mockSessionData.tokenFingerprint);
      expect(session.getTokenFamily()).toBe(mockSessionData.tokenFamily);
      expect(session.getUserId()).toBe(mockSessionData.userId);
      expect(session.getIpAddress()).toBe(mockSessionData.ipAddress);
      expect(session.getUserAgent()).toBe(mockSessionData.userAgent);
      expect(session.getDeviceId()).toBe(mockSessionData.deviceId);
    });
  });

  describe("Event emission", () => {
    it("should emit SessionCreatedEvent exactly once when creating a session", () => {
      const creationData: SessionCreationData = {
        id: mockSessionData.id,
        tokenFingerprint: mockSessionData.tokenFingerprint,
        tokenFamily: mockSessionData.tokenFamily,
        userId: mockSessionData.userId,
        expiresAt: defaultExpiresAt,
      };

      Session.create(creationData);

      expect(SessionCreatedEvent).toHaveBeenCalledTimes(1);
      expect(SessionCreatedEvent).toHaveBeenCalledWith(mockSessionData.id, mockSessionData.userId);
    });

    it("should emit SessionRevokedEvent exactly once when revoking an active session", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      session.revoke("test_reason");

      expect(SessionRevokedEvent).toHaveBeenCalledTimes(1);
    });

    it("should not emit any event when revoke fails due to expiration", () => {
      const expiresAt = new Date(mockNow.getTime() - 1000);
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(() => session.revoke("test_reason")).toThrow(SessionAlreadyExpiredException);
      expect(SessionRevokedEvent).not.toHaveBeenCalled();
    });

    it("should not emit any event when revoke fails due to already revoked", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        new Date(),
        "already_revoked",
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(() => session.revoke("test_reason")).toThrow(SessionAlreadyRevokedException);
      expect(SessionRevokedEvent).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases and state transitions", () => {
    it("should handle session that expires exactly at the current time", () => {
      const expiresAt = new Date(mockNow.getTime());
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isExpired()).toBe(true);
      expect(session.isActive()).toBe(false);
    });

    it("should handle session with very long duration", () => {
      const veryLongDuration = 365 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(mockNow.getTime() + veryLongDuration);
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isExpired()).toBe(false);
      expect(session.isActive()).toBe(true);

      const remaining = session.getRemainingTimeMs();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(veryLongDuration);
    });

    it("should handle session with zero duration", () => {
      const expiresAt = new Date(mockNow.getTime());
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      expect(session.isExpired()).toBe(true);
      expect(session.isActive()).toBe(false);
    });

    it("should handle revoke with very long reason string", () => {
      const expiration = new Expiration(defaultExpiresAt);
      const longReason = "a".repeat(10000);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      session.revoke(longReason);
      expect(session.getRevokeReason()).toBe(longReason);
    });

    it("should handle revoke with special characters in reason", () => {
      const expiration = new Expiration(defaultExpiresAt);
      const specialReason = 'User!@#$%^&*()_+{}|:"<>?~`';

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      session.revoke(specialReason);
      expect(session.getRevokeReason()).toBe(specialReason);
    });

    it("should handle multiple revoke attempts correctly", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      session.revoke("first_reason");
      expect(session.isRevoked()).toBe(true);
      expect(session.getRevokeReason()).toBe("first_reason");

      expect(() => session.revoke("second_reason")).toThrow(SessionAlreadyRevokedException);
      expect(session.getRevokeReason()).toBe("first_reason");
    });

    it("should preserve immutability of readonly fields", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      const originalId = session.getId();
      const originalTokenFingerprint = session.getTokenFingerprint();
      const originalTokenFamily = session.getTokenFamily();
      const originalUserId = session.getUserId();
      const originalUserAgent = session.getUserAgent();
      const originalIpAddress = session.getIpAddress();
      const originalDeviceId = session.getDeviceId();
      const originalCreatedAt = session.getCreatedAt();

      session.revoke("test");

      expect(session.getId()).toBe(originalId);
      expect(session.getTokenFingerprint()).toBe(originalTokenFingerprint);
      expect(session.getTokenFamily()).toBe(originalTokenFamily);
      expect(session.getUserId()).toBe(originalUserId);
      expect(session.getUserAgent()).toBe(originalUserAgent);
      expect(session.getIpAddress()).toBe(originalIpAddress);
      expect(session.getDeviceId()).toBe(originalDeviceId);
      expect(session.getCreatedAt()).toEqual(originalCreatedAt);
    });
  });

  describe("Exception scenarios", () => {
    it("should throw SessionAlreadyExpiredException with correct message", () => {
      const expiresAt = new Date(mockNow.getTime() - 1000);
      const expiration = new Expiration(expiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        null,
        null,
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      try {
        session.revoke("test");
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(SessionAlreadyExpiredException);
        expect((error as SessionAlreadyExpiredException).message).toBe("Session already expired");
      }
    });

    it("should throw SessionAlreadyRevokedException with correct message", () => {
      const expiration = new Expiration(defaultExpiresAt);

      const session = new Session(
        mockSessionData.id,
        mockSessionData.tokenFingerprint,
        mockSessionData.tokenFamily,
        mockSessionData.userId,
        expiration,
        new Date(),
        "already_revoked",
        mockSessionData.userAgent,
        mockSessionData.ipAddress,
        mockSessionData.deviceId,
        mockSessionData.createdAt,
        mockSessionData.updatedAt,
      );

      try {
        session.revoke("test");
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(SessionAlreadyRevokedException);
        expect((error as SessionAlreadyRevokedException).message).toBe("Session already revoked");
      }
    });
  });
});
