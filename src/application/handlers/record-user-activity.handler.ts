import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UserActivity } from "@/domain/value-objects/user-activity.vo";
import { BaseEventHandler } from "./base.handler";
import { EventHandlerOptions } from "@/application/ports/driven/event-handler.port";
import { EventExecutionStrategy } from "@/application/ports/driven/event-handler.port";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { UserActivityRepositoryPort } from "../ports/driven/user-activity.repository.port";
import { DomainEventType } from "@/domain/types/domain-event.type";
import { UserActivityType } from "@/domain/types/user.type";

export class RecordUserActivityHandler extends BaseEventHandler {
  private readonly eventToActivityMap = new Map<DomainEventType, { activityType: UserActivityType; description: string }>([
    [DomainEventType.USER_CREATED, { activityType: UserActivityType.REGISTERED, description: "User account created successfully" }],
    [DomainEventType.USER_ACTIVATED, { activityType: UserActivityType.ACCOUNT_ACTIVATED, description: "User account activated" }],
    [DomainEventType.USER_SUSPENDED, { activityType: UserActivityType.ACCOUNT_SUSPENDED, description: "User account suspended" }],
    [DomainEventType.USER_BANNED, { activityType: UserActivityType.ACCOUNT_BANNED, description: "User account banned" }],
    [DomainEventType.USER_DEACTIVATED, { activityType: UserActivityType.ACCOUNT_DEACTIVATED, description: "User account deactivated" }],
    [DomainEventType.USER_ACCOUNT_LOCKED, { activityType: UserActivityType.ACCOUNT_LOCKED, description: "User account locked for security reasons" }],
    [DomainEventType.USER_ACCOUNT_UNLOCKED, { activityType: UserActivityType.ACCOUNT_UNLOCKED, description: "User account unlocked" }],
    [DomainEventType.USER_LOGGED_IN, { activityType: UserActivityType.LOGGED_IN, description: "User successfully logged in" }],
    [DomainEventType.USER_LOGGED_OUT, { activityType: UserActivityType.LOGGED_OUT, description: "User logged out" }],
    [DomainEventType.USER_EMAIL_CHANGED, { activityType: UserActivityType.EMAIL_CHANGED, description: "User email address changed" }],
    [DomainEventType.USER_EMAIL_VERIFIED, { activityType: UserActivityType.EMAIL_VERIFIED, description: "User email address verified" }],
    [DomainEventType.USER_PROFILE_UPDATED, { activityType: UserActivityType.PROFILE_UPDATED, description: "User profile information updated" }],
    [DomainEventType.USER_ROLE_CHANGED, { activityType: UserActivityType.ROLE_CHANGED, description: "User role/permissions changed" }],
    [DomainEventType.USER_PASSWORD_CHANGED, { activityType: UserActivityType.PASSWORD_CHANGED, description: "User password changed" }],
    [DomainEventType.PASSWORD_RESET_TOKEN_ISSUED, { activityType: UserActivityType.PASSWORD_RESET, description: "User password reset" }],
    [DomainEventType.SESSION_CREATED, { activityType: UserActivityType.SESSION_REFRESHED, description: "User session refreshed" }],
  ]);

  readonly handlerName = "RecordUserActivityHandler";
  readonly supportedEvents: Map<DomainEventType, EventHandlerOptions>;

  constructor(
    private readonly userActivityRepository: UserActivityRepositoryPort,
    private readonly requestContext: RequestContextPort,
    protected readonly logger: LoggerPort,
  ) {
    super(logger);
    this.supportedEvents = this.buildSupportedEvents();
  }

  protected async handle(event: DomainEvent<unknown>): Promise<void> {
    const activity = this.createUserActivity(event);
    await this.userActivityRepository.insert(activity);
  }

  private buildSupportedEvents(): Map<DomainEventType, EventHandlerOptions> {
    const config: EventHandlerOptions = {
      strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
      priority: 5,
      retryAttempts: 2,
    };

    const supportedEventsMap: Map<DomainEventType, EventHandlerOptions> = new Map();

    for (const [key] of this.eventToActivityMap) {
      supportedEventsMap.set(key, config);
    }

    return supportedEventsMap;
  }

  private createUserActivity(event: DomainEvent<unknown>): UserActivity {
    const getActivity = this.eventToActivityMap.get(event.eventType);
    if (!getActivity) throw new Error(`No activity type mapping found for event: ${event.eventType}`);

    const payload = event.payload;
    const userId = payload && typeof payload === "object" && "userId" in payload ? (payload.userId as string) : event.aggregateId;
    const { activityType, description } = getActivity;
    const enrichedDescription = this.enrichDescription(description, event);
    const requestContextData = this.requestContext.get();

    return UserActivity.create({
      userId,
      action: activityType,
      ipAddress: requestContextData.ipAddress,
      userAgent: requestContextData.userAgent,
      occurredAt: event.occurredOn,
      description: enrichedDescription,
      metadata: {
        eventType: event.eventType,
        eventVersion: event.version,
        processingContext: {
          requestId: requestContextData.requestId,
          processedAt: new Date(),
          handlerName: this.handlerName,
        },
      },
    });
  }

  private enrichDescription(baseDescription: string, event: DomainEvent<unknown>): string {
    if (event.payload && typeof event.payload === "object") {
      const payload = event.payload;

      if ("source" in payload || "reason" in payload) {
        const contextInfo: string[] = [];

        if ("source" in payload && payload.source) contextInfo.push(`via ${payload.source}`);
        if ("reason" in payload && payload.reason) contextInfo.push(`reason: ${payload.reason}`);
        if (contextInfo.length > 0) return `${baseDescription} (${contextInfo.join(", ")})`;
      }
    }

    return baseDescription;
  }
}
