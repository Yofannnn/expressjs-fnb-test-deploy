import { UserPassword } from "@/domain/value-objects/user-password.vo";
import { PasswordUnchangedException } from "@/domain/exceptions/user.exceptions";
import { UserPasswordRebuildData } from "@/domain/types/user.type";

describe("UserPassword", () => {
  const mockHashedPassword = "hashed_password_123";
  const mockDate = new Date("2023-01-01T00:00:00.000Z");
  const mockCurrentDate = new Date("2024-01-01T00:00:00.000Z");

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(mockCurrentDate.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Constructor and Getters", () => {
    it("should create a Password instance with valid parameters", () => {
      const password = new UserPassword(mockHashedPassword, mockDate);

      expect(password).toBeInstanceOf(UserPassword);
      expect(password.getHashedValue()).toBe(mockHashedPassword);
      expect(password.getChangedAt()).toBe(mockDate);
    });

    it("should create a Password instance with null changedAt", () => {
      const password = new UserPassword(mockHashedPassword, null);

      expect(password).toBeInstanceOf(UserPassword);
      expect(password.getHashedValue()).toBe(mockHashedPassword);
      expect(password.getChangedAt()).toBeNull();
    });

    it("should accept empty hashed password (no validation)", () => {
      const password = new UserPassword("", mockDate);
      expect(password.getHashedValue()).toBe("");
    });

    it("should accept whitespace hashed password (no validation)", () => {
      const password = new UserPassword("   ", mockDate);
      expect(password.getHashedValue()).toBe("   ");
    });

    it("should accept invalid date (no validation)", () => {
      const invalidDate = new Date("invalid");
      const password = new UserPassword(mockHashedPassword, invalidDate);
      expect(password.getChangedAt()).toBe(invalidDate);
    });
  });

  describe("getHashedValue", () => {
    it("should return the hashed password", () => {
      const password = new UserPassword(mockHashedPassword, mockDate);
      expect(password.getHashedValue()).toBe(mockHashedPassword);
    });
  });

  describe("getChangedAt", () => {
    it("should return the changedAt date", () => {
      const password = new UserPassword(mockHashedPassword, mockDate);
      expect(password.getChangedAt()).toBe(mockDate);
    });

    it("should return null when changedAt is null", () => {
      const password = new UserPassword(mockHashedPassword, null);
      expect(password.getChangedAt()).toBeNull();
    });

    it("should return the exact date reference (not a copy)", () => {
      const password = new UserPassword(mockHashedPassword, mockDate);
      expect(password.getChangedAt()).toBe(mockDate);
    });
  });

  describe("isExpired", () => {
    it("should return false when changedAt is null", () => {
      const password = new UserPassword(mockHashedPassword, null);
      expect(password.isExpired()).toBe(false);
      expect(password.isExpired(30)).toBe(false);
      expect(password.isExpired(0)).toBe(false);
    });

    it("should return false when password is within max age (default 90 days)", () => {
      const recentDate = new Date("2023-12-15T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, recentDate);
      expect(password.isExpired()).toBe(false);
    });

    it("should return true when password is beyond max age (default 90 days)", () => {
      const oldDate = new Date("2023-09-01T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, oldDate);
      expect(password.isExpired()).toBe(true);
    });

    it("should return false when password is within custom max age", () => {
      const customMaxAge = 30;
      const recentDate = new Date("2023-12-20T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, recentDate);
      expect(password.isExpired(customMaxAge)).toBe(false);
    });

    it("should return true when password is beyond custom max age", () => {
      const customMaxAge = 30;
      const oldDate = new Date("2023-11-20T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, oldDate);
      expect(password.isExpired(customMaxAge)).toBe(true);
    });

    it("should use default 90 days when maxPasswordAgeDays is 0", () => {
      const oldDate = new Date("2023-09-01T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, oldDate);
      expect(password.isExpired(0)).toBe(true);
    });

    it("should use default 90 days when maxPasswordAgeDays is negative", () => {
      const oldDate = new Date("2023-09-01T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, oldDate);
      expect(password.isExpired(-10)).toBe(true);
    });

    it("should use default 90 days when maxPasswordAgeDays is undefined", () => {
      const oldDate = new Date("2023-09-01T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, oldDate);
      expect(password.isExpired(undefined)).toBe(true);
    });

    it("should handle exact boundary at 90 days", () => {
      const boundaryDate = new Date("2023-10-03T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, boundaryDate);

      expect(password.isExpired()).toBe(false);
    });

    it("should handle boundary at 90 days + 1 millisecond", () => {
      const boundaryDate = new Date("2023-10-02T23:59:59.999Z");
      const password = new UserPassword(mockHashedPassword, boundaryDate);
      expect(password.isExpired()).toBe(true);
    });

    it("should handle custom max age boundary", () => {
      const customMaxAge = 30;
      const boundaryDate = new Date("2023-12-02T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, boundaryDate);
      expect(password.isExpired(customMaxAge)).toBe(false);
    });

    it("should handle different time zones correctly", () => {
      const dateInDifferentTZ = new Date("2023-12-15T23:59:59.999Z");
      const password = new UserPassword(mockHashedPassword, dateInDifferentTZ);

      expect(password.isExpired()).toBe(false);
    });
  });

  describe("changeTo", () => {
    it("should create a new Password instance with new hash and current date when not same", () => {
      const fixedDate = new Date("2024-01-01T12:00:00.000Z");
      const dateSpy = jest.spyOn(global, "Date").mockImplementation(() => fixedDate);

      try {
        const originalPassword = new UserPassword(mockHashedPassword, mockDate);
        const newHashedPassword = "new_hashed_password_456";

        const newPassword = originalPassword.changeTo(newHashedPassword, false);

        expect(newPassword).toBeInstanceOf(UserPassword);
        expect(newPassword.getHashedValue()).toBe(newHashedPassword);
        expect(newPassword.getChangedAt()).toEqual(fixedDate);
        expect(originalPassword.getHashedValue()).toBe(mockHashedPassword);
        expect(originalPassword.getChangedAt()).toBe(mockDate);
      } finally {
        dateSpy.mockRestore();
      }
    });

    it("should throw PasswordUnchangedException when isSameAsCurrent is true", () => {
      const originalPassword = new UserPassword(mockHashedPassword, mockDate);

      expect(() => originalPassword.changeTo("new_hash", true)).toThrow(PasswordUnchangedException);
    });

    it("should use the current date when changing password", () => {
      const testDate = new Date("2024-01-15T10:30:00.000Z");
      jest.spyOn(global, "Date").mockImplementation(() => testDate);

      try {
        const originalPassword = new UserPassword(mockHashedPassword, mockDate);
        const newPassword = originalPassword.changeTo("new_hash", false);

        expect(newPassword.getChangedAt()).toEqual(testDate);
      } finally {
        jest.restoreAllMocks();
      }
    });

    it("should create a different instance (immutability)", () => {
      const originalPassword = new UserPassword(mockHashedPassword, mockDate);
      const newPassword = originalPassword.changeTo("changed_hash", false);

      expect(newPassword).not.toBe(originalPassword);
      expect(newPassword.getHashedValue()).not.toBe(originalPassword.getHashedValue());
    });

    it("should set changedAt to a new date object, not the same reference", () => {
      const originalPassword = new UserPassword(mockHashedPassword, mockDate);
      const newPassword = originalPassword.changeTo("changed_hash", false);

      expect(newPassword.getChangedAt()).not.toBe(mockDate);
    });

    it("should allow changing to empty string when not same", () => {
      const originalPassword = new UserPassword(mockHashedPassword, mockDate);
      const newPassword = originalPassword.changeTo("", false);

      expect(newPassword.getHashedValue()).toBe("");
      expect(newPassword.getChangedAt()).toBeInstanceOf(Date);
    });

    it("should allow changing to whitespace when not same", () => {
      const originalPassword = new UserPassword(mockHashedPassword, mockDate);
      const newPassword = originalPassword.changeTo("   ", false);

      expect(newPassword.getHashedValue()).toBe("   ");
    });

    it("should preserve original when isSameAsCurrent is true (no change)", () => {
      const originalPassword = new UserPassword(mockHashedPassword, mockDate);

      try {
        originalPassword.changeTo(mockHashedPassword, true);
        fail("Should have thrown exception");
      } catch (error) {
        expect(error).toBeInstanceOf(PasswordUnchangedException);
        expect(originalPassword.getHashedValue()).toBe(mockHashedPassword);
        expect(originalPassword.getChangedAt()).toBe(mockDate);
      }
    });
  });

  describe("create", () => {
    it("should create a Password instance with null changedAt", () => {
      const password = UserPassword.create(mockHashedPassword);

      expect(password).toBeInstanceOf(UserPassword);
      expect(password.getHashedValue()).toBe(mockHashedPassword);
      expect(password.getChangedAt()).toBeNull();
    });

    it("should accept empty string in create", () => {
      const password = UserPassword.create("");
      expect(password.getHashedValue()).toBe("");
    });
  });

  describe("rebuild", () => {
    it("should rebuild Password instance with provided data", () => {
      const rebuildData: UserPasswordRebuildData = {
        hashedPassword: mockHashedPassword,
        changedAt: mockDate,
      };

      const password = UserPassword.rebuild(rebuildData);

      expect(password).toBeInstanceOf(UserPassword);
      expect(password.getHashedValue()).toBe(mockHashedPassword);
      expect(password.getChangedAt()).toBe(mockDate);
    });

    it("should rebuild Password instance with null changedAt when explicitly null", () => {
      const rebuildData: UserPasswordRebuildData = {
        hashedPassword: mockHashedPassword,
        changedAt: null,
      };

      const password = UserPassword.rebuild(rebuildData);

      expect(password).toBeInstanceOf(UserPassword);
      expect(password.getHashedValue()).toBe(mockHashedPassword);
      expect(password.getChangedAt()).toBeNull();
    });

    it("should rebuild Password instance with null changedAt when not provided", () => {
      const rebuildData = {
        hashedPassword: mockHashedPassword,
      } as UserPasswordRebuildData;

      const password = UserPassword.rebuild(rebuildData);

      expect(password).toBeInstanceOf(UserPassword);
      expect(password.getHashedValue()).toBe(mockHashedPassword);
      expect(password.getChangedAt()).toBeNull();
    });

    it("should accept empty hashed password in rebuild", () => {
      const rebuildData: UserPasswordRebuildData = {
        hashedPassword: "",
        changedAt: mockDate,
      };

      const password = UserPassword.rebuild(rebuildData);
      expect(password.getHashedValue()).toBe("");
    });
  });

  describe("Immutability", () => {
    it("should not mutate original when changing password", () => {
      const originalPassword = new UserPassword(mockHashedPassword, mockDate);
      const newPassword = originalPassword.changeTo("new_hash", false);

      expect(originalPassword.getHashedValue()).toBe(mockHashedPassword);
      expect(originalPassword.getChangedAt()).toBe(mockDate);
      expect(newPassword.getHashedValue()).toBe("new_hash");
      expect(newPassword.getChangedAt()).toBeInstanceOf(Date);
    });

    it("should return new instance for each change", () => {
      const original = new UserPassword(mockHashedPassword, mockDate);
      const changed1 = original.changeTo("hash1", false);
      const changed2 = changed1.changeTo("hash2", false);

      expect(original).not.toBe(changed1);
      expect(original).not.toBe(changed2);
      expect(changed1).not.toBe(changed2);
      expect(original.getHashedValue()).toBe(mockHashedPassword);
      expect(changed1.getHashedValue()).toBe("hash1");
      expect(changed2.getHashedValue()).toBe("hash2");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle full lifecycle: create -> change -> expire -> change again", () => {
      const initialHash = "initial_hash";
      const newHash = "new_hash";
      const finalHash = "final_hash";

      const created = UserPassword.create(initialHash);
      expect(created.getChangedAt()).toBeNull();
      expect(created.isExpired()).toBe(false);

      const changed = created.changeTo(newHash, false);
      expect(changed.getChangedAt()).toBeInstanceOf(Date);
      expect(changed.isExpired()).toBe(false);

      const oldDate = new Date("2023-09-01T00:00:00.000Z");
      const oldPassword = new UserPassword(newHash, oldDate);
      expect(oldPassword.isExpired(30)).toBe(true);

      const finalPassword = oldPassword.changeTo(finalHash, false);
      expect(finalPassword.getHashedValue()).toBe(finalHash);
      expect(finalPassword.getChangedAt()).toBeInstanceOf(Date);
    });

    it("should handle rebuild from persistence and check expiration", () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      const rebuildData: UserPasswordRebuildData = {
        hashedPassword: mockHashedPassword,
        changedAt: sixtyDaysAgo,
      };

      const rebuilt = UserPassword.rebuild(rebuildData);

      expect(rebuilt.isExpired(30)).toBe(true);
      expect(rebuilt.isExpired(120)).toBe(false);

      const changed = rebuilt.changeTo("new_hash", false);
      expect(changed.isExpired()).toBe(false);
    });

    it("should handle password unchanged detection with case sensitivity", () => {
      const password = new UserPassword("hash123", mockDate);

      expect(() => password.changeTo("hash123", true)).toThrow(PasswordUnchangedException);
      expect(() => password.changeTo("HASH123", false)).not.toThrow();
    });

    it("should work with very large max age values", () => {
      const oldDate = new Date("2000-01-01T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, oldDate);

      expect(password.isExpired(10000)).toBe(false);
      expect(password.isExpired(5000)).toBe(true);
    });

    it("should work with very small max age values", () => {
      const recentDate = new Date(mockCurrentDate.getTime() - 1000);
      const password = new UserPassword(mockHashedPassword, recentDate);

      expect(password.isExpired(0.00001)).toBe(true);
      expect(password.isExpired(1)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle changedAt date in the future", () => {
      const futureDate = new Date("2099-01-01T00:00:00.000Z");
      const password = new UserPassword(mockHashedPassword, futureDate);

      expect(password.isExpired()).toBe(false);
      expect(password.isExpired(1)).toBe(false);
    });

    it("should handle nullish values in rebuild", () => {
      const password = UserPassword.rebuild({
        hashedPassword: mockHashedPassword,
        changedAt: undefined as unknown as null,
      });

      expect(password.getChangedAt()).toBeNull();
    });

    it("should handle password with special characters", () => {
      const specialHash = "!@#$%^&*()_+{}|:<>?~";
      const password = new UserPassword(specialHash, mockDate);
      expect(password.getHashedValue()).toBe(specialHash);

      const newPassword = password.changeTo("new_hash", false);
      expect(newPassword.getHashedValue()).toBe("new_hash");
    });

    it("should handle Unicode characters in hashed password", () => {
      const unicodeHash = "🔐✨password🚀";
      const password = new UserPassword(unicodeHash, mockDate);
      expect(password.getHashedValue()).toBe(unicodeHash);
    });
  });
});
