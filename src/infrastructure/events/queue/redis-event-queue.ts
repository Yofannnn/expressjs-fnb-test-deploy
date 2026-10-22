import { LoggerPort } from "@/application/ports/driven/logger.port";
import { EventQueue, QueuedEvent } from "./event-queue.type";
import { RedisConnectionManager } from "@/infrastructure/cache/redis-connection";
import { EventQueueConfig } from "@/infrastructure/configs/event-queue.config";

export class RedisEventQueue implements EventQueue {
  private readonly queueKey = "domain:events:queue";
  private readonly delayedQueueKey = "domain:events:delayed";

  constructor(
    private readonly redisConnection: RedisConnectionManager,
    private readonly eventQueueConfig: EventQueueConfig,
    private readonly logger: LoggerPort,
  ) {}

  async enqueue(enqueuedEvents: QueuedEvent[]): Promise<void> {
    if (enqueuedEvents.length === 0) return;

    await this.redisConnection.executeWithErrorHandling(
      "enqueue",
      this.queueKey,
      async () => {
        const redis = this.redisConnection.getClient();
        const pipeline = redis.pipeline();

        for (const enqueuedEvent of enqueuedEvents) {
          const eventData = JSON.stringify({
            ...enqueuedEvent,
            enqueuedAt: new Date().toISOString(),
          });

          const priority = enqueuedEvent.handlerOptions.priority || 5;
          pipeline.zadd(this.queueKey, priority, eventData);
        }

        const results = await pipeline.exec();

        if (!results) {
          throw new Error("Pipeline execution failed: empty result");
        }

        const errors = results.filter(([err]) => err !== null);
        if (errors.length > 0) {
          throw new Error(`Pipeline execution failed: ${errors.map(([err]) => err?.message).join(", ")}`);
        }

        this.logger.debug({
          context: "RedisEventQueue",
          event: "ENQUEUE_SUCCESS",
          message: `Successfully enqueued ${enqueuedEvents.length} events`,
          data: {
            eventTypes: enqueuedEvents.map((e) => e.handlerName),
            priorities: enqueuedEvents.map((e) => e.handlerOptions.priority || 5),
          },
        });
      },
      { retries: this.eventQueueConfig.maxRetries },
    );
  }

  async enqueueDelayed(enqueuedEvent: QueuedEvent, delayMs: number): Promise<void> {
    await this.redisConnection.executeWithErrorHandling(
      "enqueueDelayed",
      this.delayedQueueKey,
      async () => {
        const executeAt = Date.now() + delayMs;
        const eventData = JSON.stringify({
          ...enqueuedEvent,
          enqueuedAt: new Date().toISOString(),
          executeAt,
        });

        await this.redisConnection.getClient().zadd(this.delayedQueueKey, executeAt, eventData);

        this.logger.debug({
          context: "RedisEventQueue",
          event: "ENQUEUE_DELAYED_SUCCESS",
          message: `Successfully enqueued delayed event: ${enqueuedEvent.handlerName}`,
          data: {
            delayMs,
            executeAt: new Date(executeAt).toISOString(),
            eventType: enqueuedEvent.handlerName,
          },
        });
      },
      { retries: this.eventQueueConfig.maxRetries },
    );
  }

  async dequeue(batchSize: number = 10): Promise<QueuedEvent[]> {
    return await this.redisConnection.executeWithErrorHandling(
      "dequeue",
      this.queueKey,
      async () => {
        await this.promoteDelayedEvents();

        const rawEvents = await this.redisConnection.getClient().zpopmin(this.queueKey, batchSize);
        if (rawEvents.length === 0) return [];

        const events: QueuedEvent[] = [];
        const invalidEvents: string[] = [];

        for (let i = 0; i < rawEvents.length; i += 2) {
          try {
            events.push(this.parseQueuedEvent(rawEvents[i]));
          } catch (error) {
            invalidEvents.push(rawEvents[i]);
            this.logger.error({
              context: "RedisEventQueue",
              event: "DEQUEUE_PARSE_ERROR",
              message: "Failed to parse event during dequeue",
              data: { error: error instanceof Error ? error.message : String(error), rawEvent: rawEvents[i] },
            });
          }
        }

        if (events.length > 0) {
          this.logger.debug({
            context: "RedisEventQueue",
            event: "DEQUEUE_SUCCESS",
            message: `Dequeued ${events.length} events`,
            data: { eventTypes: events.map((e) => e.handlerName), invalidEvents: invalidEvents.length },
          });
        }

        return events;
      },
      { retries: this.eventQueueConfig.maxRetries, fallbackValue: [] },
    );
  }

  async hasEvents(): Promise<boolean> {
    const count = await this.redisConnection.getClient().zcard(this.queueKey);
    return count > 0;
  }

  async peek(count: number = 10): Promise<QueuedEvent[]> {
    return await this.redisConnection.executeWithErrorHandling(
      "peek",
      this.queueKey,
      async () => {
        await this.promoteDelayedEvents();

        const rawEvents = await this.redisConnection.getClient().zrange(this.queueKey, 0, count - 1, "WITHSCORES");
        const events: QueuedEvent[] = [];

        for (let i = 0; i < rawEvents.length; i += 2) {
          try {
            events.push(this.parseQueuedEvent(rawEvents[i]));
          } catch (error) {
            this.logger.warn({
              context: "RedisEventQueue",
              event: "PEEK_PARSE_ERROR",
              message: "Failed to parse event during peek",
              data: { error: error instanceof Error ? error.message : String(error) },
            });
          }
        }

        return events;
      },
      { retries: this.eventQueueConfig.maxRetries, fallbackValue: [] },
    );
  }

  private parseQueuedEvent(raw: string): QueuedEvent {
    const eventData = JSON.parse(raw);
    return {
      event: {
        ...eventData.event,
        occurredOn: new Date(eventData.event.occurredOn),
        processingMetadata: {
          ...eventData.event.processingMetadata,
          enqueuedAt: new Date(eventData.event.processingMetadata.enqueuedAt),
        },
      },
      handlerName: eventData.handlerName,
      handlerOptions: eventData.handlerOptions,
      enqueuedAt: new Date(eventData.enqueuedAt),
    };
  }

  private async promoteDelayedEvents(): Promise<void> {
    const redis = this.redisConnection.getClient();
    const now = Date.now();
    const readyEvents = await redis.zrangebyscore(this.delayedQueueKey, 0, now, "WITHSCORES");

    if (readyEvents.length === 0) return;

    const pipeline = redis.pipeline();
    let promotedCount = 0;

    for (let i = 0; i < readyEvents.length; i += 2) {
      const eventData = readyEvents[i];

      try {
        const event = JSON.parse(eventData);
        const priority = event.handlerOptions?.priority || 5;

        pipeline.zadd(this.queueKey, priority, eventData);
        pipeline.zrem(this.delayedQueueKey, eventData);
        promotedCount++;
      } catch (error) {
        pipeline.zrem(this.delayedQueueKey, eventData);

        this.logger.error({
          context: "RedisEventQueue",
          event: "PROMOTE_ERROR",
          message: "Failed to promote delayed event - removed from queue",
          data: {
            error: error instanceof Error ? error.message : String(error),
            eventData: eventData.substring(0, 200) + (eventData.length > 200 ? "..." : ""),
          },
        });
      }
    }

    await pipeline.exec();

    if (promotedCount > 0) {
      this.logger.debug({
        context: "RedisEventQueue",
        event: "PROMOTE_SUCCESS",
        message: `Promoted ${promotedCount} delayed events to main queue`,
      });
    }
  }

  async getQueueSize(): Promise<number> {
    return this.getMainQueueSize();
  }

  async getMainQueueSize(): Promise<number> {
    return await this.redisConnection.getClient().zcard(this.queueKey);
  }

  async getDelayedQueueSize(): Promise<number> {
    return await this.redisConnection.getClient().zcard(this.delayedQueueKey);
  }

  async clear(): Promise<void> {
    await this.redisConnection.executeWithErrorHandling(
      "clear",
      `${this.queueKey}+${this.delayedQueueKey}`,
      async () => {
        const redis = this.redisConnection.getClient();
        await Promise.all([redis.del(this.queueKey), redis.del(this.delayedQueueKey)]);

        this.logger.info({
          context: "RedisEventQueue",
          event: "QUEUES_CLEARED",
          message: "Event queues cleared",
        });
      },
      { retries: this.eventQueueConfig.maxRetries },
    );
  }

  async isQueueHealthy(): Promise<boolean> {
    return this.redisConnection.isHealthy();
  }
}
