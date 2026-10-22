import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryPlainObject, ProductCategorySummaryView } from "../types/product-category.type";

export class ProductCategoryMapper {
  static toPlainObject(productCategory: ProductCategory): ProductCategoryPlainObject {
    return {
      id: productCategory.getId(),
      name: productCategory.getName(),
      description: productCategory.getDescription(),
      status: productCategory.getStatus(),
      sortOrder: productCategory.getSortOrder(),
      imageUrl: productCategory.getImageUrl(),
      createdAt: productCategory.getCreatedAt(),
      updatedAt: productCategory.getUpdatedAt(),
    };
  }

  static toSummaryView(productCategory: ProductCategory): ProductCategorySummaryView {
    return {
      id: productCategory.getId(),
      name: productCategory.getName(),
      status: productCategory.getStatus(),
      imageUrl: productCategory.getImageUrl(),
      sortOrder: productCategory.getSortOrder(),
      createdAt: productCategory.getCreatedAt(),
    };
  }
}
