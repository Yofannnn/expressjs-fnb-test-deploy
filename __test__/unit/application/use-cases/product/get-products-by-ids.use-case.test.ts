import { GetProductsByIdsUseCase } from "@/application/use-cases/product/get-products-by-ids.use-case";
import { GetProductsByIdsCommand } from "@/application/ports/driving/get-products-by-ids.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { ProductMapper } from "@/application/mappers/product.mapper";
import { Product } from "@/domain/entities/product.entity";
import { ProductImage } from "@/domain/value-objects/product-image.vo";
import { ProductPlainObject } from "@/application/types/product.type";
import { ProductStatus, ProductType } from "@/domain/types/product.type";

jest.mock("@/application/mappers/product.mapper");

describe("GetProductsByIdsUseCase", () => {
  let useCase: GetProductsByIdsUseCase;
  let mockProductRepository: jest.Mocked<ProductRepositoryPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  const mockStartTime = 1000;

  const mockImages: ProductImage[] = [
    {
      getProductId: jest.fn().mockReturnValue("prod-1"),
      getUrl: jest.fn().mockReturnValue("https://example.com/image1.jpg"),
      getAltText: jest.fn().mockReturnValue("Image 1"),
      getSortOrder: jest.fn().mockReturnValue(1),
      isPrimaryImage: jest.fn().mockReturnValue(true),
      changeUrl: jest.fn().mockReturnThis(),
      changeAltText: jest.fn().mockReturnThis(),
      changeSortOrder: jest.fn().mockReturnThis(),
      makePrimary: jest.fn().mockReturnThis(),
    } as unknown as ProductImage,
    {
      getProductId: jest.fn().mockReturnValue("prod-1"),
      getUrl: jest.fn().mockReturnValue("https://example.com/image2.jpg"),
      getAltText: jest.fn().mockReturnValue("Image 2"),
      getSortOrder: jest.fn().mockReturnValue(2),
      isPrimaryImage: jest.fn().mockReturnValue(false),
      changeUrl: jest.fn().mockReturnThis(),
      changeAltText: jest.fn().mockReturnThis(),
      changeSortOrder: jest.fn().mockReturnThis(),
      makePrimary: jest.fn().mockReturnThis(),
    } as unknown as ProductImage,
  ];

  const mockProduct1 = {
    getId: jest.fn().mockReturnValue("prod-1"),
    getName: jest.fn().mockReturnValue("Test Product 1"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(50000) }),
    getDescription: jest.fn().mockReturnValue("Description 1"),
    getType: jest.fn().mockReturnValue(ProductType.FOOD),
    getStockQuantity: jest.fn().mockReturnValue(100),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue(mockImages),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
  } as unknown as jest.Mocked<Product>;

  const mockProduct2 = {
    getId: jest.fn().mockReturnValue("prod-2"),
    getName: jest.fn().mockReturnValue("Test Product 2"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(30000) }),
    getDescription: jest.fn().mockReturnValue("Description 2"),
    getType: jest.fn().mockReturnValue(ProductType.DRINK),
    getStockQuantity: jest.fn().mockReturnValue(50),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue([]),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-02T00:00:00Z")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-02T00:00:00Z")),
  } as unknown as jest.Mocked<Product>;

  const mockProduct3 = {
    getId: jest.fn().mockReturnValue("prod-3"),
    getName: jest.fn().mockReturnValue("Another Product"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(45000) }),
    getDescription: jest.fn().mockReturnValue("Description 3"),
    getType: jest.fn().mockReturnValue(ProductType.PACKAGED),
    getStockQuantity: jest.fn().mockReturnValue(0),
    getStatus: jest.fn().mockReturnValue(ProductStatus.UNAVAILABLE),
    getImages: jest.fn().mockReturnValue([mockImages[0]]),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-03T00:00:00Z")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-03T00:00:00Z")),
  } as unknown as jest.Mocked<Product>;

  const mockProducts: Product[] = [mockProduct1, mockProduct2, mockProduct3];

  const mockPlainObject1: ProductPlainObject = {
    id: "prod-1",
    categoryId: "cat-1",
    name: "Test Product 1",
    price: 50000,
    description: "Description 1",
    type: ProductType.FOOD,
    stockQuantity: 100,
    status: ProductStatus.AVAILABLE,
    ingredients: "Ingredients 1",
    preparationTimeInMinutes: 30,
    images: [],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockPlainObject2: ProductPlainObject = {
    id: "prod-2",
    categoryId: "cat-2",
    name: "Test Product 2",
    price: 30000,
    description: "Description 2",
    type: ProductType.DRINK,
    stockQuantity: 50,
    status: ProductStatus.AVAILABLE,
    ingredients: null,
    preparationTimeInMinutes: 15,
    images: [],
    createdAt: new Date("2024-01-02T00:00:00Z"),
    updatedAt: new Date("2024-01-02T00:00:00Z"),
  };

  const mockPlainObject3: ProductPlainObject = {
    id: "prod-3",
    categoryId: "cat-3",
    name: "Another Product",
    price: 45000,
    description: "Description 3",
    type: ProductType.PACKAGED,
    stockQuantity: 0,
    status: ProductStatus.UNAVAILABLE,
    ingredients: null,
    preparationTimeInMinutes: null,
    images: [],
    createdAt: new Date("2024-01-03T00:00:00Z"),
    updatedAt: new Date("2024-01-03T00:00:00Z"),
  };

  const mockCommand: GetProductsByIdsCommand = {
    ids: ["prod-1", "prod-2", "prod-3"],
  };

  const setupMapperMock = () => {
    (ProductMapper.toPlainObject as jest.Mock)
      .mockReset()
      .mockReturnValueOnce(mockPlainObject1)
      .mockReturnValueOnce(mockPlainObject2)
      .mockReturnValueOnce(mockPlainObject3);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findDetailById: jest.fn(),
      search: jest.fn(),
      browse: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      updateImages: jest.fn(),
      delete: jest.fn(),
      deductStockForItems: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    mockProductRepository.findByIds.mockResolvedValue(mockProducts);
    setupMapperMock();

    useCase = new GetProductsByIdsUseCase(mockProductRepository, mockLogger);
  });

  describe("execute", () => {
    it("should successfully get products by ids", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(3);
      expect(result.notFoundIds).toHaveLength(0);
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith(mockCommand.ids);
    });

    it("should return empty products array when no products found", async () => {
      mockProductRepository.findByIds.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);

      expect(result.products).toEqual([]);
      expect(result.products).toHaveLength(0);
      expect(result.notFoundIds).toEqual(mockCommand.ids);
    });

    it("should log debug message when starting", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetProductsByIdsUseCase ",
        event: "GET_PRODUCTS_BY_IDS_STARTED",
        message: "Products are being retrieved",
      });
    });

    it("should log info message when successful", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductsByIdsUseCase ",
        event: "GET_PRODUCTS_BY_IDS_SUCCESSFUL",
        message: "Products retrieved successfully",
        durationMs: 100,
      });

      dateNowSpy.mockRestore();
    });

    it("should handle repository error", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findByIds.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should call findByIds with correct parameters", async () => {
      await useCase.execute(mockCommand);

      expect(mockProductRepository.findByIds).toHaveBeenCalledWith(mockCommand.ids);
    });

    it("should handle empty ids array", async () => {
      const commandWithEmptyIds: GetProductsByIdsCommand = {
        ids: [],
      };

      mockProductRepository.findByIds.mockResolvedValue([]);

      const result = await useCase.execute(commandWithEmptyIds);

      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([]);
      expect(result.products).toEqual([]);
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle single id", async () => {
      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([mockProduct1]);
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(mockPlainObject1);

      const result = await useCase.execute(commandWithSingleId);

      expect(mockProductRepository.findByIds).toHaveBeenCalledWith(["prod-1"]);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe("prod-1");
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle duplicate ids", async () => {
      const commandWithDuplicateIds: GetProductsByIdsCommand = {
        ids: ["prod-1", "prod-1", "prod-2"],
      };

      mockProductRepository.findByIds.mockResolvedValue([mockProduct1, mockProduct2]);
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(mockPlainObject1).mockReturnValueOnce(mockPlainObject2);

      const result = await useCase.execute(commandWithDuplicateIds);

      expect(mockProductRepository.findByIds).toHaveBeenCalledWith(["prod-1", "prod-1", "prod-2"]);
      expect(result.products).toHaveLength(2);
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle large number of ids", async () => {
      const largeIds = Array.from({ length: 100 }, (_, i) => `prod-${i}`);
      const commandWithLargeIds: GetProductsByIdsCommand = {
        ids: largeIds,
      };

      const largeProducts = Array.from({ length: 100 }, (_, i) => ({
        ...mockProduct1,
        getId: jest.fn().mockReturnValue(`prod-${i}`),
        getName: jest.fn().mockReturnValue(`Product ${i}`),
      }));

      mockProductRepository.findByIds.mockResolvedValue(largeProducts as unknown as Product[]);

      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockImplementation((product) => ({
        id: product.getId(),
        name: product.getName(),
        price: 50000,
        description: "Description",
        type: ProductType.FOOD,
        stockQuantity: 100,
        status: ProductStatus.AVAILABLE,
        ingredients: null,
        preparationTimeInMinutes: null,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await useCase.execute(commandWithLargeIds);

      expect(mockProductRepository.findByIds).toHaveBeenCalledWith(largeIds);
      expect(result.products).toHaveLength(100);
      expect(result.products[0].id).toBe("prod-0");
      expect(result.products[99].id).toBe("prod-99");
      expect(result.notFoundIds).toEqual([]);
    });

    it("should return notFoundIds when some products are missing", async () => {
      const ids = ["prod-1", "prod-2", "prod-3", "prod-4", "prod-5"];
      const commandWithMissingIds: GetProductsByIdsCommand = {
        ids,
      };

      mockProductRepository.findByIds.mockResolvedValue([mockProduct1, mockProduct3]);
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(mockPlainObject1).mockReturnValueOnce(mockPlainObject3);

      const result = await useCase.execute(commandWithMissingIds);

      expect(result.products).toHaveLength(2);
      expect(result.products[0].id).toBe("prod-1");
      expect(result.products[1].id).toBe("prod-3");
      expect(result.notFoundIds).toEqual(["prod-2", "prod-4", "prod-5"]);
    });

    it("should return all ids as notFoundIds when no products found", async () => {
      const ids = ["prod-1", "prod-2", "prod-3"];
      const commandWithAllMissing: GetProductsByIdsCommand = {
        ids,
      };

      mockProductRepository.findByIds.mockResolvedValue([]);

      const result = await useCase.execute(commandWithAllMissing);

      expect(result.products).toEqual([]);
      expect(result.notFoundIds).toEqual(ids);
    });
  });

  describe("ProductMapper interaction", () => {
    it("should call toPlainObject for each product", async () => {
      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(ProductMapper.toPlainObject).toHaveBeenCalledTimes(3);
      expect(ProductMapper.toPlainObject).toHaveBeenCalledWith(mockProduct1);
      expect(ProductMapper.toPlainObject).toHaveBeenCalledWith(mockProduct2);
      expect(ProductMapper.toPlainObject).toHaveBeenCalledWith(mockProduct3);
    });

    it("should return the mapped plain objects", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result.products).toEqual([mockPlainObject1, mockPlainObject2, mockPlainObject3]);
    });

    it("should handle mapper returning null for a product", async () => {
      (ProductMapper.toPlainObject as jest.Mock)
        .mockReset()
        .mockReturnValueOnce(mockPlainObject1)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockPlainObject3);

      const result = await useCase.execute(mockCommand);

      expect(result.products).toHaveLength(3);
      expect(result.products[0]).toEqual(mockPlainObject1);
      expect(result.products[1]).toBeNull();
      expect(result.products[2]).toEqual(mockPlainObject3);
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle mapper throwing error", async () => {
      const mapperError = new Error("Mapper error");
      (ProductMapper.toPlainObject as jest.Mock)
        .mockReset()
        .mockImplementationOnce(() => {
          throw mapperError;
        })
        .mockImplementationOnce(() => mockPlainObject2)
        .mockImplementationOnce(() => mockPlainObject3);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(mapperError);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with ids", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetProductsByIdsUseCase ",
        event: "GET_PRODUCTS_BY_IDS_STARTED",
        message: "Products are being retrieved",
      });
    });

    it("should log successful get with duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductsByIdsUseCase ",
        event: "GET_PRODUCTS_BY_IDS_SUCCESSFUL",
        message: "Products retrieved successfully",
        durationMs: 150,
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful get with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductsByIdsUseCase ",
        event: "GET_PRODUCTS_BY_IDS_SUCCESSFUL",
        message: "Products retrieved successfully",
        durationMs: 250,
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when repository error occurs", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findByIds.mockRejectedValue(repoError);

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
      const largeProductSet: Product[] = Array.from(
        { length: 100 },
        (_, i) =>
          ({
            ...mockProduct1,
            getId: jest.fn().mockReturnValue(`prod-${i}`),
            getName: jest.fn().mockReturnValue(`Product ${i}`),
            getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(10000 + i * 1000) }),
            getImages: jest.fn().mockReturnValue([]),
          }) as unknown as Product,
      );

      mockProductRepository.findByIds.mockResolvedValue(largeProductSet);

      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockImplementation((product) => ({
        id: product.getId(),
        name: product.getName(),
        price: 10000 + parseInt(product.getId().split("-")[1]) * 1000,
        description: null,
        type: ProductType.FOOD,
        stockQuantity: 100,
        status: ProductStatus.AVAILABLE,
        ingredients: null,
        preparationTimeInMinutes: null,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await useCase.execute(mockCommand);

      expect(result.products).toHaveLength(100);
      expect(result.products[0].id).toBe("prod-0");
      expect(result.products[99].id).toBe("prod-99");
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle multiple get requests with different ids", async () => {
      const idSets = [["prod-1"], ["prod-1", "prod-2"], ["prod-1", "prod-2", "prod-3"]];

      for (const ids of idSets) {
        const command: GetProductsByIdsCommand = { ids };
        const expectedProducts = mockProducts.filter((_, index) => index < ids.length);
        mockProductRepository.findByIds.mockResolvedValue(expectedProducts);
        setupMapperMock();

        const result = await useCase.execute(command);
        expect(result.products).toHaveLength(ids.length);
        expect(result.notFoundIds).toEqual([]);
        expect(mockProductRepository.findByIds).toHaveBeenCalledWith(ids);
      }
    });

    it("should handle get with no results multiple times", async () => {
      const ids = ["prod-1", "prod-2"];
      const command: GetProductsByIdsCommand = { ids };
      mockProductRepository.findByIds.mockResolvedValue([]);

      const firstResult = await useCase.execute(command);
      const secondResult = await useCase.execute(command);

      expect(firstResult.products).toEqual([]);
      expect(firstResult.notFoundIds).toEqual(ids);
      expect(secondResult.products).toEqual([]);
      expect(secondResult.notFoundIds).toEqual(ids);
      expect(mockProductRepository.findByIds).toHaveBeenCalledTimes(2);
    });

    it("should handle products with null name", async () => {
      const productWithNullName = {
        ...mockProduct1,
        getName: jest.fn().mockReturnValue(null),
        getImages: jest.fn().mockReturnValue([]),
      };

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithNullName] as unknown as Product[]);

      const plainObjectWithNullName = {
        ...mockPlainObject1,
        name: null,
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithNullName);

      const result = await useCase.execute(commandWithSingleId);

      expect(result.products[0].name).toBeNull();
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle products with empty string description", async () => {
      const productWithEmptyDescription = {
        ...mockProduct1,
        getDescription: jest.fn().mockReturnValue(""),
        getImages: jest.fn().mockReturnValue([]),
      };

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithEmptyDescription] as unknown as Product[]);

      const plainObjectWithEmptyDescription = {
        ...mockPlainObject1,
        description: "",
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithEmptyDescription);

      const result = await useCase.execute(commandWithSingleId);

      expect(result.products[0].description).toBe("");
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle products with empty images array", async () => {
      const productWithEmptyImages = {
        ...mockProduct1,
        getImages: jest.fn().mockReturnValue([]),
      };

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithEmptyImages] as unknown as Product[]);

      const plainObjectWithEmptyImages = {
        ...mockPlainObject1,
        images: [],
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithEmptyImages);

      const result = await useCase.execute(commandWithSingleId);

      expect(result.products[0].images).toEqual([]);
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle products with negative stock", async () => {
      const productWithNegativeStock = {
        ...mockProduct1,
        getStockQuantity: jest.fn().mockReturnValue(-5),
      };

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithNegativeStock] as unknown as Product[]);

      const plainObjectWithNegativeStock = {
        ...mockPlainObject1,
        stockQuantity: -5,
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithNegativeStock);

      const result = await useCase.execute(commandWithSingleId);

      expect(result.products[0].stockQuantity).toBe(-5);
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle products with negative price", async () => {
      const productWithNegativePrice = {
        ...mockProduct1,
        getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(-10000) }),
      };

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithNegativePrice] as unknown as Product[]);

      const plainObjectWithNegativePrice = {
        ...mockPlainObject1,
        price: -10000,
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithNegativePrice);

      const result = await useCase.execute(commandWithSingleId);

      expect(result.products[0].price).toBe(-10000);
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle partial results with some products found and some not", async () => {
      const ids = ["prod-1", "prod-2", "prod-3", "prod-4"];
      const command: GetProductsByIdsCommand = { ids };

      mockProductRepository.findByIds.mockResolvedValue([mockProduct1, mockProduct3]);
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(mockPlainObject1).mockReturnValueOnce(mockPlainObject3);

      const result = await useCase.execute(command);

      expect(result.products).toHaveLength(2);
      expect(result.products[0].id).toBe("prod-1");
      expect(result.products[1].id).toBe("prod-3");
      expect(result.notFoundIds).toEqual(["prod-2", "prod-4"]);
    });

    it("should handle products with Unicode characters in name", async () => {
      const unicodeName = "🚀 Product with emoji 🎉";
      const productWithUnicode = {
        ...mockProduct1,
        getName: jest.fn().mockReturnValue(unicodeName),
      };

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithUnicode] as unknown as Product[]);

      const plainObjectWithUnicode = {
        ...mockPlainObject1,
        name: unicodeName,
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithUnicode);

      const result = await useCase.execute(commandWithSingleId);

      expect(result.products[0].name).toBe(unicodeName);
      expect(result.notFoundIds).toEqual([]);
    });
  });

  describe("return value verification", () => {
    it("should return GetProductsByIdsResult with correct structure", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result).toHaveProperty("products");
      expect(result).toHaveProperty("notFoundIds");
      expect(Array.isArray(result.products)).toBe(true);
      expect(Array.isArray(result.notFoundIds)).toBe(true);
    });

    it("should return products as ProductPlainObject array", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result.products[0]).toHaveProperty("id");
      expect(result.products[0]).toHaveProperty("categoryId");
      expect(result.products[0]).toHaveProperty("name");
      expect(result.products[0]).toHaveProperty("price");
      expect(result.products[0]).toHaveProperty("description");
      expect(result.products[0]).toHaveProperty("type");
      expect(result.products[0]).toHaveProperty("stockQuantity");
      expect(result.products[0]).toHaveProperty("status");
      expect(result.products[0]).toHaveProperty("ingredients");
      expect(result.products[0]).toHaveProperty("preparationTimeInMinutes");
      expect(result.products[0]).toHaveProperty("images");
      expect(result.products[0]).toHaveProperty("createdAt");
      expect(result.products[0]).toHaveProperty("updatedAt");
    });

    it("should return correct data types", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(typeof result.products[0].id).toBe("string");
      expect(typeof result.products[0].name).toBe("string");
      expect(typeof result.products[0].price).toBe("number");
      expect(result.products[0].description === null || typeof result.products[0].description === "string").toBe(true);
      expect(typeof result.products[0].type).toBe("string");
      expect(typeof result.products[0].stockQuantity).toBe("number");
      expect(typeof result.products[0].status).toBe("string");
      expect(Array.isArray(result.products[0].images)).toBe(true);
      expect(result.products[0].createdAt).toBeInstanceOf(Date);
      expect(result.products[0].updatedAt).toBeInstanceOf(Date);
    });

    it("should maintain order of products as returned by repository", async () => {
      const orderedProducts = [
        { ...mockProduct1, getId: jest.fn().mockReturnValue("first") },
        { ...mockProduct2, getId: jest.fn().mockReturnValue("second") },
        { ...mockProduct3, getId: jest.fn().mockReturnValue("third") },
      ];

      mockProductRepository.findByIds.mockResolvedValue(orderedProducts as unknown as Product[]);

      (ProductMapper.toPlainObject as jest.Mock)
        .mockReset()
        .mockReturnValueOnce({ ...mockPlainObject1, id: "first" })
        .mockReturnValueOnce({ ...mockPlainObject2, id: "second" })
        .mockReturnValueOnce({ ...mockPlainObject3, id: "third" });

      const result = await useCase.execute(mockCommand);

      expect(result.products[0].id).toBe("first");
      expect(result.products[1].id).toBe("second");
      expect(result.products[2].id).toBe("third");
      expect(result.notFoundIds).toEqual([]);
    });

    it("should return notFoundIds as string array", async () => {
      const ids = ["prod-1", "prod-2", "prod-3", "prod-4"];
      const command: GetProductsByIdsCommand = { ids };

      mockProductRepository.findByIds.mockResolvedValue([mockProduct1, mockProduct3]);
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(mockPlainObject1).mockReturnValueOnce(mockPlainObject3);

      const result = await useCase.execute(command);

      expect(Array.isArray(result.notFoundIds)).toBe(true);
      expect(result.notFoundIds).toEqual(["prod-2", "prod-4"]);
      result.notFoundIds.forEach((id) => {
        expect(typeof id).toBe("string");
      });
    });
  });

  describe("error handling scenarios", () => {
    it("should handle repository timeout error", async () => {
      const timeoutError = new Error("Timeout error");
      mockProductRepository.findByIds.mockRejectedValue(timeoutError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Timeout error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository connection error", async () => {
      const connectionError = new Error("Database connection error");
      mockProductRepository.findByIds.mockRejectedValue(connectionError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Database connection error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle null values from repository", async () => {
      const productWithNullValues = {
        getId: jest.fn().mockReturnValue(null),
        getName: jest.fn().mockReturnValue(null),
        getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(null) }),
        getDescription: jest.fn().mockReturnValue(null),
        getType: jest.fn().mockReturnValue(null),
        getStockQuantity: jest.fn().mockReturnValue(null),
        getStatus: jest.fn().mockReturnValue(null),
        getImages: jest.fn().mockReturnValue([]),
        getCreatedAt: jest.fn().mockReturnValue(null),
        getUpdatedAt: jest.fn().mockReturnValue(null),
      } as unknown as Product;

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithNullValues]);

      const plainObjectWithNull = {
        id: null,
        categoryId: null,
        name: null,
        price: null,
        description: null,
        type: null,
        stockQuantity: null,
        status: null,
        ingredients: null,
        preparationTimeInMinutes: null,
        images: [],
        createdAt: null,
        updatedAt: null,
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithNull);

      const result = await useCase.execute(commandWithSingleId);
      expect(result.products[0].id).toBeNull();
      expect(result.products[0].name).toBeNull();
      expect(result.products[0].price).toBeNull();
      expect(result.products[0].description).toBeNull();
      expect(result.products[0].type).toBeNull();
      expect(result.products[0].stockQuantity).toBeNull();
      expect(result.products[0].status).toBeNull();
      expect(result.products[0].createdAt).toBeNull();
      expect(result.products[0].updatedAt).toBeNull();
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle repository returning empty array", async () => {
      mockProductRepository.findByIds.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);
      expect(result.products).toEqual([]);
      expect(result.notFoundIds).toEqual(mockCommand.ids);
    });

    it("should handle invalid ids gracefully", async () => {
      const commandWithInvalidIds: GetProductsByIdsCommand = {
        ids: ["invalid-id-1", "invalid-id-2"],
      };

      mockProductRepository.findByIds.mockResolvedValue([]);

      const result = await useCase.execute(commandWithInvalidIds);
      expect(result.products).toEqual([]);
      expect(result.notFoundIds).toEqual(["invalid-id-1", "invalid-id-2"]);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle products with different statuses", async () => {
      const statuses = [ProductStatus.UPCOMING, ProductStatus.AVAILABLE, ProductStatus.UNAVAILABLE, ProductStatus.DISCONTINUED];

      const productsWithStatuses = statuses.map((status, index) => ({
        ...mockProduct1,
        getId: jest.fn().mockReturnValue(`prod-${index}`),
        getStatus: jest.fn().mockReturnValue(status),
      }));

      mockProductRepository.findByIds.mockResolvedValue(productsWithStatuses as unknown as Product[]);

      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockImplementation((product) => ({
        ...mockPlainObject1,
        id: product.getId(),
        status: product.getStatus(),
      }));

      const result = await useCase.execute(mockCommand);

      statuses.forEach((status, index) => {
        expect(result.products[index].status).toBe(status);
      });
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle products with different types", async () => {
      const types = [ProductType.FOOD, ProductType.DRINK, ProductType.PACKAGED];

      const productsWithTypes = types.map((type, index) => ({
        ...mockProduct1,
        getId: jest.fn().mockReturnValue(`prod-${index}`),
        getType: jest.fn().mockReturnValue(type),
      }));

      mockProductRepository.findByIds.mockResolvedValue(productsWithTypes as unknown as Product[]);

      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockImplementation((product) => ({
        ...mockPlainObject1,
        id: product.getId(),
        type: product.getType(),
      }));

      const result = await useCase.execute(mockCommand);

      types.forEach((type, index) => {
        expect(result.products[index].type).toBe(type);
      });
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle products with special characters in description", async () => {
      const specialDescription = "Description!@#$%^&*()";
      const productWithSpecialDesc = {
        ...mockProduct1,
        getDescription: jest.fn().mockReturnValue(specialDescription),
      };

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithSpecialDesc] as unknown as Product[]);

      const plainObjectWithSpecialDesc = {
        ...mockPlainObject1,
        description: specialDescription,
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithSpecialDesc);

      const result = await useCase.execute(commandWithSingleId);

      expect(result.products[0].description).toBe(specialDescription);
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle ProductMapper returning undefined", async () => {
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(undefined);

      const result = await useCase.execute(mockCommand);

      expect(result.products[0]).toBeUndefined();
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle products with null ingredients", async () => {
      const productWithNullIngredients = {
        ...mockProduct1,
        getIngredients: jest.fn().mockReturnValue(null),
      };

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithNullIngredients] as unknown as Product[]);

      const plainObjectWithNullIngredients = {
        ...mockPlainObject1,
        ingredients: null,
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithNullIngredients);

      const result = await useCase.execute(commandWithSingleId);

      expect(result.products[0].ingredients).toBeNull();
      expect(result.notFoundIds).toEqual([]);
    });

    it("should handle products with null preparationTimeInMinutes", async () => {
      const productWithNullPrepTime = {
        ...mockProduct1,
        getPreparationTimeInMinutes: jest.fn().mockReturnValue(null),
      };

      const commandWithSingleId: GetProductsByIdsCommand = {
        ids: ["prod-1"],
      };

      mockProductRepository.findByIds.mockResolvedValue([productWithNullPrepTime] as unknown as Product[]);

      const plainObjectWithNullPrepTime = {
        ...mockPlainObject1,
        preparationTimeInMinutes: null,
      };
      (ProductMapper.toPlainObject as jest.Mock).mockReset().mockReturnValueOnce(plainObjectWithNullPrepTime);

      const result = await useCase.execute(commandWithSingleId);

      expect(result.products[0].preparationTimeInMinutes).toBeNull();
      expect(result.notFoundIds).toEqual([]);
    });
  });

  describe("TODO: cache implementation", () => {
    it("should have TODO comment for cache", () => {
      const sourceCode = GetProductsByIdsUseCase.toString();
      expect(sourceCode).toContain("TODO: add cache");
    });
  });
});
