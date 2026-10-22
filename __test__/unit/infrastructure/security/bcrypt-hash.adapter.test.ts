import { BcryptHashAdapter } from "@/infrastructure/security/hash-provider.adapter";
import { Logger } from "@/application/ports/driven/logger";
import { SERVER_EXCEPTIONS } from "@/application/exceptions/server.exception";
import bcrypt from "bcryptjs";
import crypto from "crypto";

jest.mock("bcryptjs");

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  timingSafeEqual: jest.fn(),
}));

describe("BcryptHashAdapter", () => {
  let hashAdapter: BcryptHashAdapter;
  let mockLogger: jest.Mocked<Logger>;
  let mockBcrypt: jest.Mocked<typeof bcrypt>;
  let mockTimingSafeEqual: jest.MockedFunction<typeof crypto.timingSafeEqual>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
    mockTimingSafeEqual = crypto.timingSafeEqual as jest.MockedFunction<typeof crypto.timingSafeEqual>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    delete process.env.BCRYPT_ROUNDS;

    hashAdapter = new BcryptHashAdapter(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger", () => {
      const adapter = new BcryptHashAdapter(mockLogger);
      expect(adapter).toBeInstanceOf(BcryptHashAdapter);
    });

    it("should initialize with default rounds when env var not set", () => {
      delete process.env.BCRYPT_ROUNDS;
      const adapter = new BcryptHashAdapter(mockLogger);
      expect(adapter).toBeInstanceOf(BcryptHashAdapter);
    });

    it("should initialize with custom rounds from env var", () => {
      process.env.BCRYPT_ROUNDS = "10";
      const adapter = new BcryptHashAdapter(mockLogger);
      expect(adapter).toBeInstanceOf(BcryptHashAdapter);
    });

    it("should handle invalid env var gracefully", () => {
      process.env.BCRYPT_ROUNDS = "invalid";
      const adapter = new BcryptHashAdapter(mockLogger);
      expect(adapter).toBeInstanceOf(BcryptHashAdapter);
    });
  });

  describe("hash", () => {
    it("should hash a value using bcrypt", async () => {
      const plainText = "myPassword123";
      const expectedHash = "$2a$12$hashedPassword";

      mockBcrypt.hash.mockResolvedValue(expectedHash as never);

      const result = await hashAdapter.hash(plainText);

      expect(result).toBe(expectedHash);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(plainText, 12);
    });

    it("should use custom rounds from environment", async () => {
      process.env.BCRYPT_ROUNDS = "10";
      const adapter = new BcryptHashAdapter(mockLogger);
      const plainText = "password";

      mockBcrypt.hash.mockResolvedValue("hashed" as never);

      await adapter.hash(plainText);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(plainText, 10);
    });

    it("should handle empty string", async () => {
      const plainText = "";
      const expectedHash = "$2a$12$emptyHash";

      mockBcrypt.hash.mockResolvedValue(expectedHash as never);

      const result = await hashAdapter.hash(plainText);

      expect(result).toBe(expectedHash);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(plainText, 12);
    });

    it("should handle special characters", async () => {
      const plainText = "p@ssw0rd!#$%^&*()";
      const expectedHash = "$2a$12$specialHash";

      mockBcrypt.hash.mockResolvedValue(expectedHash as never);

      const result = await hashAdapter.hash(plainText);

      expect(result).toBe(expectedHash);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(plainText, 12);
    });

    it("should handle unicode characters", async () => {
      const plainText = "пароль密码🔐";
      const expectedHash = "$2a$12$unicodeHash";

      mockBcrypt.hash.mockResolvedValue(expectedHash as never);

      const result = await hashAdapter.hash(plainText);

      expect(result).toBe(expectedHash);
    });

    it("should handle very long strings", async () => {
      const plainText = "a".repeat(1000);
      const expectedHash = "$2a$12$longHash";

      mockBcrypt.hash.mockResolvedValue(expectedHash as never);

      const result = await hashAdapter.hash(plainText);

      expect(result).toBe(expectedHash);
    });

    it("should log error and throw SERVER_EXCEPTIONS when bcrypt fails", async () => {
      const plainText = "password";
      const error = new Error("Bcrypt error");

      mockBcrypt.hash.mockRejectedValue(error as never);

      await expect(hashAdapter.hash(plainText)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "BcryptHashAdapter",
        event: "HASH_ERROR",
        message: "Bcrypt error",
        stack: error.stack,
      });
    });

    it("should log error with non-Error rejection", async () => {
      const plainText = "password";

      mockBcrypt.hash.mockRejectedValue("string error" as never);

      await expect(hashAdapter.hash(plainText)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "BcryptHashAdapter",
        event: "HASH_ERROR",
        message: "Failed to hash value",
        stack: undefined,
      });
    });
  });

  describe("compare", () => {
    it("should return true for matching password and hash", async () => {
      const plainText = "myPassword123";
      const hash = "$2a$12$hashedPassword";

      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await hashAdapter.compare(plainText, hash);

      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(plainText, hash);
    });

    it("should return false for non-matching password and hash", async () => {
      const plainText = "wrongPassword";
      const hash = "$2a$12$hashedPassword";

      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await hashAdapter.compare(plainText, hash);

      expect(result).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(plainText, hash);
    });

    it("should return false when value is empty string", async () => {
      const result = await hashAdapter.compare("", "someHash");

      expect(result).toBe(false);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should return false when hash is empty string", async () => {
      const result = await hashAdapter.compare("password", "");

      expect(result).toBe(false);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should return false when value is null", async () => {
      const result = await hashAdapter.compare(null as unknown as string, "someHash");

      expect(result).toBe(false);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should return false when hash is null", async () => {
      const result = await hashAdapter.compare("password", null as unknown as string);

      expect(result).toBe(false);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should return false when both are empty", async () => {
      const result = await hashAdapter.compare("", "");

      expect(result).toBe(false);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should return false when both are null", async () => {
      const result = await hashAdapter.compare(null as unknown as string, null as unknown as string);

      expect(result).toBe(false);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should return false when value is undefined", async () => {
      const result = await hashAdapter.compare(undefined as unknown as string, "someHash");

      expect(result).toBe(false);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should return false when hash is undefined", async () => {
      const result = await hashAdapter.compare("password", undefined as unknown as string);

      expect(result).toBe(false);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should log error and throw SERVER_EXCEPTIONS when bcrypt fails", async () => {
      const plainText = "password";
      const hash = "$2a$12$hashedPassword";
      const error = new Error("Bcrypt compare error");

      mockBcrypt.compare.mockRejectedValue(error as never);

      await expect(hashAdapter.compare(plainText, hash)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "BcryptHashAdapter",
        event: "COMPARE_ERROR",
        message: "Bcrypt compare error",
        stack: error.stack,
      });
    });

    it("should log error with non-Error rejection", async () => {
      const plainText = "password";
      const hash = "$2a$12$hashedPassword";

      mockBcrypt.compare.mockRejectedValue("string error" as never);

      await expect(hashAdapter.compare(plainText, hash)).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "BcryptHashAdapter",
        event: "COMPARE_ERROR",
        message: "Failed to compare values",
        stack: undefined,
      });
    });

    it("should compare with special characters", async () => {
      const plainText = "p@ssw0rd!#$%";
      const hash = "$2a$12$specialHash";

      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await hashAdapter.compare(plainText, hash);

      expect(result).toBe(true);
    });
  });

  describe("hashDeterministic", () => {
    it("should create deterministic hash using sha256", () => {
      const value = "test@example.com";

      const hash = hashAdapter.hashDeterministic(value);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64);
    });

    it("should produce same hash for same input", () => {
      const value = "test@example.com";

      const hash1 = hashAdapter.hashDeterministic(value);
      const hash2 = hashAdapter.hashDeterministic(value);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hash for different input", () => {
      const value1 = "test1@example.com";
      const value2 = "test2@example.com";

      const hash1 = hashAdapter.hashDeterministic(value1);
      const hash2 = hashAdapter.hashDeterministic(value2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      const value = "";

      const hash = hashAdapter.hashDeterministic(value);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64);
    });

    it("should handle unicode characters", () => {
      const value = "тест密码🔐";

      const hash = hashAdapter.hashDeterministic(value);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it("should handle very long strings", () => {
      const value = "a".repeat(10000);

      const hash = hashAdapter.hashDeterministic(value);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it("should produce hex output", () => {
      const value = "test";

      const hash = hashAdapter.hashDeterministic(value);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should be case sensitive", () => {
      const value1 = "Test";
      const value2 = "test";

      const hash1 = hashAdapter.hashDeterministic(value1);
      const hash2 = hashAdapter.hashDeterministic(value2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("compareDeterministic", () => {
    it("should return true for matching value and hash", () => {
      const value = "test@example.com";
      const hash = hashAdapter.hashDeterministic(value);

      mockTimingSafeEqual.mockReturnValue(true);

      const result = hashAdapter.compareDeterministic(value, hash);

      expect(result).toBe(true);
      expect(mockTimingSafeEqual).toHaveBeenCalled();
    });

    it("should return false for non-matching value and hash", () => {
      const value = "test@example.com";
      const wrongValue = "wrong@example.com";
      const hash = hashAdapter.hashDeterministic(value);

      mockTimingSafeEqual.mockReturnValue(false);

      const result = hashAdapter.compareDeterministic(wrongValue, hash);

      expect(result).toBe(false);
    });

    it("should return false when value is empty string", () => {
      const result = hashAdapter.compareDeterministic("", "someHash");

      expect(result).toBe(false);
      expect(mockTimingSafeEqual).not.toHaveBeenCalled();
    });

    it("should return false when hash is empty string", () => {
      const result = hashAdapter.compareDeterministic("value", "");

      expect(result).toBe(false);
      expect(mockTimingSafeEqual).not.toHaveBeenCalled();
    });

    it("should return false when value is null", () => {
      const result = hashAdapter.compareDeterministic(null as unknown as string, "someHash");

      expect(result).toBe(false);
      expect(mockTimingSafeEqual).not.toHaveBeenCalled();
    });

    it("should return false when hash is null", () => {
      const result = hashAdapter.compareDeterministic("value", null as unknown as string);

      expect(result).toBe(false);
      expect(mockTimingSafeEqual).not.toHaveBeenCalled();
    });

    it("should return false when both are empty", () => {
      const result = hashAdapter.compareDeterministic("", "");

      expect(result).toBe(false);
      expect(mockTimingSafeEqual).not.toHaveBeenCalled();
    });

    it("should return false when both are null", () => {
      const result = hashAdapter.compareDeterministic(null as unknown as string, null as unknown as string);

      expect(result).toBe(false);
      expect(mockTimingSafeEqual).not.toHaveBeenCalled();
    });

    it("should use timing safe comparison", () => {
      const value = "test@example.com";
      const hash = hashAdapter.hashDeterministic(value);

      mockTimingSafeEqual.mockReturnValue(true);

      hashAdapter.compareDeterministic(value, hash);

      expect(mockTimingSafeEqual).toHaveBeenCalledTimes(1);
      expect(mockTimingSafeEqual).toHaveBeenCalledWith(expect.any(Buffer), expect.any(Buffer));
    });

    it("should handle unicode characters", () => {
      const value = "тест密码🔐";
      const hash = hashAdapter.hashDeterministic(value);

      mockTimingSafeEqual.mockReturnValue(true);

      const result = hashAdapter.compareDeterministic(value, hash);

      expect(result).toBe(true);
    });

    it("should be case sensitive", () => {
      const value1 = "Test";
      const value2 = "test";
      const hash = hashAdapter.hashDeterministic(value1);

      mockTimingSafeEqual.mockReturnValue(false);

      const result = hashAdapter.compareDeterministic(value2, hash);

      expect(result).toBe(false);
    });

    it("should handle very long strings", () => {
      const value = "a".repeat(10000);
      const hash = hashAdapter.hashDeterministic(value);

      mockTimingSafeEqual.mockReturnValue(true);

      const result = hashAdapter.compareDeterministic(value, hash);

      expect(result).toBe(true);
    });

    it("should handle timing safe equal throwing error", () => {
      const value = "test";
      const hash = "invalid";

      mockTimingSafeEqual.mockImplementation(() => {
        throw new Error("Buffer length mismatch");
      });

      expect(() => hashAdapter.compareDeterministic(value, hash)).toThrow("Buffer length mismatch");
    });

    it("should return false when value is undefined", () => {
      const result = hashAdapter.compareDeterministic(undefined as unknown as string, "someHash");

      expect(result).toBe(false);
      expect(mockTimingSafeEqual).not.toHaveBeenCalled();
    });

    it("should return false when hash is undefined", () => {
      const result = hashAdapter.compareDeterministic("value", undefined as unknown as string);

      expect(result).toBe(false);
      expect(mockTimingSafeEqual).not.toHaveBeenCalled();
    });
  });

  describe("integration - hash and compare", () => {
    it("should successfully hash and compare the same value", async () => {
      const password = "mySecurePassword123";
      const hashedPassword = "$2a$12$hashedValue";

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const hash = await hashAdapter.hash(password);
      const isMatch = await hashAdapter.compare(password, hash);

      expect(isMatch).toBe(true);
    });

    it("should fail comparison with wrong password", async () => {
      const correctPassword = "correctPassword";
      const wrongPassword = "wrongPassword";
      const hashedPassword = "$2a$12$hashedValue";

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const hash = await hashAdapter.hash(correctPassword);
      const isMatch = await hashAdapter.compare(wrongPassword, hash);

      expect(isMatch).toBe(false);
    });

    it("should handle bcrypt hash and compare with special characters", async () => {
      const password = "p@ssw0rd!#$%^&*()";
      const hashedPassword = "$2a$12$specialHash";

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const hash = await hashAdapter.hash(password);
      const isMatch = await hashAdapter.compare(password, hash);

      expect(isMatch).toBe(true);
    });
  });

  describe("integration - hashDeterministic and compareDeterministic", () => {
    beforeEach(() => {
      mockTimingSafeEqual.mockImplementation((a, b) => {
        const bufferA = Buffer.isBuffer(a) ? a : Buffer.from(a as unknown as ArrayBuffer);
        const bufferB = Buffer.isBuffer(b) ? b : Buffer.from(b as unknown as ArrayBuffer);
        if (bufferA.length !== bufferB.length) return false;
        return bufferA.equals(bufferB);
      });
    });

    it("should successfully hash and compare the same value", () => {
      const email = "test@example.com";

      const hash = hashAdapter.hashDeterministic(email);
      const isMatch = hashAdapter.compareDeterministic(email, hash);

      expect(isMatch).toBe(true);
    });

    it("should fail comparison with wrong value", () => {
      const correctEmail = "correct@example.com";
      const wrongEmail = "wrong@example.com";

      const hash = hashAdapter.hashDeterministic(correctEmail);
      const isMatch = hashAdapter.compareDeterministic(wrongEmail, hash);

      expect(isMatch).toBe(false);
    });

    it("should handle multiple hashes consistently", () => {
      const value = "consistent@example.com";

      const hash1 = hashAdapter.hashDeterministic(value);
      const hash2 = hashAdapter.hashDeterministic(value);

      expect(hashAdapter.compareDeterministic(value, hash1)).toBe(true);
      expect(hashAdapter.compareDeterministic(value, hash2)).toBe(true);
      expect(hash1).toBe(hash2);
    });

    it("should compare deterministic hash with unicode", () => {
      const value = "тест密码🔐";
      const hash = hashAdapter.hashDeterministic(value);

      const isMatch = hashAdapter.compareDeterministic(value, hash);

      expect(isMatch).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle whitespace differences", async () => {
      const password1 = "password ";
      const password2 = "password";
      const hash = "$2a$12$hashedPassword";
      const hash2 = "$2a$12$hashedPassword2";

      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await hashAdapter.compare(password1, hash);
      const result2 = await hashAdapter.compare(password2, hash2);

      expect(result).toBe(false);
      expect(result2).toBe(false);
    });

    it("should handle newline characters", async () => {
      const password = "password\n";
      const hash = "$2a$12$hashedPassword";

      mockBcrypt.hash.mockResolvedValue(hash as never);

      const result = await hashAdapter.hash(password);

      expect(result).toBe(hash);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it("should handle tabs and special whitespace", () => {
      const value = "test\t\r\n@example.com";

      const hash = hashAdapter.hashDeterministic(value);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it("should handle undefined in compareDeterministic", () => {
      const result = hashAdapter.compareDeterministic("value", undefined as unknown as string);
      expect(result).toBe(false);
    });
  });

  describe("logger error handling", () => {
    it("should log error when bcrypt hash fails with stack trace", async () => {
      const error = new Error("Hash failed");
      error.stack = "Custom stack trace";
      mockBcrypt.hash.mockRejectedValue(error as never);

      await expect(hashAdapter.hash("password")).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "BcryptHashAdapter",
        event: "HASH_ERROR",
        message: "Hash failed",
        stack: "Custom stack trace",
      });
    });

    it("should log error when bcrypt compare fails with stack trace", async () => {
      const error = new Error("Compare failed");
      error.stack = "Custom stack trace";
      mockBcrypt.compare.mockRejectedValue(error as never);

      await expect(hashAdapter.compare("password", "hash")).rejects.toEqual(SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR());

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "BcryptHashAdapter",
        event: "COMPARE_ERROR",
        message: "Compare failed",
        stack: "Custom stack trace",
      });
    });
  });
});
