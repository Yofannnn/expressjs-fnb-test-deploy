import { DomainEvent, DomainEventType } from "@/domain/types/domain-event.type";

export enum EventExecutionStrategy {
  IMMEDIATE_CRITICAL = "IMMEDIATE_CRITICAL",
  IMMEDIATE_TOLERANT = "IMMEDIATE_TOLERANT",
  QUEUED_BATCH = "QUEUED_BATCH",
  DELAYED = "DELAYED",
}

export interface EventHandlerOptions {
  priority: number;
  strategy: EventExecutionStrategy;
  delayMs?: number;
  retryAttempts?: number;
  timeoutMs?: number;
}

export type Handler = (event: DomainEvent<unknown>) => Promise<void>;

export interface EventHandlerPort {
  readonly handlerName: string;
  readonly supportedEvents: Map<DomainEventType, EventHandlerOptions>;
  execute: Handler;
}
