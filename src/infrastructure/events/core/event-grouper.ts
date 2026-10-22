import { LoggerPort } from "@/application/ports/driven/logger.port";
import { EventExecutionStrategy } from "@/application/ports/driven/event-handler.port";
import { EventHandlerRegistration } from "../registration/event-handler-registration.type";
import { EnrichedDomainEvent, EventHandlerPair } from "./event-processing.type";

type GroupedEvents = Record<EventExecutionStrategy, EventHandlerPair[]>;

export class EventGrouper {
  constructor(
    private readonly eventHandlerRegistration: EventHandlerRegistration,
    private readonly logger: LoggerPort,
  ) {}

  group(events: EnrichedDomainEvent[]): GroupedEvents {
    const grouped: GroupedEvents = {
      [EventExecutionStrategy.IMMEDIATE_CRITICAL]: [],
      [EventExecutionStrategy.IMMEDIATE_TOLERANT]: [],
      [EventExecutionStrategy.QUEUED_BATCH]: [],
      [EventExecutionStrategy.DELAYED]: [],
    };

    for (const event of events) {
      const handlers = this.eventHandlerRegistration.handlers.get(event.eventType) || [];

      if (!handlers.length) {
        /* TODO:
           No handler requirement has been established yet.
           Keep this informational until specific events are expected to have handlers.
        */
        this.logger.debug({
          context: "EventGrouper",
          event: "NO_HANDLERS_REGISTERED",
          message: `No handlers registered for event: ${event.eventType}`,
        });
        continue;
      }

      for (const strategy of Object.values(EventExecutionStrategy)) {
        const matching = handlers.filter((h) => h.options.strategy === strategy);
        if (matching.length) {
          grouped[strategy].push({ event, handlers: matching });
        }
      }
    }

    return grouped;
  }
}
