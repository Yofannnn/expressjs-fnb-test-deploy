import { GetOrderDetailsUseCase } from "@/application/use-cases/order/get-order-details.use-case";
import { GetOrderDetailsCommand } from "@/application/ports/driving/get-order-details.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
// import { OrderAccessResolver } from "@/application/ports/driven/order-access-resolver";
import { OrderMapper } from "@/application/mappers/order.mapper";
import { Order } from "@/domain/entities/order.entity";
import { Product } from "@/domain/entities/product.entity";
import { OrderAccessControlService } from "@/domain/services/order-access-control.service";
import { ProductStatus, ProductType } from "@/domain/types/product.type";
import { DeliveryType, OrderCustomerType, OrderStatus, OrderType, ReservationStatus } from "@/domain/types/order.type";
import { PaymentMethod, PaymentStatus } from "@/domain/types/payment-transaction.type";
import { ForbiddenActionException } from "@/domain/exceptions/access-control.exceptions";

jest.mock("@/domain/services/order-access-control.service");
jest.mock("@/application/mappers/order.mapper");

describe("GetOrderDetailsUseCase", () => {
  let useCase: GetOrderDetailsUseCase;
  let mockOrderRepository: jest.Mocked<OrderRepositoryPort>;
  let mockProductRepository: jest.Mocked<ProductRepositoryPort>;
  // let mockOrderAccessResolver: jest.Mocked<OrderAccessResolver>;
  let mockLogger: jest.Mocked<LoggerPort>;

  const mockOrderId = "order-123";
  const mockMemberId = "member-123";
  const mockGuestEmail = "guest@example.com";
  const mockGuestToken = "guest-token-123";
  const mockProductId = "product-123";
  const mockProductId2 = "product-456";

  const mockProduct1 = {
    getId: jest.fn().mockReturnValue(mockProductId),
    getName: jest.fn().mockReturnValue("Product 1"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(100000) }),
    getDescription: jest.fn().mockReturnValue("Description 1"),
    getType: jest.fn().mockReturnValue(ProductType.FOOD),
    getStockQuantity: jest.fn().mockReturnValue(10),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue([]),
    getCategoryId: jest.fn().mockReturnValue("cat-1"),
  } as unknown as jest.Mocked<Product>;

  const mockProduct2 = {
    getId: jest.fn().mockReturnValue(mockProductId2),
    getName: jest.fn().mockReturnValue("Product 2"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(50000) }),
    getDescription: jest.fn().mockReturnValue("Description 2"),
    getType: jest.fn().mockReturnValue(ProductType.DRINK),
    getStockQuantity: jest.fn().mockReturnValue(5),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue([]),
    getCategoryId: jest.fn().mockReturnValue("cat-1"),
  } as unknown as jest.Mocked<Product>;

  const mockProducts = [mockProduct1, mockProduct2];

  const mockOrderDetailsView = {
    id: mockOrderId,
    type: OrderType.ONLINE,
    customer: {
      memberId: mockMemberId,
      guestName: null,
      guestEmail: null,
    },
    fulfillment: {
      deliveryType: DeliveryType.DELIVERY,
      deliveryLocation: {
        address: "Jl. Sudirman No. 1",
        latitude: -6.2088,
        longitude: 106.8456,
      },
      scheduledAt: new Date("2024-01-15T14:00:00Z"),
    },
    items: [
      {
        productId: mockProductId,
        productName: "Product 1",
        priceSnapshot: 100000,
        quantity: 2,
        note: null,
        imageUrl: null,
      },
      {
        productId: mockProductId2,
        productName: "Product 2",
        priceSnapshot: 50000,
        quantity: 1,
        note: "Extra sauce",
        imageUrl: null,
      },
    ],
    payment: {
      status: PaymentStatus.UNPAID,
      method: null,
      paidAt: null,
      transactionId: null,
    },
    pricing: {
      subtotal: 250000,
      tax: 25000,
      serviceCharge: 12500,
      deliveryFee: 15000,
      discount: 5000,
      total: 297500,
    },
    status: OrderStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrderRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<OrderRepositoryPort>;

    mockProductRepository = {
      findByIds: jest.fn(),
    } as unknown as jest.Mocked<ProductRepositoryPort>;

    // mockOrderAccessResolver = {
    //   resolveGuestEmail: jest.fn(),
    // } as unknown as jest.Mocked<OrderAccessResolver>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
    };

    (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {});
    (OrderMapper.toDetailsView as jest.Mock).mockReturnValue(mockOrderDetailsView);

    useCase = new GetOrderDetailsUseCase(mockOrderRepository, mockProductRepository, mockOrderAccessResolver, mockLogger);
  });

  const createMockOrder = (
    type: OrderType = OrderType.ONLINE,
    memberId: string | null = mockMemberId,
    guestEmail: string | null = null,
    isPaid: boolean = false,
  ): Order => {
    const now = new Date();
    return Order.rebuild({
      id: mockOrderId,
      customer: {
        type: memberId ? OrderCustomerType.MEMBER : OrderCustomerType.GUEST,
        memberId: memberId,
        guestName: memberId ? null : "John Doe",
        guestEmail: memberId ? null : guestEmail || "guest@example.com",
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
        reservation:
          type === OrderType.RESERVATION
            ? {
                tableId: "table-123",
                reservedAt: new Date("2024-01-15T10:30:00Z"),
                partySize: 4,
                durationInMinutes: 120,
                reservationStatus: ReservationStatus.BOOKED,
                notes: "Special occasion",
              }
            : null,
      },
      items: [
        {
          productId: mockProductId,
          productName: "Product 1",
          priceSnapshot: 100000,
          quantity: 2,
          note: null,
        },
        {
          productId: mockProductId2,
          productName: "Product 2",
          priceSnapshot: 50000,
          quantity: 1,
          note: "Extra sauce",
        },
      ],
      pricing: {
        subtotal: 250000,
        tax: 25000,
        serviceCharge: 12500,
        deliveryFee: 15000,
        discount: 5000,
        total: 297500,
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
    it("should get order details for member user", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrderId);
      expect(result.type).toBe(OrderType.ONLINE);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([mockProductId, mockProductId2]);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, mockMemberId, undefined);
      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, mockProducts);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should get order details for guest user with token", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        guestToken: mockGuestToken,
      };

      const order = createMockOrder(OrderType.ONLINE, null, mockGuestEmail);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue(mockGuestEmail);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrderId);
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockOrderAccessResolver.resolveGuestEmail).toHaveBeenCalledWith(mockOrderId, mockGuestToken);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, undefined, mockGuestEmail);
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([mockProductId, mockProductId2]);
    });

    it("should get order details with only memberId", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrderId);
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, mockMemberId, undefined);
    });

    it("should get ONLINE order with delivery fulfillment", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      const result = await useCase.execute(command);

      expect(result.type).toBe(OrderType.ONLINE);
      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, mockProducts);
    });

    it("should get ONLINE order with pickup fulfillment", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
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
            scheduledAt: new Date("2024-01-15T14:00:00Z"),
          },
          reservation: null,
        },
        items: [
          {
            productId: mockProductId,
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

      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue([mockProduct1]);

      const result = await useCase.execute(command);

      expect(result.type).toBe(OrderType.ONLINE);
      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, [mockProduct1]);
    });

    it("should get DINEIN order", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.DINEIN, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      // Create a DINEIN-specific mock view
      const dineInMockView = {
        ...mockOrderDetailsView,
        type: OrderType.DINEIN,
      };
      (OrderMapper.toDetailsView as jest.Mock).mockReturnValue(dineInMockView);

      const result = await useCase.execute(command);

      expect(result.type).toBe(OrderType.DINEIN);
      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, mockProducts);
    });

    it("should get RESERVATION order", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.RESERVATION, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      // Create a RESERVATION-specific mock view
      const reservationMockView = {
        ...mockOrderDetailsView,
        type: OrderType.RESERVATION,
      };
      (OrderMapper.toDetailsView as jest.Mock).mockReturnValue(reservationMockView);

      const result = await useCase.execute(command);

      expect(result.type).toBe(OrderType.RESERVATION);
      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, mockProducts);
    });

    it("should get order with empty items", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
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
      mockProductRepository.findByIds.mockResolvedValue([]);

      await useCase.execute(command);

      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([]);
      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, []);
    });

    it("should get order with products that have images", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      await useCase.execute(command);

      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, mockProducts);
    });
  });

  describe("validation", () => {
    it("should throw ORDER_NOT_FOUND when order does not exist", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      mockOrderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: "Order not found",
      });

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockProductRepository.findByIds).not.toHaveBeenCalled();
      expect(OrderMapper.toDetailsView).not.toHaveBeenCalled();
    });

    it("rejects with ForbiddenActionException when user is not authorized", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: "wrong-user",
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);

      (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {
        throw new ForbiddenActionException(command.memberId!, "view order");
      });

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: "Order access denied",
      });

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockProductRepository.findByIds).not.toHaveBeenCalled();
      expect(OrderMapper.toDetailsView).not.toHaveBeenCalled();
    });

    it("should throw ORDER_ACCESS_DENIED when guest token resolves to wrong email", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        guestToken: mockGuestToken,
      };

      const order = createMockOrder(OrderType.ONLINE, null, mockGuestEmail);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue("wrong@example.com");

      (OrderAccessControlService.assertOwnership as jest.Mock).mockImplementation(() => {
        throw ORDER_EXCEPTIONS.ORDER_ACCESS_DENIED();
      });

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: "OrderException",
        message: "Order access denied",
      });

      expect(mockOrderAccessResolver.resolveGuestEmail).toHaveBeenCalledWith(mockOrderId, mockGuestToken);
    });
  });

  describe("error handling", () => {
    it("should propagate repository error", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      mockOrderRepository.findById.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Database error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should propagate product repository error", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockRejectedValue(new Error("Product database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Product database error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should propagate order access resolver error", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        guestToken: mockGuestToken,
      };

      const order = createMockOrder(OrderType.ONLINE, null, mockGuestEmail);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockRejectedValue(new Error("Resolver error"));

      await expect(useCase.execute(command)).rejects.toThrow("Resolver error");
    });
  });

  describe("logging", () => {
    it("should log get order start", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "GetOrderDetailsUseCase",
          event: "GET_ORDER_STARTED",
          data: { orderId: mockOrderId },
        }),
      );
    });

    it("should log successful get order", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "GetOrderDetailsUseCase",
          event: "GET_ORDER_SUCCESSFUL",
          data: { orderId: mockOrderId },
        }),
      );
    });

    it("should not log success when error occurs", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
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
  });

  describe("edge cases", () => {
    it("should handle order with null notes in reservation", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
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
        type: OrderType.RESERVATION,
        fulfillment: {
          type: OrderType.RESERVATION,
          dineIn: null,
          online: null,
          reservation: {
            tableId: "table-123",
            reservedAt: new Date("2024-01-15T10:30:00Z"),
            partySize: 4,
            durationInMinutes: 120,
            reservationStatus: ReservationStatus.BOOKED,
            notes: null,
          },
        },
        items: [
          {
            productId: mockProductId,
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

      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue([mockProduct1]);

      await useCase.execute(command);

      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, [mockProduct1]);
    });

    it("should handle order with cashierSessionId null in DINEIN", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
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
        type: OrderType.DINEIN,
        fulfillment: {
          type: OrderType.DINEIN,
          dineIn: {
            tableId: "table-123",
            tableNumber: "T-01",
            guestCount: 4,
            cashierSessionId: null,
          },
          online: null,
          reservation: null,
        },
        items: [
          {
            productId: mockProductId,
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

      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue([mockProduct1]);

      await useCase.execute(command);

      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, [mockProduct1]);
    });

    it("should handle order with guest token and memberId both provided", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
        guestToken: mockGuestToken,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue(mockGuestEmail);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, mockMemberId, mockGuestEmail);
      expect(mockOrderAccessResolver.resolveGuestEmail).toHaveBeenCalledWith(mockOrderId, mockGuestToken);
    });

    it("should handle order with no products in items", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue([]);

      await useCase.execute(command);

      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([mockProductId, mockProductId2]);
      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, []);
    });
  });

  describe("OrderMapper interaction", () => {
    it("should call toDetailsView with order and products", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      await useCase.execute(command);

      expect(OrderMapper.toDetailsView).toHaveBeenCalledTimes(1);
      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, mockProducts);
    });

    it("should return the result from OrderMapper", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      const result = await useCase.execute(command);

      expect(result).toBe(mockOrderDetailsView);
    });

    it("should handle OrderMapper throwing error", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      const mapperError = new Error("Mapper error");
      (OrderMapper.toDetailsView as jest.Mock).mockImplementation(() => {
        throw mapperError;
      });

      await expect(useCase.execute(command)).rejects.toThrow("Mapper error");
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle order with memberId and guestEmail from resolver", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
        guestToken: mockGuestToken,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue(mockGuestEmail);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      await useCase.execute(command);

      expect(mockOrderAccessResolver.resolveGuestEmail).toHaveBeenCalledWith(mockOrderId, mockGuestToken);
    });

    it("should handle order with guest token but no memberId", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        guestToken: mockGuestToken,
      };

      const order = createMockOrder(OrderType.ONLINE, null, mockGuestEmail);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockOrderAccessResolver.resolveGuestEmail.mockResolvedValue(mockGuestEmail);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      await useCase.execute(command);

      expect(OrderAccessControlService.assertOwnership).toHaveBeenCalledWith(order, undefined, mockGuestEmail);
    });

    it("should handle order with paid status", async () => {
      const command: GetOrderDetailsCommand = {
        id: mockOrderId,
        memberId: mockMemberId,
      };

      const order = createMockOrder(OrderType.ONLINE, mockMemberId, null, true);
      mockOrderRepository.findById.mockResolvedValue(order);
      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      await useCase.execute(command);

      expect(OrderMapper.toDetailsView).toHaveBeenCalledWith(order, mockProducts);
    });
  });
});
