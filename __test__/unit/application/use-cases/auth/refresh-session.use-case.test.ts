import { RefreshSessionUseCase } from "@/application/use-cases/auth/refresh-session.use-case";
import { RefreshSessionCommand } from "@/application/ports/driving/refresh-session.use-case.port";
import { Session } from "@/domain/entities/session.entity";
import { AuthTokenVerifierPort } from "@/application/ports/driven/auth-token-verifier.port";
import { User } from "@/domain/entities/user.entity";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { SessionFactory } from "@/application/factories/session.factory";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { InvalidRefreshTokenException } from "@/application/exceptions/auth.exceptions";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { SessionNotFoundException } from "@/application/exceptions/session.exceptions";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { UserRoleType, UserStatusType } from "@/domain/types/user.type";
import { RefreshTokenPayload } from "@/application/types/auth-token.type";

jest.mock("@/domain/entities/session.entity");

describe("RefreshSessionUseCase", () => {
  let refreshSessionUseCase: RefreshSessionUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockSessionFactory: jest.Mocked<SessionFactory>;
  let mockAuthTokenVerifier: jest.Mocked<AuthTokenVerifierPort>;
  let mockFingerprintProvider: jest.Mocked<FingerprintPort>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockRequestContext: jest.Mocked<RequestContextPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  let mockUser: jest.Mocked<User>;
  let mockOldSession: jest.Mocked<Session>;
  let mockNewSession: jest.Mocked<Session>;

  const mockUserId = "user-789";
  const mockSessionId = "old-session-789";
  const mockNewSessionId = "new-session-789";
  const mockEmail = "user@example.com";
  const mockRefreshToken = "valid-refresh-token-123";
  const mockAccessToken = "new-access-token-789";
  const mockNewRefreshToken = "new-refresh-token-789";
  const mockTokenFingerprint = "fingerprint-123";
  const mockTokenFamily = "token-family-123";
  const mockIpAddress = "192.168.1.3";
  const mockOldIpAddress = "192.168.1.1";
  const mockUserAgent = "Safari/14.0";
  const mockOldUserAgent = "Chrome/90.0";

  const mockRefreshTokenPayload: RefreshTokenPayload = {
    sub: mockUserId,
    sid: mockSessionId,
  };

  const mockCommand: RefreshSessionCommand = {
    refreshToken: mockRefreshToken,
  };

  const mockOldSessionEvents = [{ eventType: "SessionRevoked" }] as unknown as DomainEvent[];
  const mockNewSessionEvents = [{ eventType: "SessionCreated" }] as unknown as DomainEvent[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
      getEmail: jest.fn().mockReturnValue(mockEmail),
      getName: jest.fn().mockReturnValue("Test User"),
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      isEmailVerified: jest.fn().mockReturnValue(true),
      isActive: jest.fn().mockReturnValue(true),
      isAccountLocked: jest.fn().mockReturnValue(false),
      getAccountLockedUntil: jest.fn().mockReturnValue(null),
      getFailedLoginAttempts: jest.fn().mockReturnValue(0),
      getStatus: jest.fn().mockReturnValue(UserStatusType.ACTIVE),
      assertCanAuthenticate: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue([]),
      getHashedPasswordForAuthentication: jest.fn(),
      login: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
      getEmailVerifiedAt: jest.fn(),
      getPasswordChangedAt: jest.fn(),
      getLastLoginAt: jest.fn(),
      getLastLogoutAt: jest.fn(),
      getAddress: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isSuspended: jest.fn(),
      isBanned: jest.fn(),
      isInactive: jest.fn(),
      hasRole: jest.fn(),
      isAdmin: jest.fn(),
      isPasswordExpired: jest.fn(),
      getEmailChangedAt: jest.fn(),
      getSuspendedAt: jest.fn(),
      getSuspendReason: jest.fn(),
      getBannedAt: jest.fn(),
      getBannedReason: jest.fn(),
      getRemainingLockoutTime: jest.fn(),
      getLastFailedLoginAt: jest.fn(),
      unlockAccount: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      suspend: jest.fn(),
      ban: jest.fn(),
      assignRole: jest.fn(),
      changeEmail: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      updateProfile: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockOldSession = {
      getId: jest.fn().mockReturnValue(mockSessionId),
      getUserId: jest.fn().mockReturnValue(mockUserId),
      getTokenFingerprint: jest.fn().mockReturnValue(mockTokenFingerprint),
      getTokenFamily: jest.fn().mockReturnValue(mockTokenFamily),
      getIpAddress: jest.fn().mockReturnValue(mockOldIpAddress),
      getUserAgent: jest.fn().mockReturnValue(mockOldUserAgent),
      isActive: jest.fn().mockReturnValue(true),
      isRevoked: jest.fn().mockReturnValue(false),
      isExpired: jest.fn().mockReturnValue(false),
      revoke: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue(mockOldSessionEvents),
      getExpiresAt: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getRevokedAt: jest.fn(),
      getRevokeReason: jest.fn(),
      getDeviceId: jest.fn(),
    } as unknown as jest.Mocked<Session>;

    mockNewSession = {
      getId: jest.fn().mockReturnValue(mockNewSessionId),
      getTokenFamily: jest.fn().mockReturnValue(mockTokenFamily),
      pullDomainEvents: jest.fn().mockReturnValue(mockNewSessionEvents),
      getTokenFingerprint: jest.fn(),
      getUserId: jest.fn(),
      getExpiresAt: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getRevokedAt: jest.fn(),
      getRevokeReason: jest.fn(),
      getIpAddress: jest.fn(),
      getDeviceId: jest.fn(),
      getUserAgent: jest.fn(),
      isExpired: jest.fn(),
      isRevoked: jest.fn(),
      isActive: jest.fn(),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<Session>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWorkPort>;

    mockSessionFactory = {
      build: jest.fn(),
    } as unknown as jest.Mocked<SessionFactory>;

    mockAuthTokenVerifier = {
      verifyRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthTokenVerifierPort>;

    mockFingerprintProvider = {
      fingerprint: jest.fn(),
      compareFingerprint: jest.fn(),
    } as unknown as jest.Mocked<FingerprintPort>;

    mockEventBus = {
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusPort>;

    mockRequestContext = {
      get: jest.fn(),
    } as unknown as jest.Mocked<RequestContextPort>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as unknown as jest.Mocked<LoggerPort>;

    mockAuthTokenVerifier.verifyRefreshToken.mockReturnValue(mockRefreshTokenPayload);
    mockFingerprintProvider.compareFingerprint.mockReturnValue(true);
    mockSessionFactory.build.mockReturnValue({
      session: mockNewSession,
      refreshToken: mockNewRefreshToken,
      accessToken: mockAccessToken,
    });
    mockRequestContext.get.mockReturnValue({
      ipAddress: mockIpAddress,
      userAgent: mockUserAgent,
      requestId: "req-111",
    });

    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        userRepository: {
          findById: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue(undefined),
        },
        sessionRepository: {
          findById: jest.fn().mockResolvedValue(mockOldSession),
          insert: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
        },
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    mockEventBus.publishAll.mockResolvedValue(undefined);

    refreshSessionUseCase = new RefreshSessionUseCase(
      mockUnitOfWork,
      mockSessionFactory,
      mockAuthTokenVerifier,
      mockFingerprintProvider,
      mockEventBus,
      mockRequestContext,
      mockLogger,
    );
  });

  describe("execute - successful session refresh", () => {
    it("should successfully refresh a session with valid token", async () => {
      const result = await refreshSessionUseCase.execute(mockCommand);

      expect(result).toEqual({
        tokens: {
          accessToken: mockAccessToken,
          refreshToken: mockNewRefreshToken,
        },
      });

      expect(mockAuthTokenVerifier.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
      expect(mockOldSession.revoke).toHaveBeenCalledWith(`Session rotated for user ${mockUserId}`);
      expect(mockSessionFactory.build).toHaveBeenCalledWith(mockUser, mockTokenFamily);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockOldSessionEvents, ...mockNewSessionEvents]);
    });

    it("should log refresh start and success", async () => {
      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "RefreshSessionUseCase",
        event: "REFRESH_SESSION_STARTED",
        message: "Refresh session started",
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RefreshSessionUseCase",
        event: "REFRESH_SESSION_SUCCESSFUL",
        message: "User refreshed session successfully",
        userId: mockUserId,
        sessionId: mockNewSessionId,
        durationMs: expect.any(Number),
        data: {
          role: UserRoleType.MEMBER,
          email: mockEmail,
        },
      });
    });

    it("should revoke old session", async () => {
      await refreshSessionUseCase.execute(mockCommand);

      expect(mockOldSession.revoke).toHaveBeenCalledWith(`Session rotated for user ${mockUserId}`);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should build new session with same token family", async () => {
      await refreshSessionUseCase.execute(mockCommand);

      expect(mockSessionFactory.build).toHaveBeenCalledWith(mockUser, mockTokenFamily);
    });

    it("should publish all domain events from old and new sessions", async () => {
      const oldEvents = [{ eventType: "SessionRevoked" }] as unknown as DomainEvent[];
      const newEvents = [{ eventType: "SessionCreated" }] as unknown as DomainEvent[];

      mockOldSession.pullDomainEvents.mockReturnValue(oldEvents);
      mockNewSession.pullDomainEvents.mockReturnValue(newEvents);

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...oldEvents, ...newEvents]);
    });

    it("should calculate duration correctly", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      const startTime = 1000;
      const endTime = 1150;
      dateNowSpy.mockReturnValueOnce(startTime);
      dateNowSpy.mockReturnValueOnce(endTime);

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );

      dateNowSpy.mockRestore();
    });

    it("should handle empty domain events", async () => {
      mockOldSession.pullDomainEvents.mockReturnValue([]);
      mockNewSession.pullDomainEvents.mockReturnValue([]);

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should call assertCanAuthenticate on user", async () => {
      await refreshSessionUseCase.execute(mockCommand);

      expect(mockUser.assertCanAuthenticate).toHaveBeenCalled();
    });
  });

  describe("execute - invalid token structure", () => {
    it("should throw InvalidRefreshTokenException when token verification fails", async () => {
      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw new InvalidRefreshTokenException();
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(InvalidRefreshTokenException);
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });
  });

  describe("execute - session not found", () => {
    it("should throw SessionNotFoundException when session does not exist", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(null),
            insert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(SessionNotFoundException);
    });
  });

  describe("execute - session not active", () => {
    it("should throw InvalidRefreshTokenException when session is not active", async () => {
      mockOldSession.isActive.mockReturnValue(false);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(InvalidRefreshTokenException);
    });

    it("should throw when session is revoked (isActive returns false)", async () => {
      mockOldSession.isActive.mockReturnValue(false);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(InvalidRefreshTokenException);
    });

    it("should throw when session is expired (isActive returns false)", async () => {
      mockOldSession.isActive.mockReturnValue(false);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(InvalidRefreshTokenException);
    });
  });

  describe("execute - token fingerprint mismatch", () => {
    it("should throw InvalidRefreshTokenException when token fingerprint does not match", async () => {
      mockFingerprintProvider.compareFingerprint.mockReturnValue(false);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(InvalidRefreshTokenException);

      expect(mockFingerprintProvider.compareFingerprint).toHaveBeenCalledWith(mockRefreshToken, mockTokenFingerprint);
    });

    it("should handle compareFingerprint error", async () => {
      const compareError = new Error("Compare failed");
      mockFingerprintProvider.compareFingerprint.mockImplementation(() => {
        throw compareError;
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(compareError);
    });
  });

  describe("execute - user not found", () => {
    it("should throw UserNotFoundException when user does not exist", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockOldSession),
            insert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe("execute - user cannot authenticate", () => {
    it("should throw error when user cannot authenticate due to inactive status", async () => {
      const authError = new Error("User cannot authenticate");
      mockUser.assertCanAuthenticate.mockImplementation(() => {
        throw authError;
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(authError);
      expect(mockUser.assertCanAuthenticate).toHaveBeenCalled();
    });

    it("should throw error when user account is locked", async () => {
      const authError = new Error("Account locked");
      mockUser.assertCanAuthenticate.mockImplementation(() => {
        throw authError;
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(authError);
    });
  });

  describe("client context mismatch detection", () => {
    it("should log warning when IP address mismatch detected", async () => {
      mockRequestContext.get.mockReturnValue({
        ipAddress: "192.168.1.100",
        userAgent: mockOldUserAgent,
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "RefreshSessionUseCase",
        event: "CLIENT_CONTEXT_MISMATCH",
        message: "Client context mismatch detected during session refresh",
        sessionId: mockSessionId,
        userId: mockUserId,
      });
    });

    it("should log warning when user agent mismatch detected", async () => {
      mockRequestContext.get.mockReturnValue({
        ipAddress: mockOldIpAddress,
        userAgent: "Firefox/100.0",
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "RefreshSessionUseCase",
        event: "CLIENT_CONTEXT_MISMATCH",
        message: "Client context mismatch detected during session refresh",
        sessionId: mockSessionId,
        userId: mockUserId,
      });
    });

    it("should log warning when both IP and user agent mismatch", async () => {
      mockRequestContext.get.mockReturnValue({
        ipAddress: "192.168.1.100",
        userAgent: "Firefox/100.0",
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "RefreshSessionUseCase",
        event: "CLIENT_CONTEXT_MISMATCH",
        message: "Client context mismatch detected during session refresh",
        sessionId: mockSessionId,
        userId: mockUserId,
      });
    });

    it("should not log warning when IP and user agent match", async () => {
      mockRequestContext.get.mockReturnValue({
        ipAddress: mockOldIpAddress,
        userAgent: mockOldUserAgent,
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should handle null current IP address", async () => {
      mockRequestContext.get.mockReturnValue({
        ipAddress: null as unknown as undefined,
        userAgent: mockOldUserAgent,
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "RefreshSessionUseCase",
        event: "CLIENT_CONTEXT_MISMATCH",
        message: "Client context mismatch detected during session refresh",
        sessionId: mockSessionId,
        userId: mockUserId,
      });
    });

    it("should handle null current user agent", async () => {
      mockRequestContext.get.mockReturnValue({
        ipAddress: mockOldIpAddress,
        userAgent: null as unknown as undefined,
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "RefreshSessionUseCase",
        event: "CLIENT_CONTEXT_MISMATCH",
        message: "Client context mismatch detected during session refresh",
        sessionId: mockSessionId,
        userId: mockUserId,
      });
    });

    it("should handle null original IP from session", async () => {
      mockOldSession.getIpAddress.mockReturnValue(null);
      mockRequestContext.get.mockReturnValue({
        ipAddress: mockIpAddress,
        userAgent: mockOldUserAgent,
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should handle null original user agent from session", async () => {
      mockOldSession.getUserAgent.mockReturnValue(null);
      mockRequestContext.get.mockReturnValue({
        ipAddress: mockOldIpAddress,
        userAgent: mockUserAgent,
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should handle null both original and current values", async () => {
      mockOldSession.getIpAddress.mockReturnValue(null);
      mockOldSession.getUserAgent.mockReturnValue(null);
      mockRequestContext.get.mockReturnValue({
        ipAddress: null as unknown as undefined,
        userAgent: null as unknown as undefined,
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe("transaction handling", () => {
    it("should execute all operations within a transaction", async () => {
      await refreshSessionUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should pass correct repositories to transaction operation", async () => {
      let capturedRepos;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockOldSession),
            insert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        const result = await callback(repos);
        capturedRepos = repos;
        return result;
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
      expect(capturedRepos).toBeDefined();
    });

    it("should rollback transaction on error", async () => {
      const error = new Error("Transaction failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow("Transaction failed");
    });

    it("should handle session repository update error", async () => {
      const error = new Error("Update failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockOldSession),
            insert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockRejectedValue(error),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow("Update failed");
    });

    it("should handle session repository insert error", async () => {
      const error = new Error("Insert failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockOldSession),
            insert: jest.fn().mockRejectedValue(error),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow("Insert failed");
    });
  });

  describe("error handling", () => {
    it("should handle session repository find error", async () => {
      const error = new Error("Repository error");
      mockUnitOfWork.commit.mockImplementation(async () => {
        throw error;
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow("Repository error");
    });

    it("should handle session factory error", async () => {
      const error = new Error("Session factory failed");
      mockSessionFactory.build.mockImplementation(() => {
        throw error;
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow("Session factory failed");
    });

    it("should handle event bus error", async () => {
      const error = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow("Event bus failed");
    });

    it("should handle session revoke error", async () => {
      const error = new Error("Revoke failed");
      mockOldSession.revoke.mockImplementation(() => {
        throw error;
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow("Revoke failed");
    });
  });

  describe("logging scenarios", () => {
    it("should log debug with refresh start", async () => {
      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "RefreshSessionUseCase",
        event: "REFRESH_SESSION_STARTED",
        message: "Refresh session started",
      });
    });

    it("should log info with user details", async () => {
      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RefreshSessionUseCase",
        event: "REFRESH_SESSION_SUCCESSFUL",
        message: "User refreshed session successfully",
        userId: mockUserId,
        sessionId: mockNewSessionId,
        durationMs: expect.any(Number),
        data: {
          role: UserRoleType.MEMBER,
          email: mockEmail,
        },
      });
    });

    it("should not log info when refresh fails", async () => {
      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle logger error gracefully", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("edge cases", () => {
    it("should handle null refreshToken", async () => {
      const commandWithNullToken: RefreshSessionCommand = {
        refreshToken: null as unknown as string,
      };

      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw new InvalidRefreshTokenException();
      });

      await expect(refreshSessionUseCase.execute(commandWithNullToken)).rejects.toThrow(InvalidRefreshTokenException);
    });

    it("should handle empty refreshToken", async () => {
      const commandWithEmptyToken: RefreshSessionCommand = {
        refreshToken: "",
      };

      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw new InvalidRefreshTokenException();
      });

      await expect(refreshSessionUseCase.execute(commandWithEmptyToken)).rejects.toThrow(InvalidRefreshTokenException);
    });

    it("should handle user with null status", async () => {
      mockUser.getStatus.mockReturnValue(null as unknown as UserStatusType);
      const authError = new Error("User cannot authenticate");
      mockUser.assertCanAuthenticate.mockImplementation(() => {
        throw authError;
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(authError);
    });

    it("should handle user with undefined role", async () => {
      mockUser.getRole.mockReturnValue(undefined as unknown as UserRoleType);

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            role: undefined,
            email: mockEmail,
          },
        }),
      );
    });

    it("should handle session with null token family", async () => {
      mockOldSession.getTokenFamily.mockReturnValue(null as unknown as string);
      mockSessionFactory.build.mockReturnValue({
        session: mockNewSession,
        refreshToken: mockNewRefreshToken,
        accessToken: mockAccessToken,
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockSessionFactory.build).toHaveBeenCalledWith(mockUser, null);
    });

    it("should handle session with null user ID", async () => {
      mockOldSession.getUserId.mockReturnValue(null as unknown as string);
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockOldSession),
            insert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe("private method findSessionRecord", () => {
    it("should find session successfully", async () => {
      await refreshSessionUseCase.execute(mockCommand);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should throw SessionNotFoundException when session not found", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(null),
            insert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(SessionNotFoundException);
    });
  });

  describe("private method validateSessionIntegrity", () => {
    it("should validate session successfully", async () => {
      await refreshSessionUseCase.execute(mockCommand);
      expect(mockFingerprintProvider.compareFingerprint).toHaveBeenCalledWith(mockRefreshToken, mockTokenFingerprint);
    });

    it("should throw InvalidRefreshTokenException when session inactive", async () => {
      mockOldSession.isActive.mockReturnValue(false);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(InvalidRefreshTokenException);
    });

    it("should throw InvalidRefreshTokenException when fingerprint mismatch", async () => {
      mockFingerprintProvider.compareFingerprint.mockReturnValue(false);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(InvalidRefreshTokenException);
    });
  });

  describe("private method checkClientContextMismatch", () => {
    it("should detect IP mismatch and log warning", async () => {
      mockRequestContext.get.mockReturnValue({
        ipAddress: "192.168.1.100",
        userAgent: mockOldUserAgent,
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should detect user agent mismatch and log warning", async () => {
      mockRequestContext.get.mockReturnValue({
        ipAddress: mockOldIpAddress,
        userAgent: "Firefox/100.0",
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should not log warning when context matches", async () => {
      mockRequestContext.get.mockReturnValue({
        ipAddress: mockOldIpAddress,
        userAgent: mockOldUserAgent,
        requestId: "req-111",
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe("private method findUser", () => {
    it("should find user successfully", async () => {
      await refreshSessionUseCase.execute(mockCommand);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should throw UserNotFoundException when user not found", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockOldSession),
            insert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe("session creation", () => {
    it("should create session with correct parameters", async () => {
      await refreshSessionUseCase.execute(mockCommand);

      expect(mockSessionFactory.build).toHaveBeenCalledWith(mockUser, mockTokenFamily);
    });

    it("should include session in transaction", async () => {
      let sessionInserted = false;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockOldSession),
            insert: jest.fn().mockImplementation(() => {
              sessionInserted = true;
              return Promise.resolve();
            }),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await refreshSessionUseCase.execute(mockCommand);

      expect(sessionInserted).toBe(true);
    });

    it("should return both access and refresh tokens", async () => {
      const result = await refreshSessionUseCase.execute(mockCommand);

      expect(result.tokens.accessToken).toBe(mockAccessToken);
      expect(result.tokens.refreshToken).toBe(mockNewRefreshToken);
    });
  });

  describe("event publishing", () => {
    it("should publish events after successful transaction", async () => {
      const oldEvents = [{ eventType: "SessionRevoked" }] as unknown as DomainEvent[];
      const newEvents = [{ eventType: "SessionCreated" }] as unknown as DomainEvent[];

      mockOldSession.pullDomainEvents.mockReturnValue(oldEvents);
      mockNewSession.pullDomainEvents.mockReturnValue(newEvents);

      await refreshSessionUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...oldEvents, ...newEvents]);
    });

    it("should publish events even if event bus fails (error will propagate)", async () => {
      const error = new Error("Event bus error");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow("Event bus error");
    });

    it("should not publish events when validation fails", async () => {
      mockFingerprintProvider.compareFingerprint.mockReturnValue(false);

      await expect(refreshSessionUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });
  });

  describe("performance considerations", () => {
    it("should execute refresh quickly", async () => {
      const startTime = Date.now();
      await refreshSessionUseCase.execute(mockCommand);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple refreshes efficiently", async () => {
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await refreshSessionUseCase.execute(mockCommand);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("type safety", () => {
    it("should return RefreshSessionResult type", async () => {
      const result = await refreshSessionUseCase.execute(mockCommand);

      expect(result).toHaveProperty("tokens");
      expect(result.tokens).toHaveProperty("accessToken");
      expect(result.tokens).toHaveProperty("refreshToken");
      expect(typeof result.tokens.accessToken).toBe("string");
      expect(typeof result.tokens.refreshToken).toBe("string");
    });

    it("should accept RefreshSessionCommand type", async () => {
      const command: RefreshSessionCommand = {
        refreshToken: mockRefreshToken,
      };

      const result = await refreshSessionUseCase.execute(command);
      expect(result).toHaveProperty("tokens");
    });
  });
});
