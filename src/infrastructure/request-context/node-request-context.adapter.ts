import { RequestContextPort, RequestContextData } from "@/application/ports/driven/request-context.port";
import { NodeAsyncLocalStorage } from "./node-async-local-storage";

export class NodeRequestContextAdapter implements RequestContextPort {
  constructor(private readonly nodeAsyncLocalStorage: NodeAsyncLocalStorage) {}

  get(): RequestContextData {
    return (
      this.nodeAsyncLocalStorage.getStore() ?? {
        requestId: "SYSTEM",
        ipAddress: "SYSTEM",
        userAgent: "SYSTEM",
        deviceId: "SYSTEM",
      }
    );
  }
}
