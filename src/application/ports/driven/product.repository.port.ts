import { ProductCategory } from "@/domain/entities/product-category.entity";
import { Product } from "@/domain/entities/product.entity";
import { ProductStatus, ProductType } from "@/domain/types/product.type";

export enum ProductSort {
  NEWEST = "NEWEST",
  OLDEST = "OLDEST",
  NAME_ASC = "NAME_ASC",
  NAME_DESC = "NAME_DESC",
  PRICE_ASC = "PRICE_ASC",
  PRICE_DESC = "PRICE_DESC",
}

export interface BrowseProductsQuery {
  categoryId?: string;
  type?: ProductType;
  status?: ProductStatus;
  sort?: ProductSort;
  cursor?: string;
  limit?: number;
}

export interface ProductPage {
  products: Product[];
  nextCursor: string | null;
}

export interface ProductDetail {
  product: Product;
  productCategory: ProductCategory;
}

export interface ProductRepositoryPort {
  findDetailById(id: string): Promise<ProductDetail | null>;
  findById(id: string): Promise<Product | null>;
  findByIds(ids: string[]): Promise<Product[]>;
  search(keyword: string): Promise<Product[]>;
  browse(query: BrowseProductsQuery): Promise<ProductPage>;
  insert(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  updateImages(product: Product): Promise<void>;
  deductStockForItems(items: Array<{ id: string; quantity: number }>): Promise<void>;
  delete(id: string): Promise<void>;
}
