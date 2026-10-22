import { EventBatchEnvConfig } from "@/infrastructure/config/event-batch.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    number: jest.fn(),
  },
}));

describe("EventBatchEnvConfig", () => {
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with default values when environment variables are not set", () => {
      mockEnvNumber.mockImplementation((key: string, defaultValue?: number) => {
        return defaultValue as number;
      });

      const config = new EventBatchEnvConfig();

      expect(config.flushIntervalInMs).toBe(1000);
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelayInMs).toBe(1000);
      expect(config.maxWaitTimeInMs).toBe(1000);
      expect(config.batchSize).toBe(20);

      expect(mockEnvNumber).toHaveBeenCalledTimes(5);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(1, "EVENT_BATCH_FLUSH_INTERVAL_IN_MS", 1000);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(2, "EVENT_BATCH_MAX_RETRIES", 3);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(3, "EVENT_BATCH_RETRY_DELAY_IN_MS", 1000);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(4, "EVENT_BATCH_MAX_WAIT_TIME_IN_MS", 1000);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(5, "EVENT_BATCH_SIZE", 20);
    });

    it("should initialize all properties with values from environment variables", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_BATCH_FLUSH_INTERVAL_IN_MS: 5000,
          EVENT_BATCH_MAX_RETRIES: 5,
          EVENT_BATCH_RETRY_DELAY_IN_MS: 2000,
          EVENT_BATCH_MAX_WAIT_TIME_IN_MS: 3000,
          EVENT_BATCH_SIZE: 50,
        };
        return values[key];
      });

      const config = new EventBatchEnvConfig();

      expect(config.flushIntervalInMs).toBe(5000);
      expect(config.maxRetries).toBe(5);
      expect(config.retryDelayInMs).toBe(2000);
      expect(config.maxWaitTimeInMs).toBe(3000);
      expect(config.batchSize).toBe(50);
    });

    it("should handle zero values correctly", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_BATCH_FLUSH_INTERVAL_IN_MS: 0,
          EVENT_BATCH_MAX_RETRIES: 0,
          EVENT_BATCH_RETRY_DELAY_IN_MS: 0,
          EVENT_BATCH_MAX_WAIT_TIME_IN_MS: 0,
          EVENT_BATCH_SIZE: 1,
        };
        return values[key];
      });

      const config = new EventBatchEnvConfig();

      expect(config.flushIntervalInMs).toBe(0);
      expect(config.maxRetries).toBe(0);
      expect(config.retryDelayInMs).toBe(0);
      expect(config.maxWaitTimeInMs).toBe(0);
      expect(config.batchSize).toBe(1);
    });

    it("should handle negative values for non-validated properties", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_BATCH_FLUSH_INTERVAL_IN_MS: -100,
          EVENT_BATCH_MAX_RETRIES: 3,
          EVENT_BATCH_RETRY_DELAY_IN_MS: -50,
          EVENT_BATCH_MAX_WAIT_TIME_IN_MS: -200,
          EVENT_BATCH_SIZE: 20,
        };
        return values[key];
      });

      const config = new EventBatchEnvConfig();

      expect(config.flushIntervalInMs).toBe(-100);
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelayInMs).toBe(-50);
      expect(config.maxWaitTimeInMs).toBe(-200);
      expect(config.batchSize).toBe(20);
    });

    it("should throw error when batchSize is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_BATCH_SIZE") return 0;
        return 1000;
      });

      expect(() => new EventBatchEnvConfig()).toThrow("EVENT_BATCH_SIZE must be greater than 0");
    });

    it("should throw error when batchSize is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_BATCH_SIZE") return -5;
        return 1000;
      });

      expect(() => new EventBatchEnvConfig()).toThrow("EVENT_BATCH_SIZE must be greater than 0");
    });

    it("should throw error when maxRetries is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_BATCH_MAX_RETRIES") return -1;
        return 1000;
      });

      expect(() => new EventBatchEnvConfig()).toThrow("EVENT_BATCH_MAX_RETRIES must be 0 or greater");
    });

    it("should throw error when both batchSize is invalid and maxRetries is invalid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_BATCH_FLUSH_INTERVAL_IN_MS: 1000,
          EVENT_BATCH_MAX_RETRIES: -1,
          EVENT_BATCH_RETRY_DELAY_IN_MS: 1000,
          EVENT_BATCH_MAX_WAIT_TIME_IN_MS: 1000,
          EVENT_BATCH_SIZE: -10,
        };
        return values[key];
      });

      expect(() => new EventBatchEnvConfig()).toThrow("EVENT_BATCH_SIZE must be greater than 0");
    });

    it("should handle large numbers correctly", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new EventBatchEnvConfig();

      expect(config.flushIntervalInMs).toBe(largeNumber);
      expect(config.maxRetries).toBe(largeNumber);
      expect(config.retryDelayInMs).toBe(largeNumber);
      expect(config.maxWaitTimeInMs).toBe(largeNumber);
      expect(config.batchSize).toBe(largeNumber);
    });

    it("should handle decimal values correctly", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_BATCH_FLUSH_INTERVAL_IN_MS: 100.5,
          EVENT_BATCH_MAX_RETRIES: 2.7,
          EVENT_BATCH_RETRY_DELAY_IN_MS: 500.9,
          EVENT_BATCH_MAX_WAIT_TIME_IN_MS: 750.3,
          EVENT_BATCH_SIZE: 15.2,
        };
        return values[key];
      });

      const config = new EventBatchEnvConfig();

      expect(config.flushIntervalInMs).toBe(100.5);
      expect(config.maxRetries).toBe(2.7);
      expect(config.retryDelayInMs).toBe(500.9);
      expect(config.maxWaitTimeInMs).toBe(750.3);
      expect(config.batchSize).toBe(15.2);
    });

    it("should call validate after setting properties", () => {
      const validateSpy = jest.spyOn(EventBatchEnvConfig.prototype as any, "validate");
      mockEnvNumber.mockReturnValue(1000);

      new EventBatchEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement EventBatchConfig interface correctly", () => {
      mockEnvNumber.mockReturnValue(1000);

      const config = new EventBatchEnvConfig();

      expect(config).toMatchObject({
        flushIntervalInMs: expect.any(Number),
        maxRetries: expect.any(Number),
        retryDelayInMs: expect.any(Number),
        maxWaitTimeInMs: expect.any(Number),
        batchSize: expect.any(Number),
      });
    });
  });

  describe("validate", () => {
    it("should not throw error when batchSize is positive and maxRetries is 0 or greater", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_BATCH_FLUSH_INTERVAL_IN_MS: 1000,
          EVENT_BATCH_MAX_RETRIES: 0,
          EVENT_BATCH_RETRY_DELAY_IN_MS: 1000,
          EVENT_BATCH_MAX_WAIT_TIME_IN_MS: 1000,
          EVENT_BATCH_SIZE: 1,
        };
        return values[key];
      });

      expect(() => new EventBatchEnvConfig()).not.toThrow();
    });

    it("should throw error when batchSize is negative even if other validations pass", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_BATCH_FLUSH_INTERVAL_IN_MS: 1000,
          EVENT_BATCH_MAX_RETRIES: 0,
          EVENT_BATCH_RETRY_DELAY_IN_MS: 1000,
          EVENT_BATCH_MAX_WAIT_TIME_IN_MS: 1000,
          EVENT_BATCH_SIZE: -1,
        };
        return values[key];
      });

      expect(() => new EventBatchEnvConfig()).toThrow("EVENT_BATCH_SIZE must be greater than 0");
    });

    it("should throw error when maxRetries is negative even if batchSize is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_BATCH_FLUSH_INTERVAL_IN_MS: 1000,
          EVENT_BATCH_MAX_RETRIES: -5,
          EVENT_BATCH_RETRY_DELAY_IN_MS: 1000,
          EVENT_BATCH_MAX_WAIT_TIME_IN_MS: 1000,
          EVENT_BATCH_SIZE: 10,
        };
        return values[key];
      });

      expect(() => new EventBatchEnvConfig()).toThrow("EVENT_BATCH_MAX_RETRIES must be 0 or greater");
    });
  });
});
