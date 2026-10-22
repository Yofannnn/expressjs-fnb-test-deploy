/**
 * Simple async mutex to prevent concurrent batch flush operations.
 * Uses a promise chain to serialize access rather than a boolean flag,
 * which is not safe across async boundaries.
 */
export class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.queue;
    this.queue = previous.then(() => next);
    await previous;
    return release;
  }
}
