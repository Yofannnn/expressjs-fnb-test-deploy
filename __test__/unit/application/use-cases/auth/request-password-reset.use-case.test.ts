import { RequestPasswordResetUseCase } from "@/application/use-cases/auth/request-password-reset.use-case";
import { RequestPasswordResetCommand } from "@/application/ports/driving/request-password-reset.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { User } from "@/domain/entities/user.entity";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { TimeUtil } from "@/utils/time.util";
import { PasswordResetPolicy } from "@/domain/policies/password-reset.policy";
import { ResetTokenRateLimitExceededException } from "@/application/exceptions/application-token.exceptions";
import { PasswordResetToken } from "@/domain/entities/application-token.entity";
import { UserRoleType } from "@/domain/types/user.type";
import { DomainEvent } from "@/domain/types/domain-event.type";

jest.mock("@/domain/entities/application-token.entity");
jest.mock("@/utils/time.util");

describe("RequestPasswordResetUseCase", () => {
  let requestPasswordResetUseCase: RequestPasswordResetUseCase;
  let mockPasswordResetPolicy: jest.Mocked<PasswordResetPolicy>;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockApplicationTokenFactory: jest.Mocked<ApplicationTokenFactory>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  let mockUser: jest.Mocked<User>;
  let mockPasswordResetToken: jest.Mocked<PasswordResetToken>;

  const mockUserId = "user-555";
  const mockEmail = "user@example.com";
  const mockTokenId = "token-555";
  const mockMaxResendAttempts = 5;
  const mockCooldownSeconds = 120;
  const mockTokenEvents = [{ eventType: "PASSWORD_RESET_TOKEN_ISSUED" }] as unknown as DomainEvent[];

  const mockCommand: RequestPasswordResetCommand = {
    email: mockEmail,
  };

  let mockLastToken: jest.Mocked<PasswordResetToken>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
      getEmail: jest.fn().mockReturnValue(mockEmail),
      getName: jest.fn().mockReturnValue("Test User"),
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      isEmailVerified: jest.fn().mockReturnValue(true),
      pullDomainEvents: jest.fn().mockReturnValue([]),
      getEmailVerifiedAt: jest.fn(),
      getPasswordChangedAt: jest.fn(),
      getLastLoginAt: jest.fn(),
      getLastLogoutAt: jest.fn(),
      getAddress: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isActive: jest.fn(),
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
      getAccountLockedUntil: jest.fn(),
      getFailedLoginAttempts: jest.fn(),
      getRemainingLockoutTime: jest.fn(),
      getLastFailedLoginAt: jest.fn(),
      isAccountLocked: jest.fn(),
      getStatus: jest.fn(),
      getHashedPasswordForAuthentication: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
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
      assertCanAuthenticate: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockPasswordResetToken = {
      getId: jest.fn().mockReturnValue(mockTokenId),
      pullDomainEvents: jest.fn().mockReturnValue(mockTokenEvents),
      getCreatedAt: jest.fn().mockReturnValue(new Date()),
      getTokenFingerprint: jest.fn(),
      getIdentifier: jest.fn(),
      getUserId: jest.fn(),
      getType: jest.fn(),
      getExpiresAt: jest.fn(),
      getUsedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getTokenStatus: jest.fn(),
      isExpired: jest.fn(),
      isUsed: jest.fn(),
      getTokenMetadata: jest.fn(),
      use: jest.fn(),
    } as unknown as jest.Mocked<PasswordResetToken>;

    mockLastToken = {
      getId: jest.fn().mockReturnValue("last-token-444"),
      getCreatedAt: jest.fn().mockReturnValue(new Date(Date.now() - 60 * 1000)),
      pullDomainEvents: jest.fn().mockReturnValue([]),
      getTokenFingerprint: jest.fn(),
      getIdentifier: jest.fn(),
      getUserId: jest.fn(),
      getType: jest.fn(),
      getExpiresAt: jest.fn(),
      getUsedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getTokenStatus: jest.fn(),
      isExpired: jest.fn(),
      isUsed: jest.fn(),
      getTokenMetadata: jest.fn(),
      use: jest.fn(),
    } as unknown as jest.Mocked<PasswordResetToken>;

    mockPasswordResetPolicy = {
      maxResendAttemptsPerHour: mockMaxResendAttempts,
      resendCooldownInSeconds: mockCooldownSeconds,
      expiryInMinutes: 15,
    } as jest.Mocked<PasswordResetPolicy>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWorkPort>;

    mockApplicationTokenFactory = {
      issuePasswordReset: jest.fn(),
      issueVerificationEmail: jest.fn(),
      reissueVerificationEmail: jest.fn(),
      issueGuestOrderManagement: jest.fn(),
      reissueGuestOrderManagement: jest.fn(),
    } as unknown as jest.Mocked<ApplicationTokenFactory>;

    mockEventBus = {
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusPort>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as unknown as jest.Mocked<LoggerPort>;

    (TimeUtil.hoursToMs as jest.Mock).mockReturnValue(3600000);

    mockApplicationTokenFactory.issuePasswordReset.mockReturnValue(mockPasswordResetToken);
    mockEventBus.publishAll.mockResolvedValue(undefined);

    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        userRepository: {
          findByEmail: jest.fn().mockResolvedValue(mockUser),
        },
        applicationTokenRepository: {
          countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
          findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
          invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
          insert: jest.fn().mockResolvedValue(undefined),
        },
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    requestPasswordResetUseCase = new RequestPasswordResetUseCase(
      mockPasswordResetPolicy,
      mockUnitOfWork,
      mockApplicationTokenFactory,
      mockEventBus,
      mockLogger,
    );
  });

  describe("execute - successful password reset request", () => {
    it("should successfully process password reset request", async () => {
      const result = await requestPasswordResetUseCase.execute(mockCommand);

      expect(result).toBeUndefined();

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalledWith(mockUser);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith(mockTokenEvents);
    });

    it("should log request start and success", async () => {
      await requestPasswordResetUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "RequestPasswordResetUseCase",
        event: "REQUEST_PASSWORD_RESET_STARTED",
        message: "Request password reset started",
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RequestPasswordResetUseCase",
        event: "REQUEST_PASSWORD_RESET_SUCCESSFUL",
        message: "User requested password reset successfully",
        durationMs: expect.any(Number),
        data: {
          email: mockEmail,
        },
      });
    });

    it("should invalidate existing password reset tokens before creating new one", async () => {
      let invalidateCalled = false;
      let insertCalled = false;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockImplementation(() => {
              invalidateCalled = true;
              return Promise.resolve(undefined);
            }),
            insert: jest.fn().mockImplementation(() => {
              insertCalled = true;
              return Promise.resolve(undefined);
            }),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await requestPasswordResetUseCase.execute(mockCommand);

      expect(invalidateCalled).toBe(true);
      expect(insertCalled).toBe(true);
    });

    it("should invalidate with correct token type and identifier", async () => {
      let invalidateType: ApplicationTokenType | undefined;
      let invalidateIdentifier: string | undefined;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockImplementation((type, identifier) => {
              invalidateType = type;
              invalidateIdentifier = identifier;
              return Promise.resolve(undefined);
            }),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await requestPasswordResetUseCase.execute(mockCommand);

      expect(invalidateType).toBe(ApplicationTokenType.PASSWORD_RESET);
      expect(invalidateIdentifier).toBe(mockEmail);
    });

    it("should publish domain events from token", async () => {
      await requestPasswordResetUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith(mockTokenEvents);
    });

    it("should handle empty domain events", async () => {
      mockPasswordResetToken.pullDomainEvents.mockReturnValue([]);

      await requestPasswordResetUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should calculate duration correctly", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      const startTime = 1000;
      const endTime = 1150;
      dateNowSpy.mockReturnValueOnce(startTime);
      dateNowSpy.mockReturnValueOnce(endTime);

      await requestPasswordResetUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );

      dateNowSpy.mockRestore();
    });

    it("should read max resend attempts from policy", () => {
      expect(requestPasswordResetUseCase["maxResendAttemptsPerHour"]).toBe(mockMaxResendAttempts);
    });

    it("should read cooldown from policy", () => {
      expect(requestPasswordResetUseCase["passwordResetResendCooldownInSeconds"]).toBe(mockCooldownSeconds);
    });

    it("should use correct email in data", async () => {
      const customEmail = "custom@example.com";
      const customCommand: RequestPasswordResetCommand = {
        email: customEmail,
      };

      await requestPasswordResetUseCase.execute(customCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: customEmail,
          },
        }),
      );
    });
  });

  describe("execute - user not found", () => {
    it("should silently succeed when user does not exist (security measure)", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(null),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      const result = await requestPasswordResetUseCase.execute(mockCommand);

      expect(result).toBeUndefined();
      expect(mockApplicationTokenFactory.issuePasswordReset).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should log success even when user not found (security measure)", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(null),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await requestPasswordResetUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: mockEmail,
          },
        }),
      );
    });
  });

  describe("execute - rate limiting", () => {
    it("should throw ResetTokenRateLimitExceededException when rate limit is exceeded", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(mockMaxResendAttempts + 1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenRateLimitExceededException);

      expect(mockApplicationTokenFactory.issuePasswordReset).not.toHaveBeenCalled();
    });

    it("should throw ResetTokenRateLimitExceededException when cooldown period not expired", async () => {
      const recentTokenCreatedAt = new Date(Date.now() - 60 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(recentTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(mockLastToken),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenRateLimitExceededException);
    });

    it("should allow request when rate limit period has passed", async () => {
      const oldTokenCreatedAt = new Date(Date.now() - 121 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(oldTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(mockLastToken),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      const result = await requestPasswordResetUseCase.execute(mockCommand);

      expect(result).toBeUndefined();
      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalled();
    });

    it("should allow request when no previous token exists", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      const result = await requestPasswordResetUseCase.execute(mockCommand);

      expect(result).toBeUndefined();
      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalled();
    });

    it("should handle edge case when exactly at rate limit boundary (count equals max)", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(mockMaxResendAttempts),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenRateLimitExceededException);
      expect(mockApplicationTokenFactory.issuePasswordReset).not.toHaveBeenCalled();
    });

    it("should handle edge case when exactly at cooldown boundary", async () => {
      const boundaryTokenCreatedAt = new Date(Date.now() - mockCooldownSeconds * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(boundaryTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(mockLastToken),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      const result = await requestPasswordResetUseCase.execute(mockCommand);
      expect(result).toBeUndefined();
      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalled();
    });

    it("should include correct retryAfter in exception for cooldown", async () => {
      const recentTokenCreatedAt = new Date(Date.now() - 90 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(recentTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(mockLastToken),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      try {
        await requestPasswordResetUseCase.execute(mockCommand);
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ResetTokenRateLimitExceededException);
        const exception = error as ResetTokenRateLimitExceededException;
        expect(exception.details.retryAfterInSeconds).toBe(30);
      }
    });

    it("should include correct retryAfter in exception for rate limit (3600 seconds)", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(mockMaxResendAttempts + 1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      try {
        await requestPasswordResetUseCase.execute(mockCommand);
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ResetTokenRateLimitExceededException);
        const exception = error as ResetTokenRateLimitExceededException;
        expect(exception.details.retryAfterInSeconds).toBe(3600);
      }
    });
  });

  describe("transaction handling", () => {
    it("should execute all operations within a transaction", async () => {
      await requestPasswordResetUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should pass correct repositories to transaction operation", async () => {
      let capturedRepos;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        const result = await callback(repos);
        capturedRepos = repos;
        return result;
      });

      await requestPasswordResetUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
      expect(capturedRepos).toBeDefined();
    });

    it("should handle transaction rollback on error", async () => {
      const error = new Error("Transaction failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow("Transaction failed");
    });
  });

  describe("error handling", () => {
    it("should handle user repository error", async () => {
      const error = new Error("Repository error");
      mockUnitOfWork.commit.mockImplementation(async () => {
        throw error;
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow("Repository error");
    });

    it("should handle token insertion error", async () => {
      const error = new Error("Insert failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockRejectedValue(error),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow("Insert failed");
    });

    it("should handle token invalidation error", async () => {
      const error = new Error("Invalidation failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockRejectedValue(error),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow("Invalidation failed");
    });

    it("should handle event bus error", async () => {
      const error = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow("Event bus failed");
    });

    it("should handle ApplicationTokenFactory error", async () => {
      const error = new Error("Factory failed");
      mockApplicationTokenFactory.issuePasswordReset.mockImplementation(() => {
        throw error;
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow("Factory failed");
    });

    it("should handle rate limit check error before token creation", async () => {
      const error = new Error("Rate limit check failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockRejectedValue(error),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow("Rate limit check failed");
      expect(mockApplicationTokenFactory.issuePasswordReset).not.toHaveBeenCalled();
    });

    it("should handle logger error gracefully", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("logging scenarios", () => {
    it("should log debug without parameters", async () => {
      await requestPasswordResetUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "RequestPasswordResetUseCase",
        event: "REQUEST_PASSWORD_RESET_STARTED",
        message: "Request password reset started",
      });
    });

    it("should log info with email", async () => {
      await requestPasswordResetUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RequestPasswordResetUseCase",
        event: "REQUEST_PASSWORD_RESET_SUCCESSFUL",
        message: "User requested password reset successfully",
        durationMs: expect.any(Number),
        data: {
          email: mockEmail,
        },
      });
    });

    it("should not log info when request fails", async () => {
      const error = new Error("Request failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow("Request failed");

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle email with special characters", async () => {
      const specialEmail = "user+test@example.com";
      const commandWithSpecialEmail: RequestPasswordResetCommand = {
        email: specialEmail,
      };

      mockUser.getEmail.mockReturnValue(specialEmail);

      await requestPasswordResetUseCase.execute(commandWithSpecialEmail);

      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalledWith(mockUser);
    });

    it("should handle email with uppercase letters", async () => {
      const uppercaseEmail = "USER@EXAMPLE.COM";
      const commandWithUppercase: RequestPasswordResetCommand = {
        email: uppercaseEmail,
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockImplementation((email) => {
              expect(email).toBe(uppercaseEmail);
              return Promise.resolve(mockUser);
            }),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await requestPasswordResetUseCase.execute(commandWithUppercase);

      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalledWith(mockUser);
    });

    it("should handle multiple consecutive requests with rate limiting", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await requestPasswordResetUseCase.execute(mockCommand);
      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalled();

      const recentTokenCreatedAt = new Date(Date.now() - 10 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(recentTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(mockLastToken),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenRateLimitExceededException);
    });

    it("should handle null createdAt from last token", async () => {
      mockLastToken.getCreatedAt.mockReturnValue(null as unknown as Date);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(mockLastToken),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow();
    });

    it("should handle token with very old createdAt", async () => {
      const veryOldDate = new Date(Date.now() - 10000000);
      mockLastToken.getCreatedAt.mockReturnValue(veryOldDate);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(mockLastToken),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      const result = await requestPasswordResetUseCase.execute(mockCommand);
      expect(result).toBeUndefined();
    });

    it("should handle empty email string", async () => {
      const commandWithEmptyEmail: RequestPasswordResetCommand = {
        email: "",
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(null),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      const result = await requestPasswordResetUseCase.execute(commandWithEmptyEmail);
      expect(result).toBeUndefined();
      expect(mockApplicationTokenFactory.issuePasswordReset).not.toHaveBeenCalled();
    });

    it("should handle very long email address", async () => {
      const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";
      const commandWithLongEmail: RequestPasswordResetCommand = {
        email: longEmail,
      };

      mockUser.getEmail.mockReturnValue(longEmail);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await requestPasswordResetUseCase.execute(commandWithLongEmail);

      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalledWith(mockUser);
    });

    it("should handle email with Unicode characters", async () => {
      const unicodeEmail = "user@exämple.com";
      const commandWithUnicodeEmail: RequestPasswordResetCommand = {
        email: unicodeEmail,
      };

      mockUser.getEmail.mockReturnValue(unicodeEmail);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(0),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await requestPasswordResetUseCase.execute(commandWithUnicodeEmail);

      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalledWith(mockUser);
    });
  });

  describe("private method checkPasswordResetRateLimit", () => {
    it("should check rate limit with correct parameters", async () => {
      await requestPasswordResetUseCase.execute(mockCommand);

      expect(TimeUtil.hoursToMs).toHaveBeenCalledWith(1);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should use correct token type for rate limit check", async () => {
      let checkedType: ApplicationTokenType | undefined;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockImplementation((type) => {
              checkedType = type;
              return Promise.resolve(0);
            }),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await requestPasswordResetUseCase.execute(mockCommand);

      expect(checkedType).toBe(ApplicationTokenType.PASSWORD_RESET);
    });

    it("should handle countByTypeAndIdentifierWithin result below max", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(3),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await requestPasswordResetUseCase.execute(mockCommand);
      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalled();
    });

    it("should throw when count equals max attempts (>= comparison)", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(mockMaxResendAttempts),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(null),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenRateLimitExceededException);
      expect(mockApplicationTokenFactory.issuePasswordReset).not.toHaveBeenCalled();
    });

    it("should check cooldown after count check", async () => {
      const recentTokenCreatedAt = new Date(Date.now() - 60 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(recentTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          applicationTokenRepository: {
            countByTypeAndIdentifierWithin: jest.fn().mockResolvedValue(1),
            findLastTokenByTypeAndIdentifier: jest.fn().mockResolvedValue(mockLastToken),
            invalidateByTypeAndIdentifier: jest.fn().mockResolvedValue(undefined),
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(requestPasswordResetUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenRateLimitExceededException);
      expect(mockApplicationTokenFactory.issuePasswordReset).not.toHaveBeenCalled();
    });
  });

  describe("performance considerations", () => {
    it("should execute request quickly", async () => {
      const startTime = Date.now();
      await requestPasswordResetUseCase.execute(mockCommand);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple requests efficiently", async () => {
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await requestPasswordResetUseCase.execute(mockCommand);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("type safety", () => {
    it("should return Promise<void> from execute", async () => {
      const result = requestPasswordResetUseCase.execute(mockCommand);

      expect(result).toBeInstanceOf(Promise);
    });

    it("should accept RequestPasswordResetCommand type", async () => {
      const command: RequestPasswordResetCommand = {
        email: mockEmail,
      };

      await requestPasswordResetUseCase.execute(command);
      expect(mockApplicationTokenFactory.issuePasswordReset).toHaveBeenCalled();
    });
  });
});
