import { UserMapper } from "@/application/mappers/user.mapper";
import { User } from "@/domain/entities/user.entity";
import { UserRoleType } from "@/domain/types/user.type";
import { UserStatusType } from "@/domain/types/user.type";

describe("UserMapper", () => {
  const mockId = "user-123";
  const mockName = "John Doe";
  const mockEmail = "john.doe@example.com";
  const mockHashedPassword = "$2b$10$hashed_password_here";
  const mockAddress = "123 Main St, City, Country";
  const mockRole = UserRoleType.MEMBER;
  const mockCreatedAt = new Date("2024-01-01T10:00:00.000Z");
  const mockUpdatedAt = new Date("2024-01-01T11:00:00.000Z");
  const mockEmailVerifiedAt = new Date("2024-01-01T10:30:00.000Z");
  const mockEmailChangedAt = new Date("2024-01-01T10:15:00.000Z");
  const mockPasswordChangedAt = new Date("2024-01-01T10:20:00.000Z");
  const mockSuspendedAt = new Date("2024-01-01T10:45:00.000Z");
  const mockBannedAt = new Date("2024-01-01T10:50:00.000Z");
  const mockAccountLockedUntil = new Date("2024-01-02T10:00:00.000Z");
  const mockLastLoginAt = new Date("2024-01-01T09:00:00.000Z");
  const mockLastFailedLoginAt = new Date("2024-01-01T08:55:00.000Z");
  const mockLastLogoutAt = new Date("2024-01-01T08:50:00.000Z");
  const mockSuspendReason = "Violation of terms";
  const mockBannedReason = "Fraudulent activity";

  describe("toProfileView", () => {
    let user: User;
    let result: ReturnType<typeof UserMapper.toProfileView>;

    describe("with active user (complete data)", () => {
      beforeEach(() => {
        user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: mockEmailChangedAt,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: mockRole,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: mockLastLogoutAt,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = UserMapper.toProfileView(user);
      });

      it("should map all basic fields correctly", () => {
        expect(result).toEqual({
          id: mockId,
          name: mockName,
          address: mockAddress,
          email: mockEmail,
          role: mockRole,
          emailVerifiedAt: mockEmailVerifiedAt,
          createdAt: mockCreatedAt,
        });
      });

      it("should return new Date objects, not references", () => {
        expect(result.createdAt).not.toBe(mockCreatedAt);
        expect(result.emailVerifiedAt).not.toBe(mockEmailVerifiedAt);
        if (result.emailVerifiedAt !== null) {
          expect(result.emailVerifiedAt.getTime()).toBe(mockEmailVerifiedAt.getTime());
        }
      });

      it("should preserve date values accurately", () => {
        expect(result.createdAt.getTime()).toBe(mockCreatedAt.getTime());
        expect(result.emailVerifiedAt!.getTime()).toBe(mockEmailVerifiedAt.getTime());
      });

      it("should not include sensitive fields", () => {
        expect(result).not.toHaveProperty("hashedPassword");
        expect(result).not.toHaveProperty("passwordChangedAt");
        expect(result).not.toHaveProperty("status");
        expect(result).not.toHaveProperty("suspendReason");
        expect(result).not.toHaveProperty("suspendedAt");
        expect(result).not.toHaveProperty("bannedReason");
        expect(result).not.toHaveProperty("bannedAt");
        expect(result).not.toHaveProperty("failedLoginAttempts");
        expect(result).not.toHaveProperty("accountLockedUntil");
        expect(result).not.toHaveProperty("lastLoginAt");
        expect(result).not.toHaveProperty("lastFailedLoginAt");
        expect(result).not.toHaveProperty("lastLogoutAt");
        expect(result).not.toHaveProperty("updatedAt");
        expect(result).not.toHaveProperty("emailChangedAt");
      });
    });

    describe("with suspended user", () => {
      beforeEach(() => {
        user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: null,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: null,
          },
          profile: {
            name: mockName,
            address: null,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.SUSPENDED,
            suspendReason: mockSuspendReason,
            suspendedAt: mockSuspendedAt,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 3,
            accountLockedUntil: null,
            lastLoginAt: null,
            lastFailedLoginAt: mockLastFailedLoginAt,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = UserMapper.toProfileView(user);
      });

      it("should map basic fields correctly regardless of status", () => {
        expect(result).toEqual({
          id: mockId,
          name: mockName,
          address: null,
          email: mockEmail,
          role: UserRoleType.MEMBER,
          emailVerifiedAt: null,
          createdAt: mockCreatedAt,
        });
      });

      it("should not include status fields in profile view", () => {
        expect(result).not.toHaveProperty("status");
        expect(result).not.toHaveProperty("suspendReason");
        expect(result).not.toHaveProperty("suspendedAt");
        expect(result).not.toHaveProperty("bannedReason");
        expect(result).not.toHaveProperty("bannedAt");
      });

      it("should handle emailVerifiedAt as null", () => {
        expect(result.emailVerifiedAt).toBeNull();
      });

      it("should handle address as null", () => {
        expect(result.address).toBeNull();
      });
    });

    describe("with banned user", () => {
      beforeEach(() => {
        user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.BANNED,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: mockBannedReason,
            bannedAt: mockBannedAt,
          },
          security: {
            failedLoginAttempts: 5,
            accountLockedUntil: mockAccountLockedUntil,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: mockLastFailedLoginAt,
            lastLogoutAt: mockLastLogoutAt,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = UserMapper.toProfileView(user);
      });

      it("should map basic fields correctly for banned user", () => {
        expect(result).toEqual({
          id: mockId,
          name: mockName,
          address: mockAddress,
          email: mockEmail,
          role: UserRoleType.MEMBER,
          emailVerifiedAt: mockEmailVerifiedAt,
          createdAt: mockCreatedAt,
        });
      });

      it("should not include banned status fields", () => {
        expect(result).not.toHaveProperty("bannedReason");
        expect(result).not.toHaveProperty("bannedAt");
        expect(result).not.toHaveProperty("status");
      });
    });

    describe("with inactive user", () => {
      beforeEach(() => {
        user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: null,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: null,
          },
          profile: {
            name: mockName,
            address: null,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.INACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: null,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = UserMapper.toProfileView(user);
      });

      it("should map inactive user correctly", () => {
        expect(result).toEqual({
          id: mockId,
          name: mockName,
          address: null,
          email: mockEmail,
          role: UserRoleType.MEMBER,
          emailVerifiedAt: null,
          createdAt: mockCreatedAt,
        });
      });

      it("should handle all optional fields as null", () => {
        expect(result.emailVerifiedAt).toBeNull();
        expect(result.address).toBeNull();
      });
    });

    describe("with admin user", () => {
      beforeEach(() => {
        user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: UserRoleType.ADMIN,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = UserMapper.toProfileView(user);
      });

      it("should map admin role correctly", () => {
        expect(result.role).toBe(UserRoleType.ADMIN);
      });

      it("should map all other fields correctly", () => {
        expect(result).toEqual({
          id: mockId,
          name: mockName,
          address: mockAddress,
          email: mockEmail,
          role: UserRoleType.ADMIN,
          emailVerifiedAt: mockEmailVerifiedAt,
          createdAt: mockCreatedAt,
        });
      });
    });

    describe("with unverified email", () => {
      beforeEach(() => {
        user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: null,
            changedAt: mockEmailChangedAt,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = UserMapper.toProfileView(user);
      });

      it("should map email verification status correctly", () => {
        expect(result.emailVerifiedAt).toBeNull();
        expect(result).not.toHaveProperty("emailChangedAt");
      });
    });

    describe("with user having no address", () => {
      beforeEach(() => {
        user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: mockEmailChangedAt,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: null,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = UserMapper.toProfileView(user);
      });

      it("should map address as null", () => {
        expect(result.address).toBeNull();
      });
    });

    describe("edge cases", () => {
      it("should handle null address", () => {
        const userWithNullAddress = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: null,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: null,
          },
          profile: {
            name: mockName,
            address: null,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: null,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(userWithNullAddress);
        expect(result.address).toBeNull();
      });

      it("should handle null email verification status", () => {
        const userWithUnverifiedEmail = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: null,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: null,
          },
          profile: {
            name: mockName,
            address: null,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: null,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(userWithUnverifiedEmail);
        expect(result.emailVerifiedAt).toBeNull();
      });

      it("should handle empty strings in optional fields", () => {
        const userWithEmptyStrings = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: null,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: null,
          },
          profile: {
            name: mockName,
            address: "",
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: "",
            suspendedAt: null,
            bannedReason: "",
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: null,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(userWithEmptyStrings);
        expect(result.address).toBe("");
      });

      it("should handle ancient dates", () => {
        const ancientDate = new Date("1970-01-01T00:00:00.000Z");

        const userWithAncientDates = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: ancientDate,
            changedAt: ancientDate,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: ancientDate,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: ancientDate,
            lastLoginAt: ancientDate,
            lastFailedLoginAt: ancientDate,
            lastLogoutAt: ancientDate,
          },
          createdAt: ancientDate,
          updatedAt: ancientDate,
        });

        const result = UserMapper.toProfileView(userWithAncientDates);

        expect(result.createdAt.getTime()).toBe(0);
        expect(result.emailVerifiedAt!.getTime()).toBe(0);
      });

      it("should handle future dates", () => {
        const futureDate = new Date("2099-12-31T23:59:59.999Z");

        const userWithFutureDates = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: futureDate,
            changedAt: futureDate,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: futureDate,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: futureDate,
            lastLoginAt: futureDate,
            lastFailedLoginAt: futureDate,
            lastLogoutAt: futureDate,
          },
          createdAt: futureDate,
          updatedAt: futureDate,
        });

        const result = UserMapper.toProfileView(userWithFutureDates);

        expect(result.createdAt.getTime()).toBe(futureDate.getTime());
        expect(result.emailVerifiedAt!.getTime()).toBe(futureDate.getTime());
      });

      it("should handle user with all dates as null", () => {
        const userWithNullDates = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: null,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: null,
          },
          profile: {
            name: mockName,
            address: null,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.INACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: null,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(userWithNullDates);

        expect(result.emailVerifiedAt).toBeNull();
        expect(result.address).toBeNull();
      });

      it("should handle user with maximum length name (255 characters)", () => {
        const maxLengthName = "a".repeat(255);
        const userWithMaxLengthName = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: maxLengthName,
            address: mockAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(userWithMaxLengthName);
        expect(result.name).toBe(maxLengthName);
        expect(result.name.length).toBe(255);
      });

      it("should handle user with very long address", () => {
        const longAddress = "a".repeat(1000);
        const userWithLongAddress = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: longAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(userWithLongAddress);
        expect(result.address).toBe(longAddress);
      });

      it("should handle user with special characters in name", () => {
        const specialName = "José María García-López Jr.";
        const userWithSpecialName = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: specialName,
            address: mockAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(userWithSpecialName);
        expect(result.name).toBe(specialName);
      });

      it("should handle user with Unicode characters in name", () => {
        const unicodeName = "🚀 John ✨ Doe 🎉";
        const userWithUnicodeName = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: unicodeName,
            address: mockAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(userWithUnicodeName);
        expect(result.name).toBe(unicodeName);
      });
    });

    describe("immutability", () => {
      it("should not mutate the original user object", () => {
        const user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: mockEmailChangedAt,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: mockRole,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: mockLastLogoutAt,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const originalId = user.getId();
        const originalEmail = user.getEmail();
        const originalName = user.getName();
        const originalRole = user.getRole();
        const originalCreatedAt = user.getCreatedAt();

        UserMapper.toProfileView(user);

        expect(user.getId()).toBe(originalId);
        expect(user.getEmail()).toBe(originalEmail);
        expect(user.getName()).toBe(originalName);
        expect(user.getRole()).toBe(originalRole);
        expect(user.getCreatedAt()).toEqual(originalCreatedAt);
      });
    });

    describe("mapping consistency", () => {
      it("should map all fields consistently with the interface", () => {
        const user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: mockEmailChangedAt,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: mockRole,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: mockLastLogoutAt,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(user);

        expect(result).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          email: expect.any(String),
          role: expect.any(String),
        });

        expect(result.address).toBe(mockAddress);
        expect(result.emailVerifiedAt).toBeInstanceOf(Date);
        expect(result.createdAt).toBeInstanceOf(Date);
      });

      it("should produce consistent results when mapped multiple times", () => {
        const user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: mockEmailChangedAt,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: mockRole,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: mockLastLogoutAt,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result1 = UserMapper.toProfileView(user);
        const result2 = UserMapper.toProfileView(user);

        expect(result1).toEqual(result2);
        expect(result1).not.toBe(result2);
      });
    });

    describe("type-specific scenarios", () => {
      it("should handle member user correctly", () => {
        const memberUser = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(memberUser);
        expect(result.role).toBe(UserRoleType.MEMBER);
      });

      it("should handle admin user correctly", () => {
        const adminUser = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: UserRoleType.ADMIN,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(adminUser);
        expect(result.role).toBe(UserRoleType.ADMIN);
      });

      it("should handle user with complex address", () => {
        const complexAddress = "123 Main St, Apt 4B, New York, NY 10001, USA";
        const userWithComplexAddress = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: null,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: complexAddress,
          },
          role: UserRoleType.MEMBER,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: null,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(userWithComplexAddress);
        expect(result.address).toBe(complexAddress);
      });
    });

    describe("return type validation", () => {
      it("should return UserProfileView type with correct fields", () => {
        const user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: mockEmailChangedAt,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: mockRole,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: mockLastLogoutAt,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(user);

        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("address");
        expect(result).toHaveProperty("email");
        expect(result).toHaveProperty("role");
        expect(result).toHaveProperty("emailVerifiedAt");
        expect(result).toHaveProperty("createdAt");

        const expectedKeys = ["id", "name", "address", "email", "role", "emailVerifiedAt", "createdAt"];
        const actualKeys = Object.keys(result);
        expect(actualKeys.sort()).toEqual(expectedKeys.sort());
      });

      it("should have correct types for all fields", () => {
        const user = User.rebuild({
          id: mockId,
          email: {
            email: mockEmail,
            verifiedAt: mockEmailVerifiedAt,
            changedAt: mockEmailChangedAt,
          },
          password: {
            hashedPassword: mockHashedPassword,
            changedAt: mockPasswordChangedAt,
          },
          profile: {
            name: mockName,
            address: mockAddress,
          },
          role: mockRole,
          status: {
            status: UserStatusType.ACTIVE,
            suspendReason: null,
            suspendedAt: null,
            bannedReason: null,
            bannedAt: null,
          },
          security: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLoginAt: mockLastLoginAt,
            lastFailedLoginAt: null,
            lastLogoutAt: mockLastLogoutAt,
          },
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result = UserMapper.toProfileView(user);

        expect(typeof result.id).toBe("string");
        expect(typeof result.name).toBe("string");
        expect(typeof result.email).toBe("string");
        expect(typeof result.role).toBe("string");
        expect(result.address === null || typeof result.address === "string").toBe(true);
        expect(result.emailVerifiedAt === null || result.emailVerifiedAt instanceof Date).toBe(true);
        expect(result.createdAt instanceof Date).toBe(true);
      });
    });
  });
});
