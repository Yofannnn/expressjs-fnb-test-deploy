import { BaseDomainException } from "./base-domain.exception";

export class ProductCategoryInactiveException extends BaseDomainException {
  override readonly name = "ProductCategoryInactiveException";
  constructor(name: string) {
    super(`Product category (${name}) is inactive`);
    this.withDetails({ name });
  }
}

export class ProductCategoryIncompleteReorderListException extends BaseDomainException {
  override readonly name = "ProductCategoryIncompleteReorderListException";
  constructor() {
    super("Incomplete reorder list");
  }
}

export class UnknownProductCategoryInReorderException extends BaseDomainException {
  override readonly name = "UnknownProductCategoryInReorderException";
  constructor() {
    super("Unknown product category in reorder list");
  }
}

export class ProductCategoryDuplicateSortOrderException extends BaseDomainException {
  override readonly name = "ProductCategoryDuplicateSortOrderException";
  constructor() {
    super("Duplicate sort order");
  }
}
