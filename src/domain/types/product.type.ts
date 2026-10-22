export interface ProductImageCreationData {
  productId: string;
  url: string;
  altText?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface ProductImageRebuildData {
  productId: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export enum ProductStatus {
  UPCOMING = "UPCOMING",
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  DISCONTINUED = "DISCONTINUED",
}

export enum ProductType {
  FOOD = "FOOD",
  DRINK = "DRINK",
  PACKAGED = "PACKAGED",
}

export interface ProductCreationData {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  description?: string;
  stockQuantity?: number;
  type: ProductType;
  ingredients?: string;
  preparationTimeInMinutes?: number;
  imageUrls: string[];
  status?: ProductStatus;
}

export interface ProductRebuildData {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  description: string | null;
  stockQuantity: number;
  type: ProductType;
  ingredients: string | null;
  preparationTimeInMinutes: number | null;
  status: ProductStatus;
  images: ProductImageRebuildData[];
  createdAt: Date;
  updatedAt: Date;
}
