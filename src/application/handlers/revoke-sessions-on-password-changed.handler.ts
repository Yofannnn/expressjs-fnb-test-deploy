import { EventHandlerOptions } from "@/application/ports/driven/event-handler.port";
import { DomainEventType } from "@/domain/types/domain-event.type";
import { BaseEventHandler } from "./base.handler";
import { EventExecutionStrategy } from "@/application/ports/driven/event-handler.port";
import { SessionRepositoryPort } from "@/application/ports/driven/session.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UserPasswordChangedEvent } from "@/domain/events/user.events";

export class RevokeSessionsOnPasswordChangedHandler extends BaseEventHandler {
  readonly handlerName = "RevokeSessionsOnPasswordChangedHandler";
  readonly supportedEvents: Map<DomainEventType, EventHandlerOptions>;

  constructor(
    private readonly repo: SessionRepositoryPort,
    protected readonly logger: LoggerPort,
  ) {
    super(logger);
    this.supportedEvents = this.buildSupportedEvents();
  }

  protected async handle(event: UserPasswordChangedEvent): Promise<void> {
    await this.repo.revokeAllSessionsForUser(event.aggregateId, "Password changed");
  }

  private buildSupportedEvents(): Map<DomainEventType, EventHandlerOptions> {
    const config: EventHandlerOptions = {
      priority: 1,
      strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
      retryAttempts: 3,
      timeoutMs: 15000,
    };

    const supportedEventsMap: Map<DomainEventType, EventHandlerOptions> = new Map();
    supportedEventsMap.set(DomainEventType.USER_PASSWORD_CHANGED, config);

    return supportedEventsMap;
  }
}
