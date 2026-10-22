import { EventQueue } from "../queue/event-queue.type";
import { EventHandlerPair, EventStrategyExecutor } from "../core/event-processing.type";

export class DelayedStrategy implements EventStrategyExecutor {
  readonly requiresCircuitBreaker = false;
  readonly failureStrategy = "queue_fallback" as const;

  constructor(private readonly eventQueue: EventQueue) {}

  async execute(pairs: EventHandlerPair[]): Promise<void> {
    for (const { event, handlers } of pairs) {
      for (const registration of handlers) {
        await this.eventQueue.enqueueDelayed(
          {
            event,
            handlerOptions: registration.options,
            handlerName: registration.handlerName,
            enqueuedAt: new Date(),
          },
          registration.options.delayMs || 0,
        );
      }
    }
  }
}
