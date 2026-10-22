import { DomainEventType } from "../types/domain-event.type";
import { BaseDomainEvent } from "./base-domain.event";

export class VerificationEmailTokenIssuedEvent extends BaseDomainEvent<{
  userId: string;
  rawToken: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
}> {
  constructor(aggregateId: string, userId: string, rawToken: string, email: string, expiresAt: Date, createdAt: Date) {
    super(aggregateId, DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED, { userId, rawToken, email, expiresAt, createdAt });
  }
}

export class VerificationEmailTokenReissuedEvent extends BaseDomainEvent<{
  userId: string;
  rawToken: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
}> {
  constructor(aggregateId: string, userId: string, rawToken: string, email: string, expiresAt: Date, createdAt: Date) {
    super(aggregateId, DomainEventType.VERIFICATION_EMAIL_TOKEN_REISSUED, {
      userId,
      rawToken,
      email,
      expiresAt,
      createdAt,
    });
  }
}

export class VerificationEmailTokenUsedEvent extends BaseDomainEvent<{
  userId: string;
  email: string;
  usedAt: Date;
}> {
  constructor(aggregateId: string, userId: string, email: string, usedAt: Date) {
    super(aggregateId, DomainEventType.VERIFICATION_EMAIL_TOKEN_USED, { userId, email, usedAt });
  }
}

export class PasswordResetTokenIssuedEvent extends BaseDomainEvent<{
  userId: string;
  rawToken: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
}> {
  constructor(aggregateId: string, userId: string, rawToken: string, email: string, expiresAt: Date, createdAt: Date) {
    super(aggregateId, DomainEventType.PASSWORD_RESET_TOKEN_ISSUED, { userId, rawToken, email, expiresAt, createdAt });
  }
}

export class PasswordResetTokenUsedEvent extends BaseDomainEvent<{
  userId: string;
  email: string;
  usedAt: Date;
}> {
  constructor(aggregateId: string, userId: string, email: string, usedAt: Date) {
    super(aggregateId, DomainEventType.PASSWORD_RESET_TOKEN_USED, { userId, email, usedAt });
  }
}

export class GuestOrderManagementTokenIssuedEvent extends BaseDomainEvent<{
  rawToken: string;
  email: string;
  orderId: string;
  expiresAt: Date;
  createdAt: Date;
}> {
  constructor(aggregateId: string, rawToken: string, email: string, orderId: string, expiresAt: Date, createdAt: Date) {
    super(aggregateId, DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED, { rawToken, orderId, email, expiresAt, createdAt });
  }
}

export class GuestOrderManagementTokenReissuedEvent extends BaseDomainEvent<{
  rawToken: string;
  email: string;
  orderId: string;
  expiresAt: Date;
  createdAt: Date;
}> {
  constructor(aggregateId: string, rawToken: string, email: string, orderId: string, expiresAt: Date, createdAt: Date) {
    super(aggregateId, DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_REISSUED, { rawToken, email, orderId, expiresAt, createdAt });
  }
}
