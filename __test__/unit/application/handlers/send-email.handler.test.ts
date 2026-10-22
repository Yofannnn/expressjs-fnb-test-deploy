import { SendEmailHandler } from "@/infrastructure/events/handlers/send-email.handler";
import { EmailSender } from "@/application/ports/driven/email";
import { Logger } from "@/application/ports/driven/logger";
import { EnrichedDomainEvent } from "@/application/ports/driven/event-processing";
import { DomainEventType } from "@/domain/types/domain-event-type.enum";
import { EventExecutionStrategy } from "@/application/ports/driven/event-dispatcher";
import { RequestContext } from "@/application/ports/driven/request-context";
import { UserRepository } from "@/application/ports/driven/user.repository";
import { OrderRepository } from "@/application/ports/driven/order.repository";
import { User } from "@/domain/entities/user.entity";
import { Order } from "@/domain/entities/order.entity";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { OrderType } from "@/domain/types/order-type.enum";
import { DeliveryType } from "@/domain/types/delivery-type.enum";
import { OrderStatus } from "@/domain/types/order-status.enum";
import { PaymentStatus } from "@/domain/types/payment-status.enum";
import { OrderCustomerType } from "@/domain/types/order-customer-type.enum";

describe("SendEmailHandler", () => {
  let handler: SendEmailHandler;
  let mockEmailSender: jest.Mocked<EmailSender>;
  let mockLogger: jest.Mocked<Logger>;
  let mockRequestContext: jest.Mocked<RequestContext>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  const mockRequestContextData = {
    requestId: "test-request-id-123",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0 (Test Browser)",
    deviceId: "device-123",
  };

  const mockUser: User = {
    getId: jest.fn().mockReturnValue("user-123"),
    getEmail: jest.fn().mockReturnValue("test@example.com"),
    getName: jest.fn().mockReturnValue("Test User"),
    getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
  } as unknown as User;

  const createMockOrder = (type: OrderType = OrderType.ONLINE): Order => {
    const now = new Date();
    return Order.rebuild({
      id: "order-123",
      customer: {
        type: type === OrderType.ONLINE ? OrderCustomerType.MEMBER : OrderCustomerType.GUEST,
        memberId: type === OrderType.ONLINE ? "member-123" : null,
        guestName: type === OrderType.ONLINE ? null : "Guest User",
        guestEmail: type === OrderType.ONLINE ? null : "guest@example.com",
      },
      type,
      fulfillment: {
        type,
        dineIn:
          type === OrderType.DINEIN
            ? {
                tableId: "table-123",
                tableNumber: "T-01",
                guestCount: 4,
                cashierSessionId: "session-456",
              }
            : null,
        online:
          type === OrderType.ONLINE
            ? {
                deliveryType: DeliveryType.DELIVERY,
                deliveryLocation: {
                  address: "Jl. Sudirman No. 1",
                  latitude: -6.2088,
                  longitude: 106.8456,
                },
                scheduledAt: new Date("2024-01-15T14:00:00Z"),
              }
            : null,
        reservation: null,
      },
      items: [
        {
          productId: "product-123",
          productName: "Test Product",
          priceSnapshot: 100000,
          quantity: 2,
          note: null,
        },
      ],
      pricing: {
        subtotal: 200000,
        tax: 20000,
        serviceCharge: 10000,
        deliveryFee: 15000,
        discount: 0,
        total: 245000,
      },
      payment: {
        status: PaymentStatus.UNPAID,
        method: null,
        paidAt: null,
        transactionId: null,
      },
      status: OrderStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  };

  const createMockEvent = (eventType: DomainEventType, payload: Record<string, unknown> = {}): EnrichedDomainEvent => ({
    eventId: "event-123",
    eventType,
    aggregateId: "user-123",
    version: 1,
    occurredOn: new Date("2024-01-01T00:00:00.000Z"),
    payload,
    processingMetadata: {
      processingId: "processing-123",
      enqueuedAt: new Date("2024-01-01T00:00:00.000Z"),
      retryCount: 0,
      processedAt: new Date("2024-01-01T00:00:01.000Z"),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockEmailSender = {
      sendAccountLocked: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
      sendPasswordChanged: jest.fn().mockResolvedValue(undefined),
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendEmailVerified: jest.fn().mockResolvedValue(undefined),
      sendOnlineOrderCreated: jest.fn().mockResolvedValue(undefined),
      sendGuestOrderTokenReissued: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<EmailSender>;

    mockRequestContext = {
      get: jest.fn().mockReturnValue(mockRequestContextData),
    } as jest.Mocked<RequestContext>;

    mockUserRepository = {
      findById: jest.fn().mockResolvedValue(mockUser),
    } as unknown as jest.Mocked<UserRepository>;

    mockOrderRepository = {
      findById: jest.fn().mockResolvedValue(createMockOrder()),
    } as unknown as jest.Mocked<OrderRepository>;

    handler = new SendEmailHandler(mockEmailSender, mockRequestContext, mockUserRepository, mockOrderRepository, mockLogger);
  });

  describe("Constructor", () => {
    it("should set handlerName correctly", () => {
      expect(handler.handlerName).toBe("SendEmailHandler");
    });

    it("should build supportedEvents map with all configured events", () => {
      const supportedEvents = handler.supportedEvents;

      const expectedEvents = [
        DomainEventType.USER_EMAIL_VERIFIED,
        DomainEventType.USER_ACCOUNT_LOCKED,
        DomainEventType.USER_PASSWORD_CHANGED,
        DomainEventType.PASSWORD_RESET_TOKEN_ISSUED,
        DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED,
        DomainEventType.VERIFICATION_EMAIL_TOKEN_REISSUED,
        DomainEventType.ONLINE_ORDER_CREATED,
        DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED,
        DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_REISSUED,
      ];

      expect(supportedEvents.size).toBe(expectedEvents.length);

      expectedEvents.forEach((eventType) => {
        expect(supportedEvents.has(eventType)).toBe(true);
      });
    });

    it("should set correct configurations for each event type", () => {
      const supportedEvents = handler.supportedEvents;

      const emailVerifiedConfig = supportedEvents.get(DomainEventType.USER_EMAIL_VERIFIED);
      expect(emailVerifiedConfig).toEqual({
        priority: 4,
        strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
        retryAttempts: 3,
        timeoutMs: 15000,
      });

      const accountLockedConfig = supportedEvents.get(DomainEventType.USER_ACCOUNT_LOCKED);
      expect(accountLockedConfig).toEqual({
        priority: 1,
        strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
        retryAttempts: 3,
        timeoutMs: 15000,
      });

      const passwordChangedConfig = supportedEvents.get(DomainEventType.USER_PASSWORD_CHANGED);
      expect(passwordChangedConfig).toEqual({
        priority: 2,
        strategy: EventExecutionStrategy.IMMEDIATE_TOLERANT,
        retryAttempts: 3,
        timeoutMs: 15000,
      });

      const passwordResetConfig = supportedEvents.get(DomainEventType.PASSWORD_RESET_TOKEN_ISSUED);
      expect(passwordResetConfig).toEqual({
        priority: 2,
        strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
        retryAttempts: 5,
        timeoutMs: 30000,
      });

      const verificationEmailConfig = supportedEvents.get(DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED);
      expect(verificationEmailConfig).toEqual({
        priority: 3,
        strategy: EventExecutionStrategy.QUEUED_BATCH,
        retryAttempts: 5,
        timeoutMs: 30000,
      });

      const verificationEmailReissuedConfig = supportedEvents.get(DomainEventType.VERIFICATION_EMAIL_TOKEN_REISSUED);
      expect(verificationEmailReissuedConfig).toEqual({
        priority: 3,
        strategy: EventExecutionStrategy.IMMEDIATE_CRITICAL,
        retryAttempts: 5,
        timeoutMs: 30000,
      });
    });

    it("should initialize with all dependencies", () => {
      const mockHandler = handler as unknown as {
        emailSender: EmailSender;
        requestContext: RequestContext;
        userRepository: UserRepository;
        orderRepository: OrderRepository;
        logger: Logger;
      };

      expect(mockHandler.emailSender).toBe(mockEmailSender);
      expect(mockHandler.requestContext).toBe(mockRequestContext);
      expect(mockHandler.userRepository).toBe(mockUserRepository);
      expect(mockHandler.orderRepository).toBe(mockOrderRepository);
      expect(mockHandler.logger).toBe(mockLogger);
    });
  });

  describe("execute", () => {
    it("should successfully handle an event and log start and success", async () => {
      const event = createMockEvent(DomainEventType.USER_EMAIL_VERIFIED, {
        userId: "user-123",
        email: "test@example.com",
        verifiedAt: new Date().toISOString(),
      });

      await handler.execute(event);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "SendEmailHandler",
        event: DomainEventType.USER_EMAIL_VERIFIED,
        message: "Event handler start",
        data: {
          processingId: event.processingMetadata?.processingId,
          attemptNumber: event.processingMetadata?.retryCount,
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "SendEmailHandler",
          event: DomainEventType.USER_EMAIL_VERIFIED,
          message: "Event handler finish",
          durationMs: expect.any(Number),
          data: {
            processingId: event.processingMetadata?.processingId,
            attemptNumber: event.processingMetadata?.retryCount,
          },
        }),
      );
    });

    it("should handle errors and rethrow them", async () => {
      const event = createMockEvent(DomainEventType.USER_EMAIL_VERIFIED, {
        userId: "user-123",
        email: "test@example.com",
        verifiedAt: new Date().toISOString(),
      });
      const error = new Error("Email service unavailable");

      mockEmailSender.sendEmailVerified.mockRejectedValue(error);

      await expect(handler.execute(event)).rejects.toThrow("Email service unavailable");

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "SendEmailHandler",
        event: DomainEventType.USER_EMAIL_VERIFIED,
        message: "Email service unavailable",
        stack: expect.any(String),
        data: {
          processingId: event.processingMetadata?.processingId,
          attemptNumber: event.processingMetadata?.retryCount,
        },
      });
    });

    it("should throw error if no email handler found for event type", async () => {
      const event = createMockEvent(DomainEventType.USER_CREATED, { userId: "user-123" });

      await expect(handler.execute(event)).rejects.toThrow("No email handler found for event type: USER_CREATED");
    });
  });

  describe("sendAccountLocked", () => {
    it("should send account locked email with correct parameters", async () => {
      const lockedUntil = new Date(Date.now() + 3600000);
      const event = createMockEvent(DomainEventType.USER_ACCOUNT_LOCKED, {
        userId: "user-123",
        lockedUntil,
      });

      await handler.execute(event);

      expect(mockUserRepository.findById).toHaveBeenCalledWith("user-123");
      expect(mockEmailSender.sendAccountLocked).toHaveBeenCalledWith(
        { address: "test@example.com", name: "Test User" },
        { lockedUntil, reason: "multiple_failed_attempts" },
      );
    });

    it("should not send email if user not found", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const event = createMockEvent(DomainEventType.USER_ACCOUNT_LOCKED, {
        userId: "user-123",
        lockedUntil: new Date(),
      });

      await handler.execute(event);

      expect(mockEmailSender.sendAccountLocked).not.toHaveBeenCalled();
    });
  });

  describe("sendPasswordReset", () => {
    it("should send password reset email with correct parameters", async () => {
      const rawToken = "reset-token-123";
      const createdAt = new Date();
      const expiresAt = new Date(Date.now() + 3600000);

      const event = createMockEvent(DomainEventType.PASSWORD_RESET_TOKEN_ISSUED, {
        userId: "user-123",
        email: "test@example.com",
        rawToken,
        createdAt,
        expiresAt,
      });

      await handler.execute(event);

      expect(mockUserRepository.findById).toHaveBeenCalledWith("user-123");
      expect(mockRequestContext.get).toHaveBeenCalled();
      expect(mockEmailSender.sendPasswordReset).toHaveBeenCalledWith(
        { address: "test@example.com", name: "Test User" },
        {
          expiresAt,
          requestedAt: createdAt,
          token: rawToken,
          requestIpAddress: mockRequestContextData.ipAddress,
          requestDevice: mockRequestContextData.userAgent,
        },
      );
    });

    it("should not send email if user not found", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const event = createMockEvent(DomainEventType.PASSWORD_RESET_TOKEN_ISSUED, {
        userId: "user-123",
        email: "test@example.com",
        rawToken: "token",
        createdAt: new Date(),
        expiresAt: new Date(),
      });

      await handler.execute(event);

      expect(mockEmailSender.sendPasswordReset).toHaveBeenCalledWith({ address: "test@example.com", name: undefined }, expect.any(Object));
    });
  });

  describe("sendPasswordChanged", () => {
    it("should send password changed email with correct parameters", async () => {
      const changedAt = new Date();
      const event = createMockEvent(DomainEventType.USER_PASSWORD_CHANGED, {
        userId: "user-123",
        changedAt,
      });

      await handler.execute(event);

      expect(mockUserRepository.findById).toHaveBeenCalledWith("user-123");
      expect(mockEmailSender.sendPasswordChanged).toHaveBeenCalledWith({ address: "test@example.com", name: "Test User" }, { dateTime: changedAt });
    });

    it("should not send email if user not found", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const event = createMockEvent(DomainEventType.USER_PASSWORD_CHANGED, {
        userId: "user-123",
        changedAt: new Date(),
      });

      await handler.execute(event);

      expect(mockEmailSender.sendPasswordChanged).not.toHaveBeenCalled();
    });
  });

  describe("sendVerificationEmail", () => {
    it("should send verification email for issued event", async () => {
      const rawToken = "verification-token-123";
      const expiresAt = new Date(Date.now() + 86400000);

      const event = createMockEvent(DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED, {
        userId: "user-123",
        email: "test@example.com",
        rawToken,
        expiresAt,
      });

      await handler.execute(event);

      expect(mockUserRepository.findById).toHaveBeenCalledWith("user-123");
      expect(mockEmailSender.sendVerificationEmail).toHaveBeenCalledWith(
        { address: "test@example.com", name: "Test User" },
        {
          token: rawToken,
          expiresAt,
          userName: "Test User",
          isResend: false,
        },
      );
    });

    it("should send verification email for reissued event with isResend=true", async () => {
      const rawToken = "verification-token-123";
      const expiresAt = new Date(Date.now() + 86400000);

      const event = createMockEvent(DomainEventType.VERIFICATION_EMAIL_TOKEN_REISSUED, {
        userId: "user-123",
        email: "test@example.com",
        rawToken,
        expiresAt,
      });

      await handler.execute(event);

      expect(mockEmailSender.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          isResend: true,
        }),
      );
    });

    it("should handle user not found for verification email", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const event = createMockEvent(DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED, {
        userId: "user-123",
        email: "test@example.com",
        rawToken: "token",
        expiresAt: new Date(),
      });

      await handler.execute(event);

      expect(mockEmailSender.sendVerificationEmail).toHaveBeenCalledWith(
        { address: "test@example.com", name: undefined },
        expect.objectContaining({
          userName: undefined,
        }),
      );
    });
  });

  describe("sendEmailVerified", () => {
    it("should send email verified with correct parameters", async () => {
      const verifiedAt = new Date();
      const event = createMockEvent(DomainEventType.USER_EMAIL_VERIFIED, {
        userId: "user-123",
        email: "test@example.com",
        verifiedAt,
      });

      await handler.execute(event);

      expect(mockUserRepository.findById).toHaveBeenCalledWith("user-123");
      expect(mockEmailSender.sendEmailVerified).toHaveBeenCalledWith(
        { address: "test@example.com", name: "Test User" },
        {
          verifiedAt,
          hasCompletedProfile: true,
        },
      );
    });

    it("should handle user not found for email verified", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const event = createMockEvent(DomainEventType.USER_EMAIL_VERIFIED, {
        userId: "user-123",
        email: "test@example.com",
        verifiedAt: new Date(),
      });

      await handler.execute(event);

      expect(mockEmailSender.sendEmailVerified).toHaveBeenCalledWith(
        { address: "test@example.com", name: undefined },
        expect.objectContaining({
          hasCompletedProfile: true,
        }),
      );
    });
  });

  describe("sendMemberOrderConfirmation", () => {
    it("should send order confirmation for member order", async () => {
      const order = createMockOrder(OrderType.ONLINE);
      mockOrderRepository.findById.mockResolvedValue(order);

      const event = createMockEvent(DomainEventType.ONLINE_ORDER_CREATED, {
        customer: { memberId: "member-123" },
        fulfillment: {
          deliveryType: DeliveryType.DELIVERY,
          deliveryLocation: { address: "Jl. Sudirman No. 1" },
          scheduledAt: new Date("2024-01-15T14:00:00Z"),
        },
        pricing: {
          subtotal: 200000,
          tax: 20000,
          serviceCharge: 10000,
          deliveryFee: 15000,
          total: 245000,
        },
        items: [
          {
            productId: "product-123",
            productName: "Test Product",
            priceSnapshot: 100000,
            quantity: 2,
            note: null,
          },
        ],
      });

      await handler.execute(event);

      expect(mockUserRepository.findById).toHaveBeenCalledWith("member-123");
      expect(mockEmailSender.sendOnlineOrderCreated).toHaveBeenCalledWith(
        { address: "test@example.com", name: "Test User" },
        {
          isGuest: false,
          orderId: "user-123",
          deliveryType: DeliveryType.DELIVERY,
          deliveryAddress: "Jl. Sudirman No. 1",
          serviceCharge: 10000,
          tax: 20000,
          subtotal: 200000,
          total: 245000,
          deliveryFee: 15000,
          scheduledAt: new Date("2024-01-15T14:00:00Z"),
          items: [
            {
              productId: "product-123",
              productName: "Test Product",
              priceSnapshot: 100000,
              quantity: 2,
              note: null,
            },
          ],
        },
      );
    });

    it("should not send order confirmation if no memberId", async () => {
      const event = createMockEvent(DomainEventType.ONLINE_ORDER_CREATED, {
        customer: { guestName: "Guest", guestEmail: "guest@example.com" },
        fulfillment: { deliveryType: DeliveryType.DELIVERY },
        pricing: { subtotal: 0, tax: 0, serviceCharge: 0, deliveryFee: 0, total: 0 },
        items: [],
      });

      await handler.execute(event);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockEmailSender.sendOnlineOrderCreated).not.toHaveBeenCalled();
    });

    it("should handle user not found for member order", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const event = createMockEvent(DomainEventType.ONLINE_ORDER_CREATED, {
        customer: { memberId: "member-123" },
        fulfillment: { deliveryType: DeliveryType.DELIVERY },
        pricing: { subtotal: 0, tax: 0, serviceCharge: 0, deliveryFee: 0, total: 0 },
        items: [],
      });

      await handler.execute(event);

      expect(mockEmailSender.sendOnlineOrderCreated).not.toHaveBeenCalled();
    });
  });

  describe("sendGuestOrderConfirmation", () => {
    it("should send order confirmation for guest order", async () => {
      const order = createMockOrder(OrderType.ONLINE);
      const mockOrderWithGuest = {
        ...order,
        getCustomer: jest.fn().mockReturnValue({
          getGuestName: jest.fn().mockReturnValue("Guest User"),
          getGuestEmail: jest.fn().mockReturnValue("guest@example.com"),
          getMemberId: jest.fn().mockReturnValue(null),
          isGuest: jest.fn().mockReturnValue(true),
        }),
        getType: jest.fn().mockReturnValue(OrderType.ONLINE),
        getFulfillment: order.getFulfillment,
        getPricing: order.getPricing,
        getItems: order.getItems,
      } as unknown as Order;

      mockOrderRepository.findById.mockResolvedValue(mockOrderWithGuest);

      const event = createMockEvent(DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED, {
        orderId: "order-123",
        email: "guest@example.com",
        rawToken: "guest-token-123",
      });

      await handler.execute(event);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith("order-123");
      expect(mockEmailSender.sendOnlineOrderCreated).toHaveBeenCalledWith(
        { address: "guest@example.com", name: "Guest User" },
        {
          guestToken: "guest-token-123",
          isGuest: true,
          orderId: "order-123",
          deliveryType: DeliveryType.DELIVERY,
          deliveryAddress: "Jl. Sudirman No. 1",
          serviceCharge: 10000,
          tax: 20000,
          subtotal: 200000,
          total: 245000,
          deliveryFee: 15000,
          scheduledAt: expect.any(Date),
          items: expect.any(Array),
        },
      );
    });

    it("should not send order confirmation if order not found", async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      const event = createMockEvent(DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED, {
        orderId: "order-123",
        email: "guest@example.com",
        rawToken: "guest-token-123",
      });

      await handler.execute(event);

      expect(mockEmailSender.sendOnlineOrderCreated).not.toHaveBeenCalled();
    });

    it("should not send order confirmation for non-ONLINE order", async () => {
      const order = createMockOrder(OrderType.DINEIN);
      mockOrderRepository.findById.mockResolvedValue(order);

      const event = createMockEvent(DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED, {
        orderId: "order-123",
        email: "guest@example.com",
        rawToken: "guest-token-123",
      });

      await handler.execute(event);

      expect(mockEmailSender.sendOnlineOrderCreated).not.toHaveBeenCalled();
    });
  });

  describe("sendGuestOrderTokenReissued", () => {
    it("should send guest order token reissued email", async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      const event = createMockEvent(DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_REISSUED, {
        orderId: "order-123",
        email: "guest@example.com",
        rawToken: "guest-token-123",
        expiresAt,
      });

      await handler.execute(event);

      expect(mockEmailSender.sendGuestOrderTokenReissued).toHaveBeenCalledWith(
        { address: "guest@example.com" },
        { guestToken: "guest-token-123", orderId: "order-123", expiresAt },
      );
    });
  });

  describe("getSupportedEmailTypes", () => {
    it("should return all supported email types", () => {
      const supportedTypes = handler.getSupportedEmailTypes();

      expect(supportedTypes).toContain(DomainEventType.USER_EMAIL_VERIFIED);
      expect(supportedTypes).toContain(DomainEventType.USER_ACCOUNT_LOCKED);
      expect(supportedTypes).toContain(DomainEventType.USER_PASSWORD_CHANGED);
      expect(supportedTypes).toContain(DomainEventType.PASSWORD_RESET_TOKEN_ISSUED);
      expect(supportedTypes).toContain(DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED);
      expect(supportedTypes).toContain(DomainEventType.VERIFICATION_EMAIL_TOKEN_REISSUED);
      expect(supportedTypes).toContain(DomainEventType.ONLINE_ORDER_CREATED);
      expect(supportedTypes).toContain(DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED);
      expect(supportedTypes).toContain(DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_REISSUED);
      expect(supportedTypes.length).toBe(9);
    });
  });

  describe("RequestContext integration", () => {
    it("should use request context for IP and user agent in password reset", async () => {
      const customContext = {
        requestId: "custom-req-456",
        ipAddress: "10.0.0.1",
        userAgent: "CustomAgent/2.0",
        deviceId: "custom-device-456",
      };

      mockRequestContext.get.mockReturnValue(customContext);

      const event = createMockEvent(DomainEventType.PASSWORD_RESET_TOKEN_ISSUED, {
        userId: "user-123",
        email: "test@example.com",
        rawToken: "token",
        createdAt: new Date(),
        expiresAt: new Date(),
      });

      await handler.execute(event);

      expect(mockEmailSender.sendPasswordReset).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          requestIpAddress: "10.0.0.1",
          requestDevice: "CustomAgent/2.0",
        }),
      );
    });
  });

  describe("Error scenarios", () => {
    it("should handle database errors when fetching user", async () => {
      const error = new Error("Database connection failed");
      mockUserRepository.findById.mockRejectedValue(error);

      const event = createMockEvent(DomainEventType.USER_EMAIL_VERIFIED, {
        userId: "user-123",
        email: "test@example.com",
        verifiedAt: new Date(),
      });

      await expect(handler.execute(event)).rejects.toThrow("Database connection failed");
    });

    it("should handle database errors when fetching order", async () => {
      const error = new Error("Database connection failed");
      mockOrderRepository.findById.mockRejectedValue(error);

      const event = createMockEvent(DomainEventType.GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED, {
        orderId: "order-123",
        email: "guest@example.com",
        rawToken: "token",
      });

      await expect(handler.execute(event)).rejects.toThrow("Database connection failed");
    });

    it("should handle email sender errors gracefully", async () => {
      const error = new Error("Email service unavailable");
      mockEmailSender.sendEmailVerified.mockRejectedValue(error);

      const event = createMockEvent(DomainEventType.USER_EMAIL_VERIFIED, {
        userId: "user-123",
        email: "test@example.com",
        verifiedAt: new Date(),
      });

      await expect(handler.execute(event)).rejects.toThrow("Email service unavailable");
    });
  });

  describe("Integration with BaseEventHandler", () => {
    it("should handle events with retry attempts metadata", async () => {
      const event = createMockEvent(DomainEventType.USER_EMAIL_VERIFIED, {
        userId: "user-123",
        email: "test@example.com",
        verifiedAt: new Date(),
      });
      (event.processingMetadata as unknown as { retryCount: number }).retryCount = 2;

      await handler.execute(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attemptNumber: 2,
          }),
        }),
      );
    });

    it("should handle events with missing processingMetadata", async () => {
      const event = createMockEvent(DomainEventType.USER_EMAIL_VERIFIED, {
        userId: "user-123",
        email: "test@example.com",
        verifiedAt: new Date(),
      });
      (event.processingMetadata as unknown) = undefined;

      await handler.execute(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            processingId: undefined,
            attemptNumber: undefined,
          }),
        }),
      );
    });
  });

  describe("Additional coverage scenarios", () => {
    it("should handle verification email with expiresAt as string", async () => {
      const event = createMockEvent(DomainEventType.VERIFICATION_EMAIL_TOKEN_ISSUED, {
        userId: "user-123",
        email: "test@example.com",
        rawToken: "token",
        expiresAt: new Date().toISOString(),
      });

      await handler.execute(event);

      expect(mockEmailSender.sendVerificationEmail).toHaveBeenCalled();
    });

    it("should handle online order created with pickup delivery type", async () => {
      const order = createMockOrder(OrderType.ONLINE);
      mockOrderRepository.findById.mockResolvedValue(order);

      const event = createMockEvent(DomainEventType.ONLINE_ORDER_CREATED, {
        customer: { memberId: "member-123" },
        fulfillment: {
          deliveryType: DeliveryType.PICKUP,
          deliveryLocation: null,
          scheduledAt: null,
        },
        pricing: { subtotal: 0, tax: 0, serviceCharge: 0, deliveryFee: 0, total: 0 },
        items: [],
      });

      await handler.execute(event);

      expect(mockEmailSender.sendOnlineOrderCreated).toHaveBeenCalled();
    });

    it("should handle multiple events in sequence", async () => {
      const events = [
        createMockEvent(DomainEventType.USER_EMAIL_VERIFIED, {
          userId: "user-123",
          email: "test@example.com",
          verifiedAt: new Date(),
        }),
        createMockEvent(DomainEventType.USER_ACCOUNT_LOCKED, {
          userId: "user-123",
          lockedUntil: new Date(),
        }),
      ];

      for (const event of events) {
        await handler.execute(event);
      }

      expect(mockEmailSender.sendEmailVerified).toHaveBeenCalledTimes(1);
      expect(mockEmailSender.sendAccountLocked).toHaveBeenCalledTimes(1);
    });
  });
});
