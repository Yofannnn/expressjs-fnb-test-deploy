import { env } from "./env-reader";

export interface EventBatchConfig {
  flushIntervalInMs: number;
  maxRetries: number;
  retryDelayInMs: number;
  maxWaitTimeInMs: number;
  batchSize: number;
}

export class EventBatchEnvConfig implements EventBatchConfig {
  readonly flushIntervalInMs: number;
  readonly maxRetries: number;
  readonly retryDelayInMs: number;
  readonly maxWaitTimeInMs: number;
  readonly batchSize: number;

  constructor() {
    this.flushIntervalInMs = env.number("EVENT_BATCH_FLUSH_INTERVAL_IN_MS", 1000);
    this.maxRetries = env.number("EVENT_BATCH_MAX_RETRIES", 3);
    this.retryDelayInMs = env.number("EVENT_BATCH_RETRY_DELAY_IN_MS", 1000);
    this.maxWaitTimeInMs = env.number("EVENT_BATCH_MAX_WAIT_TIME_IN_MS", 1000);
    this.batchSize = env.number("EVENT_BATCH_SIZE", 20);
    this.validate();
  }

  private validate(): void {
    if (this.batchSize <= 0) throw new Error("EVENT_BATCH_SIZE must be greater than 0");
    if (this.maxRetries < 0) throw new Error("EVENT_BATCH_MAX_RETRIES must be 0 or greater");
  }
}
