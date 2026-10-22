import { DomainEvent, DomainEventType } from "@/domain/types/domain-event.type";

export interface DeadLetterEvent {
  id: string;
  eventType: string;
  eventData: DomainEvent;
  handlerName: string;
  error: string;
  attempts: number;
  failedAt: Date;
  correlationId?: string;
  canRetry: boolean;
}

export interface DeadLetterQueueReaderPort {
  getFailedEvents(limit?: number, offset?: number): Promise<DeadLetterEvent[]>;
  getFailedEventsByType(eventType: DomainEventType, limit?: number): Promise<DeadLetterEvent[]>;
  getFailedEventsCount(): Promise<number>;
}
