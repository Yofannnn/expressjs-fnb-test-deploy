import {
  ReorderProductCategoriesUseCasePort,
  ReorderProductCategoriesCommand,
} from "@/application/ports/driving/reorder-product-categories.use-case.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductCategoryReorderValidatorService } from "@/domain/services/product-category-reorder-validator.service";
import { ProductCategoryAccessControlService } from "@/domain/services/product-category-access-control.service";

export class ReorderProductCategoriesUseCase implements ReorderProductCategoriesUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ userId, userRole, payload }: ReorderProductCategoriesCommand): Promise<void> {
    const startTime = Date.now();
    this.logReorderProductCategoryStart(userId);

    ProductCategoryAccessControlService.assertCanUpdate(userRole);

    const result = await this.uow.commit(async (repos) => {
      /*
       * Fetch all categories regardless of status — inactive categories
       * retain their sort order so reactivating them doesn't cause conflicts
       */
      const allCategories = await repos.productCategoryRepository.findAll();

      ProductCategoryReorderValidatorService.assertValid(payload, allCategories);

      for (const order of payload) {
        const category = allCategories.find((c) => c.getId() === order.id)!;
        category.reorder(order.sortOrder);
      }

      await repos.productCategoryRepository.updateMany(allCategories);
      return { allCategories };
    });

    this.logSuccessfulReorderProduct(result.allCategories.length, startTime);
  }

  private logReorderProductCategoryStart(userId: string): void {
    this.logger.debug({
      context: "ReorderProductCategoriesUseCase",
      event: "REORDER_PRODUCT_CATEGORIES_STARTED",
      message: `User is reordering product categories`,
      data: { userId },
    });
  }

  private logSuccessfulReorderProduct(count: number, startTime: number): void {
    this.logger.info({
      context: "ReorderProductCategoriesUseCase",
      event: "REORDER_PRODUCT_CATEGORIES_SUCCESSFUL",
      message: "Product category reordered successfully",
      durationMs: Date.now() - startTime,
      data: { count },
    });
  }
}
