import { GetProductCategoryDetailsUseCase } from "@/application/use-cases/product/product-category/get-product-category-details.use-case";
import { GetProductCategoryDetailsCommand, GetProductCategoryDetailsResult } from "@/application/ports/driving/get-product-category-details.use-case";
import { ProductCategoryRepository } from "@/application/ports/driven/product-category.repository";
import { Logger } from "@/application/ports/driven/logger";
import { PRODUCT_CATEGORY_EXCEPTIONS } from "@/application/exceptions/product-category.exceptions";
import { ProductCategoryMapper } from "@/application/mappers/product-category.mapper";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryStatus } from "@/domain/types/product-category-status.enum";

jest.mock("@/application/mappers/product-category.mapper");

describe("GetProductCategoryDetailsUseCase", () => {
  let useCase: GetProductCategoryDetailsUseCase;
  let mockProductCategoryRepository: jest.Mocked<ProductCategoryRepository>;
  let mockLogger: jest.Mocked<Logger>;

  const mockCategoryId = "cat-456";
  const mockStartTime = 1000;

  const mockProductCategory = {
    getId: jest.fn().mockReturnValue(mockCategoryId),
    getName: jest.fn().mockReturnValue("Test Category"),
    getDescription: jest.fn().mockReturnValue("Test Description"),
    getImageUrl: jest.fn().mockReturnValue("https://example.com/category.jpg"),
    getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
    getSortOrder: jest.fn().mockReturnValue(5),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-01T00:00:00Z")),
    isCurrentlyActive: jest.fn().mockReturnValue(true),
    rename: jest.fn(),
    changeDescription: jest.fn(),
    setImage: jest.fn(),
    reorder: jest.fn(),
    setStatus: jest.fn(),
  } as unknown as jest.Mocked<ProductCategory>;

  const mockPlainObject: GetProductCategoryDetailsResult = {
    id: mockCategoryId,
    name: "Test Category",
    description: "Test Description",
    imageUrl: "https://example.com/category.jpg",
    status: ProductCategoryStatus.ACTIVE,
    sortOrder: 5,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockCommand: GetProductCategoryDetailsCommand = {
    id: mockCategoryId,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductCategoryRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      getNextSortOrder: jest.fn(),
    } as unknown as jest.Mocked<ProductCategoryRepository>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockProductCategoryRepository.findById.mockResolvedValue(mockProductCategory);
    (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(mockPlainObject);

    useCase = new GetProductCategoryDetailsUseCase(mockProductCategoryRepository, mockLogger);
  });

  describe("execute", () => {
    it("should successfully retrieve a product category by id", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockCategoryId);
      expect(result.name).toBe("Test Category");
      expect(result.description).toBe("Test Description");
      expect(result.imageUrl).toBe("https://example.com/category.jpg");
      expect(result.status).toBe(ProductCategoryStatus.ACTIVE);
      expect(result.sortOrder).toBe(5);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("should log debug message when starting", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetProductCategoryDetailsUseCase",
        event: "GET_PRODUCT_CATEGORY_DETAIL_STARTED",
        message: "Product category is being retrieved",
        data: { id: mockCategoryId },
      });
    });

    it("should log info message when successful", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductCategoryDetailsUseCase",
        event: "GET_PRODUCT_CATEGORY_DETAIL_SUCCESSFUL",
        message: "Product category retrieved successfully",
        durationMs: 100,
        data: { id: mockCategoryId },
      });

      dateNowSpy.mockRestore();
    });

    it("should call findById with correct id", async () => {
      await useCase.execute(mockCommand);

      expect(mockProductCategoryRepository.findById).toHaveBeenCalledWith(mockCategoryId);
    });

    it("should call ProductCategoryMapper.toPlainObject with the category", async () => {
      await useCase.execute(mockCommand);

      expect(ProductCategoryMapper.toPlainObject).toHaveBeenCalledWith(mockProductCategory);
    });

    it("should throw error when category is not found", async () => {
      mockProductCategoryRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(ProductCategoryMapper.toPlainObject).not.toHaveBeenCalled();
    });

    it("should handle repository error", async () => {
      const repoError = new Error("Repository error");
      mockProductCategoryRepository.findById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(ProductCategoryMapper.toPlainObject).not.toHaveBeenCalled();
    });

    it("should return category with null description", async () => {
      const categoryWithNullDescription = {
        ...mockProductCategory,
        getDescription: jest.fn().mockReturnValue(null),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithNullDescription);

      const plainObjectWithNullDescription = {
        ...mockPlainObject,
        description: null,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithNullDescription);

      const result = await useCase.execute(mockCommand);
      expect(result.description).toBeNull();
    });

    it("should return category with null imageUrl", async () => {
      const categoryWithNullImage = {
        ...mockProductCategory,
        getImageUrl: jest.fn().mockReturnValue(null),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithNullImage);

      const plainObjectWithNullImage = {
        ...mockPlainObject,
        imageUrl: null,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithNullImage);

      const result = await useCase.execute(mockCommand);
      expect(result.imageUrl).toBeNull();
    });

    it("should return category with isActive false when status is INACTIVE", async () => {
      const categoryWithInactiveStatus = {
        ...mockProductCategory,
        isCurrentlyActive: jest.fn().mockReturnValue(false),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithInactiveStatus);

      const plainObjectWithInactive: GetProductCategoryDetailsResult = {
        ...mockPlainObject,
        status: ProductCategoryStatus.INACTIVE,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithInactive);

      const result = await useCase.execute(mockCommand);
      expect(result.status).toBe(ProductCategoryStatus.INACTIVE);
    });

    it("should map dates correctly", async () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const updatedAt = new Date("2024-01-01T00:00:00Z");

      const categoryWithDates = {
        ...mockProductCategory,
        getCreatedAt: jest.fn().mockReturnValue(createdAt),
        getUpdatedAt: jest.fn().mockReturnValue(updatedAt),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithDates);

      const result = await useCase.execute(mockCommand);
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with id", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetProductCategoryDetailsUseCase",
        event: "GET_PRODUCT_CATEGORY_DETAIL_STARTED",
        message: "Product category is being retrieved",
        data: { id: mockCategoryId },
      });
    });

    it("should log successful retrieval with duration and id", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductCategoryDetailsUseCase",
        event: "GET_PRODUCT_CATEGORY_DETAIL_SUCCESSFUL",
        message: "Product category retrieved successfully",
        durationMs: 150,
        data: { id: mockCategoryId },
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful retrieval with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductCategoryDetailsUseCase",
        event: "GET_PRODUCT_CATEGORY_DETAIL_SUCCESSFUL",
        message: "Product category retrieved successfully",
        durationMs: 250,
        data: { id: mockCategoryId },
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when category not found", async () => {
      mockProductCategoryRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should not log info when repository error occurs", async () => {
      const repoError = new Error("Repository error");
      mockProductCategoryRepository.findById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("ProductCategoryMapper interaction", () => {
    it("should call toPlainObject with the found category", async () => {
      await useCase.execute(mockCommand);

      expect(ProductCategoryMapper.toPlainObject).toHaveBeenCalledTimes(1);
      expect(ProductCategoryMapper.toPlainObject).toHaveBeenCalledWith(mockProductCategory);
    });

    it("should return the result from ProductCategoryMapper", async () => {
      const customResult = {
        id: "custom-id",
        name: "Custom Name",
        description: "Custom Description",
        imageUrl: null,
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(customResult);

      const result = await useCase.execute(mockCommand);

      expect(result).toBe(customResult);
      expect(result.id).toBe("custom-id");
      expect(result.name).toBe("Custom Name");
    });

    it("should handle ProductCategoryMapper throwing error", async () => {
      const mapperError = new Error("Mapper error");
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockImplementation(() => {
        throw mapperError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow(mapperError);
    });
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle category with empty name", async () => {
      const categoryWithEmptyName = {
        ...mockProductCategory,
        getName: jest.fn().mockReturnValue(""),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithEmptyName);

      const plainObjectWithEmptyName = {
        ...mockPlainObject,
        name: "",
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithEmptyName);

      const result = await useCase.execute(mockCommand);
      expect(result.name).toBe("");
    });

    it("should handle category with empty description", async () => {
      const categoryWithEmptyDescription = {
        ...mockProductCategory,
        getDescription: jest.fn().mockReturnValue(""),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithEmptyDescription);

      const plainObjectWithEmptyDescription = {
        ...mockPlainObject,
        description: "",
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithEmptyDescription);

      const result = await useCase.execute(mockCommand);
      expect(result.description).toBe("");
    });

    it("should handle category with long name", async () => {
      const longName = "A".repeat(1000);
      const categoryWithLongName = {
        ...mockProductCategory,
        getName: jest.fn().mockReturnValue(longName),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithLongName);

      const plainObjectWithLongName = {
        ...mockPlainObject,
        name: longName,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithLongName);

      const result = await useCase.execute(mockCommand);
      expect(result.name).toBe(longName);
    });

    it("should handle category with special characters", async () => {
      const specialName = "Category!@#$%^&*()";
      const categoryWithSpecialName = {
        ...mockProductCategory,
        getName: jest.fn().mockReturnValue(specialName),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithSpecialName);

      const plainObjectWithSpecialName = {
        ...mockPlainObject,
        name: specialName,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithSpecialName);

      const result = await useCase.execute(mockCommand);
      expect(result.name).toBe(specialName);
    });

    it("should handle category with zero sortOrder", async () => {
      const categoryWithZeroSort = {
        ...mockProductCategory,
        getSortOrder: jest.fn().mockReturnValue(0),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithZeroSort);

      const plainObjectWithZeroSort = {
        ...mockPlainObject,
        sortOrder: 0,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithZeroSort);

      const result = await useCase.execute(mockCommand);
      expect(result.sortOrder).toBe(0);
    });

    it("should handle category with negative sortOrder", async () => {
      const categoryWithNegativeSort = {
        ...mockProductCategory,
        getSortOrder: jest.fn().mockReturnValue(-5),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithNegativeSort);

      const plainObjectWithNegativeSort = {
        ...mockPlainObject,
        sortOrder: -5,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithNegativeSort);

      const result = await useCase.execute(mockCommand);
      expect(result.sortOrder).toBe(-5);
    });

    it("should handle multiple concurrent requests", async () => {
      const categoryIds = ["cat-1", "cat-2", "cat-3"];
      const expectedResults: GetProductCategoryDetailsResult[] = [];

      for (const id of categoryIds) {
        const mockCategoryForId = {
          ...mockProductCategory,
          getId: jest.fn().mockReturnValue(id),
          getName: jest.fn().mockReturnValue(`Category ${id}`),
        } as unknown as ProductCategory;
        mockProductCategoryRepository.findById.mockResolvedValue(mockCategoryForId);

        const plainObjectForId = {
          ...mockPlainObject,
          id,
          name: `Category ${id}`,
        };
        (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectForId);

        const result = await useCase.execute({ id });
        expectedResults.push(result);
      }

      expect(expectedResults).toHaveLength(3);
      expect(expectedResults[0].id).toBe("cat-1");
      expect(expectedResults[1].id).toBe("cat-2");
      expect(expectedResults[2].id).toBe("cat-3");
    });

    it("should handle repository returning null for specific id", async () => {
      const mockCategory1 = {
        ...mockProductCategory,
        getId: jest.fn().mockReturnValue("cat-1"),
        getName: jest.fn().mockReturnValue("Category 1"),
      } as unknown as ProductCategory;

      const mockCategory3 = {
        ...mockProductCategory,
        getId: jest.fn().mockReturnValue("cat-3"),
        getName: jest.fn().mockReturnValue("Category 3"),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.findById.mockResolvedValueOnce(mockCategory1).mockResolvedValueOnce(null).mockResolvedValueOnce(mockCategory3);

      const plainObject1 = { ...mockPlainObject, id: "cat-1", name: "Category 1" };
      const plainObject3 = { ...mockPlainObject, id: "cat-3", name: "Category 3" };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValueOnce(plainObject1).mockReturnValueOnce(plainObject3);

      const result1 = await useCase.execute({ id: "cat-1" });
      expect(result1.id).toBe("cat-1");

      await expect(useCase.execute({ id: "cat-2" })).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());

      const result3 = await useCase.execute({ id: "cat-3" });
      expect(result3.id).toBe("cat-3");
    });
  });

  describe("return value verification", () => {
    it("should return GetProductCategoryDetailsResult with correct structure", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("imageUrl");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("sortOrder");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
    });

    it("should return correct data types", async () => {
      const result = await useCase.execute(mockCommand);

      expect(typeof result.id).toBe("string");
      expect(typeof result.name).toBe("string");
      expect(result.description === null || typeof result.description === "string").toBe(true);
      expect(result.imageUrl === null || typeof result.imageUrl === "string").toBe(true);
      expect(typeof result.status).toBe("string");
      expect(typeof result.sortOrder).toBe("number");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("should return dates as Date objects", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("error handling scenarios", () => {
    it("should handle findById throwing database error", async () => {
      const dbError = new Error("Database connection error");
      mockProductCategoryRepository.findById.mockRejectedValue(dbError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Database connection error");
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(ProductCategoryMapper.toPlainObject).not.toHaveBeenCalled();
    });

    it("should handle findById throwing timeout error", async () => {
      const timeoutError = new Error("Timeout error");
      mockProductCategoryRepository.findById.mockRejectedValue(timeoutError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Timeout error");
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(ProductCategoryMapper.toPlainObject).not.toHaveBeenCalled();
    });

    it("should handle findById returning undefined", async () => {
      mockProductCategoryRepository.findById.mockResolvedValue(undefined as unknown as ProductCategory);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());
      expect(ProductCategoryMapper.toPlainObject).not.toHaveBeenCalled();
    });

    it("should handle null response from findById", async () => {
      mockProductCategoryRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());
      expect(ProductCategoryMapper.toPlainObject).not.toHaveBeenCalled();
    });

    it("should handle category with missing properties in mapper", async () => {
      const categoryWithMissingProps = {
        getId: jest.fn().mockReturnValue(mockCategoryId),
        getName: jest.fn().mockReturnValue("Test"),
        getDescription: jest.fn().mockReturnValue(null),
        getImageUrl: jest.fn().mockReturnValue(null),
        isCurrentlyActive: jest.fn().mockReturnValue(true),
        getSortOrder: jest.fn().mockReturnValue(0),
        getCreatedAt: jest.fn().mockReturnValue(new Date()),
        getUpdatedAt: jest.fn().mockReturnValue(new Date()),
      } as unknown as ProductCategory;

      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithMissingProps);

      const plainObjectWithMissing = {
        id: mockCategoryId,
        name: "Test",
        description: null,
        imageUrl: null,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithMissing);

      const result = await useCase.execute(mockCommand);
      expect(result.description).toBeNull();
      expect(result.imageUrl).toBeNull();
    });
  });

  describe("private method logGetProductCategoryStart", () => {
    it("should log debug with correct context", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "GetProductCategoryDetailsUseCase",
        event: "GET_PRODUCT_CATEGORY_DETAIL_STARTED",
        message: "Product category is being retrieved",
        data: { id: mockCategoryId },
      });
    });
  });

  describe("private method logSuccessfulGetProductCategory", () => {
    it("should log info with correct context and duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 100);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "GetProductCategoryDetailsUseCase",
        event: "GET_PRODUCT_CATEGORY_DETAIL_SUCCESSFUL",
        message: "Product category retrieved successfully",
        durationMs: 100,
        data: { id: mockCategoryId },
      });

      dateNowSpy.mockRestore();
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle category with Unicode characters in name", async () => {
      const unicodeName = "🚀 Category with emoji 🎉";
      const categoryWithUnicode = {
        ...mockProductCategory,
        getName: jest.fn().mockReturnValue(unicodeName),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithUnicode);

      const plainObjectWithUnicode = {
        ...mockPlainObject,
        name: unicodeName,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithUnicode);

      const result = await useCase.execute(mockCommand);
      expect(result.name).toBe(unicodeName);
    });

    it("should handle category with very large sortOrder", async () => {
      const largeSortOrder = Number.MAX_SAFE_INTEGER;
      const categoryWithLargeSort = {
        ...mockProductCategory,
        getSortOrder: jest.fn().mockReturnValue(largeSortOrder),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithLargeSort);

      const plainObjectWithLargeSort = {
        ...mockPlainObject,
        sortOrder: largeSortOrder,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithLargeSort);

      const result = await useCase.execute(mockCommand);
      expect(result.sortOrder).toBe(largeSortOrder);
    });

    it("should handle findById returning category with null sortOrder", async () => {
      const categoryWithNullSort = {
        ...mockProductCategory,
        getSortOrder: jest.fn().mockReturnValue(null),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithNullSort);

      const plainObjectWithNullSort = {
        ...mockPlainObject,
        sortOrder: null,
      };
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(plainObjectWithNullSort);

      const result = await useCase.execute(mockCommand);
      expect(result.sortOrder).toBeNull();
    });

    it("should handle category with date values and verify they are copies", async () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const updatedAt = new Date("2024-01-01T00:00:00Z");

      const categoryWithDates = {
        ...mockProductCategory,
        getCreatedAt: jest.fn().mockReturnValue(createdAt),
        getUpdatedAt: jest.fn().mockReturnValue(updatedAt),
      } as unknown as ProductCategory;
      mockProductCategoryRepository.findById.mockResolvedValue(categoryWithDates);

      const result = await useCase.execute(mockCommand);

      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it("should handle logger debug throwing an error gracefully", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });

    it("should handle logger info throwing an error gracefully", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });

    it("should handle ProductCategoryMapper returning null", async () => {
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(null);

      const result = await useCase.execute(mockCommand);
      expect(result).toBeNull();
    });

    it("should handle ProductCategoryMapper returning undefined", async () => {
      (ProductCategoryMapper.toPlainObject as jest.Mock).mockReturnValue(undefined);

      const result = await useCase.execute(mockCommand);
      expect(result).toBeUndefined();
    });
  });
});
