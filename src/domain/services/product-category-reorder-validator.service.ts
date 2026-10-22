import { ProductCategory } from "../entities/product-category.entity";
import {
  ProductCategoryDuplicateSortOrderException,
  ProductCategoryIncompleteReorderListException,
  UnknownProductCategoryInReorderException,
} from "../exceptions/product-category.exceptions";

export class ProductCategoryReorderValidatorService {
  static assertValid(payload: { id: string; sortOrder: number }[], allCategories: ProductCategory[]): void {
    if (payload.length !== allCategories.length) throw new ProductCategoryIncompleteReorderListException();

    const allIds = new Set(allCategories.map((c) => c.getId()));
    const hasUnknownId = payload.some((o) => !allIds.has(o.id));
    if (hasUnknownId) throw new UnknownProductCategoryInReorderException();

    const orders = payload.map((o) => o.sortOrder);
    if (new Set(orders).size !== orders.length) throw new ProductCategoryDuplicateSortOrderException();
  }
}
