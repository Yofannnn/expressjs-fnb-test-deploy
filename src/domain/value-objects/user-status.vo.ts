import { UserStatusRebuildData, UserStatusType } from "../types/user.type";
import { ActionReasonRequiredException, InvalidStatusTransitionException } from "../exceptions/user.exceptions";

export class UserStatus {
  constructor(
    private readonly status: UserStatusType,
    private readonly suspendReason: string | null,
    private readonly bannedReason: string | null,
    private readonly suspendedAt: Date | null,
    private readonly bannedAt: Date | null,
  ) {}

  suspend(reason: string): UserStatus {
    if (!reason || reason.trim().length === 0) throw new ActionReasonRequiredException("suspend");
    if (this.status === UserStatusType.BANNED)
      throw new InvalidStatusTransitionException("suspend", "banned").withDetails({ suspendReason: reason, bannedReason: this.bannedReason });

    return new UserStatus(UserStatusType.SUSPENDED, reason, null, new Date(), null);
  }

  ban(reason: string): UserStatus {
    if (!reason || reason.trim().length === 0) throw new ActionReasonRequiredException("ban");
    return new UserStatus(UserStatusType.BANNED, null, reason, null, new Date());
  }

  deactivate(): UserStatus {
    if (this.status === UserStatusType.BANNED)
      throw new InvalidStatusTransitionException("deactivate", "banned").withDetails({ bannedReason: this.bannedReason });

    return new UserStatus(UserStatusType.INACTIVE, this.suspendReason, this.bannedReason, this.suspendedAt, this.bannedAt);
  }

  activate(): UserStatus {
    return new UserStatus(UserStatusType.ACTIVE, null, null, null, null);
  }

  isActive(): boolean {
    return this.status === UserStatusType.ACTIVE;
  }

  isSuspended(): boolean {
    return this.status === UserStatusType.SUSPENDED;
  }

  isBanned(): boolean {
    return this.status === UserStatusType.BANNED;
  }

  isInactive(): boolean {
    return this.status === UserStatusType.INACTIVE;
  }

  canBeActivated(): boolean {
    return this.status !== UserStatusType.BANNED;
  }

  getStatus(): UserStatusType {
    return this.status;
  }

  getSuspendReason(): string | null {
    return this.suspendReason;
  }

  getBannedReason(): string | null {
    return this.bannedReason;
  }

  getSuspendedAt(): Date | null {
    return this.suspendedAt ? new Date(this.suspendedAt) : null;
  }

  getBannedAt(): Date | null {
    return this.bannedAt ? new Date(this.bannedAt) : null;
  }

  equals(other: UserStatus): boolean {
    return (
      this.status === other.status &&
      this.suspendReason === other.suspendReason &&
      this.bannedReason === other.bannedReason &&
      this.suspendedAt?.getTime() === other.suspendedAt?.getTime() &&
      this.bannedAt?.getTime() === other.bannedAt?.getTime()
    );
  }

  static create(): UserStatus {
    return new UserStatus(UserStatusType.ACTIVE, null, null, null, null);
  }

  static rebuild(data: UserStatusRebuildData): UserStatus {
    return new UserStatus(data.status, data.suspendReason, data.bannedReason, data.suspendedAt, data.bannedAt);
  }
}
