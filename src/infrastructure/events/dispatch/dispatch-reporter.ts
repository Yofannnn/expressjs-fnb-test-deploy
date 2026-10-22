import { LoggerPort } from "@/application/ports/driven/logger.port";
import { DeadLetterQueue } from "../core/dead-letter-queue.type";
import { EventExecutionStrategy } from "@/application/ports/driven/event-handler.port";
import { DispatchResult, EventHandlerPair, FailureStrategy } from "../core/event-processing.type";

export class DispatchReporter {
  constructor(
    private readonly deadLetterQueue: DeadLetterQueue,
    private readonly logger: LoggerPort,
  ) {}

  isCircuitBreakerError(error: Error): boolean {
    return error.message.includes("Circuit breaker") && error.message.includes("is open");
  }

  async reportFailure(strategy: EventExecutionStrategy, failureStrategy: FailureStrategy, pairs: EventHandlerPair[], error: Error): Promise<void> {
    switch (failureStrategy) {
      case "throw":
        this.logger.error({
          context: "DispatchReporter",
          event: "CRITICAL_DISPATCH_FAILURE",
          message: `Critical dispatch failure for strategy ${strategy}`,
          data: {
            strategy,
            error: error.message,
            eventCount: pairs.length,
            eventTypes: pairs.map((p) => p.event.eventType),
          },
        });
        break;

      case "log":
        this.logger.warn({
          context: "DispatchReporter",
          event: "ASYNC_DISPATCH_FAILURE",
          message: `Async dispatch failure for strategy ${strategy}`,
          data: {
            strategy,
            error: error.message,
            eventCount: pairs.length,
            eventTypes: pairs.map((p) => p.event.eventType),
          },
        });
        break;

      case "queue_fallback":
        try {
          for (const { event, handlers } of pairs) {
            for (const handler of handlers) {
              await this.deadLetterQueue.addFailedEvent(
                handler.handlerName,
                event,
                event.eventId,
                event.processingMetadata.processingId,
                error,
                new Date(),
              );
            }
          }

          this.logger.info({
            context: "DispatchReporter",
            event: "FALLBACK_TO_DLQ",
            message: `Events queued to DLQ after ${strategy} failure`,
            data: { strategy, eventCount: pairs.length },
          });
        } catch (dlqError) {
          this.logger.error({
            context: "DispatchReporter",
            event: "DLQ_FALLBACK_FAILED",
            message: `Failed to queue events to DLQ after ${strategy} failure`,
            data: {
              originalError: error.message,
              dlqError: dlqError instanceof Error ? dlqError.message : String(dlqError),
            },
          });
        }
        break;
    }
  }

  logCircuitBreakerFallback(strategy: EventExecutionStrategy, pairs: EventHandlerPair[]): void {
    this.logger.info({
      context: "DispatchReporter",
      event: "CIRCUIT_BREAKER_FALLBACK_SUCCESS",
      message: `Circuit breaker fallback succeeded for strategy ${strategy}`,
      data: { strategy, eventCount: pairs.length },
    });
  }

  logSummary(results: DispatchResult[]): void {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const fallbackUsed = results.filter((r) => r.fallbackUsed).length;
    const totalProcessed = results.reduce((sum, r) => sum + r.processedCount, 0);

    this.logger.info({
      context: "DispatchReporter",
      event: "DISPATCH_SUMMARY",
      message: `Event dispatch completed: ${successful}/${results.length} strategies succeeded${
        fallbackUsed > 0 ? ` (${fallbackUsed} with fallback)` : ""
      }`,
      data: {
        successful,
        failed,
        fallbackUsed,
        totalProcessed,
        results: results.map((r) => ({
          strategy: r.strategy,
          success: r.success,
          processedCount: r.processedCount,
          error: r.error?.message,
          fallbackUsed: r.fallbackUsed || false,
        })),
      },
    });
  }
}
