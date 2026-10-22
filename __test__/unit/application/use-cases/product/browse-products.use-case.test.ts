import { BrowseProductsUseCase } from "@/application/use-cases/product/browse-products.use-case";
import { BrowseProductsCommand, ProductSort } from "@/application/ports/driving/browse-products.use-case.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { ProductMapper } from "@/application/mappers/product.mapper";
import { Product } from "@/domain/entities/product.entity";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductImage } from "@/domain/value-objects/product-image.vo";
import { ProductSummaryView } from "@/application/types/product.type";
import { ProductStatus, ProductType } from "@/domain/types/product.type";

jest.mock("@/application/mappers/product.mapper");

describe("BrowseProductsUseCase", () => {
  let useCase: BrowseProductsUseCase;
  let mockProductRepository: jest.Mocked<ProductRepositoryPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  const mockStartTime = 1000;
  const mockNextCursor = "next-cursor-123";

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
    getCategoryId: jest.fn().mockReturnValue("cat-1"),
  } as unknown as jest.Mocked<Product>;

  const mockProduct2 = {
    getId: jest.fn().mockReturnValue("prod-2"),
    getName: jest.fn().mockReturnValue("Test Product 2"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(25000) }),
    getDescription: jest.fn().mockReturnValue("Description 2"),
    getType: jest.fn().mockReturnValue(ProductType.DRINK),
    getStockQuantity: jest.fn().mockReturnValue(50),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue([]),
    getCategoryId: jest.fn().mockReturnValue("cat-1"),
  } as unknown as jest.Mocked<Product>;

  const mockProduct3 = {
    getId: jest.fn().mockReturnValue("prod-3"),
    getName: jest.fn().mockReturnValue("Another Product"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(75000) }),
    getDescription: jest.fn().mockReturnValue("Description 3"),
    getType: jest.fn().mockReturnValue(ProductType.PACKAGED),
    getStockQuantity: jest.fn().mockReturnValue(0),
    getStatus: jest.fn().mockReturnValue(ProductStatus.UNAVAILABLE),
    getImages: jest.fn().mockReturnValue([mockImages[0]]),
    getCategoryId: jest.fn().mockReturnValue("cat-2"),
  } as unknown as jest.Mocked<Product>;

  const mockProducts: Product[] = [mockProduct1, mockProduct2, mockProduct3];

  const mockSummaryView1: ProductSummaryView = {
    id: "prod-1",
    categoryId: "cat-1",
    name: "Test Product 1",
    price: 50000,
    status: ProductStatus.AVAILABLE,
    primaryImageUrl: "https://example.com/image1.jpg",
  };

  const mockSummaryView2: ProductSummaryView = {
    id: "prod-2",
    categoryId: "cat-1",
    name: "Test Product 2",
    price: 25000,
    status: ProductStatus.AVAILABLE,
    primaryImageUrl: "",
  };

  const mockSummaryView3: ProductSummaryView = {
    id: "prod-3",
    categoryId: "cat-2",
    name: "Another Product",
    price: 75000,
    status: ProductStatus.UNAVAILABLE,
    primaryImageUrl: "https://example.com/image1.jpg",
  };

  const mockSummaryViews = [mockSummaryView1, mockSummaryView2, mockSummaryView3];

  const mockBrowseResult = {
    products: mockProducts,
    nextCursor: mockNextCursor,
  };

  const mockQuery: BrowseProductsCommand = {
    categoryId: "cat-123",
    type: ProductType.FOOD,
    status: ProductStatus.AVAILABLE,
    minPrice: 10000,
    maxPrice: 50000,
    sort: ProductSort.NAME_ASC,
    limit: 10,
  };

  const setupMapperMock = () => {
    (ProductMapper.toSummaryView as jest.Mock)
      .mockReset()
      .mockReturnValueOnce(mockSummaryView1)
      .mockReturnValueOnce(mockSummaryView2)
      .mockReturnValueOnce(mockSummaryView3);
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

    mockProductRepository.browse.mockResolvedValue(mockBrowseResult);
    setupMapperMock();

    useCase = new BrowseProductsUseCase(mockProductRepository, mockLogger);
  });

  describe("execute", () => {
    it("should successfully browse products with all filters", async () => {
      const result = await useCase.execute(mockQuery);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(3);
      expect(result.nextCursor).toBe(mockNextCursor);
      expect(mockProductRepository.browse).toHaveBeenCalledWith(mockQuery);
    });

    it("should return empty products array and no cursor when no products found", async () => {
      mockProductRepository.browse.mockResolvedValue({ products: [], nextCursor: null });

      const result = await useCase.execute(mockQuery);

      expect(result.products).toEqual([]);
      expect(result.products).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it("should log debug message when starting", async () => {
      await useCase.execute(mockQuery);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "BrowseProductsUseCase",
        event: "BROWSE_PRODUCTS_STARTED",
        message: "Products are being retrieved",
      });
    });

    it("should log info message when successful", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      await useCase.execute(mockQuery);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "BrowseProductsUseCase",
        event: "BROWSE_PRODUCTS_SUCCESSFUL",
        message: "Products retrieved successfully",
        durationMs: 100,
      });

      dateNowSpy.mockRestore();
    });

    it("should handle repository error", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.browse.mockRejectedValue(repoError);

      await expect(useCase.execute(mockQuery)).rejects.toThrow(repoError);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should call browse with correct query parameters", async () => {
      await useCase.execute(mockQuery);

      expect(mockProductRepository.browse).toHaveBeenCalledWith(mockQuery);
    });

    it("should handle empty query object", async () => {
      const emptyQuery: BrowseProductsCommand = {};

      mockProductRepository.browse.mockResolvedValue({ products: [], nextCursor: null });

      await useCase.execute(emptyQuery);

      expect(mockProductRepository.browse).toHaveBeenCalledWith(emptyQuery);
    });

    it("should handle query with only categoryId", async () => {
      const queryWithCategory: BrowseProductsCommand = {
        categoryId: "cat-123",
      };

      mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(queryWithCategory);

      expect(mockProductRepository.browse).toHaveBeenCalledWith(queryWithCategory);
    });

    it("should handle query with only type", async () => {
      const queryWithType: BrowseProductsCommand = {
        type: ProductType.FOOD,
      };

      mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(queryWithType);

      expect(mockProductRepository.browse).toHaveBeenCalledWith(queryWithType);
    });

    it("should handle query with only status", async () => {
      const queryWithStatus: BrowseProductsCommand = {
        status: ProductStatus.AVAILABLE,
      };

      mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(queryWithStatus);

      expect(mockProductRepository.browse).toHaveBeenCalledWith(queryWithStatus);
    });

    it("should handle query with price range only", async () => {
      const queryWithPriceRange: BrowseProductsCommand = {
        minPrice: 10000,
        maxPrice: 50000,
      };

      mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(queryWithPriceRange);

      expect(mockProductRepository.browse).toHaveBeenCalledWith(queryWithPriceRange);
    });

    it("should handle query with sorting options", async () => {
      const queryWithSorting: BrowseProductsCommand = {
        sort: ProductSort.NAME_ASC,
      };

      mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(queryWithSorting);

      expect(mockProductRepository.browse).toHaveBeenCalledWith(queryWithSorting);
    });

    it("should handle query with pagination options", async () => {
      const queryWithPagination: BrowseProductsCommand = {
        limit: 20,
      };

      mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(queryWithPagination);

      expect(mockProductRepository.browse).toHaveBeenCalledWith(queryWithPagination);
    });

    it("should handle query with all options combined", async () => {
      const fullQuery: BrowseProductsCommand = {
        categoryId: "cat-123",
        type: ProductType.FOOD,
        status: ProductStatus.AVAILABLE,
        minPrice: 10000,
        maxPrice: 50000,
        sort: ProductSort.PRICE_DESC,
        limit: 10,
      };

      await useCase.execute(fullQuery);

      expect(mockProductRepository.browse).toHaveBeenCalledWith(fullQuery);
    });

    it("should return nextCursor from repository", async () => {
      const customCursor = "custom-cursor-456";
      mockProductRepository.browse.mockResolvedValue({ products: mockProducts, nextCursor: customCursor });
      setupMapperMock();

      const result = await useCase.execute(mockQuery);

      expect(result.nextCursor).toBe(customCursor);
    });

    it("should return null nextCursor when no more products", async () => {
      mockProductRepository.browse.mockResolvedValue({ products: mockProducts, nextCursor: null });
      setupMapperMock();

      const result = await useCase.execute(mockQuery);

      expect(result.nextCursor).toBeNull();
    });
  });

  describe("ProductMapper interaction", () => {
    it("should call toSummaryView for each product", async () => {
      setupMapperMock();
      await useCase.execute(mockQuery);

      expect(ProductMapper.toSummaryView).toHaveBeenCalledTimes(3);
      expect(ProductMapper.toSummaryView).toHaveBeenCalledWith(mockProduct1);
      expect(ProductMapper.toSummaryView).toHaveBeenCalledWith(mockProduct2);
      expect(ProductMapper.toSummaryView).toHaveBeenCalledWith(mockProduct3);
    });

    it("should return the mapped summary views", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockQuery);

      expect(result.products).toEqual(mockSummaryViews);
    });

    it("should handle mapper returning null for a product", async () => {
      (ProductMapper.toSummaryView as jest.Mock)
        .mockReset()
        .mockReturnValueOnce(mockSummaryView1)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockSummaryView3);

      const result = await useCase.execute(mockQuery);

      expect(result.products).toHaveLength(3);
      expect(result.products[0]).toEqual(mockSummaryView1);
      expect(result.products[1]).toBeNull();
      expect(result.products[2]).toEqual(mockSummaryView3);
    });

    it("should handle mapper throwing error", async () => {
      const mapperError = new Error("Mapper error");
      (ProductMapper.toSummaryView as jest.Mock)
        .mockReset()
        .mockImplementationOnce(() => {
          throw mapperError;
        })
        .mockImplementationOnce(() => mockSummaryView2)
        .mockImplementationOnce(() => mockSummaryView3);

      await expect(useCase.execute(mockQuery)).rejects.toThrow(mapperError);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message without keyword", async () => {
      await useCase.execute(mockQuery);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "BrowseProductsUseCase",
        event: "BROWSE_PRODUCTS_STARTED",
        message: "Products are being retrieved",
      });
    });

    it("should log successful browse with duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockQuery);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "BrowseProductsUseCase",
        event: "BROWSE_PRODUCTS_SUCCESSFUL",
        message: "Products retrieved successfully",
        durationMs: 150,
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful browse with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockQuery);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "BrowseProductsUseCase",
        event: "BROWSE_PRODUCTS_SUCCESSFUL",
        message: "Products retrieved successfully",
        durationMs: 250,
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when repository error occurs", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.browse.mockRejectedValue(repoError);

      await expect(useCase.execute(mockQuery)).rejects.toThrow(repoError);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle logger debug throwing error", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(useCase.execute(mockQuery)).rejects.toThrow("Logger error");
    });

    it("should handle logger info throwing error", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(useCase.execute(mockQuery)).rejects.toThrow("Logger error");
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
            getCategoryId: jest.fn().mockReturnValue("cat-1"),
          }) as unknown as Product,
      );

      mockProductRepository.browse.mockResolvedValue({ products: largeProductSet, nextCursor: null });

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((product) => ({
        id: product.getId(),
        categoryId: product.getCategoryId(),
        name: product.getName(),
        price: 10000 + parseInt(product.getId().split("-")[1]) * 1000,
        status: ProductStatus.AVAILABLE,
        primaryImageUrl: "",
      }));

      const result = await useCase.execute(mockQuery);

      expect(result.products).toHaveLength(100);
      expect(result.products[0].id).toBe("prod-0");
      expect(result.products[99].id).toBe("prod-99");
      expect(result.nextCursor).toBeNull();
    });

    it("should handle multiple browses with different queries", async () => {
      const queries = [
        { categoryId: "cat-1" },
        { type: ProductType.FOOD },
        { status: ProductStatus.AVAILABLE },
        { minPrice: 10000, maxPrice: 50000 },
      ];

      for (const query of queries) {
        mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
        (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

        const result = await useCase.execute(query);
        expect(result.products).toHaveLength(1);
        expect(mockProductRepository.browse).toHaveBeenCalledWith(query);
      }
    });

    it("should handle browse with no results multiple times", async () => {
      mockProductRepository.browse.mockResolvedValue({ products: [], nextCursor: null });

      const firstResult = await useCase.execute(mockQuery);
      const secondResult = await useCase.execute(mockQuery);

      expect(firstResult.products).toEqual([]);
      expect(firstResult.nextCursor).toBeNull();
      expect(secondResult.products).toEqual([]);
      expect(secondResult.nextCursor).toBeNull();
      expect(mockProductRepository.browse).toHaveBeenCalledTimes(2);
    });

    it("should handle pagination with limit", async () => {
      const paginatedQuery: BrowseProductsCommand = {
        limit: 5,
      };

      const paginatedProducts = mockProducts.slice(0, 2);
      mockProductRepository.browse.mockResolvedValue({ products: paginatedProducts, nextCursor: "next-page-cursor" });
      setupMapperMock();

      const result = await useCase.execute(paginatedQuery);

      expect(result.products).toHaveLength(2);
      expect(result.nextCursor).toBe("next-page-cursor");
      expect(mockProductRepository.browse).toHaveBeenCalledWith(paginatedQuery);
    });

    it("should handle sorting by different fields", async () => {
      const sortFields = [ProductSort.NAME_ASC, ProductSort.NAME_DESC, ProductSort.PRICE_ASC, ProductSort.PRICE_DESC];

      for (const sort of sortFields) {
        const sortQuery: BrowseProductsCommand = {
          sort,
        };

        mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
        (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

        await useCase.execute(sortQuery);
        expect(mockProductRepository.browse).toHaveBeenCalledWith(sortQuery);
      }
    });

    it("should handle price range with only minPrice", async () => {
      const queryWithMinPrice: BrowseProductsCommand = {
        minPrice: 10000,
      };

      mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(queryWithMinPrice);
      expect(mockProductRepository.browse).toHaveBeenCalledWith(queryWithMinPrice);
    });

    it("should handle price range with only maxPrice", async () => {
      const queryWithMaxPrice: BrowseProductsCommand = {
        maxPrice: 50000,
      };

      mockProductRepository.browse.mockResolvedValue({ products: [mockProduct1], nextCursor: null });
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(queryWithMaxPrice);
      expect(mockProductRepository.browse).toHaveBeenCalledWith(queryWithMaxPrice);
    });

    it("should handle products with cursor-based pagination", async () => {
      const cursorQuery: BrowseProductsCommand = {
        cursor: "cursor-abc-123",
        limit: 10,
      };

      const expectedProducts = [mockProduct2, mockProduct3];
      mockProductRepository.browse.mockResolvedValue({ products: expectedProducts, nextCursor: "next-cursor-xyz" });
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView2).mockReturnValueOnce(mockSummaryView3);

      const result = await useCase.execute(cursorQuery);

      expect(result.products).toHaveLength(2);
      expect(result.products[0].id).toBe("prod-2");
      expect(result.products[1].id).toBe("prod-3");
      expect(result.nextCursor).toBe("next-cursor-xyz");
      expect(mockProductRepository.browse).toHaveBeenCalledWith(cursorQuery);
    });
  });

  describe("return value verification", () => {
    it("should return BrowseProductsResult with correct structure", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockQuery);

      expect(result).toHaveProperty("products");
      expect(result).toHaveProperty("nextCursor");
      expect(Array.isArray(result.products)).toBe(true);
    });

    it("should return products as ProductSummaryView array", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockQuery);

      expect(result.products[0]).toHaveProperty("id");
      expect(result.products[0]).toHaveProperty("categoryId");
      expect(result.products[0]).toHaveProperty("name");
      expect(result.products[0]).toHaveProperty("price");
      expect(result.products[0]).toHaveProperty("status");
      expect(result.products[0]).toHaveProperty("primaryImageUrl");
    });

    it("should return correct data types", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockQuery);

      expect(typeof result.products[0].id).toBe("string");
      expect(typeof result.products[0].categoryId).toBe("string");
      expect(typeof result.products[0].name).toBe("string");
      expect(typeof result.products[0].price).toBe("number");
      expect(typeof result.products[0].status).toBe("string");
      expect(typeof result.products[0].primaryImageUrl).toBe("string");
      expect(result.nextCursor === null || typeof result.nextCursor === "string").toBe(true);
    });

    it("should maintain order of products", async () => {
      const orderedProducts = [
        { ...mockProduct1, getId: jest.fn().mockReturnValue("first") },
        { ...mockProduct2, getId: jest.fn().mockReturnValue("second") },
        { ...mockProduct3, getId: jest.fn().mockReturnValue("third") },
      ];

      mockProductRepository.browse.mockResolvedValue({ products: orderedProducts as unknown as Product[], nextCursor: null });

      (ProductMapper.toSummaryView as jest.Mock)
        .mockReset()
        .mockReturnValueOnce({ ...mockSummaryView1, id: "first" })
        .mockReturnValueOnce({ ...mockSummaryView2, id: "second" })
        .mockReturnValueOnce({ ...mockSummaryView3, id: "third" });

      const result = await useCase.execute(mockQuery);

      expect(result.products[0].id).toBe("first");
      expect(result.products[1].id).toBe("second");
      expect(result.products[2].id).toBe("third");
    });
  });

  describe("error handling scenarios", () => {
    it("should handle repository timeout error", async () => {
      const timeoutError = new Error("Timeout error");
      mockProductRepository.browse.mockRejectedValue(timeoutError);

      await expect(useCase.execute(mockQuery)).rejects.toThrow("Timeout error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository connection error", async () => {
      const connectionError = new Error("Database connection error");
      mockProductRepository.browse.mockRejectedValue(connectionError);

      await expect(useCase.execute(mockQuery)).rejects.toThrow("Database connection error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle invalid query parameters gracefully", async () => {
      const invalidQuery: BrowseProductsCommand = {
        minPrice: 100000,
        maxPrice: 5000,
      };

      mockProductRepository.browse.mockResolvedValue({ products: [], nextCursor: null });

      await useCase.execute(invalidQuery);
      expect(mockProductRepository.browse).toHaveBeenCalledWith(invalidQuery);
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
        getCategoryId: jest.fn().mockReturnValue(null),
      } as unknown as Product;

      mockProductRepository.browse.mockResolvedValue({ products: [productWithNullValues], nextCursor: null });

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce({
        id: null,
        categoryId: null,
        name: null,
        price: null,
        status: null,
        primaryImageUrl: "",
      });

      const result = await useCase.execute(mockQuery);
      expect(result.products[0].id).toBeNull();
      expect(result.products[0].categoryId).toBeNull();
      expect(result.products[0].name).toBeNull();
      expect(result.products[0].price).toBeNull();
      expect(result.products[0].status).toBeNull();
    });

    it("should handle repository returning empty array", async () => {
      mockProductRepository.browse.mockResolvedValue({ products: [], nextCursor: null });

      const result = await useCase.execute(mockQuery);
      expect(result.products).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle products with different statuses", async () => {
      const statuses = [ProductStatus.UPCOMING, ProductStatus.AVAILABLE, ProductStatus.UNAVAILABLE, ProductStatus.DISCONTINUED];

      const productsWithStatuses = statuses.map((status, index) => ({
        ...mockProduct1,
        getId: jest.fn().mockReturnValue(`prod-${index}`),
        getStatus: jest.fn().mockReturnValue(status),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      }));

      mockProductRepository.browse.mockResolvedValue({ products: productsWithStatuses as unknown as Product[], nextCursor: null });

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((product) => ({
        id: product.getId(),
        categoryId: product.getCategoryId(),
        name: product.getName(),
        price: 50000,
        status: product.getStatus(),
        primaryImageUrl: "",
      }));

      const result = await useCase.execute(mockQuery);

      statuses.forEach((status, index) => {
        expect(result.products[index].status).toBe(status);
      });
    });

    it("should handle products with different types", async () => {
      const types = [ProductType.FOOD, ProductType.DRINK, ProductType.PACKAGED];

      const productsWithTypes = types.map((type, index) => ({
        ...mockProduct1,
        getId: jest.fn().mockReturnValue(`prod-${index}`),
        getType: jest.fn().mockReturnValue(type),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      }));

      mockProductRepository.browse.mockResolvedValue({ products: productsWithTypes as unknown as Product[], nextCursor: null });

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((product) => ({
        id: product.getId(),
        categoryId: product.getCategoryId(),
        name: product.getName(),
        price: 50000,
        status: ProductStatus.AVAILABLE,
        primaryImageUrl: "",
      }));

      const result = await useCase.execute(mockQuery);

      expect(result.products).toHaveLength(3);
      expect(result.products[0].id).toBe("prod-0");
      expect(result.products[1].id).toBe("prod-1");
      expect(result.products[2].id).toBe("prod-2");
    });

    it("should handle products with primaryImageUrl from mapper", async () => {
      const productWithImage = {
        ...mockProduct1,
        getImages: jest.fn().mockReturnValue([mockImages[0]]),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      };

      mockProductRepository.browse.mockResolvedValue({ products: [productWithImage as unknown as Product], nextCursor: null });

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce({
        id: "prod-1",
        categoryId: "cat-1",
        name: "Test Product 1",
        price: 50000,
        status: ProductStatus.AVAILABLE,
        primaryImageUrl: "https://example.com/image1.jpg",
      });

      const result = await useCase.execute(mockQuery);

      expect(result.products[0].primaryImageUrl).toBe("https://example.com/image1.jpg");
    });

    it("should handle products with empty primaryImageUrl", async () => {
      const productWithoutImage = {
        ...mockProduct1,
        getImages: jest.fn().mockReturnValue([]),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      };

      mockProductRepository.browse.mockResolvedValue({ products: [productWithoutImage as unknown as Product], nextCursor: null });

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce({
        id: "prod-1",
        categoryId: "cat-1",
        name: "Test Product 1",
        price: 50000,
        status: ProductStatus.AVAILABLE,
        primaryImageUrl: "",
      });

      const result = await useCase.execute(mockQuery);

      expect(result.products[0].primaryImageUrl).toBe("");
    });
  });

  describe("TODO: cache implementation", () => {
    it("should have TODO comment for cache", () => {
      const sourceCode = BrowseProductsUseCase.toString();
      expect(sourceCode).toContain("TODO: add cache");
    });
  });
});
