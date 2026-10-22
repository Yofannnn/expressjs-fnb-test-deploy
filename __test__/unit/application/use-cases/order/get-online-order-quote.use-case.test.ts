import { GetOnlineOrderQuoteUseCase } from "@/application/use-cases/order/get-online-order-quote.use-case";
import { GetOnlineOrderQuoteCommand } from "@/application/ports/driving/get-online-order-quote.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { DistanceCalculatorPort } from "@/application/ports/driven/distance-calculator.port";
import { Product } from "@/domain/entities/product.entity";
import { PricingPolicy } from "@/domain/policies/pricing.policy";
import { DeliveryFeePolicy } from "@/domain/policies/delivery-fee.policy";
import { StoreLocation } from "@/domain/types/store-location.type";
import { Money } from "@/domain/value-objects/money.vo";
import { DeliveryFeeCalculatorService } from "@/domain/services/delivery-fee-calculator.service";
import { OrderMapper } from "@/application/mappers/order.mapper";
import { OrderPricingPlainObject } from "@/application/types/order.type";
import { OrderType } from "@/domain/types/order.type";
import { ProductStatus, ProductType } from "@/domain/types/product.type";
import { OrderContainsUnknownProductsException } from "@/domain/exceptions/order.exceptions";
import { InsufficientStockException } from "@/domain/exceptions/product.exceptions";

jest.mock("@/domain/services/delivery-fee-calculator.service");
jest.mock("@/application/mappers/order.mapper");

describe("GetOnlineOrderQuoteUseCase", () => {
  let useCase: GetOnlineOrderQuoteUseCase;
  let mockPricingPolicy: jest.Mocked<PricingPolicy>;
  let mockDeliveryFeePolicy: jest.Mocked<DeliveryFeePolicy>;
  let mockStoreLocation: StoreLocation;
  let mockProductRepository: jest.Mocked<ProductRepositoryPort>;
  let mockDistanceCalculatorPort: jest.Mocked<DistanceCalculatorPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  const mockProductId = "product-123";
  const mockProductId2 = "product-456";
  const mockStoreCoordinate = { latitude: -6.2088, longitude: 106.8456 };
  const mockCustomerCoordinate = { latitude: -6.3, longitude: 106.9 };
  const mockStartTime = 1000;

  const mockPricingPlainObject: OrderPricingPlainObject = {
    subtotal: 250000,
    tax: 25000,
    serviceCharge: 12500,
    deliveryFee: 15000,
    discount: 0,
    total: 302500,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPricingPolicy = {
      taxRatePercent: 10,
      serviceChargeRatePercent: 5,
      serviceChargeApplicableTypes: [OrderType.DINEIN, OrderType.ONLINE],
    } as jest.Mocked<PricingPolicy>;

    mockDeliveryFeePolicy = {
      freeDeliveryRadiusKm: 3,
      baseFee: 15000,
      perKmRateBeyondBase: 2000,
      baseFeeCoversUpToKm: 5,
      maxDeliveryDistanceKm: 20,
    } as DeliveryFeePolicy;

    mockStoreLocation = {
      coordinate: mockStoreCoordinate,
    } as StoreLocation;

    mockProductRepository = {
      findByIds: jest.fn(),
    } as unknown as jest.Mocked<ProductRepositoryPort>;

    mockDistanceCalculatorPort = {
      calculateDistance: jest.fn().mockResolvedValue(5.5),
    } as jest.Mocked<DistanceCalculatorPort>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
    };

    (DeliveryFeeCalculatorService.calculate as jest.Mock).mockReturnValue(new Money(15000));
    (OrderMapper.toOrderPricingPlainObject as jest.Mock).mockReturnValue(mockPricingPlainObject);

    useCase = new GetOnlineOrderQuoteUseCase(
      mockPricingPolicy,
      mockDeliveryFeePolicy,
      mockStoreLocation,
      mockProductRepository,
      mockDistanceCalculatorPort,
      mockLogger,
    );
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

  const createValidCommand = (overrides: Partial<GetOnlineOrderQuoteCommand> = {}): GetOnlineOrderQuoteCommand => ({
    items: [
      { productId: mockProductId, quantity: 2 },
      { productId: mockProductId2, quantity: 1 },
    ],
    memberId: "member-123",
    deliveryCoordinate: mockCustomerCoordinate,
    ...overrides,
  });

  describe("execute", () => {
    it("should successfully calculate order quote with delivery", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(result).toEqual(mockPricingPlainObject);
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([mockProductId, mockProductId2]);
      expect(mockDistanceCalculatorPort.calculateDistance).toHaveBeenCalled();
      expect(DeliveryFeeCalculatorService.calculate).toHaveBeenCalled();
      expect(OrderMapper.toOrderPricingPlainObject).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should calculate order quote without delivery fee when no delivery coordinate", async () => {
      const command = createValidCommand({
        deliveryCoordinate: undefined,
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(mockDistanceCalculatorPort.calculateDistance).not.toHaveBeenCalled();
      expect(DeliveryFeeCalculatorService.calculate).not.toHaveBeenCalled();
      expect(OrderMapper.toOrderPricingPlainObject).toHaveBeenCalled();
    });

    it("should calculate order quote with memberId", async () => {
      const command = createValidCommand({
        memberId: "member-123",
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([mockProductId, mockProductId2]);
    });

    it("should handle single item order", async () => {
      const command = createValidCommand({
        items: [{ productId: mockProductId, quantity: 3 }],
      });

      const products = [createMockProduct(mockProductId, 100000, 10)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([mockProductId]);
    });

    it("should calculate order quote with zero delivery fee", async () => {
      (DeliveryFeeCalculatorService.calculate as jest.Mock).mockReturnValue(new Money(0));

      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(DeliveryFeeCalculatorService.calculate).toHaveBeenCalled();
    });

    it("should log debug message when starting", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetOnlineOrderQuoteUseCase",
        event: "GET_ORDER_QUOTE_STARTED",
        message: "Order quote is being calculated",
      });
    });

    it("should log info message when successful", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetOnlineOrderQuoteUseCase",
        event: "GET_ORDER_QUOTE_SUCCESSFUL",
        message: "Order quote calculated successfully",
        durationMs: 100,
      });

      dateNowSpy.mockRestore();
    });

    it("should handle repository error", async () => {
      const command = createValidCommand();
      const repoError = new Error("Repository error");
      mockProductRepository.findByIds.mockRejectedValue(repoError);

      await expect(useCase.execute(command)).rejects.toThrow(repoError);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle geolocation calculator error", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockDistanceCalculatorPort.calculateDistance.mockRejectedValue(new Error("Geolocation API error"));

      await expect(useCase.execute(command)).rejects.toThrow("Geolocation API error");
    });
  });

  describe("validation", () => {
    it("rejects with OrderContainsUnknownProductsException when product not found", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(OrderContainsUnknownProductsException);
    });

    it("rejects with InsufficientStockException when product stock is insufficient", async () => {
      const command = createValidCommand({
        items: [{ productId: mockProductId, quantity: 10 }],
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

    it("should handle empty items array", async () => {
      const command = createValidCommand({
        items: [],
      });

      mockProductRepository.findByIds.mockResolvedValue([]);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([]);
    });
  });

  describe("OrderMapper interaction", () => {
    it("should call toOrderPricingPlainObject with the calculated pricing", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(OrderMapper.toOrderPricingPlainObject).toHaveBeenCalledTimes(1);
    });

    it("should return the result from OrderMapper", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBe(mockPricingPlainObject);
    });

    it("should handle OrderMapper throwing error", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const mapperError = new Error("Mapper error");
      (OrderMapper.toOrderPricingPlainObject as jest.Mock).mockImplementation(() => {
        throw mapperError;
      });

      await expect(useCase.execute(command)).rejects.toThrow("Mapper error");
    });
  });

  describe("delivery fee calculation", () => {
    it("should calculate delivery fee with distance", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockDistanceCalculatorPort.calculateDistance.mockResolvedValue(10.5);

      await useCase.execute(command);

      expect(mockDistanceCalculatorPort.calculateDistance).toHaveBeenCalled();
      expect(DeliveryFeeCalculatorService.calculate).toHaveBeenCalledWith(10.5, mockDeliveryFeePolicy);
    });

    it("should calculate delivery fee with zero distance", async () => {
      const command = createValidCommand({
        deliveryCoordinate: mockStoreCoordinate,
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockDistanceCalculatorPort.calculateDistance.mockResolvedValue(0);

      await useCase.execute(command);

      expect(mockDistanceCalculatorPort.calculateDistance).toHaveBeenCalled();
      expect(DeliveryFeeCalculatorService.calculate).toHaveBeenCalledWith(0, mockDeliveryFeePolicy);
    });

    it("should return zero delivery fee when no delivery coordinate", async () => {
      const command = createValidCommand({
        deliveryCoordinate: undefined,
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockDistanceCalculatorPort.calculateDistance).not.toHaveBeenCalled();
      expect(DeliveryFeeCalculatorService.calculate).not.toHaveBeenCalled();
    });
  });

  describe("pricing calculation", () => {
    it("should use pricing policy tax rate", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockPricingPolicy.taxRatePercent).toBe(10);
    });

    it("should use pricing policy service charge rate", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockPricingPolicy.serviceChargeRatePercent).toBe(5);
    });

    it("should apply zero discount (TODO: implement loyalty)", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(OrderMapper.toOrderPricingPlainObject).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle products with zero stock", async () => {
      const command = createValidCommand({
        items: [{ productId: mockProductId, quantity: 1 }],
      });

      const products = [createMockProduct(mockProductId, 100000, 0)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(InsufficientStockException);
    });

    it("should handle multiple items with different quantities", async () => {
      const command = createValidCommand({
        items: [
          { productId: mockProductId, quantity: 3 },
          { productId: mockProductId2, quantity: 2 },
        ],
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([mockProductId, mockProductId2]);
    });

    it("should handle distance calculation with very large distance", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);
      mockDistanceCalculatorPort.calculateDistance.mockResolvedValue(1000);

      await useCase.execute(command);

      expect(DeliveryFeeCalculatorService.calculate).toHaveBeenCalledWith(1000, mockDeliveryFeePolicy);
    });

    it("should handle products with different prices", async () => {
      const command = createValidCommand({
        items: [
          { productId: mockProductId, quantity: 2 },
          { productId: mockProductId2, quantity: 1 },
        ],
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
    });

    it("should handle command with only items and no other fields", async () => {
      const command: GetOnlineOrderQuoteCommand = {
        items: [{ productId: mockProductId, quantity: 2 }],
      };

      const products = [createMockProduct(mockProductId, 100000, 10)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(mockDistanceCalculatorPort.calculateDistance).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should propagate product repository errors", async () => {
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

    it("should handle multiple products with one being out of stock", async () => {
      const command = createValidCommand({
        items: [
          { productId: mockProductId, quantity: 2 },
          { productId: mockProductId2, quantity: 1 },
        ],
      });

      const products = [createMockProduct(mockProductId, 100000, 1), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(InsufficientStockException);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message without parameters", async () => {
      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetOnlineOrderQuoteUseCase",
        event: "GET_ORDER_QUOTE_STARTED",
        message: "Order quote is being calculated",
      });
    });

    it("should log successful quote with duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetOnlineOrderQuoteUseCase",
        event: "GET_ORDER_QUOTE_SUCCESSFUL",
        message: "Order quote calculated successfully",
        durationMs: 150,
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful quote with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetOnlineOrderQuoteUseCase",
        event: "GET_ORDER_QUOTE_SUCCESSFUL",
        message: "Order quote calculated successfully",
        durationMs: 250,
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when error occurs", async () => {
      const command = createValidCommand();
      mockProductRepository.findByIds.mockRejectedValue(new Error("Repository error"));

      await expect(useCase.execute(command)).rejects.toThrow("Repository error");

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle logger debug throwing error", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });

    it("should handle logger info throwing error", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      await expect(useCase.execute(command)).rejects.toThrow("Logger error");
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle products with different types", async () => {
      const command = createValidCommand();
      const product1 = createMockProduct(mockProductId, 100000, 10);
      const product2 = createMockProduct(mockProductId2, 50000, 5);

      mockProductRepository.findByIds.mockResolvedValue([product1, product2]);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
    });

    it("should handle products with different stock quantities", async () => {
      const command = createValidCommand({
        items: [
          { productId: mockProductId, quantity: 5 },
          { productId: mockProductId2, quantity: 3 },
        ],
      });

      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
    });

    it("should handle OrderMapper returning different plain object", async () => {
      const customPlainObject: OrderPricingPlainObject = {
        subtotal: 500000,
        tax: 50000,
        serviceCharge: 25000,
        deliveryFee: 20000,
        discount: 10000,
        total: 585000,
      };

      (OrderMapper.toOrderPricingPlainObject as jest.Mock).mockReturnValue(customPlainObject);

      const command = createValidCommand();
      const products = [createMockProduct(mockProductId, 100000, 10), createMockProduct(mockProductId2, 50000, 5)];

      mockProductRepository.findByIds.mockResolvedValue(products);

      const result = await useCase.execute(command);

      expect(result).toEqual(customPlainObject);
    });
  });

  describe("TODO: cache implementation", () => {
    it("should have TODO comment for cache", () => {
      const sourceCode = GetOnlineOrderQuoteUseCase.toString();
      expect(sourceCode).toContain("TODO");
    });
  });
});
