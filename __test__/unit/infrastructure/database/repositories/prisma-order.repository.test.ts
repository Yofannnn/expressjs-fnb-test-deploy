import { PrismaOrderRepository } from "@/infrastructure/database/repositories/prisma-order.repository";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
import { Logger } from "@/application/ports/driven/logger";
import { TransactionContext } from "@/application/ports/driven/database";
import { BrowseOrdersQuery } from "@/application/ports/driven/order.repository";
import { Order } from "@/domain/entities/order.entity";
import { OrderType } from "@/domain/types/order-type.enum";
import { OrderStatus } from "@/domain/types/order-status.enum";
import { DeliveryType } from "@/domain/types/delivery-type.enum";
import { PaymentMethod } from "@/domain/types/payment-method.enum";
import { PaymentStatus } from "@/domain/types/payment-status.enum";
import { ReservationStatus } from "@/domain/types/reservation-status.enum";

describe("PrismaOrderRepository", () => {
  let repository: PrismaOrderRepository;
  let mockLogger: jest.Mocked<Logger>;
  let mockDbClient: jest.Mocked<PrismaDatabaseClient>;
  let mockPrismaClient: jest.Mocked<any>;

  const mockOrderId = "order-123";
  const mockMemberId = "member-123";
  const mockGuestEmail = "guest@example.com";
  const mockGuestName = "John Doe";
  const mockProductId = "product-123";
  const mockProductId2 = "product-456";
  const mockTableId = "table-123";
  const mockTableNumber = "T-01";
  const mockCashierSessionId = "session-456";
  const mockCreatedAt = new Date("2024-01-01T10:00:00.000Z");
  const mockUpdatedAt = new Date("2024-01-01T11:00:00.000Z");
  const mockReservedAt = new Date("2024-01-15T10:30:00.000Z");
  const mockScheduledAt = new Date("2024-01-15T14:00:00.000Z");
  const mockPaidAt = new Date("2024-01-01T10:30:00.000Z");

  const mockPrismaOrderItem = {
    productId: mockProductId,
    productName: "Test Product",
    priceSnapshot: 100000,
    quantity: 2,
    note: null,
  };

  const mockPrismaOrderItem2 = {
    productId: mockProductId2,
    productName: "Test Product 2",
    priceSnapshot: 50000,
    quantity: 1,
    note: "Extra sauce",
  };

  const mockPrismaOnlineOrder = {
    id: mockOrderId,
    type: "ONLINE",
    status: "PENDING",
    memberId: mockMemberId,
    guestName: null,
    guestEmail: null,
    subtotal: 250000,
    tax: 25000,
    serviceCharge: 12500,
    deliveryFee: 15000,
    discount: 5000,
    total: 297500,
    paymentMethod: null,
    paymentStatus: "UNPAID",
    paidAt: null,
    onlineDeliveryType: "DELIVERY",
    onlineScheduledAt: mockScheduledAt,
    onlineDeliveryLocation: {
      address: "Jl. Sudirman No. 1",
      latitude: -6.2088,
      longitude: 106.8456,
    },
    dineInTableId: null,
    dineInTableNumber: null,
    dineInGuestCount: null,
    dineInCashierSessionId: null,
    reservationTableId: null,
    reservationReservedAt: null,
    reservationPartySize: null,
    reservationDurationMinutes: null,
    reservationStatus: null,
    reservationNotes: null,
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
    items: [mockPrismaOrderItem, mockPrismaOrderItem2],
    transactions: [
      {
        id: "txn-123",
        status: "SUCCESS",
        createdAt: mockPaidAt,
      },
    ],
  };

  const mockPrismaReservationOrder = {
    id: mockOrderId,
    type: "RESERVATION",
    status: "PENDING",
    memberId: null,
    guestName: mockGuestName,
    guestEmail: mockGuestEmail,
    subtotal: 200000,
    tax: 20000,
    serviceCharge: 10000,
    deliveryFee: 0,
    discount: 0,
    total: 230000,
    paymentMethod: null,
    paymentStatus: "UNPAID",
    paidAt: null,
    onlineDeliveryType: null,
    onlineScheduledAt: null,
    onlineDeliveryLocation: null,
    dineInTableId: null,
    dineInTableNumber: null,
    dineInGuestCount: null,
    dineInCashierSessionId: null,
    reservationTableId: mockTableId,
    reservationReservedAt: mockReservedAt,
    reservationPartySize: 4,
    reservationDurationMinutes: 120,
    reservationStatus: "BOOKED",
    reservationNotes: "Special occasion",
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
    items: [mockPrismaOrderItem],
    transactions: [],
  };

  const mockPrismaDineInOrder = {
    id: mockOrderId,
    type: "DINEIN",
    status: "PENDING",
    memberId: null,
    guestName: null,
    guestEmail: null,
    subtotal: 200000,
    tax: 20000,
    serviceCharge: 10000,
    deliveryFee: 0,
    discount: 0,
    total: 230000,
    paymentMethod: null,
    paymentStatus: "UNPAID",
    paidAt: null,
    onlineDeliveryType: null,
    onlineScheduledAt: null,
    onlineDeliveryLocation: null,
    dineInTableId: mockTableId,
    dineInTableNumber: mockTableNumber,
    dineInGuestCount: 4,
    dineInCashierSessionId: mockCashierSessionId,
    reservationTableId: null,
    reservationReservedAt: null,
    reservationPartySize: null,
    reservationDurationMinutes: null,
    reservationStatus: null,
    reservationNotes: null,
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
    items: [mockPrismaOrderItem],
    transactions: [],
  };

  const mockOrderEntity = {
    getId: jest.fn().mockReturnValue(mockOrderId),
    getType: jest.fn().mockReturnValue(OrderType.ONLINE),
    getStatus: jest.fn().mockReturnValue(OrderStatus.PENDING),
    getCustomer: jest.fn().mockReturnValue({
      getMemberId: jest.fn().mockReturnValue(mockMemberId),
      getGuestName: jest.fn().mockReturnValue(null),
      getGuestEmail: jest.fn().mockReturnValue(null),
      isMember: jest.fn().mockReturnValue(true),
      isGuest: jest.fn().mockReturnValue(false),
    }),
    getPricing: jest.fn().mockReturnValue({
      getSubtotal: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(250000) }),
      getTax: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(25000) }),
      getServiceCharge: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(12500) }),
      getDeliveryFee: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(15000) }),
      getDiscount: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(5000) }),
      getTotal: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(297500) }),
    }),
    getPayment: jest.fn().mockReturnValue({
      getMethod: jest.fn().mockReturnValue(null),
      getStatus: jest.fn().mockReturnValue(PaymentStatus.UNPAID),
      getPaidAt: jest.fn().mockReturnValue(null),
    }),
    getFulfillment: jest.fn().mockReturnValue({
      isOnline: jest.fn().mockReturnValue(true),
      isReservation: jest.fn().mockReturnValue(false),
      isDineIn: jest.fn().mockReturnValue(false),
      asOnline: jest.fn().mockReturnValue({
        getDeliveryType: jest.fn().mockReturnValue(DeliveryType.DELIVERY),
        getScheduledAt: jest.fn().mockReturnValue(mockScheduledAt),
        isDelivery: jest.fn().mockReturnValue(true),
        getDeliveryLocation: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue("Jl. Sudirman No. 1"),
          getCoordinate: jest.fn().mockReturnValue({
            getLatitude: jest.fn().mockReturnValue(-6.2088),
            getLongitude: jest.fn().mockReturnValue(106.8456),
          }),
        }),
      }),
    }),
    getItems: jest.fn().mockReturnValue([
      {
        getProductId: jest.fn().mockReturnValue(mockProductId),
        getProductName: jest.fn().mockReturnValue("Test Product"),
        getPriceSnapshot: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(100000) }),
        getQuantity: jest.fn().mockReturnValue(2),
        getNote: jest.fn().mockReturnValue(null),
      },
      {
        getProductId: jest.fn().mockReturnValue(mockProductId2),
        getProductName: jest.fn().mockReturnValue("Test Product 2"),
        getPriceSnapshot: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(50000) }),
        getQuantity: jest.fn().mockReturnValue(1),
        getNote: jest.fn().mockReturnValue("Extra sauce"),
      },
    ]),
    getCreatedAt: jest.fn().mockReturnValue(mockCreatedAt),
    getUpdatedAt: jest.fn().mockReturnValue(mockUpdatedAt),
  } as unknown as jest.Mocked<Order>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockPrismaClient = {
      order: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      orderItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      orderDeliveryLocation: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockDbClient = {
      getPrismaClient: jest.fn().mockReturnValue(mockPrismaClient),
      executeInTransaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    jest.spyOn(Order, "rebuild").mockReturnValue(mockOrderEntity);

    repository = new PrismaOrderRepository(mockLogger, mockDbClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger and dbClient", () => {
      const repo = new PrismaOrderRepository(mockLogger, mockDbClient);
      expect(repo).toBeInstanceOf(PrismaOrderRepository);
    });

    it("should initialize with transaction context", () => {
      const mockPrismaTransaction = { order: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const repo = new PrismaOrderRepository(mockLogger, mockDbClient, txContext);
      expect(repo).toBeInstanceOf(PrismaOrderRepository);
    });

    it("should set repositoryName correctly", () => {
      expect((repository as any).repositoryName).toBe("PrismaOrderRepository");
    });
  });

  describe("withTransaction", () => {
    it("should create new repository instance with transaction context", () => {
      const mockPrismaTransaction = { order: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const txRepo = repository.withTransaction(txContext);
      expect(txRepo).toBeInstanceOf(PrismaOrderRepository);
      expect(txRepo).not.toBe(repository);
    });

    it("should throw error for invalid transaction context", () => {
      const invalidTx = {} as TransactionContext;
      expect(() => {
        repository.withTransaction(invalidTx);
      }).toThrow("Invalid transaction context for PrismaOrderRepository. Expected PrismaTransactionContext.");
    });
  });

  describe("insert", () => {
    it("should insert online order with delivery successfully", async () => {
      mockPrismaClient.order.create.mockResolvedValue(mockPrismaOnlineOrder);

      await repository.insert(mockOrderEntity);

      expect(mockPrismaClient.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: mockOrderId,
          type: OrderType.ONLINE,
          status: OrderStatus.PENDING,
          memberId: mockMemberId,
          guestName: null,
          guestEmail: null,
          subtotal: 250000,
          tax: 25000,
          serviceCharge: 12500,
          deliveryFee: 15000,
          discount: 5000,
          total: 297500,
          paymentMethod: null,
          paymentStatus: PaymentStatus.UNPAID,
          paidAt: null,
          onlineDeliveryType: DeliveryType.DELIVERY,
          onlineScheduledAt: mockScheduledAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
          items: {
            create: expect.any(Array),
          },
          onlineDeliveryLocation: {
            create: {
              address: "Jl. Sudirman No. 1",
              latitude: -6.2088,
              longitude: 106.8456,
            },
          },
        }),
      });
    });

    it("should insert reservation order successfully", async () => {
      const reservationOrder = {
        ...mockOrderEntity,
        getType: jest.fn().mockReturnValue(OrderType.RESERVATION),
        getFulfillment: jest.fn().mockReturnValue({
          isOnline: jest.fn().mockReturnValue(false),
          isReservation: jest.fn().mockReturnValue(true),
          isDineIn: jest.fn().mockReturnValue(false),
          asReservation: jest.fn().mockReturnValue({
            getTableId: jest.fn().mockReturnValue(mockTableId),
            getReservedAt: jest.fn().mockReturnValue(mockReservedAt),
            getPartySize: jest.fn().mockReturnValue(4),
            getDurationInMinutes: jest.fn().mockReturnValue(120),
            getReservationStatus: jest.fn().mockReturnValue(ReservationStatus.BOOKED),
            getNotes: jest.fn().mockReturnValue("Special occasion"),
          }),
        }),
        getCustomer: jest.fn().mockReturnValue({
          getMemberId: jest.fn().mockReturnValue(null),
          getGuestName: jest.fn().mockReturnValue(mockGuestName),
          getGuestEmail: jest.fn().mockReturnValue(mockGuestEmail),
        }),
      } as unknown as jest.Mocked<Order>;

      mockPrismaClient.order.create.mockResolvedValue(mockPrismaReservationOrder);

      await repository.insert(reservationOrder);

      expect(mockPrismaClient.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: OrderType.RESERVATION,
          memberId: null,
          guestName: mockGuestName,
          guestEmail: mockGuestEmail,
          reservationTableId: mockTableId,
          reservationReservedAt: mockReservedAt,
          reservationPartySize: 4,
          reservationDurationMinutes: 120,
          reservationStatus: ReservationStatus.BOOKED,
          reservationNotes: "Special occasion",
        }),
      });
    });

    it("should insert dine-in order successfully", async () => {
      const dineInOrder = {
        ...mockOrderEntity,
        getType: jest.fn().mockReturnValue(OrderType.DINEIN),
        getFulfillment: jest.fn().mockReturnValue({
          isOnline: jest.fn().mockReturnValue(false),
          isReservation: jest.fn().mockReturnValue(false),
          isDineIn: jest.fn().mockReturnValue(true),
          asDineIn: jest.fn().mockReturnValue({
            getTableId: jest.fn().mockReturnValue(mockTableId),
            getTableNumber: jest.fn().mockReturnValue(mockTableNumber),
            getGuestCount: jest.fn().mockReturnValue(4),
            getCashierSessionId: jest.fn().mockReturnValue(mockCashierSessionId),
          }),
        }),
        getCustomer: jest.fn().mockReturnValue({
          getMemberId: jest.fn().mockReturnValue(null),
          getGuestName: jest.fn().mockReturnValue(null),
          getGuestEmail: jest.fn().mockReturnValue(null),
        }),
      } as unknown as jest.Mocked<Order>;

      mockPrismaClient.order.create.mockResolvedValue(mockPrismaDineInOrder);

      await repository.insert(dineInOrder);

      expect(mockPrismaClient.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: OrderType.DINEIN,
          dineInTableId: mockTableId,
          dineInTableNumber: mockTableNumber,
          dineInGuestCount: 4,
          dineInCashierSessionId: mockCashierSessionId,
        }),
      });
    });

    it("should insert order with items", async () => {
      mockPrismaClient.order.create.mockResolvedValue(mockPrismaOnlineOrder);

      await repository.insert(mockOrderEntity);

      expect(mockPrismaClient.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          items: {
            create: [
              {
                productId: mockProductId,
                productName: "Test Product",
                priceSnapshot: 100000,
                quantity: 2,
                note: null,
              },
              {
                productId: mockProductId2,
                productName: "Test Product 2",
                priceSnapshot: 50000,
                quantity: 1,
                note: "Extra sauce",
              },
            ],
          },
        }),
      });
    });
  });

  describe("update", () => {
    it("should update order status and pricing", async () => {
      mockPrismaClient.order.update.mockResolvedValue(mockPrismaOnlineOrder);
      mockPrismaClient.orderItem.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaClient.orderItem.createMany.mockResolvedValue({ count: 2 });

      await repository.update(mockOrderEntity);

      expect(mockPrismaClient.order.update).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        data: expect.objectContaining({
          status: OrderStatus.PENDING,
          subtotal: 250000,
          tax: 25000,
          serviceCharge: 12500,
          deliveryFee: 15000,
          discount: 5000,
          total: 297500,
          paymentMethod: null,
          paymentStatus: PaymentStatus.UNPAID,
          paidAt: null,
          updatedAt: mockUpdatedAt,
        }),
      });
    });

    it("should upsert delivery location for online order", async () => {
      mockPrismaClient.order.update.mockResolvedValue(mockPrismaOnlineOrder);
      mockPrismaClient.orderItem.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaClient.orderItem.createMany.mockResolvedValue({ count: 2 });

      await repository.update(mockOrderEntity);

      expect(mockPrismaClient.orderDeliveryLocation.upsert).toHaveBeenCalledWith({
        where: { orderId: mockOrderId },
        create: {
          orderId: mockOrderId,
          address: "Jl. Sudirman No. 1",
          latitude: -6.2088,
          longitude: 106.8456,
        },
        update: {
          address: "Jl. Sudirman No. 1",
          latitude: -6.2088,
          longitude: 106.8456,
        },
      });
    });

    it("should update reservation status and notes", async () => {
      const reservationOrder = {
        ...mockOrderEntity,
        getFulfillment: jest.fn().mockReturnValue({
          isOnline: jest.fn().mockReturnValue(false),
          isReservation: jest.fn().mockReturnValue(true),
          isDineIn: jest.fn().mockReturnValue(false),
          asReservation: jest.fn().mockReturnValue({
            getTableId: jest.fn().mockReturnValue(mockTableId),
            getReservedAt: jest.fn().mockReturnValue(mockReservedAt),
            getPartySize: jest.fn().mockReturnValue(4),
            getDurationInMinutes: jest.fn().mockReturnValue(120),
            getReservationStatus: jest.fn().mockReturnValue(ReservationStatus.SEATED),
            getNotes: jest.fn().mockReturnValue("Window seat"),
          }),
        }),
      } as unknown as jest.Mocked<Order>;

      mockPrismaClient.order.update.mockResolvedValue(mockPrismaReservationOrder);
      mockPrismaClient.orderItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.orderItem.createMany.mockResolvedValue({ count: 1 });

      await repository.update(reservationOrder);

      expect(mockPrismaClient.order.update).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        data: expect.objectContaining({
          reservationStatus: ReservationStatus.SEATED,
          reservationNotes: "Window seat",
        }),
      });
    });

    it("should update items by deleting and recreating", async () => {
      mockPrismaClient.order.update.mockResolvedValue(mockPrismaOnlineOrder);
      mockPrismaClient.orderItem.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaClient.orderItem.createMany.mockResolvedValue({ count: 2 });

      await repository.update(mockOrderEntity);

      expect(mockPrismaClient.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { orderId: mockOrderId },
      });
      expect(mockPrismaClient.orderItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            orderId: mockOrderId,
            productId: mockProductId,
            productName: "Test Product",
            priceSnapshot: 100000,
            quantity: 2,
            note: null,
          },
          {
            orderId: mockOrderId,
            productId: mockProductId2,
            productName: "Test Product 2",
            priceSnapshot: 50000,
            quantity: 1,
            note: "Extra sauce",
          },
        ],
      });
    });

    it("should handle empty items in update", async () => {
      const emptyItemsOrder = {
        ...mockOrderEntity,
        getItems: jest.fn().mockReturnValue([]),
      } as unknown as jest.Mocked<Order>;

      mockPrismaClient.order.update.mockResolvedValue(mockPrismaOnlineOrder);
      mockPrismaClient.orderItem.deleteMany.mockResolvedValue({ count: 0 });

      await repository.update(emptyItemsOrder);

      expect(mockPrismaClient.orderItem.deleteMany).toHaveBeenCalled();
      expect(mockPrismaClient.orderItem.createMany).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("should find online order by id with transactions and location", async () => {
      mockPrismaClient.order.findUnique.mockResolvedValue(mockPrismaOnlineOrder);

      const result = await repository.findById(mockOrderId);

      expect(mockPrismaClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        include: {
          onlineDeliveryLocation: true,
          items: true,
          transactions: {
            where: { status: "SUCCESS" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      expect(Order.rebuild).toHaveBeenCalled();
      expect(result).toBe(mockOrderEntity);
    });

    it("should find reservation order by id", async () => {
      mockPrismaClient.order.findUnique.mockResolvedValue(mockPrismaReservationOrder);

      const result = await repository.findById(mockOrderId);

      expect(mockPrismaClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        include: {
          onlineDeliveryLocation: true,
          items: true,
          transactions: {
            where: { status: "SUCCESS" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      expect(result).toBe(mockOrderEntity);
    });

    it("should find dine-in order by id", async () => {
      mockPrismaClient.order.findUnique.mockResolvedValue(mockPrismaDineInOrder);

      const result = await repository.findById(mockOrderId);

      expect(result).toBe(mockOrderEntity);
    });

    it("should return null when order is not found", async () => {
      mockPrismaClient.order.findUnique.mockResolvedValue(null);

      const result = await repository.findById("non-existent-id");

      expect(result).toBeNull();
      expect(Order.rebuild).not.toHaveBeenCalled();
    });

    it("should handle order with no transactions", async () => {
      const orderWithoutTx = {
        ...mockPrismaOnlineOrder,
        transactions: [],
      };
      mockPrismaClient.order.findUnique.mockResolvedValue(orderWithoutTx);

      await repository.findById(mockOrderId);

      expect(Order.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          payment: expect.objectContaining({
            transactionId: null,
          }),
        }),
      );
    });

    it("should include successful transactions only", async () => {
      const orderWithFailedTx = {
        ...mockPrismaOnlineOrder,
        transactions: [
          { id: "txn-failed", status: "FAILED", createdAt: mockPaidAt },
          { id: "txn-success", status: "SUCCESS", createdAt: mockPaidAt },
        ],
      };
      mockPrismaClient.order.findUnique.mockResolvedValue(orderWithFailedTx);

      await repository.findById(mockOrderId);

      expect(mockPrismaClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        include: {
          onlineDeliveryLocation: true,
          items: true,
          transactions: {
            where: { status: "SUCCESS" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
    });
  });

  describe("browse", () => {
    it("should browse orders with all filters", async () => {
      const query: BrowseOrdersQuery = {
        type: OrderType.ONLINE,
        status: OrderStatus.PENDING,
        memberId: mockMemberId,
        guestEmail: mockGuestEmail,
      };
      mockPrismaClient.order.findMany.mockResolvedValue([mockPrismaOnlineOrder]);

      const result = await repository.browse(query);

      expect(mockPrismaClient.order.findMany).toHaveBeenCalledWith({
        where: {
          type: query.type,
          status: query.status,
          memberId: query.memberId,
          guestEmail: query.guestEmail,
        },
        include: {
          items: true,
          onlineDeliveryLocation: true,
          transactions: { where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockOrderEntity);
    });

    it("should browse orders with empty query", async () => {
      mockPrismaClient.order.findMany.mockResolvedValue([mockPrismaOnlineOrder]);

      const result = await repository.browse({});

      expect(mockPrismaClient.order.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          items: true,
          onlineDeliveryLocation: true,
          transactions: { where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(1);
    });

    it("should browse orders with only type filter", async () => {
      const query: BrowseOrdersQuery = { type: OrderType.ONLINE };
      mockPrismaClient.order.findMany.mockResolvedValue([mockPrismaOnlineOrder]);

      await repository.browse(query);

      expect(mockPrismaClient.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: OrderType.ONLINE, status: undefined, memberId: undefined, guestEmail: undefined },
        }),
      );
    });

    it("should browse orders with only status filter", async () => {
      const query: BrowseOrdersQuery = { status: OrderStatus.CONFIRMED };
      mockPrismaClient.order.findMany.mockResolvedValue([mockPrismaOnlineOrder]);

      await repository.browse(query);

      expect(mockPrismaClient.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: undefined, status: OrderStatus.CONFIRMED, memberId: undefined, guestEmail: undefined },
        }),
      );
    });

    it("should browse orders with memberId filter", async () => {
      const query: BrowseOrdersQuery = { memberId: mockMemberId };
      mockPrismaClient.order.findMany.mockResolvedValue([mockPrismaOnlineOrder]);

      await repository.browse(query);

      expect(mockPrismaClient.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: undefined, status: undefined, memberId: mockMemberId, guestEmail: undefined },
        }),
      );
    });

    it("should browse orders with guestEmail filter", async () => {
      const query: BrowseOrdersQuery = { guestEmail: mockGuestEmail };
      mockPrismaClient.order.findMany.mockResolvedValue([mockPrismaReservationOrder]);

      await repository.browse(query);

      expect(mockPrismaClient.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: undefined, status: undefined, memberId: undefined, guestEmail: mockGuestEmail },
        }),
      );
    });

    it("should return empty array when no orders found", async () => {
      mockPrismaClient.order.findMany.mockResolvedValue([]);

      const result = await repository.browse({});

      expect(result).toEqual([]);
    });

    it("should return orders sorted by createdAt desc", async () => {
      mockPrismaClient.order.findMany.mockResolvedValue([mockPrismaOnlineOrder, mockPrismaReservationOrder]);

      await repository.browse({});

      expect(mockPrismaClient.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });

  describe("error scenarios", () => {
    it("should handle database connection errors in findById", async () => {
      const error = new Error("ECONNREFUSED");
      mockPrismaClient.order.findUnique.mockRejectedValue(error);

      await expect(repository.findById(mockOrderId)).rejects.toThrow("ECONNREFUSED");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle foreign key constraint errors in insert", async () => {
      const error = new Error("Foreign key constraint failed");
      mockPrismaClient.order.create.mockRejectedValue(error);

      await expect(repository.insert(mockOrderEntity)).rejects.toThrow("Foreign key constraint failed");
    });

    it("should handle Prisma client not available", async () => {
      mockDbClient.getPrismaClient.mockRejectedValue(new Error("Prisma client not available"));

      await expect(repository.findById(mockOrderId)).rejects.toThrow("Prisma client not available");
    });

    it("should handle update error", async () => {
      const error = new Error("Update failed");
      mockPrismaClient.order.update.mockRejectedValue(error);

      await expect(repository.update(mockOrderEntity)).rejects.toThrow("Update failed");
    });
  });

  describe("logging behavior", () => {
    it("should log with correct context for all operations", async () => {
      mockPrismaClient.order.findUnique.mockResolvedValue(mockPrismaOnlineOrder);

      await repository.findById(mockOrderId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaOrderRepository",
        }),
      );
    });

    it("should measure operation duration", async () => {
      mockPrismaClient.order.findUnique.mockResolvedValue(mockPrismaOnlineOrder);

      await repository.findById(mockOrderId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      );
    });

    it("should log errors with stack trace", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace here";
      mockPrismaClient.order.update.mockRejectedValue(error);

      await expect(repository.update(mockOrderEntity)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: "Error stack trace here",
        }),
      );
    });
  });

  describe("integration with transaction", () => {
    it("should use transaction prisma client when in transaction", async () => {
      const mockTransactionPrisma = {
        order: {
          findUnique: jest.fn().mockResolvedValue(mockPrismaOnlineOrder),
        },
        orderItem: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        orderDeliveryLocation: {
          upsert: jest.fn(),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = new PrismaOrderRepository(mockLogger, mockDbClient, txContext);

      await txRepo.findById(mockOrderId);

      expect(mockTransactionPrisma.order.findUnique).toHaveBeenCalled();
      expect(mockPrismaClient.order.findUnique).not.toHaveBeenCalled();
    });

    it("should execute insert in transaction", async () => {
      const mockTransactionPrisma = {
        order: {
          create: jest.fn().mockResolvedValue(mockPrismaOnlineOrder),
        },
        orderItem: {
          createMany: jest.fn(),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.insert(mockOrderEntity);

      expect(mockTransactionPrisma.order.create).toHaveBeenCalled();
    });

    it("should execute update in transaction", async () => {
      const mockTransactionPrisma = {
        order: {
          update: jest.fn().mockResolvedValue(mockPrismaOnlineOrder),
        },
        orderItem: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        orderDeliveryLocation: {
          upsert: jest.fn(),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.update(mockOrderEntity);

      expect(mockTransactionPrisma.order.update).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle order with no items", async () => {
      const emptyOrder = {
        ...mockPrismaOnlineOrder,
        items: [],
      };
      mockPrismaClient.order.findUnique.mockResolvedValue(emptyOrder);

      await repository.findById(mockOrderId);

      expect(Order.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [],
        }),
      );
    });

    it("should handle order with null guest fields", async () => {
      const orderWithNullGuest = {
        ...mockPrismaOnlineOrder,
        guestName: null,
        guestEmail: null,
      };
      mockPrismaClient.order.findUnique.mockResolvedValue(orderWithNullGuest);

      await repository.findById(mockOrderId);

      expect(Order.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({
            guestName: null,
            guestEmail: null,
          }),
        }),
      );
    });

    it("should handle order with different statuses", async () => {
      const statuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED", "REJECTED"];

      for (const status of statuses) {
        const orderWithStatus = {
          ...mockPrismaOnlineOrder,
          status,
        };
        mockPrismaClient.order.findUnique.mockResolvedValue(orderWithStatus);

        await repository.findById(mockOrderId);

        expect(Order.rebuild).toHaveBeenCalledWith(
          expect.objectContaining({
            status: status,
          }),
        );
      }
    });

    it("should handle order with different reservation statuses", async () => {
      const statuses = ["BOOKED", "SEATED", "NO_SHOW", "CANCELLED"];

      for (const status of statuses) {
        const orderWithStatus = {
          ...mockPrismaReservationOrder,
          reservationStatus: status,
        };
        mockPrismaClient.order.findUnique.mockResolvedValue(orderWithStatus);

        await repository.findById(mockOrderId);

        expect(Order.rebuild).toHaveBeenCalledWith(
          expect.objectContaining({
            fulfillment: expect.objectContaining({
              reservation: expect.objectContaining({
                reservationStatus: status,
              }),
            }),
          }),
        );
      }
    });

    it("should handle order with paid payment", async () => {
      const paidOrder = {
        ...mockPrismaOnlineOrder,
        paymentMethod: "CARD",
        paymentStatus: "PAID",
        paidAt: mockPaidAt,
        transactions: [{ id: "txn-123", status: "SUCCESS", createdAt: mockPaidAt }],
      };
      mockPrismaClient.order.findUnique.mockResolvedValue(paidOrder);

      await repository.findById(mockOrderId);

      expect(Order.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          payment: expect.objectContaining({
            method: PaymentMethod.CARD,
            status: PaymentStatus.PAID,
            paidAt: mockPaidAt,
            transactionId: "txn-123",
          }),
        }),
      );
    });
  });
});
