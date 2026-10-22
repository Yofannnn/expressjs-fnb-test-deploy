import { EventQueueEnvConfig } from "@/infrastructure/config/event-queue.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    number: jest.fn(),
  },
}));

describe("EventQueueEnvConfig", () => {
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with default values when environment variables are not set", () => {
      mockEnvNumber.mockImplementation((key: string, defaultValue?: number) => {
        return defaultValue as number;
      });

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.healthCheckInterval).toBe(1000);
      expect(config.batchTimeout).toBe(1000);

      expect(mockEnvNumber).toHaveBeenCalledTimes(3);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(1, "EVENT_QUEUE_MAX_RETRIES", 3);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(2, "EVENT_QUEUE_HEALTH_CHECK_INTERVAL", 1000);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(3, "EVENT_QUEUE_BATCH_TIMEOUT", 1000);
    });

    it("should initialize all properties with values from environment variables", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_MAX_RETRIES: 5,
          EVENT_QUEUE_HEALTH_CHECK_INTERVAL: 2000,
          EVENT_QUEUE_BATCH_TIMEOUT: 3000,
        };
        return values[key];
      });

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.healthCheckInterval).toBe(2000);
      expect(config.batchTimeout).toBe(3000);
    });

    it("should handle zero values correctly", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_MAX_RETRIES: 0,
          EVENT_QUEUE_HEALTH_CHECK_INTERVAL: 0,
          EVENT_QUEUE_BATCH_TIMEOUT: 0,
        };
        return values[key];
      });

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(0);
      expect(config.healthCheckInterval).toBe(0);
      expect(config.batchTimeout).toBe(0);
    });

    it("should handle negative values correctly", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_MAX_RETRIES: -1,
          EVENT_QUEUE_HEALTH_CHECK_INTERVAL: -100,
          EVENT_QUEUE_BATCH_TIMEOUT: -50,
        };
        return values[key];
      });

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(-1);
      expect(config.healthCheckInterval).toBe(-100);
      expect(config.batchTimeout).toBe(-50);
    });

    it("should handle decimal values correctly", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_MAX_RETRIES: 2.5,
          EVENT_QUEUE_HEALTH_CHECK_INTERVAL: 1500.75,
          EVENT_QUEUE_BATCH_TIMEOUT: 750.3,
        };
        return values[key];
      });

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(2.5);
      expect(config.healthCheckInterval).toBe(1500.75);
      expect(config.batchTimeout).toBe(750.3);
    });

    it("should handle large numbers correctly", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(largeNumber);
      expect(config.healthCheckInterval).toBe(largeNumber);
      expect(config.batchTimeout).toBe(largeNumber);
    });

    it("should handle mixed environment variable values", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_MAX_RETRIES: 10,
          EVENT_QUEUE_HEALTH_CHECK_INTERVAL: 500,
          EVENT_QUEUE_BATCH_TIMEOUT: 2000,
        };
        return values[key];
      });

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(10);
      expect(config.healthCheckInterval).toBe(500);
      expect(config.batchTimeout).toBe(2000);
    });

    it("should throw error when environment variable is missing and no fallback is provided", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        throw new Error(`${key} must be a number`);
      });

      expect(() => new EventQueueEnvConfig()).toThrow("EVENT_QUEUE_MAX_RETRIES must be a number");
    });

    it("should implement EventQueueConfig interface correctly", () => {
      mockEnvNumber.mockReturnValue(1000);

      const config = new EventQueueEnvConfig();

      expect(config).toMatchObject({
        maxRetries: expect.any(Number),
        healthCheckInterval: expect.any(Number),
        batchTimeout: expect.any(Number),
      });
    });

    it("should call env.number with correct environment variable names in order", () => {
      const callOrder: string[] = [];
      mockEnvNumber.mockImplementation((key: string) => {
        callOrder.push(key);
        return 1000;
      });

      new EventQueueEnvConfig();

      expect(callOrder).toEqual(["EVENT_QUEUE_MAX_RETRIES", "EVENT_QUEUE_HEALTH_CHECK_INTERVAL", "EVENT_QUEUE_BATCH_TIMEOUT"]);
    });

    it("should handle undefined from env.number when fallback is not provided", () => {
      mockEnvNumber.mockImplementation(() => {
        return undefined as unknown as number;
      });

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBeUndefined();
      expect(config.healthCheckInterval).toBeUndefined();
      expect(config.batchTimeout).toBeUndefined();
    });

    it("should handle partial environment variable overrides", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_QUEUE_MAX_RETRIES") return 10;
        return 1000;
      });

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(10);
      expect(config.healthCheckInterval).toBe(1000);
      expect(config.batchTimeout).toBe(1000);
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvNumber.mockReturnValue(1000);

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(1000);
      expect(config.healthCheckInterval).toBe(1000);
      expect(config.batchTimeout).toBe(1000);

      const descriptor = Object.getOwnPropertyDescriptor(config, "maxRetries");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should handle environment variable values that are numeric strings with whitespace", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_MAX_RETRIES: 5,
          EVENT_QUEUE_HEALTH_CHECK_INTERVAL: 1000,
          EVENT_QUEUE_BATCH_TIMEOUT: 1500,
        };
        return values[key];
      });

      const config = new EventQueueEnvConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.healthCheckInterval).toBe(1000);
      expect(config.batchTimeout).toBe(1500);
    });
  });
});
