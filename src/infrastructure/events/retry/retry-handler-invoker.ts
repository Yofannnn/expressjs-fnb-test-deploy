import { DomainEvent } from "@/domain/types/domain-event.type";
import { EventHandlerRegistration } from "../registration/event-handler-registration.type";
import { HandlerRunner } from "../dispatch/handler-runner";
import { EventHandlerInvoker } from "./event-handler-invoker.type";
import { EnrichedDomainEvent } from "../core/event-processing.type";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";

export class RetryHandlerInvoker implements EventHandlerInvoker {
  constructor(
    private readonly registration: EventHandlerRegistration,
    private readonly getHandlerRunner: () => HandlerRunner,
    private readonly idGenerator: IdGeneratorPort,
  ) {}

  async invoke(handlerName: string, event: DomainEvent): Promise<void> {
    const normalized = this.registration.getNormalizedHandler(handlerName, event.eventType);
    if (!normalized) {
      throw new Error(`Handler '${handlerName}' not registered for event '${event.eventType}'`);
    }

    const enrichedEvent: EnrichedDomainEvent = {
      ...event,
      eventId: `retry-${this.idGenerator.generate()}`,
      processingMetadata: {
        processingId: `retry-${this.idGenerator.generate()}`,
        enqueuedAt: new Date(),
        retryCount: 1,
      },
    };

    await this.getHandlerRunner().run(normalized, enrichedEvent);
  }
}
