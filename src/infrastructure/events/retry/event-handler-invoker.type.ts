import { DomainEvent } from "@/domain/types/domain-event.type";

export interface EventHandlerInvoker {
  invoke(handlerName: string, event: DomainEvent): Promise<void>;
}
