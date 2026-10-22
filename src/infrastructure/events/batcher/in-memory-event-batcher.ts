import { LoggerPort } from "@/application/ports/driven/logger.port";
import { EventBatcher } from "@/infrastructure/events/batcher/event-batcher.type";
import { QueuedEvent } from "../queue/event-queue.type";
import { EventBatchConfig } from "@/infrastructure/configs/event-batch.config";

export class InMemoryEventBatcher implements EventBatcher {
  private events: QueuedEvent[] = [];
  private firstEventTime: number | null = null;

  constructor(
    private readonly config: EventBatchConfig,
    private readonly logger: LoggerPort,
  ) {}

  addEvents(events: QueuedEvent[]): void {
    if (!events.length) return;

    this.events.push(...events);

    if (this.firstEventTime === null) {
      this.firstEventTime = Date.now();
    }
  }

  shouldFlush(): boolean {
    return this.events.length >= this.config.batchSize || this.isTimeThresholdReached();
  }

  hasEvents(): boolean {
    return this.events.length > 0;
  }

  flush(): QueuedEvent[] {
    const eventsToFlush = [...this.events];
    this.clear();

    this.logger.debug({
      context: "EventBatcher",
      event: "FLUSH",
      message: `Flushing batch of ${eventsToFlush.length} events`,
      data: {
        eventTypes: eventsToFlush.map((e) => e.event.eventType),
      },
    });

    return eventsToFlush;
  }

  getSize(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
    this.firstEventTime = null;
  }

  forceFlush(): QueuedEvent[] {
    return this.flush();
  }

  private isTimeThresholdReached(): boolean {
    if (this.firstEventTime === null || this.events.length === 0) {
      return false;
    }

    const elapsed = Date.now() - this.firstEventTime;
    return elapsed >= this.config.maxWaitTimeInMs;
  }
}
