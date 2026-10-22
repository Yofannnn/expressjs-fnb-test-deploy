import { HandlerRunner } from "../dispatch/handler-runner";
import { EventHandlerPair, EventStrategyExecutor } from "../core/event-processing.type";

export class ImmediateTolerantStrategy implements EventStrategyExecutor {
  readonly requiresCircuitBreaker = true;
  readonly failureStrategy = "throw" as const;

  constructor(
    private readonly handlerRunner: HandlerRunner,
    private readonly asyncFailureRateThreshold: number = 0.1,
    private readonly asyncFailureMinSampleSize: number = 10,
  ) {}

  async execute(pairs: EventHandlerPair[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const { event, handlers } of pairs) {
      for (const registration of handlers) {
        promises.push(this.handlerRunner.run(registration, event));
      }
    }

    if (promises.length === 0) return;

    const results = await Promise.allSettled(promises);
    const failures = results.filter((r) => r.status === "rejected");
    const failureRate = failures.length / promises.length;

    if (promises.length >= this.asyncFailureMinSampleSize && failureRate > this.asyncFailureRateThreshold) {
      throw new Error(
        `Async handler failure rate too high: ${failures.length}/${promises.length} failed (threshold: ${this.asyncFailureRateThreshold})`,
      );
    }
  }
}
