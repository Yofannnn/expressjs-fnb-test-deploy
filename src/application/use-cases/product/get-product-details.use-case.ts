import {
  GetProductDetailsUseCasePort,
  GetProductDetailsCommand,
  GetProductDetailsResult,
} from "@/application/ports/driving/get-product-details.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { ProductMapper } from "@/application/mappers/product.mapper";
import { ProductNotFoundException } from "@/application/exceptions/product.exceptions";

export class GetProductDetailsUseCase implements GetProductDetailsUseCasePort {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ id }: GetProductDetailsCommand): Promise<GetProductDetailsResult> {
    const startTime = Date.now();

    this.logGetProductStart(id);

    // TODO: add cache

    const result = await this.findProduct(id);

    this.logSuccessfulGetProduct(result.product.getId(), startTime);

    return ProductMapper.toDetailView(result.product, result.productCategory);
  }

  private async findProduct(productId: string) {
    const product = await this.productRepository.findDetailById(productId);
    if (!product) throw new ProductNotFoundException();
    return product;
  }

  private logGetProductStart(productId: string): void {
    this.logger.debug({
      context: "GetProductDetailsUseCase",
      event: "GET_PRODUCT_DETAIL_STARTED",
      message: `Product is being retrieved`,
      data: { productId },
    });
  }

  private logSuccessfulGetProduct(productId: string, startTime: number): void {
    this.logger.info({
      context: "GetProductDetailsUseCase",
      event: "GET_PRODUCT_DETAIL_SUCCESSFUL",
      message: `Product retrieved successfully`,
      durationMs: Date.now() - startTime,
      data: { productId },
    });
  }
}
