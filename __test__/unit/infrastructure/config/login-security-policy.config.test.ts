import { LoginSecurityPolicyEnvConfig } from "@/infrastructure/config/login-security-policy.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    number: jest.fn(),
  },
}));

describe("LoginSecurityPolicyEnvConfig", () => {
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with default values when environment variables are not set", () => {
      mockEnvNumber.mockImplementation((key: string, fallback?: number) => {
        return fallback as number;
      });

      const config = new LoginSecurityPolicyEnvConfig();

      expect(config.accountLockDurationInMinutes).toBe(5);
      expect(config.maxLoginAttempts).toBe(5);

      expect(mockEnvNumber).toHaveBeenCalledTimes(2);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(1, "ACCOUNT_LOCK_DURATION_IN_MINUTES", 5);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(2, "MAX_LOGIN_ATTEMPTS", 5);
    });

    it("should initialize all properties with values from environment variables", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          ACCOUNT_LOCK_DURATION_IN_MINUTES: 30,
          MAX_LOGIN_ATTEMPTS: 10,
        };
        return values[key];
      });

      const config = new LoginSecurityPolicyEnvConfig();

      expect(config.accountLockDurationInMinutes).toBe(30);
      expect(config.maxLoginAttempts).toBe(10);
    });

    it("should throw error when maxLoginAttempts is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_LOGIN_ATTEMPTS") return 0;
        return 5;
      });

      expect(() => new LoginSecurityPolicyEnvConfig()).toThrow("MAX_LOGIN_ATTEMPTS must be positive");
    });

    it("should throw error when maxLoginAttempts is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_LOGIN_ATTEMPTS") return -5;
        return 5;
      });

      expect(() => new LoginSecurityPolicyEnvConfig()).toThrow("MAX_LOGIN_ATTEMPTS must be positive");
    });

    it("should throw error when accountLockDurationInMinutes is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCOUNT_LOCK_DURATION_IN_MINUTES") return 0;
        return 5;
      });

      expect(() => new LoginSecurityPolicyEnvConfig()).toThrow("ACCOUNT_LOCK_DURATION_IN_MINUTES must be positive");
    });

    it("should throw error when accountLockDurationInMinutes is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCOUNT_LOCK_DURATION_IN_MINUTES") return -10;
        return 5;
      });

      expect(() => new LoginSecurityPolicyEnvConfig()).toThrow("ACCOUNT_LOCK_DURATION_IN_MINUTES must be positive");
    });

    it("should throw error when both values are invalid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          ACCOUNT_LOCK_DURATION_IN_MINUTES: -5,
          MAX_LOGIN_ATTEMPTS: -3,
        };
        return values[key];
      });

      expect(() => new LoginSecurityPolicyEnvConfig()).toThrow("MAX_LOGIN_ATTEMPTS must be positive");
    });

    it("should handle decimal values correctly", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          ACCOUNT_LOCK_DURATION_IN_MINUTES: 5.5,
          MAX_LOGIN_ATTEMPTS: 3.5,
        };
        return values[key];
      });

      const config = new LoginSecurityPolicyEnvConfig();

      expect(config.accountLockDurationInMinutes).toBe(5.5);
      expect(config.maxLoginAttempts).toBe(3.5);
    });

    it("should handle large numbers correctly", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new LoginSecurityPolicyEnvConfig();

      expect(config.accountLockDurationInMinutes).toBe(largeNumber);
      expect(config.maxLoginAttempts).toBe(largeNumber);
    });

    it("should call validate after setting properties", () => {
      const validateSpy = jest.spyOn(LoginSecurityPolicyEnvConfig.prototype as any, "validate");
      mockEnvNumber.mockReturnValue(5);

      new LoginSecurityPolicyEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement LoginSecurityPolicy interface correctly", () => {
      mockEnvNumber.mockReturnValue(5);

      const config = new LoginSecurityPolicyEnvConfig();

      expect(config).toMatchObject({
        accountLockDurationInMinutes: expect.any(Number),
        maxLoginAttempts: expect.any(Number),
      });
    });

    it("should call env.number with correct environment variable names in order", () => {
      const callOrder: string[] = [];
      mockEnvNumber.mockImplementation((key: string) => {
        callOrder.push(key);
        return 5;
      });

      new LoginSecurityPolicyEnvConfig();

      expect(callOrder).toEqual(["ACCOUNT_LOCK_DURATION_IN_MINUTES", "MAX_LOGIN_ATTEMPTS"]);
    });

    it("should handle undefined from env.number when fallback is not provided", () => {
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new LoginSecurityPolicyEnvConfig();

      expect(config.accountLockDurationInMinutes).toBeUndefined();
      expect(config.maxLoginAttempts).toBeUndefined();
    });

    it("should handle partial environment variable overrides", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_LOGIN_ATTEMPTS") return 10;
        return 5;
      });

      const config = new LoginSecurityPolicyEnvConfig();

      expect(config.accountLockDurationInMinutes).toBe(5);
      expect(config.maxLoginAttempts).toBe(10);
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCOUNT_LOCK_DURATION_IN_MINUTES") return 5;
        if (key === "MAX_LOGIN_ATTEMPTS") return 5;
        return 0;
      });

      const config = new LoginSecurityPolicyEnvConfig();

      expect(config.accountLockDurationInMinutes).toBe(5);
      expect(config.maxLoginAttempts).toBe(5);

      const descriptor = Object.getOwnPropertyDescriptor(config, "accountLockDurationInMinutes");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should handle undefined from env.number when no fallback is provided", () => {
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new LoginSecurityPolicyEnvConfig();

      expect(config.accountLockDurationInMinutes).toBeUndefined();
      expect(config.maxLoginAttempts).toBeUndefined();
      expect(() => new LoginSecurityPolicyEnvConfig()).not.toThrow();
    });

    it("should throw error when env.number throws", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        throw new Error(`${key} must be a number`);
      });

      expect(() => new LoginSecurityPolicyEnvConfig()).toThrow("ACCOUNT_LOCK_DURATION_IN_MINUTES must be a number");
    });
  });

  describe("validate", () => {
    it("should not throw error when both values are positive", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          ACCOUNT_LOCK_DURATION_IN_MINUTES: 10,
          MAX_LOGIN_ATTEMPTS: 3,
        };
        return values[key];
      });

      expect(() => new LoginSecurityPolicyEnvConfig()).not.toThrow();
    });

    it("should throw error when maxLoginAttempts is 0 even if accountLockDurationInMinutes is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "MAX_LOGIN_ATTEMPTS") return 0;
        return 10;
      });

      expect(() => new LoginSecurityPolicyEnvConfig()).toThrow("MAX_LOGIN_ATTEMPTS must be positive");
    });

    it("should throw error when accountLockDurationInMinutes is 0 even if maxLoginAttempts is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCOUNT_LOCK_DURATION_IN_MINUTES") return 0;
        return 3;
      });

      expect(() => new LoginSecurityPolicyEnvConfig()).toThrow("ACCOUNT_LOCK_DURATION_IN_MINUTES must be positive");
    });
  });
});
