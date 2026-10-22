import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";

export enum ProductCategorySort {
  NEWEST = "NEWEST",
  OLDEST = "OLDEST",
  NAME_ASC = "NAME_ASC",
  NAME_DESC = "NAME_DESC",
  SORT_ORDER_ASC = "SORT_ORDER_ASC",
  SORT_ORDER_DESC = "SORT_ORDER_DESC",
}

export interface BrowseProductCategoriesQuery {
  status?: ProductCategoryStatus;
  page?: number;
  limit?: number;
  sort?: ProductCategorySort;
}

export interface ProductCategoryRepositoryPort {
  findById(id: string): Promise<ProductCategory | null>;
  browse(query: BrowseProductCategoriesQuery): Promise<ProductCategory[]>;
  findAll(): Promise<ProductCategory[]>;
  insert(productCategory: ProductCategory): Promise<void>;
  update(productCategory: ProductCategory): Promise<void>;
  updateMany(productCategories: ProductCategory[]): Promise<void>;
  delete(id: string): Promise<void>;
  getNextSortOrder(): Promise<number>;
}
