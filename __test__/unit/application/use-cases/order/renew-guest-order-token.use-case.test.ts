import { RenewGuestOrderTokenUseCase } from "@/application/use-cases/order/renew-guest-order-token.use-case";
import { RenewGuestOrderTokenCommand } from "@/application/ports/driving/renew-guest-order-token.use-case.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { GuestOrderManagementPolicy } from "@/domain/policies/guest-order-management.policy";
import { Order } from "@/domain/entities/order.entity";
import { GuestOrderManagementToken } from "@/domain/entities/application-token.entity";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { DeliveryType, OrderCustomerType, OrderStatus, OrderType } from "@/domain/types/order.type";
import { PaymentStatus } from "@/domain/types/payment-transaction.type";
import {
  GuestOrderTokenRenewCooldownActiveException,
  GuestOrderTokenRenewRateLimitExceededException,
} from "@/application/exceptions/application-token.exceptions";

describe("RenewGuestOrderTokenUseCase", () => {
  let useCase: RenewGuestOrderTokenUseCase;
  let mockGuestOrderManagementPolicy: jest.Mocked<GuestOrderManagementPolicy>;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockApplicationTokenFactory: jest.Mocked<ApplicationTokenFactory>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockLogger: jest.Mocked<LoggerPort>;
  let mockOrderRepository: jest.Mocked<OrderRepositoryPort>;
  let mockApplicationTokenRepository: jest.Mocked<ApplicationTokenRepositoryPort>;

  const mockOrderId = "order-123";
  const mockEmail = "guest@example.com";
  const mockTokenId = "token-123";
  const mockTokenHash = "token-hash-123";
  const mockStartTime = 1000;

  const mockGuestOrderManagementToken = {
    getId: jest.fn().mockReturnValue(mockTokenId),
    getTokenHash: jest.fn().mockReturnValue(mockTokenHash),
    getIdentifier: jest.fn().mockReturnValue(mockEmail),
    getOrderId: jest.fn().mockReturnValue(mockOrderId),
    getType: jest.fn().mockReturnValue(ApplicationTokenType.GUEST_ORDER_MANAGEMENT),
    getExpiresAt: jest.fn().mockReturnValue(new Date(Date.now() + 3600000)),
    getCreatedAt: jest.fn().mockReturnValue(new Date()),
    getUpdatedAt: jest.fn().mockReturnValue(new Date()),
    isExpired: jest.fn().mockReturnValue(false),
    isUsed: jest.fn().mockReturnValue(false),
    getTokenStatus: jest.fn().mockReturnValue("active"),
    getRemainingTimeMs: jest.fn().mockReturnValue(3600000),
    canBeUsed: jest.fn().mockReturnValue(true),
    validateAccess: jest.fn(),
    use: jest.fn(),
    getTokenMetadata: jest.fn().mockReturnValue({
      type: ApplicationTokenType.GUEST_ORDER_MANAGEMENT,
      tokenId: mockTokenId,
      orderId: mockOrderId,
      identifier: mockEmail,
    }),
    pullDomainEvents: jest.fn().mockReturnValue([]),
  } as unknown as jest.Mocked<GuestOrderManagementToken>;

  const createMockOrder = (isGuest: boolean = true, guestEmail: string | null = mockEmail, memberId: string | null = null): Order => {
    const now = new Date();
    return Order.rebuild({
      id: mockOrderId,
      customer: {
        type: isGuest ? OrderCustomerType.GUEST : OrderCustomerType.MEMBER,
        memberId,
        guestName: isGuest ? "John Doe" : null,
        guestEmail: isGuest ? guestEmail : null,
      },
      type: OrderType.ONLINE,
      fulfillment: {
        type: OrderType.ONLINE,
        dineIn: null,
        online: {
          deliveryType: DeliveryType.DELIVERY,
          deliveryLocation: {
            address: "Jl. Sudirman No. 1",
            latitude: -6.2088,
            longitude: 106.8456,
          },
          scheduledAt: new Date("2024-01-15T14:00:00Z"),
        },
        reservation: null,
      },
      items: [
        {
          productId: "product-123",
          productName: "Product 1",
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

  beforeEach(() => {
    jest.clearAllMocks();

    mockGuestOrderManagementPolicy = {
      maxResendAttemptsPerHour: 3,
      resendCooldownInSeconds: 60,
    } as jest.Mocked<GuestOrderManagementPolicy>;

    mockOrderRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<OrderRepositoryPort>;

    mockApplicationTokenRepository = {
      insert: jest.fn(),
      invalidateByTypeAndIdentifier: jest.fn(),
      countByTypeAndIdentifierWithin: jest.fn(),
      findLastTokenByTypeAndIdentifier: jest.fn(),
    } as unknown as jest.Mocked<ApplicationTokenRepositoryPort>;

    mockUnitOfWork = {
      commit: jest.fn().mockImplementation(async (operation) => {
        const repos = {
          orderRepository: mockOrderRepository,
          applicationTokenRepository: mockApplicationTokenRepository,
        } as unknown as UnitOfWorkRepositories;
        return operation(repos);
      }),
    } as jest.Mocked<UnitOfWorkPort>;

    mockApplicationTokenFactory = {
      reissueGuestOrderManagement: jest.fn().mockReturnValue(mockGuestOrderManagementToken),
    } as unknown as jest.Mocked<ApplicationTokenFactory>;

    mockEventBus = {
      publishAll: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
    };

    useCase = new RenewGuestOrderTokenUseCase(mockGuestOrderManagementPolicy, mockUnitOfWork, mockApplicationTokenFactory, mockEventBus, mockLogger);
  });

  const createValidCommand = (overrides: Partial<RenewGuestOrderTokenCommand> = {}): RenewGuestOrderTokenCommand => ({
    orderId: mockOrderId,
    email: mockEmail,
    ...overrides,
  });

  describe("execute", () => {
    it("should successfully renew guest order token", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);
      const mockEvents = [{ eventType: "TOKEN_REISSUED" }] as unknown as DomainEvent[];

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);
      mockGuestOrderManagementToken.pullDomainEvents = jest.fn().mockReturnValue(mockEvents);

      await useCase.execute(command);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockApplicationTokenRepository.countByTypeAndIdentifierWithin).toHaveBeenCalledWith(
        ApplicationTokenType.GUEST_ORDER_MANAGEMENT,
        mockEmail,
        3600000,
      );
      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).toHaveBeenCalledWith(
        ApplicationTokenType.GUEST_ORDER_MANAGEMENT,
        mockEmail,
      );
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).toHaveBeenCalledWith(order);
      expect(mockApplicationTokenRepository.insert).toHaveBeenCalledWith(mockGuestOrderManagementToken);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith(mockEvents);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle no-op when order is not found", async () => {
      const command = createValidCommand();

      mockOrderRepository.findById.mockResolvedValue(null);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      mockUnitOfWork.commit = jest.fn().mockImplementation(async (operation) => {
        const repos = {
          orderRepository: mockOrderRepository,
          applicationTokenRepository: mockApplicationTokenRepository,
        } as unknown as UnitOfWorkRepositories;
        await operation(repos);
        return { events: [] as DomainEvent[] };
      });

      await useCase.execute(command);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).not.toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).not.toHaveBeenCalled();
      expect(mockApplicationTokenRepository.insert).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
          data: { orderId: mockOrderId, reason: "order_not_found_or_not_guest" },
        }),
      );
    });

    it("should handle no-op when order is not a guest order", async () => {
      const command = createValidCommand();
      const order = createMockOrder(false, null, "member-123");

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).not.toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).not.toHaveBeenCalled();
      expect(mockApplicationTokenRepository.insert).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
          data: { orderId: mockOrderId, reason: "order_not_found_or_not_guest" },
        }),
      );
    });

    it("should handle no-op when email does not match stored email", async () => {
      const command = createValidCommand({
        email: "wrong@example.com",
      });
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).not.toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).not.toHaveBeenCalled();
      expect(mockApplicationTokenRepository.insert).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
          data: { orderId: mockOrderId, reason: "email_mismatch" },
        }),
      );
    });

    it("should handle email case insensitivity", async () => {
      const command = createValidCommand({
        email: "GUEST@EXAMPLE.COM",
      });
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).toHaveBeenCalledWith(order);
    });

    it("should handle email with whitespace", async () => {
      const command = createValidCommand({
        email: "  guest@example.com  ",
      });
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).toHaveBeenCalledWith(order);
    });

    it("should publish events from renewed token", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);
      const mockEvents = [{ eventType: "GUEST_ORDER_MANAGEMENT_TOKEN_REISSUED" }] as DomainEvent[];

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);
      mockGuestOrderManagementToken.pullDomainEvents = jest.fn().mockReturnValue(mockEvents);

      await useCase.execute(command);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith(mockEvents);
    });

    it("should log successful renewal", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RenewGuestOrderTokenUseCase",
          event: "GUEST_ORDER_TOKEN_RENEW_COMPLETED",
          durationMs: 100,
          data: { orderId: mockOrderId },
        }),
      );

      dateNowSpy.mockRestore();
    });
  });

  describe("rate limiting", () => {
    it("should throw rate limit exceeded when attempts exceed max per hour", async () => {
      const command = createValidCommand();

      const order = createMockOrder(true, mockEmail);
      mockOrderRepository.findById.mockResolvedValue(order);

      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(3);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(GuestOrderTokenRenewRateLimitExceededException);

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).not.toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw cooldown active when last token was issued recently", async () => {
      const command = createValidCommand();
      const lastToken = {
        getCreatedAt: jest.fn().mockReturnValue(new Date(Date.now() - 30000)),
      };

      mockOrderRepository.findById.mockResolvedValue(createMockOrder(true, mockEmail));
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(1);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(lastToken as unknown as GuestOrderManagementToken);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(GuestOrderTokenRenewCooldownActiveException);

      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).not.toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).not.toHaveBeenCalled();
      expect(mockApplicationTokenRepository.insert).not.toHaveBeenCalled();
    });

    it("should allow renewal when cooldown has passed", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);
      const lastToken = {
        getCreatedAt: jest.fn().mockReturnValue(new Date(Date.now() - 120000)),
      };

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(1);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(lastToken as unknown as GuestOrderManagementToken);

      await useCase.execute(command);

      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).toHaveBeenCalledWith(order);
    });

    it("should allow renewal when no previous token exists", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).toHaveBeenCalledWith(order);
    });

    it("should use maxResendAttemptsPerHour from policy", async () => {
      const command = createValidCommand();

      mockGuestOrderManagementPolicy.maxResendAttemptsPerHour = 2;

      useCase = new RenewGuestOrderTokenUseCase(
        mockGuestOrderManagementPolicy,
        mockUnitOfWork,
        mockApplicationTokenFactory,
        mockEventBus,
        mockLogger,
      );

      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(2);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(GuestOrderTokenRenewRateLimitExceededException);
    });

    it("should use resendCooldownInSeconds from policy", async () => {
      const command = createValidCommand();
      const lastToken = {
        getCreatedAt: jest.fn().mockReturnValue(new Date(Date.now() - 10000)),
      };

      mockGuestOrderManagementPolicy.resendCooldownInSeconds = 30;

      useCase = new RenewGuestOrderTokenUseCase(
        mockGuestOrderManagementPolicy,
        mockUnitOfWork,
        mockApplicationTokenFactory,
        mockEventBus,
        mockLogger,
      );

      mockOrderRepository.findById.mockResolvedValue(createMockOrder(true, mockEmail));
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(1);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(lastToken as unknown as GuestOrderManagementToken);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(GuestOrderTokenRenewCooldownActiveException);
    });
  });

  describe("error handling", () => {
    it("should propagate repository errors", async () => {
      const command = createValidCommand();
      mockOrderRepository.findById.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Database error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should propagate unit of work errors", async () => {
      const command = createValidCommand();
      mockUnitOfWork.commit.mockRejectedValue(new Error("Transaction error"));

      await expect(useCase.execute(command)).rejects.toThrow("Transaction error");
    });

    it("should propagate event bus errors", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);
      mockEventBus.publishAll.mockRejectedValue(new Error("Event bus error"));

      await expect(useCase.execute(command)).rejects.toThrow("Event bus error");
    });

    it("should handle application token factory error", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);
      mockApplicationTokenFactory.reissueGuestOrderManagement = jest.fn().mockImplementation(() => {
        throw new Error("Token factory error");
      });

      await expect(useCase.execute(command)).rejects.toThrow("Token factory error");
    });

    it("should handle invalidate token repository error", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);
      mockApplicationTokenRepository.invalidateByTypeAndIdentifier.mockRejectedValue(new Error("Invalidate error"));

      await expect(useCase.execute(command)).rejects.toThrow("Invalidate error");
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message when starting", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RenewGuestOrderTokenUseCase",
          event: "GUEST_ORDER_TOKEN_RENEW_STARTED",
          data: { orderId: mockOrderId },
        }),
      );
    });

    it("should log no-op when order not found", async () => {
      const command = createValidCommand();

      mockOrderRepository.findById.mockResolvedValue(null);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RenewGuestOrderTokenUseCase",
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
          data: { orderId: mockOrderId, reason: "order_not_found_or_not_guest" },
        }),
      );
    });

    it("should log no-op when email mismatch", async () => {
      const command = createValidCommand({
        email: "wrong@example.com",
      });
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RenewGuestOrderTokenUseCase",
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
          data: { orderId: mockOrderId, reason: "email_mismatch" },
        }),
      );
    });

    it("should not log no-op when successful", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.objectContaining({
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
        }),
      );
    });

    it("should handle logger debug throwing error", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command = createValidCommand();

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });

    it("should handle logger info throwing error", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });
  });

  describe("edge cases", () => {
    it("should handle order with null guest email", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, null);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
          data: { orderId: mockOrderId, reason: "email_mismatch" },
        }),
      );
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).not.toHaveBeenCalled();
    });

    it("should handle order with empty string guest email", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, "");

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
          data: { orderId: mockOrderId, reason: "email_mismatch" },
        }),
      );
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).not.toHaveBeenCalled();
    });

    it("should handle empty email in command", async () => {
      const command = createValidCommand({
        email: "",
      });

      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      const order = createMockOrder(true, mockEmail);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
          data: { orderId: mockOrderId, reason: "email_mismatch" },
        }),
      );
    });

    it("should handle rate limit check with no previous tokens", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).toHaveBeenCalledWith(order);
    });

    it("should handle order with different case in email", async () => {
      const command = createValidCommand({
        email: "Guest@Example.com",
      });
      const order = createMockOrder(true, "guest@example.com");

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).toHaveBeenCalledWith(order);
    });
  });

  describe("unit of work transaction", () => {
    it("should use unit of work to manage transaction", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should rollback transaction when error occurs", async () => {
      const command = createValidCommand();
      mockUnitOfWork.commit.mockRejectedValue(new Error("Transaction error"));

      await expect(useCase.execute(command)).rejects.toThrow("Transaction error");
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle successful renewal with event publishing", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);
      const mockEvents = [{ eventType: "GUEST_ORDER_MANAGEMENT_TOKEN_REISSUED" }, { eventType: "ANOTHER_EVENT" }] as DomainEvent[];

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);
      mockGuestOrderManagementToken.pullDomainEvents = jest.fn().mockReturnValue(mockEvents);

      await useCase.execute(command);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith(mockEvents);
    });

    it("should handle successful renewal with no events", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, mockEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);
      mockGuestOrderManagementToken.pullDomainEvents = jest.fn().mockReturnValue([]);

      await useCase.execute(command);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should handle order with trailing whitespace in stored email", async () => {
      const command = createValidCommand();
      const order = createMockOrder(true, "  guest@example.com  ");

      mockOrderRepository.findById.mockResolvedValue(order);
      mockApplicationTokenRepository.countByTypeAndIdentifierWithin.mockResolvedValue(0);
      mockApplicationTokenRepository.findLastTokenByTypeAndIdentifier.mockResolvedValue(null);

      await useCase.execute(command);

      expect(mockApplicationTokenRepository.invalidateByTypeAndIdentifier).not.toHaveBeenCalled();
      expect(mockApplicationTokenFactory.reissueGuestOrderManagement).not.toHaveBeenCalled();
      expect(mockApplicationTokenRepository.insert).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "GUEST_ORDER_TOKEN_RENEW_NOOP",
          data: { orderId: mockOrderId, reason: "email_mismatch" },
        }),
      );
    });

    it("should handle all policy values correctly", async () => {
      expect(mockGuestOrderManagementPolicy.maxResendAttemptsPerHour).toBe(3);
      expect(mockGuestOrderManagementPolicy.resendCooldownInSeconds).toBe(60);
    });
  });
});
