import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/authenticated-request.type";
import { CreateProductCategoryUseCasePort } from "@/application/ports/driving/create-product-category.use-case.port";
import { UpdateProductCategoryUseCasePort } from "@/application/ports/driving/update-product-category.use-case.port";
import { GetProductCategoryDetailsUseCasePort } from "@/application/ports/driving/get-product-category-details.use-case.port";
import { BrowseProductCategoriesUseCasePort } from "@/application/ports/driving/browse-product-categories.use-case.port";
import { ReorderProductCategoriesUseCasePort } from "@/application/ports/driving/reorder-product-categories.use-case.port";
import { UserRoleType } from "@/domain/types/user.type";
import { UploadFilePayload } from "@/application/ports/driven/object-storage.port";
import { ZodRequestValidation } from "../validation/zod-request-validation";
import {
  BrowseProductCategoriesSchema,
  BrowseProductCategoriesSchemaType,
  CreateProductCategorySchema,
  CreateProductCategorySchemaType,
  GetProductCategoryDetailSchema,
  GetProductCategoryDetailSchemaType,
  ReorderProductCategoriesSchema,
  ReorderProductCategoriesSchemaType,
  UpdateProductCategorySchema,
  UpdateProductCategorySchemaType,
} from "../validation/schemas/product-category.schemas";

export class ProductCategoryController {
  constructor(
    private readonly validation: ZodRequestValidation,
    private readonly createProductCategoryUseCase: CreateProductCategoryUseCasePort,
    private readonly updateProductCategoryUseCase: UpdateProductCategoryUseCasePort,
    private readonly getProductCategoryDetailsUseCase: GetProductCategoryDetailsUseCasePort,
    private readonly browseProductCategoriesUseCase: BrowseProductCategoriesUseCasePort,
    private readonly reorderProductCategoriesUseCase: ReorderProductCategoriesUseCasePort,
  ) {}

  async create(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const request = {
      ...req.body,
      ...(req.file && {
        image: {
          fileName: req.file.originalname,
          fileBuffer: req.file.buffer,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        } satisfies UploadFilePayload,
      }),
    };

    const createProductCategoryDto = this.validation.validate<CreateProductCategorySchemaType>(CreateProductCategorySchema, request);
    const result = await this.createProductCategoryUseCase.execute({
      userId: accessTokenPayload.sub,
      userRole: accessTokenPayload.role as UserRoleType,
      payload: createProductCategoryDto,
    });

    return res.status(201).json({ message: "Product category created successfully", data: result });
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const request = {
      ...req.body,
      ...(req.file && {
        image: {
          fileName: req.file.originalname,
          fileBuffer: req.file.buffer,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        } satisfies UploadFilePayload,
      }),
      id: req.params.id,
    };

    const updateProductCategoryDto = this.validation.validate<UpdateProductCategorySchemaType>(UpdateProductCategorySchema, request);
    const result = await this.updateProductCategoryUseCase.execute({
      userId: accessTokenPayload.sub,
      userRole: accessTokenPayload.role as UserRoleType,
      payload: updateProductCategoryDto,
    });

    return res.json({ message: "Product category updated successfully", data: result });
  }

  async reorder(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    const body = req.body;
    const reorderProductCategoriesDto = this.validation.validate<ReorderProductCategoriesSchemaType>(ReorderProductCategoriesSchema, body);
    await this.reorderProductCategoriesUseCase.execute({
      userId: accessTokenPayload.sub,
      userRole: accessTokenPayload.role as UserRoleType,
      payload: reorderProductCategoriesDto.categories,
    });

    return res.json({ message: "Product categories reordered successfully" });
  }

  async getDetails(req: Request, res: Response): Promise<Response> {
    const id = req.params.id;
    const getProductCategoryDetailDto = this.validation.validate<GetProductCategoryDetailSchemaType>(GetProductCategoryDetailSchema, { id });
    const result = await this.getProductCategoryDetailsUseCase.execute(getProductCategoryDetailDto);

    return res.json({ message: "Product category details retrieved successfully", data: result });
  }

  async browse(req: Request, res: Response): Promise<Response> {
    const browseProductCategoriesDto = this.validation.validate<BrowseProductCategoriesSchemaType>(BrowseProductCategoriesSchema, req.query);
    const result = await this.browseProductCategoriesUseCase.execute(browseProductCategoriesDto);

    return res.json({ message: "Product categories retrieved successfully", data: result });
  }
}
