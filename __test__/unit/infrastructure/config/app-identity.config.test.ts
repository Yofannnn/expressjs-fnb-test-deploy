import { AppIdentityConfig } from "@/infrastructure/config/app-identity.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    string: jest.fn(),
  },
}));

describe("AppIdentityConfig", () => {
  const mockEnvString = env.string as jest.MockedFunction<typeof env.string>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with values from environment variables", () => {
      const mockBrandName = "TestBrand";
      const mockSupportEmail = "support@test.com";
      const mockBaseUrl = "https://api.test.com";
      const mockClientUrl = "https://test.com";

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          BRAND_NAME: mockBrandName,
          SUPPORT_EMAIL: mockSupportEmail,
          BASE_URL: mockBaseUrl,
          CLIENT_URL: mockClientUrl,
        };
        return values[key];
      });

      const config = new AppIdentityConfig();

      expect(config.brandName).toBe(mockBrandName);
      expect(config.supportEmail).toBe(mockSupportEmail);
      expect(config.baseUrl).toBe(mockBaseUrl);
      expect(config.clientUrl).toBe(mockClientUrl);

      expect(mockEnvString).toHaveBeenCalledTimes(4);
      expect(mockEnvString).toHaveBeenNthCalledWith(1, "BRAND_NAME");
      expect(mockEnvString).toHaveBeenNthCalledWith(2, "SUPPORT_EMAIL");
      expect(mockEnvString).toHaveBeenNthCalledWith(3, "BASE_URL");
      expect(mockEnvString).toHaveBeenNthCalledWith(4, "CLIENT_URL");
    });

    it("should handle empty string values from environment variables", () => {
      mockEnvString.mockReturnValue("");

      const config = new AppIdentityConfig();

      expect(config.brandName).toBe("");
      expect(config.supportEmail).toBe("");
      expect(config.baseUrl).toBe("");
      expect(config.clientUrl).toBe("");
    });

    it("should handle whitespace-only values from environment variables", () => {
      const whitespaceValues = {
        BRAND_NAME: "   ",
        SUPPORT_EMAIL: "   ",
        BASE_URL: "   ",
        CLIENT_URL: "   ",
      };

      mockEnvString.mockImplementation((key: string) => whitespaceValues[key as keyof typeof whitespaceValues]);

      const config = new AppIdentityConfig();

      expect(config.brandName).toBe("   ");
      expect(config.supportEmail).toBe("   ");
      expect(config.baseUrl).toBe("   ");
      expect(config.clientUrl).toBe("   ");
    });

    it("should handle special characters and URLs correctly", () => {
      const mockBrandName = "Test & Brand™";
      const mockSupportEmail = "support+test@example.co.uk";
      const mockBaseUrl = "https://api.example.com/v1";
      const mockClientUrl = "https://app.example.com?param=value";

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          BRAND_NAME: mockBrandName,
          SUPPORT_EMAIL: mockSupportEmail,
          BASE_URL: mockBaseUrl,
          CLIENT_URL: mockClientUrl,
        };
        return values[key];
      });

      const config = new AppIdentityConfig();

      expect(config.brandName).toBe(mockBrandName);
      expect(config.supportEmail).toBe(mockSupportEmail);
      expect(config.baseUrl).toBe(mockBaseUrl);
      expect(config.clientUrl).toBe(mockClientUrl);
    });

    it("should handle numeric strings correctly", () => {
      const numericValues = {
        BRAND_NAME: "123",
        SUPPORT_EMAIL: "456",
        BASE_URL: "789",
        CLIENT_URL: "012",
      };

      mockEnvString.mockImplementation((key: string) => numericValues[key as keyof typeof numericValues]);

      const config = new AppIdentityConfig();

      expect(config.brandName).toBe("123");
      expect(config.supportEmail).toBe("456");
      expect(config.baseUrl).toBe("789");
      expect(config.clientUrl).toBe("012");
    });

    it("should handle long strings correctly", () => {
      const longString = "a".repeat(1000);
      mockEnvString.mockReturnValue(longString);

      const config = new AppIdentityConfig();

      expect(config.brandName).toBe(longString);
      expect(config.supportEmail).toBe(longString);
      expect(config.baseUrl).toBe(longString);
      expect(config.clientUrl).toBe(longString);
    });

    it("should handle undefined from env.string (if it can return undefined)", () => {
      mockEnvString.mockReturnValue(undefined as unknown as string);

      const config = new AppIdentityConfig();

      expect(config.brandName).toBeUndefined();
      expect(config.supportEmail).toBeUndefined();
      expect(config.baseUrl).toBeUndefined();
      expect(config.clientUrl).toBeUndefined();
    });

    it("should call env.string with correct environment variable names in order", () => {
      const callOrder: string[] = [];
      mockEnvString.mockImplementation((key: string) => {
        callOrder.push(key);
        return `value_${key}`;
      });

      new AppIdentityConfig();

      expect(callOrder).toEqual(["BRAND_NAME", "SUPPORT_EMAIL", "BASE_URL", "CLIENT_URL"]);
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvString.mockReturnValue("test");

      const config = new AppIdentityConfig();

      expect(config.brandName).toBe("test");
      expect(config.supportEmail).toBe("test");
      expect(config.baseUrl).toBe("test");
      expect(config.clientUrl).toBe("test");

      const descriptor = Object.getOwnPropertyDescriptor(config, "brandName");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should implement AppIdentity interface correctly", () => {
      mockEnvString.mockReturnValue("test");

      const config = new AppIdentityConfig();

      expect(config).toMatchObject({
        brandName: expect.any(String),
        supportEmail: expect.any(String),
        baseUrl: expect.any(String),
        clientUrl: expect.any(String),
      });
    });

    it("should handle mixed case environment variable names correctly", () => {
      const mixedValues = {
        BRAND_NAME: "BrandName",
        SUPPORT_EMAIL: "support@example.com",
        BASE_URL: "https://api.example.com",
        CLIENT_URL: "https://client.example.com",
      };

      mockEnvString.mockImplementation((key: string) => mixedValues[key as keyof typeof mixedValues]);

      const config = new AppIdentityConfig();

      expect(config.brandName).toBe("BrandName");
      expect(config.supportEmail).toBe("support@example.com");
      expect(config.baseUrl).toBe("https://api.example.com");
      expect(config.clientUrl).toBe("https://client.example.com");
    });
  });
});
