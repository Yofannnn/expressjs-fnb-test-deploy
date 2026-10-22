import { DomainEventType } from "@/domain/types/domain-event.type";
import { EventHandlerPort, EventHandlerOptions, Handler } from "@/application/ports/driven/event-handler.port";

export interface NormalizedEventHandler {
  readonly eventType: DomainEventType;
  readonly handlerName: string;
  readonly options: EventHandlerOptions;
  handler: Handler;
  readonly registeredAt: Date;
}

export interface EventHandlerRegistration {
  readonly handlers: Map<DomainEventType, NormalizedEventHandler[]>;
  registerHandler(handler: EventHandlerPort): void;
  getHandlersForEvent(eventType: DomainEventType): NormalizedEventHandler[];
  getNormalizedHandler(handlerName: string, eventType: DomainEventType): NormalizedEventHandler | undefined;
  getHandlerByName(handlerName: string): EventHandlerPort | undefined;
  unregisterHandler(handlerName: string): boolean;
  isHandlerRegistered(handlerName: string): boolean;
}
