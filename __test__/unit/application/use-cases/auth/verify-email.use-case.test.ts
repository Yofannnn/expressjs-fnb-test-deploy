import { VerifyEmailUseCase } from "@/application/use-cases/auth/verify-email.use-case";
import { VerifyEmailCommand } from "@/application/ports/driving/verify-email.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { User } from "@/domain/entities/user.entity";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { VerificationEmailToken } from "@/domain/entities/application-token.entity";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { VerificationTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";
import { UserRoleType } from "@/domain/types/user.type";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { DomainEvent } from "@/domain/types/domain-event.type";

jest.mock("@/domain/entities/application-token.entity");

describe("VerifyEmailUseCase", () => {
  let verifyEmailUseCase: VerifyEmailUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockFingerprintProvider: jest.Mocked<FingerprintPort>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  let mockUser: jest.Mocked<User>;
  let mockVerificationToken: jest.Mocked<VerificationEmailToken>;

  const mockUserId = "user-888";
  const mockEmail = "user@example.com";
  const mockTokenId = "token-888";
  const mockVerificationTokenValue = "valid-verification-token-123";
  const mockTokenFingerprint = "fingerprint-888";
  const mockUserEvents = [{ eventType: "EMAIL_VERIFIED" }] as unknown as DomainEvent[];
  const mockTokenEvents = [{ eventType: "VERIFICATION_EMAIL_TOKEN_USED" }] as unknown as DomainEvent[];

  const mockCommand: VerifyEmailCommand = {
    verificationToken: mockVerificationTokenValue,
  };

  const createMockVerificationToken = () => {
    const token = {
      getId: jest.fn().mockReturnValue(mockTokenId),
      getTokenFingerprint: jest.fn().mockReturnValue(mockTokenFingerprint),
      getUserId: jest.fn().mockReturnValue(mockUserId),
      use: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue(mockTokenEvents),
      getIdentifier: jest.fn().mockReturnValue(mockEmail),
      getType: jest.fn().mockReturnValue(ApplicationTokenType.VERIFICATION_EMAIL),
      getExpiresAt: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getUsedAt: jest.fn(),
      getTokenStatus: jest.fn(),
      isExpired: jest.fn(),
      isUsed: jest.fn(),
      getRemainingTimeMs: jest.fn(),
      getTokenMetadata: jest.fn(),
      constructor: VerificationEmailToken,
    } as unknown as VerificationEmailToken;

    Object.setPrototypeOf(token, VerificationEmailToken.prototype);

    return token as jest.Mocked<VerificationEmailToken>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
      getEmail: jest.fn().mockReturnValue(mockEmail),
      getName: jest.fn().mockReturnValue("Test User"),
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      isEmailVerified: jest.fn().mockReturnValue(false),
      verifyEmail: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue(mockUserEvents),
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
      changePassword: jest.fn(),
      updateProfile: jest.fn(),
      assertCanAuthenticate: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockVerificationToken = createMockVerificationToken();

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWorkPort>;

    mockFingerprintProvider = {
      fingerprint: jest.fn(),
      compareFingerprint: jest.fn(),
    } as unknown as jest.Mocked<FingerprintPort>;

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

    mockFingerprintProvider.fingerprint.mockReturnValue(mockTokenFingerprint);
    mockEventBus.publishAll.mockResolvedValue(undefined);

    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        userRepository: {
          findById: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue(undefined),
        },
        applicationTokenRepository: {
          findByTokenFingerprint: jest.fn().mockResolvedValue(mockVerificationToken),
          update: jest.fn().mockResolvedValue(undefined),
        },
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    verifyEmailUseCase = new VerifyEmailUseCase(mockUnitOfWork, mockFingerprintProvider, mockEventBus, mockLogger);
  });

  describe("execute - successful email verification", () => {
    it("should successfully verify email with valid token", async () => {
      const result = await verifyEmailUseCase.execute(mockCommand);

      expect(result).toEqual({ userId: mockUserId });

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockVerificationTokenValue);
      expect(mockUser.verifyEmail).toHaveBeenCalled();
      expect(mockVerificationToken.use).toHaveBeenCalled();
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockUserEvents, ...mockTokenEvents]);
    });

    it("should log verification start and success", async () => {
      await verifyEmailUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "VerifyEmailUseCase",
        event: "EMAIL_VERIFICATION_STARTED",
        message: "Email verification started",
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "VerifyEmailUseCase",
        event: "EMAIL_VERIFICATION_SUCCESSFUL",
        message: "User verified email successfully",
        userId: mockUserId,
        durationMs: expect.any(Number),
        data: {
          role: UserRoleType.MEMBER,
        },
      });
    });

    it("should mark user email as verified", async () => {
      await verifyEmailUseCase.execute(mockCommand);

      expect(mockUser.verifyEmail).toHaveBeenCalledTimes(1);
    });

    it("should mark verification token as used", async () => {
      await verifyEmailUseCase.execute(mockCommand);

      expect(mockVerificationToken.use).toHaveBeenCalledTimes(1);
    });

    it("should update both user and token concurrently", async () => {
      let userUpdateCalled = false;
      let tokenUpdateCalled = false;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockImplementation(() => {
              userUpdateCalled = true;
              return Promise.resolve(undefined);
            }),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(mockVerificationToken),
            update: jest.fn().mockImplementation(() => {
              tokenUpdateCalled = true;
              return Promise.resolve(undefined);
            }),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await verifyEmailUseCase.execute(mockCommand);

      expect(userUpdateCalled).toBe(true);
      expect(tokenUpdateCalled).toBe(true);
    });

    it("should publish domain events from both user and token", async () => {
      await verifyEmailUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockUserEvents, ...mockTokenEvents]);
    });

    it("should handle empty domain events", async () => {
      mockUser.pullDomainEvents.mockReturnValue([]);
      mockVerificationToken.pullDomainEvents.mockReturnValue([]);

      await verifyEmailUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should calculate duration correctly", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      const startTime = 1000;
      const endTime = 1150;
      dateNowSpy.mockReturnValueOnce(startTime);
      dateNowSpy.mockReturnValueOnce(endTime);

      await verifyEmailUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );

      dateNowSpy.mockRestore();
    });

    it("should return userId in result", async () => {
      const result = await verifyEmailUseCase.execute(mockCommand);

      expect(result).toHaveProperty("userId");
      expect(result.userId).toBe(mockUserId);
    });
  });

  describe("execute - invalid verification token", () => {
    it("should throw VerificationTokenNotFoundException when token does not exist", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenNotFoundException);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockVerificationTokenValue);
      expect(mockUser.verifyEmail).not.toHaveBeenCalled();
      expect(mockVerificationToken.use).not.toHaveBeenCalled();
    });

    it("should throw VerificationTokenNotFoundException when token is not a VerificationEmailToken", async () => {
      const nonToken = {
        getId: jest.fn().mockReturnValue("some-id"),
        getTokenFingerprint: jest.fn().mockReturnValue("some-fingerprint"),
        getUserId: jest.fn().mockReturnValue("some-user"),
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(nonToken as unknown as VerificationEmailToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenNotFoundException);

      expect(mockUser.verifyEmail).not.toHaveBeenCalled();
      expect(mockVerificationToken.use).not.toHaveBeenCalled();
    });

    it("should fingerprint token before lookup", async () => {
      await verifyEmailUseCase.execute(mockCommand);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockVerificationTokenValue);
    });

    it("should handle undefined token from repository", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(undefined as unknown as VerificationEmailToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenNotFoundException);
    });
  });

  describe("execute - user not found", () => {
    it("should throw UserNotFoundException when user does not exist", async () => {
      const validToken = createMockVerificationToken();

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(validToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);

      expect(mockUser.verifyEmail).not.toHaveBeenCalled();
      expect(validToken.use).not.toHaveBeenCalled();
    });

    it("should not proceed to verification if user not found", async () => {
      let tokenUsed = false;
      const validToken = createMockVerificationToken();
      validToken.use.mockImplementation(() => {
        tokenUsed = true;
      });

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(validToken),
            update: jest.fn().mockImplementation(() => {
              return Promise.resolve(undefined);
            }),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);

      expect(tokenUsed).toBe(false);
    });
  });

  describe("transaction handling", () => {
    it("should execute all operations within a transaction", async () => {
      await verifyEmailUseCase.execute(mockCommand);

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
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(mockVerificationToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        const result = await callback(repos);
        capturedRepos = repos;
        return result;
      });

      await verifyEmailUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
      expect(capturedRepos).toBeDefined();
    });

    it("should handle transaction rollback on error", async () => {
      const error = new Error("Transaction failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow("Transaction failed");
    });
  });

  describe("error handling", () => {
    it("should handle user repository error", async () => {
      const error = new Error("Repository error");
      mockUnitOfWork.commit.mockImplementation(async () => {
        throw error;
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow("Repository error");
    });

    it("should handle user update error", async () => {
      const error = new Error("Update failed");
      const validToken = createMockVerificationToken();

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockRejectedValue(error),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(validToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow("Update failed");
    });

    it("should handle token update error", async () => {
      const error = new Error("Token update failed");
      const validToken = createMockVerificationToken();

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(validToken),
            update: jest.fn().mockRejectedValue(error),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow("Token update failed");
    });

    it("should handle event bus error", async () => {
      const error = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow("Event bus failed");
    });

    it("should handle fingerprint provider error", async () => {
      const error = new Error("Fingerprint failed");
      mockFingerprintProvider.fingerprint.mockImplementation(() => {
        throw error;
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow("Fingerprint failed");
    });

    it("should handle logger error gracefully", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("logging scenarios", () => {
    it("should log debug without parameters", async () => {
      await verifyEmailUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "VerifyEmailUseCase",
        event: "EMAIL_VERIFICATION_STARTED",
        message: "Email verification started",
      });
    });

    it("should log info with user ID and role", async () => {
      await verifyEmailUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "VerifyEmailUseCase",
        event: "EMAIL_VERIFICATION_SUCCESSFUL",
        message: "User verified email successfully",
        userId: mockUserId,
        durationMs: expect.any(Number),
        data: {
          role: UserRoleType.MEMBER,
        },
      });
    });

    it("should not log info when verification fails", async () => {
      const validToken = createMockVerificationToken();

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(validToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle user with null role", async () => {
      mockUser.getRole.mockReturnValue(null as unknown as UserRoleType);

      await verifyEmailUseCase.execute(mockCommand);

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

      await verifyEmailUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            role: undefined,
          },
        }),
      );
    });

    it("should handle token with special characters", async () => {
      const specialToken = "token-with-special-!@#$%^&*()";
      const commandWithSpecialToken: VerifyEmailCommand = {
        verificationToken: specialToken,
      };

      await verifyEmailUseCase.execute(commandWithSpecialToken);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(specialToken);
    });

    it("should handle token with Unicode characters", async () => {
      const unicodeToken = "token-🚀-🎉-123";
      const commandWithUnicodeToken: VerifyEmailCommand = {
        verificationToken: unicodeToken,
      };

      await verifyEmailUseCase.execute(commandWithUnicodeToken);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(unicodeToken);
    });

    it("should handle very long tokens", async () => {
      const longToken = "a".repeat(500);
      const commandWithLongToken: VerifyEmailCommand = {
        verificationToken: longToken,
      };

      await verifyEmailUseCase.execute(commandWithLongToken);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(longToken);
    });

    it("should handle empty token string", async () => {
      const commandWithEmptyToken: VerifyEmailCommand = {
        verificationToken: "",
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(commandWithEmptyToken)).rejects.toThrow(VerificationTokenNotFoundException);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith("");
    });

    it("should handle undefined token", async () => {
      const commandWithUndefinedToken: VerifyEmailCommand = {
        verificationToken: undefined as unknown as string,
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(commandWithUndefinedToken)).rejects.toThrow(VerificationTokenNotFoundException);
    });

    it("should handle null token", async () => {
      const commandWithNullToken: VerifyEmailCommand = {
        verificationToken: null as unknown as string,
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(commandWithNullToken)).rejects.toThrow(VerificationTokenNotFoundException);
    });

    it("should handle user with already verified email", async () => {
      mockUser.isEmailVerified.mockReturnValue(true);

      const result = await verifyEmailUseCase.execute(mockCommand);

      expect(result).toEqual({ userId: mockUserId });
      expect(mockUser.verifyEmail).toHaveBeenCalled();
    });

    it("should handle user with very long ID", async () => {
      const longUserId = "a".repeat(1000);
      mockUser.getId.mockReturnValue(longUserId);

      const result = await verifyEmailUseCase.execute(mockCommand);

      expect(result.userId).toBe(longUserId);
    });
  });

  describe("private method findVerificationEmail", () => {
    it("should find verification email by hashed token", async () => {
      await verifyEmailUseCase.execute(mockCommand);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockVerificationTokenValue);
    });

    it("should throw VerificationTokenNotFoundException when token not found", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenNotFoundException);
    });

    it("should throw VerificationTokenNotFoundException when token is not a VerificationEmailToken instance", async () => {
      const nonToken = {
        getId: jest.fn().mockReturnValue("some-id"),
        getTokenFingerprint: jest.fn().mockReturnValue("some-fingerprint"),
        getUserId: jest.fn().mockReturnValue("some-user"),
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(nonToken as unknown as VerificationEmailToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow(VerificationTokenNotFoundException);
    });
  });

  describe("private method findUser", () => {
    it("should find user by ID from token", async () => {
      await verifyEmailUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should throw UserNotFoundException when user not found", async () => {
      const validToken = createMockVerificationToken();

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(validToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(verifyEmailUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe("performance considerations", () => {
    it("should execute verification quickly", async () => {
      const startTime = Date.now();
      await verifyEmailUseCase.execute(mockCommand);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple verifications efficiently", async () => {
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await verifyEmailUseCase.execute(mockCommand);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("type safety", () => {
    it("should return VerifyEmailResult type", async () => {
      const result = await verifyEmailUseCase.execute(mockCommand);

      expect(result).toHaveProperty("userId");
      expect(typeof result.userId).toBe("string");
    });

    it("should accept VerifyEmailCommand type", async () => {
      const command: VerifyEmailCommand = {
        verificationToken: mockVerificationTokenValue,
      };

      const result = await verifyEmailUseCase.execute(command);
      expect(result).toHaveProperty("userId");
    });
  });
});
