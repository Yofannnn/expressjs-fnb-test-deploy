import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/authenticated-request.type";
import { BrowseProductsUseCasePort } from "@/application/ports/driving/browse-products.use-case.port";
import { CreateProductUseCasePort } from "@/application/ports/driving/create-product.use-case.port";
import { GetProductDetailsUseCasePort } from "@/application/ports/driving/get-product-details.use-case.port";
import { SearchProductsUseCasePort } from "@/application/ports/driving/search-products.use-case.port";
import { GetProductsByIdsUseCasePort } from "@/application/ports/driving/get-products-by-ids.use-case.port";
import { UpdateProductUseCasePort } from "@/application/ports/driving/update-product.use-case.port";
import { UpdateProductImageUseCasePort } from "@/application/ports/driving/update-product-image.use-case.port";
import { UpdateProductStockUseCasePort } from "@/application/ports/driving/update-product-stock.use-case.port";
import { UpdateProductStatusUseCasePort } from "@/application/ports/driving/update-product-status.use-case.port";
import { UploadFilePayload } from "@/application/ports/driven/object-storage.port";
import { ZodRequestValidation } from "../validation/zod-request-validation";
import {
  BrowseProductsSchema,
  BrowseProductsSchemaType,
  CreateProductSchema,
  CreateProductSchemaType,
  GetProductDetailsSchema,
  GetProductDetailsSchemaType,
  GetProductsByIdsSchema,
  GetProductsByIdsSchemaType,
  SearchProductsSchema,
  SearchProductsSchemaType,
  UpdateProductImageSchema,
  UpdateProductImageSchemaType,
  UpdateProductSchema,
  UpdateProductSchemaType,
  UpdateProductStatusSchema,
  UpdateProductStatusSchemaType,
  UpdateProductStockSchema,
  UpdateProductStockSchemaType,
} from "../validation/schemas/product.schemas";

export class ProductController {
  constructor(
    private readonly validation: ZodRequestValidation,
    private readonly browseProductsUseCase: BrowseProductsUseCasePort,
    private readonly searchProductsUseCase: SearchProductsUseCasePort,
    private readonly getProductsByIdsUseCase: GetProductsByIdsUseCasePort,
    private readonly getProductDetailsUseCase: GetProductDetailsUseCasePort,
    private readonly createProductUseCase: CreateProductUseCasePort,
    private readonly updateProductUseCase: UpdateProductUseCasePort,
    private readonly updateProductStockUseCase: UpdateProductStockUseCasePort,
    private readonly updateProductStatusUseCase: UpdateProductStatusUseCasePort,
    private readonly updateProductImageUseCase: UpdateProductImageUseCasePort,
  ) {}

  async create(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const files = req.files as Express.Multer.File[];
    const request = {
      ...req.body,
      ...(req.files && {
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
    };

    const createProductDto = this.validation.validate<CreateProductSchemaType>(CreateProductSchema, request);
    const result = await this.createProductUseCase.execute({
      userId: accessTokenPayload.sub,
      userRole: accessTokenPayload.role,
      payload: createProductDto,
    });

    return res.status(201).json({ message: "Product created successfully", data: result });
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const updateProductDto = this.validation.validate<UpdateProductSchemaType>(UpdateProductSchema, { ...req.body, id: req.params.id });
    const result = await this.updateProductUseCase.execute({
      userId: accessTokenPayload.sub,
      userRole: accessTokenPayload.role,
      payload: updateProductDto,
    });

    return res.json({ message: "Product updated successfully", data: result });
  }

  async updateStock(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const updateProductStockDto = this.validation.validate<UpdateProductStockSchemaType>(UpdateProductStockSchema, {
      ...req.body,
      id: req.params.id,
    });
    const result = await this.updateProductStockUseCase.execute({
      userId: accessTokenPayload.sub,
      userRole: accessTokenPayload.role,
      payload: updateProductStockDto,
    });

    return res.json({ message: "Product stock updated successfully", data: result });
  }

  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const updateProductStatusDto = this.validation.validate<UpdateProductStatusSchemaType>(UpdateProductStatusSchema, {
      ...req.body,
      id: req.params.id,
    });
    const result = await this.updateProductStatusUseCase.execute({
      userId: accessTokenPayload.sub,
      userRole: accessTokenPayload.role,
      payload: updateProductStatusDto,
    });

    return res.json({ message: "Product status updated successfully", data: result });
  }

  async updateImage(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const request = {
      ...req.body,
      id: req.params.id,
      imageFile: req.file
        ? {
            fileName: req.file.originalname,
            fileBuffer: req.file.buffer,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
          }
        : undefined,
    };

    const updateProductImageDto = this.validation.validate<UpdateProductImageSchemaType>(UpdateProductImageSchema, request);
    const result = await this.updateProductImageUseCase.execute({
      userId: accessTokenPayload.sub,
      userRole: accessTokenPayload.role,
      payload: updateProductImageDto,
    });

    return res.json({ message: "Product image updated successfully", data: result });
  }

  async getDetails(req: Request, res: Response): Promise<Response> {
    const id = req.params.id;
    const getProductDetailDto = this.validation.validate<GetProductDetailsSchemaType>(GetProductDetailsSchema, { id });
    const result = await this.getProductDetailsUseCase.execute(getProductDetailDto);

    return res.json({ message: "Product details retrieved successfully", data: result });
  }

  async getByIds(req: Request, res: Response): Promise<Response> {
    const rawIds = req.query.id;
    const ids = Array.isArray(rawIds) ? rawIds : typeof rawIds === "string" ? [rawIds] : [];
    const getProductsByIdsDto = this.validation.validate<GetProductsByIdsSchemaType>(GetProductsByIdsSchema, { ids });
    const result = await this.getProductsByIdsUseCase.execute(getProductsByIdsDto);

    return res.json({ message: "Products retrieved successfully", data: result.products, notFoundIds: result.notFoundIds });
  }

  async browse(req: Request, res: Response): Promise<Response> {
    const browseProductsDto = this.validation.validate<BrowseProductsSchemaType>(BrowseProductsSchema, req.query);
    const result = await this.browseProductsUseCase.execute(browseProductsDto);

    return res.json({ message: "Products retrieved successfully", data: result.products, nextCursor: result.nextCursor });
  }

  async search(req: Request, res: Response): Promise<Response> {
    const searchProductsDto = this.validation.validate<SearchProductsSchemaType>(SearchProductsSchema, req.query);
    const result = await this.searchProductsUseCase.execute(searchProductsDto);

    return res.json({ message: "Products retrieved successfully", data: result.products, total: result.total, didYouMean: result.didYouMean });
  }
}
