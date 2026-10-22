import { env } from "./env-reader";

export interface EventQueueConfig {
  maxRetries: number;
  healthCheckInterval: number;
  batchTimeout: number;
}

export class EventQueueEnvConfig implements EventQueueConfig {
  readonly maxRetries: number;
  readonly healthCheckInterval: number;
  readonly batchTimeout: number;
  constructor() {
    this.maxRetries = env.number("EVENT_QUEUE_MAX_RETRIES", 3);
    this.healthCheckInterval = env.number("EVENT_QUEUE_HEALTH_CHECK_INTERVAL", 1000);
    this.batchTimeout = env.number("EVENT_QUEUE_BATCH_TIMEOUT", 1000);
  }
}
