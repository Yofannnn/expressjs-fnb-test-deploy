import { InitiateChargeUseCase } from "@/application/use-cases/payment/initiate-charge.use-case";
import { InitiateChargeCommand } from "@/application/ports/driving/initiate-charge.use-case";
import { EventBus } from "@/application/ports/driven/event-bus";
import { IdGenerator } from "@/application/ports/driven/id-generator";
import { Logger } from "@/application/ports/driven/logger";
import { OrderRepository } from "@/application/ports/driven/order.repository";
import { PaymentTransactionRepository } from "@/application/ports/driven/payment-transaction.repository";
import { ChargeResult, PaymentGateway } from "@/application/ports/driven/payment-gateway";
import { UnitOfWork, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work";
import { OrderAccessResolver } from "@/application/ports/driven/order-access-resolver";
import { Order } from "@/domain/entities/order.entity";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { OrderAccessControlService } from "@/domain/services/order-access-control.service";
import { PaymentMethod } from "@/domain/types/payment-method.enum";
import { OrderStatus } from "@/domain/types/order-status.enum";
import { OrderType } from "@/domain/types/order-type.enum";
import { DeliveryType } from "@/domain/types/delivery-type.enum";
import { PaymentStatus } from "@/domain/types/payment-status.enum";
import { ORDER_EXCEPTIONS } from "@/application/exceptions/order.exceptions";
import { OrderCustomerType } from "@/domain/types/order-customer-type.enum";

jest.mock("@/domain/services/order-access-control.service");

describe("InitiateChargeUseCase", () => {
  let useCase: InitiateChargeUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockOrderAccessResolver: jest.Mocked<OrderAccessResolver>;
  let mockIdGenerator: jest.Mocked<IdGenerator>;
  let mockPaymentGateway: jest.Mocked<PaymentGateway>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockLogger: jest.Mocked<Logger>;
  let mockPaymentTransactionRepository: jest.Mocked<PaymentTransactionRepository>;

  const mockOrderId = "order-123";
  const mockMemberId = "member-123";
  const mockGuestToken = "guest-token-123";
  const mockGuestEmail = "guest@example.com";
  const mockTransactionId = "txn-456";
  const mockProviderName = "Midtrans";
  const mockRedirectUrl = "https://payment.example.com/redirect";
  const mockSnapToken = "snap-token-123";
  const mockAmount = 230000;

  const mockPaymentTransaction = {
    getId: jest.fn().mockReturnValue(mockTransactionId),
    getOrderId: jest.fn().mockReturnValue(mockOrderId),
    getAmount: jest.fn().mockReturnValue(mockAmount),
    getMethod: jest.fn().mockReturnValue(PaymentMethod.CARD),
    getProvider: jest.fn().mockReturnValue(mockProviderName),
    getStatus: jest.fn().mockReturnValue("PENDING"),
    getCreatedAt: jest.fn().mockReturnValue(new Date()),
    getUpdatedAt: jest.fn().mockReturnValue(new Date()),
    pullDomainEvents: jest.fn().mockReturnValue([]),
  } as unknown as jest.Mocked<PaymentTransaction>;

  const chargeResult: ChargeResult = {
    redirectUrl: mockRedirectUrl,
    snapToken: mockSnapToken,
    gatewayStatus: "PENDING",
    method: PaymentMethod.CARD,
    paymentInstructions: null,
    providerReferenceId: mockTransactionId,
    rawResponse: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrderRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<OrderRepository>;

    mockPaymentTransactionRepository = {
      insert: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByOrderId: jest.fn(),
    } as unknown as jest.Mocked<PaymentTransactionRepository>;

    mockOrderAccessResolver = {
      resolveGuestEmail: jest.fn(),
    } as unknown as jest.Mocked<OrderAccessResolver>;

    mockUnitOfWork = {
      commit: jest.fn().mockImplementation(async (operation) => {
        const repos: UnitOfWorkRepositories = {
          orderRepository: mockOrderRepository,
          paymentTransactionRepository: mockPaymentTransactionRepository,
        } as unknown as UnitOfWorkRepositories;
        return operation(repos);
      }),
    } as jest.Mocked<UnitOfWork>;

    mockIdGenerator = {
      generate: jest.fn().mockReturnValue(mockTransactionId),
    } as jest.Mocked<IdGenerator>;

    mockPaymentGateway = {
      providerName: mockProviderName,
      charge: jest.fn().mockResolvedValue(chargeResult),
      refund: jest.fn(),
      getStatus: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    } as jest.Mocked<PaymentGateway>;

    mockEventBus = {
      publishAll: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBus>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {});

    useCase = new InitiateChargeUseCase(
      mockUnitOfWork,
      mockOrderRepository,
      mockOrderAccessResolver,
      mockIdGenerator,
      mockPaymentGateway,
      mockEventBus,
      mockLogger,
    );
  });

  const createMockOrder = (isPaid: boolean = false): Order => {
    const now = new Date();
    return Order.rebuild({
      id: mockOrderId,
      customer: {
        type: OrderCustomerType.MEMBER,
        memberId: mockMemberId,
        guestName: null,
        guestEmail: null,
      },
      type: OrderType.ONLINE,
      fulfillment: {
        type: OrderType.ONLINE,
        dineIn: null,
        online: {
          deliveryType: DeliveryType.PICKUP,
          deliveryLocation: null,
          scheduledAt: null,
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
        deliveryFee: 0,
        discount: 0,
        total: mockAmount,
      },
      payment: {
        status: isPaid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        method: isPaid ? PaymentMethod.CARD : null,
        paidAt: isPaid ? now : null,
        transactionId: isPaid ? "txn-123" : null,
      },
      status: OrderStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  };

  describe("execute", () => {
    it("should initiate charge successfully for member user", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransaction.pullDomainEvents = jest.fn().mockReturnValue([]);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        id: mockTransactionId,
        redirectUrl: mockRedirectUrl,
        snapToken: mockSnapToken,
      });

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, mockMemberId, undefined);
      expect(mockIdGenerator.generate).toHaveBeenCalled();
      expect(mockPaymentGateway.charge).toHaveBeenCalledWith({
        transactionId: mockTransactionId,
        amount: expect.objectContaining({ amount: mockAmount }),
        method: PaymentMethod.CARD,
      });
      expect(mockPaymentTransactionRepository.insert).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should initiate charge without payment method", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        id: mockTransactionId,
        redirectUrl: mockRedirectUrl,
        snapToken: mockSnapToken,
      });

      expect(mockPaymentGateway.charge).toHaveBeenCalledWith({
        transactionId: mockTransactionId,
        amount: expect.objectContaining({ amount: mockAmount }),
        method: null,
      });
    });

    it("should initiate charge for guest user with token", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        guestToken: mockGuestToken,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue(mockGuestEmail);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(mockOrderAccessResolver.resolveGuestEmail).toHaveBeenCalledWith(mockOrderId, mockGuestToken);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, undefined, mockGuestEmail);
    });

    it("should handle charge result with null redirectUrl", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      mockPaymentGateway.charge.mockResolvedValue({
        gatewayStatus: "PENDING",
        method: PaymentMethod.CARD,
        providerReferenceId: mockTransactionId,
        rawResponse: {},
        paymentInstructions: null,
        redirectUrl: null,
        snapToken: mockSnapToken,
      });

      const result = await useCase.execute(command);

      expect(result.redirectUrl).toBeNull();
      expect(result.snapToken).toBe(mockSnapToken);
    });

    it("should handle charge result with null snapToken", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      mockPaymentGateway.charge.mockResolvedValue({
        gatewayStatus: "PENDING",
        method: PaymentMethod.CARD,
        providerReferenceId: mockTransactionId,
        rawResponse: {},
        paymentInstructions: null,
        redirectUrl: mockRedirectUrl,
        snapToken: null,
      });

      const result = await useCase.execute(command);

      expect(result.redirectUrl).toBe(mockRedirectUrl);
      expect(result.snapToken).toBeNull();
    });

    it("should publish events from payment transaction", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      const mockEvents = [
        expect.objectContaining({
          eventType: "PAYMENT_CHARGE_INITIATED",
        }),
      ];

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransaction.pullDomainEvents = jest.fn().mockReturnValue(mockEvents);

      await useCase.execute(command);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: "PAYMENT_CHARGE_INITIATED",
          }),
        ]),
      );
    });

    it("should handle different payment methods", async () => {
      const methods = [PaymentMethod.CARD, PaymentMethod.QRIS, PaymentMethod.E_WALLET, PaymentMethod.BANK_TRANSFER];

      for (const method of methods) {
        const command: InitiateChargeCommand = {
          orderId: mockOrderId,
          memberId: mockMemberId,
          method,
        };

        const order = createMockOrder(false);
        mockOrderRepository.findById.mockResolvedValue(order);

        await useCase.execute(command);

        expect(mockPaymentGateway.charge).toHaveBeenCalledWith({
          transactionId: mockTransactionId,
          amount: expect.objectContaining({ amount: mockAmount }),
          method,
        });
      }
    });
  });

  describe("validation", () => {
    it("should throw ORDER_NOT_FOUND when order does not exist", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: expect.stringContaining("Order not found"),
      });

      expect(mockPaymentGateway.charge).not.toHaveBeenCalled();
      expect(mockPaymentTransactionRepository.insert).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should throw ORDER_ALREADY_PAID when order is already paid", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(true);
      mockOrderRepository.findById.mockResolvedValue(order);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: expect.stringContaining("already paid"),
      });

      expect(mockPaymentGateway.charge).not.toHaveBeenCalled();
      expect(mockPaymentTransactionRepository.insert).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should throw ORDER_ACCESS_DENIED when user is not authorized", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: "wrong-user",
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {
        throw ORDER_EXCEPTIONS.ORDER_ACCESS_DENIED();
      });

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: expect.stringContaining("access denied"),
      });

      expect(mockPaymentGateway.charge).not.toHaveBeenCalled();
      expect(mockPaymentTransactionRepository.insert).not.toHaveBeenCalled();
    });

    it("should throw ORDER_ACCESS_DENIED when guest token resolves to wrong email", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        guestToken: mockGuestToken,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue("wrong@example.com");

      (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {
        throw ORDER_EXCEPTIONS.ORDER_ACCESS_DENIED();
      });

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: expect.stringContaining("access denied"),
      });

      expect(mockOrderAccessResolver.resolveGuestEmail).toHaveBeenCalledWith(mockOrderId, mockGuestToken);
      expect(mockPaymentGateway.charge).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should propagate order repository errors", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      mockOrderRepository.findById.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Database error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should propagate payment gateway errors", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentGateway.charge.mockRejectedValue(new Error("Payment gateway error"));

      await expect(useCase.execute(command)).rejects.toThrow("Payment gateway error");
      expect(mockPaymentTransactionRepository.insert).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should propagate order access resolver errors", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        guestToken: mockGuestToken,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockRejectedValue(new Error("Resolver error"));

      await expect(useCase.execute(command)).rejects.toThrow("Resolver error");
      expect(mockPaymentGateway.charge).not.toHaveBeenCalled();
    });

    it("should propagate unit of work errors", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockUnitOfWork.commit.mockRejectedValue(new Error("Transaction error"));

      await expect(useCase.execute(command)).rejects.toThrow("Transaction error");
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should propagate event bus errors", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockEventBus.publishAll.mockRejectedValue(new Error("Event bus error"));

      await expect(useCase.execute(command)).rejects.toThrow("Event bus error");
    });

    it("should handle id generator errors", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockIdGenerator.generate.mockImplementation(() => {
        throw new Error("ID generation error");
      });

      await expect(useCase.execute(command)).rejects.toThrow("ID generation error");
      expect(mockPaymentGateway.charge).not.toHaveBeenCalled();
    });
  });

  describe("logging", () => {
    it("should log initiate charge start", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "InitiateChargeUseCase",
          event: "INITIATE_CHARGE_STARTED",
          data: { orderId: mockOrderId },
        }),
      );
    });

    it("should log successful initiate charge", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "InitiateChargeUseCase",
          event: "INITIATE_CHARGE_SUCCESSFUL",
          data: { orderId: mockOrderId },
        }),
      );
    });

    it("should not log success when error occurs", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      mockOrderRepository.findById.mockRejectedValue(new Error("Database error"));

      try {
        await useCase.execute(command);
      } catch {
        // do nothing
      }

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle logger debug throwing error", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });

    it("should handle logger info throwing error", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });
  });

  describe("unit of work transaction", () => {
    it("should use unit of work to manage transaction", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should insert payment transaction within unit of work", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockPaymentTransactionRepository.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle zero amount order", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const now = new Date();
      const order = Order.rebuild({
        id: mockOrderId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: mockMemberId,
          guestName: null,
          guestEmail: null,
        },
        type: OrderType.ONLINE,
        fulfillment: {
          type: OrderType.ONLINE,
          dineIn: null,
          online: {
            deliveryType: DeliveryType.PICKUP,
            deliveryLocation: null,
            scheduledAt: null,
          },
          reservation: null,
        },
        items: [],
        pricing: {
          subtotal: 0,
          tax: 0,
          serviceCharge: 0,
          deliveryFee: 0,
          discount: 0,
          total: 0,
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

      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockPaymentGateway.charge).toHaveBeenCalledWith({
        transactionId: mockTransactionId,
        amount: expect.objectContaining({ amount: 0 }),
        method: PaymentMethod.CARD,
      });
    });

    it("should handle order with guest token and memberId both provided", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        guestToken: mockGuestToken,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue(mockGuestEmail);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(mockOrderAccessResolver.resolveGuestEmail).toHaveBeenCalledWith(mockOrderId, mockGuestToken);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, mockMemberId, mockGuestEmail);
    });

    it("should handle payment transaction with no events", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      mockPaymentTransaction.pullDomainEvents = jest.fn().mockReturnValue([]);

      await useCase.execute(command);

      expect(mockEventBus.publishAll).toHaveBeenCalled();
    });

    it("should handle payment gateway returning null for both redirectUrl and snapToken", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      mockPaymentGateway.charge.mockResolvedValue({
        gatewayStatus: "PENDING",
        method: PaymentMethod.CARD,
        providerReferenceId: null,
        rawResponse: {},
        paymentInstructions: null,
        redirectUrl: null,
        snapToken: null,
      });

      const result = await useCase.execute(command);

      expect(result.redirectUrl).toBeNull();
      expect(result.snapToken).toBeNull();
    });
  });

  describe("payment gateway integration", () => {
    it("should call payment gateway with correct transaction amount", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockPaymentGateway.charge).toHaveBeenCalledWith({
        transactionId: mockTransactionId,
        amount: expect.objectContaining({ amount: mockAmount }),
        method: PaymentMethod.CARD,
      });
    });

    it("should use provider name from payment gateway", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockPaymentGateway.providerName).toBe(mockProviderName);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle order with different total amounts", async () => {
      const amounts = [10000, 50000, 100000, 500000];

      for (const amount of amounts) {
        const command: InitiateChargeCommand = {
          orderId: mockOrderId,
          memberId: mockMemberId,
          method: PaymentMethod.CARD,
        };

        const now = new Date();
        const order = Order.rebuild({
          id: mockOrderId,
          customer: {
            type: OrderCustomerType.MEMBER,
            memberId: mockMemberId,
            guestName: null,
            guestEmail: null,
          },
          type: OrderType.ONLINE,
          fulfillment: {
            type: OrderType.ONLINE,
            dineIn: null,
            online: {
              deliveryType: DeliveryType.PICKUP,
              deliveryLocation: null,
              scheduledAt: null,
            },
            reservation: null,
          },
          items: [
            {
              productId: "product-123",
              productName: "Product 1",
              priceSnapshot: amount,
              quantity: 1,
              note: null,
            },
          ],
          pricing: {
            subtotal: amount,
            tax: 0,
            serviceCharge: 0,
            deliveryFee: 0,
            discount: 0,
            total: amount,
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

        mockOrderRepository.findById.mockResolvedValue(order);

        await useCase.execute(command);

        expect(mockPaymentGateway.charge).toHaveBeenCalledWith({
          transactionId: mockTransactionId,
          amount: expect.objectContaining({ amount }),
          method: PaymentMethod.CARD,
        });
      }
    });

    it("should handle multiple concurrent requests for same order", async () => {
      const command: InitiateChargeCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
        method: PaymentMethod.CARD,
      };

      const order = createMockOrder(false);
      mockOrderRepository.findById.mockResolvedValue(order);

      await Promise.all([useCase.execute(command), useCase.execute(command)]);

      expect(mockPaymentGateway.charge).toHaveBeenCalledTimes(2);
      expect(mockPaymentTransactionRepository.insert).toHaveBeenCalledTimes(2);
    });
  });
});
