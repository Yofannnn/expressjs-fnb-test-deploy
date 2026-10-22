import { DomainEvent, DomainEventType } from "@/domain/types/domain-event.type";
import { EventHandlerPort, EventHandlerOptions } from "@/application/ports/driven/event-handler.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";

export abstract class BaseEventHandler implements EventHandlerPort {
  abstract readonly handlerName: string;
  abstract readonly supportedEvents: Map<DomainEventType, EventHandlerOptions>;

  constructor(protected readonly logger: LoggerPort) {}

  protected abstract handle(event: DomainEvent<unknown>): Promise<void>;

  async execute(event: DomainEvent<unknown>): Promise<void> {
    const start = Date.now();

    this.logStart(event);

    try {
      await this.handle(event);
      this.logSuccess(event, start);
    } catch (error) {
      this.logError(event, error);
      throw error;
    }
  }

  private logStart<T>(event: DomainEvent<T>) {
    this.logger.debug({
      context: "BaseEventHandler",
      event: event.eventType,
      message: "Event handler start",
      data: { occurredOn: event.occurredOn },
    });
  }
  private logSuccess<T>(event: DomainEvent<T>, start: number) {
    this.logger.info({
      context: "BaseEventHandler",
      event: event.eventType,
      message: "Event handler finish",
      durationMs: Date.now() - start,
      data: { occurredOn: event.occurredOn },
    });
  }
  private logError<T>(event: DomainEvent<T>, error: unknown) {
    this.logger.error({
      context: "BaseEventHandler",
      event: event.eventType,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      data: { occurredOn: event.occurredOn },
    });
  }
}
