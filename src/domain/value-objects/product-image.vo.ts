import { ProductImageCreationData, ProductImageRebuildData } from "../types/product.type";

export class ProductImage {
  constructor(
    private readonly productId: string,
    private readonly url: string,
    private readonly altText: string | null,
    private readonly isPrimary: boolean,
    private readonly sortOrder: number,
  ) {}

  getProductId(): string {
    return this.productId;
  }

  getUrl(): string {
    return this.url;
  }

  getAltText(): string | null {
    return this.altText;
  }

  getSortOrder(): number {
    return this.sortOrder;
  }

  isPrimaryImage(): boolean {
    return this.isPrimary;
  }

  changeUrl(url: string): ProductImage {
    return new ProductImage(this.productId, url, this.altText, this.isPrimary, this.sortOrder);
  }

  changeAltText(altText: string): ProductImage {
    return new ProductImage(this.productId, this.url, altText, this.isPrimary, this.sortOrder);
  }

  changeSortOrder(sortOrder: number): ProductImage {
    return new ProductImage(this.productId, this.url, this.altText, this.isPrimary, sortOrder);
  }

  makePrimary(): ProductImage {
    return new ProductImage(this.productId, this.url, this.altText, true, this.sortOrder);
  }

  static create(data: ProductImageCreationData): ProductImage {
    return new ProductImage(data.productId, data.url, data.altText || null, data.isPrimary || false, data.sortOrder || 0);
  }

  static rebuild(data: ProductImageRebuildData): ProductImage {
    return new ProductImage(data.productId, data.url, data.altText, data.isPrimary, data.sortOrder);
  }
}
