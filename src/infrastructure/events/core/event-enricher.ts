import { DomainEvent } from "@/domain/types/domain-event.type";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { EnrichedDomainEvent } from "./event-processing.type";

export class EventEnricher {
  constructor(private readonly idGenerator: IdGeneratorPort) {}

  enrich(event: DomainEvent): EnrichedDomainEvent {
    return {
      ...event,
      eventId: this.idGenerator.generate(),
      processingMetadata: {
        enqueuedAt: new Date(),
        processingId: this.idGenerator.generate(),
        retryCount: 0,
      },
    } as EnrichedDomainEvent;
  }

  enrichAll(events: DomainEvent[]): EnrichedDomainEvent[] {
    return events.map((event) => this.enrich(event));
  }
}
