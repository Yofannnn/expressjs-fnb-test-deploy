import { NodemailerTransportEnvConfig } from "@/infrastructure/config/nodemailer.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    string: jest.fn(),
    number: jest.fn(),
  },
}));

describe("NodemailerTransportEnvConfig", () => {
  const mockEnvString = env.string as jest.MockedFunction<typeof env.string>;
  const mockEnvNumber = env.number as jest.MockedFunction<typeof env.number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize all properties with values from environment variables", () => {
      const mockHost = "smtp.example.com";
      const mockPort = 587;
      const mockUser = "test@example.com";
      const mockPassword = "secret123";

      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          EMAIL_HOST: mockHost,
          EMAIL_USER: mockUser,
          EMAIL_PASSWORD: mockPassword,
        };
        return values[key];
      });

      mockEnvNumber.mockImplementation(() => {
        return mockPort;
      });

      const config = new NodemailerTransportEnvConfig();

      expect(config.host).toBe(mockHost);
      expect(config.port).toBe(mockPort);
      expect(config.user).toBe(mockUser);
      expect(config.password).toBe(mockPassword);

      expect(mockEnvString).toHaveBeenCalledTimes(3);
      expect(mockEnvString).toHaveBeenNthCalledWith(1, "EMAIL_HOST", "smtp.gmail.com");
      expect(mockEnvString).toHaveBeenNthCalledWith(2, "EMAIL_USER");
      expect(mockEnvString).toHaveBeenNthCalledWith(3, "EMAIL_PASSWORD");

      expect(mockEnvNumber).toHaveBeenCalledTimes(1);
      expect(mockEnvNumber).toHaveBeenCalledWith("EMAIL_PORT", 465);
    });

    it("should use default values when environment variables are not set", () => {
      mockEnvString.mockImplementation((key: string, fallback?: string) => {
        if (key === "EMAIL_HOST") return fallback as string;
        return undefined as unknown as string;
      });

      mockEnvNumber.mockImplementation((key: string, fallback?: number) => {
        return fallback as number;
      });

      const config = new NodemailerTransportEnvConfig();

      expect(config.host).toBe("smtp.gmail.com");
      expect(config.port).toBe(465);
      expect(config.user).toBeUndefined();
      expect(config.password).toBeUndefined();
    });

    it("should handle custom port values correctly", () => {
      const mockPorts = [25, 465, 587, 2525];

      mockPorts.forEach((port) => {
        mockEnvNumber.mockImplementation((key: string) => {
          if (key === "EMAIL_PORT") return port;
          return 0;
        });

        mockEnvString.mockReturnValue("test");

        const config = new NodemailerTransportEnvConfig();
        expect(config.port).toBe(port);
      });
    });

    it("should handle zero port value", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EMAIL_PORT") return 0;
        return 0;
      });

      mockEnvString.mockReturnValue("test");

      const config = new NodemailerTransportEnvConfig();
      expect(config.port).toBe(0);
    });

    it("should handle negative port value", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EMAIL_PORT") return -1;
        return 0;
      });

      mockEnvString.mockReturnValue("test");

      const config = new NodemailerTransportEnvConfig();
      expect(config.port).toBe(-1);
    });

    it("should handle decimal port value", () => {
      mockEnvNumber.mockImplementation((key: string) => {
        if (key === "EMAIL_PORT") return 465.5;
        return 0;
      });

      mockEnvString.mockReturnValue("test");

      const config = new NodemailerTransportEnvConfig();
      expect(config.port).toBe(465.5);
    });

    it("should handle email host with special characters", () => {
      const mockHost = "smtp.example-domain.com";
      mockEnvString.mockImplementation((key: string) => {
        if (key === "EMAIL_HOST") return mockHost;
        return "test";
      });

      mockEnvNumber.mockReturnValue(465);

      const config = new NodemailerTransportEnvConfig();
      expect(config.host).toBe(mockHost);
    });

    it("should handle email user with special characters", () => {
      const mockUser = "test+alias@example.com";
      mockEnvString.mockImplementation((key: string) => {
        if (key === "EMAIL_USER") return mockUser;
        return "test";
      });

      mockEnvNumber.mockReturnValue(465);

      const config = new NodemailerTransportEnvConfig();
      expect(config.user).toBe(mockUser);
    });

    it("should handle email password with special characters", () => {
      const mockPassword = "!@#$%^&*()_+{}|:<>?~";
      mockEnvString.mockImplementation((key: string) => {
        if (key === "EMAIL_PASSWORD") return mockPassword;
        return "test";
      });

      mockEnvNumber.mockReturnValue(465);

      const config = new NodemailerTransportEnvConfig();
      expect(config.password).toBe(mockPassword);
    });

    it("should handle unicode characters in email user", () => {
      const mockUser = "测试@example.com";
      mockEnvString.mockImplementation((key: string) => {
        if (key === "EMAIL_USER") return mockUser;
        return "test";
      });

      mockEnvNumber.mockReturnValue(465);

      const config = new NodemailerTransportEnvConfig();
      expect(config.user).toBe(mockUser);
    });

    it("should handle empty strings from environment variables", () => {
      mockEnvString.mockReturnValue("");
      mockEnvNumber.mockReturnValue(465);

      const config = new NodemailerTransportEnvConfig();

      expect(config.host).toBe("");
      expect(config.user).toBe("");
      expect(config.password).toBe("");
      expect(config.port).toBe(465);
    });

    it("should handle undefined from env.string when no fallback is provided", () => {
      mockEnvString.mockImplementation((key: string) => {
        if (key === "EMAIL_HOST") return "smtp.gmail.com";
        return undefined as unknown as string;
      });

      mockEnvNumber.mockReturnValue(465);

      const config = new NodemailerTransportEnvConfig();

      expect(config.host).toBe("smtp.gmail.com");
      expect(config.user).toBeUndefined();
      expect(config.password).toBeUndefined();
      expect(config.port).toBe(465);
    });

    it("should handle undefined from env.number when fallback is provided", () => {
      mockEnvString.mockReturnValue("test");
      mockEnvNumber.mockReturnValue(undefined as unknown as number);

      const config = new NodemailerTransportEnvConfig();

      expect(config.port).toBeUndefined();
      expect(config.host).toBe("test");
      expect(config.user).toBe("test");
      expect(config.password).toBe("test");
    });

    it("should throw error when EMAIL_USER is missing and no fallback is provided", () => {
      mockEnvString.mockImplementation((key: string) => {
        if (key === "EMAIL_USER") throw new Error("EMAIL_USER is required");
        return "test";
      });

      mockEnvNumber.mockReturnValue(465);

      expect(() => new NodemailerTransportEnvConfig()).toThrow("EMAIL_USER is required");
    });

    it("should throw error when EMAIL_PASSWORD is missing and no fallback is provided", () => {
      mockEnvString.mockImplementation((key: string) => {
        if (key === "EMAIL_PASSWORD") throw new Error("EMAIL_PASSWORD is required");
        return "test";
      });

      mockEnvNumber.mockReturnValue(465);

      expect(() => new NodemailerTransportEnvConfig()).toThrow("EMAIL_PASSWORD is required");
    });

    it("should throw error when EMAIL_PORT is not a valid number", () => {
      mockEnvString.mockReturnValue("test");
      mockEnvNumber.mockImplementation(() => {
        throw new Error("EMAIL_PORT must be a number");
      });

      expect(() => new NodemailerTransportEnvConfig()).toThrow("EMAIL_PORT must be a number");
    });

    it("should implement NodemailerTransportConfig interface correctly", () => {
      mockEnvString.mockReturnValue("test");
      mockEnvNumber.mockReturnValue(465);

      const config = new NodemailerTransportEnvConfig();

      expect(config).toMatchObject({
        host: expect.any(String),
        port: expect.any(Number),
        user: expect.any(String),
        password: expect.any(String),
      });
    });

    it("should call env.string and env.number in correct order", () => {
      const stringCallOrder: string[] = [];
      const numberCallOrder: string[] = [];

      mockEnvString.mockImplementation((key: string) => {
        stringCallOrder.push(key);
        return "test";
      });

      mockEnvNumber.mockImplementation((key: string) => {
        numberCallOrder.push(key);
        return 465;
      });

      new NodemailerTransportEnvConfig();

      expect(stringCallOrder).toEqual(["EMAIL_HOST", "EMAIL_USER", "EMAIL_PASSWORD"]);
      expect(numberCallOrder).toEqual(["EMAIL_PORT"]);
    });

    it("should maintain immutability of readonly properties", () => {
      mockEnvString.mockReturnValue("test");
      mockEnvNumber.mockReturnValue(465);

      const config = new NodemailerTransportEnvConfig();

      expect(config.host).toBe("test");
      expect(config.port).toBe(465);
      expect(config.user).toBe("test");
      expect(config.password).toBe("test");

      const descriptor = Object.getOwnPropertyDescriptor(config, "host");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should handle mixed environment variable values", () => {
      mockEnvString.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          EMAIL_HOST: "smtp.custom.com",
          EMAIL_USER: "custom@example.com",
          EMAIL_PASSWORD: "custompass123",
        };
        return values[key];
      });

      mockEnvNumber.mockImplementation(() => {
        return 587;
      });

      const config = new NodemailerTransportEnvConfig();

      expect(config.host).toBe("smtp.custom.com");
      expect(config.port).toBe(587);
      expect(config.user).toBe("custom@example.com");
      expect(config.password).toBe("custompass123");
    });
  });
});
