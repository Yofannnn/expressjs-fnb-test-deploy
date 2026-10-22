import { AsyncMutex } from "../async-mutex";
import { EventQueue } from "../queue/event-queue.type";
import { EventBatcher } from "./event-batcher.type";

export class BatchFlushCoordinator {
  private readonly mutex = new AsyncMutex();

  constructor(
    private readonly eventBatcher: EventBatcher,
    private readonly eventQueue: EventQueue,
  ) {}

  async flushIfNeeded(): Promise<void> {
    if (!this.eventBatcher.hasEvents() || !this.eventBatcher.shouldFlush()) return;

    const release = await this.mutex.acquire();

    try {
      if (!this.eventBatcher.hasEvents() || !this.eventBatcher.shouldFlush()) return;

      const events = this.eventBatcher.flush();

      if (events.length) {
        await this.eventQueue.enqueue(events);
      }
    } finally {
      release();
    }
  }
}
