import { ValidateResetTokenUseCase } from "@/application/use-cases/auth/validate-reset-token.use-case";
import { ValidateResetTokenCommand } from "@/application/ports/driving/validate-reset-token.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PasswordResetToken } from "@/domain/entities/application-token.entity";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { PasswordResetPolicy } from "@/domain/policies/password-reset.policy";
import { ResetTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";
import { ApplicationTokenType } from "@/domain/types/application-token.type";

jest.mock("@/domain/entities/application-token.entity");

describe("ValidateResetTokenUseCase", () => {
  let validateResetTokenUseCase: ValidateResetTokenUseCase;
  let mockPasswordResetPolicy: jest.Mocked<PasswordResetPolicy>;
  let mockApplicationTokenRepository: jest.Mocked<ApplicationTokenRepositoryPort>;
  let mockFingerprintProvider: jest.Mocked<FingerprintPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  let mockPasswordResetToken: jest.Mocked<PasswordResetToken>;

  const mockTokenValue = "valid-reset-token-123";
  const mockTokenFingerprint = "fingerprint-777";
  const mockGracePeriodMs = 300000;
  const mockExpiresAt = new Date(Date.now() + 1800000);
  const mockRemainingTimeMs = 1800000;

  const mockCommand: ValidateResetTokenCommand = {
    resetPasswordToken: mockTokenValue,
  };

  const createMockPasswordResetToken = () => {
    const token = {
      getId: jest.fn().mockReturnValue("token-777"),
      getExpiresAt: jest.fn().mockReturnValue(mockExpiresAt),
      getRemainingTimeMs: jest.fn().mockReturnValue(mockRemainingTimeMs),
      assertWithinGracePeriod: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue([]),
      getTokenFingerprint: jest.fn(),
      getIdentifier: jest.fn(),
      getUserId: jest.fn(),
      getType: jest.fn().mockReturnValue(ApplicationTokenType.PASSWORD_RESET),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getUsedAt: jest.fn(),
      getTokenStatus: jest.fn(),
      isExpired: jest.fn(),
      isUsed: jest.fn(),
      getTokenMetadata: jest.fn(),
      use: jest.fn(),
      constructor: PasswordResetToken,
    } as unknown as PasswordResetToken;

    Object.setPrototypeOf(token, PasswordResetToken.prototype);
    return token as jest.Mocked<PasswordResetToken>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPasswordResetToken = createMockPasswordResetToken();

    mockPasswordResetPolicy = {
      maxResendAttemptsPerHour: 5,
      resendCooldownInSeconds: 120,
      gracePeriodMs: mockGracePeriodMs,
      expiryInMinutes: 15,
    } as jest.Mocked<PasswordResetPolicy>;

    mockApplicationTokenRepository = {
      findByTokenFingerprint: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      invalidateByTypeAndIdentifier: jest.fn(),
      countByTypeAndIdentifierWithin: jest.fn(),
      findLastTokenByTypeAndIdentifier: jest.fn(),
    } as unknown as jest.Mocked<ApplicationTokenRepositoryPort>;

    mockFingerprintProvider = {
      fingerprint: jest.fn(),
      compareFingerprint: jest.fn(),
    } as unknown as jest.Mocked<FingerprintPort>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as unknown as jest.Mocked<LoggerPort>;

    mockFingerprintProvider.fingerprint.mockReturnValue(mockTokenFingerprint);
    mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(mockPasswordResetToken);

    validateResetTokenUseCase = new ValidateResetTokenUseCase(
      mockPasswordResetPolicy,
      mockApplicationTokenRepository,
      mockFingerprintProvider,
      mockLogger,
    );
  });

  describe("execute - successful token validation", () => {
    it("should successfully validate a valid reset token", async () => {
      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result).toEqual({
        expiresAt: mockExpiresAt,
        remainingTimeMs: mockRemainingTimeMs,
      });

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockTokenValue);
      expect(mockApplicationTokenRepository.findByTokenFingerprint).toHaveBeenCalledWith(mockTokenFingerprint);
      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(mockGracePeriodMs);
    });

    it("should log validation start and completion", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "ValidateResetTokenUseCase",
        event: "VALIDATE_RESET_TOKEN_STARTED",
        message: "Validate reset token started",
      });

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "ValidateResetTokenUseCase",
        event: "VALIDATE_RESET_TOKEN_COMPLETED",
        message: "Validate reset token completed",
        durationMs: expect.any(Number),
      });
    });

    it("should fingerprint token before lookup", async () => {
      const customToken = "my-secure-token";
      const customCommand: ValidateResetTokenCommand = {
        resetPasswordToken: customToken,
      };

      mockFingerprintProvider.fingerprint.mockReturnValue("fingerprint-my-secure-token");

      await validateResetTokenUseCase.execute(customCommand);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(customToken);
      expect(mockApplicationTokenRepository.findByTokenFingerprint).toHaveBeenCalledWith("fingerprint-my-secure-token");
    });

    it("should validate token with grace period from policy", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(mockGracePeriodMs);
    });

    it("should return token expiry information", async () => {
      const futureDate = new Date(Date.now() + 3600000);
      mockPasswordResetToken.getExpiresAt.mockReturnValue(futureDate);
      mockPasswordResetToken.getRemainingTimeMs.mockReturnValue(3600000);

      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result.expiresAt).toEqual(futureDate);
      expect(result.remainingTimeMs).toBe(3600000);
    });

    it("should calculate duration correctly", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      const startTime = 1000;
      const endTime = 1150;
      dateNowSpy.mockReturnValueOnce(startTime);
      dateNowSpy.mockReturnValueOnce(endTime);

      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );

      dateNowSpy.mockRestore();
    });

    it("should read grace period from policy", () => {
      expect(validateResetTokenUseCase["passwordResetPolicy"].gracePeriodMs).toBe(mockGracePeriodMs);
    });
  });

  describe("execute - token not found", () => {
    it("should throw ResetTokenNotFoundException when token does not exist", async () => {
      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(null);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockTokenValue);
      expect(mockPasswordResetToken.assertWithinGracePeriod).not.toHaveBeenCalled();
    });

    it("should throw ResetTokenNotFoundException when token fingerprint does not match any record", async () => {
      mockFingerprintProvider.fingerprint.mockReturnValue("wrong-fingerprint");
      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(null);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);

      expect(mockApplicationTokenRepository.findByTokenFingerprint).toHaveBeenCalledWith("wrong-fingerprint");
    });

    it("should throw ResetTokenNotFoundException when token is not a PasswordResetToken instance", async () => {
      const nonToken = {
        getId: jest.fn().mockReturnValue("some-id"),
        getExpiresAt: jest.fn(),
        getRemainingTimeMs: jest.fn(),
      };

      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(nonToken as unknown as PasswordResetToken);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);

      expect(mockPasswordResetToken.assertWithinGracePeriod).not.toHaveBeenCalled();
    });

    it("should throw ResetTokenNotFoundException when token is undefined", async () => {
      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(undefined as unknown as PasswordResetToken);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });

    it("should throw ResetTokenNotFoundException when token is null", async () => {
      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(null);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });
  });

  describe("execute - token validation failure", () => {
    it("should throw error when assertWithinGracePeriod fails", async () => {
      const validationError = new Error("Token has expired");
      mockPasswordResetToken.assertWithinGracePeriod.mockImplementation(() => {
        throw validationError;
      });

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow("Token has expired");
      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalled();
    });

    it("should propagate grace period validation errors", async () => {
      const validationError = new Error("Token expired beyond grace period");
      mockPasswordResetToken.assertWithinGracePeriod.mockImplementation(() => {
        throw validationError;
      });

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow("Token expired beyond grace period");
    });

    it("should not return result when validation throws", async () => {
      mockPasswordResetToken.assertWithinGracePeriod.mockImplementation(() => {
        throw new Error("Token validation failed");
      });

      try {
        await validateResetTokenUseCase.execute(mockCommand);
        fail("Expected exception was not thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Token validation failed");
      }
    });
  });

  describe("error handling", () => {
    it("should handle repository errors", async () => {
      const mockError = new Error("Database error");
      mockApplicationTokenRepository.findByTokenFingerprint.mockRejectedValue(mockError);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow("Database error");
    });

    it("should handle fingerprint provider errors", async () => {
      const mockError = new Error("Fingerprint error");
      mockFingerprintProvider.fingerprint.mockImplementation(() => {
        throw mockError;
      });

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow("Fingerprint error");
    });

    it("should handle repository returning null", async () => {
      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(null);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });

    it("should handle repository returning undefined", async () => {
      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(undefined as unknown as PasswordResetToken);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });
  });

  describe("edge cases", () => {
    it("should handle token with special characters", async () => {
      const specialToken = "token-with-special-!@#$%^&*()";
      const customCommand: ValidateResetTokenCommand = {
        resetPasswordToken: specialToken,
      };

      mockFingerprintProvider.fingerprint.mockReturnValue("fingerprint-special");

      const result = await validateResetTokenUseCase.execute(customCommand);

      expect(result.expiresAt).toBeDefined();
      expect(result.remainingTimeMs).toBeDefined();
      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(specialToken);
    });

    it("should handle very long tokens", async () => {
      const longToken = "a".repeat(500);
      const customCommand: ValidateResetTokenCommand = {
        resetPasswordToken: longToken,
      };

      mockFingerprintProvider.fingerprint.mockReturnValue("fingerprint-long-token");

      const result = await validateResetTokenUseCase.execute(customCommand);

      expect(result.expiresAt).toBeDefined();
      expect(result.remainingTimeMs).toBeDefined();
      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(longToken);
    });

    it("should handle token with minimal remaining time", async () => {
      const almostExpiredDate = new Date(Date.now() + 1000);
      mockPasswordResetToken.getExpiresAt.mockReturnValue(almostExpiredDate);
      mockPasswordResetToken.getRemainingTimeMs.mockReturnValue(1000);

      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result.expiresAt).toEqual(almostExpiredDate);
      expect(result.remainingTimeMs).toBe(1000);
    });

    it("should handle token with maximum remaining time", async () => {
      const maxExpiredDate = new Date(Date.now() + 86400000);
      mockPasswordResetToken.getExpiresAt.mockReturnValue(maxExpiredDate);
      mockPasswordResetToken.getRemainingTimeMs.mockReturnValue(86400000);

      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result.expiresAt).toEqual(maxExpiredDate);
      expect(result.remainingTimeMs).toBe(86400000);
    });

    it("should handle empty token string", async () => {
      const emptyCommand: ValidateResetTokenCommand = {
        resetPasswordToken: "",
      };

      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(null);

      await expect(validateResetTokenUseCase.execute(emptyCommand)).rejects.toThrow(ResetTokenNotFoundException);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith("");
    });

    it("should handle null token", async () => {
      const nullCommand: ValidateResetTokenCommand = {
        resetPasswordToken: null as unknown as string,
      };

      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(null);

      await expect(validateResetTokenUseCase.execute(nullCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });

    it("should handle undefined token", async () => {
      const undefinedCommand: ValidateResetTokenCommand = {
        resetPasswordToken: undefined as unknown as string,
      };

      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(null);

      await expect(validateResetTokenUseCase.execute(undefinedCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });

    it("should handle token with zero remaining time", async () => {
      const expiredDate = new Date(Date.now());
      mockPasswordResetToken.getExpiresAt.mockReturnValue(expiredDate);
      mockPasswordResetToken.getRemainingTimeMs.mockReturnValue(0);

      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result.expiresAt).toEqual(expiredDate);
      expect(result.remainingTimeMs).toBe(0);
    });

    it("should handle token with negative remaining time (already expired)", async () => {
      const expiredDate = new Date(Date.now() - 1000);
      mockPasswordResetToken.getExpiresAt.mockReturnValue(expiredDate);
      mockPasswordResetToken.getRemainingTimeMs.mockReturnValue(-1000);

      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result.expiresAt).toEqual(expiredDate);
      expect(result.remainingTimeMs).toBe(-1000);
    });

    it("should handle token with Unicode characters", async () => {
      const unicodeToken = "token-🚀-✨-🔐";
      const customCommand: ValidateResetTokenCommand = {
        resetPasswordToken: unicodeToken,
      };

      mockFingerprintProvider.fingerprint.mockReturnValue("fingerprint-unicode");

      const result = await validateResetTokenUseCase.execute(customCommand);

      expect(result.expiresAt).toBeDefined();
      expect(result.remainingTimeMs).toBeDefined();
      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(unicodeToken);
    });
  });

  describe("validation flow", () => {
    it("should validate in correct order: fingerprint -> find -> validate", async () => {
      const callOrder: string[] = [];

      mockFingerprintProvider.fingerprint.mockImplementation(() => {
        callOrder.push("fingerprint");
        return "fingerprint-token";
      });

      mockApplicationTokenRepository.findByTokenFingerprint.mockImplementation(async () => {
        callOrder.push("find");
        return mockPasswordResetToken;
      });

      mockPasswordResetToken.assertWithinGracePeriod.mockImplementation(() => {
        callOrder.push("validate");
      });

      await validateResetTokenUseCase.execute(mockCommand);

      expect(callOrder).toEqual(["fingerprint", "find", "validate"]);
    });

    it("should not attempt validation if token is not found", async () => {
      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(null);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);

      expect(mockPasswordResetToken.assertWithinGracePeriod).not.toHaveBeenCalled();
    });

    it("should not attempt validation if token is not PasswordResetToken instance", async () => {
      const nonToken = {
        getId: jest.fn().mockReturnValue("some-id"),
      };

      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(nonToken as unknown as PasswordResetToken);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);

      expect(mockPasswordResetToken.assertWithinGracePeriod).not.toHaveBeenCalled();
    });

    it("should call assertWithinGracePeriod after finding token", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockApplicationTokenRepository.findByTokenFingerprint).toHaveBeenCalled();
      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalled();
    });
  });

  describe("logging scenarios", () => {
    it("should log debug start with correct context", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "ValidateResetTokenUseCase",
        event: "VALIDATE_RESET_TOKEN_STARTED",
        message: "Validate reset token started",
      });
    });

    it("should log debug completion with duration", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "ValidateResetTokenUseCase",
        event: "VALIDATE_RESET_TOKEN_COMPLETED",
        message: "Validate reset token completed",
        durationMs: expect.any(Number),
      });
    });

    it("should not log completion when validation fails", async () => {
      mockPasswordResetToken.assertWithinGracePeriod.mockImplementation(() => {
        throw new Error("Validation failed");
      });

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow("Validation failed");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "VALIDATE_RESET_TOKEN_STARTED",
        }),
      );
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.objectContaining({
          event: "VALIDATE_RESET_TOKEN_COMPLETED",
        }),
      );
    });

    it("should log both start and completion events on success", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          event: "VALIDATE_RESET_TOKEN_STARTED",
        }),
      );
      expect(mockLogger.debug).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          event: "VALIDATE_RESET_TOKEN_COMPLETED",
        }),
      );
    });

    it("should handle logger error gracefully", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("read-only operation", () => {
    it("should not modify the token", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalled();
      expect(mockPasswordResetToken.getExpiresAt).toHaveBeenCalled();
      expect(mockPasswordResetToken.getRemainingTimeMs).toHaveBeenCalled();

      expect(mockApplicationTokenRepository.findByTokenFingerprint).toHaveBeenCalled();
      expect(mockApplicationTokenRepository.insert).not.toHaveBeenCalled();
      expect(mockApplicationTokenRepository.update).not.toHaveBeenCalled();
      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).not.toHaveBeenCalled();
    });

    it("should not persist any changes", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockApplicationTokenRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("response formatting", () => {
    it("should return expiresAt as Date object", async () => {
      const expiresAt = new Date();
      mockPasswordResetToken.getExpiresAt.mockReturnValue(expiresAt);

      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBe(expiresAt);
    });

    it("should return remainingTimeMs as number", async () => {
      mockPasswordResetToken.getRemainingTimeMs.mockReturnValue(300000);

      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result.remainingTimeMs).toBe(300000);
      expect(typeof result.remainingTimeMs).toBe("number");
    });

    it("should return both properties in result", async () => {
      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result).toHaveProperty("expiresAt");
      expect(result).toHaveProperty("remainingTimeMs");
    });
  });

  describe("grace period validation", () => {
    it("should call assertWithinGracePeriod with correct grace period", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(mockGracePeriodMs);
    });

    it("should propagate validation errors with metadata", async () => {
      const validationError = new Error("Token expired beyond grace period");
      mockPasswordResetToken.assertWithinGracePeriod.mockImplementation(() => {
        throw validationError;
      });

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow("Token expired beyond grace period");
    });

    it("should use grace period from policy", async () => {
      const customGracePeriod = 600000;
      mockPasswordResetPolicy.gracePeriodMs = customGracePeriod;

      const newUseCase = new ValidateResetTokenUseCase(mockPasswordResetPolicy, mockApplicationTokenRepository, mockFingerprintProvider, mockLogger);

      await newUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(customGracePeriod);
    });

    it("should handle zero grace period", async () => {
      mockPasswordResetPolicy.gracePeriodMs = 0;

      const newUseCase = new ValidateResetTokenUseCase(mockPasswordResetPolicy, mockApplicationTokenRepository, mockFingerprintProvider, mockLogger);

      await newUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalledWith(0);
    });
  });

  describe("private method findAndValidateTokenForUI", () => {
    it("should find token by fingerprint value", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockTokenValue);
      expect(mockApplicationTokenRepository.findByTokenFingerprint).toHaveBeenCalledWith(mockTokenFingerprint);
    });

    it("should throw ResetTokenNotFoundException when token not found", async () => {
      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(null);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });

    it("should throw ResetTokenNotFoundException when token is wrong type", async () => {
      const wrongToken = { someProperty: "value" };
      mockApplicationTokenRepository.findByTokenFingerprint.mockResolvedValue(wrongToken as unknown as PasswordResetToken);

      await expect(validateResetTokenUseCase.execute(mockCommand)).rejects.toThrow(ResetTokenNotFoundException);
    });

    it("should validate token with grace period when found", async () => {
      await validateResetTokenUseCase.execute(mockCommand);

      expect(mockPasswordResetToken.assertWithinGracePeriod).toHaveBeenCalled();
    });

    it("should handle token with null expiresAt", async () => {
      mockPasswordResetToken.getExpiresAt.mockReturnValue(null as unknown as Date);
      mockPasswordResetToken.getRemainingTimeMs.mockReturnValue(0);

      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result.expiresAt).toBeNull();
      expect(result.remainingTimeMs).toBe(0);
    });
  });

  describe("performance considerations", () => {
    it("should execute validation quickly", async () => {
      const startTime = Date.now();
      await validateResetTokenUseCase.execute(mockCommand);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple validations efficiently", async () => {
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await validateResetTokenUseCase.execute(mockCommand);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("type safety", () => {
    it("should return ValidateResetTokenResult type", async () => {
      const result = await validateResetTokenUseCase.execute(mockCommand);

      expect(result).toHaveProperty("expiresAt");
      expect(result).toHaveProperty("remainingTimeMs");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(typeof result.remainingTimeMs).toBe("number");
    });

    it("should accept ValidateResetTokenCommand type", async () => {
      const command: ValidateResetTokenCommand = {
        resetPasswordToken: mockTokenValue,
      };

      const result = await validateResetTokenUseCase.execute(command);
      expect(result).toHaveProperty("expiresAt");
    });

    it("should have correct return type", async () => {
      const result: Promise<{ expiresAt: Date; remainingTimeMs: number }> = validateResetTokenUseCase.execute(mockCommand);

      expect(result).toBeInstanceOf(Promise);
    });
  });
});
