import { GetProductDetailsUseCase } from "@/application/use-cases/product/get-product-details.use-case";
import { GetProductDetailsCommand, GetProductDetailsResult } from "@/application/ports/driving/get-product-details.use-case";
import { Logger } from "@/application/ports/driven/logger";
import { ProductDetail, ProductRepository } from "@/application/ports/driven/product.repository";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { Product } from "@/domain/entities/product.entity";
import { PRODUCT_EXCEPTIONS } from "@/application/exceptions/product.exceptions";
import { ProductMapper } from "@/application/mappers/product.mapper";
import { ProductType } from "@/domain/types/product-type.enum";
import { ProductStatus } from "@/domain/types/product-status.enum";
import { ProductCategoryStatus } from "@/domain/types/product-category-status.enum";
import { ProductImage } from "@/domain/value-objects/product-image.vo";
import { ProductDetailsView } from "@/application/types/product.type";

jest.mock("@/application/mappers/product.mapper");

describe("GetProductDetailsUseCase", () => {
  let useCase: GetProductDetailsUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockLogger: jest.Mocked<Logger>;

  const mockProductId = "prod-789";
  const mockCategoryId = "cat-456";
  const mockStartTime = 1000;

  const mockImages: ProductImage[] = [
    {
      getProductId: jest.fn().mockReturnValue(mockProductId),
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
      getProductId: jest.fn().mockReturnValue(mockProductId),
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

  const mockProduct = {
    getId: jest.fn().mockReturnValue(mockProductId),
    getCategoryId: jest.fn().mockReturnValue(mockCategoryId),
    getName: jest.fn().mockReturnValue("Test Product"),
    getDescription: jest.fn().mockReturnValue("Test Description"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(50000) }),
    getType: jest.fn().mockReturnValue(ProductType.FOOD),
    getIngredients: jest.fn().mockReturnValue("Ingredient 1, Ingredient 2"),
    getPreparationTimeInMinutes: jest.fn().mockReturnValue(15),
    getStockQuantity: jest.fn().mockReturnValue(100),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue(mockImages),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
  } as unknown as jest.Mocked<Product>;

  const mockProductCategory = {
    getId: jest.fn().mockReturnValue(mockCategoryId),
    getName: jest.fn().mockReturnValue("Test Category"),
    getDescription: jest.fn().mockReturnValue("Category Description"),
    getImageUrl: jest.fn().mockReturnValue("https://example.com/category.jpg"),
    getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
    getSortOrder: jest.fn().mockReturnValue(1),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
    isCurrentlyActive: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<ProductCategory>;

  const mockProductDetail = {
    product: mockProduct,
    productCategory: mockProductCategory,
  };

  const mockDetailView: ProductDetailsView = {
    id: mockProductId,
    category: {
      id: mockCategoryId,
      name: "Test Category",
      description: "Category Description",
      imageUrl: "https://example.com/category.jpg",
    },
    name: "Test Product",
    price: 50000,
    description: "Test Description",
    type: ProductType.FOOD,
    ingredients: "Ingredient 1, Ingredient 2",
    preparationTimeInMinutes: 15,
    stockQuantity: 100,
    status: ProductStatus.AVAILABLE,
    images: [
      {
        url: "https://example.com/image1.jpg",
        altText: "Image 1",
        isPrimary: true,
        sortOrder: 1,
      },
      {
        url: "https://example.com/image2.jpg",
        altText: "Image 2",
        isPrimary: false,
        sortOrder: 2,
      },
    ],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockCommand: GetProductDetailsCommand = {
    id: mockProductId,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductRepository = {
      findById: jest.fn(),
      findDetailById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      browse: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockProductRepository.findDetailById.mockResolvedValue(mockProductDetail);
    (ProductMapper.toDetailView as jest.Mock).mockReturnValue(mockDetailView);

    useCase = new GetProductDetailsUseCase(mockProductRepository, mockLogger);
  });

  describe("execute", () => {
    it("should successfully retrieve product detail", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockProductId);
      expect(result.name).toBe("Test Product");
      expect(result.price).toBe(50000);
      expect(result.description).toBe("Test Description");
      expect(result.type).toBe(ProductType.FOOD);
      expect(result.ingredients).toBe("Ingredient 1, Ingredient 2");
      expect(result.preparationTimeInMinutes).toBe(15);
      expect(result.stockQuantity).toBe(100);
      expect(result.status).toBe(ProductStatus.AVAILABLE);
      expect(result.images).toHaveLength(2);
      expect(result.category).toBeDefined();
      expect(result.category.id).toBe(mockCategoryId);
      expect(result.category.name).toBe("Test Category");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("should log debug message when starting", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetProductDetailsUseCase",
        event: "GET_PRODUCT_DETAIL_STARTED",
        message: "Product is being retrieved",
        data: { productId: mockProductId },
      });
    });

    it("should log info message when successful", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductDetailsUseCase",
        event: "GET_PRODUCT_DETAIL_SUCCESSFUL",
        message: "Product retrieved successfully",
        durationMs: 100,
        data: { productId: mockProductId },
      });

      dateNowSpy.mockRestore();
    });

    it("should call findDetailById with correct product id", async () => {
      await useCase.execute(mockCommand);

      expect(mockProductRepository.findDetailById).toHaveBeenCalledWith(mockProductId);
    });

    it("should call ProductMapper.toDetailView with product and category", async () => {
      await useCase.execute(mockCommand);

      expect(ProductMapper.toDetailView).toHaveBeenCalledWith(mockProduct, mockProductCategory);
    });

    it("should throw error when product is not found", async () => {
      mockProductRepository.findDetailById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(ProductMapper.toDetailView).not.toHaveBeenCalled();
    });

    it("should handle repository error", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findDetailById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(ProductMapper.toDetailView).not.toHaveBeenCalled();
    });

    it("should return product with null description", async () => {
      const productWithNullDescription = {
        ...mockProduct,
        getDescription: jest.fn().mockReturnValue(null),
      };

      const mockDetailWithNullDescription = {
        product: productWithNullDescription,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithNullDescription as unknown as ProductDetail);

      const detailViewWithNullDescription = {
        ...mockDetailView,
        description: null,
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithNullDescription);

      const result = await useCase.execute(mockCommand);
      expect(result.description).toBeNull();
    });

    it("should return product with null ingredients", async () => {
      const productWithNullIngredients = {
        ...mockProduct,
        getIngredients: jest.fn().mockReturnValue(null),
      };

      const mockDetailWithNullIngredients = {
        product: productWithNullIngredients,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithNullIngredients as unknown as ProductDetail);

      const detailViewWithNullIngredients = {
        ...mockDetailView,
        ingredients: null,
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithNullIngredients);

      const result = await useCase.execute(mockCommand);
      expect(result.ingredients).toBeNull();
    });

    it("should return product with null preparationTimeInMinutes", async () => {
      const productWithNullPrepTime = {
        ...mockProduct,
        getPreparationTimeInMinutes: jest.fn().mockReturnValue(null),
      };

      const mockDetailWithNullPrepTime = {
        product: productWithNullPrepTime,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithNullPrepTime as unknown as ProductDetail);

      const detailViewWithNullPrepTime = {
        ...mockDetailView,
        preparationTimeInMinutes: null,
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithNullPrepTime);

      const result = await useCase.execute(mockCommand);
      expect(result.preparationTimeInMinutes).toBeNull();
    });

    it("should return product with empty images array", async () => {
      const productWithEmptyImages = {
        ...mockProduct,
        getImages: jest.fn().mockReturnValue([]),
      };

      const mockDetailWithEmptyImages = {
        product: productWithEmptyImages,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithEmptyImages as unknown as ProductDetail);

      const detailViewWithEmptyImages = {
        ...mockDetailView,
        images: [],
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithEmptyImages);

      const result = await useCase.execute(mockCommand);
      expect(result.images).toHaveLength(0);
    });
  });

  describe("ProductMapper interaction", () => {
    it("should call toDetailView with the found product and category", async () => {
      await useCase.execute(mockCommand);

      expect(ProductMapper.toDetailView).toHaveBeenCalledTimes(1);
      expect(ProductMapper.toDetailView).toHaveBeenCalledWith(mockProduct, mockProductCategory);
    });

    it("should return the result from ProductMapper", async () => {
      const customResult = {
        id: "custom-id",
        category: {
          id: "custom-cat-id",
          name: "Custom Category",
          description: "Custom Description",
          imageUrl: null,
        },
        name: "Custom Product",
        price: 10000,
        description: "Custom Description",
        type: ProductType.DRINK,
        ingredients: null,
        preparationTimeInMinutes: null,
        stockQuantity: 50,
        status: ProductStatus.AVAILABLE,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(customResult);

      const result = await useCase.execute(mockCommand);

      expect(result).toBe(customResult);
    });

    it("should handle ProductMapper throwing error", async () => {
      const mapperError = new Error("Mapper error");
      (ProductMapper.toDetailView as jest.Mock).mockImplementation(() => {
        throw mapperError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow(mapperError);
    });
  });

  describe("private method findProduct", () => {
    it("should find product successfully", async () => {
      await useCase.execute(mockCommand);
      expect(mockProductRepository.findDetailById).toHaveBeenCalledWith(mockProductId);
    });

    it("should throw PRODUCT_NOT_FOUND when product is null", async () => {
      mockProductRepository.findDetailById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
    });

    it("should propagate repository errors", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findDetailById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with productId", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetProductDetailsUseCase",
        event: "GET_PRODUCT_DETAIL_STARTED",
        message: "Product is being retrieved",
        data: { productId: mockProductId },
      });
    });

    it("should log successful retrieval with duration and productId", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductDetailsUseCase",
        event: "GET_PRODUCT_DETAIL_SUCCESSFUL",
        message: "Product retrieved successfully",
        durationMs: 150,
        data: { productId: mockProductId },
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful retrieval with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductDetailsUseCase",
        event: "GET_PRODUCT_DETAIL_SUCCESSFUL",
        message: "Product retrieved successfully",
        durationMs: 250,
        data: { productId: mockProductId },
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when product not found", async () => {
      mockProductRepository.findDetailById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should not log info when repository error occurs", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findDetailById.mockRejectedValue(repoError);

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
    it("should handle product with different statuses", async () => {
      const statuses = [ProductStatus.UPCOMING, ProductStatus.AVAILABLE, ProductStatus.UNAVAILABLE, ProductStatus.DISCONTINUED];

      for (const status of statuses) {
        const productWithStatus = {
          ...mockProduct,
          getStatus: jest.fn().mockReturnValue(status),
        };

        const mockDetailWithStatus = {
          product: productWithStatus,
          productCategory: mockProductCategory,
        };

        mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithStatus as unknown as ProductDetail);

        const detailViewWithStatus = {
          ...mockDetailView,
          status,
        };
        (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithStatus);

        const result = await useCase.execute(mockCommand);
        expect(result.status).toBe(status);
      }
    });

    it("should handle product with different types", async () => {
      const types = [ProductType.FOOD, ProductType.DRINK, ProductType.PACKAGED];

      for (const type of types) {
        const productWithType = {
          ...mockProduct,
          getType: jest.fn().mockReturnValue(type),
        };

        const mockDetailWithType = {
          product: productWithType,
          productCategory: mockProductCategory,
        };

        mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithType as unknown as ProductDetail);

        const detailViewWithType = {
          ...mockDetailView,
          type,
        };
        (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithType);

        const result = await useCase.execute(mockCommand);
        expect(result.type).toBe(type);
      }
    });

    it("should handle product with multiple images", async () => {
      const multipleImages: ProductImage[] = Array.from(
        { length: 5 },
        (_, i) =>
          ({
            getUrl: jest.fn().mockReturnValue(`https://example.com/image${i + 1}.jpg`),
            getAltText: jest.fn().mockReturnValue(`Image ${i + 1}`),
            getSortOrder: jest.fn().mockReturnValue(i + 1),
            isPrimaryImage: jest.fn().mockReturnValue(i === 0),
          }) as unknown as ProductImage,
      );

      const productWithMultipleImages = {
        ...mockProduct,
        getImages: jest.fn().mockReturnValue(multipleImages),
      };

      const mockDetailWithMultipleImages = {
        product: productWithMultipleImages,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithMultipleImages as unknown as ProductDetail);

      const detailViewWithMultipleImages = {
        ...mockDetailView,
        images: multipleImages.map((img) => ({
          url: img.getUrl(),
          altText: img.getAltText(),
          isPrimary: img.isPrimaryImage(),
          sortOrder: img.getSortOrder(),
        })),
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithMultipleImages);

      const result = await useCase.execute(mockCommand);
      expect(result.images).toHaveLength(5);
      expect(result.images[0].isPrimary).toBe(true);
      expect(result.images[1].isPrimary).toBe(false);
    });

    it("should handle product with price as integer", async () => {
      const productWithIntegerPrice = {
        ...mockProduct,
        getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(30000) }),
      };

      const mockDetailWithIntegerPrice = {
        product: productWithIntegerPrice,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithIntegerPrice as unknown as ProductDetail);

      const detailViewWithIntegerPrice = {
        ...mockDetailView,
        price: 30000,
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithIntegerPrice);

      const result = await useCase.execute(mockCommand);
      expect(result.price).toBe(30000);
    });

    it("should handle product with zero stock", async () => {
      const productWithZeroStock = {
        ...mockProduct,
        getStockQuantity: jest.fn().mockReturnValue(0),
      };

      const mockDetailWithZeroStock = {
        product: productWithZeroStock,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithZeroStock as unknown as ProductDetail);

      const detailViewWithZeroStock = {
        ...mockDetailView,
        stockQuantity: 0,
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithZeroStock);

      const result = await useCase.execute(mockCommand);
      expect(result.stockQuantity).toBe(0);
    });

    it("should handle product with very large stock quantity", async () => {
      const largeStock = Number.MAX_SAFE_INTEGER;
      const productWithLargeStock = {
        ...mockProduct,
        getStockQuantity: jest.fn().mockReturnValue(largeStock),
      };

      const mockDetailWithLargeStock = {
        product: productWithLargeStock,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithLargeStock as unknown as ProductDetail);

      const detailViewWithLargeStock = {
        ...mockDetailView,
        stockQuantity: largeStock,
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithLargeStock);

      const result = await useCase.execute(mockCommand);
      expect(result.stockQuantity).toBe(largeStock);
    });

    it("should handle multiple concurrent requests", async () => {
      const productIds = ["prod-1", "prod-2", "prod-3"];
      const expectedResults: GetProductDetailsResult[] = [];

      for (const id of productIds) {
        const mockProductForId = {
          ...mockProduct,
          getId: jest.fn().mockReturnValue(id),
          getName: jest.fn().mockReturnValue(`Product ${id}`),
        };

        const mockDetailForId = {
          product: mockProductForId,
          productCategory: mockProductCategory,
        };

        mockProductRepository.findDetailById.mockResolvedValue(mockDetailForId as unknown as ProductDetail);

        const detailViewForId = {
          ...mockDetailView,
          id,
          name: `Product ${id}`,
        };
        (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewForId);

        const result = await useCase.execute({ id });
        expectedResults.push(result);
      }

      expect(expectedResults).toHaveLength(3);
      expect(expectedResults[0].id).toBe("prod-1");
      expect(expectedResults[1].id).toBe("prod-2");
      expect(expectedResults[2].id).toBe("prod-3");
    });

    it("should handle category with null fields", async () => {
      const categoryWithNullFields = {
        ...mockProductCategory,
        getDescription: jest.fn().mockReturnValue(null),
        getImageUrl: jest.fn().mockReturnValue(null),
      };

      const mockDetailWithNullCategory = {
        product: mockProduct,
        productCategory: categoryWithNullFields,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithNullCategory as unknown as ProductDetail);

      const detailViewWithNullCategory = {
        ...mockDetailView,
        category: {
          ...mockDetailView.category,
          description: null,
          imageUrl: null,
        },
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithNullCategory);

      const result = await useCase.execute(mockCommand);
      expect(result.category.description).toBeNull();
      expect(result.category.imageUrl).toBeNull();
    });
  });

  describe("return value verification", () => {
    it("should return ProductDetailsView with correct structure", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("category");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("price");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("ingredients");
      expect(result).toHaveProperty("preparationTimeInMinutes");
      expect(result).toHaveProperty("stockQuantity");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("images");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
    });

    it("should return images as array with correct structure", async () => {
      const result = await useCase.execute(mockCommand);

      expect(Array.isArray(result.images)).toBe(true);
      expect(result.images[0]).toHaveProperty("url");
      expect(result.images[0]).toHaveProperty("altText");
      expect(result.images[0]).toHaveProperty("isPrimary");
      expect(result.images[0]).toHaveProperty("sortOrder");
    });

    it("should return category with correct structure", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result.category).toHaveProperty("id");
      expect(result.category).toHaveProperty("name");
      expect(result.category).toHaveProperty("description");
      expect(result.category).toHaveProperty("imageUrl");
    });

    it("should return dates as Date objects", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("error handling scenarios", () => {
    it("should handle findDetailById throwing timeout error", async () => {
      const timeoutError = new Error("Timeout error");
      mockProductRepository.findDetailById.mockRejectedValue(timeoutError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Timeout error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle findDetailById throwing database error", async () => {
      const dbError = new Error("Database connection error");
      mockProductRepository.findDetailById.mockRejectedValue(dbError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Database connection error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle findDetailById returning undefined", async () => {
      mockProductRepository.findDetailById.mockResolvedValue(undefined as unknown as ProductDetail);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle product with Unicode characters in name", async () => {
      const unicodeName = "🚀 Product with emoji 🎉";
      const productWithUnicode = {
        ...mockProduct,
        getName: jest.fn().mockReturnValue(unicodeName),
      };

      const mockDetailWithUnicode = {
        product: productWithUnicode,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithUnicode as unknown as ProductDetail);

      const detailViewWithUnicode = {
        ...mockDetailView,
        name: unicodeName,
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithUnicode);

      const result = await useCase.execute(mockCommand);
      expect(result.name).toBe(unicodeName);
    });

    it("should handle product with special characters in description", async () => {
      const specialDescription = "Description!@#$%^&*()";
      const productWithSpecialDesc = {
        ...mockProduct,
        getDescription: jest.fn().mockReturnValue(specialDescription),
      };

      const mockDetailWithSpecialDesc = {
        product: productWithSpecialDesc,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithSpecialDesc as unknown as ProductDetail);

      const detailViewWithSpecialDesc = {
        ...mockDetailView,
        description: specialDescription,
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithSpecialDesc);

      const result = await useCase.execute(mockCommand);
      expect(result.description).toBe(specialDescription);
    });

    it("should handle product with preparation time as decimal", async () => {
      const decimalPrepTime = 15.5;
      const productWithDecimalPrep = {
        ...mockProduct,
        getPreparationTimeInMinutes: jest.fn().mockReturnValue(decimalPrepTime),
      };

      const mockDetailWithDecimalPrep = {
        product: productWithDecimalPrep,
        productCategory: mockProductCategory,
      };

      mockProductRepository.findDetailById.mockResolvedValue(mockDetailWithDecimalPrep as unknown as ProductDetail);

      const detailViewWithDecimalPrep = {
        ...mockDetailView,
        preparationTimeInMinutes: decimalPrepTime,
      };
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(detailViewWithDecimalPrep);

      const result = await useCase.execute(mockCommand);
      expect(result.preparationTimeInMinutes).toBe(decimalPrepTime);
    });

    it("should handle ProductMapper returning null", async () => {
      (ProductMapper.toDetailView as jest.Mock).mockReturnValue(null);

      const result = await useCase.execute(mockCommand);
      expect(result).toBeNull();
    });
  });

  describe("TODO: cache implementation", () => {
    it("should have TODO comment for cache", () => {
      const sourceCode = GetProductDetailsUseCase.toString();
      expect(sourceCode).toContain("TODO: add cache");
    });
  });
});
