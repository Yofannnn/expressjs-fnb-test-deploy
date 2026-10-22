import { ProductCategoryInactiveException } from "../exceptions/product-category.exceptions";
import { ProductCategoryCreationData, ProductCategoryRebuildData, ProductCategoryStatus } from "../types/product-category.type";

export class ProductCategory {
  constructor(
    private readonly id: string,
    private name: string,
    private description: string | null,
    private imageUrl: string | null,
    private status: ProductCategoryStatus,
    private sortOrder: number,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getImageUrl(): string | null {
    return this.imageUrl;
  }

  getStatus(): ProductCategoryStatus {
    return this.status;
  }

  getSortOrder(): number {
    return this.sortOrder;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  isCurrentlyActive(): boolean {
    return this.status === ProductCategoryStatus.ACTIVE;
  }

  rename(name: string): void {
    this.name = name;
    this.touch();
  }

  changeDescription(description: string | null): void {
    this.description = description;
    this.touch();
  }

  setImage(imageUrl: string): void {
    this.imageUrl = imageUrl;
    this.touch();
  }

  reorder(sortOrder: number): void {
    this.sortOrder = sortOrder;
    this.touch();
  }

  setStatus(status: ProductCategoryStatus): void {
    this.status = status;
    this.touch();
  }

  assertActive(): void {
    if (!this.isCurrentlyActive()) throw new ProductCategoryInactiveException(this.name);
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  static create(data: ProductCategoryCreationData): ProductCategory {
    const now = new Date();
    return new ProductCategory(
      data.id,
      data.name,
      data.description || null,
      data.imageUrl || null,
      ProductCategoryStatus.ACTIVE,
      data.sortOrder,
      now,
      now,
    );
  }

  static rebuild(data: ProductCategoryRebuildData): ProductCategory {
    return new ProductCategory(data.id, data.name, data.description, data.imageUrl, data.status, data.sortOrder, data.createdAt, data.updatedAt);
  }
}
