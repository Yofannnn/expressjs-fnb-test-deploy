import { BrowseOrdersUseCase } from "@/application/use-cases/order/browse-orders.use-case";
import { BrowseOrdersCommand, BrowseOrdersQueryCommand, OrderSort } from "@/application/ports/driving/browse-orders.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { OrderMapper } from "@/application/mappers/order.mapper";
import { Order } from "@/domain/entities/order.entity";
import { OrderSummaryView } from "@/application/types/order.type";
import { DeliveryType, OrderCustomerType, OrderStatus, OrderType, ReservationStatus } from "@/domain/types/order.type";
import { PaymentStatus } from "@/domain/types/payment-transaction.type";
import { UserRoleType } from "@/domain/types/user.type";

jest.mock("@/application/mappers/order.mapper");

describe("BrowseOrdersUseCase", () => {
  let useCase: BrowseOrdersUseCase;
  let mockOrderRepository: jest.Mocked<OrderRepositoryPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  const mockUserId = "user-123";
  const mockStartTime = 1000;

  const createMockOrder = (
    id: string,
    type: OrderType = OrderType.ONLINE,
    status: OrderStatus = OrderStatus.PENDING,
    itemCount: number = 2,
    total: number = 297500,
    memberId: string | null = mockUserId,
    guestEmail: string | null = null,
  ): Order => {
    const now = new Date();
    return Order.rebuild({
      id,
      customer: {
        type: memberId ? OrderCustomerType.MEMBER : OrderCustomerType.GUEST,
        memberId,
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
      items: Array.from({ length: itemCount }, (_, i) => ({
        productId: `product-${i + 1}`,
        productName: `Product ${i + 1}`,
        priceSnapshot: 100000,
        quantity: 2,
        note: null,
      })),
      pricing: {
        subtotal: 250000,
        tax: 25000,
        serviceCharge: 12500,
        deliveryFee: 15000,
        discount: 5000,
        total,
      },
      payment: {
        status: PaymentStatus.UNPAID,
        method: null,
        paidAt: null,
        transactionId: null,
      },
      status,
      createdAt: now,
      updatedAt: now,
    });
  };

  const mockOrder1 = createMockOrder("order-1", OrderType.ONLINE, OrderStatus.PENDING, 2, 297500);
  const mockOrder2 = createMockOrder("order-2", OrderType.DINEIN, OrderStatus.CONFIRMED, 3, 150000);
  const mockOrder3 = createMockOrder("order-3", OrderType.RESERVATION, OrderStatus.COMPLETED, 1, 50000);
  const mockOrders = [mockOrder1, mockOrder2, mockOrder3];

  const mockSummaryView1: OrderSummaryView = {
    id: "order-1",
    type: OrderType.ONLINE,
    status: OrderStatus.PENDING,
    itemCount: 2,
    total: 297500,
    createdAt: new Date(),
  };

  const mockSummaryView2: OrderSummaryView = {
    id: "order-2",
    type: OrderType.DINEIN,
    status: OrderStatus.CONFIRMED,
    itemCount: 3,
    total: 150000,
    createdAt: new Date(),
  };

  const mockSummaryView3: OrderSummaryView = {
    id: "order-3",
    type: OrderType.RESERVATION,
    status: OrderStatus.COMPLETED,
    itemCount: 1,
    total: 50000,
    createdAt: new Date(),
  };

  const mockSummaryViews = [mockSummaryView1, mockSummaryView2, mockSummaryView3];

  const mockQuery: BrowseOrdersQueryCommand = {
    type: OrderType.ONLINE,
    status: OrderStatus.PENDING,
    sort: OrderSort.NEWEST,
  };

  const mockCommand: BrowseOrdersCommand = {
    userId: mockUserId,
    role: UserRoleType.MEMBER,
    query: mockQuery,
  };

  const setupMapperMock = () => {
    (OrderMapper.toSummaryView as jest.Mock)
      .mockReset()
      .mockReturnValueOnce(mockSummaryView1)
      .mockReturnValueOnce(mockSummaryView2)
      .mockReturnValueOnce(mockSummaryView3);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrderRepository = {
      findById: jest.fn(),
      browse: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
    };

    mockOrderRepository.browse.mockResolvedValue(mockOrders);
    setupMapperMock();

    useCase = new BrowseOrdersUseCase(mockOrderRepository, mockLogger);
  });

  describe("execute", () => {
    it("should successfully browse orders for member user", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...mockQuery,
        memberId: mockUserId,
      });
      expect(OrderMapper.toSummaryView).toHaveBeenCalledTimes(3);
    });

    it("should browse orders for admin with memberId undefined", async () => {
      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.ADMIN,
        query: mockQuery,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...mockQuery,
        memberId: undefined,
      });
    });

    it("should browse orders for manager with memberId undefined", async () => {
      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MANAGER,
        query: mockQuery,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...mockQuery,
        memberId: undefined,
      });
    });

    it("should return empty array when no orders found", async () => {
      mockOrderRepository.browse.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(OrderMapper.toSummaryView).not.toHaveBeenCalled();
    });

    it("should log debug message when starting", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "BrowseOrdersUseCase",
        event: "BROWSE_ORDERS_STARTED",
        message: "Orders is being retrieved",
        data: { query: mockQuery },
      });
    });

    it("should log info message when successful", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "BrowseOrdersUseCase",
        event: "BROWSE_ORDERS_SUCCESSFUL",
        message: "Orders retrieved successfully",
        durationMs: 100,
        data: { query: mockQuery },
      });

      dateNowSpy.mockRestore();
    });

    it("should handle repository error", async () => {
      const repoError = new Error("Repository error");
      mockOrderRepository.browse.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should call browse with correct parameters", async () => {
      await useCase.execute(mockCommand);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...mockQuery,
        memberId: mockUserId,
      });
    });

    it("should handle empty query", async () => {
      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MEMBER,
        query: {},
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        memberId: mockUserId,
      });
    });

    it("should handle query with only type", async () => {
      const query: BrowseOrdersQueryCommand = {
        type: OrderType.ONLINE,
      };

      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MEMBER,
        query,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...query,
        memberId: mockUserId,
      });
    });

    it("should handle query with only status", async () => {
      const query: BrowseOrdersQueryCommand = {
        status: OrderStatus.PENDING,
      };

      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MEMBER,
        query,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...query,
        memberId: mockUserId,
      });
    });

    it("should handle query with only sort", async () => {
      const query: BrowseOrdersQueryCommand = {
        sort: OrderSort.NEWEST,
      };

      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MEMBER,
        query,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...query,
        memberId: mockUserId,
      });
    });

    it("should handle query with type and status", async () => {
      const query: BrowseOrdersQueryCommand = {
        type: OrderType.DINEIN,
        status: OrderStatus.CONFIRMED,
      };

      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MEMBER,
        query,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...query,
        memberId: mockUserId,
      });
    });
  });

  describe("OrderMapper interaction", () => {
    it("should call toSummaryView for each order", async () => {
      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(OrderMapper.toSummaryView).toHaveBeenCalledTimes(3);
      expect(OrderMapper.toSummaryView).toHaveBeenCalledWith(mockOrder1);
      expect(OrderMapper.toSummaryView).toHaveBeenCalledWith(mockOrder2);
      expect(OrderMapper.toSummaryView).toHaveBeenCalledWith(mockOrder3);
    });

    it("should return the mapped summary views", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result).toEqual(mockSummaryViews);
    });

    it("should handle mapper returning null for an order", async () => {
      (OrderMapper.toSummaryView as jest.Mock)
        .mockReset()
        .mockReturnValueOnce(mockSummaryView1)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockSummaryView3);

      const result = await useCase.execute(mockCommand);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockSummaryView1);
      expect(result[1]).toBeNull();
      expect(result[2]).toEqual(mockSummaryView3);
    });

    it("should handle mapper throwing error", async () => {
      const mapperError = new Error("Mapper error");
      (OrderMapper.toSummaryView as jest.Mock)
        .mockReset()
        .mockImplementationOnce(() => {
          throw mapperError;
        })
        .mockImplementationOnce(() => mockSummaryView2)
        .mockImplementationOnce(() => mockSummaryView3);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(mapperError);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with query", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "BrowseOrdersUseCase",
        event: "BROWSE_ORDERS_STARTED",
        message: "Orders is being retrieved",
        data: { query: mockQuery },
      });
    });

    it("should log successful browse with duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "BrowseOrdersUseCase",
        event: "BROWSE_ORDERS_SUCCESSFUL",
        message: "Orders retrieved successfully",
        durationMs: 150,
        data: { query: mockQuery },
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful browse with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "BrowseOrdersUseCase",
        event: "BROWSE_ORDERS_SUCCESSFUL",
        message: "Orders retrieved successfully",
        durationMs: 250,
        data: { query: mockQuery },
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when repository error occurs", async () => {
      const repoError = new Error("Repository error");
      mockOrderRepository.browse.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle logger debug throwing error", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });

    it("should handle logger info throwing error", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle large result set", async () => {
      const largeOrderSet: Order[] = Array.from({ length: 100 }, (_, i) =>
        createMockOrder(`order-${i}`, OrderType.ONLINE, OrderStatus.PENDING, 2, 297500),
      );

      mockOrderRepository.browse.mockResolvedValue(largeOrderSet);

      (OrderMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((order) => ({
        id: order.getId(),
        type: order.getType(),
        status: order.getStatus(),
        itemCount: order.getItems().length,
        total: order.getPricing().getTotal().getAmount(),
        createdAt: order.getCreatedAt(),
      }));

      const result = await useCase.execute(mockCommand);

      expect(result).toHaveLength(100);
      expect(result[0].id).toBe("order-0");
      expect(result[99].id).toBe("order-99");
    });

    it("should handle multiple browses with different queries", async () => {
      const queries = [
        { type: OrderType.ONLINE },
        { status: OrderStatus.PENDING },
        { sort: OrderSort.NEWEST },
        { type: OrderType.DINEIN, status: OrderStatus.CONFIRMED },
      ];

      for (const query of queries) {
        mockOrderRepository.browse.mockResolvedValue([mockOrder1]);
        (OrderMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

        const command: BrowseOrdersCommand = {
          userId: mockUserId,
          role: UserRoleType.MEMBER,
          query,
        };

        const result = await useCase.execute(command);
        expect(result).toHaveLength(1);
        expect(mockOrderRepository.browse).toHaveBeenCalledWith({
          ...query,
          memberId: mockUserId,
        });
      }
    });

    it("should handle browse with no results multiple times", async () => {
      mockOrderRepository.browse.mockResolvedValue([]);

      const firstResult = await useCase.execute(mockCommand);
      const secondResult = await useCase.execute(mockCommand);

      expect(firstResult).toEqual([]);
      expect(secondResult).toEqual([]);
      expect(mockOrderRepository.browse).toHaveBeenCalledTimes(2);
    });

    it("should handle different order types in results", async () => {
      const orders = [
        createMockOrder("order-1", OrderType.ONLINE, OrderStatus.PENDING),
        createMockOrder("order-2", OrderType.DINEIN, OrderStatus.CONFIRMED),
        createMockOrder("order-3", OrderType.RESERVATION, OrderStatus.COMPLETED),
      ];

      mockOrderRepository.browse.mockResolvedValue(orders);

      (OrderMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((order) => ({
        id: order.getId(),
        type: order.getType(),
        status: order.getStatus(),
        itemCount: order.getItems().length,
        total: order.getPricing().getTotal().getAmount(),
        createdAt: order.getCreatedAt(),
      }));

      const result = await useCase.execute(mockCommand);

      expect(result[0].type).toBe(OrderType.ONLINE);
      expect(result[1].type).toBe(OrderType.DINEIN);
      expect(result[2].type).toBe(OrderType.RESERVATION);
    });

    it("should handle different order statuses in results", async () => {
      const orders = [
        createMockOrder("order-1", OrderType.ONLINE, OrderStatus.PENDING),
        createMockOrder("order-2", OrderType.ONLINE, OrderStatus.CONFIRMED),
        createMockOrder("order-3", OrderType.ONLINE, OrderStatus.COMPLETED),
        createMockOrder("order-4", OrderType.ONLINE, OrderStatus.CANCELLED),
      ];

      mockOrderRepository.browse.mockResolvedValue(orders);

      (OrderMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((order) => ({
        id: order.getId(),
        type: order.getType(),
        status: order.getStatus(),
        itemCount: order.getItems().length,
        total: order.getPricing().getTotal().getAmount(),
        createdAt: order.getCreatedAt(),
      }));

      const result = await useCase.execute(mockCommand);

      expect(result[0].status).toBe(OrderStatus.PENDING);
      expect(result[1].status).toBe(OrderStatus.CONFIRMED);
      expect(result[2].status).toBe(OrderStatus.COMPLETED);
      expect(result[3].status).toBe(OrderStatus.CANCELLED);
    });

    it("should handle orders with different item counts", async () => {
      const orders = [
        createMockOrder("order-1", OrderType.ONLINE, OrderStatus.PENDING, 1, 100000),
        createMockOrder("order-2", OrderType.ONLINE, OrderStatus.PENDING, 3, 300000),
        createMockOrder("order-3", OrderType.ONLINE, OrderStatus.PENDING, 5, 500000),
      ];

      mockOrderRepository.browse.mockResolvedValue(orders);

      (OrderMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((order) => ({
        id: order.getId(),
        type: order.getType(),
        status: order.getStatus(),
        itemCount: order.getItems().length,
        total: order.getPricing().getTotal().getAmount(),
        createdAt: order.getCreatedAt(),
      }));

      const result = await useCase.execute(mockCommand);

      expect(result[0].itemCount).toBe(1);
      expect(result[1].itemCount).toBe(3);
      expect(result[2].itemCount).toBe(5);
    });

    it("should handle orders with different totals", async () => {
      const orders = [
        createMockOrder("order-1", OrderType.ONLINE, OrderStatus.PENDING, 2, 100000),
        createMockOrder("order-2", OrderType.ONLINE, OrderStatus.PENDING, 2, 200000),
        createMockOrder("order-3", OrderType.ONLINE, OrderStatus.PENDING, 2, 300000),
      ];

      mockOrderRepository.browse.mockResolvedValue(orders);

      (OrderMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((order) => ({
        id: order.getId(),
        type: order.getType(),
        status: order.getStatus(),
        itemCount: order.getItems().length,
        total: order.getPricing().getTotal().getAmount(),
        createdAt: order.getCreatedAt(),
      }));

      const result = await useCase.execute(mockCommand);

      expect(result[0].total).toBe(100000);
      expect(result[1].total).toBe(200000);
      expect(result[2].total).toBe(300000);
    });
  });

  describe("return value verification", () => {
    it("should return array of OrderSummaryView", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("type");
      expect(result[0]).toHaveProperty("status");
      expect(result[0]).toHaveProperty("itemCount");
      expect(result[0]).toHaveProperty("total");
      expect(result[0]).toHaveProperty("createdAt");
    });

    it("should return correct data types", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(typeof result[0].id).toBe("string");
      expect(typeof result[0].type).toBe("string");
      expect(typeof result[0].status).toBe("string");
      expect(typeof result[0].itemCount).toBe("number");
      expect(typeof result[0].total).toBe("number");
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it("should maintain order of orders", async () => {
      const orderedOrders = [
        createMockOrder("first", OrderType.ONLINE, OrderStatus.PENDING),
        createMockOrder("second", OrderType.ONLINE, OrderStatus.PENDING),
        createMockOrder("third", OrderType.ONLINE, OrderStatus.PENDING),
      ];

      mockOrderRepository.browse.mockResolvedValue(orderedOrders);

      (OrderMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((order) => ({
        id: order.getId(),
        type: order.getType(),
        status: order.getStatus(),
        itemCount: order.getItems().length,
        total: order.getPricing().getTotal().getAmount(),
        createdAt: order.getCreatedAt(),
      }));

      const result = await useCase.execute(mockCommand);

      expect(result[0].id).toBe("first");
      expect(result[1].id).toBe("second");
      expect(result[2].id).toBe("third");
    });
  });

  describe("error handling scenarios", () => {
    it("should handle repository timeout error", async () => {
      const timeoutError = new Error("Timeout error");
      mockOrderRepository.browse.mockRejectedValue(timeoutError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Timeout error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository connection error", async () => {
      const connectionError = new Error("Database connection error");
      mockOrderRepository.browse.mockRejectedValue(connectionError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Database connection error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository returning empty array", async () => {
      mockOrderRepository.browse.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);
      expect(result).toEqual([]);
    });
  });

  describe("role-based access", () => {
    it("should include memberId for MEMBER role", async () => {
      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MEMBER,
        query: mockQuery,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...mockQuery,
        memberId: mockUserId,
      });
    });

    it("should not include memberId for ADMIN role", async () => {
      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.ADMIN,
        query: mockQuery,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...mockQuery,
        memberId: undefined,
      });
    });

    it("should not include memberId for MANAGER role", async () => {
      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MANAGER,
        query: mockQuery,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...mockQuery,
        memberId: undefined,
      });
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle OrderSort.NEWEST", async () => {
      const query: BrowseOrdersQueryCommand = {
        sort: OrderSort.NEWEST,
      };

      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MEMBER,
        query,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...query,
        memberId: mockUserId,
      });
    });

    it("should handle OrderSort.OLDEST", async () => {
      const query: BrowseOrdersQueryCommand = {
        sort: OrderSort.OLDEST,
      };

      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MEMBER,
        query,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...query,
        memberId: mockUserId,
      });
    });

    it("should handle query with all fields", async () => {
      const query: BrowseOrdersQueryCommand = {
        type: OrderType.ONLINE,
        status: OrderStatus.PENDING,
        sort: OrderSort.NEWEST,
      };

      const command: BrowseOrdersCommand = {
        userId: mockUserId,
        role: UserRoleType.MEMBER,
        query,
      };

      await useCase.execute(command);

      expect(mockOrderRepository.browse).toHaveBeenCalledWith({
        ...query,
        memberId: mockUserId,
      });
    });

    it("should handle OrderMapper returning undefined", async () => {
      (OrderMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(undefined);

      const result = await useCase.execute(mockCommand);

      expect(result[0]).toBeUndefined();
      expect(result).toHaveLength(3);
    });
  });
});
