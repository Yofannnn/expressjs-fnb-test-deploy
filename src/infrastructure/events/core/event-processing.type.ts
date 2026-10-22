import { EventExecutionStrategy } from "@/application/ports/driven/event-handler.port";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { NormalizedEventHandler } from "../registration/event-handler-registration.type";

export interface ProcessingMetadata {
  readonly processingId: string;
  readonly enqueuedAt: Date;
  readonly retryCount: number;
  readonly processedAt?: Date;
}

export type EnrichedDomainEvent<TEvent extends DomainEvent = DomainEvent> = TEvent & {
  readonly eventId: string;
  readonly processingMetadata: ProcessingMetadata;
};

export interface DispatchResult {
  strategy: EventExecutionStrategy;
  success: boolean;
  processedCount: number;
  error?: Error;
  fallbackUsed?: boolean;
}

export interface EventHandlerPair {
  event: EnrichedDomainEvent;
  handlers: NormalizedEventHandler[];
}

export type FailureStrategy = "throw" | "log" | "queue_fallback";

export interface EventStrategyExecutor {
  readonly requiresCircuitBreaker: boolean;
  readonly failureStrategy: FailureStrategy;
  execute(pairs: EventHandlerPair[]): Promise<void>;
}
