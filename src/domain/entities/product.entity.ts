import { Money } from "../value-objects/money.vo";
import { ProductImage } from "../value-objects/product-image.vo";
import { ProductCreationData, ProductRebuildData, ProductStatus, ProductType } from "../types/product.type";
import {
  InsufficientStockException,
  InvalidDeductQuantityException,
  InvalidPreparationTimeException,
  InvalidReorderProductImageException,
  InvalidRestockQuantityException,
  InvalidStockQuantityException,
  ProductImageNotFoundException,
  ProductWithoutImageException,
} from "../exceptions/product.exceptions";

export class Product {
  constructor(
    private readonly id: string,
    private categoryId: string,
    private name: string,
    private description: string | null,
    private price: Money,
    private type: ProductType,
    private ingredients: string | null,
    private preparationTimeInMinutes: number | null,
    private images: ProductImage[],
    private stockQuantity: number,
    private status: ProductStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  getId(): string {
    return this.id;
  }

  getCategoryId(): string {
    return this.categoryId;
  }

  getName(): string {
    return this.name;
  }

  getPrice(): Money {
    return this.price;
  }

  getDescription(): string | null {
    return this.description;
  }

  getType(): ProductType {
    return this.type;
  }

  getIngredients(): string | null {
    return this.ingredients;
  }

  getPreparationTimeInMinutes(): number | null {
    return this.preparationTimeInMinutes;
  }

  getImages(): ProductImage[] {
    return [...this.images].sort((a, b) => a.getSortOrder() - b.getSortOrder());
  }

  getStockQuantity(): number {
    return this.stockQuantity;
  }

  getStatus(): ProductStatus {
    return this.status;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  canOrder(quantity = 1): boolean {
    return this.status === ProductStatus.AVAILABLE && this.stockQuantity >= quantity;
  }

  hasImage(imageUrl: string): boolean {
    return this.images.some((image) => image.getUrl() === imageUrl);
  }

  requiresPreparation(): boolean {
    return this.type !== ProductType.PACKAGED;
  }

  rename(name: string): void {
    this.name = name;
    this.touch();
  }

  changeCategory(categoryId: string): void {
    this.categoryId = categoryId;
    this.touch();
  }

  changePrice(amount: number): void {
    this.price = new Money(amount);
    this.touch();
  }

  changeDescription(description: string | null): void {
    this.description = description;
    this.touch();
  }

  changeType(type: ProductType): void {
    this.type = type;
    this.touch();
  }

  changeIngredients(ingredients: string | null): void {
    this.ingredients = ingredients;
    this.touch();
  }

  changePreparationTime(minutes: number | null): void {
    if (minutes !== null && minutes <= 0) throw new InvalidPreparationTimeException(minutes);
    this.preparationTimeInMinutes = minutes;
    this.touch();
  }

  setStatus(status: ProductStatus): void {
    this.status = status === ProductStatus.OUT_OF_STOCK && this.stockQuantity !== 0 ? ProductStatus.UNAVAILABLE : status;
    this.touch();
  }

  setStock(quantity: number): void {
    if (quantity < 0) throw new InvalidStockQuantityException();
    this.stockQuantity = quantity;

    if (this.stockQuantity === 0 && this.status === ProductStatus.AVAILABLE) {
      this.status = ProductStatus.OUT_OF_STOCK;
    } else if (this.stockQuantity > 0 && this.status === ProductStatus.OUT_OF_STOCK) {
      this.status = ProductStatus.AVAILABLE;
    }
    this.touch();
  }

  restock(quantity: number): void {
    if (quantity < 0) throw new InvalidRestockQuantityException(quantity);
    this.stockQuantity += quantity;
    if (this.stockQuantity > 0 && this.status === ProductStatus.OUT_OF_STOCK) {
      this.status = ProductStatus.AVAILABLE;
    }
    this.touch();
  }

  deductStock(quantity: number): void {
    if (quantity < 0) throw new InvalidDeductQuantityException(quantity);
    if (quantity > this.stockQuantity) throw new InsufficientStockException(quantity, this.stockQuantity);
    this.stockQuantity -= quantity;
    if (this.stockQuantity === 0 && this.status === ProductStatus.AVAILABLE) this.status = ProductStatus.OUT_OF_STOCK;
    this.touch();
  }

  addImage(imageUrl: string): void {
    const imagesLength = this.images.length;
    const newImage = ProductImage.create({
      productId: this.id,
      url: imageUrl,
      altText: `${this.name} image ${imagesLength + 1}`,
      isPrimary: imagesLength === 0,
      sortOrder: imagesLength + 1,
    });
    this.images = [...this.images, newImage];
    this.touch();
  }

  removeImage(imageUrl: string): void {
    if (this.images.length <= 1) throw new ProductWithoutImageException();
    const removed = this.images.find((image) => image.getUrl() === imageUrl);
    if (!removed) throw new ProductImageNotFoundException();
    this.images = this.images.filter((image) => image.getUrl() !== imageUrl);
    if (removed.isPrimaryImage()) this.images = this.images.map((image, index) => (index === 0 ? image.makePrimary() : image));
    this.touch();
  }

  replaceImage(replacement: { oldUrl: string; newUrl: string }) {
    const exists = this.hasImage(replacement.oldUrl);
    if (!exists) throw new ProductImageNotFoundException();

    this.images = this.images.map((image) => {
      if (image.getUrl() === replacement.oldUrl) return image.changeUrl(replacement.newUrl);
      return image;
    });

    this.touch();
  }

  reorderImages(orderedUrls: string[]): void {
    if (orderedUrls.length !== this.images.length) throw new InvalidReorderProductImageException();

    const imageUrls = new Set(this.images.map((img) => img.getUrl()));
    for (const url of orderedUrls) {
      if (!imageUrls.has(url)) throw new ProductImageNotFoundException();
    }

    this.images = orderedUrls.map((url, index) => {
      const image = this.images.find((img) => img.getUrl() === url)!;
      return image.changeSortOrder(index + 1);
    });

    this.touch();
  }

  assertCanOrder(quantity: number): void {
    if (!this.canOrder(quantity)) throw new InsufficientStockException(quantity, this.stockQuantity);
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  static create(data: ProductCreationData): Product {
    const now = new Date();
    return new Product(
      data.id,
      data.categoryId,
      data.name,
      data.description || null,
      new Money(data.price),
      data.type,
      data.ingredients || null,
      data.preparationTimeInMinutes || null,
      data.imageUrls.map((url, i) =>
        ProductImage.create({
          productId: data.id,
          url,
          altText: `${data.name} image ${i + 1}`,
          isPrimary: i === 0,
          sortOrder: i + 1,
        }),
      ),
      data.stockQuantity || 0,
      data.status || ProductStatus.UPCOMING,
      now,
      now,
    );
  }

  static rebuild(data: ProductRebuildData): Product {
    return new Product(
      data.id,
      data.categoryId,
      data.name,
      data.description,
      new Money(data.price),
      data.type,
      data.ingredients,
      data.preparationTimeInMinutes,
      [...data.images.map((img) => ProductImage.rebuild(img))].sort((a, b) => a.getSortOrder() - b.getSortOrder()),
      data.stockQuantity,
      data.status,
      data.createdAt,
      data.updatedAt,
    );
  }
}
