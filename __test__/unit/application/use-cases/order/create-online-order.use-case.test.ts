import { CreateOnlineOrderUseCase } from "@/application/use-cases/order/create-online-order.use-case";
import { CreateOnlineOrderCommand } from "@/application/ports/driving/create-online-order.use-case.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { DistanceCalculatorPort } from "@/application/ports/driven/distance-calculator.port";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { Product } from "@/domain/entities/product.entity";
import { Order } from "@/domain/entities/order.entity";
import { GuestOrderManagementToken } from "@/domain/entities/application-token.entity";
import { DeliveryFeePolicy } from "@/domain/policies/delivery-fee.policy";
import { OrderConstraintPolicy } from "@/domain/policies/order-constraint.policy";
import { PricingPolicy } from "@/domain/policies/pricing.policy";
import { StoreLocation } from "@/domain/types/store-location.type";
import { Money } from "@/domain/value-objects/money.vo";
import { DeliveryFeeCalculatorService } from "@/domain/services/delivery-fee-calculator.service";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { DeliveryType, OrderType } from "@/domain/types/order.type";
import { ProductStatus, ProductType } from "@/domain/types/product.type";
import { MinimumOrderQuantityNotMetException, OrderContainsUnknownProductsException } from "@/domain/exceptions/order.exceptions";
import { InsufficientStockException } from "@/domain/exceptions/product.exceptions";

jest.mock("@/domain/services/delivery-fee-calculator.service");

describe("CreateOnlineOrderUseCase", () => {
  let useCase: CreateOnlineOrderUseCase;
  let mockOrderConstraintPolicy: jest.Mocked<OrderConstraintPolicy>;
  let mockDeliveryFeePolicy: jest.Mocked<DeliveryFeePolicy>;
  let mockPricingPolicy: jest.Mocked<PricingPolicy>;
  let mockStoreLocation: StoreLocation;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockApplicationTokenFactory: jest.Mocked<ApplicationTokenFactory>;
  let mockIdGenerator: jest.Mocked<IdGeneratorPort>;
  let mockDistanceCalculatorPort: jest.Mocked<DistanceCalculatorPort>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockLogger: jest.Mocked<LoggerPort>;
  let mockProductRepository: jest.Mocked<ProductRepositoryPort>;
  let mockOrderRepository: jest.Mocked<OrderRepositoryPort>;
  let mockApplicationTokenRepository: jest.Mocked<ApplicationTokenRepositoryPort>;

  const mockOrderId = "order-123";
  const mockProductId = "product-123";
  const mockProductId2 = "product-456";
  const mockMemberId = "member-123";
  const mockStoreCoordinate = { latitude: -6.2088, longitude: 106.8456 };
  const mockCustomerCoordinate = { latitude: -6.3, longitude: 106.9 };
  const mockTokenId = "token-123";

  const mockGuestOrderManagementToken = {
    getId: jest.fn().mockReturnValue(mockTokenId),
    pullDomainEvents: jest.fn().mockReturnValue([]),
  } as unknown as jest.Mocked<GuestOrderManagementToken>;

  beforeEach(() => {
    mockOrderConstraintPolicy = {
      minimumOrderQuantity: 1,
      orderExpiryInMinutes: 30,
    } as jest.Mocked<OrderConstraintPolicy>;

    mockDeliveryFeePolicy = {
      freeDeliveryRadiusKm: 3,
      baseFee: 15000,
      perKmRateBeyondBase: 2000,
      baseFeeCoversUpToKm: 5,
      maxDeliveryDistanceKm: 20,
    } as DeliveryFeePolicy;

    mockPricingPolicy = {
      taxRatePercent: 10,
      serviceChargeRatePercent: 5,
      serviceChargeApplicableTypes: [OrderType.DINEIN, OrderType.ONLINE],
    } as jest.Mocked<PricingPolicy>;

    mockStoreLocation = {
      coordinate: mockStoreCoordinate,
    } as StoreLocation;

    mockProductRepository = {
      findByIds: jest.fn(),
      browse: jest.fn(),
      findById: jest.fn(),
      findDetailById: jest.fn(),
      insert: jest.fn(),
      search: jest.fn(),
      update: jest.fn(),
      updateImages: jest.fn(),
      delete: jest.fn(),
      deductStockForItems: jest.fn(),
    };

    mockOrderRepository = {
      insert: jest.fn(),
      browse: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    mockApplicationTokenRepository = {
      insert: jest.fn(),
      countByTypeAndIdentifierWithin: jest.fn(),
      findByTokenFingerprint: jest.fn(),
      findLastTokenByTypeAndIdentifier: jest.fn(),
      invalidateByTypeAndIdentifier: jest.fn(),
      update: jest.fn(),
    };

    mockUnitOfWork = {
      commit: jest.fn().mockImplementation(async (operation) => {
        const repos = {
          productRepository: mockProductRepository,
          orderRepository: mockOrderRepository,
          applicationTokenRepository: mockApplicationTokenRepository,
        } as unknown as UnitOfWorkRepositories;
        return operation(repos);
      }),
    } as jest.Mocked<UnitOfWorkPort>;

    mockApplicationTokenFactory = {
      issueGuestOrderManagement: jest.fn().mockReturnValue(mockGuestOrderManagementToken),
    } as unknown as jest.Mocked<ApplicationTokenFactory>;

    mockIdGenerator = {
      generate: jest.fn().mockReturnValue(mockOrderId),
    };

    mockDistanceCalculatorPort = {
      calculateDistance: jest.fn().mockResolvedValue(5.5),
    } as jest.Mocked<DistanceCalculatorPort>;

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

    (DeliveryFeeCalculatorService.calculate as jest.Mock).mockReturnValue(new Money(15000));

    useCase = new CreateOnlineOrderUseCase(
      mockOrderConstraintPolicy,
      mockDeliveryFeePolicy,
      mockPricingPolicy,
      mockStoreLocation,
      mockUnitOfWork,
      mockApplicationTokenFactory,
      mockIdGenerator,
      mockDistanceCalculatorPort,
      mockEventBus,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockProduct = (id: string, price: number, stock: number = 10): Product => {
    const productData = {
      id,
      categoryId: "cat-123",
      name: `Product ${id}`,
      description: "Description",
      price,
      type: ProductType.FOOD,
      ingredients: "Ingredients",
      preparationTimeInMinutes: 15,
      imageUrls: ["image1.jpg"],
      stockQuantity: stock,
      status: ProductStatus.AVAILABLE,
    };
    return Product.create(productData);
  };

  const createValidCommand = (overrides: Partial<CreateOnlineOrderCommand> = {}): CreateOnlineOrderCommand => ({
    memberId: mockMemberId,
    guestName: undefined,
    guestEmail: undefined,
    items: [
      { productId: mockProductId, quantity: 2, note: undefined },
      { productId: mockProductId2, quantity: 1, note: "Extra sauce" },
    ],
    deliveryType: DeliveryType.DELIVERY,
    deliveryAddress: "Jl. Sudirman No. 1",
    deliveryLatitude: mockCustomerCoordinate.latitude,
    deliveryLongitude: mockCustomerCoordinate.longitude,
    scheduledAt: undefined,
    ...overrides,
  });

  describe("execute", () => {
    it("should create an online order successfully with delivery", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([mockProductId, mockProductId2]);
      expect(mockOrderRepository.insert).toHaveBeenCalledTimes(1);
      expect(mockApplicationTokenRepository.insert).not.toHaveBeenCalled();
      expect(mockDistanceCalculatorPort.calculateDistance).toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should create an online order with pickup", async () => {
      const command = createValidCommand({
        deliveryType: DeliveryType.PICKUP,
        deliveryAddress: undefined,
        deliveryLatitude: undefined,
        deliveryLongitude: undefined,
        scheduledAt: new Date("2024-01-15T10:30:00Z"),
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(mockDistanceCalculatorPort.calculateDistance).not.toHaveBeenCalled();
      expect(mockOrderRepository.insert).toHaveBeenCalledTimes(1);
      expect(mockApplicationTokenRepository.insert).not.toHaveBeenCalled();
    });

    it("should create an online order with guest customer and generate guest token", async () => {
      const command = createValidCommand({
        memberId: undefined,
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(mockOrderRepository.insert).toHaveBeenCalledTimes(1);
      expect(mockApplicationTokenFactory.issueGuestOrderManagement).toHaveBeenCalled();
      expect(mockApplicationTokenRepository.insert).toHaveBeenCalledTimes(1);
    });

    it("should publish events from order and token", async () => {
      const command = createValidCommand({
        memberId: undefined,
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const mockOrderEvents = [{ eventType: "ONLINE_ORDER_CREATED" }] as DomainEvent[];
      const mockTokenEvents = [{ eventType: "GUEST_ORDER_MANAGEMENT_TOKEN_ISSUED" }] as DomainEvent[];

      const mockOrder = {
        getId: jest.fn().mockReturnValue(mockOrderId),
        getCustomer: jest.fn().mockReturnValue({ isGuest: () => true }),
        pullDomainEvents: jest.fn().mockReturnValue(mockOrderEvents),
      } as unknown as Order;

      mockGuestOrderManagementToken.pullDomainEvents = jest.fn().mockReturnValue(mockTokenEvents);

      mockApplicationTokenFactory.issueGuestOrderManagement = jest.fn().mockReturnValue(mockGuestOrderManagementToken);

      mockUnitOfWork.commit = jest.fn().mockImplementation(async (operation) => {
        const repos = {
          productRepository: mockProductRepository,
          orderRepository: mockOrderRepository,
          applicationTokenRepository: mockApplicationTokenRepository,
        } as unknown as UnitOfWorkRepositories;
        await operation(repos);
        return { order: mockOrder, events: [...mockOrderEvents, ...mockTokenEvents] };
      });

      await useCase.execute(command);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockOrderEvents, ...mockTokenEvents]);
    });

    it("should create an online order without scheduledAt", async () => {
      const command = createValidCommand({
        scheduledAt: undefined,
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(mockOrderRepository.insert).toHaveBeenCalledTimes(1);
    });

    it("should handle single item order", async () => {
      const command = createValidCommand({
        items: [{ productId: mockProductId, quantity: 3, note: undefined }],
      });

      const products = [createMockProduct(mockProductId, 100000, 10)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(mockOrderRepository.insert).toHaveBeenCalledTimes(1);
    });

    it("should check stock availability but not deduct", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(products[0].getStockQuantity()).toBe(10);
      expect(products[1].getStockQuantity()).toBe(5);
    });

    it("should publish events after successful order creation", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockEventBus.publishAll.mockResolvedValue(undefined);

      await useCase.execute(command);

      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe("validation", () => {
    it("rejects with MinimumOrderQuantityNotMetException when total quantity is below minimum", async () => {
      mockOrderConstraintPolicy.minimumOrderQuantity = 5;

      const command = createValidCommand({
        items: [
          { productId: mockProductId, quantity: 2, note: undefined },
          { productId: mockProductId2, quantity: 1, note: undefined },
        ],
      });

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(MinimumOrderQuantityNotMetException);
    });

    it("rejects with OrderContainsUnknownProductsException when product not found", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(OrderContainsUnknownProductsException);
    });

    it("rejects with InsufficientStockException when product stock is insufficient", async () => {
      const command = createValidCommand({
        items: [{ productId: mockProductId, quantity: 10, note: undefined }],
      });

      const products = [createMockProduct(mockProductId, 100000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(InsufficientStockException);
    });

    it("rejects with InsufficientStockException when product is not available", async () => {
      const command = createValidCommand();
      const product = createMockProduct(mockProductId, 100000, 10);
      product.setStatus(ProductStatus.UNAVAILABLE);

      const products = [product, createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(InsufficientStockException);
    });

    it("should throw error when guest data is incomplete", async () => {
      const command = createValidCommand({
        memberId: undefined,
        guestName: undefined,
        guestEmail: "john@example.com",
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toThrow();
    });
  });

  describe("error handling", () => {
    it("should propagate repository errors", async () => {
      const command = createValidCommand();
      mockProductRepository.findByIds.mockRejectedValue(new Error("Database error"));

      await expect(useCase.execute(command)).rejects.toThrow("Database error");
    });

    it("should propagate geolocation calculator errors", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockDistanceCalculatorPort.calculateDistance.mockRejectedValue(new Error("Geolocation API error"));

      await expect(useCase.execute(command)).rejects.toThrow("Geolocation API error");
    });

    it("should handle event bus failure gracefully", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockEventBus.publishAll.mockRejectedValue(new Error("Event bus error"));

      await expect(useCase.execute(command)).rejects.toThrow("Event bus error");
    });

    it("should handle application token factory error", async () => {
      const command = createValidCommand({
        memberId: undefined,
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockApplicationTokenFactory.issueGuestOrderManagement = jest.fn().mockImplementation(() => {
        throw new Error("Token factory error");
      });

      await expect(useCase.execute(command)).rejects.toThrow("Token factory error");
    });
  });

  describe("logging", () => {
    it("should log order start with member ID", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "CreateOnlineOrderUseCase",
          event: "ORDER_STARTED",
          userId: mockMemberId,
        }),
      );
    });

    it("should log order start with guest name", async () => {
      const command = createValidCommand({
        memberId: undefined,
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "CreateOnlineOrderUseCase",
          event: "ORDER_STARTED",
          userId: undefined,
          data: { guestName: "John Doe" },
        }),
      );
    });

    it("should log successful order creation", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "CreateOnlineOrderUseCase",
          event: "ORDER_SUCCESSFUL",
          userId: mockMemberId,
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle products with zero stock", async () => {
      const command = createValidCommand({
        items: [{ productId: mockProductId, quantity: 1, note: undefined }],
      });

      const products = [createMockProduct(mockProductId, 100000, 0)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(InsufficientStockException);
    });

    it("should handle item with note", async () => {
      const command = createValidCommand({
        items: [{ productId: mockProductId, quantity: 1, note: "Extra cheese" }],
      });

      const products = [createMockProduct(mockProductId, 100000, 10)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(mockOrderRepository.insert).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple items with different quantities", async () => {
      const command = createValidCommand({
        items: [
          { productId: mockProductId, quantity: 3, note: undefined },
          { productId: mockProductId2, quantity: 2, note: undefined },
        ],
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(products[0].getStockQuantity()).toBe(10);
      expect(products[1].getStockQuantity()).toBe(5);
    });

    it("should handle distance calculation with zero distance", async () => {
      const command = createValidCommand({
        deliveryLatitude: mockStoreCoordinate.latitude,
        deliveryLongitude: mockStoreCoordinate.longitude,
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockDistanceCalculatorPort.calculateDistance.mockResolvedValue(0);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(mockDistanceCalculatorPort.calculateDistance).toHaveBeenCalled();
    });

    it("should handle scheduledAt for delivery", async () => {
      const scheduledAt = new Date("2024-01-20T10:00:00Z");
      const command = createValidCommand({
        scheduledAt,
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(mockOrderRepository.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe("unit of work transaction", () => {
    it("should use unit of work to manage transaction", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should rollback transaction when error occurs", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockOrderRepository.insert.mockRejectedValue(new Error("Insert failed"));

      await expect(useCase.execute(command)).rejects.toThrow("Insert failed");
      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should insert application token when guest order", async () => {
      const command = createValidCommand({
        memberId: undefined,
        guestName: "John Doe",
        guestEmail: "john@example.com",
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockApplicationTokenRepository.insert).toHaveBeenCalledTimes(1);
      expect(mockApplicationTokenFactory.issueGuestOrderManagement).toHaveBeenCalledTimes(1);
    });

    it("should not insert application token when member order", async () => {
      const command = createValidCommand({
        memberId: mockMemberId,
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockApplicationTokenRepository.insert).not.toHaveBeenCalled();
      expect(mockApplicationTokenFactory.issueGuestOrderManagement).not.toHaveBeenCalled();
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle multiple products with one being out of stock", async () => {
      const command = createValidCommand({
        items: [
          { productId: mockProductId, quantity: 2, note: undefined },
          { productId: mockProductId2, quantity: 1, note: undefined },
        ],
      });

      const products = [createMockProduct(mockProductId, 100000, 1), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(InsufficientStockException);
    });

    it("should handle delivery fee calculation with distance beyond max", async () => {
      mockDeliveryFeePolicy.maxDeliveryDistanceKm = 10;

      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockDistanceCalculatorPort.calculateDistance.mockResolvedValue(15);

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: mockOrderId });
      expect(mockDistanceCalculatorPort.calculateDistance).toHaveBeenCalled();
      expect(DeliveryFeeCalculatorService.calculate).toHaveBeenCalledWith(15, mockDeliveryFeePolicy);
    });
  });
});
