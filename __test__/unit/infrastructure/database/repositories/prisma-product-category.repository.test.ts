import { PrismaProductCategoryRepository } from "@/infrastructure/database/repositories/prisma-product-category.repository";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
import { Logger } from "@/application/ports/driven/logger";
import { TransactionContext } from "@/application/ports/driven/database";
import { BrowseProductCategoriesQuery, ProductCategorySort } from "@/application/ports/driven/product-category.repository";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryStatus } from "@/domain/types/product-category-status.enum";
import { ProductCategoryMapper } from "@/application/mappers/product-category.mapper";

jest.mock("@/application/mappers/product-category.mapper");

describe("PrismaProductCategoryRepository", () => {
  let repository: PrismaProductCategoryRepository;
  let mockLogger: jest.Mocked<Logger>;
  let mockDbClient: jest.Mocked<PrismaDatabaseClient>;
  let mockPrismaClient: jest.Mocked<any>;

  const mockCategoryId = "category-456";
  const mockCategoryName = "Test Category";

  const mockPrismaProductCategory = {
    id: mockCategoryId,
    name: mockCategoryName,
    description: "Test Description",
    imageUrl: "https://example.com/category.jpg",
    status: "ACTIVE",
    sortOrder: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

  const mockProductCategoryEntity = {
    getId: jest.fn().mockReturnValue(mockCategoryId),
    getName: jest.fn().mockReturnValue(mockCategoryName),
    getDescription: jest.fn().mockReturnValue("Test Description"),
    getImageUrl: jest.fn().mockReturnValue("https://example.com/category.jpg"),
    getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
    getSortOrder: jest.fn().mockReturnValue(1),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-15")),
    isCurrentlyActive: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<ProductCategory>;

  const mockPlainObject = {
    id: mockCategoryId,
    name: mockCategoryName,
    description: "Test Description",
    imageUrl: "https://example.com/category.jpg",
    status: ProductCategoryStatus.ACTIVE,
    sortOrder: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

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
      productCategory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockDbClient = {
      getPrismaClient: jest.fn().mockReturnValue(mockPrismaClient),
      executeInTransaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(mockPlainObject);

    jest.spyOn(ProductCategory, "rebuild").mockReturnValue(mockProductCategoryEntity);

    repository = new PrismaProductCategoryRepository(mockLogger, mockDbClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger and dbClient", () => {
      const repo = new PrismaProductCategoryRepository(mockLogger, mockDbClient);
      expect(repo).toBeInstanceOf(PrismaProductCategoryRepository);
    });

    it("should initialize with transaction context", () => {
      const mockPrismaTransaction = { productCategory: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const repo = new PrismaProductCategoryRepository(mockLogger, mockDbClient, txContext);
      expect(repo).toBeInstanceOf(PrismaProductCategoryRepository);
    });

    it("should set repositoryName correctly", () => {
      expect((repository as any).repositoryName).toBe("PrismaProductCategoryRepository");
    });
  });

  describe("withTransaction", () => {
    it("should create new repository instance with transaction context", () => {
      const mockPrismaTransaction = { productCategory: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const txRepo = repository.withTransaction(txContext);
      expect(txRepo).toBeInstanceOf(PrismaProductCategoryRepository);
      expect(txRepo).not.toBe(repository);
    });

    it("should throw error for invalid transaction context", () => {
      const invalidTx = {} as TransactionContext;
      expect(() => {
        repository.withTransaction(invalidTx);
      }).toThrow("Invalid transaction context for PrismaProductCategoryRepository. Expected PrismaTransactionContext.");
    });
  });

  describe("findById", () => {
    it("should find product category by id and return entity", async () => {
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(mockPrismaProductCategory);

      const result = await repository.findById(mockCategoryId);

      expect(mockPrismaClient.productCategory.findUnique).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
      });
      expect(ProductCategory.rebuild).toHaveBeenCalled();
      expect(result).toBe(mockProductCategoryEntity);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findById.success",
          context: "PrismaProductCategoryRepository",
        }),
      );
    });

    it("should return null when category is not found", async () => {
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(null);

      const result = await repository.findById("non-existent-id");

      expect(result).toBeNull();
      expect(ProductCategory.rebuild).not.toHaveBeenCalled();
    });

    it("should include id in additional context", async () => {
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(mockPrismaProductCategory);

      await repository.findById("test-id-456");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "test-id-456",
          }),
        }),
      );
    });

    it("should log error and throw when findUnique fails", async () => {
      const error = new Error("Database connection failed");
      mockPrismaClient.productCategory.findUnique.mockRejectedValue(error);

      await expect(repository.findById(mockCategoryId)).rejects.toThrow("Database connection failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findById.error",
          message: "findById operation failed",
        }),
      );
    });
  });

  describe("browse", () => {
    it("should browse categories with all query parameters", async () => {
      const query: BrowseProductCategoriesQuery = {
        status: ProductCategoryStatus.ACTIVE,
        sort: ProductCategorySort.NAME_ASC,
        limit: 20,
      };
      mockPrismaClient.productCategory.findMany.mockResolvedValue([mockPrismaProductCategory]);

      const result = await repository.browse(query);

      expect(mockPrismaClient.productCategory.findMany).toHaveBeenCalledWith({
        where: { status: query.status },
        take: query.limit,
        orderBy: { name: "asc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockProductCategoryEntity);
    });

    it("should use SORT_ORDER_ASC as default sort", async () => {
      const query: BrowseProductCategoriesQuery = {};
      mockPrismaClient.productCategory.findMany.mockResolvedValue([mockPrismaProductCategory]);

      await repository.browse(query);

      expect(mockPrismaClient.productCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { sortOrder: "asc" },
        }),
      );
    });

    it("should handle all sort types", async () => {
      const sortTypes = [
        ProductCategorySort.NAME_ASC,
        ProductCategorySort.NAME_DESC,
        ProductCategorySort.SORT_ORDER_ASC,
        ProductCategorySort.SORT_ORDER_DESC,
        ProductCategorySort.NEWEST,
        ProductCategorySort.OLDEST,
      ];

      const expectedOrders = [
        { name: "asc" },
        { name: "desc" },
        { sortOrder: "asc" },
        { sortOrder: "desc" },
        { createdAt: "desc" },
        { createdAt: "asc" },
      ];

      for (let i = 0; i < sortTypes.length; i++) {
        const query: BrowseProductCategoriesQuery = { sort: sortTypes[i] };
        mockPrismaClient.productCategory.findMany.mockResolvedValue([mockPrismaProductCategory]);

        await repository.browse(query);

        expect(mockPrismaClient.productCategory.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: expectedOrders[i],
          }),
        );
      }
    });

    it("should handle empty query", async () => {
      mockPrismaClient.productCategory.findMany.mockResolvedValue([mockPrismaProductCategory]);

      const result = await repository.browse({});

      expect(mockPrismaClient.productCategory.findMany).toHaveBeenCalledWith({
        where: {},
        take: undefined,
        orderBy: { sortOrder: "asc" },
      });
      expect(result).toHaveLength(1);
    });

    it("should filter by status when provided", async () => {
      const query: BrowseProductCategoriesQuery = {
        status: ProductCategoryStatus.INACTIVE,
      };
      mockPrismaClient.productCategory.findMany.mockResolvedValue([]);

      await repository.browse(query);

      expect(mockPrismaClient.productCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ProductCategoryStatus.INACTIVE },
        }),
      );
    });

    it("should return empty array when no categories found", async () => {
      mockPrismaClient.productCategory.findMany.mockResolvedValue([]);

      const result = await repository.browse({});

      expect(result).toEqual([]);
    });

    it("should log error and throw when findMany fails", async () => {
      const error = new Error("Browse failed");
      mockPrismaClient.productCategory.findMany.mockRejectedValue(error);

      await expect(repository.browse({})).rejects.toThrow("Browse failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.browse.error",
          message: "browse operation failed",
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should find all product categories", async () => {
      mockPrismaClient.productCategory.findMany.mockResolvedValue([mockPrismaProductCategory]);

      const result = await repository.findAll();

      expect(mockPrismaClient.productCategory.findMany).toHaveBeenCalledWith();
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockProductCategoryEntity);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findAll.success",
        }),
      );
    });

    it("should return empty array when no categories exist", async () => {
      mockPrismaClient.productCategory.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it("should log error and throw when findMany fails", async () => {
      const error = new Error("Find all failed");
      mockPrismaClient.productCategory.findMany.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow("Find all failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findAll.error",
          message: "findAll operation failed",
        }),
      );
    });
  });

  describe("insert", () => {
    it("should insert product category successfully", async () => {
      mockPrismaClient.productCategory.create.mockResolvedValue(mockPrismaProductCategory);

      await repository.insert(mockProductCategoryEntity);

      expect(ProductCategoryMapper.toPlainObject).toHaveBeenCalledWith(mockProductCategoryEntity);
      expect(mockPrismaClient.productCategory.create).toHaveBeenCalledWith({
        data: mockPlainObject,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.insert.success",
        }),
      );
    });

    it("should return void", async () => {
      mockPrismaClient.productCategory.create.mockResolvedValue(mockPrismaProductCategory);
      const result = await repository.insert(mockProductCategoryEntity);
      expect(result).toBeUndefined();
    });

    it("should include id in additional context", async () => {
      mockPrismaClient.productCategory.create.mockResolvedValue(mockPrismaProductCategory);
      (mockProductCategoryEntity.getId as jest.Mock).mockReturnValue("custom-id-456");

      await repository.insert(mockProductCategoryEntity);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "custom-id-456",
          }),
        }),
      );
    });

    it("should log error and throw when create fails", async () => {
      const error = new Error("Insert failed");
      mockPrismaClient.productCategory.create.mockRejectedValue(error);

      await expect(repository.insert(mockProductCategoryEntity)).rejects.toThrow("Insert failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.insert.error",
          message: "insert operation failed",
        }),
      );
    });

    it("should handle constraint violation errors", async () => {
      const error = new Error("Unique constraint failed");
      mockPrismaClient.productCategory.create.mockRejectedValue(error);

      await expect(repository.insert(mockProductCategoryEntity)).rejects.toThrow("Unique constraint failed");
    });
  });

  describe("update", () => {
    it("should update product category successfully", async () => {
      const updatedPlainObject = { ...mockPlainObject, name: "Updated Category" };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(updatedPlainObject);
      mockPrismaClient.productCategory.update.mockResolvedValue(mockPrismaProductCategory);
      (mockProductCategoryEntity.getId as jest.Mock).mockReturnValue(mockCategoryId);

      await repository.update(mockProductCategoryEntity);

      expect(ProductCategoryMapper.toPlainObject).toHaveBeenCalledWith(mockProductCategoryEntity);
      expect(mockPrismaClient.productCategory.update).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
        data: updatedPlainObject,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.update.success",
        }),
      );
    });

    it("should return void", async () => {
      mockPrismaClient.productCategory.update.mockResolvedValue(mockPrismaProductCategory);
      const result = await repository.update(mockProductCategoryEntity);
      expect(result).toBeUndefined();
    });

    it("should log error and throw when update fails", async () => {
      const error = new Error("Update failed");
      mockPrismaClient.productCategory.update.mockRejectedValue(error);

      await expect(repository.update(mockProductCategoryEntity)).rejects.toThrow("Update failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.update.error",
          message: "update operation failed",
        }),
      );
    });

    it("should use correct category id from entity", async () => {
      mockPrismaClient.productCategory.update.mockResolvedValue(mockPrismaProductCategory);
      (mockProductCategoryEntity.getId as jest.Mock).mockReturnValue("specific-id-999");

      await repository.update(mockProductCategoryEntity);

      expect(mockPrismaClient.productCategory.update).toHaveBeenCalledWith({
        where: { id: "specific-id-999" },
        data: expect.any(Object),
      });
    });
  });

  describe("updateMany", () => {
    it("should update multiple product categories successfully", async () => {
      const categories = [mockProductCategoryEntity, mockProductCategoryEntity];
      const plainObjects = [mockPlainObject, { ...mockPlainObject, id: "category-789" }];
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValueOnce(plainObjects[0]).mockReturnValueOnce(plainObjects[1]);

      mockPrismaClient.productCategory.updateMany.mockResolvedValue({ count: 2 });

      await repository.updateMany(categories);

      expect(ProductCategoryMapper.toPlainObject).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.productCategory.updateMany).toHaveBeenCalledWith({
        data: plainObjects,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.updateMany.success",
        }),
      );
    });

    it("should handle empty array", async () => {
      mockPrismaClient.productCategory.updateMany.mockResolvedValue({ count: 0 });

      await repository.updateMany([]);

      expect(ProductCategoryMapper.toPlainObject).not.toHaveBeenCalled();
      expect(mockPrismaClient.productCategory.updateMany).toHaveBeenCalledWith({
        data: [],
      });
    });

    it("should return void", async () => {
      mockPrismaClient.productCategory.updateMany.mockResolvedValue({ count: 1 });
      const result = await repository.updateMany([mockProductCategoryEntity]);
      expect(result).toBeUndefined();
    });

    it("should log error and throw when updateMany fails", async () => {
      const error = new Error("Update many failed");
      mockPrismaClient.productCategory.updateMany.mockRejectedValue(error);

      await expect(repository.updateMany([mockProductCategoryEntity])).rejects.toThrow("Update many failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.updateMany.error",
          message: "updateMany operation failed",
        }),
      );
    });
  });

  describe("delete", () => {
    it("should delete product category by id", async () => {
      mockPrismaClient.productCategory.delete.mockResolvedValue(mockPrismaProductCategory);

      await repository.delete(mockCategoryId);

      expect(mockPrismaClient.productCategory.delete).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.delete.success",
        }),
      );
    });

    it("should return void", async () => {
      mockPrismaClient.productCategory.delete.mockResolvedValue(mockPrismaProductCategory);
      const result = await repository.delete(mockCategoryId);
      expect(result).toBeUndefined();
    });

    it("should include id in additional context", async () => {
      mockPrismaClient.productCategory.delete.mockResolvedValue(mockPrismaProductCategory);

      await repository.delete("delete-id-456");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "delete-id-456",
          }),
        }),
      );
    });

    it("should log error and throw when delete fails", async () => {
      const error = new Error("Delete failed");
      mockPrismaClient.productCategory.delete.mockRejectedValue(error);

      await expect(repository.delete(mockCategoryId)).rejects.toThrow("Delete failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.delete.error",
          message: "delete operation failed",
        }),
      );
    });
  });

  describe("getNextSortOrder", () => {
    it("should return next sort order when categories exist", async () => {
      mockPrismaClient.productCategory.aggregate.mockResolvedValue({
        _max: { sortOrder: 10 },
      });

      const result = await repository.getNextSortOrder();

      expect(mockPrismaClient.productCategory.aggregate).toHaveBeenCalledWith({
        _max: { sortOrder: true },
      });
      expect(result).toBe(11);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.getNextSortOrder.success",
        }),
      );
    });

    it("should return 1 when no categories exist (max is null)", async () => {
      mockPrismaClient.productCategory.aggregate.mockResolvedValue({
        _max: { sortOrder: null },
      });

      const result = await repository.getNextSortOrder();

      expect(result).toBe(1);
    });

    it("should handle empty result with no max", async () => {
      // Prisma always returns an object with _max, even if empty
      mockPrismaClient.productCategory.aggregate.mockResolvedValue({
        _max: { sortOrder: null },
      });

      const result = await repository.getNextSortOrder();

      expect(result).toBe(1);
    });

    it("should log error and throw when aggregate fails", async () => {
      const error = new Error("Aggregate failed");
      mockPrismaClient.productCategory.aggregate.mockRejectedValue(error);

      await expect(repository.getNextSortOrder()).rejects.toThrow("Aggregate failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.getNextSortOrder.error",
          message: "getNextSortOrder operation failed",
        }),
      );
    });
  });

  describe("toEntity (private method)", () => {
    it("should convert PrismaProductCategory to ProductCategory entity", async () => {
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(mockPrismaProductCategory);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: mockCategoryName,
        description: "Test Description",
        imageUrl: "https://example.com/category.jpg",
        status: ProductCategoryStatus.ACTIVE,
        sortOrder: 1,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
      });
    });

    it("should handle category with null description", async () => {
      const categoryWithNullDescription = {
        ...mockPrismaProductCategory,
        description: null,
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithNullDescription);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        }),
      );
    });

    it("should handle category with null imageUrl", async () => {
      const categoryWithNullImage = {
        ...mockPrismaProductCategory,
        imageUrl: null,
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithNullImage);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: null,
        }),
      );
    });

    it("should handle category with INACTIVE status", async () => {
      const inactiveCategory = {
        ...mockPrismaProductCategory,
        status: "INACTIVE",
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(inactiveCategory);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProductCategoryStatus.INACTIVE,
        }),
      );
    });
  });

  describe("integration with transaction", () => {
    it("should use transaction prisma client when in transaction", async () => {
      const mockTransactionPrisma = {
        productCategory: {
          findUnique: jest.fn().mockResolvedValue(mockPrismaProductCategory),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = new PrismaProductCategoryRepository(mockLogger, mockDbClient, txContext);

      await txRepo.findById(mockCategoryId);

      expect(mockTransactionPrisma.productCategory.findUnique).toHaveBeenCalled();
      expect(mockPrismaClient.productCategory.findUnique).not.toHaveBeenCalled();
    });

    it("should execute insert in transaction", async () => {
      const mockTransactionPrisma = {
        productCategory: {
          create: jest.fn().mockResolvedValue(mockPrismaProductCategory),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.insert(mockProductCategoryEntity);

      expect(mockTransactionPrisma.productCategory.create).toHaveBeenCalled();
    });

    it("should execute updateMany in transaction", async () => {
      const mockTransactionPrisma = {
        productCategory: {
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.updateMany([mockProductCategoryEntity, mockProductCategoryEntity]);

      expect(mockTransactionPrisma.productCategory.updateMany).toHaveBeenCalled();
    });

    it("should execute getNextSortOrder in transaction", async () => {
      const mockTransactionPrisma = {
        productCategory: {
          aggregate: jest.fn().mockResolvedValue({
            _max: { sortOrder: 5 },
          }),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      const result = await txRepo.getNextSortOrder();

      expect(mockTransactionPrisma.productCategory.aggregate).toHaveBeenCalled();
      expect(result).toBe(6);
    });
  });

  describe("error scenarios", () => {
    it("should handle network errors", async () => {
      const error = new Error("ECONNREFUSED");
      mockPrismaClient.productCategory.findUnique.mockRejectedValue(error);

      await expect(repository.findById(mockCategoryId)).rejects.toThrow("ECONNREFUSED");
    });

    it("should handle foreign key constraint violations", async () => {
      const error = new Error("Foreign key constraint failed");
      mockPrismaClient.productCategory.create.mockRejectedValue(error);

      await expect(repository.insert(mockProductCategoryEntity)).rejects.toThrow("Foreign key constraint failed");
    });

    it("should handle Prisma client not available", async () => {
      mockDbClient.getPrismaClient.mockRejectedValue(new Error("Prisma client not available"));

      await expect(repository.findById(mockCategoryId)).rejects.toThrow("Prisma client not available");
    });

    it("should handle timeout errors", async () => {
      const error = new Error("Timeout error");
      mockPrismaClient.productCategory.findUnique.mockRejectedValue(error);

      await expect(repository.findById(mockCategoryId)).rejects.toThrow("Timeout error");
    });

    it("should handle connection pool errors", async () => {
      const error = new Error("Connection pool exhausted");
      mockPrismaClient.productCategory.findMany.mockRejectedValue(error);

      await expect(repository.browse({})).rejects.toThrow("Connection pool exhausted");
    });
  });

  describe("logging behavior", () => {
    it("should log with correct context for all operations", async () => {
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(mockPrismaProductCategory);

      await repository.findById(mockCategoryId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaProductCategoryRepository",
        }),
      );
    });

    it("should measure operation duration", async () => {
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(mockPrismaProductCategory);

      await repository.findById(mockCategoryId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      );
    });

    it("should log errors with stack trace", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace here";
      mockPrismaClient.productCategory.update.mockRejectedValue(error);

      await expect(repository.update(mockProductCategoryEntity)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: "Error stack trace here",
        }),
      );
    });

    it("should log operation start for debugging", async () => {
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(mockPrismaProductCategory);

      await repository.findById(mockCategoryId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.stringContaining("repository.findById"),
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle category with empty name", async () => {
      const categoryWithEmptyName = {
        ...mockPrismaProductCategory,
        name: "",
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithEmptyName);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "",
        }),
      );
    });

    it("should handle category with sortOrder 0", async () => {
      const categoryWithZeroSort = {
        ...mockPrismaProductCategory,
        sortOrder: 0,
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithZeroSort);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: 0,
        }),
      );
    });

    it("should handle category with negative sortOrder", async () => {
      const categoryWithNegativeSort = {
        ...mockPrismaProductCategory,
        sortOrder: -5,
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithNegativeSort);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: -5,
        }),
      );
    });

    it("should handle very old dates", async () => {
      const oldDate = new Date("1970-01-01");
      const categoryWithOldDates = {
        ...mockPrismaProductCategory,
        createdAt: oldDate,
        updatedAt: oldDate,
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithOldDates);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: oldDate,
          updatedAt: oldDate,
        }),
      );
    });

    it("should handle very future dates", async () => {
      const futureDate = new Date("2099-12-31");
      const categoryWithFutureDates = {
        ...mockPrismaProductCategory,
        createdAt: futureDate,
        updatedAt: futureDate,
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithFutureDates);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: futureDate,
          updatedAt: futureDate,
        }),
      );
    });

    it("should handle special characters in name", async () => {
      const categoryWithSpecialChars = {
        ...mockPrismaProductCategory,
        name: "Category!@#$%^&*()",
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithSpecialChars);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Category!@#$%^&*()",
        }),
      );
    });

    it("should handle Unicode characters in name", async () => {
      const categoryWithUnicode = {
        ...mockPrismaProductCategory,
        name: "测试分类 🎉",
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithUnicode);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "测试分类 🎉",
        }),
      );
    });

    it("should handle very long name", async () => {
      const longName = "a".repeat(1000);
      const categoryWithLongName = {
        ...mockPrismaProductCategory,
        name: longName,
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithLongName);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          name: longName,
        }),
      );
    });

    it("should handle null sortOrder", async () => {
      const categoryWithNullSort = {
        ...mockPrismaProductCategory,
        sortOrder: null,
      };
      mockPrismaClient.productCategory.findUnique.mockResolvedValue(categoryWithNullSort);

      await repository.findById(mockCategoryId);

      expect(ProductCategory.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: null,
        }),
      );
    });
  });
});
