import { UserEmail } from "@/domain/value-objects/user-email.vo";
import { EmailAlreadyVerifiedException, EmailUnchangedException } from "@/domain/exceptions/user.exceptions";
import { UserEmailRebuildData } from "@/domain/types/user.type";

describe("UserEmail", () => {
  const validEmail = "test@example.com";
  const anotherValidEmail = "another@example.com";

  describe("Constructor and Getters", () => {
    it("should create an email with valid address", () => {
      const email = new UserEmail(validEmail, null, null);

      expect(email.getEmail()).toBe(validEmail);
      expect(email.getVerifiedAt()).toBeNull();
      expect(email.getChangedAt()).toBeNull();
      expect(email.isVerified()).toBe(false);
    });

    it("should return verifiedAt date as new Date object", () => {
      const verifiedAt = new Date("2023-01-01");
      const email = new UserEmail(validEmail, verifiedAt, null);

      const returnedDate = email.getVerifiedAt();
      expect(returnedDate).toEqual(verifiedAt);
      expect(returnedDate).not.toBe(verifiedAt);
    });

    it("should return null for verifiedAt when not verified", () => {
      const email = new UserEmail(validEmail, null, null);
      expect(email.getVerifiedAt()).toBeNull();
    });

    it("should return changedAt date as new Date object", () => {
      const changedAt = new Date("2023-01-01");
      const email = new UserEmail(validEmail, null, changedAt);

      const returnedDate = email.getChangedAt();
      expect(returnedDate).toEqual(changedAt);
      expect(returnedDate).not.toBe(changedAt);
    });

    it("should return null for changedAt when never changed", () => {
      const email = new UserEmail(validEmail, null, null);
      expect(email.getChangedAt()).toBeNull();
    });

    it("should handle dates that are not valid", () => {
      const invalidDate = new Date("invalid");
      const email = new UserEmail(validEmail, invalidDate, invalidDate);

      const verifiedAt = email.getVerifiedAt();
      const changedAt = email.getChangedAt();

      expect(verifiedAt).toBeInstanceOf(Date);
      expect(changedAt).toBeInstanceOf(Date);
      expect(isNaN(verifiedAt!.getTime())).toBe(true);
      expect(isNaN(changedAt!.getTime())).toBe(true);
    });
  });

  describe("isVerified", () => {
    it("should return false when verifiedAt is null", () => {
      const email = new UserEmail(validEmail, null, null);
      expect(email.isVerified()).toBe(false);
    });

    it("should return true when verifiedAt is set", () => {
      const verifiedAt = new Date();
      const email = new UserEmail(validEmail, verifiedAt, null);
      expect(email.isVerified()).toBe(true);
    });
  });

  describe("hasEmail", () => {
    it("should return true for same email address (case insensitive)", () => {
      const email = new UserEmail(validEmail, null, null);

      expect(email.hasEmail(validEmail)).toBe(true);
      expect(email.hasEmail("TEST@example.com")).toBe(true);
      expect(email.hasEmail("Test@Example.COM")).toBe(true);
    });

    it("should return false for different email address", () => {
      const email = new UserEmail(validEmail, null, null);

      expect(email.hasEmail(anotherValidEmail)).toBe(false);
      expect(email.hasEmail("different@example.com")).toBe(false);
    });
  });

  describe("equals", () => {
    it("should return true for identical emails", () => {
      const date = new Date("2023-01-01");
      const email1 = new UserEmail(validEmail, date, null);
      const email2 = new UserEmail(validEmail, date, null);

      expect(email1.equals(email2)).toBe(true);
    });

    it("should return true for same email but different case", () => {
      const date = new Date("2023-01-01");
      const email1 = new UserEmail(validEmail, date, null);
      const email2 = new UserEmail("TEST@EXAMPLE.COM", date, null);

      expect(email1.equals(email2)).toBe(true);
    });

    it("should return false for different verifiedAt dates", () => {
      const email1 = new UserEmail(validEmail, new Date("2023-01-01"), null);
      const email2 = new UserEmail(validEmail, new Date("2023-01-02"), null);

      expect(email1.equals(email2)).toBe(false);
    });

    it("should return false for different changedAt dates", () => {
      const email1 = new UserEmail(validEmail, null, new Date("2023-01-01"));
      const email2 = new UserEmail(validEmail, null, new Date("2023-01-02"));

      expect(email1.equals(email2)).toBe(false);
    });

    it("should return false when one has verifiedAt and other doesn't", () => {
      const email1 = new UserEmail(validEmail, new Date(), null);
      const email2 = new UserEmail(validEmail, null, null);

      expect(email1.equals(email2)).toBe(false);
    });

    it("should return false when one has changedAt and other doesn't", () => {
      const email1 = new UserEmail(validEmail, null, new Date());
      const email2 = new UserEmail(validEmail, null, null);

      expect(email1.equals(email2)).toBe(false);
    });

    it("should return false for different email addresses", () => {
      const date = new Date("2023-01-01");
      const email1 = new UserEmail(validEmail, date, null);
      const email2 = new UserEmail(anotherValidEmail, date, null);

      expect(email1.equals(email2)).toBe(false);
    });
  });

  describe("verify", () => {
    it("should verify an unverified email", () => {
      const originalEmail = new UserEmail(validEmail, null, null);
      const verifiedEmail = originalEmail.verify();

      expect(verifiedEmail.isVerified()).toBe(true);
      expect(verifiedEmail.getVerifiedAt()).toBeInstanceOf(Date);
      expect(verifiedEmail.getEmail()).toBe(validEmail);
      expect(verifiedEmail.getChangedAt()).toBeNull();
    });

    it("should throw EmailAlreadyVerifiedException when email is already verified", () => {
      const verifiedAt = new Date();
      const alreadyVerifiedEmail = new UserEmail(validEmail, verifiedAt, null);

      expect(() => alreadyVerifiedEmail.verify()).toThrow(EmailAlreadyVerifiedException);
    });

    it("should preserve changedAt date when verifying", () => {
      const changedAt = new Date("2023-01-01");
      const email = new UserEmail(validEmail, null, changedAt);
      const verifiedEmail = email.verify();

      expect(verifiedEmail.getChangedAt()).toEqual(changedAt);
      expect(verifiedEmail.isVerified()).toBe(true);
    });

    it("should set verifiedAt to current date", () => {
      const email = new UserEmail(validEmail, null, null);
      const beforeVerify = new Date();

      const verifiedEmail = email.verify();

      const verifiedAt = verifiedEmail.getVerifiedAt();
      expect(verifiedAt).toBeInstanceOf(Date);
      expect(verifiedAt!.getTime()).toBeGreaterThanOrEqual(beforeVerify.getTime());
    });
  });

  describe("changeTo", () => {
    it("should change to a new email address", () => {
      const originalEmail = new UserEmail(validEmail, null, null);
      const changedEmail = originalEmail.changeTo(anotherValidEmail);

      expect(changedEmail.getEmail()).toBe(anotherValidEmail);
      expect(changedEmail.isVerified()).toBe(false);
      expect(changedEmail.getChangedAt()).toBeInstanceOf(Date);
      expect(changedEmail.getVerifiedAt()).toBeNull();
    });

    it("should throw EmailUnchangedException when new address is the same", () => {
      const email = new UserEmail(validEmail, null, null);

      expect(() => email.changeTo(validEmail)).toThrow(EmailUnchangedException);
      expect(() => email.changeTo("TEST@example.com")).toThrow(EmailUnchangedException);
    });

    it("should reset verifiedAt when changing email", () => {
      const verifiedAt = new Date();
      const verifiedEmail = new UserEmail(validEmail, verifiedAt, null);
      const changedEmail = verifiedEmail.changeTo(anotherValidEmail);

      expect(changedEmail.isVerified()).toBe(false);
      expect(changedEmail.getVerifiedAt()).toBeNull();
    });

    it("should set new changedAt timestamp", () => {
      const originalEmail = new UserEmail(validEmail, null, null);
      const beforeChange = new Date();

      const changedEmail = originalEmail.changeTo(anotherValidEmail);

      expect(changedEmail.getChangedAt()).toBeInstanceOf(Date);
      expect(changedEmail.getChangedAt()!.getTime()).toBeGreaterThanOrEqual(beforeChange.getTime());
    });

    it("should allow changing to any string (no validation)", () => {
      const email = new UserEmail(validEmail, null, null);
      const changedEmail = email.changeTo("invalid-email");
      expect(changedEmail.getEmail()).toBe("invalid-email");
    });
  });

  describe("Static Methods", () => {
    describe("create", () => {
      it("should create a new unverified email with no dates", () => {
        const email = UserEmail.create(validEmail);

        expect(email.getEmail()).toBe(validEmail);
        expect(email.getVerifiedAt()).toBeNull();
        expect(email.getChangedAt()).toBeNull();
        expect(email.isVerified()).toBe(false);
      });

      it("should accept any string for email address (no validation)", () => {
        const email = UserEmail.create("invalid-email");
        expect(email.getEmail()).toBe("invalid-email");
      });
    });

    describe("rebuild", () => {
      it("should rebuild email with provided data", () => {
        const verifiedAt = new Date("2023-01-01");
        const changedAt = new Date("2023-02-01");
        const rebuildData: UserEmailRebuildData = {
          email: validEmail,
          verifiedAt,
          changedAt,
        };

        const email = UserEmail.rebuild(rebuildData);

        expect(email.getEmail()).toBe(validEmail);
        expect(email.getVerifiedAt()).toEqual(verifiedAt);
        expect(email.getChangedAt()).toEqual(changedAt);
      });

      it("should rebuild email with null dates when not provided", () => {
        const rebuildData: UserEmailRebuildData = {
          email: validEmail,
          changedAt: null,
          verifiedAt: null,
        };

        const email = UserEmail.rebuild(rebuildData);

        expect(email.getEmail()).toBe(validEmail);
        expect(email.getVerifiedAt()).toBeNull();
        expect(email.getChangedAt()).toBeNull();
      });

      it("should rebuild email with null dates when undefined", () => {
        const rebuildData: UserEmailRebuildData = {
          email: validEmail,
          verifiedAt: null,
          changedAt: null,
        };

        const email = UserEmail.rebuild(rebuildData);

        expect(email.getEmail()).toBe(validEmail);
        expect(email.getVerifiedAt()).toBeNull();
        expect(email.getChangedAt()).toBeNull();
      });

      it("should accept any string for email address during rebuild (no validation)", () => {
        const rebuildData: UserEmailRebuildData = {
          email: "invalid-email",
          verifiedAt: null,
          changedAt: null,
        };

        const email = UserEmail.rebuild(rebuildData);
        expect(email.getEmail()).toBe("invalid-email");
      });
    });
  });

  describe("Immutability", () => {
    it("should return new instances for verify operation", () => {
      const original = new UserEmail(validEmail, null, null);
      const verified = original.verify();

      expect(verified).not.toBe(original);
      expect(original.isVerified()).toBe(false);
      expect(verified.isVerified()).toBe(true);
    });

    it("should return new instances for changeTo operation", () => {
      const original = new UserEmail(validEmail, null, null);
      const changed = original.changeTo(anotherValidEmail);

      expect(changed).not.toBe(original);
      expect(original.getEmail()).toBe(validEmail);
      expect(changed.getEmail()).toBe(anotherValidEmail);
    });

    it("should not mutate original when calling verify", () => {
      const original = new UserEmail(validEmail, null, null);
      original.verify();

      expect(original.getVerifiedAt()).toBeNull();
      expect(original.getChangedAt()).toBeNull();
      expect(original.getEmail()).toBe(validEmail);
    });

    it("should not mutate original when calling changeTo", () => {
      const original = new UserEmail(validEmail, null, null);
      original.changeTo(anotherValidEmail);

      expect(original.getEmail()).toBe(validEmail);
      expect(original.getVerifiedAt()).toBeNull();
      expect(original.getChangedAt()).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty email string", () => {
      const email = new UserEmail("", null, null);
      expect(email.getEmail()).toBe("");
      expect(email.hasEmail("")).toBe(true);
    });

    it("should handle email with special characters", () => {
      const specialEmail = "user+tag@example.com";
      const email = new UserEmail(specialEmail, null, null);
      expect(email.getEmail()).toBe(specialEmail);
    });

    it("should handle very long email addresses", () => {
      const longEmail = "a".repeat(64) + "@" + "b".repeat(255) + ".com";
      const email = new UserEmail(longEmail, null, null);
      expect(email.getEmail()).toBe(longEmail);
    });

    it("should handle null dates in equality comparison", () => {
      const email1 = new UserEmail(validEmail, null, null);
      const email2 = new UserEmail(validEmail, null, null);

      expect(email1.equals(email2)).toBe(true);
    });

    it("should handle verifiedAt null in equality comparison", () => {
      const email1 = new UserEmail(validEmail, null, new Date());
      const email2 = new UserEmail(validEmail, null, new Date());

      expect(email1.equals(email2)).toBe(true);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle full lifecycle: create -> verify -> change -> verify again", () => {
      const created = UserEmail.create(validEmail);
      expect(created.isVerified()).toBe(false);

      const verified = created.verify();
      expect(verified.isVerified()).toBe(true);
      expect(verified.getVerifiedAt()).toBeInstanceOf(Date);

      const changed = verified.changeTo(anotherValidEmail);
      expect(changed.isVerified()).toBe(false);
      expect(changed.getChangedAt()).toBeInstanceOf(Date);
      expect(changed.getEmail()).toBe(anotherValidEmail);

      const finalVerified = changed.verify();
      expect(finalVerified.isVerified()).toBe(true);
      expect(finalVerified.getVerifiedAt()).toBeInstanceOf(Date);
      expect(finalVerified.getChangedAt()).toBeInstanceOf(Date);
      expect(finalVerified.getEmail()).toBe(anotherValidEmail);
    });

    it("should handle rebuilding from persistence and then verifying", () => {
      const rebuildData: UserEmailRebuildData = {
        email: validEmail,
        verifiedAt: null,
        changedAt: new Date("2023-01-01"),
      };

      const rebuilt = UserEmail.rebuild(rebuildData);
      expect(rebuilt.isVerified()).toBe(false);
      expect(rebuilt.getChangedAt()).toEqual(new Date("2023-01-01"));

      const verified = rebuilt.verify();
      expect(verified.isVerified()).toBe(true);
      expect(verified.getChangedAt()).toEqual(new Date("2023-01-01"));
    });
  });
});
