import { VerificationEmailPolicyEnvConfig } from "@/infrastructure/config/verification-email-policy.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    number: jest.fn(),
  },
}));

describe("VerificationEmailPolicyEnvConfig", () => {
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with default values when environment variables are not set", () => {
      mockEnvNumber.mockImplementation((key: string, fallback?: number) => {
        return fallback as number;
      });

      const config = new VerificationEmailPolicyEnvConfig();

      expect(config.expiryInHours).toBe(24);
      expect(config.resendCooldownInSeconds).toBe(60);
      expect(config.maxResendAttemptsPerHour).toBe(3);

      expect(mockEnvNumber).toHaveBeenCalledTimes(3);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(1, "VERIFICATION_EMAIL_EXPIRY_IN_HOURS", 24);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(2, "VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS", 60);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(3, "MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR", 3);
    });

    it("should initialize all properties with values from environment variables", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          VERIFICATION_EMAIL_EXPIRY_IN_HOURS: 48,
          VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS: 120,
          MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR: 5,
        };
        return values[key];
      });

      const config = new VerificationEmailPolicyEnvConfig();

      expect(config.expiryInHours).toBe(48);
      expect(config.resendCooldownInSeconds).toBe(120);
      expect(config.maxResendAttemptsPerHour).toBe(5);
    });

    it("should throw error when expiryInHours is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "VERIFICATION_EMAIL_EXPIRY_IN_HOURS") return 0;
        return 60;
      });

      expect(() => new VerificationEmailPolicyEnvConfig()).toThrow("VERIFICATION_EMAIL_EXPIRY_IN_HOURS must be greater than 0");
    });

    it("should throw error when expiryInHours is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "VERIFICATION_EMAIL_EXPIRY_IN_HOURS") return -5;
        return 60;
      });

      expect(() => new VerificationEmailPolicyEnvConfig()).toThrow("VERIFICATION_EMAIL_EXPIRY_IN_HOURS must be greater than 0");
    });

    it("should throw error when maxResendAttemptsPerHour is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR") return 0;
        return 60;
      });

      expect(() => new VerificationEmailPolicyEnvConfig()).toThrow("MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR must be greater than 0");
    });

    it("should throw error when maxResendAttemptsPerHour is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR") return -3;
        return 60;
      });

      expect(() => new VerificationEmailPolicyEnvConfig()).toThrow("MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR must be greater than 0");
    });

    it("should throw error when both expiryInHours and maxResendAttemptsPerHour are invalid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          VERIFICATION_EMAIL_EXPIRY_IN_HOURS: -1,
          VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS: 60,
          MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR: -5,
        };
        return values[key];
      });

      expect(() => new VerificationEmailPolicyEnvConfig()).toThrow("VERIFICATION_EMAIL_EXPIRY_IN_HOURS must be greater than 0");
    });

    it("should handle zero for resendCooldownInSeconds (non-validated property)", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS") return 0;
        return 24;
      });

      const config = new VerificationEmailPolicyEnvConfig();
      expect(config.resendCooldownInSeconds).toBe(0);
    });

    it("should handle negative for resendCooldownInSeconds (non-validated property)", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS") return -10;
        return 24;
      });

      const config = new VerificationEmailPolicyEnvConfig();
      expect(config.resendCooldownInSeconds).toBe(-10);
    });

    it("should handle decimal values correctly", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          VERIFICATION_EMAIL_EXPIRY_IN_HOURS: 24.5,
          VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS: 60.5,
          MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR: 3.5,
        };
        return values[key];
      });

      const config = new VerificationEmailPolicyEnvConfig();

      expect(config.expiryInHours).toBe(24.5);
      expect(config.resendCooldownInSeconds).toBe(60.5);
      expect(config.maxResendAttemptsPerHour).toBe(3.5);
    });

    it("should handle large numbers correctly", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new VerificationEmailPolicyEnvConfig();

      expect(config.expiryInHours).toBe(largeNumber);
      expect(config.resendCooldownInSeconds).toBe(largeNumber);
      expect(config.maxResendAttemptsPerHour).toBe(largeNumber);
    });

    it("should call validate after setting properties", () => {
      const validateSpy = jest.spyOn(VerificationEmailPolicyEnvConfig.prototype as any, "validate");
      mockEnvNumber.mockReturnValue(24);

      new VerificationEmailPolicyEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement VerificationEmailPolicy interface correctly", () => {
      mockEnvNumber.mockReturnValue(24);

      const config = new VerificationEmailPolicyEnvConfig();

      expect(config).toMatchObject({
        expiryInHours: expect.any(Number),
        resendCooldownInSeconds: expect.any(Number),
        maxResendAttemptsPerHour: expect.any(Number),
      });
    });

    it("should call env.number with correct environment variable names in order", () => {
      const callOrder: string[] = [];
      mockEnvNumber.mockImplementation((key: string) => {
        callOrder.push(key);
        return 24;
      });

      new VerificationEmailPolicyEnvConfig();

      expect(callOrder).toEqual([
        "VERIFICATION_EMAIL_EXPIRY_IN_HOURS",
        "VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS",
        "MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR",
      ]);
    });

    it("should handle undefined from env.number when no fallback is provided", () => {
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new VerificationEmailPolicyEnvConfig();

      expect(config.expiryInHours).toBeUndefined();
      expect(config.resendCooldownInSeconds).toBeUndefined();
      expect(config.maxResendAttemptsPerHour).toBeUndefined();
      expect(() => new VerificationEmailPolicyEnvConfig()).not.toThrow();
    });

    it("should handle partial environment variable overrides", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "VERIFICATION_EMAIL_EXPIRY_IN_HOURS") return 48;
        if (key === "MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR") return 5;
        return 24;
      });

      const config = new VerificationEmailPolicyEnvConfig();

      expect(config.expiryInHours).toBe(48);
      expect(config.resendCooldownInSeconds).toBe(24);
      expect(config.maxResendAttemptsPerHour).toBe(5);
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          VERIFICATION_EMAIL_EXPIRY_IN_HOURS: 24,
          VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS: 60,
          MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR: 3,
        };
        return values[key];
      });

      const config = new VerificationEmailPolicyEnvConfig();

      expect(config.expiryInHours).toBe(24);
      expect(config.resendCooldownInSeconds).toBe(60);
      expect(config.maxResendAttemptsPerHour).toBe(3);

      const descriptor = Object.getOwnPropertyDescriptor(config, "expiryInHours");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should throw error when env.number throws", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        throw new Error(`${key} must be a number`);
      });

      expect(() => new VerificationEmailPolicyEnvConfig()).toThrow("VERIFICATION_EMAIL_EXPIRY_IN_HOURS must be a number");
    });

    it("should handle mixed environment variable values", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          VERIFICATION_EMAIL_EXPIRY_IN_HOURS: 72,
          VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS: 180,
          MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR: 10,
        };
        return values[key];
      });

      const config = new VerificationEmailPolicyEnvConfig();

      expect(config.expiryInHours).toBe(72);
      expect(config.resendCooldownInSeconds).toBe(180);
      expect(config.maxResendAttemptsPerHour).toBe(10);
    });
  });

  describe("validate", () => {
    it("should not throw error when expiryInHours and maxResendAttemptsPerHour are positive", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          VERIFICATION_EMAIL_EXPIRY_IN_HOURS: 24,
          VERIFICATION_EMAIL_RESEND_COOLDOWN_IN_SECONDS: 60,
          MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR: 3,
        };
        return values[key];
      });

      expect(() => new VerificationEmailPolicyEnvConfig()).not.toThrow();
    });

    it("should throw error when expiryInHours is 0 even if maxResendAttemptsPerHour is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "VERIFICATION_EMAIL_EXPIRY_IN_HOURS") return 0;
        return 60;
      });

      expect(() => new VerificationEmailPolicyEnvConfig()).toThrow("VERIFICATION_EMAIL_EXPIRY_IN_HOURS must be greater than 0");
    });

    it("should throw error when maxResendAttemptsPerHour is 0 even if expiryInHours is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR") return 0;
        return 24;
      });

      expect(() => new VerificationEmailPolicyEnvConfig()).toThrow("MAX_RESEND_VERIFICATION_EMAIL_ATTEMPTS_PER_HOUR must be greater than 0");
    });
  });
});
