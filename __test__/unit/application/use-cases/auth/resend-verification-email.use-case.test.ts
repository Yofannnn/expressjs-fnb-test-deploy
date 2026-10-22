import { ResendVerificationEmailUseCase } from "@/application/use-cases/auth/resend-verification-email.use-case";
import { ResendVerificationEmailCommand } from "@/application/ports/driving/resend-verification-email.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { User } from "@/domain/entities/user.entity";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { TimeUtil } from "@/utils/time.util";
import { VerificationEmailPolicy } from "@/domain/policies/verification-email.policy";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { VerificationTokenRateLimitExceededException } from "@/application/exceptions/application-token.exceptions";
import { VerificationEmailToken } from "@/domain/entities/application-token.entity";
import { UserRoleType } from "@/domain/types/user.type";
import { DomainEvent } from "@/domain/types/domain-event.type";

jest.mock("@/domain/entities/application-token.entity");
jest.mock("@/utils/time.util");

describe("ResendVerificationEmailUseCase", () => {
  let resendVerificationEmailUseCase: ResendVerificationEmailUseCase;
  let mockVerificationEmailPolicy: jest.Mocked<VerificationEmailPolicy>;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockApplicationTokenFactory: jest.Mocked<ApplicationTokenFactory>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  let mockUser: jest.Mocked<User>;
  let mockVerificationToken: jest.Mocked<VerificationEmailToken>;
  let mockLastToken: jest.Mocked<VerificationEmailToken>;

  const mockUserId = "user-666";
  const mockEmail = "user@example.com";
  const mockTokenId = "token-666";
  const mockMaxResendAttempts = 5;
  const mockCooldownSeconds = 120;
  const mockTokenEvents = [{ eventType: "VERIFICATION_EMAIL_TOKEN_REISSUED" }] as unknown as DomainEvent[];

  const mockCommand: ResendVerificationEmailCommand = {
    userId: mockUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
      getEmail: jest.fn().mockReturnValue(mockEmail),
      getName: jest.fn().mockReturnValue("Test User"),
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      isEmailVerified: jest.fn().mockReturnValue(false),
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

    mockVerificationToken = {
      getId: jest.fn().mockReturnValue(mockTokenId),
      pullDomainEvents: jest.fn().mockReturnValue(mockTokenEvents),
      getCreatedAt: jest.fn().mockReturnValue(new Date()),
      getTokenFingerprint: jest.fn(),
      getIdentifier: jest.fn(),
      getUserId: jest.fn(),
      getType: jest.fn().mockReturnValue(ApplicationTokenType.VERIFICATION_EMAIL),
      getExpiresAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getUsedAt: jest.fn(),
      getTokenStatus: jest.fn(),
      isExpired: jest.fn(),
      isUsed: jest.fn(),
      getRemainingTimeMs: jest.fn(),
      getTokenMetadata: jest.fn(),
      use: jest.fn(),
    } as unknown as jest.Mocked<VerificationEmailToken>;

    mockLastToken = {
      getId: jest.fn().mockReturnValue("last-token-555"),
      getCreatedAt: jest.fn().mockReturnValue(new Date(Date.now() - 60 * 1000)),
      pullDomainEvents: jest.fn().mockReturnValue([]),
      getTokenFingerprint: jest.fn(),
      getIdentifier: jest.fn(),
      getUserId: jest.fn(),
      getType: jest.fn(),
      getExpiresAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getUsedAt: jest.fn(),
      getTokenStatus: jest.fn(),
      isExpired: jest.fn(),
      isUsed: jest.fn(),
      getRemainingTimeMs: jest.fn(),
      getTokenMetadata: jest.fn(),
      use: jest.fn(),
    } as unknown as jest.Mocked<VerificationEmailToken>;

    mockVerificationEmailPolicy = {
      maxResendAttemptsPerHour: mockMaxResendAttempts,
      resendCooldownInSeconds: mockCooldownSeconds,
      expiryInHours: 24,
    } as jest.Mocked<VerificationEmailPolicy>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWorkPort>;

    mockApplicationTokenFactory = {
      issueVerificationEmail: jest.fn(),
      reissueVerificationEmail: jest.fn(),
      issuePasswordReset: jest.fn(),
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

    mockApplicationTokenFactory.reissueVerificationEmail.mockReturnValue(mockVerificationToken);
    mockEventBus.publishAll.mockResolvedValue(undefined);

    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        userRepository: {
          findById: jest.fn().mockResolvedValue(mockUser),
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

    resendVerificationEmailUseCase = new ResendVerificationEmailUseCase(
      mockVerificationEmailPolicy,
      mockUnitOfWork,
      mockApplicationTokenFactory,
      mockEventBus,
      mockLogger,
    );
  });

  describe("execute - successful resend", () => {
    it("should successfully resend verification email", async () => {
      const result = await resendVerificationEmailUseCase.execute(mockCommand);

      expect(result).toBeUndefined();

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueVerificationEmail).toHaveBeenCalledWith(mockUser);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith(mockTokenEvents);
    });

    it("should log resend start and success", async () => {
      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "ResendVerificationEmailUseCase",
        event: "RESEND_VERIFICATION_EMAIL_STARTED",
        message: "Resend verification email started",
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "ResendVerificationEmailUseCase",
        event: "RESEND_VERIFICATION_EMAIL_SUCCESSFUL",
        message: "Resend verification email successfully",
        durationMs: expect.any(Number),
        userId: mockUserId,
        data: {
          role: UserRoleType.MEMBER,
        },
      });
    });

    it("should invalidate existing verification tokens before creating new one", async () => {
      let invalidateCalled = false;
      let insertCalled = false;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(invalidateCalled).toBe(true);
      expect(insertCalled).toBe(true);
    });

    it("should invalidate with correct token type and identifier", async () => {
      let invalidateType: ApplicationTokenType | undefined;
      let invalidateIdentifier: string | undefined;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(invalidateType).toBe(ApplicationTokenType.VERIFICATION_EMAIL);
      expect(invalidateIdentifier).toBe(mockEmail);
    });

    it("should publish domain events from token", async () => {
      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith(mockTokenEvents);
    });

    it("should handle empty domain events", async () => {
      mockVerificationToken.pullDomainEvents.mockReturnValue([]);

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should calculate duration correctly", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      const startTime = 1000;
      const endTime = 1150;
      dateNowSpy.mockReturnValueOnce(startTime);
      dateNowSpy.mockReturnValueOnce(endTime);

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );

      dateNowSpy.mockRestore();
    });

    it("should read max resend attempts from policy", () => {
      expect(resendVerificationEmailUseCase["maxResendAttemptsPerHour"]).toBe(mockMaxResendAttempts);
    });

    it("should read cooldown from policy", () => {
      expect(resendVerificationEmailUseCase["verificationEmailResendCooldownInSeconds"]).toBe(mockCooldownSeconds);
    });
  });

  describe("execute - user not found", () => {
    it("should throw UserNotFoundException when user does not exist", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);

      expect(mockApplicationTokenFactory.reissueVerificationEmail).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should not log success when user not found", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("execute - rate limiting", () => {
    it("should throw VerificationTokenRateLimitExceededException when rate limit is exceeded", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenRateLimitExceededException);

      expect(mockApplicationTokenFactory.reissueVerificationEmail).not.toHaveBeenCalled();
    });

    it("should throw VerificationTokenRateLimitExceededException when cooldown period not expired", async () => {
      const recentTokenCreatedAt = new Date(Date.now() - 60 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(recentTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenRateLimitExceededException);

      expect(mockApplicationTokenFactory.reissueVerificationEmail).not.toHaveBeenCalled();
    });

    it("should allow request when rate limit period has passed", async () => {
      const oldTokenCreatedAt = new Date(Date.now() - 121 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(oldTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      const result = await resendVerificationEmailUseCase.execute(mockCommand);

      expect(result).toBeUndefined();
      expect(mockApplicationTokenFactory.reissueVerificationEmail).toHaveBeenCalled();
    });

    it("should allow request when no previous token exists", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      const result = await resendVerificationEmailUseCase.execute(mockCommand);

      expect(result).toBeUndefined();
      expect(mockApplicationTokenFactory.reissueVerificationEmail).toHaveBeenCalled();
    });

    it("should handle edge case when exactly at rate limit boundary", async () => {
      const boundaryTokenCreatedAt = new Date(Date.now() - 120 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(boundaryTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      const result = await resendVerificationEmailUseCase.execute(mockCommand);

      expect(result).toBeUndefined();
      expect(mockApplicationTokenFactory.reissueVerificationEmail).toHaveBeenCalled();
    });

    it("should include correct retryAfter in exception for cooldown", async () => {
      const recentTokenCreatedAt = new Date(Date.now() - 90 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(recentTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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
        await resendVerificationEmailUseCase.execute(mockCommand);
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(VerificationTokenRateLimitExceededException);
        expect((error as VerificationTokenRateLimitExceededException).details.retryAfterInSeconds).toBe(30);
      }
    });

    it("should include correct retryAfter in exception for rate limit (3600 seconds)", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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
        await resendVerificationEmailUseCase.execute(mockCommand);
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(VerificationTokenRateLimitExceededException);
        expect((error as VerificationTokenRateLimitExceededException).details.retryAfterInSeconds).toBe(3600);
      }
    });

    it("should throw when count equals max attempts (>= comparison)", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenRateLimitExceededException);
      expect(mockApplicationTokenFactory.reissueVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("transaction handling", () => {
    it("should execute all operations within a transaction", async () => {
      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should pass correct repositories to transaction operation", async () => {
      let capturedRepos;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
      expect(capturedRepos).toBeDefined();
    });

    it("should handle transaction rollback on error", async () => {
      const error = new Error("Transaction failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow("Transaction failed");
    });
  });

  describe("error handling", () => {
    it("should handle user repository error", async () => {
      const error = new Error("Repository error");
      mockUnitOfWork.commit.mockImplementation(async () => {
        throw error;
      });

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow("Repository error");
    });

    it("should handle token insertion error", async () => {
      const error = new Error("Insert failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow("Insert failed");
    });

    it("should handle token invalidation error", async () => {
      const error = new Error("Invalidation failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow("Invalidation failed");
    });

    it("should handle event bus error", async () => {
      const error = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow("Event bus failed");
    });

    it("should handle ApplicationTokenFactory error", async () => {
      const error = new Error("Factory failed");
      mockApplicationTokenFactory.reissueVerificationEmail.mockImplementation(() => {
        throw error;
      });

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow("Factory failed");
    });

    it("should handle rate limit check error before token creation", async () => {
      const error = new Error("Rate limit check failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow("Rate limit check failed");
      expect(mockApplicationTokenFactory.reissueVerificationEmail).not.toHaveBeenCalled();
    });

    it("should handle logger error gracefully", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("logging scenarios", () => {
    it("should log debug without parameters", async () => {
      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "ResendVerificationEmailUseCase",
        event: "RESEND_VERIFICATION_EMAIL_STARTED",
        message: "Resend verification email started",
      });
    });

    it("should log info with user ID and role", async () => {
      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "ResendVerificationEmailUseCase",
        event: "RESEND_VERIFICATION_EMAIL_SUCCESSFUL",
        message: "Resend verification email successfully",
        durationMs: expect.any(Number),
        userId: mockUserId,
        data: {
          role: UserRoleType.MEMBER,
        },
      });
    });

    it("should not log info when resend fails", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle user with null role", async () => {
      mockUser.getRole.mockReturnValue(null as unknown as UserRoleType);

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            role: null,
          },
        }),
      );
    });

    it("should handle user with undefined role", async () => {
      mockUser.getRole.mockReturnValue(undefined as unknown as UserRoleType);

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            role: undefined,
          },
        }),
      );
    });

    it("should handle email with special characters", async () => {
      const specialEmail = "user+test@example.com";
      mockUser.getEmail.mockReturnValue(specialEmail);

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should handle email with Unicode characters", async () => {
      const unicodeEmail = "user@exämple.com";
      mockUser.getEmail.mockReturnValue(unicodeEmail);

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should handle multiple consecutive resend attempts with rate limiting", async () => {
      // First attempt - should succeed
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await resendVerificationEmailUseCase.execute(mockCommand);
      expect(mockApplicationTokenFactory.reissueVerificationEmail).toHaveBeenCalled();

      // Second attempt - should be rate limited
      const recentTokenCreatedAt = new Date(Date.now() - 10 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(recentTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenRateLimitExceededException);
    });

    it("should handle null createdAt from last token", async () => {
      mockLastToken.getCreatedAt.mockReturnValue(null as unknown as Date);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      // If createdAt is null, retryAfterInSeconds calculation will fail
      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow();
    });

    it("should handle token with very old createdAt", async () => {
      const veryOldDate = new Date(Date.now() - 10000000);
      mockLastToken.getCreatedAt.mockReturnValue(veryOldDate);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      const result = await resendVerificationEmailUseCase.execute(mockCommand);
      expect(result).toBeUndefined();
    });

    it("should handle very long email address", async () => {
      const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";
      mockUser.getEmail.mockReturnValue(longEmail);

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should handle email with whitespace", async () => {
      const emailWithWhitespace = "  user@example.com  ";
      mockUser.getEmail.mockReturnValue(emailWithWhitespace);

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });
  });

  describe("private method checkVerificationEmailRateLimit", () => {
    it("should check rate limit with correct parameters", async () => {
      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(TimeUtil.hoursToMs).toHaveBeenCalledWith(1);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should use correct token type for rate limit check", async () => {
      let checkedType: ApplicationTokenType | undefined;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await resendVerificationEmailUseCase.execute(mockCommand);

      expect(checkedType).toBe(ApplicationTokenType.VERIFICATION_EMAIL);
    });

    it("should handle countByTypeAndIdentifierWithin result below max", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await resendVerificationEmailUseCase.execute(mockCommand);
      expect(mockApplicationTokenFactory.reissueVerificationEmail).toHaveBeenCalled();
    });

    it("should check cooldown after count check", async () => {
      const recentTokenCreatedAt = new Date(Date.now() - 60 * 1000);
      mockLastToken.getCreatedAt.mockReturnValue(recentTokenCreatedAt);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
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

      await expect(resendVerificationEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenRateLimitExceededException);
      expect(mockApplicationTokenFactory.reissueVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("performance considerations", () => {
    it("should execute resend quickly", async () => {
      const startTime = Date.now();
      await resendVerificationEmailUseCase.execute(mockCommand);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple resends efficiently", async () => {
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await resendVerificationEmailUseCase.execute(mockCommand);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("type safety", () => {
    it("should return Promise<void> from execute", async () => {
      const result = resendVerificationEmailUseCase.execute(mockCommand);

      expect(result).toBeInstanceOf(Promise);
    });

    it("should accept ResendVerificationEmailCommand type", async () => {
      const command: ResendVerificationEmailCommand = {
        userId: mockUserId,
      };

      await resendVerificationEmailUseCase.execute(command);
      expect(mockApplicationTokenFactory.reissueVerificationEmail).toHaveBeenCalled();
    });
  });
});
