import { SearchProductsUseCase } from "@/application/use-cases/product/search-products.use-case";
import { SearchProductsCommand } from "@/application/ports/driving/search-products.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { ProductMapper } from "@/application/mappers/product.mapper";
import { Product } from "@/domain/entities/product.entity";
import { ProductImage } from "@/domain/value-objects/product-image.vo";
import { ProductSummaryView } from "@/application/types/product.type";
import { ProductStatus, ProductType } from "@/domain/types/product.type";

jest.mock("@/application/mappers/product.mapper");

describe("SearchProductsUseCase", () => {
  let useCase: SearchProductsUseCase;
  let mockProductRepository: jest.Mocked<ProductRepositoryPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  const mockKeyword = "test";
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
    getType: jest.fn().mockReturnValue(ProductType.FOOD),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue(mockImages),
    getCategoryId: jest.fn().mockReturnValue("cat-1"),
  } as unknown as jest.Mocked<Product>;

  const mockProduct2 = {
    getId: jest.fn().mockReturnValue("prod-2"),
    getName: jest.fn().mockReturnValue("Test Product 2"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(30000) }),
    getType: jest.fn().mockReturnValue(ProductType.DRINK),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue([]),
    getCategoryId: jest.fn().mockReturnValue("cat-1"),
  } as unknown as jest.Mocked<Product>;

  const mockProduct3 = {
    getId: jest.fn().mockReturnValue("prod-3"),
    getName: jest.fn().mockReturnValue("Another Product"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(45000) }),
    getType: jest.fn().mockReturnValue(ProductType.PACKAGED),
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
    price: 30000,
    status: ProductStatus.AVAILABLE,
    primaryImageUrl: "",
  };

  const mockSummaryView3: ProductSummaryView = {
    id: "prod-3",
    categoryId: "cat-2",
    name: "Another Product",
    price: 45000,
    status: ProductStatus.UNAVAILABLE,
    primaryImageUrl: "https://example.com/image1.jpg",
  };

  const mockSummaryViews = [mockSummaryView1, mockSummaryView2, mockSummaryView3];

  const mockCommand: SearchProductsCommand = {
    keyword: mockKeyword,
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

    mockProductRepository.search.mockResolvedValue(mockProducts);
    setupMapperMock();

    useCase = new SearchProductsUseCase(mockProductRepository, mockLogger);
  });

  describe("execute", () => {
    it("should successfully search products with keyword", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.didYouMean).toBeUndefined();
      expect(mockProductRepository.search).toHaveBeenCalledWith(mockKeyword);
    });

    it("should return empty products array and total 0 when no products found", async () => {
      mockProductRepository.search.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);

      expect(result.products).toEqual([]);
      expect(result.products).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.didYouMean).toBeUndefined();
    });

    it("should log debug message when starting", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "SearchProductsUseCase",
        event: "SEARCH_PRODUCTS_STARTED",
        message: "Product is being retrieved",
        data: { keyword: mockKeyword },
      });
    });

    it("should log info message when successful", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "SearchProductsUseCase",
        event: "SEARCH_PRODUCTS_SUCCESSFUL",
        message: "Product retrieved successfully",
        durationMs: 100,
      });

      dateNowSpy.mockRestore();
    });

    it("should handle repository error", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.search.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should call search with correct parameters", async () => {
      await useCase.execute(mockCommand);

      expect(mockProductRepository.search).toHaveBeenCalledWith(mockKeyword);
    });

    it("should handle empty keyword", async () => {
      const commandWithEmptyKeyword: SearchProductsCommand = {
        keyword: "",
      };

      mockProductRepository.search.mockResolvedValue([]);

      await useCase.execute(commandWithEmptyKeyword);

      expect(mockProductRepository.search).toHaveBeenCalledWith("");
    });

    it("should handle keyword with special characters", async () => {
      const commandWithSpecialChars: SearchProductsCommand = {
        keyword: "test!@#$%^&*()",
      };

      mockProductRepository.search.mockResolvedValue([mockProduct1]);
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(commandWithSpecialChars);

      expect(mockProductRepository.search).toHaveBeenCalledWith("test!@#$%^&*()");
    });

    it("should handle keyword with spaces", async () => {
      const commandWithSpaces: SearchProductsCommand = {
        keyword: "test product search",
      };

      mockProductRepository.search.mockResolvedValue([mockProduct1]);
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

      await useCase.execute(commandWithSpaces);

      expect(mockProductRepository.search).toHaveBeenCalledWith("test product search");
    });

    it("should return correct total count", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result.total).toBe(3);
    });

    it("should return total count matching products array length", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result.products.length).toBe(result.total);
    });

    it("should return total 0 when empty result", async () => {
      mockProductRepository.search.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);

      expect(result.total).toBe(0);
      expect(result.products.length).toBe(0);
    });
  });

  describe("ProductMapper interaction", () => {
    it("should call toSummaryView for each product", async () => {
      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(ProductMapper.toSummaryView).toHaveBeenCalledTimes(3);
      expect(ProductMapper.toSummaryView).toHaveBeenCalledWith(mockProduct1);
      expect(ProductMapper.toSummaryView).toHaveBeenCalledWith(mockProduct2);
      expect(ProductMapper.toSummaryView).toHaveBeenCalledWith(mockProduct3);
    });

    it("should return the mapped summary views", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result.products).toEqual(mockSummaryViews);
    });

    it("should handle mapper returning null for a product", async () => {
      (ProductMapper.toSummaryView as jest.Mock)
        .mockReset()
        .mockReturnValueOnce(mockSummaryView1)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockSummaryView3);

      const result = await useCase.execute(mockCommand);

      expect(result.products).toHaveLength(3);
      expect(result.products[0]).toEqual(mockSummaryView1);
      expect(result.products[1]).toBeNull();
      expect(result.products[2]).toEqual(mockSummaryView3);
      expect(result.total).toBe(3);
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

      await expect(useCase.execute(mockCommand)).rejects.toThrow(mapperError);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with keyword", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "SearchProductsUseCase",
        event: "SEARCH_PRODUCTS_STARTED",
        message: "Product is being retrieved",
        data: { keyword: mockKeyword },
      });
    });

    it("should log debug message with empty keyword", async () => {
      const commandWithEmptyKeyword: SearchProductsCommand = {
        keyword: "",
      };

      mockProductRepository.search.mockResolvedValue([]);

      await useCase.execute(commandWithEmptyKeyword);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "SearchProductsUseCase",
        event: "SEARCH_PRODUCTS_STARTED",
        message: "Product is being retrieved",
        data: { keyword: "" },
      });
    });

    it("should log successful search with duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "SearchProductsUseCase",
        event: "SEARCH_PRODUCTS_SUCCESSFUL",
        message: "Product retrieved successfully",
        durationMs: 150,
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful search with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "SearchProductsUseCase",
        event: "SEARCH_PRODUCTS_SUCCESSFUL",
        message: "Product retrieved successfully",
        durationMs: 250,
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when repository error occurs", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.search.mockRejectedValue(repoError);

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
            getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(10 + i) }),
            getImages: jest.fn().mockReturnValue([]),
            getCategoryId: jest.fn().mockReturnValue("cat-1"),
          }) as unknown as Product,
      );

      mockProductRepository.search.mockResolvedValue(largeProductSet);

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((product) => ({
        id: product.getId(),
        categoryId: product.getCategoryId(),
        name: product.getName(),
        price: 10 + parseInt(product.getId().split("-")[1]),
        status: ProductStatus.AVAILABLE,
        primaryImageUrl: "",
      }));

      const result = await useCase.execute(mockCommand);

      expect(result.products).toHaveLength(100);
      expect(result.products[0].id).toBe("prod-0");
      expect(result.products[99].id).toBe("prod-99");
      expect(result.total).toBe(100);
    });

    it("should handle multiple searches with different keywords", async () => {
      const keywords = ["apple", "banana", "orange"];

      for (const keyword of keywords) {
        mockProductRepository.search.mockResolvedValue([mockProduct1]);
        (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

        const command: SearchProductsCommand = { keyword };
        await useCase.execute(command);
        expect(mockProductRepository.search).toHaveBeenCalledWith(keyword);
      }
    });

    it("should handle search with no results multiple times", async () => {
      mockProductRepository.search.mockResolvedValue([]);

      const firstResult = await useCase.execute(mockCommand);
      const secondResult = await useCase.execute(mockCommand);

      expect(firstResult.products).toEqual([]);
      expect(firstResult.total).toBe(0);
      expect(secondResult.products).toEqual([]);
      expect(secondResult.total).toBe(0);
      expect(mockProductRepository.search).toHaveBeenCalledTimes(2);
    });

    it("should handle products with null name", async () => {
      const productWithNullName = {
        ...mockProduct1,
        getName: jest.fn().mockReturnValue(null),
        getImages: jest.fn().mockReturnValue([]),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      };

      mockProductRepository.search.mockResolvedValue([productWithNullName] as unknown as Product[]);

      const summaryWithNullName = {
        ...mockSummaryView1,
        name: null,
      };
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithNullName);

      const result = await useCase.execute(mockCommand);

      expect(result.products[0].name).toBeNull();
      expect(result.total).toBe(1);
    });

    it("should handle products with empty images array", async () => {
      const productWithEmptyImages = {
        ...mockProduct1,
        getImages: jest.fn().mockReturnValue([]),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      };

      mockProductRepository.search.mockResolvedValue([productWithEmptyImages] as unknown as Product[]);

      const summaryWithEmptyImage = {
        ...mockSummaryView1,
        primaryImageUrl: "",
      };
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithEmptyImage);

      const result = await useCase.execute(mockCommand);

      expect(result.products[0].primaryImageUrl).toBe("");
      expect(result.total).toBe(1);
    });

    it("should handle products with different statuses", async () => {
      const statuses = [ProductStatus.UPCOMING, ProductStatus.AVAILABLE, ProductStatus.UNAVAILABLE, ProductStatus.DISCONTINUED];

      const productsWithStatuses = statuses.map((status, index) => ({
        ...mockProduct1,
        getId: jest.fn().mockReturnValue(`prod-${index}`),
        getStatus: jest.fn().mockReturnValue(status),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      }));

      mockProductRepository.search.mockResolvedValue(productsWithStatuses as unknown as Product[]);

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((product) => ({
        id: product.getId(),
        categoryId: product.getCategoryId(),
        name: product.getName(),
        price: 50000,
        status: product.getStatus(),
        primaryImageUrl: "",
      }));

      const result = await useCase.execute(mockCommand);

      statuses.forEach((status, index) => {
        expect(result.products[index].status).toBe(status);
      });
      expect(result.total).toBe(4);
    });

    it("should handle products with different types", async () => {
      const types = [ProductType.FOOD, ProductType.DRINK, ProductType.PACKAGED];

      const productsWithTypes = types.map((type, index) => ({
        ...mockProduct1,
        getId: jest.fn().mockReturnValue(`prod-${index}`),
        getType: jest.fn().mockReturnValue(type),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      }));

      mockProductRepository.search.mockResolvedValue(productsWithTypes as unknown as Product[]);

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((product) => ({
        id: product.getId(),
        categoryId: product.getCategoryId(),
        name: product.getName(),
        price: 50000,
        status: ProductStatus.AVAILABLE,
        primaryImageUrl: "",
      }));

      const result = await useCase.execute(mockCommand);

      expect(result.products).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("should handle products with different prices", async () => {
      const prices = [10000, 20000, 30000, 40000, 50000];

      const productsWithPrices = prices.map((price, index) => ({
        ...mockProduct1,
        getId: jest.fn().mockReturnValue(`prod-${index}`),
        getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(price) }),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      }));

      mockProductRepository.search.mockResolvedValue(productsWithPrices as unknown as Product[]);

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((product) => ({
        id: product.getId(),
        categoryId: product.getCategoryId(),
        name: product.getName(),
        price: product.getPrice().getAmount(),
        status: ProductStatus.AVAILABLE,
        primaryImageUrl: "",
      }));

      const result = await useCase.execute(mockCommand);

      prices.forEach((price, index) => {
        expect(result.products[index].price).toBe(price);
      });
      expect(result.total).toBe(5);
    });
  });

  describe("return value verification", () => {
    it("should return SearchProductsResult with correct structure", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result).toHaveProperty("products");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("didYouMean");
      expect(Array.isArray(result.products)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("should return products as ProductSummaryView array", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result.products[0]).toHaveProperty("id");
      expect(result.products[0]).toHaveProperty("categoryId");
      expect(result.products[0]).toHaveProperty("name");
      expect(result.products[0]).toHaveProperty("price");
      expect(result.products[0]).toHaveProperty("status");
      expect(result.products[0]).toHaveProperty("primaryImageUrl");
    });

    it("should return correct data types", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(typeof result.products[0].id).toBe("string");
      expect(typeof result.products[0].categoryId).toBe("string");
      expect(typeof result.products[0].name).toBe("string");
      expect(typeof result.products[0].price).toBe("number");
      expect(typeof result.products[0].status).toBe("string");
      expect(typeof result.products[0].primaryImageUrl).toBe("string");
      expect(typeof result.total).toBe("number");
      expect(result.didYouMean === undefined || typeof result.didYouMean === "string").toBe(true);
    });

    it("should maintain order of products", async () => {
      const orderedProducts = [
        { ...mockProduct1, getId: jest.fn().mockReturnValue("first") },
        { ...mockProduct2, getId: jest.fn().mockReturnValue("second") },
        { ...mockProduct3, getId: jest.fn().mockReturnValue("third") },
      ];

      mockProductRepository.search.mockResolvedValue(orderedProducts as unknown as Product[]);

      (ProductMapper.toSummaryView as jest.Mock)
        .mockReset()
        .mockReturnValueOnce({ ...mockSummaryView1, id: "first" })
        .mockReturnValueOnce({ ...mockSummaryView2, id: "second" })
        .mockReturnValueOnce({ ...mockSummaryView3, id: "third" });

      const result = await useCase.execute(mockCommand);

      expect(result.products[0].id).toBe("first");
      expect(result.products[1].id).toBe("second");
      expect(result.products[2].id).toBe("third");
      expect(result.total).toBe(3);
    });

    it("should have didYouMean as undefined (TODO)", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result.didYouMean).toBeUndefined();
    });
  });

  describe("error handling scenarios", () => {
    it("should handle repository timeout error", async () => {
      const timeoutError = new Error("Timeout error");
      mockProductRepository.search.mockRejectedValue(timeoutError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Timeout error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository connection error", async () => {
      const connectionError = new Error("Database connection error");
      mockProductRepository.search.mockRejectedValue(connectionError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Database connection error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle empty keyword gracefully", async () => {
      const commandWithEmptyKeyword: SearchProductsCommand = {
        keyword: "",
      };

      mockProductRepository.search.mockResolvedValue([]);

      const result = await useCase.execute(commandWithEmptyKeyword);
      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should handle null values from repository", async () => {
      const productWithNullValues = {
        getId: jest.fn().mockReturnValue(null),
        getName: jest.fn().mockReturnValue(null),
        getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(null) }),
        getType: jest.fn().mockReturnValue(null),
        getStatus: jest.fn().mockReturnValue(null),
        getImages: jest.fn().mockReturnValue([]),
        getCategoryId: jest.fn().mockReturnValue(null),
      } as unknown as Product;

      mockProductRepository.search.mockResolvedValue([productWithNullValues]);

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce({
        id: null,
        categoryId: null,
        name: null,
        price: null,
        status: null,
        primaryImageUrl: "",
      });

      const result = await useCase.execute(mockCommand);
      expect(result.products[0].id).toBeNull();
      expect(result.products[0].categoryId).toBeNull();
      expect(result.products[0].name).toBeNull();
      expect(result.products[0].price).toBeNull();
      expect(result.products[0].status).toBeNull();
      expect(result.total).toBe(1);
    });

    it("should handle repository returning empty array", async () => {
      mockProductRepository.search.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);
      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle products with primaryImageUrl from mapper", async () => {
      const productWithImage = {
        ...mockProduct1,
        getImages: jest.fn().mockReturnValue([mockImages[0]]),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      };

      mockProductRepository.search.mockResolvedValue([productWithImage as unknown as Product]);

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce({
        id: "prod-1",
        categoryId: "cat-1",
        name: "Test Product 1",
        price: 50000,
        status: ProductStatus.AVAILABLE,
        primaryImageUrl: "https://example.com/image1.jpg",
      });

      const result = await useCase.execute(mockCommand);

      expect(result.products[0].primaryImageUrl).toBe("https://example.com/image1.jpg");
      expect(result.total).toBe(1);
    });

    it("should handle products with empty primaryImageUrl", async () => {
      const productWithoutImage = {
        ...mockProduct1,
        getImages: jest.fn().mockReturnValue([]),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      };

      mockProductRepository.search.mockResolvedValue([productWithoutImage as unknown as Product]);

      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce({
        id: "prod-1",
        categoryId: "cat-1",
        name: "Test Product 1",
        price: 50000,
        status: ProductStatus.AVAILABLE,
        primaryImageUrl: "",
      });

      const result = await useCase.execute(mockCommand);

      expect(result.products[0].primaryImageUrl).toBe("");
      expect(result.total).toBe(1);
    });

    it("should handle ProductMapper returning undefined", async () => {
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(undefined);

      const result = await useCase.execute(mockCommand);

      expect(result.products[0]).toBeUndefined();
      expect(result.total).toBe(3);
    });

    it("should handle products with special characters in name", async () => {
      const specialName = "Product!@#$%^&*()";
      const productWithSpecialName = {
        ...mockProduct1,
        getName: jest.fn().mockReturnValue(specialName),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      };

      mockProductRepository.search.mockResolvedValue([productWithSpecialName] as unknown as Product[]);

      const summaryWithSpecialName = {
        ...mockSummaryView1,
        name: specialName,
      };
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithSpecialName);

      const result = await useCase.execute(mockCommand);

      expect(result.products[0].name).toBe(specialName);
      expect(result.total).toBe(1);
    });

    it("should handle products with Unicode characters in name", async () => {
      const unicodeName = "🚀 Product with emoji 🎉";
      const productWithUnicode = {
        ...mockProduct1,
        getName: jest.fn().mockReturnValue(unicodeName),
        getCategoryId: jest.fn().mockReturnValue("cat-1"),
      };

      mockProductRepository.search.mockResolvedValue([productWithUnicode] as unknown as Product[]);

      const summaryWithUnicode = {
        ...mockSummaryView1,
        name: unicodeName,
      };
      (ProductMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithUnicode);

      const result = await useCase.execute(mockCommand);

      expect(result.products[0].name).toBe(unicodeName);
      expect(result.total).toBe(1);
    });
  });

  describe("TODO: didYouMean implementation", () => {
    it("should have TODO comment for didYouMean", () => {
      const sourceCode = SearchProductsUseCase.toString();
      expect(sourceCode).toContain("TODO");
    });
  });
});
