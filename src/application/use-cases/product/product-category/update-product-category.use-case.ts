import {
  UpdateProductCategoryUseCasePort,
  UpdateProductCategoryCommand,
  UpdateProductCategoryPayload,
} from "@/application/ports/driving/update-product-category.use-case.port";
import { ProductCategoryRepositoryPort } from "@/application/ports/driven/product-category.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ObjectStoragePort } from "@/application/ports/driven/object-storage.port";
import { ProductCategoryAccessControlService } from "@/domain/services/product-category-access-control.service";
import { ProductCategoryNotFoundException } from "@/application/exceptions/product-category.exceptions";

export class UpdateProductCategoryUseCase implements UpdateProductCategoryUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly objectStorage: ObjectStoragePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ userId, userRole, payload }: UpdateProductCategoryCommand): Promise<{ id: string }> {
    const startTime = Date.now();

    this.logUpdateProductCategoryStart(userId, payload.id);

    ProductCategoryAccessControlService.assertCanUpdate(userRole);

    const resolvedImage = await this.resolveImageUpload(payload);
    let oldImageUrl: string | undefined;

    try {
      const result = await this.uow.commit(async (repos) => {
        const productCategory = await this.findProductCategory(payload.id, repos.productCategoryRepository);
        const oldImageUrl = productCategory.getImageUrl() ?? undefined;

        this.performUpdateProductCategory(productCategory, payload, resolvedImage);
        await repos.productCategoryRepository.update(productCategory);

        return { oldImageUrl };
      });

      oldImageUrl = result.oldImageUrl;
    } catch (error) {
      if (resolvedImage) {
        await this.objectStorage.delete(resolvedImage).catch((err) => {
          this.logger.warn({
            context: "UpdateProductCategoryUseCase",
            event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
            message: "Failed to rollback image uploads",
            data: { error: err },
          });
        });
      }

      throw error;
    }

    if (resolvedImage && oldImageUrl) {
      await this.objectStorage.delete(oldImageUrl).catch((err) => {
        this.logger.warn({
          context: "UpdateProductCategoryUseCase",
          event: "DELETE_OLD_IMAGE_FAILED",
          message: "Failed to delete old image, file may be orphaned",
          data: { url: oldImageUrl, error: err },
        });
      });
    }

    this.logSuccessfulUpdateProductCategory(payload.id, startTime);

    return { id: payload.id };
  }

  private async findProductCategory(categoryId: string, productCategoryRepository: ProductCategoryRepositoryPort): Promise<ProductCategory> {
    const category = await productCategoryRepository.findById(categoryId);
    if (!category) throw new ProductCategoryNotFoundException();
    return category;
  }

  private async resolveImageUpload(payload: UpdateProductCategoryPayload): Promise<string | undefined> {
    if (payload.image) return this.objectStorage.upload(payload.image);
    return undefined;
  }

  private performUpdateProductCategory(
    productCategory: ProductCategory,
    payload: UpdateProductCategoryPayload,
    resolvedImages: string | undefined,
  ): void {
    if (this.hasValue(payload.name)) productCategory.rename(payload.name);
    if (this.hasValue(payload.description)) productCategory.changeDescription(payload.description);
    if (this.hasValue(payload.image)) productCategory.setImage(resolvedImages!);
    if (this.hasValue(payload.status)) productCategory.setStatus(payload.status);
  }

  private hasValue<T>(value: T | undefined): value is T {
    return value !== undefined;
  }

  private logUpdateProductCategoryStart(userId: string, categoryId: string): void {
    this.logger.debug({
      context: "UpdateProductCategoryUseCase",
      event: "UPDATE_PRODUCT_CATEGORY_STARTED",
      message: `User is updating product category`,
      data: { userId, categoryId },
    });
  }

  private logSuccessfulUpdateProductCategory(categoryId: string, startTime: number): void {
    this.logger.info({
      context: "UpdateProductCategoryUseCase",
      event: "UPDATE_PRODUCT_CATEGORY_SUCCESSFUL",
      message: "Product category updated successfully",
      durationMs: Date.now() - startTime,
      data: { categoryId },
    });
  }
}
