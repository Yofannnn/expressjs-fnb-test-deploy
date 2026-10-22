import { BrowseProductCategoriesUseCase } from "@/application/use-cases/product/product-category/browse-product-categories.use-case";
import { BrowseProductCategoriesCommand, ProductCategorySort } from "@/application/ports/driving/browse-product-categories.use-case.port";
import { ProductCategoryRepositoryPort } from "@/application/ports/driven/product-category.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductCategoryMapper } from "@/application/mappers/product-category.mapper";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";
import { ProductCategorySummaryView } from "@/application/types/product-category.type";

jest.mock("@/application/mappers/product-category.mapper");

describe("BrowseProductCategoriesUseCase", () => {
  let useCase: BrowseProductCategoriesUseCase;
  let mockProductCategoryRepository: jest.Mocked<ProductCategoryRepositoryPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  const mockStartTime = 1000;

  const mockCategory1 = {
    getId: jest.fn().mockReturnValue("cat-1"),
    getName: jest.fn().mockReturnValue("Category 1"),
    getDescription: jest.fn().mockReturnValue("Description 1"),
    getImageUrl: jest.fn().mockReturnValue("https://example.com/cat1.jpg"),
    getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
    getSortOrder: jest.fn().mockReturnValue(1),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
  } as unknown as jest.Mocked<ProductCategory>;

  const mockCategory2 = {
    getId: jest.fn().mockReturnValue("cat-2"),
    getName: jest.fn().mockReturnValue("Category 2"),
    getDescription: jest.fn().mockReturnValue("Description 2"),
    getImageUrl: jest.fn().mockReturnValue(null),
    getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.INACTIVE),
    getSortOrder: jest.fn().mockReturnValue(2),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-02T00:00:00Z")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-02T00:00:00Z")),
  } as unknown as jest.Mocked<ProductCategory>;

  const mockCategory3 = {
    getId: jest.fn().mockReturnValue("cat-3"),
    getName: jest.fn().mockReturnValue("Category 3"),
    getDescription: jest.fn().mockReturnValue(null),
    getImageUrl: jest.fn().mockReturnValue("https://example.com/cat3.jpg"),
    getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
    getSortOrder: jest.fn().mockReturnValue(3),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-03T00:00:00Z")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-03T00:00:00Z")),
  } as unknown as jest.Mocked<ProductCategory>;

  const mockCategories: ProductCategory[] = [mockCategory1, mockCategory2, mockCategory3];

  const mockSummaryView1: ProductCategorySummaryView = {
    id: "cat-1",
    name: "Category 1",
    imageUrl: "https://example.com/cat1.jpg",
    status: ProductCategoryStatus.ACTIVE,
    sortOrder: 1,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockSummaryView2: ProductCategorySummaryView = {
    id: "cat-2",
    name: "Category 2",
    imageUrl: null,
    status: ProductCategoryStatus.INACTIVE,
    sortOrder: 2,
    createdAt: new Date("2024-01-02T00:00:00Z"),
  };

  const mockSummaryView3: ProductCategorySummaryView = {
    id: "cat-3",
    name: "Category 3",
    imageUrl: "https://example.com/cat3.jpg",
    status: ProductCategoryStatus.ACTIVE,
    sortOrder: 3,
    createdAt: new Date("2024-01-03T00:00:00Z"),
  };

  const mockSummaryViews = [mockSummaryView1, mockSummaryView2, mockSummaryView3];

  const mockCommand: BrowseProductCategoriesCommand = {
    status: ProductCategoryStatus.ACTIVE,
    sort: ProductCategorySort.NAME_ASC,
  };

  const setupMapperMock = () => {
    (ProductCategoryMapper.toSummaryView as jest.Mock)
      .mockReset()
      .mockReturnValueOnce(mockSummaryView1)
      .mockReturnValueOnce(mockSummaryView2)
      .mockReturnValueOnce(mockSummaryView3);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductCategoryRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findAll: jest.fn(),
      browse: jest.fn(),
      delete: jest.fn(),
      getNextSortOrder: jest.fn(),
    } as unknown as jest.Mocked<ProductCategoryRepositoryPort>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<LoggerPort>;

    mockProductCategoryRepository.browse.mockResolvedValue(mockCategories);
    setupMapperMock();

    useCase = new BrowseProductCategoriesUseCase(mockProductCategoryRepository, mockLogger);
  });

  describe("execute", () => {
    it("should successfully browse categories with all filters", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(mockCommand);
      expect(ProductCategoryMapper.toSummaryView).toHaveBeenCalledTimes(3);
    });

    it("should return empty array when no categories found", async () => {
      mockProductCategoryRepository.browse.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(ProductCategoryMapper.toSummaryView).not.toHaveBeenCalled();
    });

    it("should log debug message when starting", async () => {
      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "BrowseProductCategoriesUseCase",
        event: "BROWSE_PRODUCT_CATEGORIES_STARTED",
        message: "Product categories are being retrieved",
      });
    });

    it("should log info message when successful", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "BrowseProductCategoriesUseCase",
        event: "BROWSE_PRODUCT_CATEGORIES_SUCCESSFUL",
        message: "Product categories retrieved successfully",
        durationMs: 100,
      });

      dateNowSpy.mockRestore();
    });

    it("should call browse with correct command parameters", async () => {
      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(mockCommand);
    });

    it("should handle empty command object", async () => {
      const emptyCommand: BrowseProductCategoriesCommand = {};

      setupMapperMock();
      await useCase.execute(emptyCommand);

      expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(emptyCommand);
    });

    it("should handle command with only status filter", async () => {
      const commandWithStatus: BrowseProductCategoriesCommand = {
        status: ProductCategoryStatus.ACTIVE,
      };

      setupMapperMock();
      await useCase.execute(commandWithStatus);

      expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(commandWithStatus);
    });

    it("should handle command with only sorting options", async () => {
      const commandWithSorting: BrowseProductCategoriesCommand = {
        sort: ProductCategorySort.NAME_DESC,
      };

      setupMapperMock();
      await useCase.execute(commandWithSorting);

      expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(commandWithSorting);
    });

    it("should handle repository error", async () => {
      const repoError = new Error("Repository error");
      mockProductCategoryRepository.browse.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("ProductCategoryMapper interaction", () => {
    it("should call toSummaryView for each category", async () => {
      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(ProductCategoryMapper.toSummaryView).toHaveBeenCalledTimes(3);
      expect(ProductCategoryMapper.toSummaryView).toHaveBeenCalledWith(mockCategory1);
      expect(ProductCategoryMapper.toSummaryView).toHaveBeenCalledWith(mockCategory2);
      expect(ProductCategoryMapper.toSummaryView).toHaveBeenCalledWith(mockCategory3);
    });

    it("should return the mapped summary views", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result).toEqual(mockSummaryViews);
    });

    it("should handle mapper returning null for a category", async () => {
      (ProductCategoryMapper.toSummaryView as jest.Mock)
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

      (ProductCategoryMapper.toSummaryView as jest.Mock)
        .mockReset()
        .mockImplementationOnce(() => {
          throw mapperError;
        })
        .mockImplementationOnce(() => mockSummaryView2)
        .mockImplementationOnce(() => mockSummaryView3);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(mapperError);
    });
  });

  describe("mapToSummaryView behavior", () => {
    it("should map categories to summary view correctly", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(result[0]).toEqual({
        id: "cat-1",
        name: "Category 1",
        imageUrl: "https://example.com/cat1.jpg",
        status: ProductCategoryStatus.ACTIVE,
        sortOrder: 1,
        createdAt: expect.any(Date),
      });

      expect(result[1]).toEqual({
        id: "cat-2",
        name: "Category 2",
        imageUrl: null,
        status: ProductCategoryStatus.INACTIVE,
        sortOrder: 2,
        createdAt: expect.any(Date),
      });

      expect(result[2]).toEqual({
        id: "cat-3",
        name: "Category 3",
        imageUrl: "https://example.com/cat3.jpg",
        status: ProductCategoryStatus.ACTIVE,
        sortOrder: 3,
        createdAt: expect.any(Date),
      });
    });

    it("should handle categories with null imageUrl", async () => {
      const categoryWithNullImage = {
        ...mockCategory1,
        getImageUrl: jest.fn().mockReturnValue(null),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.browse.mockResolvedValue([categoryWithNullImage]);

      const summaryWithNullImage = {
        ...mockSummaryView1,
        imageUrl: null,
      };

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithNullImage);

      const result = await useCase.execute(mockCommand);
      expect(result[0].imageUrl).toBeNull();
    });

    it("should handle categories with different statuses", async () => {
      const statuses = [ProductCategoryStatus.ACTIVE, ProductCategoryStatus.INACTIVE];

      const categoriesWithStatuses = statuses.map((status, index) => ({
        ...mockCategory1,
        getId: jest.fn().mockReturnValue(`cat-${index}`),
        getStatus: jest.fn().mockReturnValue(status),
      })) as unknown as ProductCategory[];

      mockProductCategoryRepository.browse.mockResolvedValue(categoriesWithStatuses);

      const summaries = statuses.map((status, index) => ({
        ...mockSummaryView1,
        id: `cat-${index}`,
        status,
      }));

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaries[0]).mockReturnValueOnce(summaries[1]);

      const result = await useCase.execute(mockCommand);

      expect(result[0].status).toBe(statuses[0]);
      expect(result[1].status).toBe(statuses[1]);
    });

    it("should map dates correctly", async () => {
      const createdAt = new Date("2024-01-15T10:30:00Z");

      const categoryWithDates = {
        ...mockCategory1,
        getCreatedAt: jest.fn().mockReturnValue(createdAt),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.browse.mockResolvedValue([categoryWithDates]);

      const summaryWithDate = {
        ...mockSummaryView1,
        createdAt,
      };

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithDate);

      const result = await useCase.execute(mockCommand);
      expect(result[0].createdAt).toEqual(createdAt);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message without parameters", async () => {
      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "BrowseProductCategoriesUseCase",
        event: "BROWSE_PRODUCT_CATEGORIES_STARTED",
        message: "Product categories are being retrieved",
      });
    });

    it("should log successful browse with duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "BrowseProductCategoriesUseCase",
        event: "BROWSE_PRODUCT_CATEGORIES_SUCCESSFUL",
        message: "Product categories retrieved successfully",
        durationMs: 150,
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful browse with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      setupMapperMock();
      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "BrowseProductCategoriesUseCase",
        event: "BROWSE_PRODUCT_CATEGORIES_SUCCESSFUL",
        message: "Product categories retrieved successfully",
        durationMs: 250,
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when repository error occurs", async () => {
      const repoError = new Error("Repository error");
      mockProductCategoryRepository.browse.mockRejectedValue(repoError);

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
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle large result set", async () => {
      const largeCategorySet: ProductCategory[] = Array.from(
        { length: 100 },
        (_, i) =>
          ({
            ...mockCategory1,
            getId: jest.fn().mockReturnValue(`cat-${i}`),
            getName: jest.fn().mockReturnValue(`Category ${i}`),
            getSortOrder: jest.fn().mockReturnValue(i + 1),
          }) as unknown as ProductCategory,
      );

      mockProductCategoryRepository.browse.mockResolvedValue(largeCategorySet);

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockImplementation((category) => ({
        id: category.getId(),
        name: category.getName(),
        imageUrl: category.getImageUrl(),
        status: category.getStatus(),
        sortOrder: category.getSortOrder(),
        createdAt: category.getCreatedAt(),
      }));

      const result = await useCase.execute(mockCommand);

      expect(result).toHaveLength(100);
      expect(result[0].id).toBe("cat-0");
      expect(result[99].id).toBe("cat-99");
    });

    it("should handle multiple browses with different commands", async () => {
      const commands = [
        { status: ProductCategoryStatus.ACTIVE },
        { status: ProductCategoryStatus.INACTIVE },
        { sort: ProductCategorySort.NAME_DESC },
      ];

      for (const command of commands) {
        mockProductCategoryRepository.browse.mockResolvedValue([mockCategory1]);
        (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(mockSummaryView1);

        const result = await useCase.execute(command);
        expect(result).toHaveLength(1);
        expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(command);
      }
    });

    it("should handle browse with no results multiple times", async () => {
      mockProductCategoryRepository.browse.mockResolvedValue([]);

      const firstResult = await useCase.execute(mockCommand);
      const secondResult = await useCase.execute(mockCommand);

      expect(firstResult).toEqual([]);
      expect(secondResult).toEqual([]);
      expect(mockProductCategoryRepository.browse).toHaveBeenCalledTimes(2);
      expect(ProductCategoryMapper.toSummaryView).not.toHaveBeenCalled();
    });

    it("should handle categories with empty name", async () => {
      const categoryWithEmptyName = {
        ...mockCategory1,
        getName: jest.fn().mockReturnValue(""),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.browse.mockResolvedValue([categoryWithEmptyName]);

      const summaryWithEmptyName = {
        ...mockSummaryView1,
        name: "",
      };

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithEmptyName);

      const result = await useCase.execute(mockCommand);
      expect(result[0].name).toBe("");
    });

    it("should handle categories with long name", async () => {
      const longName = "A".repeat(1000);
      const categoryWithLongName = {
        ...mockCategory1,
        getName: jest.fn().mockReturnValue(longName),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.browse.mockResolvedValue([categoryWithLongName]);

      const summaryWithLongName = {
        ...mockSummaryView1,
        name: longName,
      };

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithLongName);

      const result = await useCase.execute(mockCommand);
      expect(result[0].name).toBe(longName);
    });

    it("should handle categories with special characters", async () => {
      const specialName = "Category!@#$%^&*()";
      const categoryWithSpecialName = {
        ...mockCategory1,
        getName: jest.fn().mockReturnValue(specialName),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.browse.mockResolvedValue([categoryWithSpecialName]);

      const summaryWithSpecialName = {
        ...mockSummaryView1,
        name: specialName,
      };

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithSpecialName);

      const result = await useCase.execute(mockCommand);
      expect(result[0].name).toBe(specialName);
    });

    it("should handle sorting by different fields", async () => {
      const sortFields = [
        ProductCategorySort.NAME_ASC,
        ProductCategorySort.NAME_DESC,
        ProductCategorySort.SORT_ORDER_ASC,
        ProductCategorySort.SORT_ORDER_DESC,
      ];

      for (const sort of sortFields) {
        const sortCommand: BrowseProductCategoriesCommand = {
          sort,
        };

        setupMapperMock();
        await useCase.execute(sortCommand);
        expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(sortCommand);
      }
    });

    it("should handle status filtering", async () => {
      const statuses = [ProductCategoryStatus.ACTIVE, ProductCategoryStatus.INACTIVE];

      for (const status of statuses) {
        const statusCommand: BrowseProductCategoriesCommand = {
          status,
        };

        setupMapperMock();
        await useCase.execute(statusCommand);
        expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(statusCommand);
      }
    });

    it("should handle categories with Unicode characters in name", async () => {
      const unicodeName = "🚀 Category with emoji 🎉";
      const categoryWithUnicode = {
        ...mockCategory1,
        getName: jest.fn().mockReturnValue(unicodeName),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.browse.mockResolvedValue([categoryWithUnicode]);

      const summaryWithUnicode = {
        ...mockSummaryView1,
        name: unicodeName,
      };

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce(summaryWithUnicode);

      const result = await useCase.execute(mockCommand);
      expect(result[0].name).toBe(unicodeName);
    });
  });

  describe("return value verification", () => {
    it("should return array of ProductCategorySummaryView", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("imageUrl");
      expect(result[0]).toHaveProperty("status");
      expect(result[0]).toHaveProperty("sortOrder");
      expect(result[0]).toHaveProperty("createdAt");
    });

    it("should return correct data types", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);

      expect(typeof result[0].id).toBe("string");
      expect(typeof result[0].name).toBe("string");
      expect(result[0].imageUrl === null || typeof result[0].imageUrl === "string").toBe(true);
      expect(typeof result[0].status).toBe("string");
      expect(typeof result[0].sortOrder).toBe("number");
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it("should maintain order of categories", async () => {
      const orderedCategories = [
        { ...mockCategory1, getId: jest.fn().mockReturnValue("first") },
        { ...mockCategory2, getId: jest.fn().mockReturnValue("second") },
        { ...mockCategory3, getId: jest.fn().mockReturnValue("third") },
      ] as unknown as ProductCategory[];

      mockProductCategoryRepository.browse.mockResolvedValue(orderedCategories);

      (ProductCategoryMapper.toSummaryView as jest.Mock)
        .mockReset()
        .mockReturnValueOnce({ ...mockSummaryView1, id: "first" })
        .mockReturnValueOnce({ ...mockSummaryView2, id: "second" })
        .mockReturnValueOnce({ ...mockSummaryView3, id: "third" });

      const result = await useCase.execute(mockCommand);

      expect(result[0].id).toBe("first");
      expect(result[1].id).toBe("second");
      expect(result[2].id).toBe("third");
    });
  });

  describe("error handling scenarios", () => {
    it("should handle repository timeout error", async () => {
      const timeoutError = new Error("Timeout error");
      mockProductCategoryRepository.browse.mockRejectedValue(timeoutError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Timeout error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository connection error", async () => {
      const connectionError = new Error("Database connection error");
      mockProductCategoryRepository.browse.mockRejectedValue(connectionError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Database connection error");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle null values from repository", async () => {
      const categoryWithNullValues = {
        getId: jest.fn().mockReturnValue(null),
        getName: jest.fn().mockReturnValue(null),
        getImageUrl: jest.fn().mockReturnValue(null),
        getStatus: jest.fn().mockReturnValue(null),
        getSortOrder: jest.fn().mockReturnValue(null),
        getCreatedAt: jest.fn().mockReturnValue(null),
        getUpdatedAt: jest.fn().mockReturnValue(null),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.browse.mockResolvedValue([categoryWithNullValues]);

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce({
        id: null,
        name: null,
        imageUrl: null,
        status: null,
        sortOrder: null,
        createdAt: null,
      });

      const result = await useCase.execute(mockCommand);
      expect(result[0].id).toBeNull();
      expect(result[0].name).toBeNull();
      expect(result[0].imageUrl).toBeNull();
      expect(result[0].status).toBeNull();
      expect(result[0].sortOrder).toBeNull();
      expect(result[0].createdAt).toBeNull();
    });

    it("should handle repository returning empty array", async () => {
      mockProductCategoryRepository.browse.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);
      expect(result).toEqual([]);
    });

    it("should handle logger info throwing error", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      setupMapperMock();
      await expect(useCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("private method behavior", () => {
    it("should call browse on repository", async () => {
      setupMapperMock();
      await useCase.execute(mockCommand);
      expect(mockProductCategoryRepository.browse).toHaveBeenCalledTimes(1);
    });

    it("should map all categories using toSummaryView", async () => {
      setupMapperMock();
      const result = await useCase.execute(mockCommand);
      expect(result).toHaveLength(3);
      expect(ProductCategoryMapper.toSummaryView).toHaveBeenCalledTimes(3);
    });

    it("should handle empty result from browse", async () => {
      mockProductCategoryRepository.browse.mockResolvedValue([]);

      const result = await useCase.execute(mockCommand);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(ProductCategoryMapper.toSummaryView).not.toHaveBeenCalled();
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle category with null createdAt", async () => {
      const categoryWithNullCreatedAt = {
        ...mockCategory1,
        getCreatedAt: jest.fn().mockReturnValue(null),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.browse.mockResolvedValue([categoryWithNullCreatedAt]);

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce({
        ...mockSummaryView1,
        createdAt: null,
      });

      const result = await useCase.execute(mockCommand);
      expect(result[0].createdAt).toBeNull();
    });

    it("should handle command with sort and status combined", async () => {
      const combinedCommand: BrowseProductCategoriesCommand = {
        status: ProductCategoryStatus.ACTIVE,
        sort: ProductCategorySort.SORT_ORDER_ASC,
      };

      setupMapperMock();
      await useCase.execute(combinedCommand);
      expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(combinedCommand);
    });

    it("should handle very large sortOrder values", async () => {
      const largeSortOrder = Number.MAX_SAFE_INTEGER;
      const categoryWithLargeSort = {
        ...mockCategory1,
        getSortOrder: jest.fn().mockReturnValue(largeSortOrder),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.browse.mockResolvedValue([categoryWithLargeSort]);

      (ProductCategoryMapper.toSummaryView as jest.Mock).mockReset().mockReturnValueOnce({
        ...mockSummaryView1,
        sortOrder: largeSortOrder,
      });

      const result = await useCase.execute(mockCommand);
      expect(result[0].sortOrder).toBe(largeSortOrder);
    });

    it("should handle command with undefined values", async () => {
      const commandWithUndefined: BrowseProductCategoriesCommand = {
        status: undefined,
        sort: undefined,
      };

      setupMapperMock();
      await useCase.execute(commandWithUndefined);
      expect(mockProductCategoryRepository.browse).toHaveBeenCalledWith(commandWithUndefined);
    });
  });
});
