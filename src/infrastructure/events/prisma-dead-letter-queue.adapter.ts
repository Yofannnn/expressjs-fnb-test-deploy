import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PrismaDatabaseClient } from "../database/prisma-database-client";
import { DeadLetterEvent } from "@/application/ports/driven/dead-letter-queue-reader.port";
import { DomainEvent, DomainEventType } from "@/domain/types/domain-event.type";
import { DeadLetterEvent as PrismaDeadLetterEvent } from "../../../prisma/generated";
import { EventHandlerInvoker } from "./retry/event-handler-invoker.type";
import { DeadLetterQueue } from "./core/dead-letter-queue.type";

export class PrismaDeadLetterQueueAdapter implements DeadLetterQueue {
  constructor(
    private readonly database: PrismaDatabaseClient,
    private readonly handlerInvoker: EventHandlerInvoker,
    private readonly logger: LoggerPort,
  ) {}

  async addFailedEvent(
    handlerName: string,
    event: DomainEvent,
    eventId: string,
    processingId: string,
    error: unknown,
    occurredAt: Date,
  ): Promise<void> {
    const maxRetryAttempts = 3;
    const baseDelayMs = 1000;

    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      try {
        const prisma = await this.database.getPrismaClient();

        const deadLetterEvent = await prisma.deadLetterEvent.create({
          data: {
            eventType: event.eventType,
            eventData: JSON.stringify(event),
            handlerName,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : null,
            attempts: attempt,
            failedAt: occurredAt,
            canRetry: this.canRetryEvent(error),
            eventId,
            processingId,
          },
        });

        this.logger.error({
          context: "PrismaDeadLetterQueueAdapter",
          event: event.eventType,
          message: `Event sent to dead letter queue after ${attempt} attempts`,
          data: {
            deadLetterEventId: deadLetterEvent.id,
            handlerName,
            processingId,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        await this.sendDeadLetterAlert(deadLetterEvent.id, event.eventType, handlerName, error);
        return;
      } catch (dbError) {
        const isLastAttempt = attempt === maxRetryAttempts;

        this.logger.error({
          context: "PrismaDeadLetterQueueAdapter",
          event: "DEAD_LETTER_SAVE_FAILED",
          message: `Failed to store event in dead letter queue (attempt ${attempt}/${maxRetryAttempts})`,
          data: {
            originalError: error instanceof Error ? error.message : String(error),
            dbError: dbError instanceof Error ? dbError.message : String(dbError),
            eventType: event.eventType,
            handlerName,
            processingId,
            isLastAttempt,
          },
        });

        if (isLastAttempt) {
          const dlqError = new Error(
            `CRITICAL: Failed to store event in dead letter queue after ${maxRetryAttempts} attempts. ` +
              `Original error: ${error instanceof Error ? error.message : String(error)}. ` +
              `DLQ error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
          );

          await this.sendEmergencyAlert(event, handlerName, error, dbError);
          throw dlqError;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async retryEvent(eventId: string): Promise<void> {
    const prisma = await this.database.getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      const deadLetterEvent = await tx.deadLetterEvent.findUnique({
        where: { id: eventId },
      });

      if (!deadLetterEvent) {
        throw new Error(`Dead letter event ${eventId} not found`);
      }

      if (!deadLetterEvent.canRetry) {
        throw new Error(`Event ${eventId} cannot be retried`);
      }

      await tx.deadLetterEvent.update({
        where: { id: eventId },
        data: {
          canRetry: false,
          retriedAt: new Date(),
        },
      });

      try {
        const event = this.parseDomainEvent(deadLetterEvent.eventData);

        await this.handlerInvoker.invoke(deadLetterEvent.handlerName, event);

        this.logger.info({
          context: "PrismaDeadLetterQueueAdapter",
          event: "EVENT_RETRIED",
          message: `Successfully retried dead letter event`,
          data: {
            eventId,
            eventType: deadLetterEvent.eventType,
            handlerName: deadLetterEvent.handlerName,
            originalFailedAt: deadLetterEvent.failedAt,
            retriedAt: new Date(),
          },
        });
      } catch (retryError) {
        await tx.deadLetterEvent.update({
          where: { id: eventId },
          data: {
            canRetry: true,
            retriedAt: null,
          },
        });

        this.logger.error({
          context: "PrismaDeadLetterQueueAdapter",
          event: "RETRY_FAILED",
          message: `Failed to retry dead letter event - reverted canRetry flag`,
          data: {
            eventId,
            eventType: deadLetterEvent.eventType,
            handlerName: deadLetterEvent.handlerName,
            error: retryError instanceof Error ? retryError.message : String(retryError),
          },
        });

        throw retryError;
      }
    });
  }

  async retryEventsByType(eventType: string, maxRetries = 100): Promise<{ successful: number; failed: number; errors: string[] }> {
    const prisma = await this.database.getPrismaClient();

    const events = await prisma.deadLetterEvent.findMany({
      where: {
        eventType,
        canRetry: true,
      },
      take: maxRetries,
      orderBy: { failedAt: "asc" },
    });

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const deadLetterEvent of events) {
      try {
        await this.retryEvent(deadLetterEvent.id);
        successful++;
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Event ${deadLetterEvent.id}: ${errorMessage}`);

        this.logger.warn({
          context: "PrismaDeadLetterQueueAdapter",
          event: "BULK_RETRY_ITEM_FAILED",
          message: `Failed to retry event in bulk operation`,
          data: {
            eventId: deadLetterEvent.id,
            handlerName: deadLetterEvent.handlerName,
            error: errorMessage,
          },
        });
      }
    }

    this.logger.info({
      context: "PrismaDeadLetterQueueAdapter",
      event: "BULK_RETRY_COMPLETED",
      message: `Bulk retry completed for event type: ${eventType}`,
      data: { eventType, successful, failed, total: events.length, hasErrors: errors.length > 0 },
    });

    return { successful, failed, errors };
  }

  async deleteEvent(eventId: string): Promise<void> {
    const prisma = await this.database.getPrismaClient();

    await prisma.deadLetterEvent.delete({
      where: { id: eventId },
    });

    this.logger.info({
      context: "PrismaDeadLetterQueueAdapter",
      event: "EVENT_DELETED",
      message: `Dead letter event deleted`,
      data: { eventId },
    });
  }

  async cleanupOldEvents(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const prisma = await this.database.getPrismaClient();

    const result = await prisma.deadLetterEvent.deleteMany({
      where: { failedAt: { lt: cutoffDate } },
    });

    this.logger.info({
      context: "PrismaDeadLetterQueueAdapter",
      event: "CLEANUP_COMPLETED",
      message: `Cleaned up old dead letter events`,
      data: { deletedCount: result.count, olderThanDays },
    });

    return result.count;
  }

  async getFailedEvents(limit = 50, offset = 0): Promise<DeadLetterEvent[]> {
    const prisma = await this.database.getPrismaClient();

    const events = await prisma.deadLetterEvent.findMany({
      orderBy: { failedAt: "desc" },
      take: limit,
      skip: offset,
    });

    return events.map((e) => this.mapToDeadLetterEvent(e));
  }

  async getFailedEventsByType(eventType: DomainEventType, limit = 50): Promise<DeadLetterEvent[]> {
    const prisma = await this.database.getPrismaClient();

    const events = await prisma.deadLetterEvent.findMany({
      where: { eventType },
      orderBy: { failedAt: "desc" },
      take: limit,
    });

    return events.map((e) => this.mapToDeadLetterEvent(e));
  }

  async getFailedEventsCount(): Promise<number> {
    const prisma = await this.database.getPrismaClient();
    return await prisma.deadLetterEvent.count();
  }

  private mapToDeadLetterEvent(event: PrismaDeadLetterEvent): DeadLetterEvent {
    return {
      id: event.id,
      eventType: event.eventType,
      eventData: this.parseDomainEvent(event.eventData),
      handlerName: event.handlerName,
      error: event.errorMessage,
      attempts: event.attempts,
      failedAt: event.failedAt,
      correlationId: event.correlationId || undefined,
      canRetry: event.canRetry,
    };
  }

  private canRetryEvent(error: unknown): boolean {
    const nonRetryablePatterns = ["invalid email format", "user already exists", "permission denied", "resource not found"];
    if (error instanceof Error && nonRetryablePatterns.some((pattern) => error.message.toLowerCase().includes(pattern))) {
      return false;
    }

    return true;
  }

  private parseDomainEvent(jsonValue: unknown): DomainEvent {
    let rawData: unknown;
    if (typeof jsonValue === "string") {
      rawData = JSON.parse(jsonValue);
    } else {
      rawData = jsonValue;
    }
    return rawData as DomainEvent;
  }

  private async sendDeadLetterAlert(eventId: string, eventType: string, handlerName: string, error: unknown): Promise<void> {
    this.logger.debug({
      context: "PrismaDeadLetterQueueAdapter",
      event: "SENDING_ALERT",
      message: "Sending dead letter alert",
      data: {
        eventId,
        eventType,
        handlerName,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  private async sendEmergencyAlert(event: DomainEvent, handlerName: string, originalError: unknown, dlqError: unknown): Promise<void> {
    /*
     * TODO: Implement real alerting via an AlertSender port.
     */
    this.logger.error({
      context: "PrismaDeadLetterQueueAdapter",
      event: "EMERGENCY_EVENT_LOST",
      message: "EMERGENCY: Event completely lost - DLQ storage failed",
      data: {
        eventType: event.eventType,
        handlerName,
        originalError: originalError instanceof Error ? originalError.message : String(originalError),
        dlqError: dlqError instanceof Error ? dlqError.message : String(dlqError),
        timestamp: new Date().toISOString(),
      },
    });
  }
}
