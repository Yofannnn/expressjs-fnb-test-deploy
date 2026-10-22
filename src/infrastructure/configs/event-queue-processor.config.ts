import { env } from "./env-reader";

export interface EventQueueProcessorConfig {
  batchSize: number;
  pollIntervalMs: number;
}

export class EventQueueProcessorEnvConfig implements EventQueueProcessorConfig {
  readonly batchSize: number;
  readonly pollIntervalMs: number;

  constructor() {
    this.batchSize = env.number("EVENT_QUEUE_PROCESSOR_BATCH_SIZE", 20);
    this.pollIntervalMs = env.number("EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS", 5000);

    this.validate();
  }

  private validate(): void {
    if (this.batchSize <= 0) throw new Error("EVENT_QUEUE_PROCESSOR_BATCH_SIZE must be greater than 0");
    if (this.pollIntervalMs <= 0) throw new Error("EVENT_QUEUE_PROCESSOR_POLL_INTERVAL_IN_MS must be greater than 0");
  }
}
