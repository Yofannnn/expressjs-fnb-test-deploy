import { JwtEnvConfig } from "@/infrastructure/config/jwt.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    string: jest.fn(),
  },
}));

describe("JwtEnvConfig", () => {
  const mockEnvString = env.string as jest.MockedFunction<typeof env.string>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with values from environment variables", () => {
      const accessSecret = "a".repeat(32);
      const refreshSecret = "b".repeat(32);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      const config = new JwtEnvConfig();

      expect(config.accessSecret).toBe(accessSecret);
      expect(config.refreshSecret).toBe(refreshSecret);

      expect(mockEnvString).toHaveBeenCalledTimes(2);
      expect(mockEnvString).toHaveBeenNthCalledWith(1, "JWT_ACCESS_SECRET");
      expect(mockEnvString).toHaveBeenNthCalledWith(2, "JWT_REFRESH_SECRET");
    });

    it("should throw error when accessSecret is less than 32 characters", () => {
      const accessSecret = "a".repeat(31);
      const refreshSecret = "b".repeat(32);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      expect(() => new JwtEnvConfig()).toThrow("JWT_ACCESS_SECRET must be at least 32 chars");
    });

    it("should throw error when refreshSecret is less than 32 characters", () => {
      const accessSecret = "a".repeat(32);
      const refreshSecret = "b".repeat(31);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      expect(() => new JwtEnvConfig()).toThrow("JWT_REFRESH_SECRET must be at least 32 chars");
    });

    it("should throw error when both secrets are less than 32 characters", () => {
      const accessSecret = "a".repeat(31);
      const refreshSecret = "b".repeat(31);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      expect(() => new JwtEnvConfig()).toThrow("JWT_ACCESS_SECRET must be at least 32 chars");
    });

    it("should handle secrets exactly 32 characters long", () => {
      const accessSecret = "a".repeat(32);
      const refreshSecret = "b".repeat(32);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      const config = new JwtEnvConfig();

      expect(config.accessSecret).toBe(accessSecret);
      expect(config.refreshSecret).toBe(refreshSecret);
      expect(() => new JwtEnvConfig()).not.toThrow();
    });

    it("should handle secrets longer than 32 characters", () => {
      const accessSecret = "a".repeat(64);
      const refreshSecret = "b".repeat(64);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      const config = new JwtEnvConfig();

      expect(config.accessSecret).toBe(accessSecret);
      expect(config.refreshSecret).toBe(refreshSecret);
      expect(() => new JwtEnvConfig()).not.toThrow();
    });

    it("should throw error when accessSecret is empty string", () => {
      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: "",
          JWT_REFRESH_SECRET: "b".repeat(32),
        };
        return values[key];
      });

      expect(() => new JwtEnvConfig()).toThrow("JWT_ACCESS_SECRET must be at least 32 chars");
    });

    it("should throw error when refreshSecret is empty string", () => {
      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: "a".repeat(32),
          JWT_REFRESH_SECRET: "",
        };
        return values[key];
      });

      expect(() => new JwtEnvConfig()).toThrow("JWT_REFRESH_SECRET must be at least 32 chars");
    });

    it("should call validate after setting properties", () => {
      const accessSecret = "a".repeat(32);
      const refreshSecret = "b".repeat(32);

      mockEnvString.mockReturnValue(accessSecret);
      mockEnvString.mockReturnValue(refreshSecret);
      const validateSpy = jest.spyOn(JwtEnvConfig.prototype as any, "validate");

      new JwtEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement JwtConfig interface correctly", () => {
      const accessSecret = "a".repeat(32);
      const refreshSecret = "b".repeat(32);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      const config = new JwtEnvConfig();

      expect(config).toMatchObject({
        accessSecret: expect.any(String),
        refreshSecret: expect.any(String),
      });
    });

    it("should call env.string with correct environment variable names in order", () => {
      const callOrder: string[] = [];
      mockEnvString.mockImplementation((key: string) => {
        callOrder.push(key);
        return "a".repeat(32);
      });

      new JwtEnvConfig();

      expect(callOrder).toEqual(["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]);
    });

    it("should handle secrets with special characters", () => {
      const accessSecret = "!@#$%^&*()_+{}|:<>?~".repeat(2);
      const refreshSecret = "`-=[]\\;',./".repeat(3);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      const config = new JwtEnvConfig();

      expect(config.accessSecret).toBe(accessSecret);
      expect(config.refreshSecret).toBe(refreshSecret);
      expect(() => new JwtEnvConfig()).not.toThrow();
    });

    it("should handle secrets with unicode characters", () => {
      const accessSecret = "测试中文".repeat(16);
      const refreshSecret = "日本語".repeat(16);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      const config = new JwtEnvConfig();

      expect(config.accessSecret).toBe(accessSecret);
      expect(config.refreshSecret).toBe(refreshSecret);
      expect(() => new JwtEnvConfig()).not.toThrow();
    });

    it("should handle secrets with whitespace", () => {
      const accessSecret = "a".repeat(30) + "  ";
      const refreshSecret = "  " + "b".repeat(30);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      const config = new JwtEnvConfig();

      expect(config.accessSecret).toBe(accessSecret);
      expect(config.refreshSecret).toBe(refreshSecret);
      expect(() => new JwtEnvConfig()).not.toThrow();
    });

    it("should throw TypeError when accessSecret is undefined", () => {
      mockEnvString.mockImplementation((key: string) => {
        if (key === "JWT_ACCESS_SECRET") return undefined as unknown as string;
        return "b".repeat(32);
      });

      expect(() => new JwtEnvConfig()).toThrow(TypeError);
    });

    it("should throw TypeError when refreshSecret is undefined", () => {
      mockEnvString.mockImplementation((key: string) => {
        if (key === "JWT_REFRESH_SECRET") return undefined as unknown as string;
        return "a".repeat(32);
      });

      expect(() => new JwtEnvConfig()).toThrow(TypeError);
    });

    it("should throw error when env.string throws", () => {
      mockEnvString.mockImplementation((key: string) => {
        throw new Error(`${key} is required`);
      });

      expect(() => new JwtEnvConfig()).toThrow("JWT_ACCESS_SECRET is required");
    });
  });

  describe("validate", () => {
    it("should not throw error when both secrets are at least 32 characters", () => {
      const accessSecret = "a".repeat(32);
      const refreshSecret = "b".repeat(32);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      expect(() => new JwtEnvConfig()).not.toThrow();
    });

    it("should throw error when accessSecret is 31 characters", () => {
      const accessSecret = "a".repeat(31);
      const refreshSecret = "b".repeat(32);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      expect(() => new JwtEnvConfig()).toThrow("JWT_ACCESS_SECRET must be at least 32 chars");
    });

    it("should throw error when refreshSecret is 31 characters", () => {
      const accessSecret = "a".repeat(32);
      const refreshSecret = "b".repeat(31);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      expect(() => new JwtEnvConfig()).toThrow("JWT_REFRESH_SECRET must be at least 32 chars");
    });

    it("should maintain immutability of readonly properties", () => {
      const accessSecret = "a".repeat(32);
      const refreshSecret = "b".repeat(32);

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: accessSecret,
          JWT_REFRESH_SECRET: refreshSecret,
        };
        return values[key];
      });

      const config = new JwtEnvConfig();

      expect(config.accessSecret).toBe(accessSecret);
      expect(config.refreshSecret).toBe(refreshSecret);

      const descriptor = Object.getOwnPropertyDescriptor(config, "accessSecret");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });
  });
});
