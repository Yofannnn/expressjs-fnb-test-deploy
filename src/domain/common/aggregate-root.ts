import { DomainEvent } from "../types/domain-event.type";

export abstract class AggregateRoot {
  protected domainEvents: DomainEvent[] = [];

  protected emit<T extends DomainEvent>(event: T): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  hasDomainEvents(): boolean {
    return this.domainEvents.length > 0;
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}
