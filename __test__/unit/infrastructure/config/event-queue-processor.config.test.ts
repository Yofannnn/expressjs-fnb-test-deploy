import { EventQueueProcessorEnvConfig } from "@/infrastructure/config/event-queue-processor.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    number: jest.fn(),
  },
}));

describe("EventQueueProcessorEnvConfig", () => {
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with default values when environment variables are not set", () => {
      mockEnvNumber.mockImplementation((key: string, fallback?: number) => {
        return fallback as number;
      });

      const config = new EventQueueProcessorEnvConfig();

      expect(config.batchSize).toBe(20);
      expect(config.pollIntervalMs).toBe(5000);

      expect(mockEnvNumber).toHaveBeenCalledTimes(2);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(1, "EVENT_QUEUE_PROCESSOR_BATCH_SIZE", 20);
      expect(mockEnvNumber).toHaveBeenNthCalledWith(2, "EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS", 5000);
    });

    it("should initialize all properties with values from environment variables", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_PROCESSOR_BATCH_SIZE: 50,
          EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS: 10000,
        };
        return values[key];
      });

      const config = new EventQueueProcessorEnvConfig();

      expect(config.batchSize).toBe(50);
      expect(config.pollIntervalMs).toBe(10000);
    });

    it("should throw error when batchSize is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_QUEUE_PROCESSOR_BATCH_SIZE") return 0;
        return 5000;
      });

      expect(() => new EventQueueProcessorEnvConfig()).toThrow("EVENT_QUEUE_PROCESSOR_BATCH_SIZE must be greater than 0");
    });

    it("should throw error when batchSize is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_QUEUE_PROCESSOR_BATCH_SIZE") return -5;
        return 5000;
      });

      expect(() => new EventQueueProcessorEnvConfig()).toThrow("EVENT_QUEUE_PROCESSOR_BATCH_SIZE must be greater than 0");
    });

    it("should throw error when pollIntervalMs is 0", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS") return 0;
        return 20;
      });

      expect(() => new EventQueueProcessorEnvConfig()).toThrow("EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS must be greater than 0");
    });

    it("should throw error when pollIntervalMs is negative", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS") return -100;
        return 20;
      });

      expect(() => new EventQueueProcessorEnvConfig()).toThrow("EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS must be greater than 0");
    });

    it("should throw error when both batchSize and pollIntervalMs are invalid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_PROCESSOR_BATCH_SIZE: -10,
          EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS: -500,
        };
        return values[key];
      });

      expect(() => new EventQueueProcessorEnvConfig()).toThrow("EVENT_QUEUE_PROCESSOR_BATCH_SIZE must be greater than 0");
    });

    it("should handle decimal values correctly", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_PROCESSOR_BATCH_SIZE: 25.5,
          EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS: 7500.75,
        };
        return values[key];
      });

      const config = new EventQueueProcessorEnvConfig();

      expect(config.batchSize).toBe(25.5);
      expect(config.pollIntervalMs).toBe(7500.75);
    });

    it("should handle large numbers correctly", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new EventQueueProcessorEnvConfig();

      expect(config.batchSize).toBe(largeNumber);
      expect(config.pollIntervalMs).toBe(largeNumber);
    });

    it("should call validate after setting properties", () => {
      const validateSpy = jest.spyOn(EventQueueProcessorEnvConfig.prototype as any, "validate");
      mockEnvNumber.mockReturnValue(20);

      new EventQueueProcessorEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement EventQueueProcessorConfig interface correctly", () => {
      mockEnvNumber.mockReturnValue(20);

      const config = new EventQueueProcessorEnvConfig();

      expect(config).toMatchObject({
        batchSize: expect.any(Number),
        pollIntervalMs: expect.any(Number),
      });
    });

    it("should call env.number with correct environment variable names in order", () => {
      const callOrder: string[] = [];
      mockEnvNumber.mockImplementation((key: string) => {
        callOrder.push(key);
        return 20;
      });

      new EventQueueProcessorEnvConfig();

      expect(callOrder).toEqual(["EVENT_QUEUE_PROCESSOR_BATCH_SIZE", "EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS"]);
    });

    it("should handle undefined from env.number when fallback is not provided", () => {
      mockEnvNumber.mockImplementation(() => {
        return undefined as unknown as number;
      });

      const config = new EventQueueProcessorEnvConfig();

      expect(config.batchSize).toBeUndefined();
      expect(config.pollIntervalMs).toBeUndefined();
    });

    it("should handle partial environment variable overrides", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_QUEUE_PROCESSOR_BATCH_SIZE") return 50;
        return 5000;
      });

      const config = new EventQueueProcessorEnvConfig();

      expect(config.batchSize).toBe(50);
      expect(config.pollIntervalMs).toBe(5000);
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_QUEUE_PROCESSOR_BATCH_SIZE") return 20;
        if (key === "EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS") return 5000;
        return 0;
      });

      const config = new EventQueueProcessorEnvConfig();

      expect(config.batchSize).toBe(20);
      expect(config.pollIntervalMs).toBe(5000);

      const descriptor = Object.getOwnPropertyDescriptor(config, "batchSize");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should handle environment variable values that are numeric strings with whitespace", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_PROCESSOR_BATCH_SIZE: 30,
          EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS: 8000,
        };
        return values[key];
      });

      const config = new EventQueueProcessorEnvConfig();

      expect(config.batchSize).toBe(30);
      expect(config.pollIntervalMs).toBe(8000);
    });
  });

  describe("validate", () => {
    it("should not throw error when batchSize is positive and pollIntervalMs is positive", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        const values: Record<string, number> = {
          EVENT_QUEUE_PROCESSOR_BATCH_SIZE: 10,
          EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS: 1000,
        };
        return values[key];
      });

      expect(() => new EventQueueProcessorEnvConfig()).not.toThrow();
    });

    it("should throw error when batchSize is 0 even if pollIntervalMs is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_QUEUE_PROCESSOR_BATCH_SIZE") return 0;
        return 1000;
      });

      expect(() => new EventQueueProcessorEnvConfig()).toThrow("EVENT_QUEUE_PROCESSOR_BATCH_SIZE must be greater than 0");
    });

    it("should throw error when pollIntervalMs is 0 even if batchSize is valid", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS") return 0;
        return 10;
      });

      expect(() => new EventQueueProcessorEnvConfig()).toThrow("EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS must be greater than 0");
    });
  });
});
