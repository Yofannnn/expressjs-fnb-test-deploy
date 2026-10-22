import { ProductSummaryView } from "@/application/types/product.type";
import { ProductStatus, ProductType } from "@/domain/types/product.type";

export enum ProductSort {
  NEWEST = "NEWEST",
  OLDEST = "OLDEST",
  NAME_ASC = "NAME_ASC",
  NAME_DESC = "NAME_DESC",
  PRICE_ASC = "PRICE_ASC",
  PRICE_DESC = "PRICE_DESC",
}

export interface BrowseProductsCommand {
  categoryId?: string;
  type?: ProductType;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  cursor?: string;
  limit?: number;
}

export interface BrowseProductsResult {
  products: ProductSummaryView[];
  nextCursor: string | null;
}

export interface BrowseProductsUseCasePort {
  execute(command: BrowseProductsCommand): Promise<BrowseProductsResult>;
}
