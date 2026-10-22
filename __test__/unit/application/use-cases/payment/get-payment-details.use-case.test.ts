import { GetPaymentDetailsUseCase } from "@/application/use-cases/payment/get-payment-details.use-case";
import { GetPaymentDetailsCommand } from "@/application/ports/driving/get-payment-details.use-case";
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

describe("GetPaymentDetailsUseCase", () => {
  let useCase: GetPaymentDetailsUseCase;
  let mockPaymentTransactionRepository: jest.Mocked<PaymentTransactionRepository>;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockOrderAccessResolver: jest.Mocked<OrderAccessResolver>;
  let mockLogger: jest.Mocked<Logger>;

  const mockPaymentTransactionId = "txn-123";
  const mockOrderId = "order-123";
  const mockMemberId = "member-123";
  const mockGuestToken = "guest-token-123";
  const mockGuestEmail = "guest@example.com";
  const mockAmount = 230000;
  const mockMethod = PaymentMethod.CARD;
  const mockProviderReferenceId = "ref-789";

  const mockPaymentDetailsView: PaymentDetailsView = {
    id: mockPaymentTransactionId,
    orderId: mockOrderId,
    type: PaymentTransactionType.CHARGE,
    amount: mockAmount,
    method: mockMethod,
    status: PaymentTransactionStatus.SUCCESS,
    parentTransactionId: null,
    completedAt: new Date(),
    createdAt: new Date(),
  };

  const mockPaymentPlainObject: PaymentTransactionPlainObject = {
    id: mockPaymentTransactionId,
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
    (PaymentMapper.toDetailsView as jest.Mock).mockReturnValue(mockPaymentDetailsView);
    (PaymentMapper.toPlainObject as jest.Mock).mockReturnValue(mockPaymentPlainObject);

    useCase = new GetPaymentDetailsUseCase(mockPaymentTransactionRepository, mockOrderRepository, mockOrderAccessResolver, mockLogger);
  });

  const createMockPaymentTransaction = (
    status: PaymentTransactionStatus = PaymentTransactionStatus.SUCCESS,
    type: PaymentTransactionType = PaymentTransactionType.CHARGE,
  ): PaymentTransaction => {
    const now = new Date();
    const completedAt = status === PaymentTransactionStatus.SUCCESS ? now : null;

    return PaymentTransaction.rebuild({
      id: mockPaymentTransactionId,
      orderId: mockOrderId,
      type: type,
      amount: mockAmount,
      method: mockMethod,
      status: status,
      provider: "Midtrans",
      providerReferenceId: status === PaymentTransactionStatus.SUCCESS ? mockProviderReferenceId : null,
      parentTransactionId: type === PaymentTransactionType.REFUND ? "charge-123" : null,
      failureReason: status === PaymentTransactionStatus.FAILED ? "Payment failed" : null,
      metadata: type === PaymentTransactionType.REFUND ? { reason: "Customer requested" } : null,
      completedAt: completedAt,
      createdAt: now,
      updatedAt: now,
    });
  };

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
    it("should get payment details for member user (customer scope)", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        scope: "customer",
        payment: mockPaymentDetailsView,
      });

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockPaymentTransactionRepository.findById).toHaveBeenCalledWith(mockPaymentTransactionId);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, mockMemberId, undefined);
      expect(OrderAccessControlService.canStaffAccessOrders).toHaveBeenCalledWith(undefined);
      expect(PaymentMapper.toDetailsView).toHaveBeenCalledWith(paymentTransaction);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should get payment details for staff user (staff scope)", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        role: UserRoleType.ADMIN,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        scope: "staff",
        payment: mockPaymentPlainObject,
      });

      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockPaymentTransactionRepository.findById).toHaveBeenCalledWith(mockPaymentTransactionId);
      expect(OrderAccessControlService.assertOwnership).not.toHaveBeenCalled();
      expect(OrderAccessControlService.canStaffAccessOrders).toHaveBeenCalledWith(UserRoleType.ADMIN);
      expect(PaymentMapper.toPlainObject).toHaveBeenCalledWith(paymentTransaction);
    });

    it("should get payment details for guest user with token (customer scope)", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        guestToken: mockGuestToken,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(null, mockGuestEmail);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue(mockGuestEmail);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        scope: "customer",
        payment: mockPaymentDetailsView,
      });

      expect(mockOrderAccessResolver.resolveGuestEmail).toHaveBeenCalledWith(mockOrderId, mockGuestToken);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, undefined, mockGuestEmail);
    });

    it("should get payment details for staff with MANAGER role", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        role: UserRoleType.MANAGER,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result.scope).toBe("staff");
      expect(OrderAccessControlService.canStaffAccessOrders).toHaveBeenCalledWith(UserRoleType.MANAGER);
    });

    it("should get payment details for refund transaction", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.SUCCESS, PaymentTransactionType.REFUND);
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const refundDetailsView = {
        ...mockPaymentDetailsView,
        type: PaymentTransactionType.REFUND,
        parentTransactionId: "charge-123",
        metadata: { reason: "Customer requested" },
      };
      (PaymentMapper.toDetailsView as jest.Mock).mockReturnValue(refundDetailsView);

      const result = await useCase.execute(command);

      expect(result.payment.type).toBe(PaymentTransactionType.REFUND);
      expect(result.payment.parentTransactionId).toBe("charge-123");
    });

    it("should get payment details for failed transaction", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.FAILED);
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const failedDetailsView = {
        ...mockPaymentDetailsView,
        status: PaymentTransactionStatus.FAILED,
        completedAt: null,
      };
      (PaymentMapper.toDetailsView as jest.Mock).mockReturnValue(failedDetailsView);

      const result = await useCase.execute(command);

      expect(result.payment.status).toBe(PaymentTransactionStatus.FAILED);
      expect(result.payment.completedAt).toBeNull();
    });

    it("should get payment details for pending transaction", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const pendingDetailsView = {
        ...mockPaymentDetailsView,
        status: PaymentTransactionStatus.PENDING,
        completedAt: null,
      };
      (PaymentMapper.toDetailsView as jest.Mock).mockReturnValue(pendingDetailsView);

      const result = await useCase.execute(command);

      expect(result.payment.status).toBe(PaymentTransactionStatus.PENDING);
      expect(result.payment.completedAt).toBeNull();
    });

    it("should get payment details with null method", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = PaymentTransaction.rebuild({
        id: mockPaymentTransactionId,
        orderId: mockOrderId,
        type: PaymentTransactionType.CHARGE,
        amount: mockAmount,
        method: null,
        status: PaymentTransactionStatus.PENDING,
        provider: "Midtrans",
        providerReferenceId: null,
        parentTransactionId: null,
        failureReason: null,
        metadata: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const detailsViewWithNullMethod = {
        ...mockPaymentDetailsView,
        method: null,
      };
      (PaymentMapper.toDetailsView as jest.Mock).mockReturnValue(detailsViewWithNullMethod);

      const result = await useCase.execute(command);

      expect(result.payment.method).toBeNull();
    });

    it("should get payment details with completedAt null for non-successful status", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const detailsViewWithNullCompletedAt = {
        ...mockPaymentDetailsView,
        status: PaymentTransactionStatus.PENDING,
        completedAt: null,
      };
      (PaymentMapper.toDetailsView as jest.Mock).mockReturnValue(detailsViewWithNullCompletedAt);

      const result = await useCase.execute(command);

      expect(result.payment.completedAt).toBeNull();
    });
  });

  describe("validation", () => {
    it("should throw ORDER_NOT_FOUND when order does not exist", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: expect.stringContaining("Order not found"),
      });

      expect(mockPaymentTransactionRepository.findById).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw TRANSACTION_NOT_FOUND when payment transaction does not exist", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "PaymentException",
        message: expect.stringContaining("not found"),
      });

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw TRANSACTION_NOT_FOUND when payment transaction does not belong to order", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      jest.spyOn(paymentTransaction, "getOrderId").mockReturnValue("different-order-id");

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "PaymentException",
        message: expect.stringContaining("not found"),
      });

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw ORDER_ACCESS_DENIED when memberId does not match and not staff", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: "wrong-user",
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);
      (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {
        throw new Error("Order access denied");
      });

      await expect(useCase.execute(command)).rejects.toThrow("Order access denied");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw ORDER_ACCESS_DENIED when guest token resolves to wrong email", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        guestToken: mockGuestToken,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(null, mockGuestEmail);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue("wrong@example.com");
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);
      (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {
        throw new Error("Order access denied");
      });

      await expect(useCase.execute(command)).rejects.toThrow("Order access denied");
    });

    it("should allow staff access without ownership check", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        role: UserRoleType.ADMIN,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result.scope).toBe("staff");
      expect(OrderAccessControlService.assertOwnership).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should propagate repository find error for order", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      mockOrderRepository.findById.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Database error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should propagate repository find error for payment transaction", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Database error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should propagate order access resolver error", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
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

      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });
  });

  describe("logging", () => {
    it("should log get payment start", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "GetPaymentDetailsUseCase",
          event: "GET_PAYMENT_STARTED",
          data: { orderId: mockOrderId },
        }),
      );
    });

    it("should log successful get payment", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "GetPaymentDetailsUseCase",
          event: "GET_PAYMENT_SUCCESSFUL",
          data: { orderId: mockOrderId },
        }),
      );
    });

    it("should not log success when error occurs", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
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

      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      mockOrderRepository.findById.mockResolvedValue(order);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });
  });

  describe("edge cases", () => {
    it("should handle payment with large amount", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const largeAmount = 9999999999;
      const paymentTransaction = PaymentTransaction.rebuild({
        id: mockPaymentTransactionId,
        orderId: mockOrderId,
        type: PaymentTransactionType.CHARGE,
        amount: largeAmount,
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
      });
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const detailsViewWithLargeAmount = {
        ...mockPaymentDetailsView,
        amount: largeAmount,
      };
      (PaymentMapper.toDetailsView as jest.Mock).mockReturnValue(detailsViewWithLargeAmount);

      const result = await useCase.execute(command);

      expect(result.payment.amount).toBe(largeAmount);
    });

    it("should handle payment with special characters in IDs", async () => {
      const specialId = "txn-123_!@#$%^&*()";
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: specialId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(mockMemberId);

      const specialTransaction = PaymentTransaction.rebuild({
        id: specialId,
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
      });

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(specialTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const detailsViewWithSpecialId = {
        ...mockPaymentDetailsView,
        id: specialId,
      };
      (PaymentMapper.toDetailsView as jest.Mock).mockReturnValue(detailsViewWithSpecialId);

      const result = await useCase.execute(command);

      expect(result.payment.id).toBe(specialId);
    });

    it("should handle payment with completedAt null", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction(PaymentTransactionStatus.PENDING);
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const detailsViewWithNullCompletedAt = {
        ...mockPaymentDetailsView,
        status: PaymentTransactionStatus.PENDING,
        completedAt: null,
      };
      (PaymentMapper.toDetailsView as jest.Mock).mockReturnValue(detailsViewWithNullCompletedAt);

      const result = await useCase.execute(command);

      expect(result.payment.completedAt).toBeNull();
    });

    it("should handle staff access with ADMIN role", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        role: UserRoleType.ADMIN,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result.scope).toBe("staff");
      expect(PaymentMapper.toPlainObject).toHaveBeenCalledWith(paymentTransaction);
    });

    it("should handle customer access with MANAGER role (if not staff)", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        role: UserRoleType.MANAGER,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result.scope).toBe("customer");
      expect(PaymentMapper.toDetailsView).toHaveBeenCalledWith(paymentTransaction);
    });
  });

  describe("PaymentMapper interaction", () => {
    it("should call toDetailsView for customer scope", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      await useCase.execute(command);

      expect(PaymentMapper.toDetailsView).toHaveBeenCalledTimes(1);
      expect(PaymentMapper.toDetailsView).toHaveBeenCalledWith(paymentTransaction);
      expect(PaymentMapper.toPlainObject).not.toHaveBeenCalled();
    });

    it("should call toPlainObject for staff scope", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        role: UserRoleType.ADMIN,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      await useCase.execute(command);

      expect(PaymentMapper.toPlainObject).toHaveBeenCalledTimes(1);
      expect(PaymentMapper.toPlainObject).toHaveBeenCalledWith(paymentTransaction);
      expect(PaymentMapper.toDetailsView).not.toHaveBeenCalled();
    });

    it("should return the result from PaymentMapper for customer scope", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result.payment).toBe(mockPaymentDetailsView);
    });

    it("should return the result from PaymentMapper for staff scope", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        role: UserRoleType.ADMIN,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result.payment).toBe(mockPaymentPlainObject);
    });

    it("should handle PaymentMapper throwing error", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);
      (PaymentMapper.toDetailsView as jest.Mock).mockImplementation(() => {
        throw new Error("Mapper error");
      });

      await expect(useCase.execute(command)).rejects.toThrow("Mapper error");
    });
  });

  describe("result structure verification", () => {
    it("should return customer scope result with correct structure", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        memberId: mockMemberId,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(false);

      const result = await useCase.execute(command);

      expect(result).toHaveProperty("scope");
      expect(result).toHaveProperty("payment");
      expect(result.scope).toBe("customer");
      expect(result.payment).toHaveProperty("id");
      expect(result.payment).toHaveProperty("orderId");
      expect(result.payment).toHaveProperty("type");
      expect(result.payment).toHaveProperty("amount");
      expect(result.payment).toHaveProperty("method");
      expect(result.payment).toHaveProperty("status");
      expect(result.payment).toHaveProperty("completedAt");
      expect(result.payment).toHaveProperty("createdAt");
    });

    it("should return staff scope result with correct structure", async () => {
      const command: GetPaymentDetailsCommand = {
        orderId: mockOrderId,
        paymentId: mockPaymentTransactionId,
        role: UserRoleType.ADMIN,
      };

      const paymentTransaction = createMockPaymentTransaction();
      const order = createMockOrder(mockMemberId);

      mockOrderRepository.findById.mockResolvedValue(order);
      mockPaymentTransactionRepository.findById.mockResolvedValue(paymentTransaction);
      (OrderAccessControlService.canStaffAccessOrders as jest.Mock).mockReturnValue(true);

      const result = await useCase.execute(command);

      expect(result).toHaveProperty("scope");
      expect(result).toHaveProperty("payment");
      expect(result.scope).toBe("staff");
      expect(result.payment).toHaveProperty("id");
      expect(result.payment).toHaveProperty("orderId");
      expect(result.payment).toHaveProperty("type");
      expect(result.payment).toHaveProperty("amount");
      expect(result.payment).toHaveProperty("method");
      expect(result.payment).toHaveProperty("status");
      expect(result.payment).toHaveProperty("provider");
      expect(result.payment).toHaveProperty("providerReferenceId");
      expect(result.payment).toHaveProperty("createdAt");
      expect(result.payment).toHaveProperty("updatedAt");
    });
  });
});
