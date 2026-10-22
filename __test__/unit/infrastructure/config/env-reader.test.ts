import { env } from "@/infrastructure/config/env-reader";

describe("env", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("string", () => {
    it("should return the value when environment variable exists", () => {
      process.env.TEST_KEY = "test-value";
      const result = env.string("TEST_KEY");
      expect(result).toBe("test-value");
    });

    it("should return fallback when environment variable is not set and fallback is provided", () => {
      delete process.env.TEST_KEY;
      const result = env.string("TEST_KEY", "fallback-value");
      expect(result).toBe("fallback-value");
    });

    it("should return fallback when environment variable is empty string and fallback is provided", () => {
      process.env.TEST_KEY = "";
      const result = env.string("TEST_KEY", "fallback-value");
      expect(result).toBe("fallback-value");
    });

    it("should throw error when environment variable is not set and no fallback is provided", () => {
      delete process.env.TEST_KEY;
      expect(() => env.string("TEST_KEY")).toThrow("TEST_KEY is required");
    });

    it("should throw error when environment variable is empty string and no fallback is provided", () => {
      process.env.TEST_KEY = "";
      expect(() => env.string("TEST_KEY")).toThrow("TEST_KEY is required");
    });

    it("should handle whitespace values correctly", () => {
      process.env.TEST_KEY = "  value with spaces  ";
      const result = env.string("TEST_KEY");
      expect(result).toBe("  value with spaces  ");
    });

    it("should handle special characters correctly", () => {
      process.env.TEST_KEY = "!@#$%^&*()_+";
      const result = env.string("TEST_KEY");
      expect(result).toBe("!@#$%^&*()_+");
    });

    it("should handle unicode characters correctly", () => {
      process.env.TEST_KEY = "测试中文";
      const result = env.string("TEST_KEY");
      expect(result).toBe("测试中文");
    });

    it("should handle fallback as empty string", () => {
      delete process.env.TEST_KEY;
      const result = env.string("TEST_KEY", "");
      expect(result).toBe("");
    });

    it("should handle fallback as undefined", () => {
      delete process.env.TEST_KEY;
      expect(() => env.string("TEST_KEY", undefined)).toThrow("TEST_KEY is required");
    });

    it("should handle numeric values as strings", () => {
      process.env.TEST_KEY = "12345";
      const result = env.string("TEST_KEY");
      expect(result).toBe("12345");
      expect(typeof result).toBe("string");
    });
  });

  describe("number", () => {
    it("should return the number when environment variable exists and is valid", () => {
      process.env.TEST_KEY = "123";
      const result = env.number("TEST_KEY");
      expect(result).toBe(123);
    });

    it("should return fallback when environment variable is not set and fallback is provided", () => {
      delete process.env.TEST_KEY;
      const result = env.number("TEST_KEY", 456);
      expect(result).toBe(456);
    });

    it("should throw error when environment variable is not set and no fallback is provided", () => {
      delete process.env.TEST_KEY;
      expect(() => env.number("TEST_KEY")).toThrow("TEST_KEY must be a number");
    });

    it("should throw error when environment variable is empty string and no fallback is provided", () => {
      process.env.TEST_KEY = "";
      const result = env.number("TEST_KEY");
      expect(result).toBe(0);
    });

    it("should return fallback when environment variable is empty string and fallback is provided", () => {
      process.env.TEST_KEY = "";
      const result = env.number("TEST_KEY", 789);
      expect(result).toBe(789);
    });

    it("should throw error when environment variable is not a valid number", () => {
      process.env.TEST_KEY = "not-a-number";
      expect(() => env.number("TEST_KEY")).toThrow("TEST_KEY must be a number");
    });

    it("should throw error when environment variable is not a valid number and fallback is provided", () => {
      process.env.TEST_KEY = "not-a-number";
      expect(() => env.number("TEST_KEY", 100)).toThrow("TEST_KEY must be a number");
    });

    it("should handle negative numbers correctly", () => {
      process.env.TEST_KEY = "-123";
      const result = env.number("TEST_KEY");
      expect(result).toBe(-123);
    });

    it("should handle decimal numbers correctly", () => {
      process.env.TEST_KEY = "123.45";
      const result = env.number("TEST_KEY");
      expect(result).toBe(123.45);
    });

    it("should handle scientific notation correctly", () => {
      process.env.TEST_KEY = "1.23e5";
      const result = env.number("TEST_KEY");
      expect(result).toBe(123000);
    });

    it("should handle zero correctly", () => {
      process.env.TEST_KEY = "0";
      const result = env.number("TEST_KEY");
      expect(result).toBe(0);
    });

    it("should handle fallback as zero", () => {
      delete process.env.TEST_KEY;
      const result = env.number("TEST_KEY", 0);
      expect(result).toBe(0);
    });

    it("should handle large numbers correctly", () => {
      process.env.TEST_KEY = "9007199254740991";
      const result = env.number("TEST_KEY");
      expect(result).toBe(9007199254740991);
    });

    it("should handle whitespace around numbers correctly", () => {
      process.env.TEST_KEY = "  123  ";
      const result = env.number("TEST_KEY");
      expect(result).toBe(123);
    });

    it("should handle fallback as undefined", () => {
      delete process.env.TEST_KEY;
      expect(() => env.number("TEST_KEY", undefined)).toThrow("TEST_KEY must be a number");
    });

    it("should handle numeric strings with leading zeros", () => {
      process.env.TEST_KEY = "00123";
      const result = env.number("TEST_KEY");
      expect(result).toBe(123);
    });
  });

  describe("boolean", () => {
    it("should return true when environment variable is 'true'", () => {
      process.env.TEST_KEY = "true";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(true);
    });

    it("should return true when environment variable is 'TRUE'", () => {
      process.env.TEST_KEY = "TRUE";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(true);
    });

    it("should return true when environment variable is 'True'", () => {
      process.env.TEST_KEY = "True";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(true);
    });

    it("should return false when environment variable is 'false'", () => {
      process.env.TEST_KEY = "false";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should return false when environment variable is 'FALSE'", () => {
      process.env.TEST_KEY = "FALSE";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should return false when environment variable is 'False'", () => {
      process.env.TEST_KEY = "False";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should return false when environment variable is not set", () => {
      delete process.env.TEST_KEY;
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should return fallback when environment variable is not set", () => {
      delete process.env.TEST_KEY;
      const result = env.boolean("TEST_KEY", true);
      expect(result).toBe(true);
    });

    it("should return false when environment variable is empty string", () => {
      process.env.TEST_KEY = "";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should return fallback when environment variable is empty string", () => {
      process.env.TEST_KEY = "";
      const result = env.boolean("TEST_KEY", true);
      expect(result).toBe(true);
    });

    it("should return false for any value other than 'true' (case-insensitive)", () => {
      process.env.TEST_KEY = "yes";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should return false for '1'", () => {
      process.env.TEST_KEY = "1";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should return false for '0'", () => {
      process.env.TEST_KEY = "0";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should return false for random string", () => {
      process.env.TEST_KEY = "random-string";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should handle whitespace correctly", () => {
      process.env.TEST_KEY = "  true  ";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });

    it("should handle fallback as false explicitly", () => {
      delete process.env.TEST_KEY;
      const result = env.boolean("TEST_KEY", false);
      expect(result).toBe(false);
    });

    it("should handle 'true' with uppercase mix", () => {
      process.env.TEST_KEY = "tRuE";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(true);
    });

    it("should handle 'false' with uppercase mix", () => {
      process.env.TEST_KEY = "fAlSe";
      const result = env.boolean("TEST_KEY");
      expect(result).toBe(false);
    });
  });

  describe("edge cases across all methods", () => {
    it("should handle multiple environment variables correctly", () => {
      process.env.STRING_KEY = "test";
      process.env.NUMBER_KEY = "42";
      process.env.BOOLEAN_KEY = "true";

      expect(env.string("STRING_KEY")).toBe("test");
      expect(env.number("NUMBER_KEY")).toBe(42);
      expect(env.boolean("BOOLEAN_KEY")).toBe(true);
    });

    it("should not be affected by other environment variables", () => {
      process.env.KEY1 = "value1";
      process.env.KEY2 = "value2";

      expect(env.string("KEY1")).toBe("value1");
      expect(env.string("KEY2")).toBe("value2");
      expect(env.string("KEY3", "fallback")).toBe("fallback");
    });

    it("should handle environment variables with special characters in names", () => {
      process.env["KEY_WITH_UNDERSCORE"] = "test";
      expect(env.string("KEY_WITH_UNDERSCORE")).toBe("test");
    });

    it("should handle environment variable names with numbers", () => {
      process.env["KEY123"] = "test";
      expect(env.string("KEY123")).toBe("test");
    });
  });
});
