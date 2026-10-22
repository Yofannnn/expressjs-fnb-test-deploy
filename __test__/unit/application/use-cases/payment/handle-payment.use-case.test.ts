import { HandlePaymentUseCase } from "@/application/use-cases/payment/handle-payment.use-case";
import { HandlePaymentCommand } from "@/application/ports/driving/handle-payment.use-case";
import { EventBus } from "@/application/ports/driven/event-bus";
import { Logger } from "@/application/ports/driven/logger";
import { OrderRepository } from "@/application/ports/driven/order.repository";
import { PaymentTransactionRepository } from "@/application/ports/driven/payment-transaction.repository";
import { ProductRepository } from "@/application/ports/driven/product.repository";
import { ChargeResult, PaymentGateway } from "@/application/ports/driven/payment-gateway";
import { UnitOfWork, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work";
import { Order } from "@/domain/entities/order.entity";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { PaymentMethod } from "@/domain/types/payment-method.enum";
import { PaymentTransactionStatus } from "@/domain/types/payment-transaction-status.enum";
import { PaymentTransactionType } from "@/domain/types/payment-transaction-type.enum";
import { OrderStatus } from "@/domain/types/order-status.enum";
import { OrderType } from "@/domain/types/order-type.enum";
import { DeliveryType } from "@/domain/types/delivery-type.enum";
import { PaymentStatus } from "@/domain/types/payment-status.enum";
import { DomainEvent } from "@/domain/types/domain-event.interface";
import { OrderCustomerType } from "@/domain/types/order-customer-type.enum";

describe("HandlePaymentUseCase", () => {
  let useCase: HandlePaymentUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockPaymentGateway: jest.Mocked<PaymentGateway>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockLogger: jest.Mocked<Logger>;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockPaymentTransactionRepository: jest.Mocked<PaymentTransactionRepository>;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  const mockPaymentTransactionId = "txn-123";
  const mockOrderId = "order-123";
  const mockProviderReferenceId = "ref-789";
  const mockMethod = PaymentMethod.CARD;
  const mockRawResponse = { status: "success", transaction_id: "ref-789" };
  const mockAmount = 230000;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrderRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<OrderRepository>;

    mockPaymentTransactionRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      findByOrderId: jest.fn(),
    } as unknown as jest.Mocked<PaymentTransactionRepository>;

    mockProductRepository = {
      findByIds: jest.fn(),
      deductStockForItems: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ProductRepository>;

    mockUnitOfWork = {
      commit: jest.fn().mockImplementation(async (operation) => {
        const repos = {
          orderRepository: mockOrderRepository,
          paymentTransactionRepository: mockPaymentTransactionRepository,
          productRepository: mockProductRepository,
        } as unknown as UnitOfWorkRepositories;
        return operation(repos);
      }),
    } as jest.Mocked<UnitOfWork>;

    mockPaymentGateway = {
      providerName: "Midtrans",
      charge: jest.fn(),
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

    useCase = new HandlePaymentUseCase(mockUnitOfWork, mockPaymentGateway, mockEventBus, mockLogger);
  });

  const createMockPaymentTransaction = (status: PaymentTransactionStatus = PaymentTransactionStatus.PENDING): PaymentTransaction => {
    const now = new Date();
    return PaymentTransaction.rebuild({
      id: mockPaymentTransactionId,
      orderId: mockOrderId,
      type: PaymentTransactionType.CHARGE,
      amount: mockAmount,
      method: mockMethod,
      status: status,
      provider: "Midtrans",
      providerReferenceId: status === PaymentTransactionStatus.SUCCESS ? mockProviderReferenceId : null,
      parentTransactionId: null,
      failureReason: status === PaymentTransactionStatus.FAILED ? "Payment failed" : null,
      metadata: null,
      completedAt: status === PaymentTransactionStatus.SUCCESS ? now : null,
      createdAt: now,
      updatedAt: now,
    });
  };

  const createMockOrder = (isPaid: boolean = false, status: OrderStatus = OrderStatus.PENDING): Order => {
    const now = new Date();
    return Order.rebuild({
      id: mockOrderId,
      customer: {
        type: OrderCustomerType.MEMBER,
        memberId: "member-123",
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
        {
          productId: "product-456",
          productName: "Product 2",
          priceSnapshot: 50000,
          quantity: 1,
          note: null,
        },
      ],
      pricing: {
        subtotal: 250000,
        tax: 25000,
        serviceCharge: 12500,
        deliveryFee: 0,
        discount: 0,
        total: mockAmount,
      },
      payment: {
        status: isPaid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        method: isPaid ? PaymentMethod.CARD : null,
        paidAt: isPaid ? now : null,
        transactionId: isPaid ? mockPaymentTransactionId : null,
      },
      status: status,
      createdAt: now,
      updatedAt: now,
    });
  };

  const createChargeResult = (status: "PENDING" | "SUCCESS" | "FAILED" = "SUCCESS", method: PaymentMethod | null = mockMethod): ChargeResult => ({
    providerReferenceId: mockProviderReferenceId,
    method: method,
    gatewayStatus: status,
    redirectUrl: null,
    snapToken: null,
    paymentInstructions: null,
    rawResponse: mockRawResponse,
  });

  describe("execute", () => {
    it("should handle payment successfully", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
        providerReferenceId: mockProviderReferenceId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      const paymentEvents = [{ eventType: "PAYMENT_COMPLETED" }] as unknown as DomainEvent[];
      const orderEvents = [{ eventType: "ORDER_CONFIRMED" }] as unknown as DomainEvent[];

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      paymentTransaction.pullDomainEvents = jest.fn().mockReturnValue(paymentEvents);
      order.pullDomainEvents = jest.fn().mockReturnValue(orderEvents);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        id: mockPaymentTransactionId,
        orderId: mockOrderId,
      });

      expect(mockPaymentGateway.getStatus).toHaveBeenCalledWith(mockPaymentTransactionId);
      expect(mockPaymentTransactionRepository.update).toHaveBeenCalledTimes(1);
      expect(mockOrderRepository.update).toHaveBeenCalledTimes(1);
      expect(mockProductRepository.deductStockForItems).toHaveBeenCalledWith([
        { id: "product-123", quantity: 2 },
        { id: "product-456", quantity: 1 },
      ]);
      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...paymentEvents, ...orderEvents]);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle payment successfully without provider reference ID", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        id: mockPaymentTransactionId,
        orderId: mockOrderId,
      });

      expect(mockPaymentTransactionRepository.update).toHaveBeenCalledTimes(1);
    });

    it("should handle payment when transaction is already successful", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.SUCCESS);
      const order = createMockOrder(true, OrderStatus.CONFIRMED);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        id: mockPaymentTransactionId,
        orderId: mockOrderId,
      });

      expect(mockPaymentTransactionRepository.update).not.toHaveBeenCalled();
      expect(mockOrderRepository.update).not.toHaveBeenCalled();
      expect(mockProductRepository.deductStockForItems).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should handle payment with order status transition to CONFIRMED", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(order.getStatus()).toBe(OrderStatus.CONFIRMED);
      expect(order.getPayment().isPaid()).toBe(true);
    });

    it("should handle payment with different payment methods", async () => {
      const methods = [PaymentMethod.CARD, PaymentMethod.QRIS, PaymentMethod.E_WALLET, PaymentMethod.BANK_TRANSFER];

      for (const method of methods) {
        const command: HandlePaymentCommand = {
          paymentId: mockPaymentTransactionId,
        };

        const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
        const order = createMockOrder(false, OrderStatus.PENDING);

        mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS", method));
        mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
        mockOrderRepository.findById.mockResolvedValue(order);

        const result = await useCase.execute(command);

        expect(result).toEqual({
          id: mockPaymentTransactionId,
          orderId: mockOrderId,
        });

        expect(paymentTransaction.getMethod()).toBe(method);
      }
    });

    it("should handle payment with provider reference ID from command", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
        providerReferenceId: "custom-ref-456",
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockPaymentTransactionRepository.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("validation", () => {
    it("should throw TRANSACTION_NOT_FOUND when payment transaction does not exist", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "PaymentException",
        message: expect.stringContaining("not found"),
      });

      expect(mockOrderRepository.findById).not.toHaveBeenCalled();
      expect(mockPaymentTransactionRepository.update).not.toHaveBeenCalled();
      expect(mockOrderRepository.update).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should throw ORDER_NOT_FOUND when order does not exist", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: expect.stringContaining("Order not found"),
      });

      expect(mockPaymentTransactionRepository.update).not.toHaveBeenCalled();
      expect(mockOrderRepository.update).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should throw CHARGE_NOT_SUCCESSFUL when gateway status is not SUCCESS", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("FAILED"));

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "PaymentException",
        message: expect.stringContaining("not successful"),
      });

      expect(mockPaymentTransactionRepository.findById).not.toHaveBeenCalled();
      expect(mockOrderRepository.findById).not.toHaveBeenCalled();
      expect(mockPaymentTransactionRepository.update).not.toHaveBeenCalled();
      expect(mockOrderRepository.update).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should throw CHARGE_NOT_SUCCESSFUL when gateway status is PENDING", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("PENDING"));

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "PaymentException",
        message: expect.stringContaining("not successful"),
      });

      expect(mockPaymentTransactionRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw MISSING_PAYMENT_METHOD when charge result has no method", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS", null));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "PaymentException",
        message: expect.stringContaining("Missing payment method"),
      });

      expect(mockPaymentTransactionRepository.update).not.toHaveBeenCalled();
      expect(mockOrderRepository.update).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should propagate payment gateway error", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      mockPaymentGateway.getStatus.mockRejectedValue(new Error("Gateway error"));

      await expect(useCase.execute(command)).rejects.toThrow("Gateway error");
      expect(mockPaymentTransactionRepository.findById).not.toHaveBeenCalled();
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should propagate repository find error", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Database error");
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should propagate unit of work error", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockUnitOfWork.commit.mockRejectedValue(new Error("Transaction error"));

      await expect(useCase.execute(command)).rejects.toThrow("Transaction error");
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should propagate event bus error", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockEventBus.publishAll.mockRejectedValue(new Error("Event bus error"));

      await expect(useCase.execute(command)).rejects.toThrow("Event bus error");
    });

    it("should handle product repository deduct stock error", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.deductStockForItems.mockRejectedValue(new Error("Stock deduction failed"));

      await expect(useCase.execute(command)).rejects.toThrow("Stock deduction failed");
    });
  });

  describe("logging", () => {
    it("should log payment start", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "HandlePaymentUseCase",
          event: "PAYMENT_STARTED",
          data: { paymentTransactionId: mockPaymentTransactionId },
        }),
      );
    });

    it("should log successful payment", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "HandlePaymentUseCase",
          event: "PAYMENT_SUCCESSFUL",
          data: { paymentTransactionId: mockPaymentTransactionId },
        }),
      );
    });

    it("should not log success when error occurs", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      mockPaymentGateway.getStatus.mockRejectedValue(new Error("Gateway error"));

      try {
        await useCase.execute(command);
      } catch {
        // Expected
      }

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle logger debug throwing error", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });

    it("should handle logger info throwing error", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });
  });

  describe("transaction management", () => {
    it("should use unit of work to manage transaction", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should update payment transaction within unit of work", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockPaymentTransactionRepository.update).toHaveBeenCalledTimes(1);
      expect(mockPaymentTransactionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPaymentTransactionId,
          status: PaymentTransactionStatus.SUCCESS,
        }),
      );
    });

    it("should update order within unit of work", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockOrderRepository.update).toHaveBeenCalledTimes(1);
      expect(mockOrderRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockOrderId,
          status: OrderStatus.CONFIRMED,
        }),
      );
    });

    it("should deduct stock within unit of work", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockProductRepository.deductStockForItems).toHaveBeenCalledWith([
        { id: "product-123", quantity: 2 },
        { id: "product-456", quantity: 1 },
      ]);
    });

    it("should rollback transaction when error occurs", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      mockUnitOfWork.commit.mockImplementation(async () => {
        throw new Error("Transaction rollback");
      });

      await expect(useCase.execute(command)).rejects.toThrow("Transaction rollback");

      expect(mockPaymentTransactionRepository.update).not.toHaveBeenCalled();
      expect(mockOrderRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("event emission", () => {
    it("should publish events after successful payment", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      const paymentEvents = [{ eventType: "PAYMENT_COMPLETED" }] as unknown as DomainEvent[];
      const orderEvents = [{ eventType: "ORDER_CONFIRMED" }] as unknown as DomainEvent[];

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      paymentTransaction.pullDomainEvents = jest.fn().mockReturnValue(paymentEvents);
      order.pullDomainEvents = jest.fn().mockReturnValue(orderEvents);

      await useCase.execute(command);

      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...paymentEvents, ...orderEvents]);
    });

    it("should not publish events when transaction already successful", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.SUCCESS);
      const order = createMockOrder(true, OrderStatus.CONFIRMED);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should include both payment and order events", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      const paymentEvents = [{ eventType: "PAYMENT_COMPLETED" }] as unknown as DomainEvent[];
      const orderEvents = [{ eventType: "ORDER_CONFIRMED" }] as unknown as DomainEvent[];

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      paymentTransaction.pullDomainEvents = jest.fn().mockReturnValue(paymentEvents);
      order.pullDomainEvents = jest.fn().mockReturnValue(orderEvents);

      await useCase.execute(command);

      const publishedEvents = mockEventBus.publishAll.mock.calls[0][0];
      expect(publishedEvents).toBeInstanceOf(Array);
      expect(publishedEvents).toEqual([...paymentEvents, ...orderEvents]);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle order with multiple items for stock deduction", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockProductRepository.deductStockForItems).toHaveBeenCalledWith([
        { id: "product-123", quantity: 2 },
        { id: "product-456", quantity: 1 },
      ]);
    });

    it("should handle order with empty items", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const now = new Date();
      const order = Order.rebuild({
        id: mockOrderId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: "member-123",
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

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await useCase.execute(command);

      expect(mockProductRepository.deductStockForItems).toHaveBeenCalledWith([]);
    });

    it("should handle payment with order that is already confirmed", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.CONFIRMED);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it("should handle payment with order that has already paid", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(true, OrderStatus.CONFIRMED);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it("should handle result with correct structure", async () => {
      const command: HandlePaymentCommand = {
        paymentId: mockPaymentTransactionId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(false, OrderStatus.PENDING);

      mockPaymentGateway.getStatus.mockResolvedValue(createChargeResult("SUCCESS"));
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);

      const result = await useCase.execute(command);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("orderId");
      expect(result.id).toBe(mockPaymentTransactionId);
      expect(result.orderId).toBe(mockOrderId);
    });
  });
});
