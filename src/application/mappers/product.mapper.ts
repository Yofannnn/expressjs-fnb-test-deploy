import { Product } from "@/domain/entities/product.entity";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductDetailsView, ProductPlainObject, ProductSummaryView } from "@/application/types/product.type";

export class ProductMapper {
  static toPlainObject(product: Product): ProductPlainObject {
    return {
      id: product.getId(),
      categoryId: product.getCategoryId(),
      name: product.getName(),
      description: product.getDescription(),
      price: product.getPrice().getAmount(),
      type: product.getType(),
      ingredients: product.getIngredients(),
      preparationTimeInMinutes: product.getPreparationTimeInMinutes(),
      stockQuantity: product.getStockQuantity(),
      status: product.getStatus(),
      images: product.getImages().map((image) => ({
        productId: image.getProductId(),
        url: image.getUrl(),
        altText: image.getAltText(),
        isPrimary: image.isPrimaryImage(),
        sortOrder: image.getSortOrder(),
      })),
      createdAt: product.getCreatedAt(),
      updatedAt: product.getUpdatedAt(),
    };
  }

  static toDetailView(product: Product, category: ProductCategory): ProductDetailsView {
    return {
      id: product.getId(),
      name: product.getName(),
      price: product.getPrice().getAmount(),
      description: product.getDescription(),
      type: product.getType(),
      ingredients: product.getIngredients(),
      preparationTimeInMinutes: product.getPreparationTimeInMinutes(),
      stockQuantity: product.getStockQuantity(),
      status: product.getStatus(),
      images: product.getImages().map((image) => ({
        url: image.getUrl(),
        altText: image.getAltText(),
        isPrimary: image.isPrimaryImage(),
        sortOrder: image.getSortOrder(),
      })),
      category: {
        id: category.getId(),
        name: category.getName(),
        description: category.getDescription(),
        imageUrl: category.getImageUrl(),
      },
      createdAt: product.getCreatedAt(),
      updatedAt: product.getUpdatedAt(),
    };
  }

  static toSummaryView(product: Product): ProductSummaryView {
    const primaryImage = product.getImages().find((image) => image.isPrimaryImage());

    return {
      id: product.getId(),
      name: product.getName(),
      price: product.getPrice().getAmount(),
      categoryId: product.getCategoryId(),
      primaryImageUrl: primaryImage ? primaryImage.getUrl() : product.getImages()[0].getUrl(),
      status: product.getStatus(),
    };
  }
}
