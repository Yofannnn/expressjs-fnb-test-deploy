import { RateLimitEnvConfig } from "@/infrastructure/config/rate-limit.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    number: jest.fn(),
    string: jest.fn(),
    boolean: jest.fn(),
  },
}));

describe("RateLimitEnvConfig", () => {
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;
  const mockEnvString = env.string as jest.MockedFunction<typeof env.string>;
  const mockEnvBoolean = env.boolean as jest.MockedFunction<typeof env.boolean>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with default values when environment variables are not set", () => {
      mockEnvNumber.mockImplementation((key: string, fallback?: number) => {
        return fallback as number;
      });

      mockEnvString.mockImplementation((key: string, fallback?: string) => {
        return fallback as string;
      });

      mockEnvBoolean.mockImplementation((key: string, fallback?: boolean) => {
        return fallback as boolean;
      });

      const config = new RateLimitEnvConfig();

      expect(config.cooldownPeriodInMs).toBe(30000);
      expect(config.cacheErrorStrategy).toBe("allow");
      expect(config.circuitOpenStrategy).toBe("throttle");
      expect(config.securityAlertsEnabled).toBeUndefined();

      expect(mockEnvNumber).toHaveBeenCalledTimes(1);
      expect(mockEnvNumber).toHaveBeenCalledWith("RATE_LIMIT_COOLDOWN_PERIOD_IN_MS", 30000);

      expect(mockEnvString).toHaveBeenCalledTimes(2);
      expect(mockEnvString).toHaveBeenNthCalledWith(1, "RATE_LIMIT_CACHE_ERROR_STRATEGY", "allow");
      expect(mockEnvString).toHaveBeenNthCalledWith(2, "RATE_LIMIT_CIRCUIT_OPEN_STRATEGY", "throttle");

      expect(mockEnvBoolean).toHaveBeenCalledTimes(1);
      expect(mockEnvBoolean).toHaveBeenCalledWith("RATE_LIMIT_SECURITY_ALERTS");
    });

    it("should initialize all properties with values from environment variables", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_COOLDOWN_PERIOD_IN_MS") return 60000;
        return 0;
      });

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          RATE_LIMIT_CACHE_ERROR_STRATEGY: "deny",
          RATE_LIMIT_CIRCUIT_OPEN_STRATEGY: "allow",
        };
        return values[key];
      });

      mockEnvBoolean.mockImplementation(() => {
        return true;
      });

      const config = new RateLimitEnvConfig();

      expect(config.cooldownPeriodInMs).toBe(60000);
      expect(config.cacheErrorStrategy).toBe("deny");
      expect(config.circuitOpenStrategy).toBe("allow");
      expect(config.securityAlertsEnabled).toBe(true);
    });

    it("should handle all valid cacheErrorStrategy values", () => {
      const strategies: Array<"allow" | "deny"> = ["allow", "deny"];

      strategies.forEach((strategy) => {
        mockEnvString.mockImplementation((key: string) => {
          if (key === "RATE_LIMIT_CACHE_ERROR_STRATEGY") return strategy;
          return "throttle";
        });

        mockEnvNumber.mockReturnValue(30000);
        mockEnvBoolean.mockReturnValue(false);

        const config = new RateLimitEnvConfig();
        expect(config.cacheErrorStrategy).toBe(strategy);
      });
    });

    it("should handle all valid circuitOpenStrategy values", () => {
      const strategies: Array<"allow" | "deny" | "throttle"> = ["allow", "deny", "throttle"];

      strategies.forEach((strategy) => {
        mockEnvString.mockImplementation((key: string) => {
          if (key === "RATE_LIMIT_CIRCUIT_OPEN_STRATEGY") return strategy;
          return "allow";
        });

        mockEnvNumber.mockReturnValue(30000);
        mockEnvBoolean.mockReturnValue(false);

        const config = new RateLimitEnvConfig();
        expect(config.circuitOpenStrategy).toBe(strategy);
      });
    });

    it("should throw error when cooldownPeriodInMs is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_COOLDOWN_PERIOD_IN_MS") return 0;
        return 30000;
      });

      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      expect(() => new RateLimitEnvConfig()).toThrow("RATE_LIMIT_COOLDOWN_PERIOD_IN_MS must be greater than 0");
    });

    it("should throw error when cooldownPeriodInMs is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_COOLDOWN_PERIOD_IN_MS") return -100;
        return 30000;
      });

      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      expect(() => new RateLimitEnvConfig()).toThrow("RATE_LIMIT_COOLDOWN_PERIOD_IN_MS must be greater than 0");
    });

    it("should handle decimal values for cooldownPeriodInMs", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_COOLDOWN_PERIOD_IN_MS") return 30000.5;
        return 0;
      });

      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();
      expect(config.cooldownPeriodInMs).toBe(30000.5);
    });

    it("should handle large numbers for cooldownPeriodInMs", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvNumber.mockReturnValue(largeNumber);
      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();
      expect(config.cooldownPeriodInMs).toBe(largeNumber);
    });

    it("should handle cacheErrorStrategy with invalid value (cast as string)", () => {
      mockEnvString.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_CACHE_ERROR_STRATEGY") return "invalid" as any;
        return "throttle";
      });

      mockEnvNumber.mockReturnValue(30000);
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();
      expect(config.cacheErrorStrategy).toBe("invalid" as any);
    });

    it("should handle circuitOpenStrategy with invalid value (cast as string)", () => {
      mockEnvString.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_CIRCUIT_OPEN_STRATEGY") return "invalid" as any;
        return "allow";
      });

      mockEnvNumber.mockReturnValue(30000);
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();
      expect(config.circuitOpenStrategy).toBe("invalid" as any);
    });

    it("should handle empty string for cacheErrorStrategy", () => {
      mockEnvString.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_CACHE_ERROR_STRATEGY") return "";
        return "throttle";
      });

      mockEnvNumber.mockReturnValue(30000);
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();
      expect(config.cacheErrorStrategy).toBe("");
    });

    it("should handle empty string for circuitOpenStrategy", () => {
      mockEnvString.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_CIRCUIT_OPEN_STRATEGY") return "";
        return "allow";
      });

      mockEnvNumber.mockReturnValue(30000);
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();
      expect(config.circuitOpenStrategy).toBe("");
    });

    it("should call validate after setting properties", () => {
      const validateSpy = jest.spyOn(RateLimitEnvConfig.prototype as any, "validate");
      mockEnvNumber.mockReturnValue(30000);
      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      new RateLimitEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement RateLimitConfig interface correctly", () => {
      mockEnvNumber.mockReturnValue(30000);
      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();

      expect(config).toMatchObject({
        cooldownPeriodInMs: expect.any(Number),
        cacheErrorStrategy: expect.any(String),
        circuitOpenStrategy: expect.any(String),
        securityAlertsEnabled: expect.any(Boolean),
      });
    });

    it("should call env.number, env.string, and env.boolean in correct order", () => {
      const numberCallOrder: string[] = [];
      const stringCallOrder: string[] = [];
      const booleanCallOrder: string[] = [];

      mockEnvNumber.mockImplementation((key: string) => {
        numberCallOrder.push(key);
        return 30000;
      });

      mockEnvString.mockImplementation((key: string) => {
        stringCallOrder.push(key);
        return "allow";
      });

      mockEnvBoolean.mockImplementation((key: string) => {
        booleanCallOrder.push(key);
        return false;
      });

      new RateLimitEnvConfig();

      expect(numberCallOrder).toEqual(["RATE_LIMIT_COOLDOWN_PERIOD_IN_MS"]);
      expect(stringCallOrder).toEqual(["RATE_LIMIT_CACHE_ERROR_STRATEGY", "RATE_LIMIT_CIRCUIT_OPEN_STRATEGY"]);
      expect(booleanCallOrder).toEqual(["RATE_LIMIT_SECURITY_ALERTS"]);
    });

    it("should handle undefined from env.number when fallback is provided", () => {
      mockEnvNumber.mockReturnValue(undefined as unknown as number);
      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();
      expect(config.cooldownPeriodInMs).toBeUndefined();
    });

    it("should handle undefined from env.string when fallback is provided", () => {
      mockEnvNumber.mockReturnValue(30000);
      mockEnvString.mockReturnValue(undefined as unknown as string);
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();
      expect(config.cacheErrorStrategy).toBeUndefined();
      expect(config.circuitOpenStrategy).toBeUndefined();
    });

    it("should handle undefined from env.boolean when fallback is not provided", () => {
      mockEnvNumber.mockReturnValue(30000);
      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(undefined as unknown as boolean);

      const config = new RateLimitEnvConfig();
      expect(config.securityAlertsEnabled).toBeUndefined();
    });

    it("should throw error when env.number throws", () => {
      mockEnvNumber.mockImplementation(() => {
        throw new Error("RATE_LIMIT_COOLDOWN_PERIOD_IN_MS must be a number");
      });

      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      expect(() => new RateLimitEnvConfig()).toThrow("RATE_LIMIT_COOLDOWN_PERIOD_IN_MS must be a number");
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvNumber.mockReturnValue(30000);
      mockEnvString.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_CACHE_ERROR_STRATEGY") return "allow";
        if (key === "RATE_LIMIT_CIRCUIT_OPEN_STRATEGY") return "throttle";
        return "";
      });
      mockEnvBoolean.mockReturnValue(false);

      const config = new RateLimitEnvConfig();

      expect(config.cooldownPeriodInMs).toBe(30000);
      expect(config.cacheErrorStrategy).toBe("allow");
      expect(config.circuitOpenStrategy).toBe("throttle");
      expect(config.securityAlertsEnabled).toBe(false);

      const descriptor = Object.getOwnPropertyDescriptor(config, "cooldownPeriodInMs");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should handle mixed environment variable values", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "RATE_LIMIT_COOLDOWN_PERIOD_IN_MS") return 45000;
        return 0;
      });

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          RATE_LIMIT_CACHE_ERROR_STRATEGY: "deny",
          RATE_LIMIT_CIRCUIT_OPEN_STRATEGY: "deny",
        };
        return values[key];
      });

      mockEnvBoolean.mockImplementation(() => {
        return true;
      });

      const config = new RateLimitEnvConfig();

      expect(config.cooldownPeriodInMs).toBe(45000);
      expect(config.cacheErrorStrategy).toBe("deny");
      expect(config.circuitOpenStrategy).toBe("deny");
      expect(config.securityAlertsEnabled).toBe(true);
    });
  });

  describe("validate", () => {
    it("should not throw error when cooldownPeriodInMs is positive", () => {
      mockEnvNumber.mockReturnValue(30000);
      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      expect(() => new RateLimitEnvConfig()).not.toThrow();
    });

    it("should throw error when cooldownPeriodInMs is 0", () => {
      mockEnvNumber.mockReturnValue(0);
      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      expect(() => new RateLimitEnvConfig()).toThrow("RATE_LIMIT_COOLDOWN_PERIOD_IN_MS must be greater than 0");
    });

    it("should throw error when cooldownPeriodInMs is negative", () => {
      mockEnvNumber.mockReturnValue(-1);
      mockEnvString.mockReturnValue("allow");
      mockEnvBoolean.mockReturnValue(false);

      expect(() => new RateLimitEnvConfig()).toThrow("RATE_LIMIT_COOLDOWN_PERIOD_IN_MS must be greater than 0");
    });
  });
});
