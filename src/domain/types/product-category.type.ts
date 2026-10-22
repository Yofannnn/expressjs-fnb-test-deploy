export enum ProductCategoryStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface ProductCategoryCreationData {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
}

export interface ProductCategoryRebuildData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  status: ProductCategoryStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
