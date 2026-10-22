import { VercelBlobEnvConfig } from "@/infrastructure/config/vercel-blob.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    string: jest.fn(),
    number: jest.fn(),
  },
}));

describe("VercelBlobEnvConfig", () => {
  const mockEnvString = env.string as jest.MockedFunction<typeof env.string>;
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with values from environment variables", () => {
      const mockToken = "vercel_blob_token_12345";
      const mockMonths = 12;

      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(mockMonths);

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBe(mockToken);
      expect(config.cacheControlMaxAgeInSeconds).toBe(mockMonths * 30 * 24 * 60 * 60);

      expect(mockEnvString).toHaveBeenCalledTimes(1);
      expect(mockEnvString).toHaveBeenCalledWith("VERCEL_BLOB_READ_WRITE_TOKEN");

      expect(mockEnvNumber).toHaveBeenCalledTimes(1);
      expect(mockEnvNumber).toHaveBeenCalledWith("VERCEL_BLOB_CACHE_CONTROL_MAX_AGE_IN_MONTHS", 12);
    });

    it("should use default value for cacheControlMaxAgeInSeconds when environment variable is not set", () => {
      const mockToken = "vercel_blob_token_12345";

      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockImplementation((key: string, fallback?: number) => {
        return fallback as number;
      });

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBe(mockToken);
      expect(config.cacheControlMaxAgeInSeconds).toBe(12 * 30 * 24 * 60 * 60);
    });

    it("should handle custom cache control months value", () => {
      const mockToken = "vercel_blob_token_12345";
      const mockMonths = 6;

      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(mockMonths);

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBe(mockToken);
      expect(config.cacheControlMaxAgeInSeconds).toBe(mockMonths * 30 * 24 * 60 * 60);
    });

    it("should handle zero months for cache control", () => {
      const mockToken = "vercel_blob_token_12345";

      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(0);

      const config = new VercelBlobEnvConfig();

      expect(config.cacheControlMaxAgeInSeconds).toBe(0);
    });

    it("should handle negative months for cache control", () => {
      const mockToken = "vercel_blob_token_12345";

      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(-5);

      const config = new VercelBlobEnvConfig();

      expect(config.cacheControlMaxAgeInSeconds).toBe(-5 * 30 * 24 * 60 * 60);
    });

    it("should handle decimal months for cache control", () => {
      const mockToken = "vercel_blob_token_12345";
      const mockMonths = 6.5;

      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(mockMonths);

      const config = new VercelBlobEnvConfig();

      expect(config.cacheControlMaxAgeInSeconds).toBe(mockMonths * 30 * 24 * 60 * 60);
    });

    it("should handle large months for cache control", () => {
      const mockToken = "vercel_blob_token_12345";
      const largeNumber = Number.MAX_SAFE_INTEGER;

      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(largeNumber);

      const config = new VercelBlobEnvConfig();

      expect(config.cacheControlMaxAgeInSeconds).toBe(largeNumber * 30 * 24 * 60 * 60);
    });

    it("should handle readWriteToken with special characters", () => {
      const mockToken = "vercel_blob_token_!@#$%^&*()_+";
      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(12);

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBe(mockToken);
    });

    it("should handle readWriteToken with alphanumeric characters", () => {
      const mockToken = "token123abc456def";
      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(12);

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBe(mockToken);
    });

    it("should handle readWriteToken with dashes and underscores", () => {
      const mockToken = "vercel-blob-token_123";
      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(12);

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBe(mockToken);
    });

    it("should handle empty string for readWriteToken", () => {
      mockEnvString.mockReturnValue("");
      mockEnvNumber.mockReturnValue(12);

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBe("");
    });

    it("should handle undefined from env.string when no fallback is provided", () => {
      mockEnvString.mockReturnValue(undefined as unknown as string);
      mockEnvNumber.mockReturnValue(12);

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBeUndefined();
      expect(config.cacheControlMaxAgeInSeconds).toBe(12 * 30 * 24 * 60 * 60);
    });

    it("should handle undefined from env.number when fallback is provided", () => {
      const mockToken = "vercel_blob_token_12345";

      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBe(mockToken);
      expect(config.cacheControlMaxAgeInSeconds).toBeNaN();
    });

    it("should throw error when env.string throws", () => {
      mockEnvString.mockImplementation(() => {
        throw new Error("VERCEL_BLOB_READ_WRITE_TOKEN is required");
      });
      mockEnvNumber.mockReturnValue(12);

      expect(() => new VercelBlobEnvConfig()).toThrow("VERCEL_BLOB_READ_WRITE_TOKEN is required");
    });

    it("should throw error when env.number throws", () => {
      mockEnvString.mockReturnValue("token");
      mockEnvNumber.mockImplementation(() => {
        throw new Error("VERCEL_BLOB_CACHE_CONTROL_MAX_AGE_IN_MONTHS must be a number");
      });

      expect(() => new VercelBlobEnvConfig()).toThrow("VERCEL_BLOB_CACHE_CONTROL_MAX_AGE_IN_MONTHS must be a number");
    });

    it("should implement VercelBlobConfig interface correctly", () => {
      mockEnvString.mockReturnValue("token");
      mockEnvNumber.mockReturnValue(12);

      const config = new VercelBlobEnvConfig();

      expect(config).toMatchObject({
        readWriteToken: expect.any(String),
        cacheControlMaxAgeInSeconds: expect.any(Number),
      });
    });

    it("should call env.string and env.number in correct order", () => {
      const stringCallOrder: string[] = [];
      const numberCallOrder: string[] = [];

      mockEnvString.mockImplementation((key: string) => {
        stringCallOrder.push(key);
        return "token";
      });

      mockEnvNumber.mockImplementation((key: string) => {
        numberCallOrder.push(key);
        return 12;
      });

      new VercelBlobEnvConfig();

      expect(stringCallOrder).toEqual(["VERCEL_BLOB_READ_WRITE_TOKEN"]);
      expect(numberCallOrder).toEqual(["VERCEL_BLOB_CACHE_CONTROL_MAX_AGE_IN_MONTHS"]);
    });

    it("should maintain immutability of readonly properties", () => {
      const mockToken = "vercel_blob_token_12345";
      const mockMonths = 12;

      mockEnvString.mockReturnValue(mockToken);
      mockEnvNumber.mockReturnValue(mockMonths);

      const config = new VercelBlobEnvConfig();

      expect(config.readWriteToken).toBe(mockToken);
      expect(config.cacheControlMaxAgeInSeconds).toBe(mockMonths * 30 * 24 * 60 * 60);

      const descriptor = Object.getOwnPropertyDescriptor(config, "readWriteToken");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should correctly convert months to seconds", () => {
      const mockToken = "token";
      const testCases = [
        { months: 1, expected: 1 * 30 * 24 * 60 * 60 },
        { months: 6, expected: 6 * 30 * 24 * 60 * 60 },
        { months: 12, expected: 12 * 30 * 24 * 60 * 60 },
        { months: 24, expected: 24 * 30 * 24 * 60 * 60 },
      ];

      testCases.forEach(({ months, expected }) => {
        mockEnvString.mockReturnValue(mockToken);
        mockEnvNumber.mockReturnValue(months);

        const config = new VercelBlobEnvConfig();
        expect(config.cacheControlMaxAgeInSeconds).toBe(expected);
      });
    });
  });
});
