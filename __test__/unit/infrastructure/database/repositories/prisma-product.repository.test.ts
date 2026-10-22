import { PrismaProductRepository } from "@/infrastructure/database/repositories/prisma-product.repository";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
import { Logger } from "@/application/ports/driven/logger";
import { TransactionContext } from "@/application/ports/driven/database";
import { BrowseProductsQuery, ProductSort } from "@/application/ports/driven/product.repository";
import { Product } from "@/domain/entities/product.entity";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductType } from "@/domain/types/product-type.enum";
import { ProductStatus } from "@/domain/types/product-status.enum";
import { ProductCategoryStatus } from "@/domain/types/product-category-status.enum";
import { InsufficientStockException } from "@/domain/exceptions/product.exceptions";

jest.mock("@/application/mappers/product.mapper");

describe("PrismaProductRepository", () => {
  let repository: PrismaProductRepository;
  let mockLogger: jest.Mocked<Logger>;
  let mockDbClient: jest.Mocked<PrismaDatabaseClient>;
  let mockPrismaClient: jest.Mocked<any>;

  const mockProductId = "product-123";
  const mockProductId2 = "product-456";
  const mockCategoryId = "category-456";
  const mockProductName = "Test Product";
  const mockProductPrice = 50000;
  const mockProductPrice2 = 75000;
  const mockStockQuantity = 100;

  const mockPrismaProduct = {
    id: mockProductId,
    categoryId: mockCategoryId,
    name: mockProductName,
    description: "Test Description",
    price: mockProductPrice,
    type: "FOOD",
    ingredients: "Ingredient 1, Ingredient 2",
    preparationTimeInMinutes: 15,
    status: "AVAILABLE",
    stockQuantity: mockStockQuantity,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    images: [
      {
        productId: mockProductId,
        url: "https://example.com/image1.jpg",
        altText: "Test Product image 1",
        isPrimary: true,
        sortOrder: 1,
      },
      {
        productId: mockProductId,
        url: "https://example.com/image2.jpg",
        altText: "Test Product image 2",
        isPrimary: false,
        sortOrder: 2,
      },
    ],
  };

  const mockPrismaProduct2 = {
    id: mockProductId2,
    categoryId: mockCategoryId,
    name: "Test Product 2",
    description: "Test Description 2",
    price: mockProductPrice2,
    type: "DRINK",
    ingredients: "Ingredient 3, Ingredient 4",
    preparationTimeInMinutes: 10,
    status: "AVAILABLE",
    stockQuantity: 50,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-16"),
    images: [
      {
        productId: mockProductId2,
        url: "https://example.com/image3.jpg",
        altText: "Test Product 2 image",
        isPrimary: true,
        sortOrder: 1,
      },
    ],
  };

  const mockPrismaProductCategory = {
    id: mockCategoryId,
    name: "Test Category",
    description: "Category Description",
    imageUrl: "https://example.com/category.jpg",
    status: "ACTIVE",
    sortOrder: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

  const mockProductEntity = {
    getId: jest.fn().mockReturnValue(mockProductId),
    getCategoryId: jest.fn().mockReturnValue(mockCategoryId),
    getName: jest.fn().mockReturnValue(mockProductName),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(mockProductPrice) }),
    getDescription: jest.fn().mockReturnValue("Test Description"),
    getType: jest.fn().mockReturnValue(ProductType.FOOD),
    getIngredients: jest.fn().mockReturnValue("Ingredient 1, Ingredient 2"),
    getPreparationTimeInMinutes: jest.fn().mockReturnValue(15),
    getStockQuantity: jest.fn().mockReturnValue(mockStockQuantity),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue([]),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-15")),
  } as unknown as jest.Mocked<Product>;

  const mockProductEntity2 = {
    getId: jest.fn().mockReturnValue(mockProductId2),
    getCategoryId: jest.fn().mockReturnValue(mockCategoryId),
    getName: jest.fn().mockReturnValue("Test Product 2"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(mockProductPrice2) }),
    getDescription: jest.fn().mockReturnValue("Test Description 2"),
    getType: jest.fn().mockReturnValue(ProductType.DRINK),
    getIngredients: jest.fn().mockReturnValue("Ingredient 3, Ingredient 4"),
    getPreparationTimeInMinutes: jest.fn().mockReturnValue(10),
    getStockQuantity: jest.fn().mockReturnValue(50),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue([]),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-02")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-16")),
  } as unknown as jest.Mocked<Product>;

  const mockProductCategoryEntity = {
    getId: jest.fn().mockReturnValue(mockCategoryId),
    getName: jest.fn().mockReturnValue("Test Category"),
    getDescription: jest.fn().mockReturnValue("Category Description"),
    getImageUrl: jest.fn().mockReturnValue("https://example.com/category.jpg"),
    getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
    getSortOrder: jest.fn().mockReturnValue(1),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-15")),
    isCurrentlyActive: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<ProductCategory>;

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
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      productImage: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $executeRaw: jest.fn(),
      $transaction: jest.fn(),
    };

    mockDbClient = {
      getPrismaClient: jest.fn().mockReturnValue(mockPrismaClient),
      executeInTransaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    jest.spyOn(Product, "rebuild").mockReturnValue(mockProductEntity);
    jest.spyOn(ProductCategory, "rebuild").mockReturnValue(mockProductCategoryEntity);

    repository = new PrismaProductRepository(mockLogger, mockDbClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger and dbClient", () => {
      const repo = new PrismaProductRepository(mockLogger, mockDbClient);
      expect(repo).toBeInstanceOf(PrismaProductRepository);
    });

    it("should initialize with transaction context", () => {
      const mockPrismaTransaction = { product: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const repo = new PrismaProductRepository(mockLogger, mockDbClient, txContext);
      expect(repo).toBeInstanceOf(PrismaProductRepository);
    });

    it("should set repositoryName correctly", () => {
      expect((repository as any).repositoryName).toBe("PrismaProductRepository");
    });
  });

  describe("withTransaction", () => {
    it("should create new repository instance with transaction context", () => {
      const mockPrismaTransaction = { product: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const txRepo = repository.withTransaction(txContext);
      expect(txRepo).toBeInstanceOf(PrismaProductRepository);
      expect(txRepo).not.toBe(repository);
    });

    it("should throw error for invalid transaction context", () => {
      const invalidTx = {} as TransactionContext;
      expect(() => {
        repository.withTransaction(invalidTx);
      }).toThrow("Invalid transaction context for PrismaProductRepository. Expected PrismaTransactionContext.");
    });
  });

  describe("findById", () => {
    it("should find product by id and return entity", async () => {
      mockPrismaClient.product.findUnique.mockResolvedValue(mockPrismaProduct);

      const result = await repository.findById(mockProductId);

      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductId },
        include: { images: true },
      });
      expect(Product.rebuild).toHaveBeenCalled();
      expect(result).toBe(mockProductEntity);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findById.success",
          context: "PrismaProductRepository",
        }),
      );
    });

    it("should return null when product is not found", async () => {
      mockPrismaClient.product.findUnique.mockResolvedValue(null);

      const result = await repository.findById("non-existent-id");

      expect(result).toBeNull();
      expect(Product.rebuild).not.toHaveBeenCalled();
    });

    it("should log error and throw when findUnique fails", async () => {
      const error = new Error("Database connection failed");
      mockPrismaClient.product.findUnique.mockRejectedValue(error);

      await expect(repository.findById(mockProductId)).rejects.toThrow("Database connection failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findById.error",
          message: "findById operation failed",
        }),
      );
    });
  });

  describe("findByIds", () => {
    it("should find multiple products by ids and return entities in correct order", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct, mockPrismaProduct2]);

      (Product.rebuild as jest.Mock).mockReturnValueOnce(mockProductEntity).mockReturnValueOnce(mockProductEntity2);

      const ids = [mockProductId, mockProductId2];
      const result = await repository.findByIds(ids);

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
        include: { images: true },
      });
      expect(Product.rebuild).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockProductEntity);
      expect(result[1]).toBe(mockProductEntity2);
    });

    it("should return products in the order of provided ids", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct2, mockPrismaProduct]);

      (Product.rebuild as jest.Mock).mockReturnValueOnce(mockProductEntity2).mockReturnValueOnce(mockProductEntity);

      const ids = [mockProductId, mockProductId2];
      const result = await repository.findByIds(ids);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockProductEntity);
      expect(result[1]).toBe(mockProductEntity2);
    });

    it("should handle missing products gracefully", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct]);

      const ids = [mockProductId, mockProductId2];
      const result = await repository.findByIds(ids);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockProductEntity);
    });

    it("should return empty array when no products found", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([]);

      const result = await repository.findByIds(["non-existent-1", "non-existent-2"]);

      expect(result).toEqual([]);
      expect(Product.rebuild).not.toHaveBeenCalled();
    });

    it("should return empty array when empty ids array is provided", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([]);

      const result = await repository.findByIds([]);

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: [] } },
        include: { images: true },
      });
      expect(result).toEqual([]);
    });
  });

  describe("findDetailById", () => {
    it("should find product detail by id with category and images", async () => {
      const prismaProductWithCategory = {
        ...mockPrismaProduct,
        productCategory: mockPrismaProductCategory,
      };
      mockPrismaClient.product.findUnique.mockResolvedValue(prismaProductWithCategory);

      const result = await repository.findDetailById(mockProductId);

      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductId },
        include: { productCategory: true, images: true },
      });
      expect(Product.rebuild).toHaveBeenCalled();
      expect(ProductCategory.rebuild).toHaveBeenCalled();
      expect(result).toEqual({
        product: mockProductEntity,
        productCategory: mockProductCategoryEntity,
      });
    });

    it("should return null when product is not found", async () => {
      mockPrismaClient.product.findUnique.mockResolvedValue(null);

      const result = await repository.findDetailById("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("search", () => {
    it("should search products by keyword with images", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct]);

      const result = await repository.search("test");

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith({
        where: { name: { contains: "test", mode: "insensitive" } },
        include: { images: { orderBy: [{ isPrimary: "desc" }, { orderNumber: "asc" }], take: 1 } },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockProductEntity);
    });

    it("should search with case-insensitive keyword", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct]);

      await repository.search("TEST");

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: "TEST", mode: "insensitive" } },
        }),
      );
    });

    it("should return empty array when no products found", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([]);

      const result = await repository.search("nonexistent");

      expect(result).toEqual([]);
    });

    it("should log error and throw when findMany fails", async () => {
      const error = new Error("Search failed");
      mockPrismaClient.product.findMany.mockRejectedValue(error);

      await expect(repository.search("test")).rejects.toThrow("Search failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.search.error",
          message: "search operation failed",
        }),
      );
    });
  });

  describe("browse", () => {
    it("should browse products with all query parameters and return ProductPage", async () => {
      const query: BrowseProductsQuery = {
        categoryId: mockCategoryId,
        type: ProductType.FOOD,
        status: ProductStatus.AVAILABLE,
        sort: ProductSort.PRICE_ASC,
        limit: 20,
      };
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct, mockPrismaProduct2]);

      const result = await repository.browse(query);

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: query.categoryId,
          status: query.status,
          type: query.type,
        },
        include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 } },
        take: 21,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        orderBy: { price: "asc" },
      });
      expect(result.products).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });

    it("should use NEWEST sort by default", async () => {
      const query: BrowseProductsQuery = {};
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct]);

      await repository.browse(query);

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should handle all sort types", async () => {
      const sortTypes = [
        ProductSort.NAME_ASC,
        ProductSort.NAME_DESC,
        ProductSort.PRICE_ASC,
        ProductSort.PRICE_DESC,
        ProductSort.NEWEST,
        ProductSort.OLDEST,
      ];

      const expectedOrders = [{ name: "asc" }, { name: "desc" }, { price: "asc" }, { price: "desc" }, { createdAt: "desc" }, { createdAt: "asc" }];

      for (let i = 0; i < sortTypes.length; i++) {
        const query: BrowseProductsQuery = { sort: sortTypes[i] };
        mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct]);

        await repository.browse(query);

        expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: expectedOrders[i],
          }),
        );
      }
    });

    it("should handle cursor pagination", async () => {
      const query: BrowseProductsQuery = {
        cursor: "cursor-123",
        limit: 10,
      };
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct, mockPrismaProduct2]);

      await repository.browse(query);

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 11,
          cursor: { id: "cursor-123" },
          skip: 1,
        }),
      );
    });

    it("should return nextCursor when there are more products", async () => {
      const products = Array.from({ length: 21 }, (_, i) => ({
        ...mockPrismaProduct,
        id: `product-${i}`,
      }));
      mockPrismaClient.product.findMany.mockResolvedValue(products);

      const query: BrowseProductsQuery = { limit: 20 };
      const result = await repository.browse(query);

      expect(result.products).toHaveLength(20);
      expect(result.nextCursor).toBe("product-19");
    });

    it("should return null nextCursor when no more products", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct, mockPrismaProduct2]);

      const query: BrowseProductsQuery = { limit: 20 };
      const result = await repository.browse(query);

      expect(result.products).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });

    it("should handle empty query with default limit", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([mockPrismaProduct]);

      const result = await repository.browse({});

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith({
        where: {},
        include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 } },
        take: 21,
        ...({} as any),
        orderBy: { createdAt: "desc" },
      });
      expect(result.products).toHaveLength(1);
    });

    it("should return empty array when no products found", async () => {
      mockPrismaClient.product.findMany.mockResolvedValue([]);

      const result = await repository.browse({});

      expect(result.products).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe("insert", () => {
    it("should insert product with images successfully", async () => {
      const mockImages = [
        {
          getUrl: jest.fn().mockReturnValue("https://example.com/image1.jpg"),
          getAltText: jest.fn().mockReturnValue("Image 1"),
          getSortOrder: jest.fn().mockReturnValue(1),
          isPrimaryImage: jest.fn().mockReturnValue(true),
        },
      ];
      (mockProductEntity.getImages as jest.Mock).mockReturnValue(mockImages);
      mockPrismaClient.product.create.mockResolvedValue(mockPrismaProduct);

      await repository.insert(mockProductEntity);

      expect(mockPrismaClient.product.create).toHaveBeenCalledWith({
        data: {
          id: mockProductId,
          categoryId: mockCategoryId,
          name: mockProductName,
          description: "Test Description",
          price: mockProductPrice,
          type: ProductType.FOOD,
          ingredients: "Ingredient 1, Ingredient 2",
          preparationTimeInMinutes: 15,
          stockQuantity: mockStockQuantity,
          status: ProductStatus.AVAILABLE,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          images: {
            createMany: {
              data: [
                {
                  url: "https://example.com/image1.jpg",
                  altText: "Image 1",
                  sortOrder: 1,
                  isPrimary: true,
                },
              ],
            },
          },
        },
      });
    });

    it("should insert product without images", async () => {
      (mockProductEntity.getImages as jest.Mock).mockReturnValue([]);
      mockPrismaClient.product.create.mockResolvedValue(mockPrismaProduct);

      await repository.insert(mockProductEntity);

      expect(mockPrismaClient.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            images: { createMany: { data: [] } },
          }),
        }),
      );
    });
  });

  describe("update", () => {
    it("should update product without images", async () => {
      mockPrismaClient.product.update.mockResolvedValue(mockPrismaProduct);

      await repository.update(mockProductEntity);

      expect(mockPrismaClient.product.update).toHaveBeenCalledWith({
        where: { id: mockProductId },
        data: {
          categoryId: mockCategoryId,
          name: mockProductName,
          description: "Test Description",
          price: mockProductPrice,
          type: ProductType.FOOD,
          ingredients: "Ingredient 1, Ingredient 2",
          preparationTimeInMinutes: 15,
          stockQuantity: mockStockQuantity,
          status: ProductStatus.AVAILABLE,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe("updateImages", () => {
    it("should update product images successfully", async () => {
      const mockImages = [
        {
          getUrl: jest.fn().mockReturnValue("https://example.com/image1.jpg"),
          getAltText: jest.fn().mockReturnValue("Image 1"),
          getSortOrder: jest.fn().mockReturnValue(1),
          isPrimaryImage: jest.fn().mockReturnValue(true),
        },
        {
          getUrl: jest.fn().mockReturnValue("https://example.com/image2.jpg"),
          getAltText: jest.fn().mockReturnValue("Image 2"),
          getSortOrder: jest.fn().mockReturnValue(2),
          isPrimaryImage: jest.fn().mockReturnValue(false),
        },
      ];
      (mockProductEntity.getImages as jest.Mock).mockReturnValue(mockImages);
      (mockProductEntity.getId as jest.Mock).mockReturnValue(mockProductId);
      mockPrismaClient.productImage.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaClient.productImage.createMany.mockResolvedValue({ count: 2 });
      mockPrismaClient.product.update.mockResolvedValue(mockPrismaProduct);

      await repository.updateImages(mockProductEntity);

      expect(mockPrismaClient.productImage.deleteMany).toHaveBeenCalledWith({
        where: { productId: mockProductId },
      });
      expect(mockPrismaClient.productImage.createMany).toHaveBeenCalledWith({
        data: [
          {
            productId: mockProductId,
            url: "https://example.com/image1.jpg",
            altText: "Image 1",
            sortOrder: 1,
            isPrimary: true,
          },
          {
            productId: mockProductId,
            url: "https://example.com/image2.jpg",
            altText: "Image 2",
            sortOrder: 2,
            isPrimary: false,
          },
        ],
      });
      expect(mockPrismaClient.product.update).toHaveBeenCalledWith({
        where: { id: mockProductId },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it("should handle product with no images", async () => {
      (mockProductEntity.getImages as jest.Mock).mockReturnValue([]);
      (mockProductEntity.getId as jest.Mock).mockReturnValue(mockProductId);
      mockPrismaClient.productImage.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.productImage.createMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.product.update.mockResolvedValue(mockPrismaProduct);

      await repository.updateImages(mockProductEntity);

      expect(mockPrismaClient.productImage.createMany).toHaveBeenCalledWith({
        data: [],
      });
    });
  });

  describe("deductStockForItems", () => {
    it("should deduct stock for multiple items successfully", async () => {
      const items = [
        { id: "product-1", quantity: 2 },
        { id: "product-2", quantity: 3 },
      ];
      mockPrismaClient.$executeRaw.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      await repository.deductStockForItems(items);

      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledTimes(2);
      const calls = mockPrismaClient.$executeRaw.mock.calls;
      expect(calls[0][0]).toBeDefined();
      expect(calls[1][0]).toBeDefined();
      expect(calls[0][0].values).toContain(2);
      expect(calls[0][0].values).toContain("product-1");
      expect(calls[1][0].values).toContain(3);
      expect(calls[1][0].values).toContain("product-2");
    });

    it("should do nothing when items array is empty", async () => {
      await repository.deductStockForItems([]);

      expect(mockPrismaClient.$executeRaw).not.toHaveBeenCalled();
    });

    it("should throw InsufficientStockException when stock is insufficient", async () => {
      const items = [{ id: "product-1", quantity: 10 }];
      mockPrismaClient.$executeRaw.mockResolvedValue(0);
      mockPrismaClient.product.findUnique.mockResolvedValue({ stockQuantity: 5 });

      await expect(repository.deductStockForItems(items)).rejects.toThrow(InsufficientStockException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle insufficient stock for one item among many", async () => {
      const items = [
        { id: "product-1", quantity: 2 },
        { id: "product-2", quantity: 10 },
      ];
      mockPrismaClient.$executeRaw.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      mockPrismaClient.product.findUnique.mockResolvedValue({ stockQuantity: 5 });

      await expect(repository.deductStockForItems(items)).rejects.toThrow(InsufficientStockException);
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe("delete", () => {
    it("should delete product by id", async () => {
      mockPrismaClient.product.delete.mockResolvedValue(mockPrismaProduct);

      await repository.delete(mockProductId);

      expect(mockPrismaClient.product.delete).toHaveBeenCalledWith({
        where: { id: mockProductId },
      });
    });
  });

  describe("toDomain (private method)", () => {
    it("should convert PrismaProduct to Product entity", async () => {
      mockPrismaClient.product.findUnique.mockResolvedValue(mockPrismaProduct);

      await repository.findById(mockProductId);

      expect(Product.rebuild).toHaveBeenCalledWith({
        id: mockProductId,
        categoryId: mockCategoryId,
        name: mockProductName,
        description: "Test Description",
        price: mockProductPrice,
        type: ProductType.FOOD,
        ingredients: "Ingredient 1, Ingredient 2",
        preparationTimeInMinutes: 15,
        status: ProductStatus.AVAILABLE,
        stockQuantity: mockStockQuantity,
        images: expect.any(Array),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should handle null fields", async () => {
      const productWithNulls = {
        ...mockPrismaProduct,
        description: null,
        ingredients: null,
        preparationTimeInMinutes: null,
      };
      mockPrismaClient.product.findUnique.mockResolvedValue(productWithNulls);

      await repository.findById(mockProductId);

      expect(Product.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          ingredients: null,
          preparationTimeInMinutes: null,
        }),
      );
    });
  });

  describe("integration with transaction", () => {
    it("should use transaction prisma client when in transaction", async () => {
      const mockTransactionPrisma = {
        product: {
          findUnique: jest.fn().mockResolvedValue(mockPrismaProduct),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = new PrismaProductRepository(mockLogger, mockDbClient, txContext);

      await txRepo.findById(mockProductId);

      expect(mockTransactionPrisma.product.findUnique).toHaveBeenCalled();
      expect(mockPrismaClient.product.findUnique).not.toHaveBeenCalled();
    });

    it("should execute deductStockForItems in transaction", async () => {
      const mockTransactionPrisma = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        product: {
          findUnique: jest.fn(),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.deductStockForItems([{ id: "product-1", quantity: 2 }]);

      expect(mockTransactionPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("error scenarios", () => {
    it("should handle network errors", async () => {
      const error = new Error("ECONNREFUSED");
      mockPrismaClient.product.findUnique.mockRejectedValue(error);

      await expect(repository.findById(mockProductId)).rejects.toThrow("ECONNREFUSED");
    });

    it("should handle foreign key constraint violations in insert", async () => {
      const error = new Error("Foreign key constraint failed");
      mockPrismaClient.product.create.mockRejectedValue(error);

      await expect(repository.insert(mockProductEntity)).rejects.toThrow("Foreign key constraint failed");
    });

    it("should handle Prisma client not available", async () => {
      mockDbClient.getPrismaClient.mockRejectedValue(new Error("Prisma client not available"));

      await expect(repository.findById(mockProductId)).rejects.toThrow("Prisma client not available");
    });
  });

  describe("logging behavior", () => {
    it("should log with correct context for all operations", async () => {
      mockPrismaClient.product.findUnique.mockResolvedValue(mockPrismaProduct);

      await repository.findById(mockProductId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaProductRepository",
        }),
      );
    });

    it("should measure operation duration", async () => {
      mockPrismaClient.product.findUnique.mockResolvedValue(mockPrismaProduct);

      await repository.findById(mockProductId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      );
    });

    it("should log errors with stack trace", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace here";
      mockPrismaClient.product.update.mockRejectedValue(error);

      await expect(repository.update(mockProductEntity)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: "Error stack trace here",
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle product with all statuses", async () => {
      const statuses = ["UPCOMING", "AVAILABLE", "UNAVAILABLE", "DISCONTINUED"];

      for (const status of statuses) {
        const productWithStatus = {
          ...mockPrismaProduct,
          status,
        };
        mockPrismaClient.product.findUnique.mockResolvedValue(productWithStatus);

        await repository.findById(mockProductId);

        expect(Product.rebuild).toHaveBeenCalledWith(
          expect.objectContaining({
            status: status,
          }),
        );
      }
    });

    it("should handle product with all product types", async () => {
      const types = ["FOOD", "DRINK", "SNACK"];

      for (const type of types) {
        const productWithType = {
          ...mockPrismaProduct,
          type,
        };
        mockPrismaClient.product.findUnique.mockResolvedValue(productWithType);

        await repository.findById(mockProductId);

        expect(Product.rebuild).toHaveBeenCalledWith(
          expect.objectContaining({
            type: type,
          }),
        );
      }
    });

    it("should handle product with zero stock", async () => {
      const productWithZeroStock = {
        ...mockPrismaProduct,
        stockQuantity: 0,
        status: "UNAVAILABLE",
      };
      mockPrismaClient.product.findUnique.mockResolvedValue(productWithZeroStock);

      await repository.findById(mockProductId);

      expect(Product.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          stockQuantity: 0,
          status: ProductStatus.UNAVAILABLE,
        }),
      );
    });
  });
});
