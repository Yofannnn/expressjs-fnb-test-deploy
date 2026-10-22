import { PrismaEnvConfig } from "@/infrastructure/config/prisma-database.config";
import { env } from "@/infrastructure/config/env-reader";

jest.mock("@/infrastructure/config/env-reader", () => ({
  env: {
    string: jest.fn(),
  },
}));

describe("PrismaEnvConfig", () => {
  const mockEnvString = env.string as jest.MockedFunction<typeof env.string>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize databaseUrl with value from environment variable", () => {
      const mockDatabaseUrl = "postgresql://user:password@localhost:5432/db";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();

      expect(config.databaseUrl).toBe(mockDatabaseUrl);

      expect(mockEnvString).toHaveBeenCalledTimes(1);
      expect(mockEnvString).toHaveBeenCalledWith("DATABASE_URL");
    });

    it("should throw error when DATABASE_URL is empty string", () => {
      mockEnvString.mockReturnValue("");

      expect(() => new PrismaEnvConfig()).toThrow("DATABASE_URL is not defined");
    });

    it("should throw error when DATABASE_URL is undefined", () => {
      mockEnvString.mockReturnValue(undefined as unknown as string);

      expect(() => new PrismaEnvConfig()).toThrow("DATABASE_URL is not defined");
    });

    it("should handle valid PostgreSQL connection string", () => {
      const mockDatabaseUrl = "postgresql://user:pass@localhost:5432/mydb";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle valid MySQL connection string", () => {
      const mockDatabaseUrl = "mysql://user:pass@localhost:3306/mydb";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle valid SQLite connection string", () => {
      const mockDatabaseUrl = "sqlite://./mydb.db";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle valid MongoDB connection string", () => {
      const mockDatabaseUrl = "mongodb://user:pass@localhost:27017/mydb";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle database URL with special characters in password", () => {
      const mockDatabaseUrl = "postgresql://user:p@ssw0rd!@localhost:5432/db";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle database URL with special characters in username", () => {
      const mockDatabaseUrl = "postgresql://user@domain:password@localhost:5432/db";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle database URL with query parameters", () => {
      const mockDatabaseUrl = "postgresql://user:pass@localhost:5432/db?sslmode=require";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle database URL with multiple query parameters", () => {
      const mockDatabaseUrl = "postgresql://user:pass@localhost:5432/db?sslmode=require&connect_timeout=10";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle database URL with IPv6 address", () => {
      const mockDatabaseUrl = "postgresql://user:pass@[::1]:5432/db";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle database URL with whitespace", () => {
      const mockDatabaseUrl = "  postgresql://user:pass@localhost:5432/db  ";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should call validate after setting databaseUrl", () => {
      const validateSpy = jest.spyOn(PrismaEnvConfig.prototype as any, "validate");
      mockEnvString.mockReturnValue("postgresql://user:pass@localhost:5432/db");

      new PrismaEnvConfig();

      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("should implement PrismaDatabaseConfig interface correctly", () => {
      mockEnvString.mockReturnValue("postgresql://user:pass@localhost:5432/db");

      const config = new PrismaEnvConfig();

      expect(config).toMatchObject({
        databaseUrl: expect.any(String),
      });
    });

    it("should throw error when env.string throws", () => {
      mockEnvString.mockImplementation(() => {
        throw new Error("DATABASE_URL is required");
      });

      expect(() => new PrismaEnvConfig()).toThrow("DATABASE_URL is required");
    });

    it("should maintain immutability of readonly property", () => {
      mockEnvString.mockReturnValue("postgresql://user:pass@localhost:5432/db");

      const config = new PrismaEnvConfig();

      expect(config.databaseUrl).toBe("postgresql://user:pass@localhost:5432/db");

      const descriptor = Object.getOwnPropertyDescriptor(config, "databaseUrl");
      expect(descriptor).toBeDefined();
      expect(descriptor?.writable).toBe(true);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it("should handle very long database URL", () => {
      const longString = "a".repeat(1000);
      const mockDatabaseUrl = `postgresql://user:pass@localhost:5432/${longString}`;
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle database URL with underscores and hyphens", () => {
      const mockDatabaseUrl = "postgresql://user_name:pass-word@localhost:5432/my-db";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });

    it("should handle database URL with port as string", () => {
      const mockDatabaseUrl = "postgresql://user:pass@localhost:5432/db";
      mockEnvString.mockReturnValue(mockDatabaseUrl);

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe(mockDatabaseUrl);
    });
  });

  describe("validate", () => {
    it("should not throw error when databaseUrl is defined and not empty", () => {
      mockEnvString.mockReturnValue("postgresql://user:pass@localhost:5432/db");

      expect(() => new PrismaEnvConfig()).not.toThrow();
    });

    it("should throw error when databaseUrl is empty string", () => {
      mockEnvString.mockReturnValue("");

      expect(() => new PrismaEnvConfig()).toThrow("DATABASE_URL is not defined");
    });

    it("should throw error when databaseUrl is undefined", () => {
      mockEnvString.mockReturnValue(undefined as unknown as string);

      expect(() => new PrismaEnvConfig()).toThrow("DATABASE_URL is not defined");
    });

    it("should throw error when databaseUrl is null", () => {
      mockEnvString.mockReturnValue(null as unknown as string);

      expect(() => new PrismaEnvConfig()).toThrow("DATABASE_URL is not defined");
    });

    it("should handle whitespace-only databaseUrl without throwing", () => {
      mockEnvString.mockReturnValue("   ");

      const config = new PrismaEnvConfig();
      expect(config.databaseUrl).toBe("   ");
      expect(() => new PrismaEnvConfig()).not.toThrow();
    });
  });
});
