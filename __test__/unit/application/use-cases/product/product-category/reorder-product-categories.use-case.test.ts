import { ReorderProductCategoriesUseCase } from "@/application/use-cases/product/product-category/reorder-product-categories.use-case";
import { ReorderProductCategoriesCommand, ReorderProductCategoriesPayload } from "@/application/ports/driving/reorder-product-categories.use-case";
import { UnitOfWork, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work";
import { Logger } from "@/application/ports/driven/logger";
import { PRODUCT_CATEGORY_EXCEPTIONS } from "@/application/exceptions/product-category.exceptions";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { ProductCategoryStatus } from "@/domain/types/product-category-status.enum";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryRepository } from "@/application/ports/driven/product-category.repository";
import { ProductCategoryAccessControlService } from "@/domain/services/product-category-access-control.service";

jest.mock("@/domain/services/product-category-access-control.service");

describe("ReorderProductCategoriesUseCase", () => {
  let useCase: ReorderProductCategoriesUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockLogger: jest.Mocked<Logger>;
  let mockProductCategoryRepository: jest.Mocked<ProductCategoryRepository>;

  const mockUserId = "user-123";
  const mockUserRole = UserRoleType.ADMIN;
  const mockStartTime = 1000;

  const mockCategory1 = {
    getId: jest.fn().mockReturnValue("cat-1"),
    getSortOrder: jest.fn().mockReturnValue(1),
    reorder: jest.fn(),
  } as unknown as jest.Mocked<ProductCategory>;

  const mockCategory2 = {
    getId: jest.fn().mockReturnValue("cat-2"),
    getSortOrder: jest.fn().mockReturnValue(2),
    reorder: jest.fn(),
  } as unknown as jest.Mocked<ProductCategory>;

  const mockCategory3 = {
    getId: jest.fn().mockReturnValue("cat-3"),
    getSortOrder: jest.fn().mockReturnValue(3),
    reorder: jest.fn(),
  } as unknown as jest.Mocked<ProductCategory>;

  const mockAllCategories = [mockCategory1, mockCategory2, mockCategory3];

  const mockReorderPayload: ReorderProductCategoriesPayload[] = [
    { id: "cat-1", sortOrder: 3 },
    { id: "cat-2", sortOrder: 1 },
    { id: "cat-3", sortOrder: 2 },
  ];

  const mockCommand: ReorderProductCategoriesCommand = {
    userId: mockUserId,
    userRole: mockUserRole,
    payload: mockReorderPayload,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductCategoryRepository = {
      findAll: jest.fn(),
      updateMany: jest.fn(),
    } as unknown as jest.Mocked<ProductCategoryRepository>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWork>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    (ProductCategoryAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {});

    mockProductCategoryRepository.findAll.mockResolvedValue(mockAllCategories);
    mockProductCategoryRepository.updateMany.mockResolvedValue(undefined);
    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        productCategoryRepository: mockProductCategoryRepository,
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    useCase = new ReorderProductCategoriesUseCase(mockUnitOfWork, mockLogger);
  });

  describe("execute", () => {
    it("should successfully reorder product categories", async () => {
      await useCase.execute(mockCommand);

      expect(ProductCategoryAccessControlService.assertCanUpdate).toHaveBeenCalledWith(mockUserRole);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "ReorderProductCategoriesUseCase",
        event: "REORDER_PRODUCT_CATEGORIES_STARTED",
        message: "User is reordering product categories",
        data: { userId: mockUserId },
      });
      expect(mockProductCategoryRepository.findAll).toHaveBeenCalled();
      expect(mockCategory1.reorder).toHaveBeenCalledWith(3);
      expect(mockCategory2.reorder).toHaveBeenCalledWith(1);
      expect(mockCategory3.reorder).toHaveBeenCalledWith(2);
      expect(mockProductCategoryRepository.updateMany).toHaveBeenCalledWith(mockAllCategories);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "ReorderProductCategoriesUseCase",
        event: "REORDER_PRODUCT_CATEGORIES_SUCCESSFUL",
        message: "Product category reordered successfully",
        durationMs: expect.any(Number),
        data: { count: 3 },
      });
    });

    it("should throw error when user does not have permission", async () => {
      const permissionError = new Error("Permission denied");
      (ProductCategoryAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow(permissionError);
      expect(mockProductCategoryRepository.findAll).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw error when payload length does not match categories length", async () => {
      const invalidPayload: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 1 },
        { id: "cat-2", sortOrder: 2 },
      ];

      const invalidCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: invalidPayload,
      };

      await expect(useCase.execute(invalidCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.INCOMPLETE_REORDER_LIST());
      expect(mockCategory1.reorder).not.toHaveBeenCalled();
      expect(mockProductCategoryRepository.updateMany).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw error when payload contains unknown category id", async () => {
      const invalidPayload: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 1 },
        { id: "cat-2", sortOrder: 2 },
        { id: "unknown-cat", sortOrder: 3 },
      ];

      const invalidCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: invalidPayload,
      };

      await expect(useCase.execute(invalidCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());
      expect(mockCategory1.reorder).not.toHaveBeenCalled();
      expect(mockProductCategoryRepository.updateMany).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw error when duplicate sort orders exist", async () => {
      const invalidPayload: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 1 },
        { id: "cat-2", sortOrder: 1 },
        { id: "cat-3", sortOrder: 2 },
      ];

      const invalidCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: invalidPayload,
      };

      await expect(useCase.execute(invalidCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.DUPLICATE_SORT_ORDER());
      expect(mockCategory1.reorder).not.toHaveBeenCalled();
      expect(mockProductCategoryRepository.updateMany).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle empty categories list", async () => {
      mockProductCategoryRepository.findAll.mockResolvedValue([]);

      const emptyPayload: ReorderProductCategoriesPayload[] = [];

      const emptyCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: emptyPayload,
      };

      await useCase.execute(emptyCommand);

      expect(mockProductCategoryRepository.findAll).toHaveBeenCalled();
      expect(mockProductCategoryRepository.updateMany).toHaveBeenCalledWith([]);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "ReorderProductCategoriesUseCase",
        event: "REORDER_PRODUCT_CATEGORIES_SUCCESSFUL",
        message: "Product category reordered successfully",
        durationMs: expect.any(Number),
        data: { count: 0 },
      });
    });

    it("should reorder categories with same sort order values but unique", async () => {
      const payloadWithUniqueSorts: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 10 },
        { id: "cat-2", sortOrder: 20 },
        { id: "cat-3", sortOrder: 30 },
      ];

      const commandWithUniqueSorts: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithUniqueSorts,
      };

      await useCase.execute(commandWithUniqueSorts);

      expect(mockCategory1.reorder).toHaveBeenCalledWith(10);
      expect(mockCategory2.reorder).toHaveBeenCalledWith(20);
      expect(mockCategory3.reorder).toHaveBeenCalledWith(30);
    });

    it("should handle negative sort orders", async () => {
      const payloadWithNegativeSorts: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: -5 },
        { id: "cat-2", sortOrder: 0 },
        { id: "cat-3", sortOrder: 5 },
      ];

      const commandWithNegativeSorts: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithNegativeSorts,
      };

      await useCase.execute(commandWithNegativeSorts);

      expect(mockCategory1.reorder).toHaveBeenCalledWith(-5);
      expect(mockCategory2.reorder).toHaveBeenCalledWith(0);
      expect(mockCategory3.reorder).toHaveBeenCalledWith(5);
    });

    it("should handle large sort order numbers", async () => {
      const payloadWithLargeSorts: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 999999 },
        { id: "cat-2", sortOrder: 1000000 },
        { id: "cat-3", sortOrder: 1000001 },
      ];

      const commandWithLargeSorts: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithLargeSorts,
      };

      await useCase.execute(commandWithLargeSorts);

      expect(mockCategory1.reorder).toHaveBeenCalledWith(999999);
      expect(mockCategory2.reorder).toHaveBeenCalledWith(1000000);
      expect(mockCategory3.reorder).toHaveBeenCalledWith(1000001);
    });

    it("should handle repository error when finding all categories", async () => {
      const repoError = new Error("Repository error");
      mockProductCategoryRepository.findAll.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockCategory1.reorder).not.toHaveBeenCalled();
      expect(mockProductCategoryRepository.updateMany).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository error when updating categories", async () => {
      const updateError = new Error("Update error");
      mockProductCategoryRepository.updateMany.mockRejectedValue(updateError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(updateError);
      expect(mockCategory1.reorder).toHaveBeenCalled();
      expect(mockProductCategoryRepository.updateMany).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle unit of work commit error", async () => {
      const commitError = new Error("Commit error");
      mockUnitOfWork.commit.mockRejectedValue(commitError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(commitError);
      expect(mockProductCategoryRepository.findAll).not.toHaveBeenCalled();
      expect(mockCategory1.reorder).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle category with missing reorder method gracefully", async () => {
      const categoryWithoutReorder = {
        getId: jest.fn().mockReturnValue("cat-4"),
        reorder: undefined,
      } as unknown as ProductCategory;

      const categoriesWithMissingMethod = [...mockAllCategories, categoryWithoutReorder];
      mockProductCategoryRepository.findAll.mockResolvedValue(categoriesWithMissingMethod);

      const payloadWithExtra: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 1 },
        { id: "cat-2", sortOrder: 2 },
        { id: "cat-3", sortOrder: 3 },
        { id: "cat-4", sortOrder: 4 },
      ];

      const commandWithExtra: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithExtra,
      };

      await expect(useCase.execute(commandWithExtra)).rejects.toThrow();
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with userId", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "ReorderProductCategoriesUseCase",
        event: "REORDER_PRODUCT_CATEGORIES_STARTED",
        message: "User is reordering product categories",
        data: { userId: mockUserId },
      });
    });

    it("should log successful reorder with count and duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "ReorderProductCategoriesUseCase",
        event: "REORDER_PRODUCT_CATEGORIES_SUCCESSFUL",
        message: "Product category reordered successfully",
        durationMs: 150,
        data: { count: 3 },
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful reorder with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "ReorderProductCategoriesUseCase",
        event: "REORDER_PRODUCT_CATEGORIES_SUCCESSFUL",
        message: "Product category reordered successfully",
        durationMs: 250,
        data: { count: 3 },
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when reorder fails", async () => {
      const error = new Error("Reorder failed");
      mockProductCategoryRepository.updateMany.mockRejectedValue(error);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(error);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle different user roles", async () => {
      const roles = [UserRoleType.ADMIN, UserRoleType.MANAGER];

      for (const role of roles) {
        const commandWithRole: ReorderProductCategoriesCommand = {
          ...mockCommand,
          userRole: role,
        };

        await useCase.execute(commandWithRole);
        expect(ProductCategoryAccessControlService.assertCanUpdate).toHaveBeenCalledWith(role);
      }
    });

    it("should handle single category reorder", async () => {
      const singleCategory = [mockCategory1];
      mockProductCategoryRepository.findAll.mockResolvedValue(singleCategory);

      const singlePayload: ReorderProductCategoriesPayload[] = [{ id: "cat-1", sortOrder: 1 }];

      const singleCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: singlePayload,
      };

      await useCase.execute(singleCommand);

      expect(mockCategory1.reorder).toHaveBeenCalledWith(1);
      expect(mockProductCategoryRepository.updateMany).toHaveBeenCalledWith(singleCategory);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "ReorderProductCategoriesUseCase",
        event: "REORDER_PRODUCT_CATEGORIES_SUCCESSFUL",
        message: "Product category reordered successfully",
        durationMs: expect.any(Number),
        data: { count: 1 },
      });
    });

    it("should handle many categories reorder", async () => {
      const manyCategories = Array.from(
        { length: 50 },
        (_, i) =>
          ({
            getId: jest.fn().mockReturnValue(`cat-${i}`),
            reorder: jest.fn(),
          }) as unknown as ProductCategory,
      );

      mockProductCategoryRepository.findAll.mockResolvedValue(manyCategories);

      const manyPayload: ReorderProductCategoriesPayload[] = manyCategories.map((cat, i) => ({
        id: cat.getId(),
        sortOrder: 50 - i,
      }));

      const manyCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: manyPayload,
      };

      await useCase.execute(manyCommand);

      expect(mockProductCategoryRepository.updateMany).toHaveBeenCalledWith(manyCategories);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "ReorderProductCategoriesUseCase",
        event: "REORDER_PRODUCT_CATEGORIES_SUCCESSFUL",
        message: "Product category reordered successfully",
        durationMs: expect.any(Number),
        data: { count: 50 },
      });
    });

    it("should handle categories with inactive status", async () => {
      const inactiveCategory = {
        getId: jest.fn().mockReturnValue("cat-4"),
        getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.INACTIVE),
        reorder: jest.fn(),
      } as unknown as ProductCategory;

      const categoriesWithInactive = [...mockAllCategories, inactiveCategory];
      mockProductCategoryRepository.findAll.mockResolvedValue(categoriesWithInactive);

      const payloadWithInactive: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 1 },
        { id: "cat-2", sortOrder: 2 },
        { id: "cat-3", sortOrder: 3 },
        { id: "cat-4", sortOrder: 4 },
      ];

      const commandWithInactive: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithInactive,
      };

      await useCase.execute(commandWithInactive);

      expect(inactiveCategory.reorder).toHaveBeenCalledWith(4);
      expect(mockProductCategoryRepository.updateMany).toHaveBeenCalledWith(categoriesWithInactive);
    });

    it("should handle multiple sequential reorders", async () => {
      const firstPayload: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 2 },
        { id: "cat-2", sortOrder: 3 },
        { id: "cat-3", sortOrder: 1 },
      ];

      const firstCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: firstPayload,
      };

      await useCase.execute(firstCommand);

      expect(mockCategory1.reorder).toHaveBeenCalledWith(2);
      expect(mockCategory2.reorder).toHaveBeenCalledWith(3);
      expect(mockCategory3.reorder).toHaveBeenCalledWith(1);

      jest.clearAllMocks();
      mockProductCategoryRepository.findAll.mockResolvedValue(mockAllCategories);
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = { productCategoryRepository: mockProductCategoryRepository } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      const secondPayload: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 3 },
        { id: "cat-2", sortOrder: 1 },
        { id: "cat-3", sortOrder: 2 },
      ];

      const secondCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: secondPayload,
      };

      await useCase.execute(secondCommand);

      expect(mockCategory1.reorder).toHaveBeenCalledWith(3);
      expect(mockCategory2.reorder).toHaveBeenCalledWith(1);
      expect(mockCategory3.reorder).toHaveBeenCalledWith(2);
    });

    it("should handle payload with mixed sort order values", async () => {
      const mixedPayload: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 100 },
        { id: "cat-2", sortOrder: 0 },
        { id: "cat-3", sortOrder: -10 },
      ];

      const mixedCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: mixedPayload,
      };

      await useCase.execute(mixedCommand);

      expect(mockCategory1.reorder).toHaveBeenCalledWith(100);
      expect(mockCategory2.reorder).toHaveBeenCalledWith(0);
      expect(mockCategory3.reorder).toHaveBeenCalledWith(-10);
    });
  });

  describe("validation error messages", () => {
    it("should throw INCOMPLETE_REORDER_LIST with correct message when lengths mismatch", async () => {
      const invalidPayload: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 1 },
        { id: "cat-2", sortOrder: 2 },
      ];

      const invalidCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: invalidPayload,
      };

      try {
        await useCase.execute(invalidCommand);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toEqual(PRODUCT_CATEGORY_EXCEPTIONS.INCOMPLETE_REORDER_LIST());
      }
    });

    it("should throw CATEGORY_NOT_FOUND with correct message when unknown id exists", async () => {
      const invalidPayload: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 1 },
        { id: "cat-2", sortOrder: 2 },
        { id: "unknown-cat", sortOrder: 3 },
      ];

      const invalidCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: invalidPayload,
      };

      try {
        await useCase.execute(invalidCommand);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toEqual(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());
      }
    });

    it("should throw DUPLICATE_SORT_ORDER with correct message when duplicates exist", async () => {
      const invalidPayload: ReorderProductCategoriesPayload[] = [
        { id: "cat-1", sortOrder: 1 },
        { id: "cat-2", sortOrder: 1 },
        { id: "cat-3", sortOrder: 2 },
      ];

      const invalidCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: invalidPayload,
      };

      try {
        await useCase.execute(invalidCommand);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toEqual(PRODUCT_CATEGORY_EXCEPTIONS.DUPLICATE_SORT_ORDER());
      }
    });
  });

  describe("return value verification", () => {
    it("should return void (undefined) on success", async () => {
      const result = await useCase.execute(mockCommand);
      expect(result).toBeUndefined();
    });

    it("should not return any value when reordering empty list", async () => {
      mockProductCategoryRepository.findAll.mockResolvedValue([]);

      const emptyPayload: ReorderProductCategoriesPayload[] = [];
      const emptyCommand: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: emptyPayload,
      };

      const result = await useCase.execute(emptyCommand);
      expect(result).toBeUndefined();
    });
  });

  describe("private method behavior", () => {
    it("should call findAll to fetch categories", async () => {
      await useCase.execute(mockCommand);
      expect(mockProductCategoryRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it("should call updateMany with all categories after reordering", async () => {
      await useCase.execute(mockCommand);
      expect(mockProductCategoryRepository.updateMany).toHaveBeenCalledWith(mockAllCategories);
    });

    it("should call reorder on each category with correct sort order", async () => {
      await useCase.execute(mockCommand);

      expect(mockCategory1.reorder).toHaveBeenCalledTimes(1);
      expect(mockCategory2.reorder).toHaveBeenCalledTimes(1);
      expect(mockCategory3.reorder).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling scenarios", () => {
    it("should handle ProductPolicyService throwing different error types", async () => {
      const permissionError = new Error("Custom permission error");
      (ProductCategoryAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Custom permission error");
    });

    it("should handle findAll returning null", async () => {
      mockProductCategoryRepository.findAll.mockResolvedValue(null as unknown as ProductCategory[]);

      const command: ReorderProductCategoriesCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: mockReorderPayload,
      };

      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it("should handle updateMany throwing specific error", async () => {
      const updateError = new Error("Update failed");
      mockProductCategoryRepository.updateMany.mockRejectedValue(updateError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Update failed");
    });

    it("should handle findAll throwing connection error", async () => {
      const connectionError = new Error("Database connection lost");
      mockProductCategoryRepository.findAll.mockRejectedValue(connectionError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Database connection lost");
    });
  });
});
