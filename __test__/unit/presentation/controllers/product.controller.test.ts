import { Request, Response } from "express";
import { ProductController } from "@/presentation/controllers/product.controller";
import { RateLimit } from "@/application/ports/driving/rate-limit";
import { Validation } from "@/application/ports/driving/validation";
import { BrowseProductsUseCase, BrowseProductsResult } from "@/application/ports/driving/browse-products.use-case";
import { CreateProductUseCase } from "@/application/ports/driving/create-product.use-case";
import { GetProductDetailsUseCase } from "@/application/ports/driving/get-product-details.use-case";
import { SearchProductsUseCase, SearchProductsResult } from "@/application/ports/driving/search-products.use-case";
import { GetProductsByIdsResult, GetProductsByIdsUseCase } from "@/application/ports/driving/get-products-by-ids.use-case";
import { UpdateProductUseCase } from "@/application/ports/driving/update-product.use-case";
import { UpdateProductImageUseCase } from "@/application/ports/driving/update-product-image.use-case";
import { UpdateProductStockUseCase } from "@/application/ports/driving/update-product-stock.use-case";
import { UpdateProductStatusUseCase } from "@/application/ports/driving/update-product-status.use-case";
import { AuthTokenVerifier } from "@/application/ports/driven/auth-token-verifier";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { AppException } from "@/application/exceptions/app.exception";
import { AccessTokenPayload } from "@/application/types/auth-token.type";
import { UploadFilePayload } from "@/application/ports/driven/object-storage";
import { ProductStatus } from "@/domain/types/product-status.enum";
import { ProductType } from "@/domain/types/product-type.enum";
import { ProductSort } from "@/application/ports/driving/browse-products.use-case";
import { PRODUCT_RATE_LIMIT_POLICY } from "@/infrastructure/rate-limit/policies/product-rate-limit.policy";
import { ProductDetailsView, ProductSummaryView } from "@/application/types/product.type";
import { ProductPlainObject } from "@/domain/types/product.interface";
import {
  CreateProductSchema,
  UpdateProductSchema,
  GetProductDetailByIdSchema,
  GetProductsByIdsSchema,
  SearchProductsSchema,
  BrowseProductsSchema,
  UpdateProductStockSchema,
  UpdateProductStatusSchema,
  UpdateProductImageSchema,
} from "@/presentation/schemas/product.schemas";

jest.mock("@/presentation/utils/auth-token.utils", () => ({
  AuthTokenUtil: {
    requireAccessToken: jest.fn(),
  },
}));

const mockedAuthTokenUtil = jest.requireMock("@/presentation/utils/auth-token.utils").AuthTokenUtil;

describe("ProductController", () => {
  let controller: ProductController;

  let rateLimit: jest.Mocked<RateLimit>;
  let validation: jest.Mocked<Validation>;
  let browseProductsUseCase: jest.Mocked<BrowseProductsUseCase>;
  let searchProductsUseCase: jest.Mocked<SearchProductsUseCase>;
  let getProductsByIdsUseCase: jest.Mocked<GetProductsByIdsUseCase>;
  let getProductDetailsUseCase: jest.Mocked<GetProductDetailsUseCase>;
  let createProductUseCase: jest.Mocked<CreateProductUseCase>;
  let updateProductUseCase: jest.Mocked<UpdateProductUseCase>;
  let updateProductStockUseCase: jest.Mocked<UpdateProductStockUseCase>;
  let updateProductStatusUseCase: jest.Mocked<UpdateProductStatusUseCase>;
  let updateProductImageUseCase: jest.Mocked<UpdateProductImageUseCase>;
  let authTokenVerifier: jest.Mocked<AuthTokenVerifier>;

  let req: Partial<Request>;
  let res: Partial<Response>;

  const ACCESS_TOKEN = "access-token-value";
  const USER_ID = "user-123";
  const USER_ROLE = UserRoleType.ADMIN;
  const PRODUCT_ID = "product-123";
  const CATEGORY_ID = "category-123";

  const mockProductPlainObject: ProductPlainObject = {
    id: PRODUCT_ID,
    categoryId: CATEGORY_ID,
    name: "Classic Cheeseburger",
    price: 12.99,
    description: "Juicy beef patty with cheddar cheese, lettuce, tomato, and special sauce",
    type: ProductType.FOOD,
    ingredients: "Beef patty, cheddar cheese, lettuce, tomato, special sauce, sesame bun",
    preparationTimeInMinutes: 12,
    stockQuantity: 50,
    status: ProductStatus.AVAILABLE,
    images: [
      {
        productId: PRODUCT_ID,
        url: "https://example.com/products/cheeseburger-1.jpg",
        altText: "Classic Cheeseburger with cheese melting",
        isPrimary: true,
        sortOrder: 1,
      },
      {
        productId: PRODUCT_ID,
        url: "https://example.com/products/cheeseburger-2.jpg",
        altText: "Classic Cheeseburger side view",
        isPrimary: false,
        sortOrder: 2,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductDetail: ProductDetailsView = {
    id: PRODUCT_ID,
    category: {
      id: CATEGORY_ID,
      name: "Burgers",
      description: "Delicious gourmet burgers",
      imageUrl: "https://example.com/categories/burgers.jpg",
    },
    name: "Classic Cheeseburger",
    price: 12.99,
    description: "Juicy beef patty with cheddar cheese, lettuce, tomato, and special sauce",
    type: ProductType.FOOD,
    ingredients: "Beef patty, cheddar cheese, lettuce, tomato, special sauce, sesame bun",
    preparationTimeInMinutes: 12,
    stockQuantity: 50,
    status: ProductStatus.AVAILABLE,
    images: [
      {
        url: "https://example.com/products/cheeseburger-1.jpg",
        altText: "Classic Cheeseburger with cheese melting",
        isPrimary: true,
        sortOrder: 1,
      },
      {
        url: "https://example.com/products/cheeseburger-2.jpg",
        altText: "Classic Cheeseburger side view",
        isPrimary: false,
        sortOrder: 2,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductSummary: ProductSummaryView = {
    id: PRODUCT_ID,
    categoryId: CATEGORY_ID,
    name: "Classic Cheeseburger",
    price: 12.99,
    status: ProductStatus.AVAILABLE,
    primaryImageUrl: "https://example.com/products/cheeseburger-1.jpg",
  };

  const mockBrowseResult: BrowseProductsResult = {
    products: [mockProductSummary],
    nextCursor: null,
  };

  const mockSearchResult: SearchProductsResult = {
    products: [mockProductSummary],
    total: 1,
    didYouMean: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    rateLimit = { check: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RateLimit>;
    validation = { validate: jest.fn() } as unknown as jest.Mocked<Validation>;
    browseProductsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<BrowseProductsUseCase>;
    searchProductsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<SearchProductsUseCase>;
    getProductsByIdsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetProductsByIdsUseCase>;
    getProductDetailsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetProductDetailsUseCase>;
    createProductUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateProductUseCase>;
    updateProductUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateProductUseCase>;
    updateProductStockUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateProductStockUseCase>;
    updateProductStatusUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateProductStatusUseCase>;
    updateProductImageUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateProductImageUseCase>;
    authTokenVerifier = { verifyAccessToken: jest.fn() } as unknown as jest.Mocked<AuthTokenVerifier>;

    mockedAuthTokenUtil.requireAccessToken.mockReturnValue(ACCESS_TOKEN);

    authTokenVerifier.verifyAccessToken.mockReturnValue({
      sub: USER_ID,
      role: USER_ROLE,
      email: "admin@restaurant.com",
    } as AccessTokenPayload);

    controller = new ProductController(
      rateLimit,
      validation,
      browseProductsUseCase,
      searchProductsUseCase,
      getProductsByIdsUseCase,
      getProductDetailsUseCase,
      createProductUseCase,
      updateProductUseCase,
      updateProductStockUseCase,
      updateProductStatusUseCase,
      updateProductImageUseCase,
      authTokenVerifier,
    );

    req = { body: {}, params: {}, query: {}, cookies: {}, headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
  });

  describe("create", () => {
    const createProductData = {
      categoryId: CATEGORY_ID,
      name: "Classic Cheeseburger",
      price: 12.99,
      description: "Juicy beef patty with cheddar cheese",
      type: ProductType.FOOD,
      stockQuantity: 50,
      status: ProductStatus.AVAILABLE,
      ingredients: "Beef patty, cheddar cheese, lettuce, tomato",
      preparationTimeInMinutes: 12,
    };

    it("should create a product, set rate limit, and return 201 with product id", async () => {
      req.body = createProductData;
      validation.validate.mockReturnValue(createProductData);
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:create", PRODUCT_RATE_LIMIT_POLICY.CREATE_PRODUCT);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(validation.validate).toHaveBeenCalledWith(CreateProductSchema, createProductData);
      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: createProductData,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Product created successfully",
        data: { id: PRODUCT_ID },
      });
    });

    it("should create a drink product with image files", async () => {
      const drinkData = {
        categoryId: CATEGORY_ID,
        name: "Fresh Lemonade",
        price: 4.99,
        description: "Freshly squeezed lemonade with mint",
        type: ProductType.DRINK,
        stockQuantity: 100,
        status: ProductStatus.AVAILABLE,
        ingredients: "Lemon, sugar, water, mint",
        preparationTimeInMinutes: 3,
      };
      const files = [
        {
          originalname: "lemonade-1.jpg",
          buffer: Buffer.from("test1"),
          size: 1024,
          mimetype: "image/jpeg",
        },
        {
          originalname: "lemonade-2.jpg",
          buffer: Buffer.from("test2"),
          size: 2048,
          mimetype: "image/jpeg",
        },
      ] as unknown as Express.Multer.File[];
      req.body = drinkData;
      (req as unknown as Request).files = files;
      validation.validate.mockReturnValue(drinkData);
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(
        CreateProductSchema,
        expect.objectContaining({
          ...drinkData,
          images: files.map(
            (file) =>
              ({
                fileName: file.originalname,
                fileBuffer: file.buffer,
                fileSize: file.size,
                mimeType: file.mimetype,
              }) satisfies UploadFilePayload,
          ),
        }),
      );
    });

    it("should create a packaged product", async () => {
      const packagedData = {
        categoryId: CATEGORY_ID,
        name: "Potato Chips",
        price: 3.99,
        description: "Crispy salted potato chips",
        type: ProductType.PACKAGED,
        stockQuantity: 200,
        status: ProductStatus.AVAILABLE,
        ingredients: "Potato, salt, vegetable oil",
        preparationTimeInMinutes: null,
      };
      req.body = packagedData;
      validation.validate.mockReturnValue(packagedData);
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: packagedData,
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate missing access token errors", async () => {
      const err = new Error("Access token required");
      mockedAuthTokenUtil.requireAccessToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate token verification errors", async () => {
      const err = new Error("Invalid token");
      authTokenVerifier.verifyAccessToken.mockImplementation(() => {
        throw err;
      });
      req.body = createProductData;

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.body = createProductData;

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Create product failed");
      req.body = createProductData;
      validation.validate.mockReturnValue(createProductData);
      createProductUseCase.execute.mockRejectedValue(err);

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle AppException from use case", async () => {
      const appError = AppException.create({
        name: "ProductException",
        statusCode: 400,
        message: "Failed to create product",
      });
      req.body = createProductData;
      validation.validate.mockReturnValue(createProductData);
      createProductUseCase.execute.mockRejectedValue(appError);

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(appError);
    });

    it("should handle empty request body", async () => {
      req.body = {};
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductUseCase.execute).not.toHaveBeenCalled();
    });

    it("should handle product without preparation time", async () => {
      const noPrepData = {
        ...createProductData,
        preparationTimeInMinutes: null,
      };
      req.body = noPrepData;
      validation.validate.mockReturnValue(noPrepData);
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: noPrepData,
      });
    });

    it("should handle missing images in file upload", async () => {
      req.body = { name: "Test Product" };
      (req as unknown as Request).files = undefined;
      validation.validate.mockReturnValue({ name: "Test Product" });
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(CreateProductSchema, { name: "Test Product" });
    });
  });

  describe("update", () => {
    const updateProductData = {
      id: PRODUCT_ID,
      name: "Deluxe Cheeseburger",
      price: 14.99,
      description: "Double beef patty with cheddar cheese, bacon, lettuce, tomato",
      type: ProductType.FOOD,
      ingredients: "Double beef patty, cheddar cheese, bacon, lettuce, tomato",
      preparationTimeInMinutes: 15,
    };

    it("should update a product and return 200 with updated product id", async () => {
      req.body = updateProductData;
      validation.validate.mockReturnValue(updateProductData);
      updateProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.update(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:update", PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(validation.validate).toHaveBeenCalledWith(UpdateProductSchema, updateProductData);
      expect(updateProductUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: updateProductData,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: "Product updated successfully",
        data: { id: PRODUCT_ID },
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.update(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate missing access token errors", async () => {
      const err = new Error("Access token required");
      mockedAuthTokenUtil.requireAccessToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.update(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.body = updateProductData;

      await expect(controller.update(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Update failed");
      req.body = updateProductData;
      validation.validate.mockReturnValue(updateProductData);
      updateProductUseCase.execute.mockRejectedValue(err);

      await expect(controller.update(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle update with minimal data", async () => {
      const minimalData = { id: PRODUCT_ID, name: "Updated Burger" };
      req.body = minimalData;
      validation.validate.mockReturnValue(minimalData);
      updateProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.update(req as Request, res as Response);

      expect(updateProductUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: minimalData,
      });
    });
  });

  describe("updateStock", () => {
    const updateStockData = {
      id: PRODUCT_ID,
      setStock: 75,
    };

    it("should update product stock and return 200 with product id", async () => {
      req.body = updateStockData;
      validation.validate.mockReturnValue(updateStockData);
      updateProductStockUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStock(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:update-stock", PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT_STOCK);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(validation.validate).toHaveBeenCalledWith(UpdateProductStockSchema, updateStockData);
      expect(updateProductStockUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: updateStockData,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: "Product stock updated successfully",
        data: { id: PRODUCT_ID },
      });
    });

    it("should handle restock operation", async () => {
      const restockData = { id: PRODUCT_ID, restock: 25 };
      req.body = restockData;
      validation.validate.mockReturnValue(restockData);
      updateProductStockUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStock(req as Request, res as Response);

      expect(updateProductStockUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: restockData,
      });
    });

    it("should handle deduct stock operation", async () => {
      const deductData = { id: PRODUCT_ID, deductStock: 5 };
      req.body = deductData;
      validation.validate.mockReturnValue(deductData);
      updateProductStockUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStock(req as Request, res as Response);

      expect(updateProductStockUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: deductData,
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.updateStock(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductStockUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.body = updateStockData;

      await expect(controller.updateStock(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductStockUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Stock update failed");
      req.body = updateStockData;
      validation.validate.mockReturnValue(updateStockData);
      updateProductStockUseCase.execute.mockRejectedValue(err);

      await expect(controller.updateStock(req as Request, res as Response)).rejects.toThrow(err);
    });
  });

  describe("updateStatus", () => {
    it("should update product status to UNAVAILABLE", async () => {
      const updateStatusData = {
        id: PRODUCT_ID,
        setStatus: ProductStatus.UNAVAILABLE,
      };
      req.body = updateStatusData;
      validation.validate.mockReturnValue(updateStatusData);
      updateProductStatusUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStatus(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:update-status", PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT_STATUS);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(validation.validate).toHaveBeenCalledWith(UpdateProductStatusSchema, updateStatusData);
      expect(updateProductStatusUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: updateStatusData,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: "Product status updated successfully",
        data: { id: PRODUCT_ID },
      });
    });

    it("should update product status to OUT_OF_STOCK", async () => {
      const updateStatusData = {
        id: PRODUCT_ID,
        setStatus: ProductStatus.OUT_OF_STOCK,
      };
      req.body = updateStatusData;
      validation.validate.mockReturnValue(updateStatusData);
      updateProductStatusUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStatus(req as Request, res as Response);

      expect(updateProductStatusUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: updateStatusData,
      });
    });

    it("should update product status to DISCONTINUED", async () => {
      const updateStatusData = {
        id: PRODUCT_ID,
        setStatus: ProductStatus.DISCONTINUED,
      };
      req.body = updateStatusData;
      validation.validate.mockReturnValue(updateStatusData);
      updateProductStatusUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStatus(req as Request, res as Response);

      expect(updateProductStatusUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: updateStatusData,
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.updateStatus(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductStatusUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.body = { id: PRODUCT_ID, setStatus: ProductStatus.AVAILABLE };

      await expect(controller.updateStatus(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductStatusUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Status update failed");
      req.body = { id: PRODUCT_ID, setStatus: ProductStatus.AVAILABLE };
      validation.validate.mockReturnValue({ id: PRODUCT_ID, setStatus: ProductStatus.AVAILABLE });
      updateProductStatusUseCase.execute.mockRejectedValue(err);

      await expect(controller.updateStatus(req as Request, res as Response)).rejects.toThrow(err);
    });
  });

  describe("updateImage", () => {
    const updateImageData = {
      id: PRODUCT_ID,
      addImage: {
        fileName: "new-burger-image.jpg",
        fileBuffer: Buffer.from("test"),
        fileSize: 1024,
        mimeType: "image/jpeg",
      },
    };

    it("should update product image and return 200 with product id", async () => {
      req.body = updateImageData;
      validation.validate.mockReturnValue(updateImageData);
      updateProductImageUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateImage(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:update-image", PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT_IMAGE);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(validation.validate).toHaveBeenCalledWith(UpdateProductImageSchema, updateImageData);
      expect(updateProductImageUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: updateImageData,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: "Product image updated successfully",
        data: { id: PRODUCT_ID },
      });
    });

    it("should handle remove image operation", async () => {
      const removeImageData = {
        id: PRODUCT_ID,
        removeImage: "https://example.com/products/old-burger.jpg",
      };
      req.body = removeImageData;
      validation.validate.mockReturnValue(removeImageData);
      updateProductImageUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateImage(req as Request, res as Response);

      expect(updateProductImageUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: removeImageData,
      });
    });

    it("should handle replace image operation", async () => {
      const replaceImageData = {
        id: PRODUCT_ID,
        replaceImage: {
          oldImageUrl: "https://example.com/products/old-burger.jpg",
          newImage: {
            fileName: "new-burger-image.jpg",
            fileBuffer: Buffer.from("test"),
            fileSize: 1024,
            mimeType: "image/jpeg",
          },
        },
      };
      req.body = replaceImageData;
      validation.validate.mockReturnValue(replaceImageData);
      updateProductImageUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateImage(req as Request, res as Response);

      expect(updateProductImageUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: replaceImageData,
      });
    });

    it("should handle reorder images operation", async () => {
      const reorderData = {
        id: PRODUCT_ID,
        reorderedUrls: ["https://example.com/products/burger-2.jpg", "https://example.com/products/burger-1.jpg"],
      };
      req.body = reorderData;
      validation.validate.mockReturnValue(reorderData);
      updateProductImageUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateImage(req as Request, res as Response);

      expect(updateProductImageUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: reorderData,
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.updateImage(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductImageUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.body = updateImageData;

      await expect(controller.updateImage(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductImageUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Image update failed");
      req.body = updateImageData;
      validation.validate.mockReturnValue(updateImageData);
      updateProductImageUseCase.execute.mockRejectedValue(err);

      await expect(controller.updateImage(req as Request, res as Response)).rejects.toThrow(err);
    });
  });

  describe("getDetailById", () => {
    it("should get product detail by id and return 200 with product data", async () => {
      req.params = { id: PRODUCT_ID };
      validation.validate.mockReturnValue({ id: PRODUCT_ID });
      getProductDetailsUseCase.execute.mockResolvedValue(mockProductDetail);

      await controller.getDetailById(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:get-detail-by-id", PRODUCT_RATE_LIMIT_POLICY.GET_PRODUCT_DETAIL);
      expect(validation.validate).toHaveBeenCalledWith(GetProductDetailByIdSchema, { id: PRODUCT_ID });
      expect(getProductDetailsUseCase.execute).toHaveBeenCalledWith({ id: PRODUCT_ID });
      expect(res.json).toHaveBeenCalledWith({
        message: "Product retrieved successfully",
        data: mockProductDetail,
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);
      req.params = { id: PRODUCT_ID };

      await expect(controller.getDetailById(req as Request, res as Response)).rejects.toThrow(err);
      expect(getProductDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.params = { id: PRODUCT_ID };

      await expect(controller.getDetailById(req as Request, res as Response)).rejects.toThrow(err);
      expect(getProductDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Product not found");
      req.params = { id: PRODUCT_ID };
      validation.validate.mockReturnValue({ id: PRODUCT_ID });
      getProductDetailsUseCase.execute.mockRejectedValue(err);

      await expect(controller.getDetailById(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle undefined id in params", async () => {
      req.params = {};
      validation.validate.mockReturnValue({ id: undefined });
      getProductDetailsUseCase.execute.mockResolvedValue(mockProductDetail);

      await controller.getDetailById(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(GetProductDetailByIdSchema, { id: undefined });
    });
  });

  describe("getProductsByIds", () => {
    const productIds = ["burger-1", "burger-2", "burger-3"];
    const mockResult = {
      products: [mockProductPlainObject],
      notFoundIds: ["burger-2"],
    };

    it("should get products by ids and return 200 with products and not found ids", async () => {
      req.query = { id: productIds };
      validation.validate.mockReturnValue({ ids: productIds });
      getProductsByIdsUseCase.execute.mockResolvedValue(mockResult as unknown as GetProductsByIdsResult);

      await controller.getProductsByIds(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:get-products-by-ids", PRODUCT_RATE_LIMIT_POLICY.GET_PRODUCTS_BY_IDS);
      expect(validation.validate).toHaveBeenCalledWith(GetProductsByIdsSchema, { ids: productIds });
      expect(getProductsByIdsUseCase.execute).toHaveBeenCalledWith({ ids: productIds });
      expect(res.json).toHaveBeenCalledWith({
        message: "Products retrieved successfully",
        data: mockResult.products,
        notFoundIds: mockResult.notFoundIds,
      });
    });

    it("should handle single id as string", async () => {
      req.query = { id: "burger-1" };
      validation.validate.mockReturnValue({ ids: ["burger-1"] });
      getProductsByIdsUseCase.execute.mockResolvedValue({ products: [mockProductPlainObject], notFoundIds: [] });

      await controller.getProductsByIds(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(GetProductsByIdsSchema, { ids: ["burger-1"] });
    });

    it("should handle empty ids", async () => {
      req.query = {};
      validation.validate.mockReturnValue({ ids: [] });
      getProductsByIdsUseCase.execute.mockResolvedValue({ products: [], notFoundIds: [] });

      await controller.getProductsByIds(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(GetProductsByIdsSchema, { ids: [] });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);
      req.query = { id: productIds };

      await expect(controller.getProductsByIds(req as Request, res as Response)).rejects.toThrow(err);
      expect(getProductsByIdsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.query = { id: productIds };

      await expect(controller.getProductsByIds(req as Request, res as Response)).rejects.toThrow(err);
      expect(getProductsByIdsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Failed to fetch products");
      req.query = { id: productIds };
      validation.validate.mockReturnValue({ ids: productIds });
      getProductsByIdsUseCase.execute.mockRejectedValue(err);

      await expect(controller.getProductsByIds(req as Request, res as Response)).rejects.toThrow(err);
    });
  });

  describe("browse", () => {
    const browseQuery = {
      categoryId: CATEGORY_ID,
      type: ProductType.FOOD,
      status: ProductStatus.AVAILABLE,
      minPrice: 5,
      maxPrice: 20,
      sort: ProductSort.NAME_ASC,
      cursor: "cursor-123",
      limit: 20,
    };

    it("should browse products and return 200 with products and next cursor", async () => {
      req.query = browseQuery as unknown as Record<string, string>;
      validation.validate.mockReturnValue(browseQuery);
      browseProductsUseCase.execute.mockResolvedValue(mockBrowseResult);

      await controller.browse(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:browse", PRODUCT_RATE_LIMIT_POLICY.BROWSE_PRODUCTS);
      expect(validation.validate).toHaveBeenCalledWith(BrowseProductsSchema, browseQuery);
      expect(browseProductsUseCase.execute).toHaveBeenCalledWith(browseQuery);
      expect(res.json).toHaveBeenCalledWith({
        message: "Products retrieved successfully",
        data: mockBrowseResult.products,
        nextCursor: mockBrowseResult.nextCursor,
      });
    });

    it("should handle empty query parameters", async () => {
      req.query = {};
      validation.validate.mockReturnValue({});
      browseProductsUseCase.execute.mockResolvedValue({ products: [], nextCursor: null });

      await controller.browse(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(BrowseProductsSchema, {});
    });

    it("should handle category filter for burgers", async () => {
      const categoryQuery = { categoryId: CATEGORY_ID };
      req.query = categoryQuery as unknown as Record<string, string>;
      validation.validate.mockReturnValue(categoryQuery);
      browseProductsUseCase.execute.mockResolvedValue({ products: [], nextCursor: null });

      await controller.browse(req as Request, res as Response);

      expect(browseProductsUseCase.execute).toHaveBeenCalledWith(categoryQuery);
    });

    it("should handle price range filter", async () => {
      const priceQuery = { minPrice: 5, maxPrice: 15 };
      req.query = priceQuery as unknown as Record<string, string>;
      validation.validate.mockReturnValue(priceQuery);
      browseProductsUseCase.execute.mockResolvedValue({ products: [], nextCursor: null });

      await controller.browse(req as Request, res as Response);

      expect(browseProductsUseCase.execute).toHaveBeenCalledWith(priceQuery);
    });

    it("should handle sort parameter by price", async () => {
      const sortQuery = { sort: ProductSort.PRICE_DESC };
      req.query = sortQuery as unknown as Record<string, string>;
      validation.validate.mockReturnValue(sortQuery);
      browseProductsUseCase.execute.mockResolvedValue({ products: [], nextCursor: null });

      await controller.browse(req as Request, res as Response);

      expect(browseProductsUseCase.execute).toHaveBeenCalledWith(sortQuery);
    });

    it("should handle drink type filter", async () => {
      const typeQuery = { type: ProductType.DRINK };
      req.query = typeQuery as unknown as Record<string, string>;
      validation.validate.mockReturnValue(typeQuery);
      browseProductsUseCase.execute.mockResolvedValue({ products: [], nextCursor: null });

      await controller.browse(req as Request, res as Response);

      expect(browseProductsUseCase.execute).toHaveBeenCalledWith(typeQuery);
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.browse(req as Request, res as Response)).rejects.toThrow(err);
      expect(browseProductsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });

      await expect(controller.browse(req as Request, res as Response)).rejects.toThrow(err);
      expect(browseProductsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Browse failed");
      validation.validate.mockReturnValue(browseQuery);
      browseProductsUseCase.execute.mockRejectedValue(err);

      await expect(controller.browse(req as Request, res as Response)).rejects.toThrow(err);
    });
  });

  describe("search", () => {
    const searchQuery = {
      keyword: "cheeseburger",
    };

    it("should search products and return 200 with products, total, and didYouMean", async () => {
      req.query = searchQuery as unknown as Record<string, string>;
      validation.validate.mockReturnValue(searchQuery);
      searchProductsUseCase.execute.mockResolvedValue(mockSearchResult);

      await controller.search(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:search", PRODUCT_RATE_LIMIT_POLICY.SEARCH_PRODUCTS);
      expect(validation.validate).toHaveBeenCalledWith(SearchProductsSchema, searchQuery);
      expect(searchProductsUseCase.execute).toHaveBeenCalledWith(searchQuery);
      expect(res.json).toHaveBeenCalledWith({
        message: "Products retrieved successfully",
        data: mockSearchResult.products,
        total: mockSearchResult.total,
        didYouMean: mockSearchResult.didYouMean,
      });
    });

    it("should handle search with didYouMean suggestion for misspelled item", async () => {
      const searchResultWithSuggestion: SearchProductsResult = {
        products: [],
        total: 0,
        didYouMean: "cheeseburger",
      };
      req.query = { keyword: "chesburger" };
      validation.validate.mockReturnValue({ keyword: "chesburger" });
      searchProductsUseCase.execute.mockResolvedValue(searchResultWithSuggestion);

      await controller.search(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        message: "Products retrieved successfully",
        data: [],
        total: 0,
        didYouMean: "cheeseburger",
      });
    });

    it("should search for drinks", async () => {
      const drinkSearchResult: SearchProductsResult = {
        products: [
          {
            id: "drink-1",
            categoryId: "beverages",
            name: "Fresh Lemonade",
            price: 4.99,
            status: ProductStatus.AVAILABLE,
            primaryImageUrl: "https://example.com/products/lemonade.jpg",
          },
        ],
        total: 1,
      };
      req.query = { keyword: "lemonade" };
      validation.validate.mockReturnValue({ keyword: "lemonade" });
      searchProductsUseCase.execute.mockResolvedValue(drinkSearchResult);

      await controller.search(req as Request, res as Response);

      expect(searchProductsUseCase.execute).toHaveBeenCalledWith({ keyword: "lemonade" });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.search(req as Request, res as Response)).rejects.toThrow(err);
      expect(searchProductsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });

      await expect(controller.search(req as Request, res as Response)).rejects.toThrow(err);
      expect(searchProductsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Search failed");
      validation.validate.mockReturnValue(searchQuery);
      searchProductsUseCase.execute.mockRejectedValue(err);

      await expect(controller.search(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle empty keyword", async () => {
      req.query = { keyword: "" };
      validation.validate.mockReturnValue({ keyword: "" });
      searchProductsUseCase.execute.mockResolvedValue({ products: [], total: 0 });

      await controller.search(req as Request, res as Response);

      expect(searchProductsUseCase.execute).toHaveBeenCalledWith({ keyword: "" });
    });
  });

  describe("Error handling coverage", () => {
    it("should handle error when validation throws non-AppError", async () => {
      const error = new Error("Validation error");
      req.body = { name: "Test" };
      validation.validate.mockImplementation(() => {
        throw error;
      });

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(error);
    });

    it("should handle error when use case throws AppError", async () => {
      const appError = AppException.create({
        name: "ProductException",
        statusCode: 400,
        message: "Failed to create product",
      });
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductUseCase.execute.mockRejectedValue(appError);

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(appError);
    });

    it("should handle error when rate limit throws non-AppError", async () => {
      const error = new Error("Rate limit error");
      rateLimit.check.mockRejectedValue(error);

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(error);
    });

    it("should handle error when token verification throws non-AppError", async () => {
      const error = new Error("Token verification failed");
      authTokenVerifier.verifyAccessToken.mockImplementation(() => {
        throw error;
      });
      req.body = { name: "Test" };

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(error);
    });
  });

  describe("Different user roles", () => {
    const userRoles = [UserRoleType.ADMIN, UserRoleType.MANAGER, UserRoleType.CASHIER, UserRoleType.KITCHEN, UserRoleType.BAR, UserRoleType.MEMBER];

    it.each(userRoles)("should handle %s user role for create", async (role) => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        role: role,
        email: "test@restaurant.com",
      } as AccessTokenPayload);
      req.body = { name: "Test Product" };
      validation.validate.mockReturnValue({ name: "Test Product" });
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: role,
        payload: { name: "Test Product" },
      });
    });
  });

  describe("Response status codes", () => {
    it("should return 201 for create", async () => {
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should return 200 for update", async () => {
      req.body = { id: PRODUCT_ID, name: "Test" };
      validation.validate.mockReturnValue({ id: PRODUCT_ID, name: "Test" });
      updateProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.update(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for updateStock", async () => {
      req.body = { id: PRODUCT_ID, setStock: 100 };
      validation.validate.mockReturnValue({ id: PRODUCT_ID, setStock: 100 });
      updateProductStockUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStock(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for updateStatus", async () => {
      req.body = { id: PRODUCT_ID, setStatus: ProductStatus.AVAILABLE };
      validation.validate.mockReturnValue({ id: PRODUCT_ID, setStatus: ProductStatus.AVAILABLE });
      updateProductStatusUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStatus(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for updateImage", async () => {
      req.body = { id: PRODUCT_ID };
      validation.validate.mockReturnValue({ id: PRODUCT_ID });
      updateProductImageUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateImage(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for getDetailById", async () => {
      req.params = { id: PRODUCT_ID };
      validation.validate.mockReturnValue({ id: PRODUCT_ID });
      getProductDetailsUseCase.execute.mockResolvedValue(mockProductDetail);

      await controller.getDetailById(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for getProductsByIds", async () => {
      req.query = { id: [PRODUCT_ID] };
      validation.validate.mockReturnValue({ ids: [PRODUCT_ID] });
      getProductsByIdsUseCase.execute.mockResolvedValue({ products: [], notFoundIds: [] });

      await controller.getProductsByIds(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for browse", async () => {
      validation.validate.mockReturnValue({});
      browseProductsUseCase.execute.mockResolvedValue({ products: [], nextCursor: null });

      await controller.browse(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for search", async () => {
      req.query = { keyword: "test" };
      validation.validate.mockReturnValue({ keyword: "test" });
      searchProductsUseCase.execute.mockResolvedValue({ products: [], total: 0 });

      await controller.search(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("Rate limit policy verification", () => {
    it("should use correct policy for create", async () => {
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:create", PRODUCT_RATE_LIMIT_POLICY.CREATE_PRODUCT);
    });

    it("should use correct policy for update", async () => {
      req.body = { id: PRODUCT_ID, name: "Test" };
      validation.validate.mockReturnValue({ id: PRODUCT_ID, name: "Test" });
      updateProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.update(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:update", PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT);
    });

    it("should use correct policy for updateStock", async () => {
      req.body = { id: PRODUCT_ID, setStock: 100 };
      validation.validate.mockReturnValue({ id: PRODUCT_ID, setStock: 100 });
      updateProductStockUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStock(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:update-stock", PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT_STOCK);
    });

    it("should use correct policy for updateStatus", async () => {
      req.body = { id: PRODUCT_ID, setStatus: ProductStatus.AVAILABLE };
      validation.validate.mockReturnValue({ id: PRODUCT_ID, setStatus: ProductStatus.AVAILABLE });
      updateProductStatusUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateStatus(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:update-status", PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT_STATUS);
    });

    it("should use correct policy for updateImage", async () => {
      req.body = { id: PRODUCT_ID };
      validation.validate.mockReturnValue({ id: PRODUCT_ID });
      updateProductImageUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.updateImage(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:update-image", PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT_IMAGE);
    });

    it("should use correct policy for getDetailById", async () => {
      req.params = { id: PRODUCT_ID };
      validation.validate.mockReturnValue({ id: PRODUCT_ID });
      getProductDetailsUseCase.execute.mockResolvedValue(mockProductDetail);

      await controller.getDetailById(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:get-detail-by-id", PRODUCT_RATE_LIMIT_POLICY.GET_PRODUCT_DETAIL);
    });

    it("should use correct policy for getProductsByIds", async () => {
      req.query = { id: [PRODUCT_ID] };
      validation.validate.mockReturnValue({ ids: [PRODUCT_ID] });
      getProductsByIdsUseCase.execute.mockResolvedValue({ products: [], notFoundIds: [] });

      await controller.getProductsByIds(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:get-products-by-ids", PRODUCT_RATE_LIMIT_POLICY.GET_PRODUCTS_BY_IDS);
    });

    it("should use correct policy for browse", async () => {
      validation.validate.mockReturnValue({});
      browseProductsUseCase.execute.mockResolvedValue({ products: [], nextCursor: null });

      await controller.browse(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:browse", PRODUCT_RATE_LIMIT_POLICY.BROWSE_PRODUCTS);
    });

    it("should use correct policy for search", async () => {
      req.query = { keyword: "test" };
      validation.validate.mockReturnValue({ keyword: "test" });
      searchProductsUseCase.execute.mockResolvedValue({ products: [], total: 0 });

      await controller.search(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product:search", PRODUCT_RATE_LIMIT_POLICY.SEARCH_PRODUCTS);
    });
  });

  describe("Concurrent requests", () => {
    it("should handle multiple create requests", async () => {
      const createData1 = { name: "Burger 1" };
      const createData2 = { name: "Burger 2" };
      const result1 = { id: "id-1" };
      const result2 = { id: "id-2" };

      validation.validate.mockReturnValueOnce(createData1).mockReturnValueOnce(createData2);
      createProductUseCase.execute.mockResolvedValueOnce(result1).mockResolvedValueOnce(result2);

      req.body = createData1;
      await controller.create(req as Request, res as Response);

      req.body = createData2;
      await controller.create(req as Request, res as Response);

      expect(createProductUseCase.execute).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledTimes(2);
    });

    it("should handle concurrent rate limit checks", async () => {
      rateLimit.check.mockResolvedValue(undefined);
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      const promises = [
        controller.create(req as Request, res as Response),
        controller.create(req as Request, res as Response),
        controller.create(req as Request, res as Response),
      ];

      await Promise.all(promises);

      expect(rateLimit.check).toHaveBeenCalledTimes(3);
    });

    it("should handle different operations concurrently", async () => {
      rateLimit.check.mockResolvedValue(undefined);
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });
      browseProductsUseCase.execute.mockResolvedValue({ products: [], nextCursor: null });

      const promises = [controller.create(req as Request, res as Response), controller.browse(req as Request, res as Response)];

      await Promise.all(promises);

      expect(rateLimit.check).toHaveBeenCalledTimes(2);
    });
  });

  describe("Edge cases", () => {
    it("should handle malformed params object for getDetailById", async () => {
      validation.validate.mockReturnValue({ id: undefined });
      getProductDetailsUseCase.execute.mockResolvedValue(mockProductDetail);

      await controller.getDetailById(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(GetProductDetailByIdSchema, { id: undefined });
    });

    it("should handle image files with missing properties", async () => {
      const files = [
        {
          originalname: undefined,
          buffer: undefined,
          size: undefined,
          mimetype: undefined,
        },
      ] as unknown as Express.Multer.File[];
      req.body = { name: "Test" };
      (req as unknown as Request).files = files;
      validation.validate.mockReturnValue({ name: "Test" });
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(
        CreateProductSchema,
        expect.objectContaining({
          name: "Test",
          images: [
            {
              fileName: undefined,
              fileBuffer: undefined,
              fileSize: undefined,
              mimeType: undefined,
            },
          ],
        }),
      );
    });

    it("should handle empty files array", async () => {
      req.body = { name: "Test" };
      (req as unknown as Request).files = [];
      validation.validate.mockReturnValue({ name: "Test" });
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(CreateProductSchema, { name: "Test", images: [] });
    });

    it("should handle product with UPCOMING status", async () => {
      const upcomingData = {
        categoryId: CATEGORY_ID,
        name: "Summer Special Burger",
        price: 13.99,
        description: "Limited edition summer burger",
        type: ProductType.FOOD,
        stockQuantity: 0,
        status: ProductStatus.UPCOMING,
        ingredients: "Beef patty, summer slaw, special sauce",
        preparationTimeInMinutes: 10,
      };
      req.body = upcomingData;
      validation.validate.mockReturnValue(upcomingData);
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: upcomingData,
      });
    });

    it("should handle product with null ingredients", async () => {
      const noIngredientsData = {
        categoryId: CATEGORY_ID,
        name: "Plain Fries",
        price: 3.99,
        description: "Classic salted fries",
        type: ProductType.FOOD,
        stockQuantity: 100,
        status: ProductStatus.AVAILABLE,
        ingredients: null,
        preparationTimeInMinutes: 5,
      };
      req.body = noIngredientsData;
      validation.validate.mockReturnValue(noIngredientsData);
      createProductUseCase.execute.mockResolvedValue({ id: PRODUCT_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: noIngredientsData,
      });
    });
  });
});
