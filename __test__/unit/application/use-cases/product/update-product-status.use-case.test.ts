import { UpdateProductStatusUseCase } from "@/application/use-cases/product/update-product-status.use-case";
import { UpdateProductStatusCommand } from "@/application/ports/driving/update-product-status.use-case";
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

describe("UpdateProductStatusUseCase", () => {
  let useCase: UpdateProductStatusUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockLogger: jest.Mocked<Logger>;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockProduct: jest.Mocked<Product>;

  const mockUserId = "user-123";
  const mockUserRole = UserRoleType.ADMIN;
  const mockProductId = "prod-789";
  const mockStartTime = 1000;

  const mockPayload = {
    id: mockProductId,
    setStatus: ProductStatus.UNAVAILABLE,
  };

  const mockCommand: UpdateProductStatusCommand = {
    userId: mockUserId,
    userRole: mockUserRole,
    payload: mockPayload,
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

    (ProductAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {});

    mockProductRepository.findById.mockResolvedValue(mockProduct);
    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        productRepository: mockProductRepository,
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    useCase = new UpdateProductStatusUseCase(mockUnitOfWork, mockLogger);
  });

  describe("execute", () => {
    it("should successfully update product status", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toEqual({ id: mockProductId });
      expect(ProductAccessControlService.assertCanUpdate).toHaveBeenCalledWith(mockUserRole);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "UpdateProductStatusUseCase",
        event: "UPDATE_PRODUCT_STATUS_STARTED",
        message: "Starting updating product status",
        data: { userId: mockUserId },
      });
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
      expect(mockProduct.setStatus).toHaveBeenCalledWith(mockPayload.setStatus);
      expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductStatusUseCase",
        event: "UPDATE_PRODUCT_STATUS_SUCCESSFUL",
        message: "Product status updated successfully",
        durationMs: expect.any(Number),
        data: { productId: mockProductId },
      });
    });

    it("should update product status to AVAILABLE", async () => {
      const payloadWithAvailable = {
        id: mockProductId,
        setStatus: ProductStatus.AVAILABLE,
      };

      const commandWithAvailable: UpdateProductStatusCommand = {
        ...mockCommand,
        payload: payloadWithAvailable,
      };

      await useCase.execute(commandWithAvailable);

      expect(mockProduct.setStatus).toHaveBeenCalledWith(ProductStatus.AVAILABLE);
    });

    it("should update product status to UNAVAILABLE", async () => {
      const payloadWithUnavailable = {
        id: mockProductId,
        setStatus: ProductStatus.UNAVAILABLE,
      };

      const commandWithUnavailable: UpdateProductStatusCommand = {
        ...mockCommand,
        payload: payloadWithUnavailable,
      };

      await useCase.execute(commandWithUnavailable);

      expect(mockProduct.setStatus).toHaveBeenCalledWith(ProductStatus.UNAVAILABLE);
    });

    it("should update product status to UPCOMING", async () => {
      const payloadWithUpcoming = {
        id: mockProductId,
        setStatus: ProductStatus.UPCOMING,
      };

      const commandWithUpcoming: UpdateProductStatusCommand = {
        ...mockCommand,
        payload: payloadWithUpcoming,
      };

      await useCase.execute(commandWithUpcoming);

      expect(mockProduct.setStatus).toHaveBeenCalledWith(ProductStatus.UPCOMING);
    });

    it("should update product status to DISCONTINUED", async () => {
      const payloadWithDiscontinued = {
        id: mockProductId,
        setStatus: ProductStatus.DISCONTINUED,
      };

      const commandWithDiscontinued: UpdateProductStatusCommand = {
        ...mockCommand,
        payload: payloadWithDiscontinued,
      };

      await useCase.execute(commandWithDiscontinued);

      expect(mockProduct.setStatus).toHaveBeenCalledWith(ProductStatus.DISCONTINUED);
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
      expect(mockProduct.setStatus).not.toHaveBeenCalled();
      expect(mockProductRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository error when finding product", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockProduct.setStatus).not.toHaveBeenCalled();
      expect(mockProductRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository error when updating product", async () => {
      const updateError = new Error("Update error");
      mockProductRepository.update.mockRejectedValue(updateError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(updateError);
      expect(mockProduct.setStatus).toHaveBeenCalledWith(mockPayload.setStatus);
      expect(mockProductRepository.update).toHaveBeenCalledWith(mockProduct);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle unit of work commit error", async () => {
      const commitError = new Error("Commit error");
      mockUnitOfWork.commit.mockRejectedValue(commitError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(commitError);
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
      expect(mockProduct.setStatus).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle product not found in findProduct private method", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
    });

    it("should call setStatus before update", async () => {
      await useCase.execute(mockCommand);

      expect(mockProduct.setStatus).toHaveBeenCalled();
      expect(mockProductRepository.update).toHaveBeenCalled();
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with userId", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "UpdateProductStatusUseCase",
        event: "UPDATE_PRODUCT_STATUS_STARTED",
        message: "Starting updating product status",
        data: { userId: mockUserId },
      });
    });

    it("should log successful update with duration and productId", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductStatusUseCase",
        event: "UPDATE_PRODUCT_STATUS_SUCCESSFUL",
        message: "Product status updated successfully",
        durationMs: 150,
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
        context: "UpdateProductStatusUseCase",
        event: "UPDATE_PRODUCT_STATUS_SUCCESSFUL",
        message: "Product status updated successfully",
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
    it("should handle different user roles", async () => {
      const roles = [UserRoleType.ADMIN, UserRoleType.MANAGER];

      for (const role of roles) {
        const commandWithRole: UpdateProductStatusCommand = {
          ...mockCommand,
          userRole: role,
        };

        await useCase.execute(commandWithRole);
        expect(ProductAccessControlService.assertCanUpdate).toHaveBeenCalledWith(role);
      }
    });

    it("should handle product with all status transitions", async () => {
      const statuses = [ProductStatus.UPCOMING, ProductStatus.AVAILABLE, ProductStatus.UNAVAILABLE, ProductStatus.DISCONTINUED];

      for (const status of statuses) {
        const payloadWithStatus = {
          id: mockProductId,
          setStatus: status,
        };

        const commandWithStatus: UpdateProductStatusCommand = {
          ...mockCommand,
          payload: payloadWithStatus,
        };

        await useCase.execute(commandWithStatus);
        expect(mockProduct.setStatus).toHaveBeenCalledWith(status);
      }
    });

    it("should handle multiple status updates in quick succession", async () => {
      const firstUpdate = {
        id: mockProductId,
        setStatus: ProductStatus.UNAVAILABLE,
      };

      const secondUpdate = {
        id: mockProductId,
        setStatus: ProductStatus.AVAILABLE,
      };

      await useCase.execute({ ...mockCommand, payload: firstUpdate });
      expect(mockProduct.setStatus).toHaveBeenCalledWith(ProductStatus.UNAVAILABLE);

      jest.clearAllMocks();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = { productRepository: mockProductRepository } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await useCase.execute({ ...mockCommand, payload: secondUpdate });
      expect(mockProduct.setStatus).toHaveBeenCalledWith(ProductStatus.AVAILABLE);
    });

    it("should handle product found but setStatus throws error", async () => {
      const statusError = new Error("Invalid status transition");
      mockProduct.setStatus.mockImplementation(() => {
        throw statusError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow(statusError);
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it("should handle product with same status", async () => {
      const payloadWithSameStatus = {
        id: mockProductId,
        setStatus: ProductStatus.AVAILABLE,
      };

      const commandWithSameStatus: UpdateProductStatusCommand = {
        ...mockCommand,
        payload: payloadWithSameStatus,
      };

      mockProduct.getStatus.mockReturnValue(ProductStatus.AVAILABLE);

      await useCase.execute(commandWithSameStatus);

      expect(mockProduct.setStatus).toHaveBeenCalledWith(ProductStatus.AVAILABLE);
      expect(mockProductRepository.update).toHaveBeenCalled();
    });
  });

  describe("error handling scenarios", () => {
    it("should handle findById throwing an exception", async () => {
      const findError = new Error("Database connection error");
      mockProductRepository.findById.mockRejectedValue(findError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(findError);
      expect(mockProduct.setStatus).not.toHaveBeenCalled();
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it("should handle update throwing an exception", async () => {
      const updateError = new Error("Update failed");
      mockProductRepository.update.mockRejectedValue(updateError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(updateError);
      expect(mockProduct.setStatus).toHaveBeenCalled();
    });

    it("should handle ProductAccessControlService throwing different error types", async () => {
      const permissionError = new Error("Custom permission error");
      (ProductAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Custom permission error");
    });

    it("should handle product with null response from findById", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
    });

    it("should handle unit of work commit with failed transaction", async () => {
      const transactionError = new Error("Transaction failed");
      mockUnitOfWork.commit.mockRejectedValue(transactionError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(transactionError);
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
      expect(mockProduct.setStatus).not.toHaveBeenCalled();
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

    it("should return correct id after multiple updates", async () => {
      const firstResult = await useCase.execute(mockCommand);
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
        ...mockCommand,
        payload: {
          id: secondProductId,
          setStatus: ProductStatus.AVAILABLE,
        },
      };

      const secondResult = await useCase.execute(secondCommand);
      expect(secondResult.id).toBe(secondProductId);
    });
  });

  describe("private method findProduct", () => {
    it("should find product successfully", async () => {
      await useCase.execute(mockCommand);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
    });

    it("should throw PRODUCT_NOT_FOUND when product is null", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
    });

    it("should propagate repository errors", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
    });
  });
});
