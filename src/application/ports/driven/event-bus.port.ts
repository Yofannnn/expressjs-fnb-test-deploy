import { DomainEvent } from "@/domain/types/domain-event.type";

export interface EventBusPort {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
