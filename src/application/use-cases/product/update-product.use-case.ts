import { UpdateProductUseCasePort, UpdateProductCommand, UpdateProductPayload } from "@/application/ports/driving/update-product.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { Product } from "@/domain/entities/product.entity";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import { ProductNotFoundException } from "@/application/exceptions/product.exceptions";

export class UpdateProductUseCase implements UpdateProductUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ userId, userRole, payload }: UpdateProductCommand): Promise<{ id: string }> {
    const startTime = Date.now();

    this.logUpdateProductStart(userId);

    ProductAccessControlService.assertCanUpdate(userRole);

    const result = await this.uow.commit(async (repos) => {
      const product = await this.findProduct(payload.id, repos.productRepository);
      this.performUpdateProduct(product, payload);
      await repos.productRepository.update(product);

      return { id: product.getId() };
    });

    this.logSuccessfulUpdateProduct(payload.id, startTime);

    return result;
  }

  private async findProduct(productId: string, productRepository: ProductRepositoryPort): Promise<Product> {
    const product = await productRepository.findById(productId);
    if (!product) throw new ProductNotFoundException();
    return product;
  }

  private performUpdateProduct(product: Product, payload: UpdateProductPayload): void {
    if (this.hasValue(payload.categoryId)) product.changeCategory(payload.categoryId);
    if (this.hasValue(payload.name)) product.rename(payload.name);
    if (this.hasValue(payload.price)) product.changePrice(payload.price);
    if (this.hasValue(payload.description)) product.changeDescription(payload.description);
    if (this.hasValue(payload.type)) product.changeType(payload.type);
    if (this.hasValue(payload.ingredients)) product.changeIngredients(payload.ingredients);
    if (this.hasValue(payload.preparationTimeInMinutes)) product.changePreparationTime(payload.preparationTimeInMinutes);
  }

  private hasValue<T>(value: T | undefined): value is T {
    return value !== undefined;
  }

  private logUpdateProductStart(userId: string): void {
    this.logger.debug({
      context: "UpdateProductUseCase",
      event: "UPDATE_PRODUCT_STARTED",
      message: `User is updating product`,
      data: { userId },
    });
  }

  private logSuccessfulUpdateProduct(productId: string, startTime: number): void {
    this.logger.info({
      context: "UpdateProductUseCase",
      event: "UPDATE_PRODUCT_SUCCESSFUL",
      message: `Product updated successfully`,
      durationMs: Date.now() - startTime,
      data: { productId },
    });
  }
}
