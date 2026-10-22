import { BaseDomainException } from "./base-domain.exception";

export class InvalidStockQuantityException extends BaseDomainException {
  override readonly name = "InvalidStockQuantityException";
  constructor() {
    super("Stock quantity must not be negative");
  }
}

export class InvalidRestockQuantityException extends BaseDomainException {
  override readonly name = "InvalidRestockQuantityException";
  constructor(quantity: number) {
    super(`Restock quantity must not be negative. Provided: ${quantity}`);
  }
}

export class InvalidDeductQuantityException extends BaseDomainException {
  override readonly name = "InvalidDeductQuantityException";
  constructor(quantity: number) {
    super(`Deduct quantity must not be negative. Provided: ${quantity}`);
  }
}

export class InsufficientStockException extends BaseDomainException {
  override readonly name = "InsufficientStockException";
  constructor(requested: number, available: number) {
    super(`Insufficient stock. Requested: ${requested}, Available: ${available}`);
  }
}

export class InvalidPreparationTimeException extends BaseDomainException {
  override readonly name = "InvalidPreparationTimeException";
  constructor(minutes: number) {
    super(`Preparation time must be positive. Provided: ${minutes}`);
  }
}

export class ProductWithoutImageException extends BaseDomainException {
  override readonly name = "ProductWithoutImageException";
  constructor() {
    super("Product must have at least one image");
  }
}

export class ProductImageNotFoundException extends BaseDomainException {
  override readonly name = "ProductImageNotFoundException";
  constructor() {
    super("Product image not found");
  }
}

export class InvalidReorderProductImageException extends BaseDomainException {
  override readonly name = "InvalidReorderProductImageException";
  constructor() {
    super("Product image reorder must have same length of images");
  }
}
