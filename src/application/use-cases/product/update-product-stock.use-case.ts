import {
  UpdateProductStockUseCasePort,
  UpdateProductStockCommand,
  UpdateProductStockPayload,
} from "@/application/ports/driving/update-product-stock.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { Product } from "@/domain/entities/product.entity";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import {
  ConflictingProductStockOperationException,
  NoProductStockOperationException,
  ProductNotFoundException,
} from "@/application/exceptions/product.exceptions";

export class UpdateProductStockUseCase implements UpdateProductStockUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ userId, userRole, payload }: UpdateProductStockCommand): Promise<{ id: string }> {
    const startTime = Date.now();

    this.logUpdateProductStockStart(userId);

    ProductAccessControlService.assertCanManageStock(userRole);

    this.validatePayload(payload);

    const result = await this.uow.commit(async (repos) => {
      const product = await this.findProduct(payload.id, repos.productRepository);

      this.performUpdateProduct(product, payload);
      await repos.productRepository.update(product);

      return { id: product.getId() };
    });

    this.logSuccessfulUpdateProductStock(result.id, startTime);

    return result;
  }

  private validatePayload(payload: UpdateProductStockPayload): void {
    const ops = [payload.restock, payload.deductStock, payload.setStock].filter((v) => v !== undefined);
    if (ops.length > 1) throw new ConflictingProductStockOperationException();
    if (ops.length === 0) throw new NoProductStockOperationException();
  }

  private async findProduct(productId: string, productRepository: ProductRepositoryPort): Promise<Product> {
    const product = await productRepository.findById(productId);
    if (!product) throw new ProductNotFoundException();
    return product;
  }

  private performUpdateProduct(product: Product, payload: UpdateProductStockPayload): void {
    if (this.hasValue(payload.restock)) product.restock(payload.restock);
    if (this.hasValue(payload.deductStock)) product.deductStock(payload.deductStock);
    if (this.hasValue(payload.setStock)) product.setStock(payload.setStock);
  }

  private hasValue<T>(value: T | undefined): value is T {
    return value !== undefined;
  }

  private logUpdateProductStockStart(userId: string): void {
    this.logger.debug({
      context: "UpdateProductStockUseCase",
      event: "UPDATE_PRODUCT_STOCK_STARTED",
      message: `Starting updating product stock`,
      data: { userId },
    });
  }

  private logSuccessfulUpdateProductStock(productId: string, startTime: number): void {
    this.logger.info({
      context: "UpdateProductStockUseCase",
      event: "UPDATE_PRODUCT_STOCK_SUCCESSFUL",
      message: `Product stock updated successfully`,
      durationMs: Date.now() - startTime,
      data: { productId },
    });
  }
}
