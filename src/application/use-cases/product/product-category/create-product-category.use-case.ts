import {
  CreateProductCategoryUseCasePort,
  CreateProductCategoryCommand,
  CreateProductCategoryPayload,
} from "@/application/ports/driving/create-product-category.use-case.port";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ObjectStoragePort } from "@/application/ports/driven/object-storage.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryAccessControlService } from "@/domain/services/product-category-access-control.service";

export class CreateProductCategoryUseCase implements CreateProductCategoryUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly objectStorage: ObjectStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ userId, userRole, payload }: CreateProductCategoryCommand): Promise<{ id: string }> {
    const startTime = Date.now();

    this.logCreateProductCategoryStart(userId, payload.name);

    ProductCategoryAccessControlService.assertCanCreate(userRole);

    let imageUrl: string | undefined;
    if (payload.image) imageUrl = await this.objectStorage.upload(payload.image);

    let productCategory: ProductCategory;

    try {
      productCategory = await this.uow.commit(async (repos) => {
        const sortOrder = await repos.productCategoryRepository.getNextSortOrder();
        const newProductCategory = this.buildProductCategory(payload, sortOrder, imageUrl);
        await repos.productCategoryRepository.insert(newProductCategory);

        return newProductCategory;
      });
    } catch (error) {
      if (imageUrl)
        await this.objectStorage.delete(imageUrl).catch(() => {
          this.logger.warn({
            context: "CreateProductCategoryUseCase",
            event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
            message: "Failed to rollback image uploads",
            data: { error },
          });
        });
      throw error;
    }

    this.logSuccessfulCreateProductCategory(startTime);

    return { id: productCategory.getId() };
  }

  private buildProductCategory(payload: CreateProductCategoryPayload, sortOrder: number, imageUrl?: string): ProductCategory {
    return ProductCategory.create({
      id: this.idGenerator.generate(),
      name: payload.name,
      description: payload.description,
      imageUrl,
      sortOrder,
    });
  }

  private logCreateProductCategoryStart(userId: string, name: string): void {
    this.logger.debug({
      context: "CreateProductCategoryUseCase",
      event: "CREATE_PRODUCT_CATEGORY_STARTED",
      message: `User is creating product category`,
      data: { userId, name },
    });
  }

  private logSuccessfulCreateProductCategory(startTime: number): void {
    this.logger.info({
      context: "CreateProductCategoryUseCase",
      event: "CREATE_PRODUCT_CATEGORY_SUCCESSFUL",
      message: "Product category created successfully",
      durationMs: Date.now() - startTime,
    });
  }
}
