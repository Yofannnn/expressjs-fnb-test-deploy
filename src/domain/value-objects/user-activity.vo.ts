import { UserActivityCreationData, UserActivityRebuildData, UserActivityType } from "../types/user.type";

export class UserActivity {
  private static readonly SECURITY_ACTIONS = new Set([
    UserActivityType.LOGGED_IN,
    UserActivityType.PASSWORD_CHANGED,
    UserActivityType.PASSWORD_RESET,
    UserActivityType.ACCOUNT_LOCKED,
    UserActivityType.ACCOUNT_SUSPENDED,
    UserActivityType.ACCOUNT_BANNED,
    UserActivityType.EMAIL_VERIFIED,
  ]);

  private static readonly AUTHENTICATION_ACTIONS = new Set([
    UserActivityType.LOGGED_IN,
    UserActivityType.LOGGED_OUT,
    UserActivityType.SESSION_REFRESHED,
  ]);

  private static readonly SUCCESS_ACTIONS = new Set([
    UserActivityType.LOGGED_IN,
    UserActivityType.PASSWORD_CHANGED,
    UserActivityType.EMAIL_VERIFIED,
    UserActivityType.PROFILE_UPDATED,
  ]);

  private static readonly FAILURE_ACTIONS = new Set([
    UserActivityType.ACCOUNT_LOCKED,
    UserActivityType.ACCOUNT_SUSPENDED,
    UserActivityType.ACCOUNT_BANNED,
  ]);

  constructor(
    private readonly userId: string,
    private readonly action: UserActivityType,
    private readonly description: string | null,
    private readonly userAgent: string | null,
    private readonly ipAddress: string | null,
    private readonly metadata: Record<string, unknown> | null,
    private readonly occurredAt: Date,
  ) {}

  getUserId(): string {
    return this.userId;
  }

  getAction(): UserActivityType {
    return this.action;
  }

  getDescription(): string | null {
    return this.description;
  }

  getUserAgent(): string | null {
    return this.userAgent;
  }

  getIpAddress(): string | null {
    return this.ipAddress;
  }

  getMetadata(): Record<string, unknown> | null {
    return this.metadata;
  }

  getOccurredAt(): Date {
    return new Date(this.occurredAt);
  }

  isSecurityRelated(): boolean {
    return UserActivity.SECURITY_ACTIONS.has(this.action);
  }

  isAuthenticationRelated(): boolean {
    return UserActivity.AUTHENTICATION_ACTIONS.has(this.action);
  }

  isFailureActivity(): boolean {
    return UserActivity.FAILURE_ACTIONS.has(this.action);
  }

  isSuccessActivity(): boolean {
    return UserActivity.SUCCESS_ACTIONS.has(this.action);
  }

  hasMetadata(): boolean {
    return !!this.metadata && Object.keys(this.metadata).length > 0;
  }

  hasNetworkInfo(): boolean {
    return !!this.ipAddress || !!this.userAgent;
  }

  occurredWithin(durationMs: number): boolean {
    const now = Date.now();
    const activityTime = this.occurredAt.getTime();
    return now - activityTime <= durationMs;
  }

  occurredOnDate(date: Date): boolean {
    const activityDate = new Date(this.occurredAt.getFullYear(), this.occurredAt.getMonth(), this.occurredAt.getDate());
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return activityDate.getTime() === checkDate.getTime();
  }

  equals(other: UserActivity): boolean {
    if (!(other instanceof UserActivity)) return false;

    return (
      this.userId === other.userId &&
      this.action === other.action &&
      this.description === other.description &&
      this.userAgent === other.userAgent &&
      this.ipAddress === other.ipAddress &&
      this.occurredAt.getTime() === other.occurredAt.getTime() &&
      this.metadataEquals(other.metadata)
    );
  }

  private metadataEquals(otherMetadata: Record<string, unknown> | null): boolean {
    if (this.metadata === null && otherMetadata === null) return true;
    if (this.metadata === null || otherMetadata === null) return false;

    return JSON.stringify(this.metadata) === JSON.stringify(otherMetadata);
  }

  static create(data: UserActivityCreationData): UserActivity {
    return new UserActivity(
      data.userId,
      data.action,
      data.description || null,
      data.userAgent || null,
      data.ipAddress || null,
      data.metadata || null,
      data.occurredAt || new Date(),
    );
  }

  static rebuild(data: UserActivityRebuildData): UserActivity {
    return new UserActivity(data.userId, data.action, data.description, data.userAgent, data.ipAddress, data.metadata, data.occurredAt);
  }
}
