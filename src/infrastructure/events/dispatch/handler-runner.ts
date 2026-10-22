import { LoggerPort } from "@/application/ports/driven/logger.port";
import { NormalizedEventHandler } from "../registration/event-handler-registration.type";
import { EnrichedDomainEvent } from "../core/event-processing.type";
import { DeadLetterQueue } from "../core/dead-letter-queue.type";

export class HandlerRunner {
  constructor(
    private readonly deadLetterQueue: DeadLetterQueue,
    private readonly logger: LoggerPort,
  ) {}

  async run(registration: NormalizedEventHandler, event: EnrichedDomainEvent): Promise<void> {
    const maxAttempts = registration.options.retryAttempts || 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.runWithTimeout(registration, event);
        return;
      } catch (error) {
        lastError = error;

        this.logger.warn({
          context: "HandlerRunner",
          event: "HANDLER_RETRY",
          message: `Handler attempt ${attempt}/${maxAttempts} failed`,
          data: {
            error: error instanceof Error ? error.message : error,
            handlerName: registration.handlerName,
            eventType: event.eventType,
          },
        });

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    await this.deadLetterQueue.addFailedEvent(
      registration.handlerName,
      event,
      event.eventId,
      event.processingMetadata.processingId,
      lastError,
      new Date(),
    );

    throw lastError;
  }

  private async runWithTimeout(registration: NormalizedEventHandler, event: EnrichedDomainEvent): Promise<void> {
    const timeoutMs = registration.options.timeoutMs ?? 30000;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        registration.handler({
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.payload,
          occurredOn: event.occurredOn,
          version: event.version,
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Handler timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
