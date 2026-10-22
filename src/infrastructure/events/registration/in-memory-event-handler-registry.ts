import { EventHandlerRegistration, NormalizedEventHandler } from "./event-handler-registration.type";
import { EventHandlerPort } from "@/application/ports/driven/event-handler.port";
import { DomainEventType } from "@/domain/types/domain-event.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { RecordUserActivityHandler } from "@/application/handlers/record-user-activity.handler";
import { SendEmailHandler } from "@/application/handlers/send-email.handler";
import { RevokeSessionsOnPasswordChangedHandler } from "@/application/handlers/revoke-sessions-on-password-changed.handler";

export class InMemoryEventHandlerRegistry implements EventHandlerRegistration {
  readonly handlers: Map<DomainEventType, NormalizedEventHandler[]> = new Map();
  private readonly handlerIndex: Map<string, EventHandlerPort> = new Map();

  constructor(
    private readonly recordUserActivityHandler: RecordUserActivityHandler,
    private readonly sendEmailHandler: SendEmailHandler,
    private readonly revokeSessionsOnPasswordChangedHandler: RevokeSessionsOnPasswordChangedHandler,
    private readonly logger: LoggerPort,
  ) {
    this.init();
  }

  private init(): void {
    try {
      const handlers = this.buildHandlers();
      handlers.forEach((handler) => this.registerHandler(handler));

      this.logger.info({
        context: "InMemoryEventHandlerRegistry",
        event: "INITIALIZATION_COMPLETE",
        message: `Successfully registered ${handlers.length} handlers`,
        data: { totalHandlers: handlers.length },
      });
    } catch (error) {
      this.logger.error({
        context: "InMemoryEventHandlerRegistry",
        event: "INITIALIZATION_FAILED",
        message: "Failed to initialize event handlers",
        data: { error: error instanceof Error ? error.message : "Unknown error" },
      });
      throw error;
    }
  }

  registerHandler(handler: EventHandlerPort): void {
    try {
      if (this.handlerIndex.has(handler.handlerName)) {
        throw new Error(`Handler with id ${handler.handlerName} is already registered`);
      }

      for (const [eventType, config] of handler.supportedEvents.entries()) {
        if (!this.handlers.has(eventType)) {
          this.handlers.set(eventType, []);
        }

        this.handlers.get(eventType)!.push({
          eventType,
          handlerName: handler.handlerName,
          handler: handler.execute.bind(handler),
          options: config,
          registeredAt: new Date(),
        });
      }

      this.handlerIndex.set(handler.handlerName, handler);

      this.logger.debug({
        context: "InMemoryEventHandlerRegistry",
        event: "HANDLER_REGISTERED",
        message: `Registered handler ${handler.handlerName}`,
        data: {
          handlerName: handler.handlerName,
          supportedEvents: Array.from(handler.supportedEvents.keys()),
        },
      });
    } catch (error) {
      this.logger.error({
        context: "InMemoryEventHandlerRegistry",
        event: "HANDLER_REGISTRATION_FAILED",
        message: `Failed to register handler: ${error instanceof Error ? error.message : "Unknown error"}`,
        data: { handlerName: handler.handlerName },
      });
      throw error;
    }
  }

  unregisterHandler(handlerName: string): boolean {
    const handler = this.handlerIndex.get(handlerName);
    if (!handler) return false;

    for (const eventType of handler.supportedEvents.keys()) {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.findIndex((h) => h.handlerName === handlerName);
        if (index !== -1) {
          handlers.splice(index, 1);
          if (handlers.length === 0) {
            this.handlers.delete(eventType);
          }
        }
      }
    }

    this.handlerIndex.delete(handlerName);

    this.logger.debug({
      context: "InMemoryEventHandlerRegistry",
      event: "HANDLER_UNREGISTERED",
      message: `Unregistered handler ${handler.handlerName}`,
      data: { eventTypes: Array.from(handler.supportedEvents.keys()) },
    });

    return true;
  }

  getNormalizedHandler(handlerName: string, eventType: DomainEventType): NormalizedEventHandler | undefined {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return undefined;
    return handlers.find((h) => h.handlerName === handlerName);
  }

  getHandlersForEvent(eventType: DomainEventType): NormalizedEventHandler[] {
    const handlers = this.handlers.get(eventType) || [];
    return [...handlers].sort((a, b) => a.options.priority - b.options.priority);
  }
  getHandlerByName(handlerName: string): EventHandlerPort | undefined {
    return this.handlerIndex.get(handlerName);
  }

  isHandlerRegistered(handlerName: string): boolean {
    return this.handlerIndex.has(handlerName);
  }

  private buildHandlers(): EventHandlerPort[] {
    return [this.recordUserActivityHandler, this.sendEmailHandler, this.revokeSessionsOnPasswordChangedHandler];
  }
}
