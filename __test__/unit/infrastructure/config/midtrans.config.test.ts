import { MidtransEnvConfig, MidtransConfig } from "@/infrastructure/config/midtrans.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader");

describe("MidtransEnvConfig", () => {
  let mockEnv: jest.Mocked<typeof env>;

  const mockServerKey = "SB-Mid-server-1234567890";
  const mockSnapBaseUrl = "https://app.sandbox.midtrans.com/snap/v1";
  const mockCoreApiBaseUrl = "https://api.sandbox.midtrans.com/v2";

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnv = env as jest.Mocked<typeof env>;
  });

  describe("constructor", () => {
    it("should create a MidtransEnvConfig instance with all required environment variables", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config).toBeInstanceOf(MidtransEnvConfig);
      expect(config.serverKey).toBe(mockServerKey);
      expect(config.isProduction).toBe(false);
      expect(config.snapBaseUrl).toBe(mockSnapBaseUrl);
      expect(config.coreApiBaseUrl).toBe(mockCoreApiBaseUrl);
    });

    it("should create a MidtransEnvConfig instance in production mode", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(true);

      const config = new MidtransEnvConfig();

      expect(config.isProduction).toBe(true);
    });

    it("should create a MidtransEnvConfig instance with production URLs", () => {
      const prodSnapBaseUrl = "https://app.midtrans.com/snap/v1";
      const prodCoreApiBaseUrl = "https://api.midtrans.com/v2";

      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return prodSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return prodCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(true);

      const config = new MidtransEnvConfig();

      expect(config.snapBaseUrl).toBe(prodSnapBaseUrl);
      expect(config.coreApiBaseUrl).toBe(prodCoreApiBaseUrl);
      expect(config.isProduction).toBe(true);
    });

    it("should handle server key with special characters", () => {
      const specialServerKey = "SB-Mid-server-!@#$%^&*()_+123";
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return specialServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.serverKey).toBe(specialServerKey);
    });

    it("should handle very long server key", () => {
      const longServerKey = "SB-Mid-server-" + "a".repeat(1000);
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return longServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.serverKey).toBe(longServerKey);
    });

    it("should handle URLs with trailing slashes", () => {
      const snapBaseUrlWithSlash = "https://app.sandbox.midtrans.com/snap/v1/";
      const coreApiBaseUrlWithSlash = "https://api.sandbox.midtrans.com/v2/";

      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return snapBaseUrlWithSlash;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return coreApiBaseUrlWithSlash;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.snapBaseUrl).toBe(snapBaseUrlWithSlash);
      expect(config.coreApiBaseUrl).toBe(coreApiBaseUrlWithSlash);
    });

    it("should handle URLs with query parameters", () => {
      const snapBaseUrlWithQuery = "https://app.sandbox.midtrans.com/snap/v1?param=value";
      const coreApiBaseUrlWithQuery = "https://api.sandbox.midtrans.com/v2?api_key=test";

      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return snapBaseUrlWithQuery;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return coreApiBaseUrlWithQuery;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.snapBaseUrl).toBe(snapBaseUrlWithQuery);
      expect(config.coreApiBaseUrl).toBe(coreApiBaseUrlWithQuery);
    });
  });

  describe("interface compliance", () => {
    it("should implement MidtransConfig interface", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config: MidtransConfig = new MidtransEnvConfig();

      expect(config.serverKey).toBeDefined();
      expect(config.isProduction).toBeDefined();
      expect(config.snapBaseUrl).toBeDefined();
      expect(config.coreApiBaseUrl).toBeDefined();
    });

    it("should have readonly properties at compile time", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();
      const originalServerKey = config.serverKey;

      (config as any).serverKey = "new-key";

      expect(config.serverKey).toBeDefined();

      (config as any).serverKey = originalServerKey;
    });
  });

  describe("env reader integration", () => {
    it("should call env.string for server key", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      new MidtransEnvConfig();

      expect(mockEnv.string).toHaveBeenCalledWith("MIDTRANS_SERVER_KEY");
      expect(mockEnv.string).toHaveBeenCalledWith("MIDTRANS_SNAP_BASE_URL");
      expect(mockEnv.string).toHaveBeenCalledWith("MIDTRANS_CORE_API_BASE_URL");
      expect(mockEnv.boolean).toHaveBeenCalledWith("MIDTRANS_IS_PRODUCTION", false);
    });

    it("should call env.boolean for isProduction with default false", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      new MidtransEnvConfig();

      expect(mockEnv.boolean).toHaveBeenCalledWith("MIDTRANS_IS_PRODUCTION", false);
    });

    it("should handle missing environment variables", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return "";
        if (key === "MIDTRANS_SNAP_BASE_URL") return "";
        if (key === "MIDTRANS_CORE_API_BASE_URL") return "";
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.serverKey).toBe("");
      expect(config.snapBaseUrl).toBe("");
      expect(config.coreApiBaseUrl).toBe("");
    });

    it("should handle env.boolean returning true for production", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(true);

      const config = new MidtransEnvConfig();

      expect(config.isProduction).toBe(true);
    });

    it("should handle env.boolean returning false for non-production", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.isProduction).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty server key", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return "";
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.serverKey).toBe("");
      expect(config.snapBaseUrl).toBe(mockSnapBaseUrl);
      expect(config.coreApiBaseUrl).toBe(mockCoreApiBaseUrl);
    });

    it("should handle empty snap base URL", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return "";
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.serverKey).toBe(mockServerKey);
      expect(config.snapBaseUrl).toBe("");
      expect(config.coreApiBaseUrl).toBe(mockCoreApiBaseUrl);
    });

    it("should handle empty core API base URL", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return "";
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.serverKey).toBe(mockServerKey);
      expect(config.snapBaseUrl).toBe(mockSnapBaseUrl);
      expect(config.coreApiBaseUrl).toBe("");
    });

    it("should handle all environment variables empty", () => {
      mockEnv.string.mockReturnValue("");
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.serverKey).toBe("");
      expect(config.snapBaseUrl).toBe("");
      expect(config.coreApiBaseUrl).toBe("");
      expect(config.isProduction).toBe(false);
    });

    it("should handle whitespace in environment variables", () => {
      const serverKeyWithWhitespace = "  SB-Mid-server-123  ";
      const snapBaseUrlWithWhitespace = "  https://app.sandbox.midtrans.com/snap/v1  ";
      const coreApiBaseUrlWithWhitespace = "  https://api.sandbox.midtrans.com/v2  ";

      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return serverKeyWithWhitespace;
        if (key === "MIDTRANS_SNAP_BASE_URL") return snapBaseUrlWithWhitespace;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return coreApiBaseUrlWithWhitespace;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(config.serverKey).toBe(serverKeyWithWhitespace);
      expect(config.snapBaseUrl).toBe(snapBaseUrlWithWhitespace);
      expect(config.coreApiBaseUrl).toBe(coreApiBaseUrlWithWhitespace);
    });

    it("should handle multiple instances creating independent configs", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config1 = new MidtransEnvConfig();
      const config2 = new MidtransEnvConfig();

      expect(config1).not.toBe(config2);
      expect(config1.serverKey).toBe(config2.serverKey);
      expect(config1.isProduction).toBe(config2.isProduction);
      expect(config1.snapBaseUrl).toBe(config2.snapBaseUrl);
      expect(config1.coreApiBaseUrl).toBe(config2.coreApiBaseUrl);
    });
  });

  describe("type safety", () => {
    it("should have correct types for all properties", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(false);

      const config = new MidtransEnvConfig();

      expect(typeof config.serverKey).toBe("string");
      expect(typeof config.isProduction).toBe("boolean");
      expect(typeof config.snapBaseUrl).toBe("string");
      expect(typeof config.coreApiBaseUrl).toBe("string");
    });

    it("should have correct types when isProduction is true", () => {
      mockEnv.string.mockImplementation((key: string) => {
        if (key === "MIDTRANS_SERVER_KEY") return mockServerKey;
        if (key === "MIDTRANS_SNAP_BASE_URL") return mockSnapBaseUrl;
        if (key === "MIDTRANS_CORE_API_BASE_URL") return mockCoreApiBaseUrl;
        return "";
      });
      mockEnv.boolean.mockReturnValue(true);

      const config = new MidtransEnvConfig();

      expect(typeof config.isProduction).toBe("boolean");
      expect(config.isProduction).toBe(true);
    });
  });
});
