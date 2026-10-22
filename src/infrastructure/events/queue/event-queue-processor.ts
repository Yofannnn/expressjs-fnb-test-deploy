import { LoggerPort } from "@/application/ports/driven/logger.port";
import { EventQueueProcessorConfig } from "@/infrastructure/configs/event-queue-processor.config";
import { EventQueue } from "./event-queue.type";
import { EventHandlerRegistration } from "../registration/event-handler-registration.type";
import { HandlerRunner } from "../dispatch/handler-runner";
import { BatchFlushCoordinator } from "../batcher/batch-flush-coordinator";

export class EventQueueProcessor {
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private isRunning = false;
  private scheduledTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: EventQueueProcessorConfig,
    private readonly eventQueue: EventQueue,
    private readonly handlerRegistration: EventHandlerRegistration,
    private readonly handlerRunner: HandlerRunner,
    private readonly flushCoordinator: BatchFlushCoordinator,
    private readonly logger: LoggerPort,
  ) {
    this.batchSize = this.config.batchSize;
    this.pollIntervalMs = this.config.pollIntervalMs;
  }

  private async processBatch(): Promise<void> {
    try {
      await this.flushCoordinator.flushIfNeeded();

      if (!(await this.eventQueue.hasEvents())) return;

      const queuedEvents = await this.eventQueue.dequeue(this.batchSize);
      if (queuedEvents.length === 0) return;

      this.logger.debug({
        context: "EventQueueProcessor",
        event: "PROCESSING_BATCH",
        message: `Processing batch of ${queuedEvents.length} queued events`,
        data: { handlers: queuedEvents.map((e) => e.handlerName) },
      });

      const results = await Promise.allSettled(
        queuedEvents.map(async (qe) => {
          const normalized = this.handlerRegistration.getNormalizedHandler(qe.handlerName, qe.event.eventType);

          if (!normalized) {
            this.logger.warn({
              context: "EventQueueProcessor",
              event: "HANDLER_NOT_FOUND",
              message: `No normalized handler registered for: ${qe.handlerName}`,
              data: { handlerName: qe.handlerName, eventType: qe.event.eventType },
            });
            return;
          }

          await this.handlerRunner.run(normalized, qe.event);
        }),
      );

      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        this.logger.error({
          context: "EventQueueProcessor",
          event: "BATCH_PARTIAL_FAILURE",
          message: `${failures.length}/${queuedEvents.length} handlers failed in batch`,
          data: {
            errors: failures.map((r) => (r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : null)),
          },
        });
      }
    } catch (error) {
      this.logger.error({
        context: "EventQueueProcessor",
        event: "PROCESSING_ERROR",
        message: "Error processing queued events",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  /**
   * Recursive loop: schedules the next poll only after the current batch finishes.
   */
  private async runLoop(): Promise<void> {
    if (!this.isRunning) return;

    await this.processBatch();

    this.scheduledTimeout = setTimeout(() => {
      void this.runLoop();
    }, this.pollIntervalMs);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    this.logger.info({
      context: "EventQueueProcessor",
      event: "STARTED",
      message: `Event queue processor started (poll: ${this.pollIntervalMs}ms, batch: ${this.batchSize})`,
    });

    await this.runLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }

    this.logger.info({
      context: "EventQueueProcessor",
      event: "STOPPED",
      message: "Event queue processor stopped",
    });
  }
}
