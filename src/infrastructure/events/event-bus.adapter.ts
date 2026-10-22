import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { EventExecutionStrategy } from "@/application/ports/driven/event-handler.port";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { CircuitBreaker } from "../circuit-breaker/circuit-breaker";
import { CircuitBreakerFactory } from "../circuit-breaker/circuit-breaker.factory";
import { EventEnricher } from "./core/event-enricher";
import { EventGrouper } from "./core/event-grouper";
import { DispatchReporter } from "./dispatch/dispatch-reporter";
import { DispatchResult, EventStrategyExecutor } from "./core/event-processing.type";

const CLEANUP_INTERVAL_MS = 3_600_000;

export class EventBusAdapter implements EventBusPort {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    circuitBreakerFactory: CircuitBreakerFactory,
    private readonly enricher: EventEnricher,
    private readonly grouper: EventGrouper,
    private readonly reporter: DispatchReporter,
    private readonly strategies: Record<EventExecutionStrategy, EventStrategyExecutor>,
  ) {
    this.circuitBreaker = circuitBreakerFactory.create({
      failureThreshold: 5,
      cooldownPeriod: 60_000,
      halfOpenMaxCalls: 3,
      timeWindow: 300_000,
      name: "EventHandlerCircuitBreaker",
    });

    /*
     * TODO: cleanupStaleHandlers is not implemented yet — delegate to the
     * registration port once it is, rather than reaching into its internals.
     */
    this.cleanupInterval = setInterval(() => this.cleanupStaleHandlers(), CLEANUP_INTERVAL_MS);
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.publishAll([event]);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    if (!events.length) return;

    const enriched = this.enricher.enrichAll(events);
    const grouped = this.grouper.group(enriched);
    const results: DispatchResult[] = [];

    try {
      for (const [strategyKey, pairs] of Object.entries(grouped)) {
        if (!pairs.length) continue;

        const strategy = strategyKey as EventExecutionStrategy;
        const executor = this.strategies[strategy];

        try {
          if (executor.requiresCircuitBreaker) {
            await this.circuitBreaker.execute(() => executor.execute(pairs), `dispatch_${strategy}`);
          } else {
            await executor.execute(pairs);
          }

          results.push({ strategy, success: true, processedCount: pairs.length });
        } catch (error) {
          const dispatchError = error instanceof Error ? error : new Error(String(error));
          const isCircuitBreakerError = this.reporter.isCircuitBreakerError(dispatchError);

          if (isCircuitBreakerError && executor.failureStrategy !== "throw") {
            await this.reporter.reportFailure(strategy, "queue_fallback", pairs, dispatchError);
            results.push({ strategy, success: true, processedCount: pairs.length, fallbackUsed: true });
            this.reporter.logCircuitBreakerFallback(strategy, pairs);
            continue;
          }

          results.push({ strategy, success: false, error: dispatchError, processedCount: 0 });
          await this.reporter.reportFailure(strategy, executor.failureStrategy, pairs, dispatchError);

          if (executor.failureStrategy === "throw") {
            throw dispatchError;
          }
        }
      }
    } finally {
      this.reporter.logSummary(results);
    }
  }

  private cleanupStaleHandlers(): void {
    /*
     * TODO: implement — delegate to the registration port, don't touch its internals directly.
     */
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
