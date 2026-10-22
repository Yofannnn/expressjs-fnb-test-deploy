import { User } from "@/domain/entities/user.entity";
import { UserCreationData, UserRebuildData, UserRoleType, UserStatusType } from "@/domain/types/user.type";
import {
  SelfActionNotAllowedException,
  UserActivationNotAllowedException,
  RoleAlreadyAssignedException,
  AuthenticationNotAllowedException,
  AccountLockedException,
  ProfileModificationNotAllowedException,
  RoleChangeNotAllowedException,
  ActionReasonRequiredException,
  InvalidStatusTransitionException,
  EmailAlreadyVerifiedException,
  PasswordUnchangedException,
} from "@/domain/exceptions/user.exceptions";
import {
  UserCreatedEvent,
  UserActivatedEvent,
  UserSuspendedEvent,
  UserBannedEvent,
  UserDeactivatedEvent,
  UserRoleChangedEvent,
  UserEmailChangedEvent,
  UserEmailVerifiedEvent,
  UserPasswordChangedEvent,
  UserProfileUpdatedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserAccountLockedEvent,
  UserAccountUnlockedEvent,
} from "@/domain/events/user.events";

describe("User Entity", () => {
  const mockUserId = "user-123";
  const mockAdminId = "admin-456";
  const mockEmail = "test@example.com";
  const mockHashedPassword = "hashedPassword123";
  const mockName = "John Doe";
  const mockAddress = "123 Main St";
  const mockCreatedAt = new Date("2023-01-01");
  const mockUpdatedAt = new Date("2023-01-02");

  let adminUser: User;

  const createDefaultUser = (
    id: string = mockUserId,
    email: string = mockEmail,
    hashedPassword: string = mockHashedPassword,
    name: string = mockName,
    address: string | null = mockAddress,
    role: UserRoleType = UserRoleType.MEMBER,
    status: UserStatusType = UserStatusType.ACTIVE,
    isEmailVerified: boolean = false,
    failedLoginAttempts: number = 0,
    isLocked: boolean = false,
  ): User => {
    const rebuildData: UserRebuildData = {
      id,
      email: {
        email,
        changedAt: null,
        verifiedAt: isEmailVerified ? new Date() : null,
      },
      password: {
        hashedPassword,
        changedAt: null,
      },
      profile: {
        name,
        address,
      },
      role,
      status: {
        status,
        suspendedAt: status === UserStatusType.SUSPENDED ? new Date() : null,
        bannedAt: status === UserStatusType.BANNED ? new Date() : null,
        suspendReason: status === UserStatusType.SUSPENDED ? "Test suspension" : null,
        bannedReason: status === UserStatusType.BANNED ? "Test ban" : null,
      },
      security: {
        failedLoginAttempts: isLocked ? 5 : failedLoginAttempts,
        accountLockedUntil: isLocked ? new Date(Date.now() + 600000) : null,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: failedLoginAttempts > 0 ? new Date() : null,
      },
      createdAt: mockCreatedAt,
      updatedAt: mockUpdatedAt,
    };

    return User.rebuild(rebuildData);
  };

  beforeEach(() => {
    adminUser = createDefaultUser(
      mockAdminId,
      "admin@example.com",
      "adminHashedPassword",
      "Admin User",
      "Admin Address",
      UserRoleType.ADMIN,
      UserStatusType.ACTIVE,
    );
  });

  describe("Constructor and Factory Methods", () => {
    it("should create a user with factory method and default role", () => {
      const creationData: UserCreationData = {
        id: mockUserId,
        email: mockEmail,
        hashedPassword: mockHashedPassword,
        name: mockName,
        address: mockAddress,
      };

      const user = User.create(creationData);

      expect(user.getId()).toBe(mockUserId);
      expect(user.getEmail()).toBe(mockEmail);
      expect(user.getName()).toBe(mockName);
      expect(user.getAddress()).toBe(mockAddress);
      expect(user.getRole()).toBe(UserRoleType.MEMBER);
      expect(user.isActive()).toBe(true);

      const events = user.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserCreatedEvent);
    });

    it("should create a user with custom role", () => {
      const creationData: UserCreationData = {
        id: mockUserId,
        email: mockEmail,
        hashedPassword: mockHashedPassword,
        name: mockName,
        address: mockAddress,
        role: UserRoleType.ADMIN,
      };

      const user = User.create(creationData);
      expect(user.getRole()).toBe(UserRoleType.ADMIN);
    });

    it("should create a user without address", () => {
      const creationData: UserCreationData = {
        id: mockUserId,
        email: mockEmail,
        hashedPassword: mockHashedPassword,
        name: mockName,
      };

      const user = User.create(creationData);
      expect(user.getAddress()).toBeNull();
    });

    it("should rebuild a user from persistence data", () => {
      const rebuildData: UserRebuildData = {
        id: mockUserId,
        email: { email: mockEmail, changedAt: null, verifiedAt: null },
        password: { hashedPassword: mockHashedPassword, changedAt: null },
        profile: { name: mockName, address: mockAddress },
        role: UserRoleType.MEMBER,
        status: {
          status: UserStatusType.ACTIVE,
          suspendedAt: null,
          bannedAt: null,
          suspendReason: null,
          bannedReason: null,
        },
        security: {
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          lastLoginAt: null,
          lastLogoutAt: null,
          lastFailedLoginAt: null,
        },
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const user = User.rebuild(rebuildData);

      expect(user.getId()).toBe(mockUserId);
      expect(user.getEmail()).toBe(mockEmail);
      expect(user.getName()).toBe(mockName);
      expect(user.getAddress()).toBe(mockAddress);
      expect(user.getRole()).toBe(UserRoleType.MEMBER);
      expect(user.isActive()).toBe(true);
    });

    it("should rebuild a user with null address", () => {
      const rebuildData: UserRebuildData = {
        id: mockUserId,
        email: { email: mockEmail, changedAt: null, verifiedAt: null },
        password: { hashedPassword: mockHashedPassword, changedAt: null },
        profile: { name: mockName, address: null },
        role: UserRoleType.MEMBER,
        status: {
          status: UserStatusType.ACTIVE,
          suspendedAt: null,
          bannedAt: null,
          suspendReason: null,
          bannedReason: null,
        },
        security: {
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          lastLoginAt: null,
          lastLogoutAt: null,
          lastFailedLoginAt: null,
        },
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const user = User.rebuild(rebuildData);
      expect(user.getAddress()).toBeNull();
    });

    it("should emit UserCreatedEvent on creation", () => {
      const creationData: UserCreationData = {
        id: mockUserId,
        email: mockEmail,
        hashedPassword: mockHashedPassword,
        name: mockName,
        address: mockAddress,
      };

      const user = User.create(creationData);
      const events = user.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserCreatedEvent);
      expect((events[0] as UserCreatedEvent).aggregateId).toBe(mockUserId);
    });
  });

  describe("Query Methods", () => {
    let user: User;

    beforeEach(() => {
      user = createDefaultUser();
    });

    describe("Identity & Profile Queries", () => {
      it("should return correct id", () => {
        expect(user.getId()).toBe(mockUserId);
      });

      it("should return correct email", () => {
        expect(user.getEmail()).toBe(mockEmail);
      });

      it("should return correct name", () => {
        expect(user.getName()).toBe(mockName);
      });

      it("should return correct address", () => {
        expect(user.getAddress()).toBe(mockAddress);
      });

      it("should return correct role", () => {
        expect(user.getRole()).toBe(UserRoleType.MEMBER);
      });

      it("should return correct created at date as new instance", () => {
        const createdAt = user.getCreatedAt();
        expect(createdAt).toEqual(mockCreatedAt);
        expect(createdAt).not.toBe(mockCreatedAt);
      });

      it("should return correct updated at date as new instance", () => {
        const updatedAt = user.getUpdatedAt();
        expect(updatedAt).toEqual(mockUpdatedAt);
        expect(updatedAt).not.toBe(mockUpdatedAt);
      });
    });

    describe("Email Queries", () => {
      it("should return email verified status", () => {
        expect(user.isEmailVerified()).toBe(false);

        const verifiedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.ACTIVE,
          true,
        );
        expect(verifiedUser.isEmailVerified()).toBe(true);
      });

      it("should return email verified at date", () => {
        const verifiedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.ACTIVE,
          true,
        );
        expect(verifiedUser.getEmailVerifiedAt()).toBeInstanceOf(Date);
      });

      it("should return null when email not verified", () => {
        expect(user.getEmailVerifiedAt()).toBeNull();
      });

      it("should return email changed at date", () => {
        user.changeEmail("new@example.com");
        expect(user.getEmailChangedAt()).toBeInstanceOf(Date);
      });

      it("should return null when email not changed", () => {
        expect(user.getEmailChangedAt()).toBeNull();
      });
    });

    describe("Password Queries", () => {
      it("should return password changed at date", () => {
        user.changePassword("newHashedPassword", false);
        expect(user.getPasswordChangedAt()).toBeInstanceOf(Date);
      });

      it("should return null when password not changed", () => {
        expect(user.getPasswordChangedAt()).toBeNull();
      });

      it("should get hashed password for authentication", () => {
        const hashedPassword = user.getHashedPasswordForAuthentication();
        expect(hashedPassword).toBe(mockHashedPassword);
      });

      it("should check if password is expired", () => {
        expect(user.isPasswordExpired()).toBe(false);
        expect(user.isPasswordExpired(30)).toBe(false);
      });
    });

    describe("Status Queries", () => {
      it("should return correct status", () => {
        expect(user.getStatus()).toBe(UserStatusType.ACTIVE);

        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        expect(suspendedUser.getStatus()).toBe(UserStatusType.SUSPENDED);

        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        expect(bannedUser.getStatus()).toBe(UserStatusType.BANNED);

        const inactiveUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.INACTIVE,
        );
        expect(inactiveUser.getStatus()).toBe(UserStatusType.INACTIVE);
      });

      it("should return suspended at date when suspended", () => {
        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        expect(suspendedUser.getSuspendedAt()).toBeInstanceOf(Date);
      });

      it("should return null for suspended at when not suspended", () => {
        expect(user.getSuspendedAt()).toBeNull();
      });

      it("should return suspend reason when suspended", () => {
        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        expect(suspendedUser.getSuspendReason()).toBe("Test suspension");
      });

      it("should return null for suspend reason when not suspended", () => {
        expect(user.getSuspendReason()).toBeNull();
      });

      it("should return banned at date when banned", () => {
        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        expect(bannedUser.getBannedAt()).toBeInstanceOf(Date);
      });

      it("should return null for banned at when not banned", () => {
        expect(user.getBannedAt()).toBeNull();
      });

      it("should return banned reason when banned", () => {
        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        expect(bannedUser.getBannedReason()).toBe("Test ban");
      });

      it("should return null for banned reason when not banned", () => {
        expect(user.getBannedReason()).toBeNull();
      });

      it("should check if user is active", () => {
        expect(user.isActive()).toBe(true);

        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        expect(suspendedUser.isActive()).toBe(false);

        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        expect(bannedUser.isActive()).toBe(false);

        const inactiveUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.INACTIVE,
        );
        expect(inactiveUser.isActive()).toBe(false);
      });

      it("should check if user is suspended", () => {
        expect(user.isSuspended()).toBe(false);

        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        expect(suspendedUser.isSuspended()).toBe(true);
      });

      it("should check if user is banned", () => {
        expect(user.isBanned()).toBe(false);

        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        expect(bannedUser.isBanned()).toBe(true);
      });

      it("should check if user is inactive", () => {
        expect(user.isInactive()).toBe(false);

        const inactiveUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.INACTIVE,
        );
        expect(inactiveUser.isInactive()).toBe(true);
      });
    });

    describe("Security Queries", () => {
      it("should check if account is locked", () => {
        const lockedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.ACTIVE,
          false,
          0,
          true,
        );
        expect(lockedUser.isAccountLocked()).toBe(true);
        expect(user.isAccountLocked()).toBe(false);
      });

      it("should return failed login attempts", () => {
        const userWithFailedAttempts = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.ACTIVE,
          false,
          3,
        );
        expect(userWithFailedAttempts.getFailedLoginAttempts()).toBe(3);
      });

      it("should return account locked until date", () => {
        const lockedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.ACTIVE,
          false,
          0,
          true,
        );
        expect(lockedUser.getAccountLockedUntil()).toBeInstanceOf(Date);
      });

      it("should return null for account locked until when not locked", () => {
        expect(user.getAccountLockedUntil()).toBeNull();
      });

      it("should return last login at date", () => {
        user.login();
        expect(user.getLastLoginAt()).toBeInstanceOf(Date);
      });

      it("should return null for last login at when never logged in", () => {
        expect(user.getLastLoginAt()).toBeNull();
      });

      it("should return last logout at date", () => {
        user.login();
        user.logout();
        expect(user.getLastLogoutAt()).toBeInstanceOf(Date);
      });

      it("should return null for last logout at when never logged out", () => {
        expect(user.getLastLogoutAt()).toBeNull();
      });

      it("should return remaining lockout time", () => {
        const lockedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.ACTIVE,
          false,
          0,
          true,
        );
        expect(lockedUser.getRemainingLockoutTime()).toBeGreaterThan(0);
      });

      it("should return 0 for remaining lockout time when not locked", () => {
        expect(user.getRemainingLockoutTime()).toBe(0);
      });

      it("should return last failed login at", () => {
        user.recordFailedLoginAttempt(5, 600000);
        expect(user.getLastFailedLoginAt()).toBeInstanceOf(Date);
      });

      it("should return null for last failed login at when no failed attempts", () => {
        expect(user.getLastFailedLoginAt()).toBeNull();
      });
    });

    describe("Capability Queries", () => {
      it("should check if user has specific role", () => {
        expect(user.hasRole(UserRoleType.MEMBER)).toBe(true);
        expect(user.hasRole(UserRoleType.ADMIN)).toBe(false);

        const adminUser = createDefaultUser(mockUserId, mockEmail, mockHashedPassword, mockName, mockAddress, UserRoleType.ADMIN);
        expect(adminUser.hasRole(UserRoleType.ADMIN)).toBe(true);
      });

      it("should check if user is admin", () => {
        expect(user.isAdmin()).toBe(false);

        const adminUser = createDefaultUser(mockUserId, mockEmail, mockHashedPassword, mockName, mockAddress, UserRoleType.ADMIN);
        expect(adminUser.isAdmin()).toBe(true);
      });
    });
  });

  describe("Command Methods", () => {
    let user: User;

    beforeEach(() => {
      user = createDefaultUser();
      user.clearDomainEvents();
    });

    describe("Profile Management", () => {
      it("should update profile successfully", () => {
        const newName = "Jane Doe";
        const newAddress = "456 Oak St";

        const oldUpdatedAt = user.getUpdatedAt();
        user.updateProfile(newName, newAddress);

        expect(user.getName()).toBe(newName);
        expect(user.getAddress()).toBe(newAddress);
        expect(user.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserProfileUpdatedEvent);
        expect((events[0] as UserProfileUpdatedEvent).aggregateId).toBe(mockUserId);
      });

      it("should update profile without address", () => {
        const newName = "Jane Doe";
        const userWithoutAddress = createDefaultUser(mockUserId, mockEmail, mockHashedPassword, mockName, null);

        userWithoutAddress.updateProfile(newName);

        expect(userWithoutAddress.getName()).toBe(newName);
        expect(userWithoutAddress.getAddress()).toBeNull();
      });

      it("should not allow profile update when banned", () => {
        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        bannedUser.clearDomainEvents();

        expect(() => {
          bannedUser.updateProfile("New Name");
        }).toThrow(ProfileModificationNotAllowedException);
      });

      it("should not allow profile update when suspended", () => {
        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        suspendedUser.clearDomainEvents();

        expect(() => {
          suspendedUser.updateProfile("New Name");
        }).toThrow(ProfileModificationNotAllowedException);
      });

      it("should change email successfully", () => {
        const newEmail = "new@example.com";
        const oldUpdatedAt = user.getUpdatedAt();

        user.changeEmail(newEmail);

        expect(user.getEmail()).toBe(newEmail);
        expect(user.getEmailChangedAt()).toBeInstanceOf(Date);
        expect(user.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserEmailChangedEvent);
      });

      it("should not allow email change when banned", () => {
        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        bannedUser.clearDomainEvents();

        expect(() => {
          bannedUser.changeEmail("new@example.com");
        }).toThrow(ProfileModificationNotAllowedException);
      });

      it("should not allow email change when suspended", () => {
        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        suspendedUser.clearDomainEvents();

        expect(() => {
          suspendedUser.changeEmail("new@example.com");
        }).toThrow(ProfileModificationNotAllowedException);
      });

      it("should verify email successfully", () => {
        expect(user.isEmailVerified()).toBe(false);

        user.verifyEmail();

        expect(user.isEmailVerified()).toBe(true);
        expect(user.getEmailVerifiedAt()).toBeInstanceOf(Date);

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserEmailVerifiedEvent);
      });

      it("should throw error if email is already verified", () => {
        const verifiedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.ACTIVE,
          true,
        );
        verifiedUser.clearDomainEvents();

        expect(() => {
          verifiedUser.verifyEmail();
        }).toThrow(EmailAlreadyVerifiedException);
      });
    });

    describe("Password Management", () => {
      it("should change password successfully", () => {
        const newHashedPassword = "newHashedPassword123";
        const oldUpdatedAt = user.getUpdatedAt();

        user.changePassword(newHashedPassword, false);

        expect(user.getHashedPasswordForAuthentication()).toBe(newHashedPassword);
        expect(user.getPasswordChangedAt()).toBeInstanceOf(Date);
        expect(user.getFailedLoginAttempts()).toBe(0);
        expect(user.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserPasswordChangedEvent);
      });

      it("should change password and reset failed attempts", () => {
        const userWithFailedAttempts = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.ACTIVE,
          false,
          3,
        );
        userWithFailedAttempts.clearDomainEvents();

        userWithFailedAttempts.changePassword("newHashedPassword123", false);
        expect(userWithFailedAttempts.getFailedLoginAttempts()).toBe(0);
      });

      it("should throw error when password is same as current", () => {
        const newHashedPassword = "newHashedPassword123";
        expect(() => user.changePassword(newHashedPassword, true)).toThrow(PasswordUnchangedException);
      });
    });

    describe("Authentication", () => {
      it("should login successfully", () => {
        user.login();

        expect(user.getLastLoginAt()).toBeInstanceOf(Date);

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserLoggedInEvent);
      });

      it("should throw error when trying to login when suspended", () => {
        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        suspendedUser.clearDomainEvents();

        expect(() => suspendedUser.login()).toThrow(AuthenticationNotAllowedException);
        expect(suspendedUser.pullDomainEvents()).toHaveLength(0);
      });

      it("should throw error when trying to login when banned", () => {
        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        bannedUser.clearDomainEvents();

        expect(() => bannedUser.login()).toThrow(AuthenticationNotAllowedException);
        expect(bannedUser.pullDomainEvents()).toHaveLength(0);
      });

      it("should throw error when trying to login when inactive", () => {
        const inactiveUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.INACTIVE,
        );
        inactiveUser.clearDomainEvents();

        expect(() => inactiveUser.login()).toThrow(AuthenticationNotAllowedException);
        expect(inactiveUser.pullDomainEvents()).toHaveLength(0);
      });

      it("should throw error when trying to login when account locked", () => {
        const lockedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.ACTIVE,
          false,
          0,
          true,
        );
        lockedUser.clearDomainEvents();

        expect(() => lockedUser.login()).toThrow(AccountLockedException);
        expect(lockedUser.pullDomainEvents()).toHaveLength(0);
      });

      it("should logout successfully", () => {
        user.login();
        user.clearDomainEvents();

        user.logout();

        expect(user.getLastLogoutAt()).toBeInstanceOf(Date);

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserLoggedOutEvent);
      });

      it("should logout even if not logged in", () => {
        user.logout();
        expect(user.getLastLogoutAt()).toBeInstanceOf(Date);
        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserLoggedOutEvent);
      });

      it("should record failed login attempt", () => {
        const initialAttempts = user.getFailedLoginAttempts();

        user.recordFailedLoginAttempt(5, 600000);

        expect(user.getFailedLoginAttempts()).toBe(initialAttempts + 1);
        expect(user.getLastFailedLoginAt()).toBeInstanceOf(Date);
      });

      it("should lock account when max failed attempts reached", () => {
        for (let i = 0; i < 5; i++) {
          user.recordFailedLoginAttempt(5, 600000);
        }

        expect(user.isAccountLocked()).toBe(true);
        expect(user.getAccountLockedUntil()).toBeInstanceOf(Date);

        const events = user.pullDomainEvents();
        const lockEvents = events.filter((e) => e instanceof UserAccountLockedEvent);
        expect(lockEvents).toHaveLength(1);
      });

      it("should not emit lock event when account was already locked", () => {
        for (let i = 0; i < 5; i++) {
          user.recordFailedLoginAttempt(5, 600000);
        }
        user.clearDomainEvents();

        user.recordFailedLoginAttempt(5, 600000);

        const events = user.pullDomainEvents();
        const lockEvents = events.filter((e) => e instanceof UserAccountLockedEvent);
        expect(lockEvents).toHaveLength(0);
      });

      it("should respect custom max failed attempts and lockout duration", () => {
        const user = createDefaultUser();
        user.clearDomainEvents();

        for (let i = 0; i < 3; i++) {
          user.recordFailedLoginAttempt(3, 300000);
        }

        expect(user.isAccountLocked()).toBe(true);
        expect(user.getFailedLoginAttempts()).toBe(3);
        expect(user.getAccountLockedUntil()).toBeInstanceOf(Date);
      });

      it("should unlock account", () => {
        for (let i = 0; i < 5; i++) {
          user.recordFailedLoginAttempt(5, 600000);
        }
        expect(user.isAccountLocked()).toBe(true);
        user.clearDomainEvents();

        user.unlockAccount();

        expect(user.isAccountLocked()).toBe(false);
        expect(user.getFailedLoginAttempts()).toBe(0);

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserAccountUnlockedEvent);
      });

      it("should unlock account even if not locked", () => {
        user.unlockAccount();
        expect(user.isAccountLocked()).toBe(false);
        expect(user.getFailedLoginAttempts()).toBe(0);
        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserAccountUnlockedEvent);
      });
    });

    describe("Status Management", () => {
      it("should activate user successfully", () => {
        const inactiveUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.INACTIVE,
        );
        inactiveUser.clearDomainEvents();

        inactiveUser.activate();

        expect(inactiveUser.isActive()).toBe(true);
        expect(inactiveUser.getFailedLoginAttempts()).toBe(0);

        const events = inactiveUser.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserActivatedEvent);
      });

      it("should activate user and reset failed attempts", () => {
        const userWithFailedAttempts = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.INACTIVE,
          false,
          3,
        );
        userWithFailedAttempts.clearDomainEvents();

        userWithFailedAttempts.activate();
        expect(userWithFailedAttempts.getFailedLoginAttempts()).toBe(0);
      });

      it("should not throw error when activating active user (idempotent)", () => {
        user.clearDomainEvents();
        expect(() => user.activate()).not.toThrow();
        expect(user.isActive()).toBe(true);
        expect(user.pullDomainEvents()).toHaveLength(1);
      });

      it("should throw error when trying to activate banned user", () => {
        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        bannedUser.clearDomainEvents();

        expect(() => bannedUser.activate()).toThrow(UserActivationNotAllowedException);
        expect(bannedUser.pullDomainEvents()).toHaveLength(0);
      });

      it("should activate suspended user successfully", () => {
        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        suspendedUser.clearDomainEvents();

        suspendedUser.activate();
        expect(suspendedUser.isActive()).toBe(true);
        expect(suspendedUser.isSuspended()).toBe(false);

        const events = suspendedUser.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserActivatedEvent);
      });

      it("should deactivate user successfully", () => {
        user.deactivate();

        expect(user.isActive()).toBe(false);
        expect(user.isInactive()).toBe(true);

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserDeactivatedEvent);
      });

      it("should deactivate user even if already inactive", () => {
        const inactiveUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.INACTIVE,
        );
        inactiveUser.clearDomainEvents();

        inactiveUser.deactivate();
        expect(inactiveUser.isInactive()).toBe(true);
        const events = inactiveUser.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserDeactivatedEvent);
      });

      it("should suspend user successfully", () => {
        const reason = "Violation of terms";
        const oldUpdatedAt = user.getUpdatedAt();

        user.suspend(reason, adminUser);

        expect(user.isSuspended()).toBe(true);
        expect(user.getSuspendReason()).toBe(reason);
        expect(user.getSuspendedAt()).toBeInstanceOf(Date);
        expect(user.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserSuspendedEvent);
      });

      it("should throw error when suspending without reason", () => {
        expect(() => user.suspend("", adminUser)).toThrow(ActionReasonRequiredException);
      });

      it("should throw error when suspending with only whitespace reason", () => {
        expect(() => user.suspend("   ", adminUser)).toThrow(ActionReasonRequiredException);
      });

      it("should throw error when trying to self-suspend", () => {
        const reason = "Violation of terms";

        expect(() => user.suspend(reason, user)).toThrow(SelfActionNotAllowedException);
        expect(user.isSuspended()).toBe(false);
      });

      it("should throw error when suspending with null performer", () => {
        const reason = "Violation of terms";
        expect(() => user.suspend(reason, null as unknown as User)).toThrow();
      });

      it("should ban user successfully", () => {
        const reason = "Serious violation";
        const oldUpdatedAt = user.getUpdatedAt();

        user.ban(reason, adminUser);

        expect(user.isBanned()).toBe(true);
        expect(user.getBannedReason()).toBe(reason);
        expect(user.getBannedAt()).toBeInstanceOf(Date);
        expect(user.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserBannedEvent);
      });

      it("should throw error when banning without reason", () => {
        expect(() => user.ban("", adminUser)).toThrow(ActionReasonRequiredException);
      });

      it("should throw error when banning with only whitespace reason", () => {
        expect(() => user.ban("   ", adminUser)).toThrow(ActionReasonRequiredException);
      });

      it("should throw error when trying to self-ban", () => {
        const reason = "Serious violation";

        expect(() => user.ban(reason, user)).toThrow(SelfActionNotAllowedException);
        expect(user.isBanned()).toBe(false);
      });

      it("should throw error when banning with null performer", () => {
        const reason = "Serious violation";
        expect(() => user.ban(reason, null as unknown as User)).toThrow();
      });

      it("should throw error when trying to suspend a banned user", () => {
        const user = createDefaultUser();
        const adminUser = createDefaultUser("admin", "admin@example.com", "password", "Admin", null, UserRoleType.ADMIN, UserStatusType.ACTIVE);

        user.ban("Test ban", adminUser);
        expect(user.isBanned()).toBe(true);
        user.clearDomainEvents();

        expect(() => user.suspend("Test suspension", adminUser)).toThrow(InvalidStatusTransitionException);
        expect(user.isBanned()).toBe(true);
        expect(user.isSuspended()).toBe(false);
      });

      it("should ban suspended user (transition from suspended to banned)", () => {
        const user = createDefaultUser();
        const adminUser = createDefaultUser("admin", "admin@example.com", "password", "Admin", null, UserRoleType.ADMIN, UserStatusType.ACTIVE);

        user.suspend("Test suspension", adminUser);
        expect(user.isSuspended()).toBe(true);
        user.clearDomainEvents();

        user.ban("Test ban", adminUser);
        expect(user.isBanned()).toBe(true);
        expect(user.isSuspended()).toBe(false);
        expect(user.getBannedReason()).toBe("Test ban");
        expect(user.getSuspendedAt()).toBeNull();
        expect(user.getSuspendReason()).toBeNull();
      });

      it("should not allow suspend with empty reason when user is banned", () => {
        const user = createDefaultUser();
        const adminUser = createDefaultUser("admin", "admin@example.com", "password", "Admin", null, UserRoleType.ADMIN, UserStatusType.ACTIVE);

        user.ban("Test ban", adminUser);
        expect(() => user.suspend("", adminUser)).toThrow(ActionReasonRequiredException);
      });
    });

    describe("Role Management", () => {
      it("should assign new role successfully", () => {
        const newRole = UserRoleType.ADMIN;

        user.assignRole(newRole);

        expect(user.getRole()).toBe(newRole);

        const events = user.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserRoleChangedEvent);
      });

      it("should throw error when trying to assign same role", () => {
        expect(() => user.assignRole(UserRoleType.MEMBER)).toThrow(RoleAlreadyAssignedException);
        expect(user.pullDomainEvents()).toHaveLength(0);
      });

      it("should throw error when trying to change role of banned user", () => {
        const bannedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.BANNED,
        );
        bannedUser.clearDomainEvents();

        expect(() => bannedUser.assignRole(UserRoleType.ADMIN)).toThrow(RoleChangeNotAllowedException);
        expect(bannedUser.pullDomainEvents()).toHaveLength(0);
      });

      it("should throw error when trying to change role of suspended user", () => {
        const suspendedUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.SUSPENDED,
        );
        suspendedUser.clearDomainEvents();

        expect(() => suspendedUser.assignRole(UserRoleType.ADMIN)).toThrow(RoleChangeNotAllowedException);
        expect(suspendedUser.pullDomainEvents()).toHaveLength(0);
      });

      it("should allow role change for inactive user", () => {
        const inactiveUser = createDefaultUser(
          mockUserId,
          mockEmail,
          mockHashedPassword,
          mockName,
          mockAddress,
          UserRoleType.MEMBER,
          UserStatusType.INACTIVE,
        );
        inactiveUser.clearDomainEvents();

        inactiveUser.assignRole(UserRoleType.ADMIN);
        expect(inactiveUser.getRole()).toBe(UserRoleType.ADMIN);
        const events = inactiveUser.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserRoleChangedEvent);
      });

      it("should allow admin to change to member", () => {
        const adminUser = createDefaultUser(mockUserId, mockEmail, mockHashedPassword, mockName, mockAddress, UserRoleType.ADMIN);
        adminUser.clearDomainEvents();

        adminUser.assignRole(UserRoleType.MEMBER);
        expect(adminUser.getRole()).toBe(UserRoleType.MEMBER);
      });
    });
  });

  describe("Domain Events", () => {
    it("should emit multiple events in correct order", () => {
      const user = createDefaultUser();
      user.clearDomainEvents();

      user.changeEmail("new@example.com");
      user.verifyEmail();

      const events = user.pullDomainEvents();

      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(UserEmailChangedEvent);
      expect(events[1]).toBeInstanceOf(UserEmailVerifiedEvent);
    });

    it("should emit events when changes are made", () => {
      const user = createDefaultUser();
      user.clearDomainEvents();

      user.updateProfile("New Name");
      user.changePassword("newPassword", false);

      const events = user.pullDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(UserProfileUpdatedEvent);
      expect(events[1]).toBeInstanceOf(UserPasswordChangedEvent);
    });

    it("should clear domain events after pulling", () => {
      const user = createDefaultUser();
      user.clearDomainEvents();

      user.updateProfile("New Name");
      const events1 = user.pullDomainEvents();
      expect(events1).toHaveLength(1);

      const events2 = user.pullDomainEvents();
      expect(events2).toHaveLength(0);
    });
  });

  describe("Edge Cases and State Transitions", () => {
    it("should handle multiple state transitions", () => {
      const user = createDefaultUser();
      const adminUser = createDefaultUser("admin", "admin@example.com", "password", "Admin", null, UserRoleType.ADMIN, UserStatusType.ACTIVE);

      expect(user.isActive()).toBe(true);

      user.suspend("Test suspension", adminUser);
      expect(user.isSuspended()).toBe(true);
      expect(user.isActive()).toBe(false);
      expect(user.isBanned()).toBe(false);
      user.clearDomainEvents();

      expect(() => user.login()).toThrow(AuthenticationNotAllowedException);

      user.deactivate();
      expect(user.isInactive()).toBe(true);
      expect(user.isSuspended()).toBe(false);

      user.activate();
      expect(user.isActive()).toBe(true);
      expect(user.isSuspended()).toBe(false);

      user.login();
      expect(user.getLastLoginAt()).toBeInstanceOf(Date);
    });

    it("should handle failed login attempts and recovery", () => {
      const user = createDefaultUser();

      for (let i = 0; i < 5; i++) {
        user.recordFailedLoginAttempt(5, 600000);
      }

      expect(user.isAccountLocked()).toBe(true);
      expect(user.getFailedLoginAttempts()).toBe(5);

      user.unlockAccount();

      expect(user.isAccountLocked()).toBe(false);
      expect(user.getFailedLoginAttempts()).toBe(0);
    });

    it("should not allow banned user to modify profile or change email", () => {
      const bannedUser = createDefaultUser(
        mockUserId,
        mockEmail,
        mockHashedPassword,
        mockName,
        mockAddress,
        UserRoleType.MEMBER,
        UserStatusType.BANNED,
      );
      bannedUser.clearDomainEvents();

      expect(() => bannedUser.updateProfile("New Name")).toThrow(ProfileModificationNotAllowedException);
      expect(() => bannedUser.changeEmail("new@example.com")).toThrow(ProfileModificationNotAllowedException);
      expect(bannedUser.pullDomainEvents()).toHaveLength(0);
    });

    it("should allow login after account unlocked", () => {
      const user = createDefaultUser();

      for (let i = 0; i < 5; i++) {
        user.recordFailedLoginAttempt(5, 600000);
      }
      expect(() => user.login()).toThrow(AccountLockedException);

      user.unlockAccount();
      user.login();
      expect(user.getLastLoginAt()).toBeInstanceOf(Date);
    });

    it("should not allow suspended user to login", () => {
      const adminUser = createDefaultUser("admin", "admin@example.com", "password", "Admin", null, UserRoleType.ADMIN, UserStatusType.ACTIVE);
      const user = createDefaultUser();

      user.suspend("Test suspension", adminUser);
      expect(() => user.login()).toThrow(AuthenticationNotAllowedException);
    });

    it("should not allow banned user to login", () => {
      const adminUser = createDefaultUser("admin", "admin@example.com", "password", "Admin", null, UserRoleType.ADMIN, UserStatusType.ACTIVE);
      const user = createDefaultUser();

      user.ban("Test ban", adminUser);
      expect(() => user.login()).toThrow(AuthenticationNotAllowedException);
    });

    it("should not allow inactive user to login", () => {
      const user = createDefaultUser();
      user.deactivate();
      expect(() => user.login()).toThrow(AuthenticationNotAllowedException);
    });

    it("should maintain updatedAt when no changes made", () => {
      const user = createDefaultUser();
      const originalUpdatedAt = user.getUpdatedAt();

      expect(user.getUpdatedAt()).toEqual(originalUpdatedAt);
    });
  });

  describe("Error Scenarios", () => {
    it("should throw appropriate error when user cannot authenticate", () => {
      const suspendedUser = createDefaultUser(
        mockUserId,
        mockEmail,
        mockHashedPassword,
        mockName,
        mockAddress,
        UserRoleType.MEMBER,
        UserStatusType.SUSPENDED,
      );

      expect(() => suspendedUser.assertCanAuthenticate()).toThrow(AuthenticationNotAllowedException);
    });

    it("should throw appropriate error when account is locked", () => {
      const lockedUser = createDefaultUser(
        mockUserId,
        mockEmail,
        mockHashedPassword,
        mockName,
        mockAddress,
        UserRoleType.MEMBER,
        UserStatusType.ACTIVE,
        false,
        0,
        true,
      );

      expect(() => lockedUser.assertCanAuthenticate()).toThrow(AccountLockedException);
    });

    it("should throw appropriate error when user cannot be activated", () => {
      const bannedUser = createDefaultUser(
        mockUserId,
        mockEmail,
        mockHashedPassword,
        mockName,
        mockAddress,
        UserRoleType.MEMBER,
        UserStatusType.BANNED,
      );

      expect(() => bannedUser.assertCanBeActivated()).toThrow(UserActivationNotAllowedException);
    });

    it("should throw appropriate error when modifying banned user", () => {
      const bannedUser = createDefaultUser(
        mockUserId,
        mockEmail,
        mockHashedPassword,
        mockName,
        mockAddress,
        UserRoleType.MEMBER,
        UserStatusType.BANNED,
      );

      expect(() => bannedUser.assertCanModifyProfile()).toThrow(ProfileModificationNotAllowedException);
    });

    it("should throw appropriate error for self action", () => {
      const user = createDefaultUser();
      expect(() => user.assertNotSelfAction(user, "test")).toThrow(SelfActionNotAllowedException);
    });

    it("should not throw error when performer is different", () => {
      const user = createDefaultUser();
      const otherUser = createDefaultUser("other-id", "other@example.com", "password", "Other", null);
      expect(() => user.assertNotSelfAction(otherUser, "test")).not.toThrow();
    });
  });

  describe("Additional Coverage Scenarios", () => {
    it("should handle password expiration check", () => {
      const user = createDefaultUser();
      expect(user.isPasswordExpired()).toBe(false);
      expect(user.isPasswordExpired(90)).toBe(false);
    });

    it("should handle role assignment for different roles", () => {
      const user = createDefaultUser();

      user.assignRole(UserRoleType.ADMIN);
      expect(user.getRole()).toBe(UserRoleType.ADMIN);
      expect(user.isAdmin()).toBe(true);

      user.assignRole(UserRoleType.MEMBER);
      expect(user.getRole()).toBe(UserRoleType.MEMBER);
      expect(user.isAdmin()).toBe(false);
    });

    it("should throw error when trying to deactivate a banned user", () => {
      const bannedUser = createDefaultUser(
        mockUserId,
        mockEmail,
        mockHashedPassword,
        mockName,
        mockAddress,
        UserRoleType.MEMBER,
        UserStatusType.BANNED,
      );
      bannedUser.clearDomainEvents();

      expect(() => bannedUser.deactivate()).toThrow(InvalidStatusTransitionException);
      expect(bannedUser.isBanned()).toBe(true);
      expect(bannedUser.isInactive()).toBe(false);
      expect(bannedUser.pullDomainEvents()).toHaveLength(0);
    });

    it("should handle deactivation of suspended user", () => {
      const suspendedUser = createDefaultUser(
        mockUserId,
        mockEmail,
        mockHashedPassword,
        mockName,
        mockAddress,
        UserRoleType.MEMBER,
        UserStatusType.SUSPENDED,
      );
      suspendedUser.clearDomainEvents();

      suspendedUser.deactivate();
      expect(suspendedUser.isSuspended()).toBe(false);
      expect(suspendedUser.isInactive()).toBe(true);

      const events = suspendedUser.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserDeactivatedEvent);
    });

    it("should handle activation of inactive user with failed attempts", () => {
      const user = createDefaultUser(
        mockUserId,
        mockEmail,
        mockHashedPassword,
        mockName,
        mockAddress,
        UserRoleType.MEMBER,
        UserStatusType.INACTIVE,
        false,
        3,
      );
      user.clearDomainEvents();

      user.activate();
      expect(user.isActive()).toBe(true);
      expect(user.getFailedLoginAttempts()).toBe(0);
    });

    it("should handle login after password change", () => {
      const user = createDefaultUser();
      user.clearDomainEvents();

      user.changePassword("newPassword", false);
      user.login();

      expect(user.getLastLoginAt()).toBeInstanceOf(Date);
      expect(user.getPasswordChangedAt()).toBeInstanceOf(Date);
    });

    it("should handle multiple failed login attempts with custom parameters", () => {
      const user = createDefaultUser();
      user.clearDomainEvents();

      const maxAttempts = 3;
      const lockoutDuration = 300000;

      for (let i = 0; i < maxAttempts; i++) {
        user.recordFailedLoginAttempt(maxAttempts, lockoutDuration);
      }

      expect(user.isAccountLocked()).toBe(true);
      expect(user.getFailedLoginAttempts()).toBe(maxAttempts);
      expect(user.getRemainingLockoutTime()).toBeGreaterThan(0);
    });

    it("should handle account lockout expiration", () => {
      const user = createDefaultUser();

      for (let i = 0; i < 5; i++) {
        user.recordFailedLoginAttempt(5, 1);
      }

      expect(user.isAccountLocked()).toBe(true);

      jest.advanceTimersByTime(2);

      expect(user.getRemainingLockoutTime()).toBe(0);
    });
  });
});
