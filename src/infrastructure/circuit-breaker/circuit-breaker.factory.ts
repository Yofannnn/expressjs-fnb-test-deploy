import { LoggerPort } from "@/application/ports/driven/logger.port";
import { CircuitBreaker, CircuitBreakerConfig } from "./circuit-breaker";

export class CircuitBreakerFactory {
  constructor(private readonly logger: LoggerPort) {}

  create(config: CircuitBreakerConfig): CircuitBreaker {
    return new CircuitBreaker(config, this.logger);
  }
}
