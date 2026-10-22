import { LogoutUseCase } from "@/application/use-cases/auth/logout.use-case";
import { LogoutCommand } from "@/application/ports/driving/logout.use-case.port";
import { RefreshTokenPayload } from "@/application/types/auth-token.type";
import { AuthTokenVerifierPort } from "@/application/ports/driven/auth-token-verifier.port";
import { Session } from "@/domain/entities/session.entity";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { User } from "@/domain/entities/user.entity";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { SessionNotFoundException } from "@/application/exceptions/session.exceptions";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { UserRoleType } from "@/domain/types/user.type";

jest.mock("@/domain/entities/session.entity");

describe("LogoutUseCase", () => {
  let logoutUseCase: LogoutUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockAuthTokenVerifier: jest.Mocked<AuthTokenVerifierPort>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockRequestContext: jest.Mocked<RequestContextPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  let mockUser: jest.Mocked<User>;
  let mockSession: jest.Mocked<Session>;

  const mockUserId = "user-111";
  const mockSessionId = "session-111";
  const mockEmail = "user@example.com";
  const mockRefreshToken = "valid-refresh-token-123";
  const mockIpAddress = "192.168.1.11";
  const mockUserAgent = "Chrome/110.0 (Windows NT 10.0; Win64; x64)";

  const mockRefreshTokenPayload: RefreshTokenPayload = {
    sub: mockUserId,
    sid: mockSessionId,
  };

  const mockCommand: LogoutCommand = {
    refreshToken: mockRefreshToken,
  };

  const mockUserEvents = [{ eventType: "UserLoggedOut" }] as unknown as DomainEvent[];
  const mockSessionEvents = [{ eventType: "SessionRevoked" }] as unknown as DomainEvent[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
      getEmail: jest.fn().mockReturnValue(mockEmail),
      getName: jest.fn().mockReturnValue("Test User"),
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      logout: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue(mockUserEvents),
      isEmailVerified: jest.fn(),
      isActive: jest.fn(),
      isAccountLocked: jest.fn(),
      getAccountLockedUntil: jest.fn(),
      getFailedLoginAttempts: jest.fn(),
      getStatus: jest.fn(),
      assertCanAuthenticate: jest.fn(),
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

    mockSession = {
      getId: jest.fn().mockReturnValue(mockSessionId),
      getUserId: jest.fn().mockReturnValue(mockUserId),
      revoke: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue(mockSessionEvents),
      getTokenFingerprint: jest.fn(),
      getTokenFamily: jest.fn(),
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
    } as unknown as jest.Mocked<Session>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWorkPort>;

    mockAuthTokenVerifier = {
      verifyRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthTokenVerifierPort>;

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
    mockRequestContext.get.mockReturnValue({
      requestId: "req-111",
      ipAddress: mockIpAddress,
      userAgent: mockUserAgent,
    });

    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        userRepository: {
          findById: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue(undefined),
        },
        sessionRepository: {
          findById: jest.fn().mockResolvedValue(mockSession),
          update: jest.fn().mockResolvedValue(undefined),
        },
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    mockEventBus.publishAll.mockResolvedValue(undefined);

    logoutUseCase = new LogoutUseCase(mockUnitOfWork, mockAuthTokenVerifier, mockEventBus, mockRequestContext, mockLogger);
  });

  describe("execute - successful logout", () => {
    it("should successfully logout with valid token", async () => {
      const result = await logoutUseCase.execute(mockCommand);

      expect(result).toBeUndefined();

      expect(mockAuthTokenVerifier.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
      expect(mockSession.revoke).toHaveBeenCalled();
      expect(mockUser.logout).toHaveBeenCalled();
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockUserEvents, ...mockSessionEvents]);
    });

    it("should log logout start and success", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "LogoutUseCase",
        event: "LOGOUT_STARTED",
        message: "Logout process started",
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "LogoutUseCase",
        event: "LOGOUT_SUCCESSFUL",
        message: "User logged out successfully",
        userId: mockUserId,
        sessionId: mockSessionId,
        durationMs: expect.any(Number),
      });
    });

    it("should revoke session with detailed reason", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining(`User-initiated logout (IP: ${mockIpAddress}`));
    });

    it("should truncate long user agents in revoke reason", async () => {
      const longUserAgent = "A".repeat(100);

      mockRequestContext.get.mockReturnValue({
        ipAddress: mockIpAddress,
        userAgent: longUserAgent,
        requestId: "req-111",
      });

      await logoutUseCase.execute(mockCommand);

      const revokeReason = mockSession.revoke.mock.calls[0][0];
      expect(revokeReason).toContain(`UA: ${"A".repeat(50)}...`);
      expect(revokeReason).not.toContain(`UA: ${"A".repeat(51)}`);
    });

    it("should call user logout method", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockUser.logout).toHaveBeenCalledTimes(1);
    });

    it("should update both user and session concurrently using Promise.all", async () => {
      let userUpdateCalled = false;
      let sessionUpdateCalled = false;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockImplementation(() => {
              userUpdateCalled = true;
              return Promise.resolve(undefined);
            }),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockSession),
            update: jest.fn().mockImplementation(() => {
              sessionUpdateCalled = true;
              return Promise.resolve(undefined);
            }),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await logoutUseCase.execute(mockCommand);

      expect(userUpdateCalled).toBe(true);
      expect(sessionUpdateCalled).toBe(true);
    });

    it("should publish domain events from user and session", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockUserEvents, ...mockSessionEvents]);
    });

    it("should handle empty domain events", async () => {
      mockUser.pullDomainEvents.mockReturnValue([]);
      mockSession.pullDomainEvents.mockReturnValue([]);

      await logoutUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should calculate duration correctly", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      const startTime = 1000;
      const endTime = 1150;
      dateNowSpy.mockReturnValueOnce(startTime);
      dateNowSpy.mockReturnValueOnce(endTime);

      await logoutUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );

      dateNowSpy.mockRestore();
    });
  });

  describe("execute - invalid refresh token", () => {
    it("should throw error when token verification fails", async () => {
      const verificationError = new Error("Token expired");
      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw verificationError;
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow(verificationError);
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should handle null token verification", async () => {
      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow("Invalid token");
    });
  });

  describe("execute - session not found", () => {
    it("should throw SessionNotFoundException when session does not exist", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow(SessionNotFoundException);
    });

    it("should not proceed to user lookup if session not found", async () => {
      let userLookupCalled = false;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockImplementation(() => {
              userLookupCalled = true;
              return Promise.resolve(mockUser);
            }),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow(SessionNotFoundException);
      expect(userLookupCalled).toBe(false);
    });
  });

  describe("execute - user not found", () => {
    it("should throw UserNotFoundException when user does not exist", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockSession),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);
    });

    it("should not proceed to logout if user not found", async () => {
      let sessionRevoked = false;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockSession),
            update: jest.fn().mockImplementation(() => {
              sessionRevoked = true;
              return Promise.resolve(undefined);
            }),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);
      expect(sessionRevoked).toBe(false);
    });
  });

  describe("transaction handling", () => {
    it("should execute all operations within a transaction", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should pass correct repositories to transaction operation", async () => {
      let capturedRepos;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockSession),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        const result = await callback(repos);
        capturedRepos = repos;
        return result;
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
      expect(capturedRepos).toBeDefined();
    });

    it("should handle transaction rollback on error", async () => {
      const error = new Error("Transaction failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow("Transaction failed");
    });
  });

  describe("token verification", () => {
    it("should verify refresh token before processing", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockAuthTokenVerifier.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
    });

    it("should extract session ID from refresh token payload", async () => {
      const customPayload = {
        sub: "custom-user-999",
        sid: "custom-session-999",
      };

      mockAuthTokenVerifier.verifyRefreshToken.mockReturnValue(customPayload);
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockImplementation((id) => {
              expect(id).toBe("custom-session-999");
              return Promise.resolve(mockSession);
            }),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });
  });

  describe("validation flow", () => {
    it("should validate in correct order: verify token -> find session -> find user -> logout", async () => {
      const callOrder: string[] = [];

      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        callOrder.push("verifyToken");
        return mockRefreshTokenPayload;
      });

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockImplementation(() => {
              callOrder.push("findUser");
              return Promise.resolve(mockUser);
            }),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockImplementation(() => {
              callOrder.push("findSession");
              return Promise.resolve(mockSession);
            }),
            update: jest.fn().mockImplementation(() => {
              callOrder.push("updateSession");
              return Promise.resolve(undefined);
            }),
          },
        } as unknown as UnitOfWorkRepositories;
        const result = await callback(repos);
        callOrder.push("callbackComplete");
        return result;
      });

      mockEventBus.publishAll.mockImplementation(() => {
        callOrder.push("publishEvents");
        return Promise.resolve(undefined);
      });

      await logoutUseCase.execute(mockCommand);

      expect(callOrder).toContain("verifyToken");
      expect(callOrder.indexOf("verifyToken")).toBeLessThan(callOrder.indexOf("findSession"));
      expect(callOrder.indexOf("findSession")).toBeLessThan(callOrder.indexOf("findUser"));
    });
  });

  describe("session revocation reason", () => {
    it("should include IP address in revoke reason", async () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: "10.0.0.1",
        userAgent: mockUserAgent,
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining("IP: 10.0.0.1"));
    });

    it("should include user agent in revoke reason", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining(`UA: ${mockUserAgent.substring(0, 50)}`));
    });

    it("should truncate user agent to 50 characters in revoke reason", async () => {
      const longUserAgent = "B".repeat(100);
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: mockIpAddress,
        userAgent: longUserAgent,
      });

      await logoutUseCase.execute(mockCommand);

      const expectedUA = longUserAgent.substring(0, 50);
      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining(`UA: ${expectedUA}...`));
    });

    it("should handle undefined user agent gracefully", async () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: mockIpAddress,
        userAgent: undefined,
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining("UA: undefined"));
    });

    it("should handle null user agent", async () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: mockIpAddress,
        userAgent: null as unknown as undefined,
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining("UA: null"));
    });

    it("should handle empty user agent", async () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: mockIpAddress,
        userAgent: "",
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining("UA: ..."));
    });

    it("should handle undefined IP address", async () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: undefined,
        userAgent: mockUserAgent,
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining("IP: undefined"));
    });

    it("should handle null IP address", async () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: null as unknown as undefined,
        userAgent: mockUserAgent,
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining("IP: null"));
    });

    it("should handle user agent exactly 50 characters", async () => {
      const userAgent50Chars = "A".repeat(50);
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: mockIpAddress,
        userAgent: userAgent50Chars,
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining(`UA: ${userAgent50Chars}`));
    });

    it("should handle special characters in user agent", async () => {
      const specialUserAgent = "Mozilla/5.0 (特殊字符) Chrome/100 🔥";
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: mockIpAddress,
        userAgent: specialUserAgent,
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining(`UA: ${specialUserAgent.substring(0, 50)}`));
    });
  });

  describe("edge cases", () => {
    it("should handle undefined refreshToken", async () => {
      const commandWithNullToken: LogoutCommand = {
        refreshToken: null as unknown as string,
      };

      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(logoutUseCase.execute(commandWithNullToken)).rejects.toThrow("Invalid token");
    });

    it("should handle empty refreshToken", async () => {
      const commandWithEmptyToken: LogoutCommand = {
        refreshToken: "",
      };

      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(logoutUseCase.execute(commandWithEmptyToken)).rejects.toThrow("Invalid token");
    });

    it("should handle user with null role", async () => {
      mockUser.getRole.mockReturnValue(null as unknown as UserRoleType);

      await logoutUseCase.execute(mockCommand);

      expect(mockUser.logout).toHaveBeenCalled();
    });

    it("should handle session revoke with empty reason", async () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: "",
        userAgent: "",
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining("IP: , UA: ..."));
    });
  });

  describe("error handling", () => {
    it("should handle user repository find error", async () => {
      const error = new Error("Repository error");
      mockUnitOfWork.commit.mockImplementation(async () => {
        throw error;
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow("Repository error");
    });

    it("should handle session repository update error", async () => {
      const updateError = new Error("Update failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockSession),
            update: jest.fn().mockRejectedValue(updateError),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow("Update failed");
    });

    it("should handle user repository update error", async () => {
      const updateError = new Error("User update failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockRejectedValue(updateError),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockSession),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow("User update failed");
    });

    it("should handle event bus error", async () => {
      const error = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow("Event bus failed");
    });

    it("should handle session revoke error", async () => {
      const error = new Error("Revoke failed");
      mockSession.revoke.mockImplementation(() => {
        throw error;
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow("Revoke failed");
    });

    it("should handle logger error gracefully", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("logging scenarios", () => {
    it("should log debug without parameters", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "LogoutUseCase",
        event: "LOGOUT_STARTED",
        message: "Logout process started",
      });
    });

    it("should log info with user ID and session ID", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "LogoutUseCase",
        event: "LOGOUT_SUCCESSFUL",
        message: "User logged out successfully",
        userId: mockUserId,
        sessionId: mockSessionId,
        durationMs: expect.any(Number),
      });
    });

    it("should not log info when logout fails", async () => {
      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("private method findSessionRecord", () => {
    it("should find session successfully", async () => {
      await logoutUseCase.execute(mockCommand);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should throw SessionNotFoundException when session not found", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow(SessionNotFoundException);
    });
  });

  describe("private method findUserById", () => {
    it("should find user successfully", async () => {
      await logoutUseCase.execute(mockCommand);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should throw UserNotFoundException when user not found", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            findById: jest.fn().mockResolvedValue(mockSession),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe("private method performLogout", () => {
    it("should revoke session with reason", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalled();
      expect(mockUser.logout).toHaveBeenCalled();
    });

    it("should call user logout", async () => {
      await logoutUseCase.execute(mockCommand);

      expect(mockUser.logout).toHaveBeenCalledTimes(1);
    });

    it("should use request context for revoke reason", async () => {
      const customIp = "192.168.1.200";
      const customUserAgent = "Firefox/100.0";

      mockRequestContext.get.mockReturnValue({
        requestId: "req-111",
        ipAddress: customIp,
        userAgent: customUserAgent,
      });

      await logoutUseCase.execute(mockCommand);

      expect(mockSession.revoke).toHaveBeenCalledWith(expect.stringContaining(`IP: ${customIp}, UA: ${customUserAgent.substring(0, 50)}`));
    });
  });

  describe("event publishing", () => {
    it("should publish events after successful transaction", async () => {
      const userEvents = [{ eventType: "UserLoggedOut" }] as unknown as DomainEvent[];
      const sessionEvents = [{ eventType: "SessionRevoked" }] as unknown as DomainEvent[];

      mockUser.pullDomainEvents.mockReturnValue(userEvents);
      mockSession.pullDomainEvents.mockReturnValue(sessionEvents);

      await logoutUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...userEvents, ...sessionEvents]);
    });

    it("should publish events even if event bus fails (error will propagate)", async () => {
      const error = new Error("Event bus error");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow("Event bus error");
    });

    it("should not publish events when validation fails", async () => {
      mockAuthTokenVerifier.verifyRefreshToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(logoutUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });
  });

  describe("performance considerations", () => {
    it("should execute logout quickly", async () => {
      const startTime = Date.now();
      await logoutUseCase.execute(mockCommand);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple logouts efficiently", async () => {
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await logoutUseCase.execute(mockCommand);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("type safety", () => {
    it("should return Promise<void> from execute", async () => {
      const result = logoutUseCase.execute(mockCommand);

      expect(result).toBeInstanceOf(Promise);
    });

    it("should accept LogoutCommand type", async () => {
      const command: LogoutCommand = {
        refreshToken: mockRefreshToken,
      };

      await logoutUseCase.execute(command);
      expect(mockAuthTokenVerifier.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
    });
  });
});
