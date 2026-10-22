import { BaseApplicationException } from "./base-application.exception";

export class ProductCategoryNotFoundException extends BaseApplicationException {
  override readonly name = "ProductCategoryNotFoundException";
  constructor() {
    super("Product category not found");
  }
}
