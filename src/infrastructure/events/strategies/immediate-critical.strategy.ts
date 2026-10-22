import { LoggerPort } from "@/application/ports/driven/logger.port";
import { HandlerRunner } from "../dispatch/handler-runner";
import { EventHandlerPair, EventStrategyExecutor } from "../core/event-processing.type";

export class ImmediateCriticalStrategy implements EventStrategyExecutor {
  readonly requiresCircuitBreaker = true;
  readonly failureStrategy = "throw" as const;

  constructor(
    private readonly handlerRunner: HandlerRunner,
    private readonly logger: LoggerPort,
  ) {}

  async execute(pairs: EventHandlerPair[]): Promise<void> {
    for (const { event, handlers } of pairs) {
      const sorted = [...handlers].sort((a, b) => a.options.priority - b.options.priority);

      for (const registration of sorted) {
        try {
          await this.handlerRunner.run(registration, event);
        } catch (error) {
          this.logger.error({
            context: "ImmediateCriticalStrategy",
            event: "CRITICAL_HANDLER_FAILED",
            message: `Critical handler failed for ${event.eventType}`,
            data: {
              error: error instanceof Error ? error.message : error,
              handlerName: registration.handlerName,
            },
          });
          throw error;
        }
      }
    }
  }
}
