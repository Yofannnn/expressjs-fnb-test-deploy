import { LoggerPort } from "@/application/ports/driven/logger.port";

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  cooldownPeriod: number;
  halfOpenMaxCalls: number;
  timeWindow: number;
  isFailure?: (error: unknown) => boolean;
}

interface CircuitBreakerState {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  halfOpenAttempts: number;
  windowStartTime: number;
}

interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitOpenDuration: number;
  averageResponseTime: number;
  lastResetTime: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private readonly isFailure: (error: unknown) => boolean;
  private readonly metrics: CircuitBreakerMetrics;
  private readonly operationLocks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly logger: LoggerPort,
  ) {
    this.isFailure = config.isFailure ?? (() => true);
    this.state = this.getInitialState();
    this.metrics = this.getInitialMetrics();
  }

  private getInitialState(): CircuitBreakerState {
    return {
      state: "CLOSED",
      failureCount: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      halfOpenAttempts: 0,
      windowStartTime: Date.now(),
    };
  }

  private getInitialMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpenDuration: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now(),
    };
  }

  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    return this.withLock(operationName, async () => {
      if (!this.canExecute()) {
        this.logCircuitOpen(operationName);
        throw new Error(`Circuit breaker '${this.config.name}' is open. Time until reset: ${this.getTimeUntilReset()}ms`);
      }

      try {
        const result = await operation();
        this.onSuccess(operationName, Date.now() - startTime);
        return result;
      } catch (error) {
        this.onFailure(error, operationName, Date.now() - startTime);
        throw error;
      }
    });
  }

  private async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    while (this.operationLocks.has(key)) {
      await this.operationLocks.get(key)?.catch(() => undefined);
    }

    const promise = operation();
    this.operationLocks.set(key, promise);

    try {
      return await promise;
    } finally {
      this.operationLocks.delete(key);
    }
  }

  private canExecute(): boolean {
    const now = Date.now();

    switch (this.state.state) {
      case "CLOSED":
        return true;

      case "OPEN":
        if (now - this.state.lastFailureTime >= this.config.cooldownPeriod) {
          this.transitionToHalfOpen(now);
          return true;
        }
        return false;

      case "HALF_OPEN":
        return this.state.halfOpenAttempts < this.config.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  private onSuccess(operationName: string | undefined, duration: number): void {
    const now = Date.now();
    this.state.lastSuccessTime = now;
    this.metrics.successfulRequests++;
    this.updateAverageResponseTime(duration);

    if (this.state.state === "HALF_OPEN") {
      const wasOpenDuration = now - this.state.lastFailureTime;
      this.state.state = "CLOSED";
      this.state.failureCount = 0;
      this.state.halfOpenAttempts = 0;
      this.state.windowStartTime = now;

      this.metrics.circuitOpenDuration += wasOpenDuration;
      this.metrics.lastResetTime = now;

      this.logCircuitReset(operationName, wasOpenDuration);
    }
  }

  private onFailure(error: unknown, operationName: string | undefined, duration: number): void {
    if (!this.isFailure(error)) {
      return;
    }

    const now = Date.now();
    this.metrics.failedRequests++;
    this.updateAverageResponseTime(duration);

    if (now - this.state.windowStartTime >= this.config.timeWindow) {
      this.state.failureCount = 0;
      this.state.windowStartTime = now;
    }

    this.state.failureCount++;
    this.state.lastFailureTime = now;

    if (this.state.state === "HALF_OPEN") {
      this.state.halfOpenAttempts++;
      this.state.state = "OPEN";
      this.logCircuitTripped(error, operationName, "half_open_failure");
    } else if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.state = "OPEN";
      this.logCircuitTripped(error, operationName, "threshold_exceeded");
    }
  }

  private updateAverageResponseTime(duration: number): void {
    const totalRequests = this.metrics.totalRequests;
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime * (totalRequests - 1) + duration) / totalRequests;
  }

  private transitionToHalfOpen(now: number): void {
    this.state.state = "HALF_OPEN";
    this.state.halfOpenAttempts = 0;

    this.logger.info({
      context: this.config.name,
      event: "TRANSITION_TO_HALF_OPEN",
      message: "Circuit breaker transitioning to half-open state",
      data: {
        cooldownElapsed: now - this.state.lastFailureTime,
        cooldownPeriod: this.config.cooldownPeriod,
        metrics: { ...this.metrics },
      },
    });
  }

  private logCircuitOpen(operationName?: string): void {
    this.logger.warn({
      context: this.config.name,
      event: "CIRCUIT_OPEN",
      message: "Circuit is open, rejecting operation",
      data: {
        operationName,
        state: this.state.state,
        failureCount: this.state.failureCount,
        timeUntilReset: this.getTimeUntilReset(),
        cooldownPeriod: this.config.cooldownPeriod,
        metrics: { ...this.metrics },
      },
    });
  }

  private logCircuitTripped(error: unknown, operationName?: string, reason?: string): void {
    this.logger.error({
      context: this.config.name,
      event: "CIRCUIT_TRIPPED",
      message: `Circuit breaker opened due to ${reason || "failures"}`,
      data: {
        operationName,
        error: error instanceof Error ? error.message : String(error),
        errorType: (error as { constructor?: { name?: string } })?.constructor?.name,
        failureCount: this.state.failureCount,
        failureThreshold: this.config.failureThreshold,
        cooldownPeriod: this.config.cooldownPeriod,
        metrics: { ...this.metrics },
      },
    });
  }

  private logCircuitReset(operationName: string | undefined, downTime: number): void {
    this.logger.info({
      context: this.config.name,
      event: "CIRCUIT_RESET",
      message: "Circuit breaker reset after successful operation",
      data: {
        operationName,
        downTime,
        metrics: { ...this.metrics },
      },
    });
  }

  private getTimeUntilReset(): number {
    if (this.state.state !== "OPEN") return 0;
    return Math.max(0, this.config.cooldownPeriod - (Date.now() - this.state.lastFailureTime));
  }

  getState(): Readonly<CircuitBreakerState> {
    return { ...this.state };
  }

  getConfig(): Readonly<CircuitBreakerConfig> {
    return { ...this.config };
  }

  getMetrics(): Readonly<CircuitBreakerMetrics> {
    return { ...this.metrics };
  }

  isOpen(): boolean {
    return !this.canExecute();
  }

  getHealthStatus(): { healthy: boolean; details: Record<string, unknown> } {
    const now = Date.now();
    const isHealthy = this.state.state === "CLOSED" || (this.state.state === "HALF_OPEN" && this.state.halfOpenAttempts === 0);

    return {
      healthy: isHealthy,
      details: {
        state: this.state.state,
        failureRate: this.metrics.totalRequests > 0 ? this.metrics.failedRequests / this.metrics.totalRequests : 0,
        averageResponseTime: this.metrics.averageResponseTime,
        timeUntilReset: this.getTimeUntilReset(),
        uptime: now - this.metrics.lastResetTime,
      },
    };
  }

  forceReset(): void {
    this.state = this.getInitialState();
    this.metrics.lastResetTime = Date.now();

    this.logger.warn({
      context: this.config.name,
      event: "CIRCUIT_FORCE_RESET",
      message: "Circuit breaker forcefully reset",
      data: { metrics: { ...this.metrics } },
    });
  }
}
