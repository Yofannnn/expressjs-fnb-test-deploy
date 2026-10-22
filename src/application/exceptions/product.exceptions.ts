import { BaseApplicationException } from "./base-application.exception";

export class ProductNotFoundException extends BaseApplicationException {
  override readonly name = "ProductNotFoundException";
  constructor() {
    super("Product not found");
  }
}

export class ConflictingProductStockOperationException extends BaseApplicationException {
  override readonly name = "ConflictingProductStockOperationException";
  constructor() {
    super("Conflicting stock operation");
  }
}

export class NoProductStockOperationException extends BaseApplicationException {
  override readonly name = "NoProductStockOperationException";
  constructor() {
    super("No stock operation");
  }
}

export class NoReorderProductImageOperationException extends BaseApplicationException {
  override readonly name = "NoReorderProductImageOperationException";
  constructor() {
    super("No reorder image operation");
  }
}
