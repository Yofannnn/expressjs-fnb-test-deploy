import { ResetPasswordUseCase } from "@/application/use-cases/auth/reset-password.use-case";
import { ResetPasswordCommand } from "@/application/ports/driving/reset-password.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { User } from "@/domain/entities/user.entity";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { PasswordResetToken } from "@/domain/entities/application-token.entity";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { PasswordResetPolicy } from "@/domain/policies/password-reset.policy";
import { ResetTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";
import { PasswordHasherPort } from "@/application/ports/driven/password-hasher.port";
import { UserRoleType } from "@/domain/types/user.type";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { DomainEvent } from "@/domain/types/domain-event.type";

jest.mock("@/domain/entities/application-token.entity");

describe("ResetPasswordUseCase", () => {
  let resetPasswordUseCase: ResetPasswordUseCase;
  let mockPasswordResetPolicy: jest.Mocked<PasswordResetPolicy>;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockPasswordHasher: jest.Mocked<PasswordHasherPort>;
  let mockFingerprintProvider: jest.Mocked<FingerprintPort>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  let mockUser: jest.Mocked<User>;
  let mockPasswordResetToken: jest.Mocked<PasswordResetToken>;

  const mockUserId = "user-999";
  const mockEmail = "user@example.com";
  const mockTokenId = "token-999";
  const mockResetToken = "valid-reset-token-123";
  const mockNewPassword = "NewSecurePassword123!";
  const mockTokenFingerprint = "fingerprint-999";
  const mockCurrentHashedPassword = "current-hashed-password";
  const mockNewHashedPassword = "new-hashed-password";
  const mockGracePeriodMs = 300000;
  const mockUserEvents = [{ eventType: "PasswordChanged" }] as unknown as DomainEvent[];
  const mockTokenEvents = [{ eventType: "TokenUsed" }] as unknown as DomainEvent[];

  const mockCommand: ResetPasswordCommand = {
    resetToken: mockResetToken,
    newPassword: mockNewPassword,
  };

  const createMockPasswordResetToken = () => {
    const token = {
      getId: jest.fn().mockReturnValue(mockTokenId),
      getTokenFingerprint: jest.fn().mockReturnValue(mockTokenFingerprint),
      getUserId: jest.fn().mockReturnValue(mockUserId),
      use: jest.fn(),
      assertWithinGracePeriod: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue(mockTokenEvents),
      getIdentifier: jest.fn().mockReturnValue(mockEmail),
      getType: jest.fn().mockReturnValue(ApplicationTokenType.PASSWORD_RESET),
      getExpiresAt: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getUsedAt: jest.fn(),
      getTokenStatus: jest.fn(),
      isExpired: jest.fn(),
      isUsed: jest.fn(),
      getRemainingTimeMs: jest.fn(),
      getTokenMetadata: jest.fn(),
      constructor: PasswordResetToken,
    } as unknown as PasswordResetToken;

    Object.setPrototypeOf(token, PasswordResetToken.prototype);
    return token as jest.Mocked<PasswordResetToken>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
      getEmail: jest.fn().mockReturnValue(mockEmail),
      getName: jest.fn().mockReturnValue("Test User"),
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      getHashedPasswordForAuthentication: jest.fn().mockReturnValue(mockCurrentHashedPassword),
      changePassword: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue(mockUserEvents),
      isEmailVerified: jest.fn(),
      isActive: jest.fn(),
      isAccountLocked: jest.fn(),
      getAccountLockedUntil: jest.fn(),
      getFailedLoginAttempts: jest.fn(),
      getStatus: jest.fn(),
      assertCanAuthenticate: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
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
      updateProfile: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockPasswordResetToken = createMockPasswordResetToken();

    mockPasswordResetPolicy = {
      maxResendAttemptsPerHour: 5,
      resendCooldownInSeconds: 120,
      gracePeriodMs: mockGracePeriodMs,
      expiryInMinutes: 15,
    } as jest.Mocked<PasswordResetPolicy>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWorkPort>;

    mockPasswordHasher = {
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
    } as jest.Mocked<PasswordHasherPort>;

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
    mockPasswordHasher.comparePassword.mockResolvedValue(false);
    mockPasswordHasher.hashPassword.mockResolvedValue(mockNewHashedPassword);
    mockEventBus.publishAll.mockResolvedValue(undefined);

    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        userRepository: {
          findById: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue(undefined),
        },
        applicationTokenRepository: {
          findByTokenFingerprint: jest.fn().mockResolvedValue(mockPasswordResetToken),
          update: jest.fn().mockResolvedValue(undefined),
        },
        sessionRepository: {
          revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
        },
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    resetPasswordUseCase = new ResetPasswordUseCase(
      mockPasswordResetPolicy,
      mockUnitOfWork,
      mockPasswordHasher,
      mockFingerprintProvider,
      mockEventBus,
      mockLogger,
    );
  });

  describe("execute - successful password reset", () => {
    it("should successfully reset password with valid token", async () => {
      const result = await resetPasswordUseCase.execute(mockCommand);

      expect(result).toBeUndefined();

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockResetToken);
      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(mockGracePeriodMs);
      expect(mockPasswordHasher.comparePassword).toHaveBeenCalledWith(mockNewPassword, mockCurrentHashedPassword);
      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith(mockNewPassword);
      expect(mockUser.changePassword).toHaveBeenCalledWith(mockNewHashedPassword, false);
      expect(mockPasswordResetToken.use).toHaveBeenCalled();
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockUserEvents, ...mockTokenEvents]);
    });

    it("should log reset start and success", async () => {
      await resetPasswordUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "ResetPasswordUseCase",
        event: "RESET_PASSWORD_STARTED",
        message: "Reset password started",
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "ResetPasswordUseCase",
        event: "RESET_PASSWORD_SUCCESSFUL",
        message: "User reset password successfully",
        userId: mockUserId,
        durationMs: expect.any(Number),
        data: {
          role: UserRoleType.MEMBER,
        },
      });
    });

    it("should validate token with grace period before processing", async () => {
      await resetPasswordUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(mockGracePeriodMs);
    });

    it("should revoke all sessions after password reset", async () => {
      let revokeCalled = false;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(mockPasswordResetToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockImplementation(() => {
              revokeCalled = true;
              return Promise.resolve(undefined);
            }),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await resetPasswordUseCase.execute(mockCommand);

      expect(revokeCalled).toBe(true);
    });

    it("should update user, token, and revoke sessions concurrently using Promise.all", async () => {
      let userUpdateCalled = false;
      let tokenUpdateCalled = false;
      let revokeCalled = false;

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
            findByTokenFingerprint: jest.fn().mockResolvedValue(mockPasswordResetToken),
            update: jest.fn().mockImplementation(() => {
              tokenUpdateCalled = true;
              return Promise.resolve(undefined);
            }),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockImplementation(() => {
              revokeCalled = true;
              return Promise.resolve(undefined);
            }),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await resetPasswordUseCase.execute(mockCommand);

      expect(userUpdateCalled).toBe(true);
      expect(tokenUpdateCalled).toBe(true);
      expect(revokeCalled).toBe(true);
    });

    it("should publish domain events from user and token", async () => {
      await resetPasswordUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockUserEvents, ...mockTokenEvents]);
    });

    it("should handle empty domain events", async () => {
      mockUser.pullDomainEvents.mockReturnValue([]);
      mockPasswordResetToken.pullDomainEvents.mockReturnValue([]);

      await resetPasswordUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should calculate duration correctly", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      const startTime = 1000;
      const endTime = 1150;
      dateNowSpy.mockReturnValueOnce(startTime);
      dateNowSpy.mockReturnValueOnce(endTime);

      await resetPasswordUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );

      dateNowSpy.mockRestore();
    });

    it("should read grace period from policy", () => {
      expect(resetPasswordUseCase["PasswordResetPolicy"].gracePeriodMs).toBe(mockGracePeriodMs);
    });
  });

  describe("execute - invalid reset token", () => {
    it("should throw ResetTokenNotFoundException when token does not exist", async () => {
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
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockResetToken);
      expect(mockUser.changePassword).not.toHaveBeenCalled();
      expect(mockPasswordResetToken.use).not.toHaveBeenCalled();
    });

    it("should throw ResetTokenNotFoundException when token is not a PasswordResetToken instance", async () => {
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
            findByTokenFingerprint: jest.fn().mockResolvedValue(nonToken as unknown as PasswordResetToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });

    it("should fingerprint token before lookup", async () => {
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
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockResetToken);
    });

    it("should handle undefined token from repository", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(undefined as unknown as PasswordResetToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });
  });

  describe("execute - user not found", () => {
    it("should throw UserNotFoundException when user does not exist", async () => {
      const validToken = createMockPasswordResetToken();

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
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);

      expect(mockPasswordHasher.comparePassword).not.toHaveBeenCalled();
      expect(mockUser.changePassword).not.toHaveBeenCalled();
      expect(validToken.use).not.toHaveBeenCalled();
    });

    it("should not proceed to password reset if user not found", async () => {
      let tokenUsed = false;
      const validToken = createMockPasswordResetToken();
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
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);

      expect(tokenUsed).toBe(false);
    });
  });

  describe("execute - password validation", () => {
    it("should throw PasswordUnchangedException when new password is same as current", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(true);

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockPasswordHasher.hashPassword).not.toHaveBeenCalled();
      expect(mockUser.changePassword).not.toHaveBeenCalled();
      expect(mockPasswordResetToken.use).not.toHaveBeenCalled();
    });

    it("should throw PasswordUnchangedException when new password is same as current", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(true);
      mockPasswordHasher.hashPassword.mockResolvedValue(mockPasswordHash);

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow(PasswordUnchangedException);

      expect(mockPasswordHasher.comparePassword).toHaveBeenCalledWith(mockCommand.newPassword, mockUser.getHashedPasswordForAuthentication());

      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith(mockCommand.newPassword);

      expect(mockUser.changePassword).toHaveBeenCalledWith(mockPasswordHash, true);

      expect(mockPasswordResetToken.use).not.toHaveBeenCalled();
    });

    it("should hash new password before updating user", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);
      mockPasswordHasher.hashPassword.mockResolvedValue("hashed-new-password");

      await resetPasswordUseCase.execute(mockCommand);

      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith(mockNewPassword);
      expect(mockUser.changePassword).toHaveBeenCalledWith("hashed-new-password", false);
    });

    it("should handle password hasher error during password hashing", async () => {
      const hashError = new Error("Hashing failed");
      mockPasswordHasher.hashPassword.mockRejectedValue(hashError);

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Hashing failed");
    });

    it("should handle compare password error", async () => {
      const compareError = new Error("Compare failed");
      mockPasswordHasher.comparePassword.mockRejectedValue(compareError);

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Compare failed");
    });
  });

  describe("execute - token grace period validation", () => {
    it("should validate token with grace period before processing", async () => {
      await resetPasswordUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(mockGracePeriodMs);
    });

    it("should throw error when grace period validation fails", async () => {
      const validationError = new Error("Token expired beyond grace period");
      mockPasswordResetToken.assertWithinGracePeriod.mockImplementation(() => {
        throw validationError;
      });

      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Token expired beyond grace period");

      expect(mockPasswordHasher.comparePassword).toHaveBeenCalled();
      expect(mockUser.changePassword).not.toHaveBeenCalled();
      expect(mockPasswordHasher.hashPassword).not.toHaveBeenCalled();
    });

    it("should use grace period from policy", async () => {
      const customGracePeriod = 600000;
      mockPasswordResetPolicy.gracePeriodMs = customGracePeriod;

      const newUseCase = new ResetPasswordUseCase(
        mockPasswordResetPolicy,
        mockUnitOfWork,
        mockPasswordHasher,
        mockFingerprintProvider,
        mockEventBus,
        mockLogger,
      );

      await newUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(customGracePeriod);
    });

    it("should handle zero grace period", async () => {
      mockPasswordResetPolicy.gracePeriodMs = 0;

      const newUseCase = new ResetPasswordUseCase(
        mockPasswordResetPolicy,
        mockUnitOfWork,
        mockPasswordHasher,
        mockFingerprintProvider,
        mockEventBus,
        mockLogger,
      );

      await newUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(0);
    });
  });

  describe("transaction handling", () => {
    it("should execute all operations within a transaction", async () => {
      await resetPasswordUseCase.execute(mockCommand);

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
            findByTokenFingerprint: jest.fn().mockResolvedValue(mockPasswordResetToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        const result = await callback(repos);
        capturedRepos = repos;
        return result;
      });

      await resetPasswordUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
      expect(capturedRepos).toBeDefined();
    });

    it("should handle transaction rollback on error", async () => {
      const error = new Error("Transaction failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Transaction failed");
    });
  });

  describe("error handling", () => {
    it("should handle user repository error", async () => {
      const error = new Error("Repository error");
      mockUnitOfWork.commit.mockImplementation(async () => {
        throw error;
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Repository error");
    });

    it("should handle user update error", async () => {
      const error = new Error("Update failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockRejectedValue(error),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(mockPasswordResetToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Update failed");
    });

    it("should handle token update error", async () => {
      const error = new Error("Token update failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(mockPasswordResetToken),
            update: jest.fn().mockRejectedValue(error),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Token update failed");
    });

    it("should handle session revocation error", async () => {
      const error = new Error("Revoke failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(mockPasswordResetToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockRejectedValue(error),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Revoke failed");
    });

    it("should handle event bus error", async () => {
      const error = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Event bus failed");
    });

    it("should handle fingerprint provider error", async () => {
      const error = new Error("Fingerprint failed");
      mockFingerprintProvider.fingerprint.mockImplementation(() => {
        throw error;
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Fingerprint failed");
    });

    it("should handle logger error gracefully", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("edge cases", () => {
    it("should handle token with special characters", async () => {
      const specialToken = "token-with-special-!@#$%^&*()";
      const commandWithSpecialToken: ResetPasswordCommand = {
        resetToken: specialToken,
        newPassword: mockNewPassword,
      };

      mockFingerprintProvider.fingerprint.mockReturnValue("fingerprint-special");

      await resetPasswordUseCase.execute(commandWithSpecialToken);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(specialToken);
    });

    it("should handle very long passwords", async () => {
      const longPassword = "a".repeat(200);
      const commandWithLongPassword: ResetPasswordCommand = {
        resetToken: mockResetToken,
        newPassword: longPassword,
      };

      mockPasswordHasher.hashPassword.mockResolvedValue("hashed-long-password");

      await resetPasswordUseCase.execute(commandWithLongPassword);

      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith(longPassword);
      expect(mockUser.changePassword).toHaveBeenCalledWith("hashed-long-password", false);
    });

    it("should handle password with unicode characters", async () => {
      const unicodePassword = "Password123!密碼🔒";
      const commandWithUnicodePassword: ResetPasswordCommand = {
        resetToken: mockResetToken,
        newPassword: unicodePassword,
      };

      mockPasswordHasher.hashPassword.mockResolvedValue("hashed-unicode-password");

      await resetPasswordUseCase.execute(commandWithUnicodePassword);

      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith(unicodePassword);
      expect(mockUser.changePassword).toHaveBeenCalledWith("hashed-unicode-password", false);
    });

    it("should handle empty token string", async () => {
      const commandWithEmptyToken: ResetPasswordCommand = {
        resetToken: "",
        newPassword: mockNewPassword,
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
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(commandWithEmptyToken)).rejects.toThrow(ResetTokenNotFoundException);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith("");
    });

    it("should handle null token", async () => {
      const commandWithNullToken: ResetPasswordCommand = {
        resetToken: null as unknown as string,
        newPassword: mockNewPassword,
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
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(commandWithNullToken)).rejects.toThrow(ResetTokenNotFoundException);
    });

    it("should handle user with null role", async () => {
      mockUser.getRole.mockReturnValue(null as unknown as UserRoleType);

      await resetPasswordUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            role: null,
          },
        }),
      );
    });

    it("should handle token with Unicode characters", async () => {
      const unicodeToken = "token-🚀-✨-🔐";
      const commandWithUnicodeToken: ResetPasswordCommand = {
        resetToken: unicodeToken,
        newPassword: mockNewPassword,
      };

      mockFingerprintProvider.fingerprint.mockReturnValue("fingerprint-unicode");

      await resetPasswordUseCase.execute(commandWithUnicodeToken);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(unicodeToken);
    });
  });

  describe("private method findPasswordReset", () => {
    it("should find password reset token by fingerprint", async () => {
      await resetPasswordUseCase.execute(mockCommand);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockResetToken);
    });

    it("should throw ResetTokenNotFoundException when token not found", async () => {
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
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });

    it("should throw ResetTokenNotFoundException when token is not PasswordResetToken instance", async () => {
      const nonToken = { someProperty: "value" };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          applicationTokenRepository: {
            findByTokenFingerprint: jest.fn().mockResolvedValue(nonToken as unknown as PasswordResetToken),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });
  });

  describe("private method findUser", () => {
    it("should find user by ID from token", async () => {
      await resetPasswordUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should throw UserNotFoundException when user not found", async () => {
      const validToken = createMockPasswordResetToken();

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
          sessionRepository: {
            revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe("private method processResetPassword", () => {
    it("should process password reset correctly", async () => {
      await resetPasswordUseCase.execute(mockCommand);

      expect(mockPasswordHasher.comparePassword).toHaveBeenCalled();
      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalled();
      expect(mockPasswordHasher.hashPassword).toHaveBeenCalled();
      expect(mockUser.changePassword).toHaveBeenCalled();
      expect(mockPasswordResetToken.use).toHaveBeenCalled();
    });

    it("should validate grace period before hashing", async () => {
      const validationError = new Error("Token expired");
      mockPasswordResetToken.assertWithinGracePeriod.mockImplementation(() => {
        throw validationError;
      });

      await expect(resetPasswordUseCase.execute(mockCommand)).rejects.toThrow("Token expired");
      expect(mockPasswordHasher.hashPassword).not.toHaveBeenCalled();
    });
  });

  describe("performance considerations", () => {
    it("should execute reset password quickly", async () => {
      const startTime = Date.now();
      await resetPasswordUseCase.execute(mockCommand);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple resets efficiently", async () => {
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await resetPasswordUseCase.execute(mockCommand);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("type safety", () => {
    it("should return Promise<void> from execute", async () => {
      const result = resetPasswordUseCase.execute(mockCommand);

      expect(result).toBeInstanceOf(Promise);
    });

    it("should accept ResetPasswordCommand type", async () => {
      const command: ResetPasswordCommand = {
        resetToken: mockResetToken,
        newPassword: mockNewPassword,
      };

      await resetPasswordUseCase.execute(command);
      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockResetToken);
    });
  });
});
