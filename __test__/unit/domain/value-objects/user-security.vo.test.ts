import { UserSecurity } from "@/domain/value-objects/user-security.vo";

describe("UserSecurity", () => {
  describe("create", () => {
    it("should create a new UserSecurity instance with default values", () => {
      const userSecurity = UserSecurity.create();

      expect(userSecurity.getFailedAttempts()).toBe(0);
      expect(userSecurity.getAccountLockedUntil()).toBeNull();
      expect(userSecurity.getLastLoginAt()).toBeNull();
      expect(userSecurity.getLastLogoutAt()).toBeNull();
      expect(userSecurity.getLastFailedLoginAt()).toBeNull();
      expect(userSecurity.isLocked()).toBe(false);
      expect(userSecurity.getRemainingLockoutTime()).toBe(0);
      expect(userSecurity.shouldForcePasswordChange()).toBe(false);
    });
  });

  describe("rebuild", () => {
    it("should rebuild UserSecurity instance from data", () => {
      const now = new Date();
      const lockUntil = new Date(now.getTime() + 300000);
      const data = {
        failedLoginAttempts: 3,
        accountLockedUntil: lockUntil,
        lastLoginAt: now,
        lastLogoutAt: now,
        lastFailedLoginAt: now,
      };

      const userSecurity = UserSecurity.rebuild(data);

      expect(userSecurity.getFailedAttempts()).toBe(3);
      expect(userSecurity.getAccountLockedUntil()).toEqual(lockUntil);
      expect(userSecurity.getLastLoginAt()).toEqual(now);
      expect(userSecurity.getLastLogoutAt()).toEqual(now);
      expect(userSecurity.getLastFailedLoginAt()).toEqual(now);
    });

    it("should rebuild with null values", () => {
      const data = {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      };

      const userSecurity = UserSecurity.rebuild(data);

      expect(userSecurity.getFailedAttempts()).toBe(0);
      expect(userSecurity.getAccountLockedUntil()).toBeNull();
      expect(userSecurity.getLastLoginAt()).toBeNull();
      expect(userSecurity.getLastLogoutAt()).toBeNull();
      expect(userSecurity.getLastFailedLoginAt()).toBeNull();
    });
  });

  describe("recordFailedLogin", () => {
    it("should increment failed attempts and set last failed login time", () => {
      const userSecurity = UserSecurity.create();
      const newSecurity = userSecurity.recordFailedLogin();

      expect(newSecurity.getFailedAttempts()).toBe(1);
      expect(newSecurity.getLastFailedLoginAt()).toBeInstanceOf(Date);
      expect(newSecurity.isLocked()).toBe(false);
    });

    it("should lock account after reaching max failed attempts", () => {
      const userSecurity = UserSecurity.create();
      let newSecurity = userSecurity;

      for (let i = 0; i < 5; i++) {
        newSecurity = newSecurity.recordFailedLogin(5, 300000);
      }

      expect(newSecurity.getFailedAttempts()).toBe(5);
      expect(newSecurity.isLocked()).toBe(true);
      expect(newSecurity.getRemainingLockoutTime()).toBeGreaterThan(0);
    });

    it("should use custom max attempts and lockout duration", () => {
      const userSecurity = UserSecurity.create();
      let newSecurity = userSecurity;

      newSecurity = newSecurity.recordFailedLogin(3, 600000);
      newSecurity = newSecurity.recordFailedLogin(3, 600000);

      expect(newSecurity.getFailedAttempts()).toBe(2);
      expect(newSecurity.isLocked()).toBe(false);

      newSecurity = newSecurity.recordFailedLogin(3, 600000);

      expect(newSecurity.getFailedAttempts()).toBe(3);
      expect(newSecurity.isLocked()).toBe(true);
      expect(newSecurity.getRemainingLockoutTime()).toBeGreaterThan(590000);
    });

    it("should handle edge cases for max attempts and duration", () => {
      const userSecurity = UserSecurity.create();
      const newSecurity = userSecurity.recordFailedLogin(-1, 300000);

      expect(newSecurity.getFailedAttempts()).toBe(1);
    });
  });

  describe("recordSuccessfulLogin", () => {
    it("should reset failed attempts and set last login time", () => {
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 3,
        accountLockedUntil: null,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: new Date(),
      });

      const newSecurity = userSecurity.recordSuccessfulLogin();

      expect(newSecurity.getFailedAttempts()).toBe(0);
      expect(newSecurity.getLastLoginAt()).toBeInstanceOf(Date);
      expect(newSecurity.getLastFailedLoginAt()).toBeNull();
      expect(newSecurity.getAccountLockedUntil()).toBeNull();
      expect(newSecurity.isLocked()).toBe(false);
    });

    it("should preserve last logout time", () => {
      const lastLogout = new Date();
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLoginAt: null,
        lastLogoutAt: lastLogout,
        lastFailedLoginAt: null,
      });

      const newSecurity = userSecurity.recordSuccessfulLogin();

      expect(newSecurity.getLastLogoutAt()).toEqual(lastLogout);
    });
  });

  describe("recordLogout", () => {
    it("should set last logout time", () => {
      const userSecurity = UserSecurity.create();
      const newSecurity = userSecurity.recordLogout();

      expect(newSecurity.getLastLogoutAt()).toBeInstanceOf(Date);
      expect(newSecurity.getFailedAttempts()).toBe(0);
      expect(newSecurity.getLastLoginAt()).toBeNull();
    });

    it("should preserve other properties", () => {
      const lastLogin = new Date();
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 2,
        accountLockedUntil: null,
        lastLoginAt: lastLogin,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      });

      const newSecurity = userSecurity.recordLogout();

      expect(newSecurity.getFailedAttempts()).toBe(2);
      expect(newSecurity.getLastLoginAt()).toEqual(lastLogin);
      expect(newSecurity.getLastLogoutAt()).toBeInstanceOf(Date);
    });
  });

  describe("recordPasswordChange", () => {
    it("should reset security state", () => {
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 3,
        accountLockedUntil: new Date(Date.now() + 300000),
        lastLoginAt: new Date(),
        lastLogoutAt: null,
        lastFailedLoginAt: new Date(),
      });

      const newSecurity = userSecurity.recordPasswordChange();

      expect(newSecurity.getFailedAttempts()).toBe(0);
      expect(newSecurity.getAccountLockedUntil()).toBeNull();
      expect(newSecurity.getLastFailedLoginAt()).toBeNull();
      expect(newSecurity.getLastLogoutAt()).toBeNull();
      expect(newSecurity.getLastLoginAt()).toBeInstanceOf(Date);
    });
  });

  describe("resetFailedAttempts", () => {
    it("should reset failed attempts and related fields", () => {
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 3,
        accountLockedUntil: new Date(Date.now() + 300000),
        lastLoginAt: new Date(),
        lastLogoutAt: new Date(),
        lastFailedLoginAt: new Date(),
      });

      const newSecurity = userSecurity.resetFailedAttempts();

      expect(newSecurity.getFailedAttempts()).toBe(0);
      expect(newSecurity.getAccountLockedUntil()).toBeNull();
      expect(newSecurity.getLastFailedLoginAt()).toBeNull();
      expect(newSecurity.getLastLoginAt()).toBeInstanceOf(Date);
      expect(newSecurity.getLastLogoutAt()).toBeInstanceOf(Date);
    });
  });

  describe("isLocked", () => {
    it("should return true when account is locked", () => {
      const lockUntil = new Date(Date.now() + 300000);
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 5,
        accountLockedUntil: lockUntil,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      });

      expect(userSecurity.isLocked()).toBe(true);
    });

    it("should return false when lock time has expired", () => {
      const lockUntil = new Date(Date.now() - 1000);
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 5,
        accountLockedUntil: lockUntil,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      });

      expect(userSecurity.isLocked()).toBe(false);
    });

    it("should return false when no lock is set", () => {
      const userSecurity = UserSecurity.create();
      expect(userSecurity.isLocked()).toBe(false);
    });
  });

  describe("getRemainingLockoutTime", () => {
    it("should return remaining lockout time", () => {
      const lockDuration = 300000;
      const lockUntil = new Date(Date.now() + lockDuration);
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 5,
        accountLockedUntil: lockUntil,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      });

      const remaining = userSecurity.getRemainingLockoutTime();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(lockDuration);
    });

    it("should return 0 when no lock is set", () => {
      const userSecurity = UserSecurity.create();
      expect(userSecurity.getRemainingLockoutTime()).toBe(0);
    });

    it("should return 0 when lock time has expired", () => {
      const lockUntil = new Date(Date.now() - 1000);
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 5,
        accountLockedUntil: lockUntil,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      });

      expect(userSecurity.getRemainingLockoutTime()).toBe(0);
    });
  });

  describe("shouldForcePasswordChange", () => {
    it("should return true when there are failed attempts but account is not locked", () => {
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 3,
        accountLockedUntil: null,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      });

      expect(userSecurity.shouldForcePasswordChange()).toBe(true);
    });

    it("should return false when account is locked", () => {
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 5,
        accountLockedUntil: new Date(Date.now() + 300000),
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      });

      expect(userSecurity.shouldForcePasswordChange()).toBe(false);
    });

    it("should return false when no failed attempts", () => {
      const userSecurity = UserSecurity.create();
      expect(userSecurity.shouldForcePasswordChange()).toBe(false);
    });
  });

  describe("equals", () => {
    it("should return true for equal instances", () => {
      const date1 = new Date();
      const date2 = new Date();
      const security1 = UserSecurity.rebuild({
        failedLoginAttempts: 2,
        accountLockedUntil: date1,
        lastLoginAt: date2,
        lastLogoutAt: date1,
        lastFailedLoginAt: date2,
      });

      const security2 = UserSecurity.rebuild({
        failedLoginAttempts: 2,
        accountLockedUntil: date1,
        lastLoginAt: date2,
        lastLogoutAt: date1,
        lastFailedLoginAt: date2,
      });

      expect(security1.equals(security2)).toBe(true);
    });

    it("should return false for different instances", () => {
      const date1 = new Date();
      const date2 = new Date();
      const security1 = UserSecurity.rebuild({
        failedLoginAttempts: 2,
        accountLockedUntil: date1,
        lastLoginAt: date2,
        lastLogoutAt: date1,
        lastFailedLoginAt: date2,
      });

      const security2 = UserSecurity.rebuild({
        failedLoginAttempts: 3,
        accountLockedUntil: date1,
        lastLoginAt: date2,
        lastLogoutAt: date1,
        lastFailedLoginAt: date2,
      });

      expect(security1.equals(security2)).toBe(false);
    });

    it("should handle null dates correctly", () => {
      const security1 = UserSecurity.rebuild({
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      });

      const security2 = UserSecurity.rebuild({
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLoginAt: null,
        lastLogoutAt: null,
        lastFailedLoginAt: null,
      });

      expect(security1.equals(security2)).toBe(true);
    });
  });

  describe("getters", () => {
    it("should return cloned dates to prevent mutation", () => {
      const originalDate = new Date();
      const userSecurity = UserSecurity.rebuild({
        failedLoginAttempts: 0,
        accountLockedUntil: originalDate,
        lastLoginAt: originalDate,
        lastLogoutAt: originalDate,
        lastFailedLoginAt: originalDate,
      });

      const lockedUntil = userSecurity.getAccountLockedUntil();
      const lastLogin = userSecurity.getLastLoginAt();
      const lastLogout = userSecurity.getLastLogoutAt();
      const lastFailed = userSecurity.getLastFailedLoginAt();

      if (lockedUntil) lockedUntil.setTime(0);
      if (lastLogin) lastLogin.setTime(0);
      if (lastLogout) lastLogout.setTime(0);
      if (lastFailed) lastFailed.setTime(0);

      expect(userSecurity.getAccountLockedUntil()?.getTime()).toBe(originalDate.getTime());
      expect(userSecurity.getLastLoginAt()?.getTime()).toBe(originalDate.getTime());
      expect(userSecurity.getLastLogoutAt()?.getTime()).toBe(originalDate.getTime());
      expect(userSecurity.getLastFailedLoginAt()?.getTime()).toBe(originalDate.getTime());
    });
  });

  describe("immutability", () => {
    it("should return new instances for state changes", () => {
      const original = UserSecurity.create();

      const afterFailedLogin = original.recordFailedLogin();
      const afterSuccess = afterFailedLogin.recordSuccessfulLogin();
      const afterLogout = afterSuccess.recordLogout();

      expect(original).not.toBe(afterFailedLogin);
      expect(afterFailedLogin).not.toBe(afterSuccess);
      expect(afterSuccess).not.toBe(afterLogout);

      expect(original.getFailedAttempts()).toBe(0);
      expect(afterFailedLogin.getFailedAttempts()).toBe(1);
      expect(afterSuccess.getFailedAttempts()).toBe(0);
    });
  });
});
