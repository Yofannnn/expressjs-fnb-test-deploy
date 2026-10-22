import {
  GetProductsByIdsUseCasePort,
  GetProductsByIdsCommand,
  GetProductsByIdsResult,
} from "@/application/ports/driving/get-products-by-ids.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { ProductMapper } from "@/application/mappers/product.mapper";

export class GetProductsByIdsUseCase implements GetProductsByIdsUseCasePort {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ ids }: GetProductsByIdsCommand): Promise<GetProductsByIdsResult> {
    const startTime = Date.now();

    this.logBrowseProductsStart();

    // TODO: add cache

    const products = await this.productRepository.findByIds(ids);

    this.logSuccessfulBrowseProduct(startTime);

    return {
      products: products.map((product) => ProductMapper.toPlainObject(product)),
      notFoundIds: products.length !== ids.length ? ids.filter((id) => !products.some((p) => p.getId() === id)) : [],
    };
  }

  private logBrowseProductsStart(): void {
    this.logger.debug({
      context: "GetProductsByIdsUseCase ",
      event: "GET_PRODUCTS_BY_IDS_STARTED",
      message: "Products are being retrieved",
    });
  }

  private logSuccessfulBrowseProduct(startTime: number): void {
    this.logger.info({
      context: "GetProductsByIdsUseCase ",
      event: "GET_PRODUCTS_BY_IDS_SUCCESSFUL",
      message: "Products retrieved successfully",
      durationMs: Date.now() - startTime,
    });
  }
}
