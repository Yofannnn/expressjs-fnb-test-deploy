import { QueuedEvent } from "../queue/event-queue.type";
import { EventBatcher } from "../batcher/event-batcher.type";
import { BatchFlushCoordinator } from "../batcher/batch-flush-coordinator";
import { EventHandlerPair, EventStrategyExecutor } from "../core/event-processing.type";

export class QueuedBatchStrategy implements EventStrategyExecutor {
  readonly requiresCircuitBreaker = false;
  readonly failureStrategy = "queue_fallback" as const;

  constructor(
    private readonly eventBatcher: EventBatcher,
    private readonly flushCoordinator: BatchFlushCoordinator,
  ) {}

  async execute(pairs: EventHandlerPair[]): Promise<void> {
    const queued: QueuedEvent[] = [];

    for (const { event, handlers } of pairs) {
      for (const registration of handlers) {
        queued.push({
          event,
          handlerOptions: registration.options,
          handlerName: registration.handlerName,
          enqueuedAt: new Date(),
        });
      }
    }

    this.eventBatcher.addEvents(queued);
    await this.flushCoordinator.flushIfNeeded();
  }
}
