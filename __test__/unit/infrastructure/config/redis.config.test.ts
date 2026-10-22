import { RedisEnvConfig } from "@/infrastructure/config/redis.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    string: jest.fn(),
    number: jest.fn(),
  },
}));

describe("RedisEnvConfig", () => {
  const mockEnvString = env.string as jest.MockedFunction<typeof env.string>;
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with values from environment variables", () => {
      const mockHost = "localhost";
      const mockPort = 6379;
      const mockConnectTimeout = 5000;
      const mockMaxRetries = 5;

      mockEnvString.mockReturnValue(mockHost);
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          REDIS_PORT: mockPort,
          REDIS_CONNECT_TIMEOUT_IN_MS: mockConnectTimeout,
          REDIS_MAX_RETRIES: mockMaxRetries,
        };
        return values[key];
      });

      const config = new RedisEnvConfig();

      expect(config.host).toBe(mockHost);
      expect(config.port).toBe(mockPort);
      expect(config.connectTimeout).toBe(mockConnectTimeout);
      expect(config.maxRetriesPerRequest).toBe(mockMaxRetries);
      expect(config.enableOfflineQueue).toBe(false);
      expect(config.lazyConnect).toBe(false);
      expect(config.family).toBe(4);

      expect(mockEnvString).toHaveBeenCalledTimes(1);
      expect(mockEnvString).toHaveBeenCalledWith("REDIS_HOST");

      expect(mockEnvNumber).toHaveBeenCalledTimes(3);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(1, "REDIS_PORT", 6379);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(2, "REDIS_CONNECT_TIMEOUT_IN_MS", 1000);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(3, "REDIS_MAX_RETRIES", 3);
    });

    it("should use default values when environment variables are not set", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string, fallback?: number) => {
        return fallback as number;
      });

      const config = new RedisEnvConfig();

      expect(config.host).toBe("localhost");
      expect(config.port).toBe(6379);
      expect(config.connectTimeout).toBe(1000);
      expect(config.maxRetriesPerRequest).toBe(3);
      expect(config.enableOfflineQueue).toBe(false);
      expect(config.lazyConnect).toBe(false);
      expect(config.family).toBe(4);
    });

    it("should handle default hardcoded properties correctly", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockReturnValue(6379);

      const config = new RedisEnvConfig();

      expect(config.enableOfflineQueue).toBe(false);
      expect(config.lazyConnect).toBe(false);
      expect(config.family).toBe(4);
    });

    it("should throw error when connectTimeout is 0", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REDIS_CONNECT_TIMEOUT_IN_MS") return 0;
        return 6379;
      });

      expect(() => new RedisEnvConfig()).toThrow("REDIS_CONNECT_TIMEOUT_IN_MS must be greater than 0");
    });

    it("should throw error when connectTimeout is negative", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REDIS_CONNECT_TIMEOUT_IN_MS") return -100;
        return 6379;
      });

      expect(() => new RedisEnvConfig()).toThrow("REDIS_CONNECT_TIMEOUT_IN_MS must be greater than 0");
    });

    it("should throw error when maxRetriesPerRequest is negative", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REDIS_MAX_RETRIES") return -1;
        return 6379;
      });

      expect(() => new RedisEnvConfig()).toThrow("REDIS_MAX_RETRIES must be 0 or greater");
    });

    it("should handle zero for maxRetriesPerRequest", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REDIS_MAX_RETRIES") return 0;
        return 6379;
      });

      const config = new RedisEnvConfig();
      expect(config.maxRetriesPerRequest).toBe(0);
      expect(() => new RedisEnvConfig()).not.toThrow();
    });

    it("should throw error when both connectTimeout and maxRetriesPerRequest are invalid", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          REDIS_PORT: 6379,
          REDIS_CONNECT_TIMEOUT_IN_MS: -100,
          REDIS_MAX_RETRIES: -5,
        };
        return values[key];
      });

      expect(() => new RedisEnvConfig()).toThrow("REDIS_CONNECT_TIMEOUT_IN_MS must be greater than 0");
    });

    it("should handle decimal values for connectTimeout", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REDIS_CONNECT_TIMEOUT_IN_MS") return 1000.5;
        return 6379;
      });

      const config = new RedisEnvConfig();
      expect(config.connectTimeout).toBe(1000.5);
    });

    it("should handle decimal values for maxRetriesPerRequest", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REDIS_MAX_RETRIES") return 3.5;
        return 6379;
      });

      const config = new RedisEnvConfig();
      expect(config.maxRetriesPerRequest).toBe(3.5);
    });

    it("should handle large numbers for connectTimeout", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new RedisEnvConfig();
      expect(config.connectTimeout).toBe(largeNumber);
    });

    it("should handle large numbers for maxRetriesPerRequest", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new RedisEnvConfig();
      expect(config.maxRetriesPerRequest).toBe(largeNumber);
    });

    it("should handle Redis host with special characters", () => {
      const mockHost = "redis.example-domain.com";
      mockEnvString.mockReturnValue(mockHost);
      mockEnvNumber.mockReturnValue(6379);

      const config = new RedisEnvConfig();
      expect(config.host).toBe(mockHost);
    });

    it("should handle Redis host with IP address", () => {
      const mockHost = "192.168.1.100";
      mockEnvString.mockReturnValue(mockHost);
      mockEnvNumber.mockReturnValue(6379);

      const config = new RedisEnvConfig();
      expect(config.host).toBe(mockHost);
    });

    it("should handle Redis host with IPv6 address", () => {
      const mockHost = "::1";
      mockEnvString.mockReturnValue(mockHost);
      mockEnvNumber.mockReturnValue(6379);

      const config = new RedisEnvConfig();
      expect(config.host).toBe(mockHost);
    });

    it("should handle empty string for Redis host", () => {
      mockEnvString.mockReturnValue("");
      mockEnvNumber.mockReturnValue(6379);

      const config = new RedisEnvConfig();
      expect(config.host).toBe("");
    });

    it("should handle undefined from env.string when no fallback is provided", () => {
      mockEnvString.mockReturnValue(undefined as unknown as string);
      mockEnvNumber.mockReturnValue(6379);

      const config = new RedisEnvConfig();
      expect(config.host).toBeUndefined();
    });

    it("should handle undefined from env.number when fallback is provided", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new RedisEnvConfig();
      expect(config.port).toBeUndefined();
      expect(config.connectTimeout).toBeUndefined();
      expect(config.maxRetriesPerRequest).toBeUndefined();
    });

    it("should throw error when env.string throws", () => {
      mockEnvString.mockImplementation(() => {
        throw new Error("REDIS_HOST is required");
      });
      mockEnvNumber.mockReturnValue(6379);

      expect(() => new RedisEnvConfig()).toThrow("REDIS_HOST is required");
    });

    it("should throw error when env.number throws", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        throw new Error(`${key} must be a number`);
      });

      expect(() => new RedisEnvConfig()).toThrow("REDIS_PORT must be a number");
    });

    it("should call validate after setting properties", () => {
      const validateSpy = jest.spyOn(RedisEnvConfig.prototype as any, "validate");
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockReturnValue(6379);

      new RedisEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement RedisConfig interface correctly", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockReturnValue(6379);

      const config = new RedisEnvConfig();

      expect(config).toMatchObject({
        host: expect.any(String),
        port: expect.any(Number),
        connectTimeout: expect.any(Number),
        maxRetriesPerRequest: expect.any(Number),
        enableOfflineQueue: expect.any(Boolean),
        lazyConnect: expect.any(Boolean),
        family: expect.any(Number),
      });
    });

    it("should call env.string and env.number in correct order", () => {
      const stringCallOrder: string[] = [];
      const numberCallOrder: string[] = [];

      mockEnvString.mockImplementation((key: string) => {
        stringCallOrder.push(key);
        return "localhost";
      });

      mockEnvNumber.mockImplementation((key: string) => {
        numberCallOrder.push(key);
        return 6379;
      });

      new RedisEnvConfig();

      expect(stringCallOrder).toEqual(["REDIS_HOST"]);
      expect(numberCallOrder).toEqual(["REDIS_PORT", "REDIS_CONNECT_TIMEOUT_IN_MS", "REDIS_MAX_RETRIES"]);
    });

    it("should handle partial environment variable overrides", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REDIS_CONNECT_TIMEOUT_IN_MS") return 5000;
        return 6379;
      });

      const config = new RedisEnvConfig();

      expect(config.host).toBe("localhost");
      expect(config.port).toBe(6379);
      expect(config.connectTimeout).toBe(5000);
      expect(config.maxRetriesPerRequest).toBe(6379);
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          REDIS_PORT: 6379,
          REDIS_CONNECT_TIMEOUT_IN_MS: 1000,
          REDIS_MAX_RETRIES: 3,
        };
        return values[key];
      });

      const config = new RedisEnvConfig();

      expect(config.host).toBe("localhost");
      expect(config.port).toBe(6379);
      expect(config.connectTimeout).toBe(1000);
      expect(config.maxRetriesPerRequest).toBe(3);
      expect(config.enableOfflineQueue).toBe(false);
      expect(config.lazyConnect).toBe(false);
      expect(config.family).toBe(4);

      const descriptor = Object.getOwnPropertyDescriptor(config, "host");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should handle mixed environment variable values", () => {
      const mockHost = "redis.production.com";
      mockEnvString.mockReturnValue(mockHost);
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          REDIS_PORT: 6380,
          REDIS_CONNECT_TIMEOUT_IN_MS: 3000,
          REDIS_MAX_RETRIES: 7,
        };
        return values[key];
      });

      const config = new RedisEnvConfig();

      expect(config.host).toBe(mockHost);
      expect(config.port).toBe(6380);
      expect(config.connectTimeout).toBe(3000);
      expect(config.maxRetriesPerRequest).toBe(7);
    });
  });

  describe("validate", () => {
    it("should not throw error when connectTimeout is positive and maxRetriesPerRequest is 0 or greater", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          REDIS_PORT: 6379,
          REDIS_CONNECT_TIMEOUT_IN_MS: 1000,
          REDIS_MAX_RETRIES: 0,
        };
        return values[key];
      });

      expect(() => new RedisEnvConfig()).not.toThrow();
    });

    it("should throw error when connectTimeout is 0 even if maxRetriesPerRequest is valid", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REDIS_CONNECT_TIMEOUT_IN_MS") return 0;
        return 6379;
      });

      expect(() => new RedisEnvConfig()).toThrow("REDIS_CONNECT_TIMEOUT_IN_MS must be greater than 0");
    });

    it("should throw error when maxRetriesPerRequest is negative even if connectTimeout is valid", () => {
      mockEnvString.mockReturnValue("localhost");
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "REDIS_MAX_RETRIES") return -1;
        return 1000;
      });

      expect(() => new RedisEnvConfig()).toThrow("REDIS_MAX_RETRIES must be 0 or greater");
    });
  });
});
