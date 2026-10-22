import { ProductCategorySummaryView } from "@/application/types/product-category.type";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";

export enum ProductCategorySort {
  NEWEST = "NEWEST",
  OLDEST = "OLDEST",
  NAME_ASC = "NAME_ASC",
  NAME_DESC = "NAME_DESC",
  SORT_ORDER_ASC = "SORT_ORDER_ASC",
  SORT_ORDER_DESC = "SORT_ORDER_DESC",
}

export interface BrowseProductCategoriesCommand {
  status?: ProductCategoryStatus;
  sort?: ProductCategorySort;
}

export type BrowseProductCategoriesResult = ProductCategorySummaryView[];

export interface BrowseProductCategoriesUseCasePort {
  execute(command: BrowseProductCategoriesCommand): Promise<BrowseProductCategoriesResult>;
}
