export enum UserActivityType {
  REGISTERED = "REGISTERED",
  LOGGED_IN = "LOGGED_IN",
  LOGGED_OUT = "LOGGED_OUT",
  PASSWORD_RESET = "PASSWORD_RESET",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  EMAIL_CHANGED = "EMAIL_CHANGED",
  VERIFICATION_EMAIL_RESENT = "VERIFICATION_EMAIL_RESENT",
  EMAIL_VERIFIED = "EMAIL_VERIFIED",
  PROFILE_UPDATED = "PROFILE_UPDATED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED",
  ROLE_CHANGED = "ROLE_CHANGED",
  ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED",
  ACCOUNT_BANNED = "ACCOUNT_BANNED",
  ACCOUNT_DEACTIVATED = "ACCOUNT_DEACTIVATED",
  ACCOUNT_ACTIVATED = "ACCOUNT_ACTIVATED",
  SESSION_REFRESHED = "SESSION_REFRESHED",
}

export interface UserActivityCreationData {
  userId: string;
  action: UserActivityType;
  description?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface UserActivityRebuildData {
  userId: string;
  action: UserActivityType;
  description: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: Date;
}

export interface UserEmailRebuildData {
  email: string;
  verifiedAt: Date | null;
  changedAt: Date | null;
}

export interface UserPasswordRebuildData {
  hashedPassword: string;
  changedAt: Date | null;
}

export interface UserProfileRebuildData {
  name: string;
  address: string | null;
}

export enum UserRoleType {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  CASHIER = "CASHIER",
  KITCHEN = "KITCHEN",
  BAR = "BAR",
  MEMBER = "MEMBER",
}

export interface UserSecurityRebuildData {
  failedLoginAttempts: number;
  accountLockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastLogoutAt: Date | null;
  lastFailedLoginAt: Date | null;
}

export enum UserStatusType {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  BANNED = "BANNED",
}

export interface UserStatusRebuildData {
  status: UserStatusType;
  suspendReason: string | null;
  bannedReason: string | null;
  suspendedAt: Date | null;
  bannedAt: Date | null;
}

export interface UserCreationData {
  id: string;
  name: string;
  email: string;
  hashedPassword: string;
  address?: string;
  role?: UserRoleType;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserRebuildData {
  id: string;
  profile: UserProfileRebuildData;
  email: UserEmailRebuildData;
  password: UserPasswordRebuildData;
  role: UserRoleType;
  security: UserSecurityRebuildData;
  status: UserStatusRebuildData;
  createdAt: Date;
  updatedAt: Date;
}
