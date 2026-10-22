import { DeadLetterQueueReaderPort } from "@/application/ports/driven/dead-letter-queue-reader.port";
import { DomainEvent } from "@/domain/types/domain-event.type";

export interface DeadLetterQueue extends DeadLetterQueueReaderPort {
  addFailedEvent(handlerName: string, event: DomainEvent, eventId: string, processingId: string, error: unknown, occurredAt: Date): Promise<void>;
  retryEvent(eventId: string): Promise<void>;
  retryEventsByType(eventType: string): Promise<{ successful: number; failed: number }>;
  deleteEvent(eventId: string): Promise<void>;
  cleanupOldEvents(olderThanDays: number): Promise<number>;
}
