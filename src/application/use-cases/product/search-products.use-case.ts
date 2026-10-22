import { SearchProductsUseCasePort, SearchProductsCommand, SearchProductsResult } from "@/application/ports/driving/search-products.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { ProductMapper } from "@/application/mappers/product.mapper";

export class SearchProductsUseCase implements SearchProductsUseCasePort {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ keyword }: SearchProductsCommand): Promise<SearchProductsResult> {
    const startTime = Date.now();

    this.logSearchProductsStart(keyword);

    const result = await this.productRepository.search(keyword);

    this.logSuccessfulSearchProducts(startTime);

    return {
      products: result.map((product) => ProductMapper.toSummaryView(product)),
      total: result.length,
      didYouMean: undefined, // TODO
    };
  }

  private logSearchProductsStart(keyword: string): void {
    this.logger.debug({
      context: "SearchProductsUseCase",
      event: "SEARCH_PRODUCTS_STARTED",
      message: `Product is being retrieved`,
      data: { keyword },
    });
  }

  private logSuccessfulSearchProducts(startTime: number): void {
    this.logger.info({
      context: "SearchProductsUseCase",
      event: "SEARCH_PRODUCTS_SUCCESSFUL",
      message: "Product retrieved successfully",
      durationMs: Date.now() - startTime,
    });
  }
}
