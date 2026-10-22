import { EventHandlerOptions } from "@/application/ports/driven/event-handler.port";
import { EnrichedDomainEvent } from "../core/event-processing.type";

export interface QueuedEvent {
  event: EnrichedDomainEvent;
  handlerOptions: EventHandlerOptions;
  handlerName: string;
  enqueuedAt: Date;
}

export interface EventQueue {
  enqueue(enqueuedEvents: QueuedEvent[]): Promise<void>;
  enqueueDelayed(enqueuedEvent: QueuedEvent, delayMs: number): Promise<void>;
  dequeue(batchSize?: number): Promise<QueuedEvent[]>;
  peek(count: number): Promise<QueuedEvent[]>;
  hasEvents(): Promise<boolean>;
  getQueueSize(): Promise<number>;
  getMainQueueSize(): Promise<number>;
  getDelayedQueueSize(): Promise<number>;
  clear(): Promise<void>;
  isQueueHealthy(): Promise<boolean>;
}
