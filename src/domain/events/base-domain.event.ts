import { DomainEvent, DomainEventType } from "../types/domain-event.type";

export abstract class BaseDomainEvent<TPayload> implements DomainEvent<TPayload> {
  readonly occurredOn = new Date();
  readonly version: number = 1;

  constructor(
    readonly aggregateId: string,
    readonly eventType: DomainEventType,
    readonly payload: TPayload,
  ) {}
}
