import { ProductStatus, ProductType } from "@/domain/types/product.type";

export interface ProductImagePlainObject {
  productId: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductPlainObject {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  type: ProductType;
  ingredients: string | null;
  preparationTimeInMinutes: number | null;
  images: ProductImagePlainObject[];
  stockQuantity: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDetailsView {
  id: string;
  category: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
  };
  name: string;
  price: number;
  description: string | null;
  type: ProductType;
  ingredients: string | null;
  preparationTimeInMinutes: number | null;
  stockQuantity: number;
  status: ProductStatus;
  images: {
    url: string;
    altText: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSummaryView {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  status: ProductStatus;
  primaryImageUrl: string;
}
