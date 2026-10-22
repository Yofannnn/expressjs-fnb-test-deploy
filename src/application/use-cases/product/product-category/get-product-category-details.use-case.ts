import {
  GetProductCategoryDetailsUseCasePort,
  GetProductCategoryDetailsCommand,
  GetProductCategoryDetailsResult,
} from "@/application/ports/driving/get-product-category-details.use-case.port";
import { ProductCategoryRepositoryPort } from "@/application/ports/driven/product-category.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductCategoryMapper } from "@/application/mappers/product-category.mapper";
import { ProductCategoryNotFoundException } from "@/application/exceptions/product-category.exceptions";

export class GetProductCategoryDetailsUseCase implements GetProductCategoryDetailsUseCasePort {
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ id }: GetProductCategoryDetailsCommand): Promise<GetProductCategoryDetailsResult> {
    const startTime = Date.now();

    this.logGetProductCategoryStart(id);

    const category = await this.productCategoryRepository.findById(id);
    if (!category) throw new ProductCategoryNotFoundException();

    this.logSuccessfulGetProductCategory(id, startTime);

    return ProductCategoryMapper.toPlainObject(category);
  }

  private logGetProductCategoryStart(id: string): void {
    this.logger.debug({
      context: "GetProductCategoryDetailsUseCase",
      event: "GET_PRODUCT_CATEGORY_DETAIL_STARTED",
      message: `Product category is being retrieved`,
      data: { id },
    });
  }

  private logSuccessfulGetProductCategory(id: string, startTime: number): void {
    this.logger.info({
      context: "GetProductCategoryDetailsUseCase",
      event: "GET_PRODUCT_CATEGORY_DETAIL_SUCCESSFUL",
      message: `Product category retrieved successfully`,
      durationMs: Date.now() - startTime,
      data: { id },
    });
  }
}
