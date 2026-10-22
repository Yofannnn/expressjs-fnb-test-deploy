import { BaseDomainEvent } from "./base-domain.event";
import { DomainEventType } from "../types/domain-event.type";
import { UserRoleType } from "../types/user.type";

export class UserCreatedEvent extends BaseDomainEvent<{ email: string; name: string; createdAt: Date }> {
  constructor(aggregateId: string, email: string, name: string, createdAt: Date) {
    super(aggregateId, DomainEventType.USER_CREATED, { email, name, createdAt });
  }
}

export class UserLoggedInEvent extends BaseDomainEvent<{ loginAt: Date }> {
  constructor(aggregateId: string, loginAt: Date) {
    super(aggregateId, DomainEventType.USER_LOGGED_IN, { loginAt });
  }
}

export class UserLoggedOutEvent extends BaseDomainEvent<{ logoutAt: Date }> {
  constructor(aggregateId: string, logoutAt: Date) {
    super(aggregateId, DomainEventType.USER_LOGGED_OUT, { logoutAt });
  }
}

export class UserAccountLockedEvent extends BaseDomainEvent<{ lockedUntil: Date; failedAttempts: number }> {
  constructor(aggregateId: string, lockedUntil: Date, failedAttempts: number) {
    super(aggregateId, DomainEventType.USER_ACCOUNT_LOCKED, { lockedUntil, failedAttempts });
  }
}

export class UserAccountUnlockedEvent extends BaseDomainEvent<{ email: string }> {
  constructor(aggregateId: string, email: string) {
    super(aggregateId, DomainEventType.USER_ACCOUNT_UNLOCKED, { email });
  }
}

export class UserActivatedEvent extends BaseDomainEvent<{ activatedAt: Date }> {
  constructor(aggregateId: string) {
    super(aggregateId, DomainEventType.USER_ACTIVATED, { activatedAt: new Date() });
  }
}

export class UserSuspendedEvent extends BaseDomainEvent<{ reason: string; suspendedAt: Date }> {
  constructor(aggregateId: string, reason: string, suspendedAt: Date) {
    super(aggregateId, DomainEventType.USER_SUSPENDED, { reason, suspendedAt });
  }
}

export class UserBannedEvent extends BaseDomainEvent<{ reason: string; bannedAt: Date }> {
  constructor(aggregateId: string, reason: string, bannedAt: Date) {
    super(aggregateId, DomainEventType.USER_BANNED, { reason, bannedAt });
  }
}

export class UserDeactivatedEvent extends BaseDomainEvent<{ deactivatedAt: Date }> {
  constructor(aggregateId: string) {
    super(aggregateId, DomainEventType.USER_DEACTIVATED, { deactivatedAt: new Date() });
  }
}

export class UserEmailVerifiedEvent extends BaseDomainEvent<{ email: string; verifiedAt: Date }> {
  constructor(aggregateId: string, email: string, verifiedAt: Date) {
    super(aggregateId, DomainEventType.USER_EMAIL_VERIFIED, { email, verifiedAt });
  }
}

export class UserProfileUpdatedEvent extends BaseDomainEvent<{ name: string; address?: string }> {
  constructor(aggregateId: string, name: string, address?: string) {
    super(aggregateId, DomainEventType.USER_PROFILE_UPDATED, { name, address });
  }
}

export class UserEmailChangedEvent extends BaseDomainEvent<{ email: string; changedAt: Date }> {
  constructor(aggregateId: string, email: string, changedAt: Date) {
    super(aggregateId, DomainEventType.USER_EMAIL_CHANGED, { email, changedAt });
  }
}

export class UserPasswordChangedEvent extends BaseDomainEvent<{ changedAt: Date }> {
  constructor(aggregateId: string, changedAt: Date) {
    super(aggregateId, DomainEventType.USER_PASSWORD_CHANGED, { changedAt });
  }
}

export class UserRoleChangedEvent extends BaseDomainEvent<{ oldRole: UserRoleType; newRole: UserRoleType }> {
  constructor(aggregateId: string, oldRole: UserRoleType, newRole: UserRoleType) {
    super(aggregateId, DomainEventType.USER_ROLE_CHANGED, { oldRole, newRole });
  }
}
