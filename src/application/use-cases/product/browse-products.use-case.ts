import { BrowseProductsUseCasePort, BrowseProductsCommand, BrowseProductsResult } from "@/application/ports/driving/browse-products.use-case.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductMapper } from "@/application/mappers/product.mapper";

export class BrowseProductsUseCase implements BrowseProductsUseCasePort {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(query: BrowseProductsCommand): Promise<BrowseProductsResult> {
    const startTime = Date.now();

    this.logBrowseProductsStart();

    // TODO: add cache

    const { products, nextCursor } = await this.productRepository.browse(query);

    this.logSuccessfulBrowseProduct(startTime);

    return {
      products: products.map((product) => ProductMapper.toSummaryView(product)),
      nextCursor,
    };
  }

  private logBrowseProductsStart(): void {
    this.logger.debug({
      context: "BrowseProductsUseCase",
      event: "BROWSE_PRODUCTS_STARTED",
      message: "Products are being retrieved",
    });
  }

  private logSuccessfulBrowseProduct(startTime: number): void {
    this.logger.info({
      context: "BrowseProductsUseCase",
      event: "BROWSE_PRODUCTS_SUCCESSFUL",
      message: "Products retrieved successfully",
      durationMs: Date.now() - startTime,
    });
  }
}
