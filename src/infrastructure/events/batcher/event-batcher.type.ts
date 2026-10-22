import { QueuedEvent } from "../queue/event-queue.type";

export interface EventBatcher {
  addEvents(events: QueuedEvent[]): void;
  shouldFlush(): boolean;
  flush(): QueuedEvent[];
  getSize(): number;
  hasEvents(): boolean;
  clear(): void;
}
