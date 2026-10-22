import { SessionPolicyEnvConfig } from "@/infrastructure/config/session-policy.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    number: jest.fn(),
  },
}));

describe("SessionPolicyEnvConfig", () => {
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with default values when environment variables are not set", () => {
      mockEnvNumber.mockImplementation((key: string, fallback?: number) => {
        return fallback as number;
      });

      const config = new SessionPolicyEnvConfig();

      expect(config.accessTokenExpiryInMinutes).toBe(15);
      expect(config.refreshTokenExpiryInDays).toBe(30);

      expect(mockEnvNumber).toHaveBeenCalledTimes(2);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(1, "ACCESS_TOKEN_EXPIRY_IN_MINUTES", 15);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(2, "REFRESH_TOKEN_EXPIRY_IN_DAYS", 30);
    });

    it("should initialize all properties with values from environment variables", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          ACCESS_TOKEN_EXPIRY_IN_MINUTES: 30,
          REFRESH_TOKEN_EXPIRY_IN_DAYS: 60,
        };
        return values[key];
      });

      const config = new SessionPolicyEnvConfig();

      expect(config.accessTokenExpiryInMinutes).toBe(30);
      expect(config.refreshTokenExpiryInDays).toBe(60);
    });

    it("should throw error when accessTokenExpiryInMinutes is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 0;
        return 30;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("ACCESS_TOKEN_EXPIRY_IN_MINUTES must be greater than 0");
    });

    it("should throw error when accessTokenExpiryInMinutes is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return -5;
        return 30;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("ACCESS_TOKEN_EXPIRY_IN_MINUTES must be greater than 0");
    });

    it("should throw error when refreshTokenExpiryInDays is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 0;
        return 15;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("REFRESH_TOKEN_EXPIRY_IN_DAYS must be greater than 0");
    });

    it("should throw error when refreshTokenExpiryInDays is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return -10;
        return 15;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("REFRESH_TOKEN_EXPIRY_IN_DAYS must be greater than 0");
    });

    it("should throw error when refreshTokenExpiryInDays does not outlast accessTokenExpiryInMinutes", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 1440;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 0.5;
        return 0;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("REFRESH_TOKEN_EXPIRY_IN_DAYS must outlast ACCESS_TOKEN_EXPIRY_IN_MINUTES");
    });

    it("should throw error when refreshTokenExpiryInDays equals the minimum required", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 1440;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 1;
        return 0;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("REFRESH_TOKEN_EXPIRY_IN_DAYS must outlast ACCESS_TOKEN_EXPIRY_IN_MINUTES");
    });

    it("should not throw error when refreshTokenExpiryInDays outlasts accessTokenExpiryInMinutes", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 15;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 30;
        return 0;
      });

      expect(() => new SessionPolicyEnvConfig()).not.toThrow();
    });

    it("should handle decimal values for accessTokenExpiryInMinutes", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 15.5;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 30;
        return 0;
      });

      const config = new SessionPolicyEnvConfig();
      expect(config.accessTokenExpiryInMinutes).toBe(15.5);
      expect(config.refreshTokenExpiryInDays).toBe(30);
    });

    it("should handle decimal values for refreshTokenExpiryInDays", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 15;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 30.5;
        return 0;
      });

      const config = new SessionPolicyEnvConfig();
      expect(config.accessTokenExpiryInMinutes).toBe(15);
      expect(config.refreshTokenExpiryInDays).toBe(30.5);
    });

    it("should handle large numbers correctly", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new SessionPolicyEnvConfig();
      expect(config.accessTokenExpiryInMinutes).toBe(largeNumber);
      expect(config.refreshTokenExpiryInDays).toBe(largeNumber);
    });

    it("should call validate after setting properties", () => {
      const validateSpy = jest.spyOn(SessionPolicyEnvConfig.prototype as any, "validate");
      mockEnvNumber.mockReturnValue(15);

      new SessionPolicyEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement SessionPolicy interface correctly", () => {
      mockEnvNumber.mockReturnValue(15);

      const config = new SessionPolicyEnvConfig();

      expect(config).toMatchObject({
        accessTokenExpiryInMinutes: expect.any(Number),
        refreshTokenExpiryInDays: expect.any(Number),
      });
    });

    it("should call env.number with correct environment variable names in order", () => {
      const callOrder: string[] = [];
      mockEnvNumber.mockImplementation((key: string) => {
        callOrder.push(key);
        return 15;
      });

      new SessionPolicyEnvConfig();

      expect(callOrder).toEqual(["ACCESS_TOKEN_EXPIRY_IN_MINUTES", "REFRESH_TOKEN_EXPIRY_IN_DAYS"]);
    });

    it("should handle undefined from env.number when fallback is not provided", () => {
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new SessionPolicyEnvConfig();

      expect(config.accessTokenExpiryInMinutes).toBeUndefined();
      expect(config.refreshTokenExpiryInDays).toBeUndefined();
    });

    it("should handle partial environment variable overrides", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 30;
        return 15;
      });

      const config = new SessionPolicyEnvConfig();

      expect(config.accessTokenExpiryInMinutes).toBe(30);
      expect(config.refreshTokenExpiryInDays).toBe(15);
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 15;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 30;
        return 0;
      });

      const config = new SessionPolicyEnvConfig();

      expect(config.accessTokenExpiryInMinutes).toBe(15);
      expect(config.refreshTokenExpiryInDays).toBe(30);

      const descriptor = Object.getOwnPropertyDescriptor(config, "accessTokenExpiryInMinutes");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should handle undefined from env.number when no fallback is provided", () => {
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new SessionPolicyEnvConfig();

      expect(config.accessTokenExpiryInMinutes).toBeUndefined();
      expect(config.refreshTokenExpiryInDays).toBeUndefined();
      expect(() => new SessionPolicyEnvConfig()).not.toThrow();
    });

    it("should throw error when env.number throws", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        throw new Error(`${key} must be a number`);
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("ACCESS_TOKEN_EXPIRY_IN_MINUTES must be a number");
    });

    it("should handle mixed environment variable values", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          ACCESS_TOKEN_EXPIRY_IN_MINUTES: 45,
          REFRESH_TOKEN_EXPIRY_IN_DAYS: 90,
        };
        return values[key];
      });

      const config = new SessionPolicyEnvConfig();

      expect(config.accessTokenExpiryInMinutes).toBe(45);
      expect(config.refreshTokenExpiryInDays).toBe(90);
    });
  });

  describe("validate", () => {
    it("should not throw error when all validations pass", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 15;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 30;
        return 0;
      });

      expect(() => new SessionPolicyEnvConfig()).not.toThrow();
    });

    it("should throw error when accessTokenExpiryInMinutes is 0 even if refreshTokenExpiryInDays is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 0;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 30;
        return 0;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("ACCESS_TOKEN_EXPIRY_IN_MINUTES must be greater than 0");
    });

    it("should throw error when refreshTokenExpiryInDays is 0 even if accessTokenExpiryInMinutes is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 15;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 0;
        return 0;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("REFRESH_TOKEN_EXPIRY_IN_DAYS must be greater than 0");
    });

    it("should throw error when refreshTokenExpiryInDays is less than required", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 100;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 0.06; // 0.06 days = 86.4 minutes, less than 100
        return 0;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("REFRESH_TOKEN_EXPIRY_IN_DAYS must outlast ACCESS_TOKEN_EXPIRY_IN_MINUTES");
    });

    it("should throw error when refreshTokenExpiryInDays equals the minimum required", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "ACCESS_TOKEN_EXPIRY_IN_MINUTES") return 1440;
        if (key === "REFRESH_TOKEN_EXPIRY_IN_DAYS") return 1;
        return 0;
      });

      expect(() => new SessionPolicyEnvConfig()).toThrow("REFRESH_TOKEN_EXPIRY_IN_DAYS must outlast ACCESS_TOKEN_EXPIRY_IN_MINUTES");
    });
  });
});
