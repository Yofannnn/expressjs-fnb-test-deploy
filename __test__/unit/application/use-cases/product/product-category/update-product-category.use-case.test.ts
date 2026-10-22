import { UpdateProductCategoryUseCase } from "@/application/use-cases/product/product-category/update-product-category.use-case";
import { UpdateProductCategoryCommand, UpdateProductCategoryPayload } from "@/application/ports/driving/update-product-category.use-case";
import { ProductCategoryRepository } from "@/application/ports/driven/product-category.repository";
import { Logger } from "@/application/ports/driven/logger";
import { UnitOfWork, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ObjectStorage, UploadFilePayload } from "@/application/ports/driven/object-storage";
import { PRODUCT_CATEGORY_EXCEPTIONS } from "@/application/exceptions/product-category.exceptions";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { ProductCategoryStatus } from "@/domain/types/product-category-status.enum";
import { ProductCategoryAccessControlService } from "@/domain/services/product-category-access-control.service";

jest.mock("@/domain/services/product-category-access-control.service");

describe("UpdateProductCategoryUseCase", () => {
  let useCase: UpdateProductCategoryUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockObjectStorage: jest.Mocked<ObjectStorage>;
  let mockLogger: jest.Mocked<Logger>;
  let mockProductCategoryRepository: jest.Mocked<ProductCategoryRepository>;
  let mockProductCategory: jest.Mocked<ProductCategory>;

  const mockUserId = "user-123";
  const mockUserRole = UserRoleType.ADMIN;
  const mockCategoryId = "cat-456";
  const mockStartTime = 1000;
  const mockUploadedUrl = "https://storage.com/uploaded-image.jpg";
  const mockOldImageUrl = "https://storage.com/old-image.jpg";
  const mockFileBuffer = Buffer.from("image-data");

  const mockUploadPayload: UploadFilePayload = {
    fileBuffer: mockFileBuffer,
    fileName: "category-image.jpg",
    mimeType: "image/jpeg",
    fileSize: 1024,
  };

  const mockPayload: UpdateProductCategoryPayload = {
    id: mockCategoryId,
    name: "Updated Category",
    description: "Updated Description",
    image: mockUploadPayload,
    status: ProductCategoryStatus.INACTIVE,
  };

  const mockCommand: UpdateProductCategoryCommand = {
    userId: mockUserId,
    userRole: mockUserRole,
    payload: mockPayload,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductCategory = {
      getId: jest.fn().mockReturnValue(mockCategoryId),
      getName: jest.fn().mockReturnValue("Old Category"),
      getDescription: jest.fn().mockReturnValue("Old Description"),
      getImageUrl: jest.fn().mockReturnValue(mockOldImageUrl),
      getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
      getSortOrder: jest.fn().mockReturnValue(5),
      getCreatedAt: jest.fn().mockReturnValue(new Date()),
      getUpdatedAt: jest.fn().mockReturnValue(new Date()),
      isCurrentlyActive: jest.fn().mockReturnValue(true),
      rename: jest.fn(),
      changeDescription: jest.fn(),
      setImage: jest.fn(),
      reorder: jest.fn(),
      setStatus: jest.fn(),
    } as unknown as jest.Mocked<ProductCategory>;

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

    mockProductCategoryRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProductCategoryRepository>;

    (ProductCategoryAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {});

    mockProductCategoryRepository.findById.mockResolvedValue(mockProductCategory);
    mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);
    mockObjectStorage.delete.mockResolvedValue(undefined);
    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        productCategoryRepository: mockProductCategoryRepository,
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    useCase = new UpdateProductCategoryUseCase(mockUnitOfWork, mockObjectStorage, mockLogger);
  });

  describe("execute", () => {
    it("should successfully update a product category with image", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toEqual({ id: mockCategoryId });
      expect(ProductCategoryAccessControlService.assertCanUpdate).toHaveBeenCalledWith(mockUserRole);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "UpdateProductCategoryUseCase",
        event: "UPDATE_PRODUCT_CATEGORY_STARTED",
        message: "User is updating product category",
        data: { userId: mockUserId, categoryId: mockCategoryId },
      });
      expect(mockProductCategoryRepository.findById).toHaveBeenCalledWith(mockCategoryId);
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload);
      expect(mockProductCategory.rename).toHaveBeenCalledWith(mockPayload.name);
      expect(mockProductCategory.changeDescription).toHaveBeenCalledWith(mockPayload.description);
      expect(mockProductCategory.setImage).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProductCategory.setStatus).toHaveBeenCalledWith(mockPayload.status);
      expect(mockProductCategoryRepository.update).toHaveBeenCalledWith(mockProductCategory);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockOldImageUrl);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductCategoryUseCase",
        event: "UPDATE_PRODUCT_CATEGORY_SUCCESSFUL",
        message: "Product category updated successfully",
        durationMs: expect.any(Number),
        data: { categoryId: mockCategoryId },
      });
    });

    it("should successfully update a product category without image", async () => {
      const payloadWithoutImage: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        name: "Updated Category",
        description: "Updated Description",
        status: ProductCategoryStatus.INACTIVE,
      };

      const commandWithoutImage: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithoutImage,
      };

      const result = await useCase.execute(commandWithoutImage);

      expect(result).toEqual({ id: mockCategoryId });
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockProductCategory.rename).toHaveBeenCalledWith(payloadWithoutImage.name);
      expect(mockProductCategory.changeDescription).toHaveBeenCalledWith(payloadWithoutImage.description);
      expect(mockProductCategory.setImage).not.toHaveBeenCalled();
      expect(mockProductCategory.setStatus).toHaveBeenCalledWith(payloadWithoutImage.status);
      expect(mockObjectStorage.delete).not.toHaveBeenCalled();
    });

    it("should successfully update only name", async () => {
      const payloadWithOnlyName: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        name: "Updated Category",
      };

      const commandWithOnlyName: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithOnlyName,
      };

      await useCase.execute(commandWithOnlyName);

      expect(mockProductCategory.rename).toHaveBeenCalledWith("Updated Category");
      expect(mockProductCategory.changeDescription).not.toHaveBeenCalled();
      expect(mockProductCategory.setImage).not.toHaveBeenCalled();
      expect(mockProductCategory.setStatus).not.toHaveBeenCalled();
    });

    it("should successfully update only description", async () => {
      const payloadWithOnlyDescription: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        description: "Updated Description",
      };

      const commandWithOnlyDescription: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithOnlyDescription,
      };

      await useCase.execute(commandWithOnlyDescription);

      expect(mockProductCategory.changeDescription).toHaveBeenCalledWith("Updated Description");
      expect(mockProductCategory.rename).not.toHaveBeenCalled();
      expect(mockProductCategory.setImage).not.toHaveBeenCalled();
      expect(mockProductCategory.setStatus).not.toHaveBeenCalled();
    });

    it("should successfully update only status", async () => {
      const payloadWithOnlyStatus: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        status: ProductCategoryStatus.INACTIVE,
      };

      const commandWithOnlyStatus: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithOnlyStatus,
      };

      await useCase.execute(commandWithOnlyStatus);

      expect(mockProductCategory.setStatus).toHaveBeenCalledWith(ProductCategoryStatus.INACTIVE);
      expect(mockProductCategory.rename).not.toHaveBeenCalled();
      expect(mockProductCategory.changeDescription).not.toHaveBeenCalled();
      expect(mockProductCategory.setImage).not.toHaveBeenCalled();
    });

    it("should successfully update category with null description", async () => {
      const payloadWithNullDescription: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        description: null as unknown as string,
      };

      const commandWithNullDescription: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithNullDescription,
      };

      await useCase.execute(commandWithNullDescription);

      expect(mockProductCategory.changeDescription).toHaveBeenCalledWith(null);
    });

    it("should throw error when user does not have permission", async () => {
      const permissionError = new Error("Permission denied");
      (ProductCategoryAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow(permissionError);
      expect(mockProductCategoryRepository.findById).not.toHaveBeenCalled();
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw error when category is not found", async () => {
      mockProductCategoryRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());
      expect(mockProductCategoryRepository.findById).toHaveBeenCalledWith(mockCategoryId);
      expect(mockObjectStorage.upload).toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProductCategory.rename).not.toHaveBeenCalled();
      expect(mockProductCategoryRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should rollback image upload when unit of work fails", async () => {
      const dbError = new Error("Database error");
      mockUnitOfWork.commit.mockRejectedValue(dbError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(dbError);

      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProductCategoryRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should log warning when rollback image deletion fails", async () => {
      const dbError = new Error("Database error");
      const deleteError = new Error("Delete failed");
      mockUnitOfWork.commit.mockRejectedValue(dbError);
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(dbError);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "UpdateProductCategoryUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error: deleteError },
      });
    });

    it("should handle object storage upload failure", async () => {
      const uploadError = new Error("Upload failed");
      mockObjectStorage.upload.mockRejectedValue(uploadError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(uploadError);
      expect(mockProductCategoryRepository.findById).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle repository error when finding category", async () => {
      const repoError = new Error("Repository error");
      mockProductCategoryRepository.findById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockObjectStorage.upload).toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProductCategory.rename).not.toHaveBeenCalled();
      expect(mockProductCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("should handle repository update error", async () => {
      const updateError = new Error("Update failed");
      mockProductCategoryRepository.update.mockRejectedValue(updateError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(updateError);
      expect(mockObjectStorage.upload).toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProductCategory.rename).toHaveBeenCalled();
      expect(mockProductCategoryRepository.update).toHaveBeenCalled();
    });

    it("should handle category with no old image when updating image", async () => {
      mockProductCategory.getImageUrl.mockReturnValue(null);

      await useCase.execute(mockCommand);

      expect(mockObjectStorage.delete).not.toHaveBeenCalledWith(mockOldImageUrl);
      expect(mockProductCategory.setImage).toHaveBeenCalledWith(mockUploadedUrl);
    });

    it("should handle category with undefined old image when updating image", async () => {
      mockProductCategory.getImageUrl.mockReturnValue(undefined as unknown as string);

      await useCase.execute(mockCommand);

      expect(mockObjectStorage.delete).not.toHaveBeenCalledWith(mockOldImageUrl);
      expect(mockProductCategory.setImage).toHaveBeenCalledWith(mockUploadedUrl);
    });

    it("should log warning when deleting old image fails", async () => {
      const deleteError = new Error("Delete failed");
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      await useCase.execute(mockCommand);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "UpdateProductCategoryUseCase",
        event: "DELETE_OLD_IMAGE_FAILED",
        message: "Failed to delete old image, file may be orphaned",
        data: { url: mockOldImageUrl, error: deleteError },
      });
    });

    it("should still succeed even if old image deletion fails", async () => {
      const deleteError = new Error("Delete failed");
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      const result = await useCase.execute(mockCommand);

      expect(result).toEqual({ id: mockCategoryId });
      expect(mockProductCategory.setImage).toHaveBeenCalled();
      expect(mockProductCategoryRepository.update).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle category with no changes (empty payload)", async () => {
      const emptyPayload: UpdateProductCategoryPayload = {
        id: mockCategoryId,
      };

      const emptyCommand: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: emptyPayload,
      };

      await useCase.execute(emptyCommand);

      expect(mockProductCategory.rename).not.toHaveBeenCalled();
      expect(mockProductCategory.changeDescription).not.toHaveBeenCalled();
      expect(mockProductCategory.setImage).not.toHaveBeenCalled();
      expect(mockProductCategory.setStatus).not.toHaveBeenCalled();
      expect(mockProductCategoryRepository.update).toHaveBeenCalledWith(mockProductCategory);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with userId and categoryId", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "UpdateProductCategoryUseCase",
        event: "UPDATE_PRODUCT_CATEGORY_STARTED",
        message: "User is updating product category",
        data: { userId: mockUserId, categoryId: mockCategoryId },
      });
    });

    it("should log successful update with duration and categoryId", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductCategoryUseCase",
        event: "UPDATE_PRODUCT_CATEGORY_SUCCESSFUL",
        message: "Product category updated successfully",
        durationMs: 150,
        data: { categoryId: mockCategoryId },
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful update with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "UpdateProductCategoryUseCase",
        event: "UPDATE_PRODUCT_CATEGORY_SUCCESSFUL",
        message: "Product category updated successfully",
        durationMs: 250,
        data: { categoryId: mockCategoryId },
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when update fails", async () => {
      const error = new Error("Update failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(error);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle different user roles", async () => {
      const roles = [UserRoleType.ADMIN, UserRoleType.MANAGER];

      for (const role of roles) {
        const commandWithRole: UpdateProductCategoryCommand = {
          ...mockCommand,
          userRole: role,
        };

        await useCase.execute(commandWithRole);
        expect(ProductCategoryAccessControlService.assertCanUpdate).toHaveBeenCalledWith(role);
      }
    });

    it("should handle category with all fields updated", async () => {
      const fullPayload: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        name: "New Name",
        description: "New Description",
        image: mockUploadPayload,
        status: ProductCategoryStatus.INACTIVE,
      };

      const fullCommand: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: fullPayload,
      };

      await useCase.execute(fullCommand);

      expect(mockProductCategory.rename).toHaveBeenCalledWith("New Name");
      expect(mockProductCategory.changeDescription).toHaveBeenCalledWith("New Description");
      expect(mockProductCategory.setImage).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProductCategory.setStatus).toHaveBeenCalledWith(ProductCategoryStatus.INACTIVE);
    });

    it("should handle image upload with different file types", async () => {
      const fileTypes = [
        { mimeType: "image/png", fileName: "image.png" },
        { mimeType: "image/webp", fileName: "image.webp" },
        { mimeType: "image/gif", fileName: "image.gif" },
        { mimeType: "image/svg+xml", fileName: "image.svg" },
      ];

      for (const fileType of fileTypes) {
        const uploadPayload: UploadFilePayload = {
          fileBuffer: mockFileBuffer,
          fileName: fileType.fileName,
          mimeType: fileType.mimeType,
          fileSize: 1024,
        };

        const payload: UpdateProductCategoryPayload = {
          id: mockCategoryId,
          image: uploadPayload,
        };

        const command: UpdateProductCategoryCommand = {
          userId: mockUserId,
          userRole: mockUserRole,
          payload,
        };

        await useCase.execute(command);
        expect(mockObjectStorage.upload).toHaveBeenCalledWith(uploadPayload);
      }
    });

    it("should handle large image files", async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);
      const largeUploadPayload: UploadFilePayload = {
        fileBuffer: largeBuffer,
        fileName: "large-image.jpg",
        mimeType: "image/jpeg",
        fileSize: 10 * 1024 * 1024,
      };

      const payloadWithLargeImage: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        image: largeUploadPayload,
      };

      const commandWithLargeImage: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithLargeImage,
      };

      await useCase.execute(commandWithLargeImage);
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(largeUploadPayload);
    });

    it("should handle multiple sequential category updates", async () => {
      const updates = [{ name: "Category 1" }, { description: "Description 2" }, { status: ProductCategoryStatus.INACTIVE }];

      for (const update of updates) {
        const payload: UpdateProductCategoryPayload = {
          id: mockCategoryId,
          ...update,
        };

        const command: UpdateProductCategoryCommand = {
          userId: mockUserId,
          userRole: mockUserRole,
          payload,
        };

        await useCase.execute(command);

        jest.clearAllMocks();
        mockProductCategoryRepository.findById.mockResolvedValue(mockProductCategory);
        mockUnitOfWork.commit.mockImplementation(async (callback) => {
          const repos = { productCategoryRepository: mockProductCategoryRepository } as unknown as UnitOfWorkRepositories;
          return await callback(repos);
        });
        mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);
        mockObjectStorage.delete.mockResolvedValue(undefined);
      }
    });

    it("should handle category with status transition from ACTIVE to INACTIVE", async () => {
      const payloadWithStatusChange: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        status: ProductCategoryStatus.INACTIVE,
      };

      const commandWithStatusChange: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithStatusChange,
      };

      await useCase.execute(commandWithStatusChange);
      expect(mockProductCategory.setStatus).toHaveBeenCalledWith(ProductCategoryStatus.INACTIVE);
    });

    it("should handle category with status transition from INACTIVE to ACTIVE", async () => {
      mockProductCategory.getStatus.mockReturnValue(ProductCategoryStatus.INACTIVE);

      const payloadWithStatusChange: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        status: ProductCategoryStatus.ACTIVE,
      };

      const commandWithStatusChange: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithStatusChange,
      };

      await useCase.execute(commandWithStatusChange);
      expect(mockProductCategory.setStatus).toHaveBeenCalledWith(ProductCategoryStatus.ACTIVE);
    });
  });

  describe("return value verification", () => {
    it("should return the category id after successful update", async () => {
      const result = await useCase.execute(mockCommand);
      expect(result).toEqual({ id: mockCategoryId });
      expect(result.id).toBe(mockCategoryId);
    });

    it("should return correct id from payload", async () => {
      const customId = "custom-cat-123";
      const payloadWithCustomId: UpdateProductCategoryPayload = {
        id: customId,
        name: "Updated Category",
      };

      const commandWithCustomId: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithCustomId,
      };

      const result = await useCase.execute(commandWithCustomId);
      expect(result.id).toBe(customId);
    });

    it("should return id even when image upload is skipped", async () => {
      const payloadWithoutImage: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        name: "Updated Category",
      };

      const commandWithoutImage: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithoutImage,
      };

      const result = await useCase.execute(commandWithoutImage);
      expect(result.id).toBe(mockCategoryId);
    });
  });

  describe("error handling scenarios", () => {
    it("should handle repository timeout error", async () => {
      const timeoutError = new Error("Timeout error");
      mockUnitOfWork.commit.mockRejectedValue(timeoutError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Timeout error");
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
    });

    it("should handle repository connection error", async () => {
      const connectionError = new Error("Database connection error");
      mockUnitOfWork.commit.mockRejectedValue(connectionError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Database connection error");
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
    });

    it("should handle ProductPolicyService throwing different error types", async () => {
      const permissionError = new Error("Custom permission error");
      (ProductCategoryAccessControlService.assertCanUpdate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Custom permission error");
    });

    it("should handle null category from repository", async () => {
      mockProductCategoryRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());
    });

    it("should handle upload failure with partial upload", async () => {
      const uploadError = new Error("Upload failed");
      mockObjectStorage.upload.mockRejectedValue(uploadError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(uploadError);
      expect(mockObjectStorage.delete).not.toHaveBeenCalled();
    });

    it("should handle rollback delete failure during repository error", async () => {
      const dbError = new Error("Database error");
      const deleteError = new Error("Delete failed");
      mockUnitOfWork.commit.mockRejectedValue(dbError);
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(dbError);
      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "UpdateProductCategoryUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error: deleteError },
      });
    });
  });

  describe("private method resolveImageUpload", () => {
    it("should upload image when payload has image", async () => {
      await useCase.execute(mockCommand);
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload);
    });

    it("should not upload image when payload has no image", async () => {
      const payloadWithoutImage: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        name: "Updated Category",
      };

      const commandWithoutImage: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithoutImage,
      };

      await useCase.execute(commandWithoutImage);
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
    });
  });

  describe("private method performUpdateProductCategory", () => {
    it("should update all fields when provided", async () => {
      await useCase.execute(mockCommand);

      expect(mockProductCategory.rename).toHaveBeenCalledWith(mockPayload.name);
      expect(mockProductCategory.changeDescription).toHaveBeenCalledWith(mockPayload.description);
      expect(mockProductCategory.setImage).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockProductCategory.setStatus).toHaveBeenCalledWith(mockPayload.status);
    });

    it("should only update provided fields", async () => {
      const partialPayload: UpdateProductCategoryPayload = {
        id: mockCategoryId,
        name: "New Name",
      };

      const partialCommand: UpdateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: partialPayload,
      };

      await useCase.execute(partialCommand);

      expect(mockProductCategory.rename).toHaveBeenCalledWith("New Name");
      expect(mockProductCategory.changeDescription).not.toHaveBeenCalled();
      expect(mockProductCategory.setImage).not.toHaveBeenCalled();
      expect(mockProductCategory.setStatus).not.toHaveBeenCalled();
    });
  });
});
