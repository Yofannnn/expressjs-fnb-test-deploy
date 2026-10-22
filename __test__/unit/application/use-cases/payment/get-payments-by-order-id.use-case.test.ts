import { GetPaymentsByOrderIdUseCase } from "@/application/use-cases/payment/get-payments-by-order-id.use-case";
import { GetPaymentsByOrderIdCommand } from "@/application/ports/driving/get-payments-by-order-id.use-case";
import { Logger } from "@/application/ports/driven/logger";
import { OrderRepository } from "@/application/ports/driven/order.repository";
import { PaymentTransactionRepository } from "@/application/ports/driven/payment-transaction.repository";
import { OrderAccessResolver } from "@/application/ports/driven/order-access-resolver";
import { Order } from "@/domain/entities/order.entity";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { OrderAccessControlService } from "@/domain/services/order-access-control.service";
import { PaymentMapper } from "@/application/mappers/payment-transaction.mapper";
import { PaymentMethod } from "@/domain/types/payment-method.enum";
import { PaymentTransactionStatus } from "@/domain/types/payment-transaction-status.enum";
import { PaymentTransactionType } from "@/domain/types/payment-transaction-type.enum";
import { OrderStatus } from "@/domain/types/order-status.enum";
import { OrderType } from "@/domain/types/order-type.enum";
import { DeliveryType } from "@/domain/types/delivery-type.enum";
import { PaymentStatus } from "@/domain/types/payment-status.enum";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { PaymentDetailsView } from "@/application/types/payment-transaction.type";
import { PaymentTransactionPlainObject } from "@/domain/types/payment-transaction.interface";
import { OrderCustomerType } from "@/domain/types/order-customer-type.enum";

jest.mock("@/domain/services/order-access-control.service");
jest.mock("@/application/mappers/payment.mapper");

describe("GetPaymentsByOrderIdUseCase", () => {
  let useCase: GetPaymentsByOrderIdUseCase;
  let mockPaymentTransactionRepository: jest.Mocked<PaymentTransactionRepository>;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockOrderAccessResolver: jest.Mocked<OrderAccessResolver>;
  let mockLogger: jest.Mocked<Logger>;

  const mockOrderId = "order-123";
  const mockMemberId = "member-123";
  const mockGuestToken = "guest-token-123";
  const mockGuestEmail = "guest@example.com";
  const mockAmount = 230000;
  const mockMethod = PaymentMethod.CARD;
  const mockProviderReferenceId = "ref-789";

  const mockPaymentTransaction1 = {
    getId: jest.fn().mockReturnValue("txn-123"),
    getOrderId: jest.fn().mockReturnValue(mockOrderId),
    getType: jest.fn().mockReturnValue(PaymentTransactionType.CHARGE),
    getAmount: jest.fn().mockReturnValue(mockAmount),
    getMethod: jest.fn().mockReturnValue(mockMethod),
    getStatus: jest.fn().mockReturnValue(PaymentTransactionStatus.SUCCESS),
    getProvider: jest.fn().mockReturnValue("Midtrans"),
    getProviderReferenceId: jest.fn().mockReturnValue(mockProviderReferenceId),
    getParentTransactionId: jest.fn().mockReturnValue(null),
    getFailureReason: jest.fn().mockReturnValue(null),
    getMetadata: jest.fn().mockReturnValue(null),
    getCompletedAt: jest.fn().mockReturnValue(new Date()),
    getCreatedAt: jest.fn().mockReturnValue(new Date()),
    getUpdatedAt: jest.fn().mockReturnValue(new Date()),
  } as unknown as jest.Mocked<PaymentTransaction>;

  const mockPaymentTransaction2 = {
    getId: jest.fn().mockReturnValue("txn-456"),
    getOrderId: jest.fn().mockReturnValue(mockOrderId),
    getType: jest.fn().mockReturnValue(PaymentTransactionType.REFUND),
    getAmount: jest.fn().mockReturnValue(mockAmount),
    getMethod: jest.fn().mockReturnValue(mockMethod),
    getStatus: jest.fn().mockReturnValue(PaymentTransactionStatus.SUCCESS),
    getProvider: jest.fn().mockReturnValue("Midtrans"),
    getProviderReferenceId: jest.fn().mockReturnValue(mockProviderReferenceId),
    getParentTransactionId: jest.fn().mockReturnValue("txn-123"),
    getFailureReason: jest.fn().mockReturnValue(null),
    getMetadata: jest.fn().mockReturnValue({ reason: "Customer requested" }),
    getCompletedAt: jest.fn().mockReturnValue(new Date()),
    getCreatedAt: jest.fn().mockReturnValue(new Date()),
    getUpdatedAt: jest.fn().mockReturnValue(new Date()),
  } as unknown as jest.Mocked<PaymentTransaction>;

  const mockPaymentTransactions = [mockPaymentTransaction1, mockPaymentTransaction2];

  const mockPaymentDetailsView1: PaymentDetailsView = {
    id: "txn-123",
    orderId: mockOrderId,
    type: PaymentTransactionType.CHARGE,
    amount: mockAmount,
    method: mockMethod,
    status: PaymentTransactionStatus.SUCCESS,
    parentTransactionId: null,
    completedAt: new Date(),
    createdAt: new Date(),
  };

  const mockPaymentDetailsView2: PaymentDetailsView = {
    id: "txn-456",
    orderId: mockOrderId,
    type: PaymentTransactionType.REFUND,
    amount: mockAmount,
    method: mockMethod,
    status: PaymentTransactionStatus.SUCCESS,
    parentTransactionId: "txn-123",
    completedAt: new Date(),
    createdAt: new Date(),
  };

  const mockPaymentPlainObject1: PaymentTransactionPlainObject = {
    id: "txn-123",
    orderId: mockOrderId,
    type: PaymentTransactionType.CHARGE,
    amount: mockAmount,
    method: mockMethod,
    status: PaymentTransactionStatus.SUCCESS,
    provider: "Midtrans",
    providerReferenceId: mockProviderReferenceId,
    parentTransactionId: null,
    failureReason: null,
    metadata: null,
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentPlainObject2: PaymentTransactionPlainObject = {
    id: "txn-456",
    orderId: mockOrderId,
    type: PaymentTransactionType.REFUND,
    amount: mockAmount,
    method: mockMethod,
    status: PaymentTransactionStatus.SUCCESS,
    provider: "Midtrans",
    providerReferenceId: mockProviderReferenceId,
    parentTransactionId: "txn-123",
    failureReason: null,
    metadata: { reason: "Customer requested" },
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentDetailsViews = [mockPaymentDetailsView1, mockPaymentDetailsView2];
  const mockPaymentPlainObjects = [mockPaymentPlainObject1, mockPaymentPlainObject2];

  beforeEach(() => {
    jest.clearAllMocks();

    mockPaymentTransactionRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      findByOrderId: jest.fn(),
    } as unknown as jest.Mocked<PaymentTransactionRepository>;

    mockOrderRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<OrderRepository>;

    mockOrderAccessResolver = {
      resolveGuestEmail: jest.fn(),
    } as unknown as jest.Mocked<OrderAccessResolver>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);
    (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {});

    (PaymentMapper.toDetailsView as jest.Mock).mockReturnValueOnce(mockPaymentDetailsView1).mockReturnValueOnce(mockPaymentDetailsView2);

    (PaymentMapper.toPlainObject as jest.Mock).mockReturnValueOnce(mockPaymentPlainObject1).mockReturnValueOnce(mockPaymentPlainObject2);

    useCase = new GetPaymentsByOrderIdUseCase(mockPaymentTransactionRepository, mockOrderRepository, mockOrderAccessResolver, mockLogger);
  });

  const createMockOrder = (memberId: string | null = mockMemberId, guestEmail: string | null = null): Order => {
    const now = new Date();

    return Order.rebuild({
      id: mockOrderId,
      customer: {
        type: memberId ? OrderCustomerType.MEMBER : OrderCustomerType.GUEST,
        memberId: memberId,
        guestName: memberId ? null : "John Doe",
        guestEmail: memberId ? null : guestEmail || "guest@example.com",
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
        total: 230000,
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

  describe("execute", () => {
    it("should get payments for member user (customer scope)", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        scope: "customer",
        payments: mockPaymentDetailsViews,
      });

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockPaymentTransactionRepository.findByOrderId).toHaveBeenCalledWith(mockOrderId);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, mockMemberId, undefined);
      expect(OrderAccessControlService.canStaffAccessOrders).toHaveBeenCalledWith(undefined);
      expect(PaymentMapper.toDetailsView).toHaveBeenCalledTimes(2);
      expect(PaymentMapper.toDetailsView).toHaveBeenCalledWith(mockPaymentTransaction1);
      expect(PaymentMapper.toDetailsView).toHaveBeenCalledWith(mockPaymentTransaction2);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should get payments for staff user (staff scope)", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        role: UserRoleType.ADMIN,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        scope: "staff",
        payments: mockPaymentPlainObjects,
      });

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockPaymentTransactionRepository.findByOrderId).toHaveBeenCalledWith(mockOrderId);
      expect(OrderAccessControlService.assertOwnership).not.toHaveBeenCalled();
      expect(OrderAccessControlService.canStaffAccessOrders).toHaveBeenCalledWith(UserRoleType.ADMIN);
      expect(PaymentMapper.toPlainObject).toHaveBeenCalledTimes(2);
      expect(PaymentMapper.toPlainObject).toHaveBeenCalledWith(mockPaymentTransaction1);
      expect(PaymentMapper.toPlainObject).toHaveBeenCalledWith(mockPaymentTransaction2);
    });

    it("should get payments for guest user with token (customer scope)", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        guestToken: mockGuestToken,
      };

      const order = createMockOrder(null, mockGuestEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue(mockGuestEmail);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        scope: "customer",
        payments: mockPaymentDetailsViews,
      });

      expect(mockOrderAccessResolver.resolveGuestEmail).toHaveBeenCalledWith(mockOrderId, mockGuestToken);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, undefined, mockGuestEmail);
    });

    it("should get payments for staff with MANAGER role", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        role: UserRoleType.MANAGER,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result.scope).toBe("staff");
      expect(OrderAccessControlService.canStaffAccessOrders).toHaveBeenCalledWith(UserRoleType.MANAGER);
    });

    it("should handle empty payments array", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue([]);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        scope: "customer",
        payments: [],
      });

      expect(PaymentMapper.toDetailsView).not.toHaveBeenCalled();
    });

    it("should handle payments with different statuses", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      const pendingTransaction = {
        ...mockPaymentTransaction1,
        getStatus: jest.fn().mockReturnValue(PaymentTransactionStatus.PENDING),
        getCompletedAt: jest.fn().mockReturnValue(null),
      } as unknown as PaymentTransaction;

      const failedTransaction = {
        ...mockPaymentTransaction2,
        getStatus: jest.fn().mockReturnValue(PaymentTransactionStatus.FAILED),
        getCompletedAt: jest.fn().mockReturnValue(null),
        getFailureReason: jest.fn().mockReturnValue("Payment failed"),
      } as unknown as PaymentTransaction;

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue([pendingTransaction, failedTransaction]);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const pendingView = {
        ...mockPaymentDetailsView1,
        status: PaymentTransactionStatus.PENDING,
        completedAt: null,
      };
      const failedView = {
        ...mockPaymentDetailsView2,
        status: PaymentTransactionStatus.FAILED,
        completedAt: null,
      };

      (PaymentMapper.toDetailsView as jest.Mock).mockReset().mockReturnValueOnce(pendingView).mockReturnValueOnce(failedView);

      const result = await useCase.execute(command);

      expect(result.payments).toHaveLength(2);
      expect(result.payments[0].status).toBe(PaymentTransactionStatus.PENDING);
      expect(result.payments[0].completedAt).toBeNull();
      expect(result.payments[1].status).toBe(PaymentTransactionStatus.FAILED);
      expect(result.payments[1].completedAt).toBeNull();
    });

    it("should handle payments with null method", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      const transactionWithNullMethod = {
        ...mockPaymentTransaction1,
        getMethod: jest.fn().mockReturnValue(null),
      } as unknown as PaymentTransaction;

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue([transactionWithNullMethod]);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const viewWithNullMethod = {
        ...mockPaymentDetailsView1,
        method: null,
      };

      (PaymentMapper.toDetailsView as jest.Mock).mockReset().mockReturnValue(viewWithNullMethod);

      const result = await useCase.execute(command);

      expect(result.payments[0].method).toBeNull();
    });
  });

  describe("validation", () => {
    it("should throw ORDER_NOT_FOUND when order does not exist", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: expect.stringContaining("Order not found"),
      });

      expect(mockPaymentTransactionRepository.findByOrderId).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw ORDER_ACCESS_DENIED when memberId does not match and not staff", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: "wrong-user",
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);
      (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {
        throw new Error("Order access denied");
      });

      await expect(useCase.execute(command)).rejects.toThrow("Order access denied");
      expect(mockPaymentTransactionRepository.findByOrderId).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw ORDER_ACCESS_DENIED when guest token resolves to wrong email", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        guestToken: mockGuestToken,
      };

      const order = createMockOrder(null, mockGuestEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue("wrong@example.com");
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);
      (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {
        throw new Error("Order access denied");
      });

      await expect(useCase.execute(command)).rejects.toThrow("Order access denied");
      expect(mockPaymentTransactionRepository.findByOrderId).not.toHaveBeenCalled();
    });

    it("should allow staff access without ownership check", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        role: UserRoleType.ADMIN,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result.scope).toBe("staff");
      expect(OrderAccessControlService.assertOwnership).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should propagate repository find error for order", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      mockOrderRepository.findById.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Database error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should propagate repository find error for payment transactions", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Database error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should propagate order access resolver error", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        guestToken: mockGuestToken,
      };

      const order = createMockOrder(null, mockGuestEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockRejectedValue(new Error("Resolver error"));

      await expect(useCase.execute(command)).rejects.toThrow("Resolver error");
    });

    it("should propagate logger error", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });
  });

  describe("logging", () => {
    it("should log get payments start", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "GetPaymentsByOrderIdUseCase",
          event: "GET_PAYMENT_STARTED",
          data: { orderId: mockOrderId },
        }),
      );
    });

    it("should log successful get payments", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "GetPaymentsByOrderIdUseCase",
          event: "GET_PAYMENT_SUCCESSFUL",
          data: { orderId: mockOrderId },
        }),
      );
    });

    it("should not log success when error occurs", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      mockOrderRepository.findById.mockRejectedValue(new Error("Database error"));

      try {
        await useCase.execute(command);
      } catch {
        // Expected
      }

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle logger info throwing error", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });
  });

  describe("PaymentMapper interaction", () => {
    it("should call toDetailsView for each payment in customer scope", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      await useCase.execute(command);

      expect(PaymentMapper.toDetailsView).toHaveBeenCalledTimes(2);
      expect(PaymentMapper.toDetailsView).toHaveBeenCalledWith(mockPaymentTransaction1);
      expect(PaymentMapper.toDetailsView).toHaveBeenCalledWith(mockPaymentTransaction2);
      expect(PaymentMapper.toPlainObject).not.toHaveBeenCalled();
    });

    it("should call toPlainObject for each payment in staff scope", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        role: UserRoleType.ADMIN,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      await useCase.execute(command);

      expect(PaymentMapper.toPlainObject).toHaveBeenCalledTimes(2);
      expect(PaymentMapper.toPlainObject).toHaveBeenCalledWith(mockPaymentTransaction1);
      expect(PaymentMapper.toPlainObject).toHaveBeenCalledWith(mockPaymentTransaction2);
      expect(PaymentMapper.toDetailsView).not.toHaveBeenCalled();
    });

    it("should handle PaymentMapper throwing error", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      (PaymentMapper.toDetailsView as jest.Mock)
        .mockReset()
        .mockImplementationOnce(() => {
          throw new Error("Mapper error");
        })
        .mockImplementationOnce(() => mockPaymentDetailsView2);

      await expect(useCase.execute(command)).rejects.toThrow("Mapper error");
    });
  });

  describe("result structure verification", () => {
    it("should return customer scope result with correct structure", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result).toHaveProperty("scope");
      expect(result).toHaveProperty("payments");
      expect(result.scope).toBe("customer");
      expect(Array.isArray(result.payments)).toBe(true);
      expect(result.payments[0]).toHaveProperty("id");
      expect(result.payments[0]).toHaveProperty("orderId");
      expect(result.payments[0]).toHaveProperty("type");
      expect(result.payments[0]).toHaveProperty("amount");
      expect(result.payments[0]).toHaveProperty("method");
      expect(result.payments[0]).toHaveProperty("status");
      expect(result.payments[0]).toHaveProperty("completedAt");
      expect(result.payments[0]).toHaveProperty("createdAt");
    });

    it("should return staff scope result with correct structure", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        role: UserRoleType.ADMIN,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result).toHaveProperty("scope");
      expect(result).toHaveProperty("payments");
      expect(result.scope).toBe("staff");
      expect(Array.isArray(result.payments)).toBe(true);
      expect(result.payments[0]).toHaveProperty("id");
      expect(result.payments[0]).toHaveProperty("orderId");
      expect(result.payments[0]).toHaveProperty("type");
      expect(result.payments[0]).toHaveProperty("amount");
      expect(result.payments[0]).toHaveProperty("method");
      expect(result.payments[0]).toHaveProperty("status");
      expect(result.payments[0]).toHaveProperty("provider");
      expect(result.payments[0]).toHaveProperty("providerReferenceId");
      expect(result.payments[0]).toHaveProperty("createdAt");
      expect(result.payments[0]).toHaveProperty("updatedAt");
    });

    it("should return empty payments array when no transactions", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue([]);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result.payments).toEqual([]);
      expect(result.payments).toHaveLength(0);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle payment with completedAt null", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      const pendingTransaction = {
        ...mockPaymentTransaction1,
        getStatus: jest.fn().mockReturnValue(PaymentTransactionStatus.PENDING),
        getCompletedAt: jest.fn().mockReturnValue(null),
      } as unknown as PaymentTransaction;

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue([pendingTransaction]);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const viewWithNullCompletedAt = {
        ...mockPaymentDetailsView1,
        status: PaymentTransactionStatus.PENDING,
        completedAt: null,
      };

      (PaymentMapper.toDetailsView as jest.Mock).mockReset().mockReturnValue(viewWithNullCompletedAt);

      const result = await useCase.execute(command);

      expect(result.payments[0].completedAt).toBeNull();
    });

    it("should handle payment with parent transaction ID", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      const refundTransaction = {
        ...mockPaymentTransaction2,
        getType: jest.fn().mockReturnValue(PaymentTransactionType.REFUND),
        getParentTransactionId: jest.fn().mockReturnValue("txn-123"),
      } as unknown as PaymentTransaction;

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue([refundTransaction]);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const viewWithParentId = {
        ...mockPaymentDetailsView2,
        parentTransactionId: "txn-123",
      };

      (PaymentMapper.toDetailsView as jest.Mock).mockReset().mockReturnValue(viewWithParentId);

      const result = await useCase.execute(command);

      expect(result.payments[0].parentTransactionId).toBe("txn-123");
    });

    it("should handle staff access with ADMIN role returning staff scope", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        role: UserRoleType.ADMIN,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result.scope).toBe("staff");
      expect(PaymentMapper.toPlainObject).toHaveBeenCalled();
    });

    it("should handle customer access with MANAGER role (if not staff)", async () => {
      const command: GetPaymentsByOrderIdCommand = {
        orderId: mockOrderId,
        role: UserRoleType.MANAGER,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findByOrderId.mockResolvedValue(mockPaymentTransactions);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result.scope).toBe("customer");
      expect(PaymentMapper.toDetailsView).toHaveBeenCalled();
    });
  });
});
