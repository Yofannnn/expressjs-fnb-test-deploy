import { Request, Response } from "express";
import { ProductCategoryController } from "@/presentation/controllers/product-category.controller";
import { RateLimit } from "@/application/ports/driving/rate-limit";
import { Validation } from "@/application/ports/driving/validation";
import { CreateProductCategoryUseCase } from "@/application/ports/driving/create-product-category.use-case";
import { UpdateProductCategoryUseCase } from "@/application/ports/driving/update-product-category.use-case";
import { GetProductCategoryDetailsUseCase, GetProductCategoryDetailsResult } from "@/application/ports/driving/get-product-category-details.use-case";
import { BrowseProductCategoriesUseCase, BrowseProductCategoriesResult } from "@/application/ports/driving/browse-product-categories.use-case";
import { ReorderProductCategoriesUseCase } from "@/application/ports/driving/reorder-product-categories.use-case";
import { AuthTokenVerifier } from "@/application/ports/driven/auth-token-verifier";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { AppException } from "@/application/exceptions/app.exception";
import { AccessTokenPayload } from "@/application/types/auth-token.type";
import { UploadFilePayload } from "@/application/ports/driven/object-storage";
import { ProductCategoryStatus } from "@/domain/types/product-category-status.enum";
import { PRODUCT_CATEGORY_RATE_LIMIT_POLICY } from "@/infrastructure/rate-limit/policies/product-category-rate-limit.policy";
import {
  CreateProductCategorySchema,
  UpdateProductCategorySchema,
  GetProductCategoryDetailSchema,
  BrowseProductCategoriesSchema,
  ReorderProductCategoriesSchema,
} from "@/presentation/schemas/product-category.schemas";

jest.mock("@/presentation/utils/auth-token.utils", () => ({
  AuthTokenUtil: {
    requireAccessToken: jest.fn(),
  },
}));

const mockedAuthTokenUtil = jest.requireMock("@/presentation/utils/auth-token.utils").AuthTokenUtil;

describe("ProductCategoryController", () => {
  let controller: ProductCategoryController;

  let rateLimit: jest.Mocked<RateLimit>;
  let validation: jest.Mocked<Validation>;
  let createProductCategoryUseCase: jest.Mocked<CreateProductCategoryUseCase>;
  let updateProductCategoryUseCase: jest.Mocked<UpdateProductCategoryUseCase>;
  let getProductCategoryDetailsUseCase: jest.Mocked<GetProductCategoryDetailsUseCase>;
  let browseProductCategoriesUseCase: jest.Mocked<BrowseProductCategoriesUseCase>;
  let reorderProductCategoriesUseCase: jest.Mocked<ReorderProductCategoriesUseCase>;
  let authTokenVerifier: jest.Mocked<AuthTokenVerifier>;

  let req: Partial<Request>;
  let res: Partial<Response>;

  const ACCESS_TOKEN = "access-token-value";
  const USER_ID = "user-123";
  const USER_ROLE = UserRoleType.ADMIN;
  const CATEGORY_ID = "category-123";

  const mockCategoryDetail: GetProductCategoryDetailsResult = {
    id: CATEGORY_ID,
    name: "Electronics",
    description: "Electronic products",
    imageUrl: null,
    status: ProductCategoryStatus.ACTIVE,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategorySummary = {
    id: CATEGORY_ID,
    name: "Electronics",
    imageUrl: null,
    status: ProductCategoryStatus.ACTIVE,
    sortOrder: 1,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    rateLimit = { check: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RateLimit>;
    validation = { validate: jest.fn() } as unknown as jest.Mocked<Validation>;
    createProductCategoryUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateProductCategoryUseCase>;
    updateProductCategoryUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateProductCategoryUseCase>;
    getProductCategoryDetailsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetProductCategoryDetailsUseCase>;
    browseProductCategoriesUseCase = { execute: jest.fn() } as unknown as jest.Mocked<BrowseProductCategoriesUseCase>;
    reorderProductCategoriesUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ReorderProductCategoriesUseCase>;
    authTokenVerifier = { verifyAccessToken: jest.fn() } as unknown as jest.Mocked<AuthTokenVerifier>;

    mockedAuthTokenUtil.requireAccessToken.mockReturnValue(ACCESS_TOKEN);

    authTokenVerifier.verifyAccessToken.mockReturnValue({
      sub: USER_ID,
      role: USER_ROLE,
      email: "test@example.com",
    } as AccessTokenPayload);

    controller = new ProductCategoryController(
      rateLimit,
      validation,
      createProductCategoryUseCase,
      updateProductCategoryUseCase,
      getProductCategoryDetailsUseCase,
      browseProductCategoriesUseCase,
      reorderProductCategoriesUseCase,
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
    const createCategoryData = {
      name: "Electronics",
      description: "Electronic products",
      parentId: null,
      order: 1,
    };

    it("should create a product category, set rate limit, and return 201 with category id", async () => {
      req.body = createCategoryData;
      validation.validate.mockReturnValue(createCategoryData);
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product-category:create", PRODUCT_CATEGORY_RATE_LIMIT_POLICY.CREATE_PRODUCT_CATEGORY);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(validation.validate).toHaveBeenCalledWith(CreateProductCategorySchema, createCategoryData);
      expect(createProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: createCategoryData,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Product category created successfully",
        data: { id: CATEGORY_ID },
      });
    });

    it("should create a product category with image file", async () => {
      const file = {
        originalname: "image.jpg",
        buffer: Buffer.from("test"),
        size: 1024,
        mimetype: "image/jpeg",
      } as unknown as Express.Multer.File;
      req.body = createCategoryData;
      (req as unknown as Request).file = file;
      validation.validate.mockReturnValue(createCategoryData);
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(
        CreateProductCategorySchema,
        expect.objectContaining({
          ...createCategoryData,
          image: {
            fileName: file.originalname,
            fileBuffer: file.buffer,
            fileSize: file.size,
            mimeType: file.mimetype,
          } satisfies UploadFilePayload,
        }),
      );
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductCategoryUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate missing access token errors", async () => {
      const err = new Error("Access token required");
      mockedAuthTokenUtil.requireAccessToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductCategoryUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate token verification errors", async () => {
      const err = new Error("Invalid token");
      authTokenVerifier.verifyAccessToken.mockImplementation(() => {
        throw err;
      });
      req.body = createCategoryData;

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductCategoryUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.body = createCategoryData;

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductCategoryUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Create category failed");
      req.body = createCategoryData;
      validation.validate.mockReturnValue(createCategoryData);
      createProductCategoryUseCase.execute.mockRejectedValue(err);

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle AppException from use case", async () => {
      const appError = AppException.create({
        name: "ProductCategoryException",
        statusCode: 400,
        message: "Failed to create product category",
      });
      req.body = createCategoryData;
      validation.validate.mockReturnValue(createCategoryData);
      createProductCategoryUseCase.execute.mockRejectedValue(appError);

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(appError);
    });

    it("should handle empty request body", async () => {
      req.body = {};
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });

      await expect(controller.create(req as Request, res as Response)).rejects.toThrow(err);
      expect(createProductCategoryUseCase.execute).not.toHaveBeenCalled();
    });

    it("should handle null parentId", async () => {
      const createData = {
        name: "Root Category",
        description: "Root level category",
        parentId: null,
      };
      req.body = createData;
      validation.validate.mockReturnValue(createData);
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: createData,
      });
    });

    it("should handle special characters in category name", async () => {
      const createData = {
        name: "Electronics & Gadgets!@#$%",
        description: "All electronic devices",
      };
      req.body = createData;
      validation.validate.mockReturnValue(createData);
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: createData,
      });
    });

    it("should handle missing image in file upload", async () => {
      req.body = { name: "Test" };
      (req as unknown as Request).file = undefined;
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(CreateProductCategorySchema, { name: "Test" });
    });
  });

  describe("update", () => {
    const updateCategoryData = {
      id: CATEGORY_ID,
      name: "Updated Electronics",
      description: "Updated description",
      parentId: "parent-123",
      order: 2,
    };

    it("should update a product category and return 200 with updated category id", async () => {
      req.body = updateCategoryData;
      validation.validate.mockReturnValue(updateCategoryData);
      updateProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.update(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product-category:update", PRODUCT_CATEGORY_RATE_LIMIT_POLICY.UPDATE_PRODUCT_CATEGORY);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(validation.validate).toHaveBeenCalledWith(UpdateProductCategorySchema, updateCategoryData);
      expect(updateProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: updateCategoryData,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: "Product category updated successfully",
        data: { id: CATEGORY_ID },
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.update(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductCategoryUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate missing access token errors", async () => {
      const err = new Error("Access token required");
      mockedAuthTokenUtil.requireAccessToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.update(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductCategoryUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.body = updateCategoryData;

      await expect(controller.update(req as Request, res as Response)).rejects.toThrow(err);
      expect(updateProductCategoryUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Update failed");
      req.body = updateCategoryData;
      validation.validate.mockReturnValue(updateCategoryData);
      updateProductCategoryUseCase.execute.mockRejectedValue(err);

      await expect(controller.update(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle update with minimal data", async () => {
      const minimalData = { id: CATEGORY_ID, name: "Updated Name" };
      req.body = minimalData;
      validation.validate.mockReturnValue(minimalData);
      updateProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.update(req as Request, res as Response);

      expect(updateProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: minimalData,
      });
    });
  });

  describe("reorder", () => {
    const reorderData = {
      categories: [
        { id: "category-1", order: 0 },
        { id: "category-2", order: 1 },
        { id: "category-3", order: 2 },
      ],
    };

    it("should reorder product categories and return 200", async () => {
      req.body = reorderData;
      validation.validate.mockReturnValue(reorderData);
      reorderProductCategoriesUseCase.execute.mockResolvedValue(undefined);

      await controller.reorder(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product-category:reorder", PRODUCT_CATEGORY_RATE_LIMIT_POLICY.REORDER_PRODUCT_CATEGORIES);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(validation.validate).toHaveBeenCalledWith(ReorderProductCategoriesSchema, reorderData);
      expect(reorderProductCategoriesUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: reorderData.categories,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: "Product categories reordered successfully",
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.reorder(req as Request, res as Response)).rejects.toThrow(err);
      expect(reorderProductCategoriesUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate missing access token errors", async () => {
      const err = new Error("Access token required");
      mockedAuthTokenUtil.requireAccessToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.reorder(req as Request, res as Response)).rejects.toThrow(err);
      expect(reorderProductCategoriesUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.body = reorderData;

      await expect(controller.reorder(req as Request, res as Response)).rejects.toThrow(err);
      expect(reorderProductCategoriesUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Reorder failed");
      req.body = reorderData;
      validation.validate.mockReturnValue(reorderData);
      reorderProductCategoriesUseCase.execute.mockRejectedValue(err);

      await expect(controller.reorder(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle empty categories array", async () => {
      const emptyReorderData = { categories: [] };
      req.body = emptyReorderData;
      validation.validate.mockReturnValue(emptyReorderData);
      reorderProductCategoriesUseCase.execute.mockResolvedValue(undefined);

      await controller.reorder(req as Request, res as Response);

      expect(reorderProductCategoriesUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: [],
      });
    });

    it("should handle single category reorder", async () => {
      const singleCategoryData = { categories: [{ id: "category-1", order: 0 }] };
      req.body = singleCategoryData;
      validation.validate.mockReturnValue(singleCategoryData);
      reorderProductCategoriesUseCase.execute.mockResolvedValue(undefined);

      await controller.reorder(req as Request, res as Response);

      expect(reorderProductCategoriesUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: USER_ROLE,
        payload: singleCategoryData.categories,
      });
    });
  });

  describe("getById", () => {
    it("should get product category detail by id and return 200 with category data", async () => {
      req.params = { id: CATEGORY_ID };
      validation.validate.mockReturnValue({ id: CATEGORY_ID });
      getProductCategoryDetailsUseCase.execute.mockResolvedValue(mockCategoryDetail);

      await controller.getById(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith(
        "product-category:get-detail-by-id",
        PRODUCT_CATEGORY_RATE_LIMIT_POLICY.GET_PRODUCT_CATEGORY_DETAIL,
      );
      expect(validation.validate).toHaveBeenCalledWith(GetProductCategoryDetailSchema, { id: CATEGORY_ID });
      expect(getProductCategoryDetailsUseCase.execute).toHaveBeenCalledWith({ id: CATEGORY_ID });
      expect(res.json).toHaveBeenCalledWith({
        message: "Product category retrieved successfully",
        data: mockCategoryDetail,
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);
      req.params = { id: CATEGORY_ID };

      await expect(controller.getById(req as Request, res as Response)).rejects.toThrow(err);
      expect(getProductCategoryDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });
      req.params = { id: CATEGORY_ID };

      await expect(controller.getById(req as Request, res as Response)).rejects.toThrow(err);
      expect(getProductCategoryDetailsUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Category not found");
      req.params = { id: CATEGORY_ID };
      validation.validate.mockReturnValue({ id: CATEGORY_ID });
      getProductCategoryDetailsUseCase.execute.mockRejectedValue(err);

      await expect(controller.getById(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle undefined id in params", async () => {
      req.params = {};
      validation.validate.mockReturnValue({ id: undefined });
      getProductCategoryDetailsUseCase.execute.mockResolvedValue(mockCategoryDetail);

      await controller.getById(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(GetProductCategoryDetailSchema, { id: undefined });
    });
  });

  describe("browse", () => {
    const browseQuery = {
      status: ProductCategoryStatus.ACTIVE,
      sort: "NAME_ASC",
    };

    const browseResult: BrowseProductCategoriesResult = [mockCategorySummary];

    it("should browse product categories and return 200 with category list", async () => {
      req.query = browseQuery as unknown as Record<string, string>;
      validation.validate.mockReturnValue(browseQuery);
      browseProductCategoriesUseCase.execute.mockResolvedValue(browseResult);

      await controller.browse(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product-category:browse", PRODUCT_CATEGORY_RATE_LIMIT_POLICY.BROWSE_PRODUCT_CATEGORIES);
      expect(validation.validate).toHaveBeenCalledWith(BrowseProductCategoriesSchema, browseQuery);
      expect(browseProductCategoriesUseCase.execute).toHaveBeenCalledWith(browseQuery);
      expect(res.json).toHaveBeenCalledWith({
        message: "Product categories retrieved successfully",
        data: browseResult,
      });
    });

    it("should handle empty query parameters", async () => {
      req.query = {};
      validation.validate.mockReturnValue({});
      browseProductCategoriesUseCase.execute.mockResolvedValue([]);

      await controller.browse(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(BrowseProductCategoriesSchema, {});
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.browse(req as Request, res as Response)).rejects.toThrow(err);
      expect(browseProductCategoriesUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("Validation failed");
      validation.validate.mockImplementation(() => {
        throw err;
      });

      await expect(controller.browse(req as Request, res as Response)).rejects.toThrow(err);
      expect(browseProductCategoriesUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("Browse failed");
      validation.validate.mockReturnValue(browseQuery);
      browseProductCategoriesUseCase.execute.mockRejectedValue(err);

      await expect(controller.browse(req as Request, res as Response)).rejects.toThrow(err);
    });

    it("should handle status filter in query", async () => {
      const queryWithStatus = { status: ProductCategoryStatus.ACTIVE };
      req.query = queryWithStatus as unknown as Record<string, string>;
      validation.validate.mockReturnValue(queryWithStatus);
      browseProductCategoriesUseCase.execute.mockResolvedValue([]);

      await controller.browse(req as Request, res as Response);

      expect(browseProductCategoriesUseCase.execute).toHaveBeenCalledWith(queryWithStatus);
    });

    it("should handle sort parameter in query", async () => {
      const sortQuery = { sort: "SORT_ORDER_ASC" };
      req.query = sortQuery as unknown as Record<string, string>;
      validation.validate.mockReturnValue(sortQuery);
      browseProductCategoriesUseCase.execute.mockResolvedValue([]);

      await controller.browse(req as Request, res as Response);

      expect(browseProductCategoriesUseCase.execute).toHaveBeenCalledWith(sortQuery);
    });

    it("should handle both status and sort parameters", async () => {
      const fullQuery = {
        status: ProductCategoryStatus.ACTIVE,
        sort: "NAME_DESC",
      };
      req.query = fullQuery as unknown as Record<string, string>;
      validation.validate.mockReturnValue(fullQuery);
      browseProductCategoriesUseCase.execute.mockResolvedValue([]);

      await controller.browse(req as Request, res as Response);

      expect(browseProductCategoriesUseCase.execute).toHaveBeenCalledWith(fullQuery);
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
        name: "ProductCategoryException",
        statusCode: 400,
        message: "Failed to create product category",
      });
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockRejectedValue(appError);

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
    it("should handle ADMIN user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        role: UserRoleType.ADMIN,
        email: "admin@example.com",
      } as AccessTokenPayload);
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: UserRoleType.ADMIN,
        payload: { name: "Test" },
      });
    });

    it("should handle MANAGER user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        role: UserRoleType.MANAGER,
        email: "manager@example.com",
      } as AccessTokenPayload);
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: UserRoleType.MANAGER,
        payload: { name: "Test" },
      });
    });

    it("should handle MEMBER user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        role: UserRoleType.MEMBER,
        email: "user@example.com",
      } as AccessTokenPayload);
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: UserRoleType.MEMBER,
        payload: { name: "Test" },
      });
    });

    it("should handle CASHIER user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        role: UserRoleType.CASHIER,
        email: "cashier@example.com",
      } as AccessTokenPayload);
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: UserRoleType.CASHIER,
        payload: { name: "Test" },
      });
    });

    it("should handle KITCHEN user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        role: UserRoleType.KITCHEN,
        email: "kitchen@example.com",
      } as AccessTokenPayload);
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: UserRoleType.KITCHEN,
        payload: { name: "Test" },
      });
    });

    it("should handle BAR user role", async () => {
      authTokenVerifier.verifyAccessToken.mockReturnValue({
        sub: USER_ID,
        role: UserRoleType.BAR,
        email: "bar@example.com",
      } as AccessTokenPayload);
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(createProductCategoryUseCase.execute).toHaveBeenCalledWith({
        userId: USER_ID,
        userRole: UserRoleType.BAR,
        payload: { name: "Test" },
      });
    });
  });

  describe("Response status codes", () => {
    it("should return 201 for create", async () => {
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should return 200 for update", async () => {
      req.body = { id: CATEGORY_ID, name: "Test" };
      validation.validate.mockReturnValue({ id: CATEGORY_ID, name: "Test" });
      updateProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.update(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for reorder", async () => {
      req.body = { categories: [{ id: "cat-1", order: 0 }] };
      validation.validate.mockReturnValue({ categories: [{ id: "cat-1", order: 0 }] });
      reorderProductCategoriesUseCase.execute.mockResolvedValue(undefined);

      await controller.reorder(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for getById", async () => {
      req.params = { id: CATEGORY_ID };
      validation.validate.mockReturnValue({ id: CATEGORY_ID });
      getProductCategoryDetailsUseCase.execute.mockResolvedValue(mockCategoryDetail);

      await controller.getById(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 200 for browse", async () => {
      validation.validate.mockReturnValue({});
      browseProductCategoriesUseCase.execute.mockResolvedValue([]);

      await controller.browse(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("Rate limit policy verification", () => {
    it("should use correct policy for create", async () => {
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product-category:create", PRODUCT_CATEGORY_RATE_LIMIT_POLICY.CREATE_PRODUCT_CATEGORY);
    });

    it("should use correct policy for update", async () => {
      req.body = { id: CATEGORY_ID, name: "Test" };
      validation.validate.mockReturnValue({ id: CATEGORY_ID, name: "Test" });
      updateProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.update(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product-category:update", PRODUCT_CATEGORY_RATE_LIMIT_POLICY.UPDATE_PRODUCT_CATEGORY);
    });

    it("should use correct policy for reorder", async () => {
      req.body = { categories: [{ id: "cat-1", order: 0 }] };
      validation.validate.mockReturnValue({ categories: [{ id: "cat-1", order: 0 }] });
      reorderProductCategoriesUseCase.execute.mockResolvedValue(undefined);

      await controller.reorder(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product-category:reorder", PRODUCT_CATEGORY_RATE_LIMIT_POLICY.REORDER_PRODUCT_CATEGORIES);
    });

    it("should use correct policy for getById", async () => {
      req.params = { id: CATEGORY_ID };
      validation.validate.mockReturnValue({ id: CATEGORY_ID });
      getProductCategoryDetailsUseCase.execute.mockResolvedValue(mockCategoryDetail);

      await controller.getById(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith(
        "product-category:get-detail-by-id",
        PRODUCT_CATEGORY_RATE_LIMIT_POLICY.GET_PRODUCT_CATEGORY_DETAIL,
      );
    });

    it("should use correct policy for browse", async () => {
      validation.validate.mockReturnValue({});
      browseProductCategoriesUseCase.execute.mockResolvedValue([]);

      await controller.browse(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("product-category:browse", PRODUCT_CATEGORY_RATE_LIMIT_POLICY.BROWSE_PRODUCT_CATEGORIES);
    });
  });

  describe("Concurrent requests", () => {
    it("should handle multiple create requests", async () => {
      const createData1 = { name: "Category 1" };
      const createData2 = { name: "Category 2" };
      const result1 = { id: "id-1" };
      const result2 = { id: "id-2" };

      validation.validate.mockReturnValueOnce(createData1).mockReturnValueOnce(createData2);
      createProductCategoryUseCase.execute.mockResolvedValueOnce(result1).mockResolvedValueOnce(result2);

      req.body = createData1;
      await controller.create(req as Request, res as Response);

      req.body = createData2;
      await controller.create(req as Request, res as Response);

      expect(createProductCategoryUseCase.execute).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledTimes(2);
    });

    it("should handle concurrent rate limit checks", async () => {
      rateLimit.check.mockResolvedValue(undefined);
      req.body = { name: "Test" };
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

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
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });
      browseProductCategoriesUseCase.execute.mockResolvedValue([]);

      const promises = [controller.create(req as Request, res as Response), controller.browse(req as Request, res as Response)];

      await Promise.all(promises);

      expect(rateLimit.check).toHaveBeenCalledTimes(2);
    });
  });

  describe("Edge cases", () => {
    it("should handle malformed params object for getById", async () => {
      validation.validate.mockReturnValue({ id: undefined });
      getProductCategoryDetailsUseCase.execute.mockResolvedValue(mockCategoryDetail);

      await controller.getById(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(GetProductCategoryDetailSchema, { id: undefined });
    });

    it("should handle image file with undefined properties", async () => {
      const file = {
        originalname: "image.jpg",
        buffer: Buffer.from("test"),
        size: 1024,
        mimetype: "image/jpeg",
      } as unknown as Express.Multer.File;
      req.body = { name: "Test" };
      (req as unknown as Request).file = file;
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(
        CreateProductCategorySchema,
        expect.objectContaining({
          name: "Test",
          image: {
            fileName: file.originalname,
            fileBuffer: file.buffer,
            fileSize: file.size,
            mimeType: file.mimetype,
          },
        }),
      );
    });

    it("should handle image file with missing fields", async () => {
      const file = {
        originalname: undefined,
        buffer: undefined,
        size: undefined,
        mimetype: undefined,
      } as unknown as Express.Multer.File;
      req.body = { name: "Test" };
      (req as unknown as Request).file = file;
      validation.validate.mockReturnValue({ name: "Test" });
      createProductCategoryUseCase.execute.mockResolvedValue({ id: CATEGORY_ID });

      await controller.create(req as Request, res as Response);

      expect(validation.validate).toHaveBeenCalledWith(
        CreateProductCategorySchema,
        expect.objectContaining({
          name: "Test",
          image: {
            fileName: undefined,
            fileBuffer: undefined,
            fileSize: undefined,
            mimeType: undefined,
          },
        }),
      );
    });
  });
});
