import { CreateProductCategoryUseCase } from "@/application/use-cases/product/product-category/create-product-category.use-case";
import { CreateProductCategoryCommand, CreateProductCategoryPayload } from "@/application/ports/driving/create-product-category.use-case";
import { IdGenerator } from "@/application/ports/driven/id-generator";
import { Logger } from "@/application/ports/driven/logger";
import { ObjectStorage, UploadFilePayload } from "@/application/ports/driven/object-storage";
import { UnitOfWork, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { ProductCategoryStatus } from "@/domain/types/product-category-status.enum";
import { ProductCategoryAccessControlService } from "@/domain/services/product-category-access-control.service";

jest.mock("@/domain/services/product-category-access-control.service");
jest.mock("@/domain/entities/product-category.entity");

describe("CreateProductCategoryUseCase", () => {
  let useCase: CreateProductCategoryUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockObjectStorage: jest.Mocked<ObjectStorage>;
  let mockIdGenerator: jest.Mocked<IdGenerator>;
  let mockLogger: jest.Mocked<Logger>;
  let mockProductCategory: jest.Mocked<ProductCategory>;

  const mockUserId = "user-123";
  const mockUserRole = UserRoleType.ADMIN;
  const mockCategoryId = "cat-456";
  const mockStartTime = 1000;
  const mockUploadedUrl = "https://storage.com/uploaded-image.jpg";
  const mockFileBuffer = Buffer.from("image-data");
  const mockNextSortOrder = 10;

  const mockUploadPayload: UploadFilePayload = {
    fileBuffer: mockFileBuffer,
    fileName: "category-image.jpg",
    mimeType: "image/jpeg",
    fileSize: 1024,
  };

  const mockPayload: CreateProductCategoryPayload = {
    name: "Test Category",
    description: "Test Description",
    image: mockUploadPayload,
  };

  const mockCommand: CreateProductCategoryCommand = {
    userId: mockUserId,
    userRole: mockUserRole,
    payload: mockPayload,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductCategory = {
      getId: jest.fn().mockReturnValue(mockCategoryId),
      getName: jest.fn().mockReturnValue("Test Category"),
      getDescription: jest.fn().mockReturnValue("Test Description"),
      getImageUrl: jest.fn().mockReturnValue(mockUploadedUrl),
      getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
      getSortOrder: jest.fn().mockReturnValue(mockNextSortOrder),
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

    mockIdGenerator = {
      generate: jest.fn().mockReturnValue(mockCategoryId),
    } as unknown as jest.Mocked<IdGenerator>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    (ProductCategoryAccessControlService.assertCanCreate as jest.Mock).mockImplementation(() => {});

    (ProductCategory.create as jest.Mock).mockReturnValue(mockProductCategory);

    mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);
    mockObjectStorage.delete.mockResolvedValue(undefined);
    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        productCategoryRepository: {
          insert: jest.fn().mockResolvedValue(undefined),
          getNextSortOrder: jest.fn().mockResolvedValue(mockNextSortOrder),
        },
      } as unknown as UnitOfWorkRepositories;
      const result = await callback(repos);
      return result;
    });

    useCase = new CreateProductCategoryUseCase(mockUnitOfWork, mockObjectStorage, mockIdGenerator, mockLogger);
  });

  describe("execute", () => {
    it("should successfully create a product category with image", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toEqual({ id: mockCategoryId });
      expect(ProductCategoryAccessControlService.assertCanCreate).toHaveBeenCalledWith(mockUserRole);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "CreateProductCategoryUseCase",
        event: "CREATE_PRODUCT_CATEGORY_STARTED",
        message: "User is creating product category",
        data: { userId: mockUserId, name: mockPayload.name },
      });
      expect(mockIdGenerator.generate).toHaveBeenCalled();
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "CreateProductCategoryUseCase",
        event: "CREATE_PRODUCT_CATEGORY_SUCCESSFUL",
        message: "Product category created successfully",
        durationMs: expect.any(Number),
      });
    });

    it("should successfully create a product category without image", async () => {
      const payloadWithoutImage: CreateProductCategoryPayload = {
        name: "Test Category",
        description: "Test Description",
      };

      const commandWithoutImage: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithoutImage,
      };

      const result = await useCase.execute(commandWithoutImage);

      expect(result).toEqual({ id: mockCategoryId });
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: payloadWithoutImage.name,
        description: payloadWithoutImage.description,
        imageUrl: undefined,
        sortOrder: mockNextSortOrder,
      });
    });

    it("should successfully create a product category with only name", async () => {
      const payloadWithOnlyName: CreateProductCategoryPayload = {
        name: "Test Category",
      };

      const commandWithOnlyName: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithOnlyName,
      };

      const result = await useCase.execute(commandWithOnlyName);

      expect(result).toEqual({ id: mockCategoryId });
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: payloadWithOnlyName.name,
        description: undefined,
        imageUrl: undefined,
        sortOrder: mockNextSortOrder,
      });
    });

    it("should throw error when user does not have permission", async () => {
      const permissionError = new Error("Permission denied");
      (ProductCategoryAccessControlService.assertCanCreate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow(permissionError);
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle object storage upload failure", async () => {
      const uploadError = new Error("Upload failed");
      mockObjectStorage.upload.mockRejectedValue(uploadError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(uploadError);
      expect(mockIdGenerator.generate).not.toHaveBeenCalled();
      expect(ProductCategory.create).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should rollback image upload when unit of work fails", async () => {
      const dbError = new Error("Database error");
      mockUnitOfWork.commit.mockRejectedValue(dbError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(dbError);

      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle rollback image deletion failure gracefully", async () => {
      const dbError = new Error("Database error");
      const deleteError = new Error("Delete failed");
      mockUnitOfWork.commit.mockRejectedValue(dbError);
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(dbError);

      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "CreateProductCategoryUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error: dbError },
      });
    });

    it("should not attempt to delete image if upload failed", async () => {
      const uploadError = new Error("Upload failed");
      mockObjectStorage.upload.mockRejectedValue(uploadError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(uploadError);

      expect(mockObjectStorage.delete).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should handle repository insert error", async () => {
      const insertError = new Error("Insert failed");
      mockUnitOfWork.commit.mockRejectedValue(insertError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(insertError);

      expect(mockObjectStorage.upload).toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
    });

    it("should handle id generator error", async () => {
      const idError = new Error("ID generation failed");
      mockIdGenerator.generate.mockImplementation(() => {
        throw idError;
      });

      mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(idError);

      expect(mockObjectStorage.upload).toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(ProductCategory.create).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should handle ProductCategory.create error", async () => {
      const createError = new Error("Create failed");
      (ProductCategory.create as jest.Mock).mockImplementation(() => {
        throw createError;
      });

      mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(createError);

      expect(mockObjectStorage.upload).toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it("should handle getNextSortOrder error", async () => {
      const sortOrderError = new Error("Failed to get next sort order");
      mockUnitOfWork.commit.mockImplementation(async () => {
        throw sortOrderError;
      });

      mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(sortOrderError);

      expect(mockObjectStorage.upload).toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with userId and category name", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "CreateProductCategoryUseCase",
        event: "CREATE_PRODUCT_CATEGORY_STARTED",
        message: "User is creating product category",
        data: { userId: mockUserId, name: mockPayload.name },
      });
    });

    it("should log successful creation with duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "CreateProductCategoryUseCase",
        event: "CREATE_PRODUCT_CATEGORY_SUCCESSFUL",
        message: "Product category created successfully",
        durationMs: 150,
      });

      dateNowSpy.mockRestore();
    });

    it("should log successful creation with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "CreateProductCategoryUseCase",
        event: "CREATE_PRODUCT_CATEGORY_SUCCESSFUL",
        message: "Product category created successfully",
        durationMs: 250,
      });

      dateNowSpy.mockRestore();
    });

    it("should not log info when creation fails", async () => {
      const error = new Error("Creation failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(error);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should not log info when upload fails", async () => {
      const uploadError = new Error("Upload failed");
      mockObjectStorage.upload.mockRejectedValue(uploadError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(uploadError);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should log warning when rollback image deletion fails", async () => {
      const dbError = new Error("Database error");
      const deleteError = new Error("Delete failed");
      mockUnitOfWork.commit.mockRejectedValue(dbError);
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(dbError);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "CreateProductCategoryUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error: dbError },
      });
    });
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle different user roles", async () => {
      const roles = [UserRoleType.ADMIN, UserRoleType.MANAGER];

      for (const role of roles) {
        const commandWithRole: CreateProductCategoryCommand = {
          ...mockCommand,
          userRole: role,
        };

        await useCase.execute(commandWithRole);
        expect(ProductCategoryAccessControlService.assertCanCreate).toHaveBeenCalledWith(role);
      }
    });

    it("should handle category with long name", async () => {
      const longName = "A".repeat(1000);
      const payloadWithLongName: CreateProductCategoryPayload = {
        name: longName,
        description: "Test Description",
      };

      const commandWithLongName: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithLongName,
      };

      await useCase.execute(commandWithLongName);

      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: longName,
        description: payloadWithLongName.description,
        imageUrl: undefined,
        sortOrder: mockNextSortOrder,
      });
    });

    it("should handle category with special characters in name", async () => {
      const specialName = "Category!@#$%^&*()";
      const payloadWithSpecialName: CreateProductCategoryPayload = {
        name: specialName,
        description: "Test Description",
      };

      const commandWithSpecialName: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithSpecialName,
      };

      await useCase.execute(commandWithSpecialName);

      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: specialName,
        description: payloadWithSpecialName.description,
        imageUrl: undefined,
        sortOrder: mockNextSortOrder,
      });
    });

    it("should handle category with null description", async () => {
      const payloadWithNullDescription: CreateProductCategoryPayload = {
        name: "Test Category",
        description: null as unknown as string,
      };

      const commandWithNullDescription: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithNullDescription,
      };

      await useCase.execute(commandWithNullDescription);

      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: payloadWithNullDescription.name,
        description: null,
        imageUrl: undefined,
        sortOrder: mockNextSortOrder,
      });
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

        const payload: CreateProductCategoryPayload = {
          name: "Test Category",
          description: "Test Description",
          image: uploadPayload,
        };

        const command: CreateProductCategoryCommand = {
          userId: mockUserId,
          userRole: mockUserRole,
          payload,
        };

        await useCase.execute(command);
        expect(mockObjectStorage.upload).toHaveBeenCalledWith(uploadPayload);
      }
    });

    it("should handle multiple sequential category creations", async () => {
      const categories = [{ name: "Category 1" }, { name: "Category 2" }, { name: "Category 3" }];

      for (const cat of categories) {
        const payload: CreateProductCategoryPayload = {
          name: cat.name,
        };

        const command: CreateProductCategoryCommand = {
          userId: mockUserId,
          userRole: mockUserRole,
          payload,
        };

        await useCase.execute(command);

        expect(ProductCategory.create).toHaveBeenCalledWith({
          id: mockCategoryId,
          name: cat.name,
          description: undefined,
          imageUrl: undefined,
          sortOrder: mockNextSortOrder,
        });

        jest.clearAllMocks();
        mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);
        mockUnitOfWork.commit.mockImplementation(async (callback) => {
          const repos = {
            productCategoryRepository: {
              insert: jest.fn().mockResolvedValue(undefined),
              getNextSortOrder: jest.fn().mockResolvedValue(mockNextSortOrder),
            },
          } as unknown as UnitOfWorkRepositories;
          const result = await callback(repos);
          return result;
        });
        (ProductCategory.create as jest.Mock).mockReturnValue(mockProductCategory);
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

      const payloadWithLargeImage: CreateProductCategoryPayload = {
        name: "Test Category",
        description: "Test Description",
        image: largeUploadPayload,
      };

      const commandWithLargeImage: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithLargeImage,
      };

      await useCase.execute(commandWithLargeImage);
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(largeUploadPayload);
    });

    it("should handle different sort orders from repository", async () => {
      const sortOrders = [1, 5, 10, 100];

      for (const sortOrder of sortOrders) {
        mockUnitOfWork.commit.mockImplementationOnce(async (callback) => {
          const repos = {
            productCategoryRepository: {
              insert: jest.fn().mockResolvedValue(undefined),
              getNextSortOrder: jest.fn().mockResolvedValue(sortOrder),
            },
          } as unknown as UnitOfWorkRepositories;
          const result = await callback(repos);
          return result;
        });

        await useCase.execute(mockCommand);

        expect(ProductCategory.create).toHaveBeenCalledWith({
          id: mockCategoryId,
          name: mockPayload.name,
          description: mockPayload.description,
          imageUrl: mockUploadedUrl,
          sortOrder: sortOrder,
        });
      }
    });
  });

  describe("return value verification", () => {
    it("should return the category id after successful creation", async () => {
      const result = await useCase.execute(mockCommand);
      expect(result).toEqual({ id: mockCategoryId });
      expect(result.id).toBe(mockCategoryId);
    });

    it("should return correct id from ProductCategory entity", async () => {
      const customId = "custom-cat-123";
      const mockCategoryWithCustomId = {
        ...mockProductCategory,
        getId: jest.fn().mockReturnValue(customId),
      };
      (ProductCategory.create as jest.Mock).mockReturnValue(mockCategoryWithCustomId);

      const result = await useCase.execute(mockCommand);
      expect(result.id).toBe(customId);
    });

    it("should return id even when image upload is skipped", async () => {
      const payloadWithoutImage: CreateProductCategoryPayload = {
        name: "Test Category",
      };

      const commandWithoutImage: CreateProductCategoryCommand = {
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

    it("should handle rollback delete failure during repository error", async () => {
      const dbError = new Error("Database error");
      const deleteError = new Error("Delete failed");
      mockUnitOfWork.commit.mockRejectedValue(dbError);
      mockObjectStorage.delete.mockRejectedValueOnce(deleteError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(dbError);

      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "CreateProductCategoryUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error: dbError },
      });
    });

    it("should handle ProductPolicyService throwing different error types", async () => {
      const permissionError = new Error("Custom permission error");
      (ProductCategoryAccessControlService.assertCanCreate as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow("Custom permission error");
    });

    it("should handle null response from ProductCategory.create", async () => {
      (ProductCategory.create as jest.Mock).mockReturnValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow();
    });

    it("should handle image upload and then ID generation failure", async () => {
      const idError = new Error("ID generation failed after upload");
      mockIdGenerator.generate.mockImplementationOnce(() => {
        throw idError;
      });

      mockObjectStorage.upload.mockResolvedValue(mockUploadedUrl);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(idError);

      expect(mockObjectStorage.upload).toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrl);
      expect(ProductCategory.create).not.toHaveBeenCalled();
    });
  });

  describe("private method buildProductCategory", () => {
    it("should build product category with image URL", async () => {
      await useCase.execute(mockCommand);

      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: mockPayload.name,
        description: mockPayload.description,
        imageUrl: mockUploadedUrl,
        sortOrder: mockNextSortOrder,
      });
    });

    it("should build product category without image URL", async () => {
      const payloadWithoutImage: CreateProductCategoryPayload = {
        name: "Test Category",
        description: "Test Description",
      };

      const commandWithoutImage: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithoutImage,
      };

      await useCase.execute(commandWithoutImage);

      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: payloadWithoutImage.name,
        description: payloadWithoutImage.description,
        imageUrl: undefined,
        sortOrder: mockNextSortOrder,
      });
    });

    it("should use generated ID from idGenerator", async () => {
      const generatedId = "generated-id-123";
      mockIdGenerator.generate.mockReturnValue(generatedId);

      await useCase.execute(mockCommand);

      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: generatedId,
        name: mockPayload.name,
        description: mockPayload.description,
        imageUrl: mockUploadedUrl,
        sortOrder: mockNextSortOrder,
      });
    });

    it("should use sortOrder from repository", async () => {
      const customSortOrder = 42;
      mockUnitOfWork.commit.mockImplementationOnce(async (callback) => {
        const repos = {
          productCategoryRepository: {
            insert: jest.fn().mockResolvedValue(undefined),
            getNextSortOrder: jest.fn().mockResolvedValue(customSortOrder),
          },
        } as unknown as UnitOfWorkRepositories;
        const result = await callback(repos);
        return result;
      });

      await useCase.execute(mockCommand);

      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: mockPayload.name,
        description: mockPayload.description,
        imageUrl: mockUploadedUrl,
        sortOrder: customSortOrder,
      });
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle description as empty string", async () => {
      const payloadWithEmptyDescription: CreateProductCategoryPayload = {
        name: "Test Category",
        description: "",
      };

      const commandWithEmptyDescription: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithEmptyDescription,
      };

      await useCase.execute(commandWithEmptyDescription);

      expect(ProductCategory.create).toHaveBeenCalledWith({
        id: mockCategoryId,
        name: payloadWithEmptyDescription.name,
        description: "",
        imageUrl: undefined,
        sortOrder: mockNextSortOrder,
      });
    });

    it("should handle image upload with zero file size", async () => {
      const zeroSizePayload: UploadFilePayload = {
        fileBuffer: Buffer.alloc(0),
        fileName: "empty-image.jpg",
        mimeType: "image/jpeg",
        fileSize: 0,
      };

      const payloadWithZeroSizeImage: CreateProductCategoryPayload = {
        name: "Test Category",
        image: zeroSizePayload,
      };

      const commandWithZeroSizeImage: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithZeroSizeImage,
      };

      await useCase.execute(commandWithZeroSizeImage);
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(zeroSizePayload);
    });

    it("should handle image upload with no file extension", async () => {
      const noExtensionPayload: UploadFilePayload = {
        fileBuffer: mockFileBuffer,
        fileName: "image",
        mimeType: "image/jpeg",
        fileSize: 1024,
      };

      const payloadWithNoExtension: CreateProductCategoryPayload = {
        name: "Test Category",
        image: noExtensionPayload,
      };

      const commandWithNoExtension: CreateProductCategoryCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithNoExtension,
      };

      await useCase.execute(commandWithNoExtension);
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(noExtensionPayload);
    });

    it("should handle commit returning the product category", async () => {
      const returnedCategory = mockProductCategory;
      mockUnitOfWork.commit.mockResolvedValueOnce(returnedCategory);

      const result = await useCase.execute(mockCommand);
      expect(result.id).toBe(mockCategoryId);
    });
  });
});
