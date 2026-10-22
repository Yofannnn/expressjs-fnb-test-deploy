import { AggregateRoot } from "../common/aggregate-root";
import { UserEmail } from "../value-objects/user-email.vo";
import { UserPassword } from "../value-objects/user-password.vo";
import { UserProfile } from "../value-objects/user-profile.vo";
import { UserSecurity } from "../value-objects/user-security.vo";
import { UserStatus } from "../value-objects/user-status.vo";
import { UserCreationData, UserRebuildData, UserRoleType, UserStatusType } from "../types/user.type";
import {
  AccountLockedException,
  AuthenticationNotAllowedException,
  ProfileModificationNotAllowedException,
  RoleAlreadyAssignedException,
  RoleChangeNotAllowedException,
  SelfActionNotAllowedException,
  UserActivationNotAllowedException,
} from "../exceptions/user.exceptions";
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
} from "../events/user.events";

export class User extends AggregateRoot {
  constructor(
    private readonly id: string,
    private email: UserEmail,
    private password: UserPassword,
    private profile: UserProfile,
    private role: UserRoleType,
    private status: UserStatus,
    private security: UserSecurity,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  getId(): string {
    return this.id;
  }

  getEmail(): string {
    return this.email.getEmail();
  }

  getName(): string {
    return this.profile.getName();
  }

  getAddress(): string | null {
    return this.profile.getAddress();
  }

  getRole(): UserRoleType {
    return this.role;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  isEmailVerified(): boolean {
    return this.email.isVerified();
  }

  getEmailVerifiedAt(): Date | null {
    return this.email.getVerifiedAt();
  }

  getEmailChangedAt(): Date | null {
    return this.email.getChangedAt();
  }

  getPasswordChangedAt(): Date | null {
    return this.password.getChangedAt();
  }

  getStatus(): UserStatusType {
    return this.status.getStatus();
  }

  getSuspendedAt(): Date | null {
    return this.status.getSuspendedAt();
  }

  getSuspendReason(): string | null {
    return this.status.getSuspendReason();
  }

  getBannedAt(): Date | null {
    return this.status.getBannedAt();
  }

  getBannedReason(): string | null {
    return this.status.getBannedReason();
  }

  isAccountLocked(): boolean {
    return this.security.isLocked();
  }

  getFailedLoginAttempts(): number {
    return this.security.getFailedAttempts();
  }

  getAccountLockedUntil(): Date | null {
    return this.security.getAccountLockedUntil();
  }

  getLastFailedLoginAt(): Date | null {
    return this.security.getLastFailedLoginAt();
  }

  getLastLoginAt(): Date | null {
    return this.security.getLastLoginAt();
  }

  getLastLogoutAt(): Date | null {
    return this.security.getLastLogoutAt();
  }

  getRemainingLockoutTime(): number {
    return this.security.getRemainingLockoutTime();
  }

  getHashedPasswordForAuthentication(): string {
    return this.password.getHashedValue();
  }

  isActive(): boolean {
    return this.status.isActive();
  }

  isSuspended(): boolean {
    return this.status.isSuspended();
  }

  isBanned(): boolean {
    return this.status.isBanned();
  }

  isInactive(): boolean {
    return this.status.isInactive();
  }

  hasRole(role: UserRoleType): boolean {
    return this.role === role;
  }

  isPasswordExpired(maxPasswordAgeDays?: number): boolean {
    return this.password.isExpired(maxPasswordAgeDays);
  }

  isAdmin(): boolean {
    return this.role === UserRoleType.ADMIN;
  }

  updateProfile(name: string, address?: string): void {
    this.assertCanModifyProfile();

    this.profile = this.profile.update(name, address);

    this.emit(new UserProfileUpdatedEvent(this.id, name, address));
    this.touch();
  }

  changeEmail(newEmail: string): void {
    this.assertCanModifyProfile();

    this.email = this.email.changeTo(newEmail);

    this.emit(new UserEmailChangedEvent(this.id, newEmail, this.email.getChangedAt()!));
    this.touch();
  }

  verifyEmail(): void {
    this.email = this.email.verify();

    this.emit(new UserEmailVerifiedEvent(this.id, this.email.getEmail(), this.email.getVerifiedAt()!));
    this.touch();
  }

  changePassword(newHashedPassword: string, isSameAsCurrent: boolean): void {
    this.password = this.password.changeTo(newHashedPassword, isSameAsCurrent);
    this.security = this.security.resetFailedAttempts();

    this.emit(new UserPasswordChangedEvent(this.id, this.password.getChangedAt()!));
    this.touch();
  }

  login(): void {
    this.assertCanAuthenticate();

    this.security = this.security.recordSuccessfulLogin();

    this.emit(new UserLoggedInEvent(this.id, this.security.getLastLoginAt()!));
    this.touch();
  }

  logout(): void {
    this.security = this.security.recordLogout();

    this.emit(new UserLoggedOutEvent(this.id, this.security.getLastLogoutAt()!));
    this.touch();
  }

  recordFailedLoginAttempt(maxFailedAttempts?: number, lockoutDurationMs?: number): void {
    const wasLocked = this.security.isLocked();

    this.security = this.security.recordFailedLogin(maxFailedAttempts, lockoutDurationMs);

    if (!wasLocked && this.security.isLocked()) {
      this.emit(new UserAccountLockedEvent(this.id, this.security.getAccountLockedUntil()!, this.security.getFailedAttempts()));
    }

    this.touch();
  }

  unlockAccount(): void {
    this.security = this.security.resetFailedAttempts();

    this.emit(new UserAccountUnlockedEvent(this.id, this.email.getEmail()));
    this.touch();
  }

  activate(): void {
    this.assertCanBeActivated();

    this.status = this.status.activate();
    this.security = this.security.resetFailedAttempts();

    this.emit(new UserActivatedEvent(this.id));
    this.touch();
  }

  deactivate(): void {
    this.status = this.status.deactivate();

    this.emit(new UserDeactivatedEvent(this.id));
    this.touch();
  }

  suspend(reason: string, performedBy: User): void {
    this.assertNotSelfAction(performedBy, "suspend");

    this.status = this.status.suspend(reason);

    this.emit(new UserSuspendedEvent(this.id, reason, this.status.getSuspendedAt()!));
    this.touch();
  }

  ban(reason: string, performedBy: User): void {
    this.assertNotSelfAction(performedBy, "ban");

    this.status = this.status.ban(reason);

    this.emit(new UserBannedEvent(this.id, reason, this.status.getBannedAt()!));
    this.touch();
  }

  assignRole(newRole: UserRoleType): void {
    if (this.role === newRole) throw new RoleAlreadyAssignedException(this.role);
    this.assertCanChangeRole();

    const oldRole = this.role;
    this.role = newRole;

    this.emit(new UserRoleChangedEvent(this.id, oldRole, newRole));
    this.touch();
  }

  assertCanAuthenticate(): void {
    if (!this.isActive()) throw new AuthenticationNotAllowedException(this.getStatus());
    if (this.isAccountLocked()) throw new AccountLockedException(this.getAccountLockedUntil()!, this.getFailedLoginAttempts());
  }

  assertCanBeActivated(): void {
    if (!this.status.canBeActivated()) throw new UserActivationNotAllowedException(this.getStatus());
  }

  assertCanModifyProfile(): void {
    if (this.isSuspended() || this.isBanned()) throw new ProfileModificationNotAllowedException(this.getStatus());
  }

  assertCanChangeRole(): void {
    if (this.isSuspended() || this.isBanned()) throw new RoleChangeNotAllowedException(this.getStatus());
  }

  assertNotSelfAction(performedBy: User, action: string): void {
    if (this.id === performedBy.getId()) {
      throw new SelfActionNotAllowedException(action);
    }
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  static create(data: UserCreationData): User {
    const user = new User(
      data.id,
      UserEmail.create(data.email),
      UserPassword.create(data.hashedPassword),
      UserProfile.create(data.name, data.address),
      data.role || UserRoleType.MEMBER,
      UserStatus.create(),
      UserSecurity.create(),
      new Date(),
      new Date(),
    );

    user.emit(new UserCreatedEvent(user.id, data.email, data.name, user.createdAt));

    return user;
  }

  static rebuild(data: UserRebuildData): User {
    return new User(
      data.id,
      UserEmail.rebuild(data.email),
      UserPassword.rebuild(data.password),
      UserProfile.rebuild(data.profile),
      data.role,
      UserStatus.rebuild(data.status),
      UserSecurity.rebuild(data.security),
      data.createdAt,
      data.updatedAt,
    );
  }
}
