import { DomainEventType } from "../types/domain-event.type";
import { BaseDomainEvent } from "./base-domain.event";

export class SessionCreatedEvent extends BaseDomainEvent<{ userId: string }> {
  constructor(aggregateId: string, userId: string) {
    super(aggregateId, DomainEventType.SESSION_CREATED, { userId });
  }
}

export class SessionRevokedEvent extends BaseDomainEvent<{ userId: string; reason: string; revokedAt: Date }> {
  constructor(aggregateId: string, userId: string, reason: string, revokedAt: Date) {
    super(aggregateId, DomainEventType.SESSION_REVOKED, { userId, reason, revokedAt });
  }
}
