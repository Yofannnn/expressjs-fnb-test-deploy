import {
  BrowseProductCategoriesUseCasePort,
  BrowseProductCategoriesCommand,
  BrowseProductCategoriesResult,
} from "@/application/ports/driving/browse-product-categories.use-case.port";
import { ProductCategoryRepositoryPort } from "@/application/ports/driven/product-category.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductCategoryMapper } from "@/application/mappers/product-category.mapper";

export class BrowseProductCategoriesUseCase implements BrowseProductCategoriesUseCasePort {
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: BrowseProductCategoriesCommand): Promise<BrowseProductCategoriesResult> {
    const startTime = Date.now();

    this.logBrowseProductCategoriesStart();

    const categories = await this.productCategoryRepository.browse(command);

    this.logSuccessfulBrowseProductCategories(startTime);

    return categories.map((category) => ProductCategoryMapper.toSummaryView(category));
  }

  private logBrowseProductCategoriesStart(): void {
    this.logger.debug({
      context: "BrowseProductCategoriesUseCase",
      event: "BROWSE_PRODUCT_CATEGORIES_STARTED",
      message: "Product categories are being retrieved",
    });
  }

  private logSuccessfulBrowseProductCategories(startTime: number): void {
    this.logger.info({
      context: "BrowseProductCategoriesUseCase",
      event: "BROWSE_PRODUCT_CATEGORIES_SUCCESSFUL",
      message: "Product categories retrieved successfully",
      durationMs: Date.now() - startTime,
    });
  }
}
