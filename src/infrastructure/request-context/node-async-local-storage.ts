import { AsyncLocalStorage } from "async_hooks";
import { RequestContextData } from "@/application/ports/driven/request-context.port";

export class NodeAsyncLocalStorage {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  run<T>(data: RequestContextData, callback: () => T): T {
    return this.storage.run(data, callback);
  }

  getStore(): RequestContextData | undefined {
    return this.storage.getStore();
  }
}
