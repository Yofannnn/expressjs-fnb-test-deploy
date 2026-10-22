import { CreateProductUseCase } from "@/application/use-cases/product/create-product.use-case";
import { CreateProductCommand, CreateProductPayload } from "@/application/ports/driving/create-product.use-case";
import { ProductCategoryRepository } from "@/application/ports/driven/product-category.repository";
import { Logger } from "@/application/ports/driven/logger";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { Product } from "@/domain/entities/product.entity";
import { UnitOfWork, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work";
import { IdGenerator } from "@/application/ports/driven/id-generator";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import { ObjectStorage, UploadFilePayload } from "@/application/ports/driven/object-storage";
import { PRODUCT_CATEGORY_EXCEPTIONS } from "@/application/exceptions/product-category.exceptions";
import { ProductType } from "@/domain/types/product-type.enum";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { ProductStatus } from "@/domain/types/product-status.enum";

jest.mock("@/domain/services/product-access-control.service");
jest.mock("@/domain/entities/product.entity");

describe("CreateProductUseCase", () => {
  let useCase: CreateProductUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;
  let mockProductCategoryRepository: jest.Mocked<ProductCategoryRepository>;
  let mockIdGenerator: jest.Mocked<IdGenerator>;
  let mockObjectStorage: jest.Mocked<ObjectStorage>;
  let mockLogger: jest.Mocked<Logger>;
  let mockProduct: jest.Mocked<Product>;
  let mockProductCategory: jest.Mocked<ProductCategory>;

  const mockUserId = "user-123";
  const mockUserRole = UserRoleType.ADMIN;
  const mockCategoryId = "cat-456";
  const mockProductId = "prod-789";
  const mockStartTime = 1000;
  const mockUploadedUrls = ["https://storage.com/uploaded1.jpg", "https://storage.com/uploaded2.jpg"];
  const mockFileBuffer1 = Buffer.from("image1-data");
  const mockFileBuffer2 = Buffer.from("image2-data");

  const mockUploadPayload1: UploadFilePayload = {
    fileBuffer: mockFileBuffer1,
    fileName: "image1.jpg",
    mimeType: "image/jpeg",
    fileSize: 1024,
  };

  const mockUploadPayload2: UploadFilePayload = {
    fileBuffer: mockFileBuffer2,
    fileName: "image2.jpg",
    mimeType: "image/jpeg",
    fileSize: 2048,
  };

  const mockPayload: CreateProductPayload = {
    categoryId: mockCategoryId,
    name: "Test Product",
    description: "Test Description",
    price: 50000,
    type: ProductType.FOOD,
    images: [mockUploadPayload1, mockUploadPayload2],
    stockQuantity: 100,
    ingredients: "Ingredient 1, Ingredient 2",
    preparationTimeInMinutes: 15,
  };

  const mockCommand: CreateProductCommand = {
    userId: mockUserId,
    userRole: mockUserRole,
    payload: mockPayload,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductCategory = {
      getId: jest.fn().mockReturnValue(mockCategoryId),
      getName: jest.fn().mockReturnValue("Test Category"),
      getDescription: jest.fn().mockReturnValue("Category Description"),
      getImageUrl: jest.fn().mockReturnValue("https://example.com/category.jpg"),
      getStatus: jest.fn().mockReturnValue("ACTIVE"),
      getSortOrder: jest.fn().mockReturnValue(1),
      getCreatedAt: jest.fn().mockReturnValue(new Date()),
      getUpdatedAt: jest.fn().mockReturnValue(new Date()),
      isCurrentlyActive: jest.fn().mockReturnValue(true),
      rename: jest.fn(),
      changeDescription: jest.fn(),
      setImage: jest.fn(),
      reorder: jest.fn(),
      setStatus: jest.fn(),
    } as unknown as jest.Mocked<ProductCategory>;

    mockProduct = {
      getId: jest.fn().mockReturnValue(mockProductId),
      getCategoryId: jest.fn().mockReturnValue(mockCategoryId),
      getName: jest.fn().mockReturnValue("Test Product"),
      getDescription: jest.fn().mockReturnValue("Test Description"),
      getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(50000) }),
      getType: jest.fn().mockReturnValue(ProductType.FOOD),
      getIngredients: jest.fn().mockReturnValue("Ingredient 1, Ingredient 2"),
      getPreparationTimeInMinutes: jest.fn().mockReturnValue(15),
      getStockQuantity: jest.fn().mockReturnValue(100),
      getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
      getImages: jest.fn().mockReturnValue([]),
      getCreatedAt: jest.fn().mockReturnValue(new Date()),
      getUpdatedAt: jest.fn().mockReturnValue(new Date()),
    } as unknown as jest.Mocked<Product>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWork>;

    mockProductCategoryRepository = {
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findAll: jest.fn(),
      browse: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProductCategoryRepository>;

    mockIdGenerator = {
      generate: jest.fn().mockReturnValue(mockProductId),
    } as unknown as jest.Mocked<IdGenerator>;

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

    (ProductAccessControlService.assertCanCreate as jest.Mock).mockImplementation(() => {});

    (Product.create as jest.Mock).mockReturnValue(mockProduct);

    mockProductCategoryRepository.findById.mockResolvedValue(mockProductCategory);
    mockObjectStorage.upload.mockResolvedValueOnce(mockUploadedUrls[0]).mockResolvedValueOnce(mockUploadedUrls[1]);
    mockObjectStorage.delete.mockResolvedValue(undefined);
    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        productRepository: {
          insert: jest.fn().mockResolvedValue(undefined),
        },
      } as unknown as UnitOfWorkRepositories;
      await callback(repos);
    });

    useCase = new CreateProductUseCase(mockUnitOfWork, mockProductCategoryRepository, mockIdGenerator, mockObjectStorage, mockLogger);
  });

  describe("execute", () => {
    it("should successfully create a product", async () => {
      const result = await useCase.execute(mockCommand);

      expect(result).toEqual({ id: mockProductId });
      expect(ProductAccessControlService.assertCanCreate).toHaveBeenCalledWith(mockUserRole);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "CreateProductUseCase",
        event: "CREATE_PRODUCT_STARTED",
        message: "Creating product",
        data: { userId: mockUserId },
      });
      expect(mockProductCategoryRepository.findById).toHaveBeenCalledWith(mockCategoryId);
      expect(mockObjectStorage.upload).toHaveBeenCalledTimes(2);
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload1);
      expect(mockObjectStorage.upload).toHaveBeenCalledWith(mockUploadPayload2);
      expect(mockIdGenerator.generate).toHaveBeenCalled();
      expect(Product.create).toHaveBeenCalledWith({
        id: mockProductId,
        categoryId: mockCategoryId,
        name: mockPayload.name,
        description: mockPayload.description,
        price: mockPayload.price,
        type: mockPayload.type,
        imageUrls: mockUploadedUrls,
        stockQuantity: mockPayload.stockQuantity,
        ingredients: mockPayload.ingredients,
        preparationTimeInMinutes: mockPayload.preparationTimeInMinutes,
      });
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "CreateProductUseCase",
        event: "CREATE_PRODUCT_SUCCESSFUL",
        message: "Product created successfully",
        durationMs: expect.any(Number),
      });
    });

    it("should create a product without optional fields", async () => {
      const minimalPayload: CreateProductPayload = {
        categoryId: mockCategoryId,
        name: "Minimal Product",
        price: 50000,
        type: ProductType.DRINK,
        images: [mockUploadPayload1],
      };

      const minimalCommand: CreateProductCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: minimalPayload,
      };

      mockObjectStorage.upload.mockReset();
      mockObjectStorage.upload.mockResolvedValueOnce(mockUploadedUrls[0]);

      await useCase.execute(minimalCommand);

      expect(Product.create).toHaveBeenCalledWith({
        id: mockProductId,
        categoryId: mockCategoryId,
        name: minimalPayload.name,
        description: undefined,
        price: minimalPayload.price,
        type: minimalPayload.type,
        imageUrls: [mockUploadedUrls[0]],
        stockQuantity: undefined,
        ingredients: undefined,
        preparationTimeInMinutes: undefined,
      });
    });

    it("should create a product with empty images array", async () => {
      const payloadWithoutImages: CreateProductPayload = {
        ...mockPayload,
        images: [],
      };

      const commandWithoutImages: CreateProductCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithoutImages,
      };

      await useCase.execute(commandWithoutImages);

      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(Product.create).toHaveBeenCalledWith({
        id: mockProductId,
        categoryId: mockCategoryId,
        name: payloadWithoutImages.name,
        description: payloadWithoutImages.description,
        price: payloadWithoutImages.price,
        type: payloadWithoutImages.type,
        imageUrls: [],
        stockQuantity: payloadWithoutImages.stockQuantity,
        ingredients: payloadWithoutImages.ingredients,
        preparationTimeInMinutes: payloadWithoutImages.preparationTimeInMinutes,
      });
    });

    it("should throw error when user does not have permission", async () => {
      const permissionError = new Error("Permission denied");
      (ProductAccessControlService.assertCanCreate as jest.Mock).mockImplementation(() => {
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
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should throw error when category is inactive", async () => {
      mockProductCategory.isCurrentlyActive.mockReturnValue(false);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_INACTIVE());
      expect(mockProductCategoryRepository.findById).toHaveBeenCalledWith(mockCategoryId);
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should rollback uploaded images when unit of work fails", async () => {
      const dbError = new Error("Database error");
      mockUnitOfWork.commit.mockRejectedValue(dbError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(dbError);

      expect(mockObjectStorage.upload).toHaveBeenCalledTimes(2);
      expect(mockObjectStorage.delete).toHaveBeenCalledTimes(2);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrls[0]);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrls[1]);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should not attempt any rollback when commit fails and there were no images", async () => {
      const dbError = new Error("Database error");
      const payloadWithoutImages: CreateProductPayload = {
        ...mockPayload,
        images: [],
      };
      const commandWithoutImages: CreateProductCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: payloadWithoutImages,
      };
      mockUnitOfWork.commit.mockRejectedValue(dbError);

      await expect(useCase.execute(commandWithoutImages)).rejects.toThrow(dbError);

      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockObjectStorage.delete).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should log warning when image deletion fails during rollback", async () => {
      const dbError = new Error("Database error");
      const deletionError = new Error("Deletion failed");

      mockUnitOfWork.commit.mockRejectedValue(dbError);
      mockObjectStorage.delete.mockResolvedValueOnce(undefined).mockRejectedValueOnce(deletionError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(dbError);

      expect(mockObjectStorage.delete).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "CreateProductUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error: deletionError },
      });
    });

    it("should handle object storage upload failure", async () => {
      const uploadError = new Error("Upload failed");
      mockObjectStorage.upload.mockReset();
      mockObjectStorage.upload.mockRejectedValueOnce(uploadError).mockResolvedValueOnce(mockUploadedUrls[1]);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(uploadError);

      expect(mockObjectStorage.upload).toHaveBeenCalledTimes(1);
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockObjectStorage.delete).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle second object storage upload failure", async () => {
      const uploadError = new Error("Upload failed");
      mockObjectStorage.upload.mockReset();
      mockObjectStorage.upload.mockResolvedValueOnce(mockUploadedUrls[0]).mockRejectedValueOnce(uploadError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(uploadError);
      expect(mockObjectStorage.upload).toHaveBeenCalledTimes(2);
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalledTimes(1);
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(mockUploadedUrls[0]);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should log warning when rollback of a partially uploaded image fails", async () => {
      const uploadError = new Error("Upload failed");
      const deletionError = new Error("Deletion failed");
      mockObjectStorage.upload.mockReset();
      mockObjectStorage.upload.mockResolvedValueOnce(mockUploadedUrls[0]).mockRejectedValueOnce(uploadError);
      mockObjectStorage.delete.mockReset();
      mockObjectStorage.delete.mockRejectedValueOnce(deletionError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(uploadError);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "CreateProductUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error: deletionError },
      });
    });

    it("should handle id generator error", async () => {
      const idError = new Error("ID generation failed");
      mockIdGenerator.generate.mockImplementation(() => {
        throw idError;
      });

      mockObjectStorage.upload.mockReset();
      mockObjectStorage.upload.mockResolvedValueOnce(mockUploadedUrls[0]).mockResolvedValueOnce(mockUploadedUrls[1]);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(idError);
      expect(mockObjectStorage.upload).toHaveBeenCalledTimes(2);
      expect(mockObjectStorage.delete).toHaveBeenCalledTimes(2);
      expect(Product.create).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should handle Product.create error", async () => {
      const createError = new Error("Product creation failed");
      (Product.create as jest.Mock).mockImplementation(() => {
        throw createError;
      });

      await expect(useCase.execute(mockCommand)).rejects.toThrow(createError);
      expect(mockObjectStorage.upload).toHaveBeenCalledTimes(2);
      expect(mockObjectStorage.delete).toHaveBeenCalledTimes(2);
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should handle category repository error", async () => {
      const repoError = new Error("Repository error");
      mockProductCategoryRepository.findById.mockRejectedValue(repoError);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(repoError);
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("logging scenarios", () => {
    it("should log debug message with userId", async () => {
      await useCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "CreateProductUseCase",
        event: "CREATE_PRODUCT_STARTED",
        message: "Creating product",
        data: { userId: mockUserId },
      });
    });

    it("should log successful creation with duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(mockStartTime);
      dateNowSpy.mockReturnValueOnce(mockStartTime + 150);

      await useCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "CreateProductUseCase",
        event: "CREATE_PRODUCT_SUCCESSFUL",
        message: "Product created successfully",
        durationMs: 150,
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
  });

  describe("edge cases and integration scenarios", () => {
    it("should handle different user roles", async () => {
      const roles = [UserRoleType.ADMIN, UserRoleType.MANAGER];

      for (const role of roles) {
        const commandWithRole: CreateProductCommand = {
          ...mockCommand,
          userRole: role,
        };

        await useCase.execute(commandWithRole);
        expect(ProductAccessControlService.assertCanCreate).toHaveBeenCalledWith(role);
      }
    });

    it("should handle product with no ingredients and no preparation time", async () => {
      const minimalPayload: CreateProductPayload = {
        categoryId: mockCategoryId,
        name: "Simple Product",
        price: 50000,
        type: ProductType.DRINK,
        images: [mockUploadPayload1],
      };

      const minimalCommand: CreateProductCommand = {
        userId: mockUserId,
        userRole: mockUserRole,
        payload: minimalPayload,
      };

      mockObjectStorage.upload.mockResolvedValueOnce(mockUploadedUrls[0]);

      await useCase.execute(minimalCommand);

      expect(Product.create).toHaveBeenCalledWith({
        id: mockProductId,
        categoryId: mockCategoryId,
        name: minimalPayload.name,
        description: undefined,
        price: minimalPayload.price,
        type: minimalPayload.type,
        imageUrls: [mockUploadedUrls[0]],
        stockQuantity: undefined,
        ingredients: undefined,
        preparationTimeInMinutes: undefined,
      });
    });

    it("should handle product with very large number of images", async () => {
      const imageCount = 10;
      const images = Array.from({ length: imageCount }, (_, i) => ({
        fileBuffer: Buffer.from(`image${i}-data`),
        fileName: `image${i}.jpg`,
        mimeType: "image/jpeg",
        fileSize: 1024 + i,
      }));
      const uploadedUrls = Array.from({ length: imageCount }, (_, i) => `https://storage.com/uploaded${i}.jpg`);

      const payloadWithManyImages: CreateProductPayload = {
        ...mockPayload,
        images,
      };

      const commandWithManyImages: CreateProductCommand = {
        ...mockCommand,
        payload: payloadWithManyImages,
      };

      mockObjectStorage.upload.mockReset();
      uploadedUrls.forEach((url) => {
        mockObjectStorage.upload.mockResolvedValueOnce(url);
      });

      await useCase.execute(commandWithManyImages);

      expect(mockObjectStorage.upload).toHaveBeenCalledTimes(imageCount);
      images.forEach((image) => {
        expect(mockObjectStorage.upload).toHaveBeenCalledWith({
          fileBuffer: image.fileBuffer,
          fileName: image.fileName,
          mimeType: image.mimeType,
          fileSize: image.fileSize,
        });
      });
      expect(Product.create).toHaveBeenCalledWith({
        id: mockProductId,
        categoryId: mockCategoryId,
        name: mockPayload.name,
        description: mockPayload.description,
        price: mockPayload.price,
        type: mockPayload.type,
        imageUrls: uploadedUrls,
        stockQuantity: mockPayload.stockQuantity,
        ingredients: mockPayload.ingredients,
        preparationTimeInMinutes: mockPayload.preparationTimeInMinutes,
      });
    });

    it("should handle image uploads with different file types", async () => {
      const images = [
        { fileBuffer: Buffer.from("png-data"), fileName: "image1.png", mimeType: "image/png", fileSize: 500 },
        { fileBuffer: Buffer.from("webp-data"), fileName: "image2.webp", mimeType: "image/webp", fileSize: 300 },
      ];

      const payloadWithDifferentTypes: CreateProductPayload = {
        ...mockPayload,
        images,
      };

      const commandWithDifferentTypes: CreateProductCommand = {
        ...mockCommand,
        payload: payloadWithDifferentTypes,
      };

      mockObjectStorage.upload.mockResolvedValueOnce("url1").mockResolvedValueOnce("url2");

      await useCase.execute(commandWithDifferentTypes);

      expect(mockObjectStorage.upload).toHaveBeenCalledWith({
        fileBuffer: images[0].fileBuffer,
        fileName: images[0].fileName,
        mimeType: images[0].mimeType,
        fileSize: images[0].fileSize,
      });
      expect(mockObjectStorage.upload).toHaveBeenCalledWith({
        fileBuffer: images[1].fileBuffer,
        fileName: images[1].fileName,
        mimeType: images[1].mimeType,
        fileSize: images[1].fileSize,
      });
    });

    it("should handle category validation with cache", async () => {
      await useCase.execute(mockCommand);
      expect(mockProductCategoryRepository.findById).toHaveBeenCalledTimes(1);

      mockProductCategoryRepository.findById.mockResolvedValue(mockProductCategory);
      mockObjectStorage.upload.mockResolvedValueOnce(mockUploadedUrls[0]).mockResolvedValueOnce(mockUploadedUrls[1]);

      await useCase.execute(mockCommand);
      expect(mockProductCategoryRepository.findById).toHaveBeenCalledTimes(2);
    });
  });

  describe("return value verification", () => {
    it("should return the product id after successful creation", async () => {
      const result = await useCase.execute(mockCommand);
      expect(result).toEqual({ id: mockProductId });
      expect(result.id).toBe(mockProductId);
    });

    it("should return correct id from Product entity", async () => {
      const customId = "custom-prod-123";
      const mockProductWithCustomId = {
        ...mockProduct,
        getId: jest.fn().mockReturnValue(customId),
      };
      (Product.create as jest.Mock).mockReturnValue(mockProductWithCustomId);

      const result = await useCase.execute(mockCommand);
      expect(result.id).toBe(customId);
    });
  });

  describe("private method validateCategory", () => {
    it("should validate active category successfully", async () => {
      await useCase.execute(mockCommand);
      expect(mockProductCategoryRepository.findById).toHaveBeenCalledWith(mockCategoryId);
      expect(mockProductCategory.isCurrentlyActive).toHaveBeenCalled();
    });

    it("should throw error when category is not found", async () => {
      mockProductCategoryRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_NOT_FOUND());
    });

    it("should throw error when category is inactive", async () => {
      mockProductCategory.isCurrentlyActive.mockReturnValue(false);

      await expect(useCase.execute(mockCommand)).rejects.toThrow(PRODUCT_CATEGORY_EXCEPTIONS.CATEGORY_INACTIVE());
    });
  });

  describe("private method buildProductEntity", () => {
    it("should build product entity with all fields", async () => {
      await useCase.execute(mockCommand);
      expect(Product.create).toHaveBeenCalledWith({
        id: mockProductId,
        categoryId: mockCategoryId,
        name: mockPayload.name,
        description: mockPayload.description,
        price: mockPayload.price,
        type: mockPayload.type,
        imageUrls: mockUploadedUrls,
        stockQuantity: mockPayload.stockQuantity,
        ingredients: mockPayload.ingredients,
        preparationTimeInMinutes: mockPayload.preparationTimeInMinutes,
      });
    });

    it("should use generated ID from idGenerator", async () => {
      const generatedId = "generated-id-123";
      mockIdGenerator.generate.mockReturnValue(generatedId);

      await useCase.execute(mockCommand);

      expect(Product.create).toHaveBeenCalledWith({
        id: generatedId,
        categoryId: mockCategoryId,
        name: mockPayload.name,
        description: mockPayload.description,
        price: mockPayload.price,
        type: mockPayload.type,
        imageUrls: mockUploadedUrls,
        stockQuantity: mockPayload.stockQuantity,
        ingredients: mockPayload.ingredients,
        preparationTimeInMinutes: mockPayload.preparationTimeInMinutes,
      });
    });
  });
});
