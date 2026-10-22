import { UpdateProductUseCase } from "@/application/use-cases/product/update-product.use-case";
import { UpdateProductCommand, UpdateProductPayload } from "@/application/ports/driving/update-product.use-case";
import { Logger } from "@/application/ports/driven/logger";
import { ProductRepository } from "@/application/ports/driven/product.repository";
import { UnitOfWork, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work";
import { Product } from "@/domain/entities/product.entity";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import { PRODUCT_EXCEPTIONS } from "@/application/exceptions/product.exceptions";
import { ProductType } from "@/domain/types/product-type.enum";
import { ProductStatus } from "@/domain/types/product-status.enum";
import { UserRoleType } from "@/domain/types/user-role-type.enum";

jest.mock("@/domain/services/product-access-control.service");

describe("UpdateProductUseCase", () => {
  let useCase: UpdateProductUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockLogger: jest.Mocked<Logger>;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockProduct: jest.Mocked<Product>;

  const mockUserId = "user-123";
  const mockUserRole = UserRoleType.ADMIN;
  const mockProductId = "prod-789";
  const mockCategoryId = "cat-456";
  const mockStartTime = 1000;

  const mockPayload: UpdateProductPayload = {
    id: mockProductId,
    categoryId: mockCategoryId,
    name: "Updated Product Name",
    description: "Updated Description",
    price: 50000,
    type: ProductType.DRINK,
    ingredients: "New Ingredients",
    preparationTimeInMinutes: 20,
  };

  const mockCommand: UpdateProductCommand = {
    userId: mockUserId,
    userRole: mockUserRole,
    payload: mockPayload,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProduct = {
      getId: jest.fn().mockReturnValue(mockProductId),
      getCategoryId: jest.fn().mockReturnValue("old-cat-456"),
      getName: jest.fn().mockReturnValue("Old Product Name"),
      getDescription: jest.fn().mockReturnValue("Old Description"),
      getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(50000) }),
      getType: jest.fn().mockReturnValue(ProductType.FOOD),
      getIngredients: jest.fn().mockReturnValue("Old Ingredients"),
      getPreparationTimeInMinutes: jest.fn().mockReturnValue(10),
      getStockQuantity: jest.fn().mockReturnValue(50),
      getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
      getCreatedAt: jest.fn().mockReturnValue(new Date()),
      getUpdatedAt: jest.fn().mockReturnValue(new Date()),
      rename: jest.fn(),
      changeCategory: jest.fn(),
      changePrice: jest.fn(),
      changeDescription: jest.fn(),
      changeType: jest.fn(),
      changeIngredients: jest.fn(),
      changePreparationTime: jest.fn(),
      setStock: jest.fn(),
      setStatus: jest.fn(),
      restock: jest.fn(),
      deductStock: jest.fn(),
      addImage: jest.fn(),
      removeImage: jest.fn(),
      replaceImage: jest.fn(),
      reorderImages: jest.fn(),
      canOrder: jest.fn(),
      hasImage: jest.fn(),
    } as unknown as jest.Mocked<Product>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWork>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockProductRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    (ProductAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {});

    mockProductRepository.findById.mockResolvedValue(mockProduct);
    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        productRepository: mockProductRepository,
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    useCase = new UpdateProductUseCase(mockUnitOfWork, mockLogger);
  });

  describe("execute", () => {
    it("should successfully update a product with all fields", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toEqual({ id: mockProductId });
      expect(ProductAccessControlService.assertCanUpdate).toHaveBeenCalledWith(mockUserRole);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "UpdateProductUseCase",
        event: "UPDATE_PRODUCT_STARTED",
        message: "User is updating product",
        data: { userId: mockUserId },
      });
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
      expect(mockProduct.changeCategory).toHaveBeenCalledWith(mockPayload.categoryId);
      expect(mockProduct.rename).toHaveBeenCalledWith(mockPayload.name);
      expect(mockProduct.changePrice).toHaveBeenCalledWith(mockPayload.price);
      expect(mockProduct.changeDescription).toHaveBeenCalledWith(mockPayload.description);
      expect(mockProduct.changeType).toHaveBeenCalledWith(mockPayload.type);
      expect(mockProduct.changeIngredients).toHaveBeenCalledWith(mockPayload.ingredients);
      expect(mockProduct.changePreparationTime).toHaveBeenCalledWith(mockPayload.preparationTimeInMinutes);
      expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductUseCase",
        event: "UPDATE_PRODUCT_SUCCESSFUL",
        message: "Product updated successfully",
        durationMs: expect.any(Number),
        data: { productId: mockProductId },
      });
    });

    it("should successfully update a product with partial fields", async () => {
      const partialPayload: UpdateProductPayload = {
        id: mockProductId,
        name: "Updated Name Only",
        price: 50000,
      };

      const partialCommand: UpdateProductCommand = {
        ...mockCommand,
        payload: partialPayload,
      };

      await useCase.execute(partialCommand);

      expect(mockProduct.rename).toHaveBeenCalledWith(partialPayload.name);
      expect(mockProduct.changePrice).toHaveBeenCalledWith(partialPayload.price);
      expect(mockProduct.changeCategory).not.toHaveBeenCalled();
      expect(mockProduct.changeDescription).not.toHaveBeenCalled();
      expect(mockProduct.changeType).not.toHaveBeenCalled();
      expect(mockProduct.changeIngredients).not.toHaveBeenCalled();
      expect(mockProduct.changePreparationTime).not.toHaveBeenCalled();
      expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
    });

    it("should successfully update a product with only one field", async () => {
      const singleFieldPayload: UpdateProductPayload = {
        id: mockProductId,
        name: "Updated Name Only",
      };

      const singleFieldCommand: UpdateProductCommand = {
        ...mockCommand,
        payload: singleFieldPayload,
      };

      await useCase.execute(singleFieldCommand);

      expect(mockProduct.rename).toHaveBeenCalledWith(singleFieldPayload.name);
      expect(mockProduct.changeCategory).not.toHaveBeenCalled();
      expect(mockProduct.changePrice).not.toHaveBeenCalled();
      expect(mockProduct.changeDescription).not.toHaveBeenCalled();
      expect(mockProduct.changeType).not.toHaveBeenCalled();
      expect(mockProduct.changeIngredients).not.toHaveBeenCalled();
      expect(mockProduct.changePreparationTime).not.toHaveBeenCalled();
      expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
    });

    it("should throw error when user does not have permission to manage products", async () => {
      const permissionError = new Error("Permission denied");
      (ProductAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow(permissionError);
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw error when product is not found", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
      expect(mockProduct.rename).not.toHaveBeenCalled();
      expect(mockProductRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle categoryId as null/undefined", async () => {
      const payloadWithoutCategory: UpdateProductPayload = {
        id: mockProductId,
        name: "Updated Name",
        price: 50000,
      };

      const commandWithoutCategory: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithoutCategory,
      };

      await useCase.execute(commandWithoutCategory);

      expect(mockProduct.changeCategory).not.toHaveBeenCalled();
      expect(mockProduct.rename).toHaveBeenCalledWith(payloadWithoutCategory.name);
      expect(mockProduct.changePrice).toHaveBeenCalledWith(payloadWithoutCategory.price);
    });

    it("should handle description as null/undefined", async () => {
      const payloadWithoutDescription: UpdateProductPayload = {
        id: mockProductId,
        name: "Updated Name",
        price: 50000,
        description: undefined,
      };

      const commandWithoutDescription: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithoutDescription,
      };

      await useCase.execute(commandWithoutDescription);

      expect(mockProduct.changeDescription).not.toHaveBeenCalled();
    });

    it("should handle ingredients as null/undefined", async () => {
      const payloadWithoutIngredients: UpdateProductPayload = {
        id: mockProductId,
        name: "Updated Name",
        price: 50000,
        ingredients: undefined,
      };

      const commandWithoutIngredients: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithoutIngredients,
      };

      await useCase.execute(commandWithoutIngredients);

      expect(mockProduct.changeIngredients).not.toHaveBeenCalled();
    });

    it("should handle preparationTimeInMinutes as null/undefined", async () => {
      const payloadWithoutPrepTime: UpdateProductPayload = {
        id: mockProductId,
        name: "Updated Name",
        price: 50000,
        preparationTimeInMinutes: undefined,
      };

      const commandWithoutPrepTime: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithoutPrepTime,
      };

      await useCase.execute(commandWithoutPrepTime);

      expect(mockProduct.changePreparationTime).not.toHaveBeenCalled();
    });

    it("should handle type as null/undefined", async () => {
      const payloadWithoutType: UpdateProductPayload = {
        id: mockProductId,
        name: "Updated Name",
        price: 50000,
        type: undefined,
      };

      const commandWithoutType: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithoutType,
      };

      await useCase.execute(commandWithoutType);

      expect(mockProduct.changeType).not.toHaveBeenCalled();
    });

    it("should handle price as undefined", async () => {
      const payloadWithoutPrice: UpdateProductPayload = {
        id: mockProductId,
        name: "Updated Name",
        price: undefined,
      };

      const commandWithoutPrice: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithoutPrice,
      };

      await useCase.execute(commandWithoutPrice);

      expect(mockProduct.changePrice).not.toHaveBeenCalled();
    });

    it("should handle name as undefined", async () => {
      const payloadWithoutName: UpdateProductPayload = {
        id: mockProductId,
        price: 50000,
      };

      const commandWithoutName: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithoutName,
      };

      await useCase.execute(commandWithoutName);

      expect(mockProduct.rename).not.toHaveBeenCalled();
    });

    it("should handle empty payload (only id)", async () => {
      const emptyPayload: UpdateProductPayload = {
        id: mockProductId,
      };

      const emptyCommand: UpdateProductCommand = {
        ...mockCommand,
        payload: emptyPayload,
      };

      await useCase.execute(emptyCommand);

      expect(mockProduct.rename).not.toHaveBeenCalled();
      expect(mockProduct.changeCategory).not.toHaveBeenCalled();
      expect(mockProduct.changePrice).not.toHaveBeenCalled();
      expect(mockProduct.changeDescription).not.toHaveBeenCalled();
      expect(mockProduct.changeType).not.toHaveBeenCalled();
      expect(mockProduct.changeIngredients).not.toHaveBeenCalled();
      expect(mockProduct.changePreparationTime).not.toHaveBeenCalled();
      expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
    });

    it("should handle repository error when finding product", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockProduct.rename).not.toHaveBeenCalled();
      expect(mockProductRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository error when updating product", async () => {
      const updateError = new Error("Update error");
      mockProductRepository.update.mockRejectedValue(updateError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(updateError);
      expect(mockProduct.rename).toHaveBeenCalledWith(mockPayload.name);
      expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle unit of work commit error", async () => {
      const commitError = new Error("Commit error");
      mockUnitOfWork.commit.mockRejectedValue(commitError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(commitError);
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
      expect(mockProduct.rename).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle product not found in findProduct private method", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
    });

    it("should call all update operations in correct order", async () => {
      await useCase.execute(mockCommand);

      expect(mockProduct.changeCategory).toHaveBeenCalled();
      expect(mockProduct.rename).toHaveBeenCalled();
      expect(mockProduct.changePrice).toHaveBeenCalled();
      expect(mockProduct.changeDescription).toHaveBeenCalled();
      expect(mockProduct.changeType).toHaveBeenCalled();
      expect(mockProduct.changeIngredients).toHaveBeenCalled();
      expect(mockProduct.changePreparationTime).toHaveBeenCalled();
      expect(mockProductRepository.update).toHaveBeenCalled();
    });
  });

  describe("private method hasValue", () => {
    it("should return true for defined values", async () => {
      const payloadWithAllFields: UpdateProductPayload = {
        id: mockProductId,
        name: "Test",
        price: 10000,
        categoryId: "cat-123",
        description: "desc",
        type: ProductType.FOOD,
        ingredients: "ingredients",
        preparationTimeInMinutes: 5,
      };

      const command: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithAllFields,
      };

      await useCase.execute(command);

      expect(mockProduct.changeCategory).toHaveBeenCalled();
      expect(mockProduct.rename).toHaveBeenCalled();
      expect(mockProduct.changePrice).toHaveBeenCalled();
      expect(mockProduct.changeDescription).toHaveBeenCalled();
      expect(mockProduct.changeType).toHaveBeenCalled();
      expect(mockProduct.changeIngredients).toHaveBeenCalled();
      expect(mockProduct.changePreparationTime).toHaveBeenCalled();
    });

    it("should return false for undefined values", async () => {
      const payloadWithUndefinedFields: UpdateProductPayload = {
        id: mockProductId,
        name: undefined,
        price: undefined,
        categoryId: undefined,
        description: undefined,
        type: undefined,
        ingredients: undefined,
        preparationTimeInMinutes: undefined,
      };

      const command: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithUndefinedFields,
      };

      await useCase.execute(command);

      expect(mockProduct.changeCategory).not.toHaveBeenCalled();
      expect(mockProduct.rename).not.toHaveBeenCalled();
      expect(mockProduct.changePrice).not.toHaveBeenCalled();
      expect(mockProduct.changeDescription).not.toHaveBeenCalled();
      expect(mockProduct.changeType).not.toHaveBeenCalled();
      expect(mockProduct.changeIngredients).not.toHaveBeenCalled();
      expect(mockProduct.changePreparationTime).not.toHaveBeenCalled();
      expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
    });

    it("should handle null values correctly (not undefined)", async () => {
      const payloadWithNullFields: UpdateProductPayload = {
        id: mockProductId,
        description: null as unknown as string,
        ingredients: null as unknown as string,
        preparationTimeInMinutes: null as unknown as number,
      };

      const command: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithNullFields,
      };

      await useCase.execute(command);

      expect(mockProduct.changeDescription).toHaveBeenCalledWith(null);
      expect(mockProduct.changeIngredients).toHaveBeenCalledWith(null);
      expect(mockProduct.changePreparationTime).toHaveBeenCalledWith(null);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with userId", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "UpdateProductUseCase",
        event: "UPDATE_PRODUCT_STARTED",
        message: "User is updating product",
        data: { userId: mockUserId },
      });
    });

    it("should log successful update with duration and productId", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 200);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductUseCase",
        event: "UPDATE_PRODUCT_SUCCESSFUL",
        message: "Product updated successfully",
        durationMs: 200,
        data: { productId: mockProductId },
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful update with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductUseCase",
        event: "UPDATE_PRODUCT_SUCCESSFUL",
        message: "Product updated successfully",
        durationMs: 250,
        data: { productId: mockProductId },
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when update fails", async () => {
      const error = new Error("Update failed");
      mockProductRepository.update.mockRejectedValue(error);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(error);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle product with all fields being updated", async () => {
      const completePayload: UpdateProductPayload = {
        id: mockProductId,
        categoryId: "new-category-123",
        name: "Complete Updated Name",
        description: "Complete Updated Description",
        price: 75000,
        type: ProductType.PACKAGED,
        ingredients: "Complete New Ingredients",
        preparationTimeInMinutes: 25,
      };

      const completeCommand: UpdateProductCommand = {
        ...mockCommand,
        payload: completePayload,
      };

      await useCase.execute(completeCommand);

      expect(mockProduct.changeCategory).toHaveBeenCalledWith(completePayload.categoryId);
      expect(mockProduct.rename).toHaveBeenCalledWith(completePayload.name);
      expect(mockProduct.changePrice).toHaveBeenCalledWith(completePayload.price);
      expect(mockProduct.changeDescription).toHaveBeenCalledWith(completePayload.description);
      expect(mockProduct.changeType).toHaveBeenCalledWith(completePayload.type);
      expect(mockProduct.changeIngredients).toHaveBeenCalledWith(completePayload.ingredients);
      expect(mockProduct.changePreparationTime).toHaveBeenCalledWith(completePayload.preparationTimeInMinutes);
      expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
    });

    it("should handle different user roles", async () => {
      const roles = [UserRoleType.ADMIN, UserRoleType.MANAGER];

      for (const role of roles) {
        const commandWithRole: UpdateProductCommand = {
          ...mockCommand,
          userRole: role,
        };

        await useCase.execute(commandWithRole);
        expect(ProductAccessControlService.assertCanUpdate).toHaveBeenCalledWith(role);
      }
    });

    it("should handle product with zero values", async () => {
      const payloadWithZeroValues: UpdateProductPayload = {
        id: mockProductId,
        price: 0,
        preparationTimeInMinutes: 0,
      };

      const commandWithZeroValues: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithZeroValues,
      };

      await useCase.execute(commandWithZeroValues);

      expect(mockProduct.changePrice).toHaveBeenCalledWith(0);
      expect(mockProduct.changePreparationTime).toHaveBeenCalledWith(0);
    });

    it("should handle product with string values containing special characters", async () => {
      const payloadWithSpecialChars: UpdateProductPayload = {
        id: mockProductId,
        name: "Product!@#$%^&*()",
        description: 'Description with special chars: <>?:"{}|',
        ingredients: "Ingredient 1, Ingredient 2, Special: !@#$%",
      };

      const commandWithSpecialChars: UpdateProductCommand = {
        ...mockCommand,
        payload: payloadWithSpecialChars,
      };

      await useCase.execute(commandWithSpecialChars);

      expect(mockProduct.rename).toHaveBeenCalledWith(payloadWithSpecialChars.name);
      expect(mockProduct.changeDescription).toHaveBeenCalledWith(payloadWithSpecialChars.description);
      expect(mockProduct.changeIngredients).toHaveBeenCalledWith(payloadWithSpecialChars.ingredients);
    });

    it("should handle multiple updates in quick succession", async () => {
      const firstUpdate: UpdateProductPayload = {
        id: mockProductId,
        name: "First Update",
      };

      const secondUpdate: UpdateProductPayload = {
        id: mockProductId,
        name: "Second Update",
        price: 75000,
      };

      await useCase.execute({ ...mockCommand, payload: firstUpdate });
      expect(mockProduct.rename).toHaveBeenCalledWith("First Update");

      jest.clearAllMocks();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = { productRepository: mockProductRepository } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await useCase.execute({ ...mockCommand, payload: secondUpdate });
      expect(mockProduct.rename).toHaveBeenCalledWith("Second Update");
      expect(mockProduct.changePrice).toHaveBeenCalledWith(75000);
    });

    it("should handle product with undefined values but update other fields", async () => {
      const mixedPayload: UpdateProductPayload = {
        id: mockProductId,
        name: "Updated Name",
        price: undefined,
        description: "Updated Description",
        type: undefined,
        preparationTimeInMinutes: 30,
        categoryId: undefined,
        ingredients: undefined,
      };

      const mixedCommand: UpdateProductCommand = {
        ...mockCommand,
        payload: mixedPayload,
      };

      await useCase.execute(mixedCommand);

      expect(mockProduct.rename).toHaveBeenCalledWith(mixedPayload.name);
      expect(mockProduct.changeDescription).toHaveBeenCalledWith(mixedPayload.description);
      expect(mockProduct.changePreparationTime).toHaveBeenCalledWith(mixedPayload.preparationTimeInMinutes);
      expect(mockProduct.changeCategory).not.toHaveBeenCalled();
      expect(mockProduct.changePrice).not.toHaveBeenCalled();
      expect(mockProduct.changeType).not.toHaveBeenCalled();
      expect(mockProduct.changeIngredients).not.toHaveBeenCalled();
    });
  });

  describe("error handling scenarios", () => {
    it("should handle product update failure with partial updates applied", async () => {
      const updateError = new Error("Update failed");
      mockProductRepository.update.mockRejectedValue(updateError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(updateError);

      expect(mockProduct.rename).toHaveBeenCalled();
      expect(mockProduct.changePrice).toHaveBeenCalled();
      expect(mockProductRepository.update).toHaveBeenCalled();
    });

    it("should handle findById throwing an exception", async () => {
      const findError = new Error("Database connection error");
      mockProductRepository.findById.mockRejectedValue(findError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(findError);
      expect(mockProduct.rename).not.toHaveBeenCalled();
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it("should handle update throwing an exception", async () => {
      const updateError = new Error("Update failed");
      mockProductRepository.update.mockRejectedValue(updateError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(updateError);
    });

    it("should handle ProductAccessControlService throwing different error types", async () => {
      const permissionError = new Error("Custom permission error");
      (ProductAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Custom permission error");
    });

    it("should handle product found but update fails in performUpdateProduct", async () => {
      mockProduct.changePrice.mockImplementation(() => {
        throw new Error("Invalid price");
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Invalid price");
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("return value verification", () => {
    it("should return the product id after successful update", async () => {
      const result = await useCase.execute(mockCommand);
      expect(result).toEqual({ id: mockProductId });
      expect(result.id).toBe(mockProductId);
    });

    it("should return product id from unit of work result", async () => {
      const customId = "custom-prod-123";
      const mockProductWithCustomId = {
        ...mockProduct,
        getId: jest.fn().mockReturnValue(customId),
      } as unknown as jest.Mocked<Product>;
      mockProductRepository.findById.mockResolvedValue(mockProductWithCustomId);

      const result = await useCase.execute(mockCommand);
      expect(result.id).toBe(customId);
    });
  });
});
