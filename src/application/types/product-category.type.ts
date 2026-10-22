import { ProductCategoryStatus } from "@/domain/types/product-category.type";

export interface ProductCategoryPlainObject {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  status: ProductCategoryStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategorySummaryView {
  id: string;
  name: string;
  imageUrl: string | null;
  status: ProductCategoryStatus;
  sortOrder: number;
  createdAt: Date;
}
