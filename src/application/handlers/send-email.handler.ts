import { DomainEvent } from "@/domain/types/domain-event.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { BaseEventHandler } from "./base.handler";
import { DomainEventType } from "@/domain/types/domain-event.type";
import { EmailSenderPort } from "@/application/ports/driven/email-sender.port";
import { EventExecutionStrategy } from "@/application/ports/driven/event-handler.port";
import { EventHandlerOptions } from "@/application/ports/driven/event-handler.port";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { OrderType } from "@/domain/types/order.type";
import { OnlineOrderCreatedEvent } from "@/domain/events/order.events";
import { UserAccountLockedEvent, UserEmailVerifiedEvent, UserPasswordChangedEvent } from "@/domain/events/user.events";
import {
  GuestOrderManagementTokenIssuedEvent,
  GuestOrderManagementTokenReissuedEvent,
  PasswordResetTokenIssuedEvent,
  VerificationEmailTokenIssuedEvent,
  VerificationEmailTokenReissuedEvent,
} from "@/domain/events/application-token.events";

export class SendEmailHandler extends BaseEventHandler {
  readonly handlerName = "SendEmailHandler";
  readonly supportedEvents: Map<DomainEventType, EventHandlerOptions>;

  private readonly emailHandlers: Map<DomainEventType, (event: DomainEvent<unknown>) => Promise<void>>;

  constructor(
    private readonly emailSender: EmailSenderPort,
    private readonly requestContext: RequestContextPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly orderRepository: OrderRepositoryPort,
    protected readonly logger: LoggerPort,
  ) {
    super(logger);

    const { supportedEvents, emailHandlers } = this.buildSupportedEventAndEmailHandler();
    this.supportedEvents = supportedEvents;
    this.emailHandlers = emailHandlers;
  }

  protected async handle(event: DomainEvent<unknown>): Promise<void> {
    const handler = this.emailHandlers.get(event.eventType);
    if (!handler) throw new Error(`No email handler found for event type: ${event.eventType}`);

    await handler(event);
  }

  private async sendAccountLocked(event: UserAccountLockedEvent): Promise<void> {
    const { lockedUntil } = event.payload;

    const user = await this.userRepository.findById(event.aggregateId);
    if (!user) return;

    await this.emailSender.sendAccountLocked({ address: user.getEmail(), name: user.getName() }, { lockedUntil, reason: "multiple_failed_attempts" });
  }

  private async sendPasswordReset(event: PasswordResetTokenIssuedEvent): Promise<void> {
    const { email, rawToken, createdAt, expiresAt } = event.payload;
    const requestContextData = this.requestContext.get();

    const user = await this.userRepository.findById(event.aggregateId);
    const name = user ? user.getName() : undefined;

    await this.emailSender.sendPasswordReset(
      { address: email, name },
      {
        expiresAt: new Date(expiresAt),
        requestedAt: createdAt,
        token: rawToken,
        requestIpAddress: requestContextData.ipAddress,
        requestDevice: requestContextData.userAgent,
      },
    );
  }

  private async sendPasswordChanged(event: UserPasswordChangedEvent): Promise<void> {
    const { changedAt } = event.payload;

    const user = await this.userRepository.findById(event.aggregateId);
    if (!user) return;

    await this.emailSender.sendPasswordChanged({ address: user.getEmail(), name: user.getName() }, { dateTime: changedAt });
  }

  private async sendVerificationEmail(event: VerificationEmailTokenIssuedEvent | VerificationEmailTokenReissuedEvent): Promise<void> {
    const { email, rawToken, expiresAt } = event.payload;

    const user = await this.userRepository.findById(event.aggregateId);
    const userName = user ? user.getName() : undefined;

    await this.emailSender.sendVerificationEmail(
      { address: email, name: userName },
      {
        token: rawToken,
        expiresAt: new Date(expiresAt),
        userName,
        isResend: event.eventType === DomainEventType.VERIFICATION_EMAIL_TOKEN_REISSUED,
      },
    );
  }

  private async sendEmailVerified(event: UserEmailVerifiedEvent): Promise<void> {
    const { email, verifiedAt } = event.payload;

    const user = await this.userRepository.findById(event.aggregateId);
    const name = user ? user.getName() : undefined;

    await this.emailSender.sendEmailVerified(
      { address: email, name },
      {
        verifiedAt,
        hasCompletedProfile: true, // TODO
      },
    );
  }

  private async sendMemberOrderConfirmation(event: OnlineOrderCreatedEvent): Promise<void> {
    const { customer, fulfillment, pricing, items } = event.payload;

    if (!("memberId" in customer) || !customer.memberId) return;

    const user = await this.userRepository.findById(customer.memberId);
    if (!user) return;

    await this.emailSender.sendOnlineOrderCreated(
      { address: user.getEmail(), name: user.getName() },
      {
        isGuest: false,
        orderId: event.aggregateId,
        deliveryType: fulfillment.deliveryType,
        deliveryAddress: fulfillment.deliveryLocation?.address,
        serviceCharge: pricing.serviceCharge,
        tax: pricing.tax,
        subtotal: pricing.subtotal,
        total: pricing.total,
        deliveryFee: pricing.deliveryFee,
        scheduledAt: fulfillment.scheduledAt || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          priceSnapshot: item.priceSnapshot,
          quantity: item.quantity,
          note: item.note,
        })),
      },
    );
  }

  private async sendGuestOrderConfirmation(event: GuestOrderManagementTokenIssuedEvent): Promise<void> {
    const { orderId, email, rawToken } = event.payload;

    const order = await this.orderRepository.findById(orderId);
    if (!order) return;

    if (order.getType() === OrderType.ONLINE) {
      await this.emailSender.sendOnlineOrderCreated(
        { address: email, name: order.getCustomer().getGuestName()! },
        {
          guestToken: rawToken,
          orderId,
          deliveryType: order.getFulfillment().asOnline().getDeliveryType(),
          isGuest: true,
          deliveryAddress: order.getFulfillment().asOnline().getDeliveryLocation()?.getAddress(),
          serviceCharge: order.getPricing().getServiceCharge().getAmount(),
          subtotal: order.getPricing().getSubtotal().getAmount(),
          total: order.getPricing().getTotal().getAmount(),
          tax: order.getPricing().getTax().getAmount(),
          deliveryFee: order.getPricing().getDeliveryFee().getAmount(),
          scheduledAt: order.getFulfillment().asOnline().getScheduledAt() || undefined,
          items: order.getItems().map((item) => ({
            productId: item.getProductId(),
            productName: item.getProductName(),
            priceSnapshot: item.getPriceSnapshot().getAmount(),
            quantity: item.getQuantity(),
            note: item.getNote(),
          })),
        },
      );
    }

    // if (order.getType() === OrderType.RESERVATION) {}
  }

  private async sendGuestOrderTokenReissued(event: GuestOrderManagementTokenReissuedEvent): Promise<void> {
    const { orderId, email, rawToken, expiresAt } = event.payload;

    await this.emailSender.sendGuestOrderTokenReissued({ address: email }, { guestToken: rawToken, orderId, expiresAt });
  }

  getSupportedEmailTypes(): string[] {
    return Array.from(this.emailHandlers.keys());
  }

  private buildSupportedEventAndEmailHandler() {
    const eventTypeAndHandlerWithConfig = new Map<
      DomainEventType,
      {
        handler: (event: DomainEvent<unknown>) => Promise<void>;
        config: EventHandlerOptions;
      }
    >([
      [
        DomainEventType.USER_EMAIL_VERIFIED,
        {
          handler: (event) => this.sendEmailVerified(event as UserEmailVerifiedEvent),
          config: { priority: 4, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3, timeoutMs: 15000 },
        },
      ],
      [
        DomainEventType.USER_ACCOUNT_LOCKED,
        {
          handler: (event) => this.sendAccountLocked(event as UserAccountLockedEvent),
          config: { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3, timeoutMs: 15000 },
        },
      ],
      [
        DomainEventType.USER_PASSWORD_CHANGED,
        {
          handler: (event) => this.sendPasswordChanged(event as UserPasswordChangedEvent),
          config: { priority: 2, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3, timeoutMs: 15000 },
        },
      ],
      [
        DomainEventType.PASSWORD_RESET_TOKEN_ISSUED,
        {
          handler: (event) => this.sendPasswordReset(event as PasswordResetTokenIssuedEvent),
          config: { priority: 2, strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, retryAttempts: 5, timeoutMs: 30000 },
        },
      ],
      [
        DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED,
        {
          handler: (event) => this.sendVerificationEmail(event as VerificationEmailTokenIssuedEvent),
          config: { priority: 3, strategy: EventExecutionStrategy.QUEUED_BATCH, retryAttempts: 5, timeoutMs: 30000 },
        },
      ],
      [
        DomainEventType.VERIFICATION_EMAIL_TOKEN_REISSUED,
        {
          handler: (event) => this.sendVerificationEmail(event as VerificationEmailTokenReissuedEvent),
          config: { priority: 3, strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, retryAttempts: 5, timeoutMs: 30000 },
        },
      ],
      [
        DomainEventType.ONLINE_ORDER_CREATED,
        {
          handler: (event) => this.sendMemberOrderConfirmation(event as OnlineOrderCreatedEvent),
          config: { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT, retryAttempts: 3, timeoutMs: 15000 },
        },
      ],
      [
        DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED,
        {
          handler: (event) => this.sendGuestOrderConfirmation(event as GuestOrderManagementTokenIssuedEvent),
          config: { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, retryAttempts: 3, timeoutMs: 15000 },
        },
      ],
      [
        DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_REISSUED,
        {
          handler: (event) => this.sendGuestOrderTokenReissued(event as GuestOrderManagementTokenReissuedEvent),
          config: { priority: 1, strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL, retryAttempts: 3, timeoutMs: 15000 },
        },
      ],
    ]);

    const supportedEvents = new Map<DomainEventType, EventHandlerOptions>();
    const emailHandlers = new Map<DomainEventType, (event: DomainEvent<unknown>) => Promise<void>>();

    for (const [eventType, { handler, config }] of eventTypeAndHandlerWithConfig) {
      supportedEvents.set(eventType, config);
      emailHandlers.set(eventType, handler);
    }

    return { supportedEvents, emailHandlers };
  }
}
