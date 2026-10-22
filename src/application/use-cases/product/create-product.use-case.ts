import { CreateProductCommand, CreateProductPayload, CreateProductUseCasePort } from "@/application/ports/driving/create-product.use-case.port";
import { ProductCategoryRepositoryPort } from "@/application/ports/driven/product-category.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { Product } from "@/domain/entities/product.entity";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import { ObjectStoragePort } from "@/application/ports/driven/object-storage.port";
import { ProductCategoryNotFoundException } from "@/application/exceptions/product-category.exceptions";

export class CreateProductUseCase implements CreateProductUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly productCategoryRepository: ProductCategoryRepositoryPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly objectStorage: ObjectStoragePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ userId, userRole, payload }: CreateProductCommand): Promise<{ id: string }> {
    const startTime = Date.now();

    this.logCreateProductStart(userId);

    ProductAccessControlService.assertCanCreate(userRole);

    await this.validateCategory(payload.categoryId);

    const imageUrls = await this.uploadImages(payload.images);

    const newProduct = this.buildProductEntity(payload, imageUrls);

    try {
      await this.uow.commit(async (repos) => {
        await repos.productRepository.insert(newProduct);
      });
    } catch (error) {
      await this.rollbackImageUploads(imageUrls);
      throw error;
    }

    this.logSuccessfulCreateProduct(startTime);

    return { id: newProduct.getId() };
  }

  private async validateCategory(categoryId: string): Promise<ProductCategory> {
    const category = await this.productCategoryRepository.findById(categoryId);
    if (!category) throw new ProductCategoryNotFoundException();
    category.assertActive();
    return category;
  }

  private async uploadImages(images: CreateProductPayload["images"]): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const image of images) {
      try {
        const url = await this.objectStorage.upload(image);
        uploadedUrls.push(url);
      } catch (error) {
        await this.rollbackImageUploads(uploadedUrls);
        throw error;
      }
    }

    return uploadedUrls;
  }

  private async rollbackImageUploads(imageUrls: string[]): Promise<void> {
    if (!imageUrls.length) return;

    await Promise.all(
      imageUrls.map((imageUrl) =>
        this.objectStorage.delete(imageUrl).catch((error) => {
          this.logger.warn({
            context: "CreateProductUseCase",
            event: "ROLLBACK_IMAGE_UPLOADS_FAILED",
            message: "Failed to rollback image uploads",
            data: { error },
          });
        }),
      ),
    );
  }

  private buildProductEntity(payload: CreateProductPayload, imageUrls: string[]): Product {
    return Product.create({
      id: this.idGenerator.generate(),
      categoryId: payload.categoryId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      type: payload.type,
      status: payload.status,
      imageUrls,
      stockQuantity: payload.stockQuantity,
      ingredients: payload.ingredients,
      preparationTimeInMinutes: payload.preparationTimeInMinutes,
    });
  }

  private logCreateProductStart(userId: string): void {
    this.logger.debug({
      context: "CreateProductUseCase",
      event: "CREATE_PRODUCT_STARTED",
      message: "Creating product",
      data: { userId },
    });
  }

  private logSuccessfulCreateProduct(startTime: number): void {
    this.logger.info({
      context: "CreateProductUseCase",
      event: "CREATE_PRODUCT_SUCCESSFUL",
      message: "Product created successfully",
      durationMs: Date.now() - startTime,
    });
  }
}
