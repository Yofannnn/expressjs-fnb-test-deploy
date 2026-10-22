import { PasswordResetPolicyEnvConfig } from "@/infrastructure/config/password-reset-policy.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    number: jest.fn(),
  },
}));

describe("PasswordResetPolicyEnvConfig", () => {
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with default values when environment variables are not set", () => {
      mockEnvNumber.mockImplementation((key: string, fallback?: number) => {
        return fallback as number;
      });

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBe(60);
      expect(config.expiryInMinutes).toBe(15);
      expect(config.gracePeriodMs).toBe(30000);
      expect(config.maxResendAttemptsPerHour).toBe(3);

      expect(mockEnvNumber).toHaveBeenCalledTimes(4);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(1, "PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS", 60);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(2, "PASSWORD_RESET_EXPIRY_IN_MINUTES", 15);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(3, "PASSWORD_RESET_GRACE_PERIOD_IN_MS", 30000);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(4, "MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR", 3);
    });

    it("should initialize all properties with values from environment variables", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS: 120,
          PASSWORD_RESET_EXPIRY_IN_MINUTES: 30,
          PASSWORD_RESET_GRACE_PERIOD_IN_MS: 60000,
          MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR: 5,
        };
        return values[key];
      });

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBe(120);
      expect(config.expiryInMinutes).toBe(30);
      expect(config.gracePeriodMs).toBe(60000);
      expect(config.maxResendAttemptsPerHour).toBe(5);
    });

    it("should throw error when expiryInMinutes is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "PASSWORD_RESET_EXPIRY_IN_MINUTES") return 0;
        return 60;
      });

      expect(() => new PasswordResetPolicyEnvConfig()).toThrow("PASSWORD_RESET_EXPIRY_IN_MINUTES must be greater than 0");
    });

    it("should throw error when expiryInMinutes is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "PASSWORD_RESET_EXPIRY_IN_MINUTES") return -5;
        return 60;
      });

      expect(() => new PasswordResetPolicyEnvConfig()).toThrow("PASSWORD_RESET_EXPIRY_IN_MINUTES must be greater than 0");
    });

    it("should throw error when maxResendAttemptsPerHour is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR") return 0;
        return 60;
      });

      expect(() => new PasswordResetPolicyEnvConfig()).toThrow("MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR must be greater than 0");
    });

    it("should throw error when maxResendAttemptsPerHour is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR") return -3;
        return 60;
      });

      expect(() => new PasswordResetPolicyEnvConfig()).toThrow("MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR must be greater than 0");
    });

    it("should throw error when both expiryInMinutes and maxResendAttemptsPerHour are invalid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS: 60,
          PASSWORD_RESET_EXPIRY_IN_MINUTES: -1,
          PASSWORD_RESET_GRACE_PERIOD_IN_MS: 30000,
          MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR: -5,
        };
        return values[key];
      });

      expect(() => new PasswordResetPolicyEnvConfig()).toThrow("PASSWORD_RESET_EXPIRY_IN_MINUTES must be greater than 0");
    });

    it("should handle zero values for non-validated properties", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS: 0,
          PASSWORD_RESET_EXPIRY_IN_MINUTES: 15,
          PASSWORD_RESET_GRACE_PERIOD_IN_MS: 0,
          MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR: 3,
        };
        return values[key];
      });

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBe(0);
      expect(config.expiryInMinutes).toBe(15);
      expect(config.gracePeriodMs).toBe(0);
      expect(config.maxResendAttemptsPerHour).toBe(3);
    });

    it("should handle negative values for non-validated properties", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS: -10,
          PASSWORD_RESET_EXPIRY_IN_MINUTES: 15,
          PASSWORD_RESET_GRACE_PERIOD_IN_MS: -20,
          MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR: 3,
        };
        return values[key];
      });

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBe(-10);
      expect(config.expiryInMinutes).toBe(15);
      expect(config.gracePeriodMs).toBe(-20);
      expect(config.maxResendAttemptsPerHour).toBe(3);
    });

    it("should handle decimal values correctly", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS: 60.5,
          PASSWORD_RESET_EXPIRY_IN_MINUTES: 15.5,
          PASSWORD_RESET_GRACE_PERIOD_IN_MS: 30000.75,
          MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR: 3.5,
        };
        return values[key];
      });

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBe(60.5);
      expect(config.expiryInMinutes).toBe(15.5);
      expect(config.gracePeriodMs).toBe(30000.75);
      expect(config.maxResendAttemptsPerHour).toBe(3.5);
    });

    it("should handle large numbers correctly", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBe(largeNumber);
      expect(config.expiryInMinutes).toBe(largeNumber);
      expect(config.gracePeriodMs).toBe(largeNumber);
      expect(config.maxResendAttemptsPerHour).toBe(largeNumber);
    });

    it("should call validate after setting properties", () => {
      const validateSpy = jest.spyOn(PasswordResetPolicyEnvConfig.prototype as any, "validate");
      mockEnvNumber.mockReturnValue(60);

      new PasswordResetPolicyEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement PasswordResetPolicy interface correctly", () => {
      mockEnvNumber.mockReturnValue(60);

      const config = new PasswordResetPolicyEnvConfig();

      expect(config).toMatchObject({
        resendCooldownInSeconds: expect.any(Number),
        expiryInMinutes: expect.any(Number),
        gracePeriodMs: expect.any(Number),
        maxResendAttemptsPerHour: expect.any(Number),
      });
    });

    it("should call env.number with correct environment variable names in order", () => {
      const callOrder: string[] = [];
      mockEnvNumber.mockImplementation((key: string) => {
        callOrder.push(key);
        return 60;
      });

      new PasswordResetPolicyEnvConfig();

      expect(callOrder).toEqual([
        "PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS",
        "PASSWORD_RESET_EXPIRY_IN_MINUTES",
        "PASSWORD_RESET_GRACE_PERIOD_IN_MS",
        "MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR",
      ]);
    });

    it("should handle undefined from env.number when fallback is not provided", () => {
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBeUndefined();
      expect(config.expiryInMinutes).toBeUndefined();
      expect(config.gracePeriodMs).toBeUndefined();
      expect(config.maxResendAttemptsPerHour).toBeUndefined();
    });

    it("should handle partial environment variable overrides", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "PASSWORD_RESET_EXPIRY_IN_MINUTES") return 30;
        if (key === "MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR") return 5;
        return 60;
      });

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBe(60);
      expect(config.expiryInMinutes).toBe(30);
      expect(config.gracePeriodMs).toBe(60);
      expect(config.maxResendAttemptsPerHour).toBe(5);
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS: 60,
          PASSWORD_RESET_EXPIRY_IN_MINUTES: 15,
          PASSWORD_RESET_GRACE_PERIOD_IN_MS: 30000,
          MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR: 3,
        };
        return values[key];
      });

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBe(60);
      expect(config.expiryInMinutes).toBe(15);
      expect(config.gracePeriodMs).toBe(30000);
      expect(config.maxResendAttemptsPerHour).toBe(3);

      const descriptor = Object.getOwnPropertyDescriptor(config, "resendCooldownInSeconds");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should handle undefined from env.number when no fallback is provided", () => {
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new PasswordResetPolicyEnvConfig();

      expect(config.resendCooldownInSeconds).toBeUndefined();
      expect(config.expiryInMinutes).toBeUndefined();
      expect(config.gracePeriodMs).toBeUndefined();
      expect(config.maxResendAttemptsPerHour).toBeUndefined();
      expect(() => new PasswordResetPolicyEnvConfig()).not.toThrow();
    });

    it("should throw error when env.number throws", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        throw new Error(`${key} must be a number`);
      });

      expect(() => new PasswordResetPolicyEnvConfig()).toThrow("PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS must be a number");
    });
  });

  describe("validate", () => {
    it("should not throw error when expiryInMinutes and maxResendAttemptsPerHour are positive", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          PASSWORD_RESET_RESEND_COOLDOWN_IN_SECONDS: 60,
          PASSWORD_RESET_EXPIRY_IN_MINUTES: 15,
          PASSWORD_RESET_GRACE_PERIOD_IN_MS: 30000,
          MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR: 3,
        };
        return values[key];
      });

      expect(() => new PasswordResetPolicyEnvConfig()).not.toThrow();
    });

    it("should throw error when expiryInMinutes is 0 even if maxResendAttemptsPerHour is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "PASSWORD_RESET_EXPIRY_IN_MINUTES") return 0;
        return 60;
      });

      expect(() => new PasswordResetPolicyEnvConfig()).toThrow("PASSWORD_RESET_EXPIRY_IN_MINUTES must be greater than 0");
    });

    it("should throw error when maxResendAttemptsPerHour is 0 even if expiryInMinutes is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR") return 0;
        return 15;
      });

      expect(() => new PasswordResetPolicyEnvConfig()).toThrow("MAX_RESEND_PASSWORD_RESET_ATTEMPTS_PER_HOUR must be greater than 0");
    });
  });
});
