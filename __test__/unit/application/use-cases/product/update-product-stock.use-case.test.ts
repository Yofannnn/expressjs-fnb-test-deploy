import { UpdateProductStockUseCase } from "@/application/use-cases/product/update-product-stock.use-case";
import { UpdateProductStockCommand, UpdateProductStockPayload } from "@/application/ports/driving/update-product-stock.use-case";
import { PRODUCT_EXCEPTIONS } from "@/application/exceptions/product.exceptions";
import { Logger } from "@/application/ports/driven/logger";
import { ProductRepository } from "@/application/ports/driven/product.repository";
import { UnitOfWork, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work";
import { Product } from "@/domain/entities/product.entity";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import { ProductStatus } from "@/domain/types/product-status.enum";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { ProductType } from "@/domain/types/product-type.enum";

jest.mock("@/domain/services/product-access-control.service");

describe("UpdateProductStockUseCase", () => {
  let useCase: UpdateProductStockUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockLogger: jest.Mocked<Logger>;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockProduct: jest.Mocked<Product>;

  const mockUserId = "user-123";
  const mockUserRole = UserRoleType.ADMIN;
  const mockProductId = "prod-789";
  const mockStartTime = 1000;

  const mockPayloadWithRestock: UpdateProductStockPayload = {
    id: mockProductId,
    restock: 50,
  };

  const mockPayloadWithDeductStock: UpdateProductStockPayload = {
    id: mockProductId,
    deductStock: 30,
  };

  const mockPayloadWithSetStock: UpdateProductStockPayload = {
    id: mockProductId,
    setStock: 100,
  };

  const mockCommandWithRestock: UpdateProductStockCommand = {
    userId: mockUserId,
    userRole: mockUserRole,
    payload: mockPayloadWithRestock,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProduct = {
      getId: jest.fn().mockReturnValue(mockProductId),
      getCategoryId: jest.fn().mockReturnValue("cat-456"),
      getName: jest.fn().mockReturnValue("Test Product"),
      getDescription: jest.fn().mockReturnValue("Test Description"),
      getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(50000) }),
      getType: jest.fn().mockReturnValue(ProductType.FOOD),
      getIngredients: jest.fn().mockReturnValue("Ingredients"),
      getPreparationTimeInMinutes: jest.fn().mockReturnValue(15),
      getStockQuantity: jest.fn().mockReturnValue(100),
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

    (ProductAccessControlService.assertCanManageStock as jest.Mock).mockImplementation(() => {});

    mockProductRepository.findById.mockResolvedValue(mockProduct);
    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        productRepository: mockProductRepository,
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    useCase = new UpdateProductStockUseCase(mockUnitOfWork, mockLogger);
  });

  describe("execute", () => {
    describe("restock operation", () => {
      it("should successfully restock a product", async () => {
        const result = await useCase.execute(mockCommandWithRestock);

        expect(result).toEqual({ id: mockProductId });
        expect(ProductAccessControlService.assertCanManageStock).toHaveBeenCalledWith(mockUserRole);
        expect(mockLogger.debug).toHaveBeenCalledWith({
          context: "UpdateProductStockUseCase",
          event: "UPDATE_PRODUCT_STOCK_STARTED",
          message: "Starting updating product stock",
          data: { userId: mockUserId },
        });
        expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
        expect(mockProduct.restock).toHaveBeenCalledWith(50);
        expect(mockProduct.deductStock).not.toHaveBeenCalled();
        expect(mockProduct.setStock).not.toHaveBeenCalled();
        expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
        expect(mockLogger.info).toHaveBeenCalledWith({
          context: "UpdateProductStockUseCase",
          event: "UPDATE_PRODUCT_STOCK_SUCCESSFUL",
          message: "Product stock updated successfully",
          durationMs: expect.any(Number),
          data: { productId: mockProductId },
        });
      });
    });

    describe("deductStock operation", () => {
      it("should successfully deduct stock from a product", async () => {
        const commandWithDeduct: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          payload: mockPayloadWithDeductStock,
        };

        const result = await useCase.execute(commandWithDeduct);

        expect(result).toEqual({ id: mockProductId });
        expect(mockProduct.deductStock).toHaveBeenCalledWith(30);
        expect(mockProduct.restock).not.toHaveBeenCalled();
        expect(mockProduct.setStock).not.toHaveBeenCalled();
        expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
      });
    });

    describe("setStock operation", () => {
      it("should successfully set stock for a product", async () => {
        const commandWithSet: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          payload: mockPayloadWithSetStock,
        };

        const result = await useCase.execute(commandWithSet);

        expect(result).toEqual({ id: mockProductId });
        expect(mockProduct.setStock).toHaveBeenCalledWith(100);
        expect(mockProduct.restock).not.toHaveBeenCalled();
        expect(mockProduct.deductStock).not.toHaveBeenCalled();
        expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
      });
    });

    describe("validation", () => {
      it("should throw error when multiple stock operations are provided", async () => {
        const conflictingPayload: UpdateProductStockPayload = {
          id: mockProductId,
          restock: 10,
          deductStock: 5,
        };

        const conflictingCommand: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          payload: conflictingPayload,
        };

        await expect(useCase.execute(conflictingCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.CONFLICTING_STOCK_OPERATION());
        expect(mockProductRepository.findById).not.toHaveBeenCalled();
        expect(mockProduct.restock).not.toHaveBeenCalled();
        expect(mockProduct.deductStock).not.toHaveBeenCalled();
        expect(mockProductRepository.update).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it("should throw error when all three stock operations are provided", async () => {
        const conflictingPayload: UpdateProductStockPayload = {
          id: mockProductId,
          restock: 10,
          deductStock: 5,
          setStock: 20,
        };

        const conflictingCommand: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          payload: conflictingPayload,
        };

        await expect(useCase.execute(conflictingCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.CONFLICTING_STOCK_OPERATION());
        expect(mockProductRepository.findById).not.toHaveBeenCalled();
        expect(mockProduct.restock).not.toHaveBeenCalled();
        expect(mockProduct.deductStock).not.toHaveBeenCalled();
        expect(mockProduct.setStock).not.toHaveBeenCalled();
        expect(mockProductRepository.update).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it("should throw error when no stock operation is provided", async () => {
        const emptyPayload: UpdateProductStockPayload = {
          id: mockProductId,
        };

        const emptyCommand: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          payload: emptyPayload,
        };

        await expect(useCase.execute(emptyCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.NO_STOCK_OPERATION());
        expect(mockProductRepository.findById).not.toHaveBeenCalled();
        expect(mockProduct.restock).not.toHaveBeenCalled();
        expect(mockProduct.deductStock).not.toHaveBeenCalled();
        expect(mockProduct.setStock).not.toHaveBeenCalled();
        expect(mockProductRepository.update).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it("should throw error when only id is provided without any operation", async () => {
        const invalidPayload: UpdateProductStockPayload = {
          id: mockProductId,
        };

        const invalidCommand: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          payload: invalidPayload,
        };

        await expect(useCase.execute(invalidCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.NO_STOCK_OPERATION());
      });

      it("should throw error when operations are provided with undefined values", async () => {
        const payloadWithUndefined: UpdateProductStockPayload = {
          id: mockProductId,
          restock: undefined,
          deductStock: undefined,
          setStock: undefined,
        };

        const commandWithUndefined: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          payload: payloadWithUndefined,
        };

        await expect(useCase.execute(commandWithUndefined)).rejects.toThrow(PRODUCT_EXCEPTIONS.NO_STOCK_OPERATION());
      });
    });

    describe("permission and error handling", () => {
      it("should throw error when user does not have permission to manage products", async () => {
        const permissionError = new Error("Permission denied");
        (ProductAccessControlService.assertCanManageStock as jest.Mock).mockImplementation(() => {
          throw permissionError;
        });

        await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(permissionError);
        expect(mockProductRepository.findById).not.toHaveBeenCalled();
        expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it("should throw error when product is not found", async () => {
        mockProductRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
        expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
        expect(mockProduct.restock).not.toHaveBeenCalled();
        expect(mockProductRepository.update).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it("should handle repository error when finding product", async () => {
        const repoError = new Error("Repository error");
        mockProductRepository.findById.mockRejectedValue(repoError);

        await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(repoError);
        expect(mockProduct.restock).not.toHaveBeenCalled();
        expect(mockProductRepository.update).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it("should handle repository error when updating product", async () => {
        const updateError = new Error("Update error");
        mockProductRepository.update.mockRejectedValue(updateError);

        await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(updateError);
        expect(mockProduct.restock).toHaveBeenCalledWith(50);
        expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it("should handle unit of work commit error", async () => {
        const commitError = new Error("Commit error");
        mockUnitOfWork.commit.mockRejectedValue(commitError);

        await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(commitError);
        expect(mockProductRepository.findById).not.toHaveBeenCalled();
        expect(mockProduct.restock).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it("should handle product not found in findProduct private method", async () => {
        mockProductRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
      });

      it("should handle restock throwing an exception", async () => {
        const restockError = new Error("Invalid restock quantity");
        mockProduct.restock.mockImplementation(() => {
          throw restockError;
        });

        await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(restockError);
        expect(mockProductRepository.update).not.toHaveBeenCalled();
      });

      it("should handle deductStock throwing an exception", async () => {
        const deductError = new Error("Insufficient stock");
        mockProduct.deductStock.mockImplementation(() => {
          throw deductError;
        });

        const commandWithDeduct: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          payload: mockPayloadWithDeductStock,
        };

        await expect(useCase.execute(commandWithDeduct)).rejects.toThrow(deductError);
        expect(mockProductRepository.update).not.toHaveBeenCalled();
      });

      it("should handle setStock throwing an exception", async () => {
        const setStockError = new Error("Invalid stock quantity");
        mockProduct.setStock.mockImplementation(() => {
          throw setStockError;
        });

        const commandWithSet: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          payload: mockPayloadWithSetStock,
        };

        await expect(useCase.execute(commandWithSet)).rejects.toThrow(setStockError);
        expect(mockProductRepository.update).not.toHaveBeenCalled();
      });
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with userId", async () => {
      await useCase.execute(mockCommandWithRestock);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "UpdateProductStockUseCase",
        event: "UPDATE_PRODUCT_STOCK_STARTED",
        message: "Starting updating product stock",
        data: { userId: mockUserId },
      });
    });

    it("should log successful update with duration and productId", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommandWithRestock);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductStockUseCase",
        event: "UPDATE_PRODUCT_STOCK_SUCCESSFUL",
        message: "Product stock updated successfully",
        durationMs: 150,
        data: { productId: mockProductId },
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful update with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommandWithRestock);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductStockUseCase",
        event: "UPDATE_PRODUCT_STOCK_SUCCESSFUL",
        message: "Product stock updated successfully",
        durationMs: 250,
        data: { productId: mockProductId },
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when update fails", async () => {
      const error = new Error("Update failed");
      mockProductRepository.update.mockRejectedValue(error);

      await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(error);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle different user roles", async () => {
      const roles = [UserRoleType.ADMIN, UserRoleType.MANAGER];

      for (const role of roles) {
        const commandWithRole: UpdateProductStockCommand = {
          ...mockCommandWithRestock,
          userRole: role,
        };

        await useCase.execute(commandWithRole);
        expect(ProductAccessControlService.assertCanManageStock).toHaveBeenCalledWith(role);
      }
    });

    it("should handle restock with zero quantity", async () => {
      const payloadWithZeroRestock: UpdateProductStockPayload = {
        id: mockProductId,
        restock: 0,
      };

      const commandWithZeroRestock: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: payloadWithZeroRestock,
      };

      await useCase.execute(commandWithZeroRestock);
      expect(mockProduct.restock).toHaveBeenCalledWith(0);
    });

    it("should handle deductStock with zero quantity", async () => {
      const payloadWithZeroDeduct: UpdateProductStockPayload = {
        id: mockProductId,
        deductStock: 0,
      };

      const commandWithZeroDeduct: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: payloadWithZeroDeduct,
      };

      await useCase.execute(commandWithZeroDeduct);
      expect(mockProduct.deductStock).toHaveBeenCalledWith(0);
    });

    it("should handle setStock with zero quantity", async () => {
      const payloadWithZeroSet: UpdateProductStockPayload = {
        id: mockProductId,
        setStock: 0,
      };

      const commandWithZeroSet: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: payloadWithZeroSet,
      };

      await useCase.execute(commandWithZeroSet);
      expect(mockProduct.setStock).toHaveBeenCalledWith(0);
    });

    it("should handle multiple stock updates in quick succession", async () => {
      const firstUpdate: UpdateProductStockPayload = {
        id: mockProductId,
        restock: 10,
      };

      const secondUpdate: UpdateProductStockPayload = {
        id: mockProductId,
        deductStock: 5,
      };

      await useCase.execute({ ...mockCommandWithRestock, payload: firstUpdate });
      expect(mockProduct.restock).toHaveBeenCalledWith(10);

      jest.clearAllMocks();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = { productRepository: mockProductRepository } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await useCase.execute({ ...mockCommandWithRestock, payload: secondUpdate });
      expect(mockProduct.deductStock).toHaveBeenCalledWith(5);
    });

    it("should handle product with large stock quantities", async () => {
      const payloadWithLargeQuantity: UpdateProductStockPayload = {
        id: mockProductId,
        restock: 999999,
      };

      const commandWithLargeQuantity: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: payloadWithLargeQuantity,
      };

      await useCase.execute(commandWithLargeQuantity);
      expect(mockProduct.restock).toHaveBeenCalledWith(999999);
    });

    it("should handle product with negative stock operations (should be validated by domain)", async () => {
      const payloadWithNegativeDeduct: UpdateProductStockPayload = {
        id: mockProductId,
        deductStock: -5,
      };

      const commandWithNegativeDeduct: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: payloadWithNegativeDeduct,
      };

      mockProduct.deductStock.mockImplementation(() => {
        throw new Error("Invalid deduct quantity");
      });

      await expect(useCase.execute(commandWithNegativeDeduct)).rejects.toThrow("Invalid deduct quantity");
    });
  });

  describe("private method hasValue", () => {
    it("should return true for defined values", async () => {
      const payloadWithAllFields: UpdateProductStockPayload = {
        id: mockProductId,
        restock: 10,
      };

      const command: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: payloadWithAllFields,
      };

      await useCase.execute(command);
      expect(mockProduct.restock).toHaveBeenCalledWith(10);
    });

    it("should return false for undefined values", async () => {
      const payloadWithUndefinedFields: UpdateProductStockPayload = {
        id: mockProductId,
        restock: undefined,
        deductStock: undefined,
        setStock: undefined,
      };

      const command: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: payloadWithUndefinedFields,
      };

      await expect(useCase.execute(command)).rejects.toThrow(PRODUCT_EXCEPTIONS.NO_STOCK_OPERATION());
    });
  });

  describe("return value verification", () => {
    it("should return the product id after successful update", async () => {
      const result = await useCase.execute(mockCommandWithRestock);
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

      const result = await useCase.execute(mockCommandWithRestock);
      expect(result.id).toBe(customId);
    });

    it("should return correct id after multiple updates", async () => {
      const firstResult = await useCase.execute(mockCommandWithRestock);
      expect(firstResult.id).toBe(mockProductId);

      jest.clearAllMocks();
      const secondProductId = "prod-456";
      const mockProduct2 = {
        ...mockProduct,
        getId: jest.fn().mockReturnValue(secondProductId),
      } as unknown as jest.Mocked<Product>;
      mockProductRepository.findById.mockResolvedValue(mockProduct2);
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = { productRepository: mockProductRepository } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      const secondCommand = {
        ...mockCommandWithRestock,
        payload: {
          id: secondProductId,
          restock: 20,
        },
      };

      const secondResult = await useCase.execute(secondCommand);
      expect(secondResult.id).toBe(secondProductId);
    });
  });

  describe("private method findProduct", () => {
    it("should find product successfully", async () => {
      await useCase.execute(mockCommandWithRestock);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
    });

    it("should throw PRODUCT_NOT_FOUND when product is null", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
    });

    it("should propagate repository errors", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommandWithRestock)).rejects.toThrow(repoError);
    });
  });

  describe("performUpdateProduct method", () => {
    it("should call restock when provided", async () => {
      await useCase.execute(mockCommandWithRestock);
      expect(mockProduct.restock).toHaveBeenCalledWith(50);
      expect(mockProduct.deductStock).not.toHaveBeenCalled();
      expect(mockProduct.setStock).not.toHaveBeenCalled();
    });

    it("should call deductStock when provided", async () => {
      const commandWithDeduct: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: mockPayloadWithDeductStock,
      };

      await useCase.execute(commandWithDeduct);
      expect(mockProduct.deductStock).toHaveBeenCalledWith(30);
      expect(mockProduct.restock).not.toHaveBeenCalled();
      expect(mockProduct.setStock).not.toHaveBeenCalled();
    });

    it("should call setStock when provided", async () => {
      const commandWithSet: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: mockPayloadWithSetStock,
      };

      await useCase.execute(commandWithSet);
      expect(mockProduct.setStock).toHaveBeenCalledWith(100);
      expect(mockProduct.restock).not.toHaveBeenCalled();
      expect(mockProduct.deductStock).not.toHaveBeenCalled();
    });

    it("should call only one operation when multiple are provided (validation prevents this)", async () => {
      const conflictingPayload: UpdateProductStockPayload = {
        id: mockProductId,
        restock: 10,
        deductStock: 5,
      };

      const conflictingCommand: UpdateProductStockCommand = {
        ...mockCommandWithRestock,
        payload: conflictingPayload,
      };

      await expect(useCase.execute(conflictingCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.CONFLICTING_STOCK_OPERATION());
    });
  });
});
