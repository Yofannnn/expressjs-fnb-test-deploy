import { UpdateProductStatusUseCasePort, UpdateProductStatusCommand } from "@/application/ports/driving/update-product-status.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { Product } from "@/domain/entities/product.entity";
import { ProductAccessControlService } from "@/domain/services/product-access-control.service";
import { ProductNotFoundException } from "@/application/exceptions/product.exceptions";

export class UpdateProductStatusUseCase implements UpdateProductStatusUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ userId, userRole, payload }: UpdateProductStatusCommand): Promise<{ id: string }> {
    const startTime = Date.now();

    this.logUpdateProductStatusStart(userId);

    ProductAccessControlService.assertCanUpdate(userRole);

    const result = await this.uow.commit(async (repos) => {
      const product = await this.findProduct(payload.id, repos.productRepository);

      product.setStatus(payload.setStatus);
      await repos.productRepository.update(product);

      return { id: product.getId() };
    });

    this.logSuccessfulUpdateProductStatus(result.id, startTime);

    return result;
  }

  private async findProduct(productId: string, productRepository: ProductRepositoryPort): Promise<Product> {
    const product = await productRepository.findById(productId);
    if (!product) throw new ProductNotFoundException();
    return product;
  }

  private logUpdateProductStatusStart(userId: string): void {
    this.logger.debug({
      context: "UpdateProductStatusUseCase",
      event: "UPDATE_PRODUCT_STATUS_STARTED",
      message: `Starting updating product status`,
      data: { userId },
    });
  }

  private logSuccessfulUpdateProductStatus(productId: string, startTime: number): void {
    this.logger.info({
      context: "UpdateProductStatusUseCase",
      event: "UPDATE_PRODUCT_STATUS_SUCCESSFUL",
      message: `Product status updated successfully`,
      durationMs: Date.now() - startTime,
      data: { productId },
    });
  }
}
