import { UserSecurityRebuildData } from "../types/user.type";

export class UserSecurity {
  constructor(
    private readonly failedLoginAttempts: number,
    private readonly accountLockedUntil: Date | null,
    private readonly lastLoginAt: Date | null,
    private readonly lastLogoutAt: Date | null,
    private readonly lastFailedLoginAt: Date | null,
  ) {}

  recordFailedLogin(maxFailedAttempts?: number, lockoutDurationMs?: number): UserSecurity {
    if (!maxFailedAttempts || maxFailedAttempts <= 0) maxFailedAttempts = 5;
    if (!lockoutDurationMs || lockoutDurationMs <= 0) lockoutDurationMs = 300000;

    const newAttempts = this.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= maxFailedAttempts;
    return new UserSecurity(
      newAttempts,
      shouldLock ? new Date(Date.now() + lockoutDurationMs) : this.accountLockedUntil,
      this.lastLoginAt,
      this.lastLogoutAt,
      new Date(),
    );
  }

  recordSuccessfulLogin(): UserSecurity {
    return new UserSecurity(0, null, new Date(), this.lastLogoutAt, null);
  }

  recordLogout(): UserSecurity {
    return new UserSecurity(this.failedLoginAttempts, this.accountLockedUntil, this.lastLoginAt, new Date(), this.lastFailedLoginAt);
  }

  recordPasswordChange(): UserSecurity {
    return new UserSecurity(0, null, this.lastLoginAt, null, null);
  }

  resetFailedAttempts(): UserSecurity {
    return new UserSecurity(0, null, this.lastLoginAt, this.lastLogoutAt, null);
  }

  isLocked(): boolean {
    return !!this.accountLockedUntil && this.accountLockedUntil > new Date();
  }

  getRemainingLockoutTime(): number {
    if (!this.accountLockedUntil) return 0;
    return Math.max(0, this.accountLockedUntil.getTime() - Date.now());
  }

  shouldForcePasswordChange(): boolean {
    return this.failedLoginAttempts > 0 && !this.isLocked();
  }

  equals(other: UserSecurity): boolean {
    return (
      this.failedLoginAttempts === other.failedLoginAttempts &&
      this.accountLockedUntil?.getTime() === other.accountLockedUntil?.getTime() &&
      this.lastLoginAt?.getTime() === other.lastLoginAt?.getTime() &&
      this.lastLogoutAt?.getTime() === other.lastLogoutAt?.getTime() &&
      this.lastFailedLoginAt?.getTime() === other.lastFailedLoginAt?.getTime()
    );
  }

  getFailedAttempts(): number {
    return this.failedLoginAttempts;
  }

  getLastLoginAt(): Date | null {
    return this.cloneDate(this.lastLoginAt);
  }

  getLastLogoutAt(): Date | null {
    return this.cloneDate(this.lastLogoutAt);
  }

  getLastFailedLoginAt(): Date | null {
    return this.cloneDate(this.lastFailedLoginAt);
  }

  getAccountLockedUntil(): Date | null {
    return this.cloneDate(this.accountLockedUntil);
  }

  private cloneDate(date: Date | null): Date | null {
    return date ? new Date(date) : null;
  }

  static create(): UserSecurity {
    return new UserSecurity(0, null, null, null, null);
  }

  static rebuild(data: UserSecurityRebuildData): UserSecurity {
    return new UserSecurity(data.failedLoginAttempts, data.accountLockedUntil, data.lastLoginAt, data.lastLogoutAt, data.lastFailedLoginAt);
  }
}
