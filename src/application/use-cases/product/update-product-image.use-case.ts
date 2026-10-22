import {
  UpdateProductImageUseCasePort,
  UpdateProductImageCommand,
  UpdateProductImagePayload,
  UpdateProductImageAction,
} from "@/application/ports/driving/update-product-image.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ObjectStoragePort } from "@/application/ports/driven/object-storage.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { Product } from "@/domain/entities/product.entity";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import { NoReorderProductImageOperationException, ProductNotFoundException } from "@/application/exceptions/product.exceptions";

export class UpdateProductImageUseCase implements UpdateProductImageUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly objectStorage: ObjectStoragePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ userId, userRole, payload }: UpdateProductImageCommand): Promise<{ id: string }> {
    const startTime = Date.now();

    this.logUpdateProductImageStart(userId);

    ProductAccessControlService.assertCanUpdate(userRole);

    this.validatePayload(payload);

    const uploadedUrl = await this.resolveImageUpload(payload);

    try {
      await this.uow.commit(async (repos) => {
        const product = await this.findProduct(payload.id, repos.productRepository);
        this.performUpdateProduct(product, payload, uploadedUrl);
        await repos.productRepository.updateImages(product);
      });
    } catch (error) {
      await this.rollbackImageUpload(uploadedUrl, error);
      throw error;
    }

    await this.deleteOldImageIfNeeded(payload);

    this.logSuccessfulUpdateProduct(payload.id, startTime);

    return { id: payload.id };
  }

  private validatePayload(payload: UpdateProductImagePayload): void {
    if (payload.action === UpdateProductImageAction.REORDER && payload.reorderedUrls.length === 0) {
      throw new NoReorderProductImageOperationException();
    }
  }

  private async findProduct(productId: string, productRepository: ProductRepositoryPort): Promise<Product> {
    const product = await productRepository.findById(productId);
    if (!product) throw new ProductNotFoundException();
    return product;
  }

  private async resolveImageUpload(payload: UpdateProductImagePayload): Promise<string | undefined> {
    switch (payload.action) {
      case UpdateProductImageAction.ADD:
      case UpdateProductImageAction.REPLACE:
        return this.objectStorage.upload(payload.imageFile);
      case UpdateProductImageAction.REMOVE:
      case UpdateProductImageAction.REORDER:
        return undefined;
    }
  }

  private performUpdateProduct(product: Product, payload: UpdateProductImagePayload, uploadedUrl: string | undefined): void {
    switch (payload.action) {
      case UpdateProductImageAction.ADD:
        product.addImage(uploadedUrl!);
        break;
      case UpdateProductImageAction.REMOVE:
        product.removeImage(payload.imageUrl);
        break;
      case UpdateProductImageAction.REPLACE:
        product.replaceImage({ oldUrl: payload.oldImageUrl, newUrl: uploadedUrl! });
        break;
      case UpdateProductImageAction.REORDER:
        product.reorderImages(payload.reorderedUrls);
        break;
    }
  }

  private async rollbackImageUpload(uploadedUrl: string | undefined, error: unknown): Promise<void> {
    if (!uploadedUrl) return;

    await this.objectStorage.delete(uploadedUrl).catch(() => {
      this.logger.warn({
        context: "UpdateProductUseCase",
        event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
        message: "Failed to rollback image uploads",
        data: { error },
      });
    });
  }

  private async deleteOldImageIfNeeded(payload: UpdateProductImagePayload): Promise<void> {
    let oldImageUrl: string | undefined;

    if (payload.action === UpdateProductImageAction.REMOVE) oldImageUrl = payload.imageUrl;
    if (payload.action === UpdateProductImageAction.REPLACE) oldImageUrl = payload.oldImageUrl;

    if (!oldImageUrl) return;

    await this.objectStorage.delete(oldImageUrl).catch((error) => {
      this.logger.warn({
        context: "UpdateProductUseCase",
        event: "DELETE_IMAGE_FAILED",
        message: "Failed to delete old image",
        data: { url: oldImageUrl, error },
      });
    });
  }

  private logUpdateProductImageStart(userId: string): void {
    this.logger.debug({
      context: "UpdateProductImageUseCase",
      event: "UPDATE_PRODUCT_IMAGE_STARTED",
      message: `User is updating product image`,
      data: { userId },
    });
  }

  private logSuccessfulUpdateProduct(productId: string, startTime: number): void {
    this.logger.info({
      context: "UpdateProductImageUseCase",
      event: "UPDATE_PRODUCT_IMAGE_SUCCESSFUL",
      message: `Product image updated successfully`,
      durationMs: Date.now() - startTime,
      data: { productId },
    });
  }
}
