import { UpdateProductImageUseCase } from "@/application/use-cases/product/update-product-image.use-case";
import { UpdateProductImageCommand, UpdateProductImagePayload } from "@/application/ports/driving/update-product-image.use-case";
import { PRODUCT_EXCEPTIONS } from "@/application/exceptions/product.exceptions";
import { Logger } from "@/application/ports/driven/logger";
import { ObjectStorage, UploadFilePayload } from "@/application/ports/driven/object-storage";
import { ProductRepository } from "@/application/ports/driven/product.repository";
import { UnitOfWork, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work";
import { Product } from "@/domain/entities/product.entity";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import { ProductType } from "@/domain/types/product-type.enum";
import { ProductStatus } from "@/domain/types/product-status.enum";
import { UserRoleType } from "@/domain/types/user-role-type.enum";

jest.mock("@/domain/services/product-access-control.service");

describe("UpdateProductImageUseCase", () => {
  let useCase: UpdateProductImageUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockObjectStorage: jest.Mocked<ObjectStorage>;
  let mockLogger: jest.Mocked<Logger>;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockProduct: jest.Mocked<Product>;

  const mockUserId = "user-123";
  const mockUserRole = UserRoleType.ADMIN;
  const mockProductId = "prod-789";
  const mockStartTime = 1000;
  const mockUploadedUrl = "https://storage.com/uploaded-image.jpg";
  const mockFileBuffer = Buffer.from("image-data");

  const mockUploadPayload: UploadFilePayload = {
    fileBuffer: mockFileBuffer,
    fileName: "image.jpg",
    mimeType: "image/jpeg",
    fileSize: 1024,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWork>;

    mockObjectStorage = {
      upload: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ObjectStorage>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockProductRepository = {
      findById: jest.fn(),
      findDetailById: jest.fn(),
      search: jest.fn(),
      browse: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      updateImages: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

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

    (ProductAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {});

    mockProductRepository.findById.mockResolvedValue(mockProduct);
    mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);
    mockObjectStorage.delete.mockResolvedValue(undefined);
    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        productRepository: mockProductRepository,
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    useCase = new UpdateProductImageUseCase(mockUnitOfWork, mockObjectStorage, mockLogger);
  });

  describe("execute - addImage operation", () => {
    const addImagePayload: UpdateProductImagePayload = {
      id: mockProductId,
      addImage: mockUploadPayload,
    };

    const addImageCommand: UpdateProductImageCommand = {
      userId: mockUserId,
      userRole: mockUserRole,
      payload: addImagePayload,
    };

    it("should successfully add an image to a product", async () => {
      const result = await useCase.execute(addImageCommand);

      expect(result).toEqual({ id: mockProductId });
      expect(ProductAccessControlService.assertCanUpdate).toHaveBeenCalledWith(mockUserRole);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "UpdateProductImageUseCase",
        event: "UPDATE_PRODUCT_IMAGE_STARTED",
        message: "User is updating product image",
        data: { userId: mockUserId },
      });
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
      expect(mockProduct.addImage).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProduct.removeImage).not.toHaveBeenCalled();
      expect(mockProduct.replaceImage).not.toHaveBeenCalled();
      expect(mockProduct.reorderImages).not.toHaveBeenCalled();
      expect(mockProductRepository.updateImages).toHaveBeenCalledWith(mockProduct);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductImageUseCase",
        event: "UPDATE_PRODUCT_IMAGE_SUCCESSFUL",
        message: "Product image updated successfully",
        durationMs: expect.any(Number),
        data: { productId: mockProductId },
      });
    });

    it("should rollback image upload if unit of work fails", async () => {
      const dbError = new Error("Database error");
      mockUnitOfWork.commit.mockRejectedValue(dbError);

      await expect(useCase.execute(addImageCommand)).rejects.toThrow(dbError);

      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProduct.addImage).not.toHaveBeenCalled();
      expect(mockProductRepository.updateImages).not.toHaveBeenCalled();
    });

    it("should log warning if rollback image deletion fails", async () => {
      const dbError = new Error("Database error");
      const deleteError = new Error("Delete failed");
      mockUnitOfWork.commit.mockRejectedValue(dbError);
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      await expect(useCase.execute(addImageCommand)).rejects.toThrow(dbError);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "UpdateProductUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error: dbError },
      });
    });
  });

  describe("execute - removeImage operation", () => {
    const removeImagePayload: UpdateProductImagePayload = {
      id: mockProductId,
      removeImage: "https://example.com/old-image.jpg",
    };

    const removeImageCommand: UpdateProductImageCommand = {
      userId: mockUserId,
      userRole: mockUserRole,
      payload: removeImagePayload,
    };

    it("should successfully remove an image from a product", async () => {
      const result = await useCase.execute(removeImageCommand);

      expect(result).toEqual({ id: mockProductId });
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
      expect(mockProduct.removeImage).toHaveBeenCalledWith(removeImagePayload.removeImage);
      expect(mockProduct.addImage).not.toHaveBeenCalled();
      expect(mockProduct.replaceImage).not.toHaveBeenCalled();
      expect(mockProduct.reorderImages).not.toHaveBeenCalled();
      expect(mockProductRepository.updateImages).toHaveBeenCalledWith(mockProduct);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(removeImagePayload.removeImage);
    });

    it("should log warning if image deletion fails", async () => {
      const deleteError = new Error("Delete failed");
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      await useCase.execute(removeImageCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "UpdateProductUseCase",
        event: "DELETE_IMAGE_FAILED",
        message: "Failed to delete old image",
        data: { url: removeImagePayload.removeImage, error: deleteError },
      });
    });

    it("should still succeed even if image deletion fails (non-blocking)", async () => {
      const deleteError = new Error("Delete failed");
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      const result = await useCase.execute(removeImageCommand);

      expect(result).toEqual({ id: mockProductId });
      expect(mockProduct.removeImage).toHaveBeenCalled();
      expect(mockProductRepository.updateImages).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe("execute - replaceImage operation", () => {
    const replaceImagePayload: UpdateProductImagePayload = {
      id: mockProductId,
      replaceImage: {
        oldImageUrl: "https://example.com/old-image.jpg",
        newImage: mockUploadPayload,
      },
    };

    const replaceImageCommand: UpdateProductImageCommand = {
      userId: mockUserId,
      userRole: mockUserRole,
      payload: replaceImagePayload,
    };

    it("should successfully replace an image in a product", async () => {
      const result = await useCase.execute(replaceImageCommand);

      expect(result).toEqual({ id: mockProductId });
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
      expect(mockProduct.replaceImage).toHaveBeenCalledWith({
        oldUrl: replaceImagePayload.replaceImage?.oldImageUrl,
        newUrl: mockUploadedUrl,
      });
      expect(mockProduct.addImage).not.toHaveBeenCalled();
      expect(mockProduct.removeImage).not.toHaveBeenCalled();
      expect(mockProduct.reorderImages).not.toHaveBeenCalled();
      expect(mockProductRepository.updateImages).toHaveBeenCalledWith(mockProduct);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(replaceImagePayload.replaceImage?.oldImageUrl);
    });

    it("should rollback new image upload if unit of work fails", async () => {
      const dbError = new Error("Database error");
      mockUnitOfWork.commit.mockRejectedValue(dbError);

      await expect(useCase.execute(replaceImageCommand)).rejects.toThrow(dbError);

      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProduct.replaceImage).not.toHaveBeenCalled();
      expect(mockProductRepository.updateImages).not.toHaveBeenCalled();
    });

    it("should log warning if old image deletion fails", async () => {
      const deleteError = new Error("Delete failed");
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      await useCase.execute(replaceImageCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "UpdateProductUseCase",
        event: "DELETE_IMAGE_FAILED",
        message: "Failed to delete old image",
        data: { url: replaceImagePayload.replaceImage?.oldImageUrl },
      });
    });
  });

  describe("execute - reorderImages operation", () => {
    const reorderImagesPayload: UpdateProductImagePayload = {
      id: mockProductId,
      reorderedUrls: ["https://example.com/image2.jpg", "https://example.com/image1.jpg"],
    };

    const reorderImagesCommand: UpdateProductImageCommand = {
      userId: mockUserId,
      userRole: mockUserRole,
      payload: reorderImagesPayload,
    };

    it("should successfully reorder images in a product", async () => {
      const result = await useCase.execute(reorderImagesCommand);

      expect(result).toEqual({ id: mockProductId });
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId);
      expect(mockProduct.reorderImages).toHaveBeenCalledWith(reorderImagesPayload.reorderedUrls);
      expect(mockProduct.addImage).not.toHaveBeenCalled();
      expect(mockProduct.removeImage).not.toHaveBeenCalled();
      expect(mockProduct.replaceImage).not.toHaveBeenCalled();
      expect(mockProductRepository.updateImages).toHaveBeenCalledWith(mockProduct);
    });
  });

  describe("validation tests", () => {
    it("should throw error when user does not have permission", async () => {
      const permissionError = new Error("Permission denied");
      (ProductAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(permissionError);
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should throw error when multiple operations are provided", async () => {
      const conflictingPayload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
        removeImage: "https://example.com/image.jpg",
      };

      const conflictingCommand: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: conflictingPayload,
      };

      await expect(useCase.execute(conflictingCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.CONFLICTING_IMAGE_OPERATION());
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should throw error when no operation is provided", async () => {
      const emptyPayload: UpdateProductImagePayload = {
        id: mockProductId,
      };

      const emptyCommand: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: emptyPayload,
      };

      await expect(useCase.execute(emptyCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.NO_REORDER_IMAGE_OPERATION());
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should throw error when only empty reorderedUrls array is provided", async () => {
      const emptyReorderPayload: UpdateProductImagePayload = {
        id: mockProductId,
        reorderedUrls: [],
      };

      const emptyReorderCommand: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: emptyReorderPayload,
      };

      await expect(useCase.execute(emptyReorderCommand)).rejects.toThrow(PRODUCT_EXCEPTIONS.NO_REORDER_IMAGE_OPERATION());
    });

    it("should allow reorderImages when reorderedUrls has items", async () => {
      const reorderPayload: UpdateProductImagePayload = {
        id: mockProductId,
        reorderedUrls: ["url1", "url2"],
      };

      const reorderCommand: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: reorderPayload,
      };

      await useCase.execute(reorderCommand);
      expect(mockProduct.reorderImages).toHaveBeenCalledWith(["url1", "url2"]);
    });
  });

  describe("error handling", () => {
    it("should throw error when product is not found", async () => {
      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      mockProductRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(PRODUCT_EXCEPTIONS.PRODUCT_NOT_FOUND());
      expect(mockProduct.addImage).not.toHaveBeenCalled();
      expect(mockProductRepository.updateImages).not.toHaveBeenCalled();
    });

    it("should handle object storage upload failure for addImage", async () => {
      const uploadError = new Error("Upload failed");
      mockObjectStorage.upload.mockRejectedValue(uploadError);

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(uploadError);
      expect(mockProduct.addImage).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should handle object storage upload failure for replaceImage", async () => {
      const uploadError = new Error("Upload failed");
      mockObjectStorage.upload.mockRejectedValue(uploadError);

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        replaceImage: {
          oldImageUrl: "https://example.com/old.jpg",
          newImage: mockUploadPayload,
        },
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(uploadError);
      expect(mockProduct.replaceImage).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should handle repository error when finding product", async () => {
      const repoError = new Error("Repository error");
      mockProductRepository.findById.mockRejectedValue(repoError);

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(repoError);
      expect(mockProduct.addImage).not.toHaveBeenCalled();
    });

    it("should handle product.addImage throwing error", async () => {
      const addImageError = new Error("Add image failed");
      mockProduct.addImage.mockImplementation(() => {
        throw addImageError;
      });

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(addImageError);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProductRepository.updateImages).not.toHaveBeenCalled();
    });

    it("should handle product.removeImage throwing error", async () => {
      const removeImageError = new Error("Remove image failed");
      mockProduct.removeImage.mockImplementation(() => {
        throw removeImageError;
      });

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        removeImage: "https://example.com/image.jpg",
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(removeImageError);
      expect(mockProductRepository.updateImages).not.toHaveBeenCalled();
    });

    it("should handle product.replaceImage throwing error", async () => {
      const replaceImageError = new Error("Replace image failed");
      mockProduct.replaceImage.mockImplementation(() => {
        throw replaceImageError;
      });

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        replaceImage: {
          oldImageUrl: "https://example.com/old.jpg",
          newImage: mockUploadPayload,
        },
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(replaceImageError);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProductRepository.updateImages).not.toHaveBeenCalled();
    });

    it("should handle product.reorderImages throwing error", async () => {
      const reorderError = new Error("Reorder failed");
      mockProduct.reorderImages.mockImplementation(() => {
        throw reorderError;
      });

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        reorderedUrls: ["url1", "url2"],
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(reorderError);
      expect(mockProductRepository.updateImages).not.toHaveBeenCalled();
    });
  });

  describe("rollback scenarios", () => {
    it("should rollback both added and replaced images if both exist", async () => {
      const dbError = new Error("Database error");
      mockUnitOfWork.commit.mockRejectedValue(dbError);

      const addPayload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: addPayload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(dbError);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
    });

    it("should handle rollback when deletion fails", async () => {
      const dbError = new Error("Database error");
      const deleteError = new Error("Delete failed");
      mockUnitOfWork.commit.mockRejectedValue(dbError);
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(dbError);
      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "UpdateProductUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error: dbError },
      });
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with userId", async () => {
      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await useCase.execute(command);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "UpdateProductImageUseCase",
        event: "UPDATE_PRODUCT_IMAGE_STARTED",
        message: "User is updating product image",
        data: { userId: mockUserId },
      });
    });

    it("should log successful update with duration and productId", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await useCase.execute(command);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductImageUseCase",
        event: "UPDATE_PRODUCT_IMAGE_SUCCESSFUL",
        message: "Product image updated successfully",
        durationMs: 150,
        data: { productId: mockProductId },
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when update fails", async () => {
      const error = new Error("Update failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(error);
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle different user roles", async () => {
      const roles = [UserRoleType.ADMIN, UserRoleType.MANAGER];

      for (const role of roles) {
        const payload: UpdateProductImagePayload = {
          id: mockProductId,
          addImage: mockUploadPayload,
        };

        const command: UpdateProductImageCommand = {
          userId: mockUserId,
          userRole: role,
          payload,
        };

        await useCase.execute(command);
        expect(ProductAccessControlService.assertCanUpdate).toHaveBeenCalledWith(role);
      }
    });

    it("should handle addImage with large file", async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);
      const largeUploadPayload: UploadFilePayload = {
        fileBuffer: largeBuffer,
        fileName: "large-image.jpg",
        mimeType: "image/jpeg",
        fileSize: 10 * 1024 * 1024,
      };

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: largeUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await useCase.execute(command);
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(largeUploadPayload);
    });

    it("should handle addImage with different mime types", async () => {
      const mimeTypes = ["image/png", "image/webp", "image/gif", "image/svg+xml"];

      for (const mimeType of mimeTypes) {
        const uploadPayload: UploadFilePayload = {
          fileBuffer: mockFileBuffer,
          fileName: `image.${mimeType.split("/")[1]}`,
          mimeType,
          fileSize: 1024,
        };

        const payload: UpdateProductImagePayload = {
          id: mockProductId,
          addImage: uploadPayload,
        };

        const command: UpdateProductImageCommand = {
          userId: mockUserId,
          userRole: mockUserRole,
          payload,
        };

        await useCase.execute(command);
        expect(mockObjectStorage.upload).toHaveBeenCalledWith(uploadPayload);
      }
    });

    it("should handle reorderImages with large array", async () => {
      const largeReorderArray = Array.from({ length: 100 }, (_, i) => `https://example.com/image${i}.jpg`);

      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        reorderedUrls: largeReorderArray,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await useCase.execute(command);
      expect(mockProduct.reorderImages).toHaveBeenCalledWith(largeReorderArray);
    });

    it("should handle multiple sequential operations", async () => {
      const addPayload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const addCommand: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: addPayload,
      };

      await useCase.execute(addCommand);
      expect(mockProduct.addImage).toHaveBeenCalled();

      jest.clearAllMocks();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = { productRepository: mockProductRepository } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      const removePayload: UpdateProductImagePayload = {
        id: mockProductId,
        removeImage: "https://example.com/image.jpg",
      };

      const removeCommand: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: removePayload,
      };

      await useCase.execute(removeCommand);
      expect(mockProduct.removeImage).toHaveBeenCalled();
    });

    it("should handle product with no images when reordering", async () => {
      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        reorderedUrls: [],
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      await expect(useCase.execute(command)).rejects.toThrow(PRODUCT_EXCEPTIONS.NO_REORDER_IMAGE_OPERATION());
    });
  });

  describe("return value verification", () => {
    it("should return the product id after successful update", async () => {
      const payload: UpdateProductImagePayload = {
        id: mockProductId,
        addImage: mockUploadPayload,
      };

      const command: UpdateProductImageCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload,
      };

      const result = await useCase.execute(command);
      expect(result).toEqual({ id: mockProductId });
      expect(result.id).toBe(mockProductId);
    });

    it("should return correct id for all operation types", async () => {
      const operations = [
        { addImage: mockUploadPayload },
        { removeImage: "https://example.com/image.jpg" },
        { replaceImage: { oldImageUrl: "https://example.com/old.jpg", newImage: mockUploadPayload } },
        { reorderedUrls: ["url1", "url2"] },
      ];

      for (const op of operations) {
        const payload: UpdateProductImagePayload = {
          id: mockProductId,
          ...op,
        };

        const command: UpdateProductImageCommand = {
          userId: mockUserId,
          userRole: mockUserRole,
          payload,
        };

        const result = await useCase.execute(command);
        expect(result.id).toBe(mockProductId);

        jest.clearAllMocks();
        mockProductRepository.findById.mockResolvedValue(mockProduct);
        mockUnitOfWork.commit.mockImplementation(async (callback) => {
          const repos = { productRepository: mockProductRepository } as unknown as UnitOfWorkRepositories;
          return await callback(repos);
        });
        mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);
        mockObjectStorage.delete.mockResolvedValue(undefined);
      }
    });
  });
});
