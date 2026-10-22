import { Product } from "@/domain/entities/product.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { ProductImage } from "@/domain/value-objects/product-image.vo";
import {
  InsufficientStockException,
  InvalidDeductQuantityException,
  InvalidPreparationTimeException,
  InvalidReorderProductImageException,
  InvalidRestockQuantityException,
  InvalidStockQuantityException,
  ProductImageNotFoundException,
  ProductWithoutImageException,
} from "@/domain/exceptions/product.exceptions";
import { ProductCreationData, ProductRebuildData, ProductStatus, ProductType } from "@/domain/types/product.type";

jest.mock("@/domain/value-objects/product-image.vo", () => ({
  ProductImage: {
    create: jest.fn().mockImplementation((data) => ({
      getProductId: () => data.productId,
      getUrl: () => data.url,
      getAltText: () => data.altText,
      getSortOrder: () => data.sortOrder,
      isPrimaryImage: () => data.isPrimary,
      changeUrl: jest.fn().mockImplementation(function (this: object, newUrl: string) {
        return { ...this, getUrl: () => newUrl };
      }),
      changeAltText: jest.fn().mockImplementation(function (this: object, newAltText: string) {
        return { ...this, getAltText: () => newAltText };
      }),
      changeSortOrder: jest.fn().mockImplementation(function (this: object, newSortOrder: number) {
        return { ...this, getSortOrder: () => newSortOrder };
      }),
      makePrimary: jest.fn().mockImplementation(function (this: object) {
        return { ...this, isPrimaryImage: () => true };
      }),
    })),
    rebuild: jest.fn().mockImplementation((data) => ({
      getProductId: () => data.productId,
      getUrl: () => data.url,
      getAltText: () => data.altText,
      getSortOrder: () => data.sortOrder,
      isPrimaryImage: () => data.isPrimary,
      changeUrl: jest.fn().mockImplementation(function (this: object, newUrl: string) {
        return { ...this, getUrl: () => newUrl };
      }),
      changeAltText: jest.fn().mockImplementation(function (this: object, newAltText: string) {
        return { ...this, getAltText: () => newAltText };
      }),
      changeSortOrder: jest.fn().mockImplementation(function (this: object, newSortOrder: number) {
        return { ...this, getSortOrder: () => newSortOrder };
      }),
      makePrimary: jest.fn().mockImplementation(function (this: object) {
        return { ...this, isPrimaryImage: () => true };
      }),
    })),
  },
}));

describe("Product", () => {
  const mockId = "prod-123";
  const mockCategoryId = "cat-456";
  const mockName = "Test Product";
  const mockDescription = "Test Description";
  const mockPrice = 50000;
  const mockType = ProductType.FOOD;
  const mockIngredients = "Ingredient 1, Ingredient 2";
  const mockPreparationTime = 15;
  const mockStockQuantity = 100;
  const mockStatus = ProductStatus.AVAILABLE;
  const mockCreatedAt = new Date("2024-01-01T00:00:00Z");
  const mockUpdatedAt = new Date("2024-01-01T00:00:00Z");

  const mockImages: ProductImage[] = [
    {
      getProductId: jest.fn().mockReturnValue(mockId),
      getUrl: jest.fn().mockReturnValue("https://example.com/image1.jpg"),
      getAltText: jest.fn().mockReturnValue("Image 1"),
      getSortOrder: jest.fn().mockReturnValue(1),
      isPrimaryImage: jest.fn().mockReturnValue(true),
      changeUrl: jest.fn().mockReturnThis(),
      changeAltText: jest.fn().mockReturnThis(),
      changeSortOrder: jest.fn().mockReturnThis(),
      makePrimary: jest.fn().mockReturnThis(),
    } as unknown as ProductImage,
    {
      getProductId: jest.fn().mockReturnValue(mockId),
      getUrl: jest.fn().mockReturnValue("https://example.com/image2.jpg"),
      getAltText: jest.fn().mockReturnValue("Image 2"),
      getSortOrder: jest.fn().mockReturnValue(2),
      isPrimaryImage: jest.fn().mockReturnValue(false),
      changeUrl: jest.fn().mockReturnThis(),
      changeAltText: jest.fn().mockReturnThis(),
      changeSortOrder: jest.fn().mockReturnThis(),
      makePrimary: jest.fn().mockReturnThis(),
    } as unknown as ProductImage,
  ];

  let product: Product;

  beforeEach(() => {
    jest.clearAllMocks();

    product = new Product(
      mockId,
      mockCategoryId,
      mockName,
      mockDescription,
      new Money(mockPrice),
      mockType,
      mockIngredients,
      mockPreparationTime,
      [...mockImages],
      mockStockQuantity,
      mockStatus,
      mockCreatedAt,
      mockUpdatedAt,
    );
  });

  describe("constructor and getters", () => {
    it("should create a Product instance with all properties", () => {
      expect(product.getId()).toBe(mockId);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getName()).toBe(mockName);
      expect(product.getDescription()).toBe(mockDescription);
      expect(product.getPrice()).toBeInstanceOf(Money);
      expect(product.getType()).toBe(mockType);
      expect(product.getIngredients()).toBe(mockIngredients);
      expect(product.getPreparationTimeInMinutes()).toBe(mockPreparationTime);
      expect(product.getImages()).toHaveLength(2);
      expect(product.getStockQuantity()).toBe(mockStockQuantity);
      expect(product.getStatus()).toBe(mockStatus);
      expect(product.getCreatedAt()).toEqual(mockCreatedAt);
      expect(product.getUpdatedAt()).toEqual(mockUpdatedAt);
    });

    it("should handle null description", () => {
      const productWithNullDesc = new Product(
        mockId,
        mockCategoryId,
        mockName,
        null,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        0,
        ProductStatus.UPCOMING,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(productWithNullDesc.getDescription()).toBeNull();
    });

    it("should handle null ingredients", () => {
      const productWithNullIngredients = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        null,
        mockPreparationTime,
        [],
        0,
        ProductStatus.UPCOMING,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(productWithNullIngredients.getIngredients()).toBeNull();
    });

    it("should handle null preparation time", () => {
      const productWithNullPrepTime = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        null,
        [],
        0,
        ProductStatus.UPCOMING,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(productWithNullPrepTime.getPreparationTimeInMinutes()).toBeNull();
    });

    it("should return sorted images by sortOrder", () => {
      const unsortedImages = [
        { getSortOrder: jest.fn().mockReturnValue(3) } as unknown as ProductImage,
        { getSortOrder: jest.fn().mockReturnValue(1) } as unknown as ProductImage,
        { getSortOrder: jest.fn().mockReturnValue(2) } as unknown as ProductImage,
      ];

      const productWithUnsortedImages = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        unsortedImages,
        mockStockQuantity,
        mockStatus,
        mockCreatedAt,
        mockUpdatedAt,
      );

      const sortedImages = productWithUnsortedImages.getImages();
      expect(sortedImages[0].getSortOrder()).toBe(1);
      expect(sortedImages[1].getSortOrder()).toBe(2);
      expect(sortedImages[2].getSortOrder()).toBe(3);
    });

    it("should return a new array for images", () => {
      const images = product.getImages();
      expect(images).not.toBe(mockImages);
      expect(images).toEqual(mockImages);
    });

    it("should return new Date instances from getCreatedAt and getUpdatedAt", () => {
      const createdAt = product.getCreatedAt();
      const updatedAt = product.getUpdatedAt();
      expect(createdAt).toEqual(mockCreatedAt);
      expect(createdAt).not.toBe(mockCreatedAt);
      expect(updatedAt).toEqual(mockUpdatedAt);
      expect(updatedAt).not.toBe(mockUpdatedAt);
    });
  });

  describe("canOrder", () => {
    it("should return true when status is AVAILABLE and stock >= quantity", () => {
      const availableProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(availableProduct.canOrder(5)).toBe(true);
      expect(availableProduct.canOrder(10)).toBe(true);
    });

    it("should return false when status is AVAILABLE but stock < quantity", () => {
      const availableProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        5,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(availableProduct.canOrder(10)).toBe(false);
    });

    it("should return false when stock = 0", () => {
      const availableProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        0,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(availableProduct.canOrder()).toBe(false);
    });

    it("should return false when status is not AVAILABLE even with stock > 0", () => {
      const statuses = [ProductStatus.UPCOMING, ProductStatus.UNAVAILABLE, ProductStatus.DISCONTINUED, ProductStatus.OUT_OF_STOCK];

      for (const status of statuses) {
        const productWithStatus = new Product(
          mockId,
          mockCategoryId,
          mockName,
          mockDescription,
          new Money(mockPrice),
          mockType,
          mockIngredients,
          mockPreparationTime,
          [],
          10,
          status,
          mockCreatedAt,
          mockUpdatedAt,
        );
        expect(productWithStatus.canOrder()).toBe(false);
      }
    });

    it("should default quantity to 1 when not provided", () => {
      const availableProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        1,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(availableProduct.canOrder()).toBe(true);
    });
  });

  describe("hasImage", () => {
    it("should return true when image exists", () => {
      expect(product.hasImage("https://example.com/image1.jpg")).toBe(true);
      expect(product.hasImage("https://example.com/image2.jpg")).toBe(true);
    });

    it("should return false when image does not exist", () => {
      expect(product.hasImage("https://example.com/nonexistent.jpg")).toBe(false);
    });

    it("should return false for empty images array", () => {
      const productWithoutImages = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(productWithoutImages.hasImage("https://example.com/image.jpg")).toBe(false);
    });
  });

  describe("requiresPreparation", () => {
    it("should return true for FOOD type", () => {
      const product = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        ProductType.FOOD,
        mockIngredients,
        mockPreparationTime,
        [],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(product.requiresPreparation()).toBe(true);
    });

    it("should return true for DRINK type", () => {
      const product = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        ProductType.DRINK,
        mockIngredients,
        mockPreparationTime,
        [],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(product.requiresPreparation()).toBe(true);
    });

    it("should return false for PACKAGED type", () => {
      const product = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        ProductType.PACKAGED,
        mockIngredients,
        mockPreparationTime,
        [],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );
      expect(product.requiresPreparation()).toBe(false);
    });
  });

  describe("rename", () => {
    it("should update the name and touch updatedAt", async () => {
      const newName = "Updated Product Name";
      const oldUpdatedAt = product.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));
      product.rename(newName);

      expect(product.getName()).toBe(newName);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
      expect(product.getUpdatedAt().getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });

    it("should preserve other properties when renaming", () => {
      product.rename("New Name");

      expect(product.getId()).toBe(mockId);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getDescription()).toBe(mockDescription);
      expect(product.getPrice()).toBeInstanceOf(Money);
      expect(product.getType()).toBe(mockType);
      expect(product.getStockQuantity()).toBe(mockStockQuantity);
      expect(product.getStatus()).toBe(mockStatus);
    });
  });

  describe("changeCategory", () => {
    it("should update the categoryId and touch updatedAt", async () => {
      const newCategoryId = "new-cat-789";
      const oldUpdatedAt = product.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));
      product.changeCategory(newCategoryId);

      expect(product.getCategoryId()).toBe(newCategoryId);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should preserve other properties when changing category", () => {
      product.changeCategory("new-cat-789");

      expect(product.getId()).toBe(mockId);
      expect(product.getName()).toBe(mockName);
      expect(product.getDescription()).toBe(mockDescription);
      expect(product.getPrice()).toBeInstanceOf(Money);
      expect(product.getType()).toBe(mockType);
      expect(product.getStockQuantity()).toBe(mockStockQuantity);
    });
  });

  describe("changePrice", () => {
    it("should update the price and touch updatedAt", async () => {
      const newPrice = 40000;
      const oldUpdatedAt = product.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));
      product.changePrice(newPrice);

      expect(product.getPrice().getAmount()).toBe(newPrice);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should create a new Money instance", () => {
      const originalPrice = product.getPrice();
      product.changePrice(10000);
      expect(product.getPrice()).not.toBe(originalPrice);
    });

    it("should handle zero price", () => {
      const newPrice = 0;
      product.changePrice(newPrice);
      expect(product.getPrice().getAmount()).toBe(0);
    });

    it("should handle negative price", () => {
      expect(() => product.changePrice(-1000)).toThrow();
    });

    it("should preserve other properties when changing price", () => {
      product.changePrice(40000);

      expect(product.getId()).toBe(mockId);
      expect(product.getName()).toBe(mockName);
      expect(product.getDescription()).toBe(mockDescription);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getType()).toBe(mockType);
      expect(product.getStockQuantity()).toBe(mockStockQuantity);
    });
  });

  describe("changeDescription", () => {
    it("should update description and touch updatedAt", async () => {
      const newDescription = "Updated description";
      const oldUpdatedAt = product.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));
      product.changeDescription(newDescription);

      expect(product.getDescription()).toBe(newDescription);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should set description to null", () => {
      product.changeDescription(null);
      expect(product.getDescription()).toBeNull();
    });

    it("should preserve other properties when changing description", () => {
      product.changeDescription("New description");

      expect(product.getId()).toBe(mockId);
      expect(product.getName()).toBe(mockName);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getPrice()).toBeInstanceOf(Money);
      expect(product.getType()).toBe(mockType);
    });
  });

  describe("changeType", () => {
    it("should update type and touch updatedAt", async () => {
      const newType = ProductType.DRINK;
      const oldUpdatedAt = product.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));
      product.changeType(newType);

      expect(product.getType()).toBe(newType);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should preserve other properties when changing type", () => {
      product.changeType(ProductType.PACKAGED);

      expect(product.getId()).toBe(mockId);
      expect(product.getName()).toBe(mockName);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getDescription()).toBe(mockDescription);
      expect(product.getPrice()).toBeInstanceOf(Money);
      expect(product.getStockQuantity()).toBe(mockStockQuantity);
    });
  });

  describe("changeIngredients", () => {
    it("should update ingredients and touch updatedAt", async () => {
      const newIngredients = "New ingredient 1, New ingredient 2";
      const oldUpdatedAt = product.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));
      product.changeIngredients(newIngredients);

      expect(product.getIngredients()).toBe(newIngredients);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should set ingredients to null", () => {
      product.changeIngredients(null);
      expect(product.getIngredients()).toBeNull();
    });

    it("should preserve other properties when changing ingredients", () => {
      product.changeIngredients("New ingredients");

      expect(product.getId()).toBe(mockId);
      expect(product.getName()).toBe(mockName);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getDescription()).toBe(mockDescription);
      expect(product.getPrice()).toBeInstanceOf(Money);
      expect(product.getType()).toBe(mockType);
    });
  });

  describe("changePreparationTime", () => {
    it("should update preparation time and touch updatedAt", async () => {
      const newPrepTime = 30;
      const oldUpdatedAt = product.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));
      product.changePreparationTime(newPrepTime);

      expect(product.getPreparationTimeInMinutes()).toBe(newPrepTime);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should set preparation time to null", () => {
      product.changePreparationTime(null);
      expect(product.getPreparationTimeInMinutes()).toBeNull();
    });

    it("should throw InvalidPreparationTimeException when minutes <= 0", () => {
      expect(() => product.changePreparationTime(0)).toThrow(InvalidPreparationTimeException);
      expect(() => product.changePreparationTime(-5)).toThrow(InvalidPreparationTimeException);
      expect(() => product.changePreparationTime(-0.1)).toThrow(InvalidPreparationTimeException);
    });

    it("should allow decimal preparation time", () => {
      product.changePreparationTime(2.5);
      expect(product.getPreparationTimeInMinutes()).toBe(2.5);
    });

    it("should preserve other properties when changing preparation time", () => {
      product.changePreparationTime(45);

      expect(product.getId()).toBe(mockId);
      expect(product.getName()).toBe(mockName);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getDescription()).toBe(mockDescription);
      expect(product.getPrice()).toBeInstanceOf(Money);
      expect(product.getType()).toBe(mockType);
    });
  });

  describe("setStock", () => {
    it("should update stock quantity", () => {
      product.setStock(200);
      expect(product.getStockQuantity()).toBe(200);
    });

    it("should update status to OUT_OF_STOCK when stock is 0 and status is AVAILABLE", () => {
      const availableProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      availableProduct.setStock(0);
      expect(availableProduct.getStockQuantity()).toBe(0);
      expect(availableProduct.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);
    });

    it("should update status to AVAILABLE when stock > 0 and status is OUT_OF_STOCK", () => {
      const outOfStockProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        0,
        ProductStatus.OUT_OF_STOCK,
        mockCreatedAt,
        mockUpdatedAt,
      );

      outOfStockProduct.setStock(50);
      expect(outOfStockProduct.getStockQuantity()).toBe(50);
      expect(outOfStockProduct.getStatus()).toBe(ProductStatus.AVAILABLE);
    });

    it("should not change status when stock > 0 and status is not OUT_OF_STOCK", () => {
      const initialStatus = product.getStatus();
      product.setStock(200);
      expect(product.getStockQuantity()).toBe(200);
      expect(product.getStatus()).toBe(initialStatus);
    });

    it("should not change status when stock is 0 and status is not AVAILABLE", () => {
      const unavailableProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        5,
        ProductStatus.UNAVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      unavailableProduct.setStock(0);
      expect(unavailableProduct.getStockQuantity()).toBe(0);
      expect(unavailableProduct.getStatus()).toBe(ProductStatus.UNAVAILABLE);
    });

    it("should throw InvalidStockQuantityException when quantity is negative", () => {
      expect(() => product.setStock(-1)).toThrow(InvalidStockQuantityException);
      expect(() => product.setStock(-100)).toThrow(InvalidStockQuantityException);
    });

    it("should touch updatedAt", async () => {
      const oldUpdatedAt = product.getUpdatedAt();
      await new Promise((resolve) => setTimeout(resolve, 1));
      product.setStock(150);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });
  });

  describe("setStatus", () => {
    it("should update status and touch updatedAt", async () => {
      const oldUpdatedAt = product.getUpdatedAt();
      await new Promise((resolve) => setTimeout(resolve, 1));
      product.setStatus(ProductStatus.UNAVAILABLE);

      expect(product.getStatus()).toBe(ProductStatus.UNAVAILABLE);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should handle all status transitions", () => {
      const statuses = [ProductStatus.UPCOMING, ProductStatus.AVAILABLE, ProductStatus.UNAVAILABLE, ProductStatus.DISCONTINUED];

      for (const status of statuses) {
        product.setStatus(status);
        expect(product.getStatus()).toBe(status);
      }
    });

    it("should handle OUT_OF_STOCK status correctly", () => {
      const zeroStockProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        0,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      zeroStockProduct.setStatus(ProductStatus.OUT_OF_STOCK);
      expect(zeroStockProduct.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);

      product.setStatus(ProductStatus.OUT_OF_STOCK);
      expect(product.getStatus()).toBe(ProductStatus.UNAVAILABLE);
    });

    it("should not set OUT_OF_STOCK when stock is not 0", () => {
      product.setStatus(ProductStatus.OUT_OF_STOCK);
      expect(product.getStatus()).toBe(ProductStatus.UNAVAILABLE);
    });

    it("should set OUT_OF_STOCK when stock is 0", () => {
      const zeroStockProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        0,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      zeroStockProduct.setStatus(ProductStatus.OUT_OF_STOCK);
      expect(zeroStockProduct.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);
    });

    it("should preserve other properties when setting status", () => {
      product.setStatus(ProductStatus.DISCONTINUED);

      expect(product.getId()).toBe(mockId);
      expect(product.getName()).toBe(mockName);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getDescription()).toBe(mockDescription);
      expect(product.getPrice()).toBeInstanceOf(Money);
      expect(product.getStockQuantity()).toBe(mockStockQuantity);
    });
  });

  describe("restock", () => {
    it("should increase stock quantity", () => {
      const initialStock = product.getStockQuantity();
      product.restock(50);
      expect(product.getStockQuantity()).toBe(initialStock + 50);
    });

    it("should update status to AVAILABLE when stock becomes > 0 and status was OUT_OF_STOCK", () => {
      const outOfStockProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        0,
        ProductStatus.OUT_OF_STOCK,
        mockCreatedAt,
        mockUpdatedAt,
      );

      outOfStockProduct.restock(10);
      expect(outOfStockProduct.getStockQuantity()).toBe(10);
      expect(outOfStockProduct.getStatus()).toBe(ProductStatus.AVAILABLE);
    });

    it("should not change status when stock becomes > 0 and status is not OUT_OF_STOCK", () => {
      const initialStatus = product.getStatus();
      product.restock(50);
      expect(product.getStatus()).toBe(initialStatus);
    });

    it("should not change status when stock remains 0", () => {
      const zeroStockProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        0,
        ProductStatus.OUT_OF_STOCK,
        mockCreatedAt,
        mockUpdatedAt,
      );

      zeroStockProduct.restock(0);
      expect(zeroStockProduct.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);
    });

    it("should throw InvalidRestockQuantityException when quantity is negative", () => {
      expect(() => product.restock(-1)).toThrow(InvalidRestockQuantityException);
      expect(() => product.restock(-100)).toThrow(InvalidRestockQuantityException);
    });

    it("should handle restock with zero quantity", () => {
      const initialStock = product.getStockQuantity();
      product.restock(0);
      expect(product.getStockQuantity()).toBe(initialStock);
    });

    it("should touch updatedAt", async () => {
      const oldUpdatedAt = product.getUpdatedAt();
      await new Promise((resolve) => setTimeout(resolve, 1));
      product.restock(25);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });
  });

  describe("deductStock", () => {
    it("should decrease stock quantity", () => {
      const initialStock = product.getStockQuantity();
      product.deductStock(30);
      expect(product.getStockQuantity()).toBe(initialStock - 30);
    });

    it("should update status to OUT_OF_STOCK when stock reaches 0 and status is AVAILABLE", () => {
      const availableProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        100,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      availableProduct.deductStock(100);
      expect(availableProduct.getStockQuantity()).toBe(0);
      expect(availableProduct.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);
    });

    it("should not change status when stock reaches 0 but status is not AVAILABLE", () => {
      const unavailableProduct = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        10,
        ProductStatus.UNAVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      unavailableProduct.deductStock(10);
      expect(unavailableProduct.getStockQuantity()).toBe(0);
      expect(unavailableProduct.getStatus()).toBe(ProductStatus.UNAVAILABLE);
    });

    it("should not change status when stock remains > 0", () => {
      const initialStatus = product.getStatus();
      product.deductStock(50);
      expect(product.getStockQuantity()).toBe(50);
      expect(product.getStatus()).toBe(initialStatus);
    });

    it("should throw InvalidDeductQuantityException when quantity is negative", () => {
      expect(() => product.deductStock(-1)).toThrow(InvalidDeductQuantityException);
      expect(() => product.deductStock(-50)).toThrow(InvalidDeductQuantityException);
    });

    it("should throw InsufficientStockException when quantity exceeds stock", () => {
      expect(() => product.deductStock(200)).toThrow(InsufficientStockException);
      expect(() => product.deductStock(product.getStockQuantity() + 1)).toThrow(InsufficientStockException);
    });

    it("should handle deducting exact stock amount", () => {
      const exactStock = product.getStockQuantity();
      product.deductStock(exactStock);
      expect(product.getStockQuantity()).toBe(0);
      expect(product.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);
    });

    it("should touch updatedAt", async () => {
      const oldUpdatedAt = product.getUpdatedAt();
      await new Promise((resolve) => setTimeout(resolve, 1));
      product.deductStock(10);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });
  });

  describe("addImage", () => {
    it("should add a new image to the product", () => {
      const initialImageCount = product.getImages().length;
      const newImageUrl = "https://example.com/new-image.jpg";

      product.addImage(newImageUrl);

      const images = product.getImages();
      expect(images).toHaveLength(initialImageCount + 1);
      expect(images[images.length - 1].getUrl()).toBe(newImageUrl);
    });

    it("should create image with correct productId", () => {
      const spy = jest.spyOn(ProductImage, "create");

      const newImageUrl = "https://example.com/new-image.jpg";
      product.addImage(newImageUrl);

      expect(spy).toHaveBeenCalledWith({
        productId: mockId,
        url: newImageUrl,
        altText: `${mockName} image ${mockImages.length + 1}`,
        isPrimary: false,
        sortOrder: mockImages.length + 1,
      });
    });

    it("should set first image as primary when adding first image", () => {
      const productWithoutImages = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      const newImageUrl = "https://example.com/first-image.jpg";
      productWithoutImages.addImage(newImageUrl);

      expect(ProductImage.create).toHaveBeenCalledWith({
        productId: mockId,
        url: newImageUrl,
        altText: expect.any(String),
        isPrimary: true,
        sortOrder: 1,
      });
    });

    it("should set subsequent images as not primary", () => {
      const newImageUrl = "https://example.com/new-image.jpg";
      product.addImage(newImageUrl);

      expect(ProductImage.create).toHaveBeenCalledWith({
        productId: mockId,
        url: newImageUrl,
        altText: expect.any(String),
        isPrimary: false,
        sortOrder: expect.any(Number),
      });
    });

    it("should generate correct alt text", () => {
      const initialCount = product.getImages().length;
      const newImageUrl = "https://example.com/new-image.jpg";
      product.addImage(newImageUrl);

      expect(ProductImage.create).toHaveBeenCalledWith({
        productId: mockId,
        url: newImageUrl,
        altText: `${mockName} image ${initialCount + 1}`,
        isPrimary: false,
        sortOrder: initialCount + 1,
      });
    });

    it("should touch updatedAt", async () => {
      const oldUpdatedAt = product.getUpdatedAt();
      await new Promise((resolve) => setTimeout(resolve, 1));
      product.addImage("https://example.com/new-image.jpg");
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });
  });

  describe("removeImage", () => {
    it("should remove an existing image", () => {
      const initialCount = product.getImages().length;
      const imageUrl = "https://example.com/image2.jpg";

      product.removeImage(imageUrl);

      expect(product.getImages()).toHaveLength(initialCount - 1);
      expect(product.hasImage(imageUrl)).toBe(false);
    });

    it("should make the first remaining image primary when removing primary", () => {
      const mockImage1 = {
        getUrl: jest.fn().mockReturnValue("https://example.com/image1.jpg"),
        isPrimaryImage: jest.fn().mockReturnValue(true),
        getSortOrder: jest.fn().mockReturnValue(1),
        makePrimary: jest.fn().mockReturnThis(),
      } as unknown as ProductImage;

      const mockImage2 = {
        getUrl: jest.fn().mockReturnValue("https://example.com/image2.jpg"),
        isPrimaryImage: jest.fn().mockReturnValue(false),
        getSortOrder: jest.fn().mockReturnValue(2),
        makePrimary: jest.fn().mockReturnThis(),
      } as unknown as ProductImage;

      const productWithMockImages = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [mockImage1, mockImage2],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      productWithMockImages.removeImage("https://example.com/image1.jpg");

      expect(mockImage2.makePrimary).toHaveBeenCalled();
    });

    it("should not make remaining image primary when removing non-primary", () => {
      const mockImage1 = {
        getUrl: jest.fn().mockReturnValue("https://example.com/image1.jpg"),
        isPrimaryImage: jest.fn().mockReturnValue(true),
        getSortOrder: jest.fn().mockReturnValue(1),
        makePrimary: jest.fn().mockReturnThis(),
      } as unknown as ProductImage;

      const mockImage2 = {
        getUrl: jest.fn().mockReturnValue("https://example.com/image2.jpg"),
        isPrimaryImage: jest.fn().mockReturnValue(false),
        getSortOrder: jest.fn().mockReturnValue(2),
        makePrimary: jest.fn().mockReturnThis(),
      } as unknown as ProductImage;

      const productWithMockImages = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [mockImage1, mockImage2],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      productWithMockImages.removeImage("https://example.com/image2.jpg");

      expect(mockImage1.makePrimary).not.toHaveBeenCalled();
    });

    it("should throw ProductWithoutImageException when trying to remove last image", () => {
      const productWithOneImage = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [mockImages[0]],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(() => productWithOneImage.removeImage("https://example.com/image1.jpg")).toThrow(ProductWithoutImageException);
    });

    it("should throw ProductImageNotFoundException when image does not exist", () => {
      expect(() => product.removeImage("https://example.com/nonexistent.jpg")).toThrow(ProductImageNotFoundException);
    });

    it("should touch updatedAt", async () => {
      const oldUpdatedAt = product.getUpdatedAt();
      await new Promise((resolve) => setTimeout(resolve, 1));
      product.removeImage("https://example.com/image2.jpg");
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });
  });

  describe("replaceImage", () => {
    it("should replace an existing image URL", () => {
      const realImage1 = ProductImage.create({
        productId: mockId,
        url: "https://example.com/image1.jpg",
        altText: "Image 1",
        isPrimary: true,
        sortOrder: 1,
      });

      const realImage2 = ProductImage.create({
        productId: mockId,
        url: "https://example.com/image2.jpg",
        altText: "Image 2",
        isPrimary: false,
        sortOrder: 2,
      });

      const productWithRealImages = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [realImage1, realImage2],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      const oldUrl = "https://example.com/image1.jpg";
      const newUrl = "https://example.com/replaced-image.jpg";

      productWithRealImages.replaceImage({ oldUrl, newUrl });

      expect(productWithRealImages.hasImage(newUrl)).toBe(true);
      expect(productWithRealImages.hasImage(oldUrl)).toBe(false);
    });

    it("should throw ProductImageNotFoundException when old URL does not exist", () => {
      expect(() =>
        product.replaceImage({
          oldUrl: "https://example.com/nonexistent.jpg",
          newUrl: "https://example.com/new.jpg",
        }),
      ).toThrow(ProductImageNotFoundException);
    });

    it("should touch updatedAt", async () => {
      const oldUpdatedAt = product.getUpdatedAt();
      await new Promise((resolve) => setTimeout(resolve, 1));
      product.replaceImage({
        oldUrl: "https://example.com/image1.jpg",
        newUrl: "https://example.com/replaced.jpg",
      });
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should preserve other image properties when replacing", () => {
      const productWithRealImages = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [
          ProductImage.create({
            productId: mockId,
            url: "https://example.com/image1.jpg",
            altText: "Image 1",
            isPrimary: true,
            sortOrder: 1,
          }),
        ],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      const oldUrl = "https://example.com/image1.jpg";
      const newUrl = "https://example.com/replaced.jpg";

      productWithRealImages.replaceImage({ oldUrl, newUrl });
      const image = productWithRealImages.getImages()[0];

      expect(image.getUrl()).toBe(newUrl);
      expect(image.getAltText()).toBe("Image 1");
      expect(image.isPrimaryImage()).toBe(true);
      expect(image.getSortOrder()).toBe(1);
    });
  });

  describe("reorderImages", () => {
    it("should reorder images according to provided URLs", () => {
      const realImage1 = ProductImage.create({
        productId: mockId,
        url: "https://example.com/image1.jpg",
        altText: "Image 1",
        isPrimary: true,
        sortOrder: 1,
      });

      const realImage2 = ProductImage.create({
        productId: mockId,
        url: "https://example.com/image2.jpg",
        altText: "Image 2",
        isPrimary: false,
        sortOrder: 2,
      });

      const productWithRealImages = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        [realImage1, realImage2],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      const orderedUrls = ["https://example.com/image2.jpg", "https://example.com/image1.jpg"];

      productWithRealImages.reorderImages(orderedUrls);

      const images = productWithRealImages.getImages();
      expect(images[0].getUrl()).toBe("https://example.com/image2.jpg");
      expect(images[0].getSortOrder()).toBe(1);
      expect(images[1].getUrl()).toBe("https://example.com/image1.jpg");
      expect(images[1].getSortOrder()).toBe(2);
    });

    it("should throw InvalidReorderProductImageException when URLs count does not match images count", () => {
      const orderedUrls = ["https://example.com/image1.jpg"];

      expect(() => product.reorderImages(orderedUrls)).toThrow(InvalidReorderProductImageException);
    });

    it("should throw ProductImageNotFoundException when a URL is not found", () => {
      const orderedUrls = ["https://example.com/image1.jpg", "https://example.com/nonexistent.jpg"];

      expect(() => product.reorderImages(orderedUrls)).toThrow(ProductImageNotFoundException);
    });

    it("should update sortOrder for all images", () => {
      const orderedUrls = ["https://example.com/image2.jpg", "https://example.com/image1.jpg"];

      product.reorderImages(orderedUrls);

      const images = product.getImages();
      expect(images[0].getSortOrder()).toBe(1);
      expect(images[1].getSortOrder()).toBe(2);
    });

    it("should touch updatedAt", async () => {
      const oldUpdatedAt = product.getUpdatedAt();
      await new Promise((resolve) => setTimeout(resolve, 1));
      product.reorderImages(["https://example.com/image2.jpg", "https://example.com/image1.jpg"]);
      expect(product.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });
  });

  describe("static create", () => {
    it("should create a Product with all provided data", () => {
      const creationData: ProductCreationData = {
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        description: mockDescription,
        price: mockPrice,
        type: mockType,
        ingredients: mockIngredients,
        preparationTimeInMinutes: mockPreparationTime,
        imageUrls: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
        stockQuantity: mockStockQuantity,
        status: mockStatus,
      };

      const productInstance = Product.create(creationData);

      expect(productInstance.getId()).toBe(mockId);
      expect(productInstance.getCategoryId()).toBe(mockCategoryId);
      expect(productInstance.getName()).toBe(mockName);
      expect(productInstance.getDescription()).toBe(mockDescription);
      expect(productInstance.getPrice().getAmount()).toBe(mockPrice);
      expect(productInstance.getType()).toBe(mockType);
      expect(productInstance.getIngredients()).toBe(mockIngredients);
      expect(productInstance.getPreparationTimeInMinutes()).toBe(mockPreparationTime);
      expect(productInstance.getImages()).toHaveLength(2);
      expect(productInstance.getStockQuantity()).toBe(mockStockQuantity);
      expect(productInstance.getStatus()).toBe(mockStatus);
      expect(productInstance.getCreatedAt()).toBeInstanceOf(Date);
      expect(productInstance.getUpdatedAt()).toBeInstanceOf(Date);
    });

    it("should create a Product with default values when optional fields are omitted", () => {
      const creationData: ProductCreationData = {
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        price: mockPrice,
        type: mockType,
        imageUrls: [],
      };

      const productInstance = Product.create(creationData);

      expect(productInstance.getDescription()).toBeNull();
      expect(productInstance.getIngredients()).toBeNull();
      expect(productInstance.getPreparationTimeInMinutes()).toBeNull();
      expect(productInstance.getStockQuantity()).toBe(0);
      expect(productInstance.getStatus()).toBe(ProductStatus.UPCOMING);
    });

    it("should create images with correct properties", () => {
      const imageUrls = ["https://example.com/img1.jpg", "https://example.com/img2.jpg"];
      const creationData: ProductCreationData = {
        id: mockId,
        categoryId: mockCategoryId,
        name: "Test Product",
        price: mockPrice,
        type: mockType,
        imageUrls,
      };

      const productInstance = Product.create(creationData);
      const images = productInstance.getImages();

      expect(images).toHaveLength(2);
      expect(ProductImage.create).toHaveBeenCalledTimes(2);
      expect(ProductImage.create).toHaveBeenCalledWith({
        productId: mockId,
        url: imageUrls[0],
        altText: "Test Product image 1",
        isPrimary: true,
        sortOrder: 1,
      });
      expect(ProductImage.create).toHaveBeenCalledWith({
        productId: mockId,
        url: imageUrls[1],
        altText: "Test Product image 2",
        isPrimary: false,
        sortOrder: 2,
      });
    });

    it("should create Product with status set to UPCOMING when not provided", () => {
      const creationData: ProductCreationData = {
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        price: mockPrice,
        type: mockType,
        imageUrls: [],
      };

      const productInstance = Product.create(creationData);
      expect(productInstance.getStatus()).toBe(ProductStatus.UPCOMING);
    });

    it("should create Product with stockQuantity 0 when not provided", () => {
      const creationData: ProductCreationData = {
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        price: mockPrice,
        type: mockType,
        imageUrls: [],
      };

      const productInstance = Product.create(creationData);
      expect(productInstance.getStockQuantity()).toBe(0);
    });
  });

  describe("static rebuild", () => {
    it("should rebuild a Product from rebuild data", () => {
      const rebuildData: ProductRebuildData = {
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        description: mockDescription,
        price: mockPrice,
        type: mockType,
        ingredients: mockIngredients,
        preparationTimeInMinutes: mockPreparationTime,
        images: [
          {
            productId: mockId,
            url: "https://example.com/image1.jpg",
            altText: "Image 1",
            isPrimary: true,
            sortOrder: 1,
          },
          {
            productId: mockId,
            url: "https://example.com/image2.jpg",
            altText: "Image 2",
            isPrimary: false,
            sortOrder: 2,
          },
        ],
        stockQuantity: mockStockQuantity,
        status: mockStatus,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const productInstance = Product.rebuild(rebuildData);

      expect(productInstance.getId()).toBe(mockId);
      expect(productInstance.getCategoryId()).toBe(mockCategoryId);
      expect(productInstance.getName()).toBe(mockName);
      expect(productInstance.getDescription()).toBe(mockDescription);
      expect(productInstance.getPrice().getAmount()).toBe(mockPrice);
      expect(productInstance.getType()).toBe(mockType);
      expect(productInstance.getIngredients()).toBe(mockIngredients);
      expect(productInstance.getPreparationTimeInMinutes()).toBe(mockPreparationTime);
      expect(productInstance.getImages()).toHaveLength(2);
      expect(productInstance.getImages()[0].getUrl()).toBe("https://example.com/image1.jpg");
      expect(productInstance.getImages()[1].getUrl()).toBe("https://example.com/image2.jpg");
      expect(productInstance.getStockQuantity()).toBe(mockStockQuantity);
      expect(productInstance.getStatus()).toBe(mockStatus);
      expect(productInstance.getCreatedAt()).toEqual(mockCreatedAt);
      expect(productInstance.getUpdatedAt()).toEqual(mockUpdatedAt);
    });

    it("should handle null values in rebuild data", () => {
      const rebuildData: ProductRebuildData = {
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        description: null,
        price: mockPrice,
        type: mockType,
        ingredients: null,
        preparationTimeInMinutes: null,
        images: [],
        stockQuantity: 0,
        status: ProductStatus.UPCOMING,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const productInstance = Product.rebuild(rebuildData);

      expect(productInstance.getDescription()).toBeNull();
      expect(productInstance.getIngredients()).toBeNull();
      expect(productInstance.getPreparationTimeInMinutes()).toBeNull();
    });

    it("should sort images by sortOrder during rebuild", () => {
      const rebuildData: ProductRebuildData = {
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        description: mockDescription,
        price: mockPrice,
        type: mockType,
        ingredients: mockIngredients,
        preparationTimeInMinutes: mockPreparationTime,
        images: [
          {
            productId: mockId,
            url: "https://example.com/image3.jpg",
            altText: "Image 3",
            isPrimary: false,
            sortOrder: 3,
          },
          {
            productId: mockId,
            url: "https://example.com/image1.jpg",
            altText: "Image 1",
            isPrimary: true,
            sortOrder: 1,
          },
          {
            productId: mockId,
            url: "https://example.com/image2.jpg",
            altText: "Image 2",
            isPrimary: false,
            sortOrder: 2,
          },
        ],
        stockQuantity: mockStockQuantity,
        status: mockStatus,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const productInstance = Product.rebuild(rebuildData);
      const images = productInstance.getImages();

      expect(images[0].getSortOrder()).toBe(1);
      expect(images[1].getSortOrder()).toBe(2);
      expect(images[2].getSortOrder()).toBe(3);
    });

    it("should preserve the exact Date instances when rebuilding", () => {
      const rebuildData: ProductRebuildData = {
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        description: mockDescription,
        price: mockPrice,
        type: mockType,
        ingredients: mockIngredients,
        preparationTimeInMinutes: mockPreparationTime,
        images: [],
        stockQuantity: mockStockQuantity,
        status: mockStatus,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const productInstance = Product.rebuild(rebuildData);

      expect(productInstance.getCreatedAt().getTime()).toBe(mockCreatedAt.getTime());
      expect(productInstance.getUpdatedAt().getTime()).toBe(mockUpdatedAt.getTime());
    });
  });

  describe("private touch method", () => {
    it("should update updatedAt when any mutation method is called", async () => {
      const productInstance = new Product(
        mockId,
        mockCategoryId,
        mockName,
        mockDescription,
        new Money(mockPrice),
        mockType,
        mockIngredients,
        mockPreparationTime,
        mockImages,
        mockStockQuantity,
        mockStatus,
        mockCreatedAt,
        mockUpdatedAt,
      );

      const methods = [
        () => productInstance.rename("New Name"),
        () => productInstance.changeCategory("new-cat-123"),
        () => productInstance.changePrice(9999),
        () => productInstance.changeDescription("New Description"),
        () => productInstance.changeType(ProductType.DRINK),
        () => productInstance.changeIngredients("New ingredients"),
        () => productInstance.changePreparationTime(30),
        () => productInstance.setStatus(ProductStatus.UNAVAILABLE),
        () => productInstance.setStock(200),
        () => productInstance.restock(50),
        () => productInstance.deductStock(10),
        () => productInstance.addImage("https://example.com/new.jpg"),
        () => productInstance.removeImage("https://example.com/image2.jpg"),
        () => productInstance.replaceImage({ oldUrl: "https://example.com/image1.jpg", newUrl: "https://example.com/replaced.jpg" }),
        () => productInstance.reorderImages(["https://example.com/image1.jpg", "https://example.com/new.jpg"]),
      ];

      for (const method of methods) {
        const before = productInstance.getUpdatedAt();
        await new Promise((resolve) => setTimeout(resolve, 1));
        method();
        const after = productInstance.getUpdatedAt();
        expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
      }
    });

    it("should not update updatedAt when only getters are called", () => {
      const initialUpdatedAt = product.getUpdatedAt();

      product.getId();
      product.getCategoryId();
      product.getName();
      product.getPrice();
      product.getDescription();
      product.getType();
      product.getIngredients();
      product.getPreparationTimeInMinutes();
      product.getImages();
      product.getStockQuantity();
      product.getStatus();
      product.getCreatedAt();
      product.getUpdatedAt();
      product.canOrder();
      product.hasImage("https://example.com/image1.jpg");
      product.requiresPreparation();

      expect(product.getUpdatedAt()).toEqual(initialUpdatedAt);
    });
  });

  describe("integration and edge cases", () => {
    it("should handle complete product lifecycle", () => {
      const productInstance = Product.create({
        id: mockId,
        categoryId: mockCategoryId,
        name: "New Product",
        description: "Initial description",
        price: 19990,
        type: ProductType.FOOD,
        imageUrls: ["https://example.com/image1.jpg"],
        stockQuantity: 50,
        status: ProductStatus.UPCOMING,
      });

      expect(productInstance.canOrder()).toBe(false);

      productInstance.setStatus(ProductStatus.AVAILABLE);
      expect(productInstance.canOrder()).toBe(true);

      productInstance.restock(50);
      expect(productInstance.getStockQuantity()).toBe(100);

      productInstance.deductStock(30);
      expect(productInstance.getStockQuantity()).toBe(70);

      productInstance.addImage("https://example.com/image2.jpg");
      expect(productInstance.getImages()).toHaveLength(2);

      productInstance.changePrice(24990);
      expect(productInstance.getPrice().getAmount()).toBe(24990);

      productInstance.reorderImages(["https://example.com/image2.jpg", "https://example.com/image1.jpg"]);

      const images = productInstance.getImages();
      expect(images[0].getUrl()).toBe("https://example.com/image2.jpg");
      expect(images[1].getUrl()).toBe("https://example.com/image1.jpg");
    });

    it("should handle stock management scenarios", () => {
      const productInstance = new Product(
        mockId,
        mockCategoryId,
        "Stock Test",
        null,
        new Money(10),
        ProductType.FOOD,
        null,
        null,
        [],
        0,
        ProductStatus.OUT_OF_STOCK,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(productInstance.canOrder()).toBe(false);

      productInstance.restock(10);
      expect(productInstance.getStockQuantity()).toBe(10);
      expect(productInstance.getStatus()).toBe(ProductStatus.AVAILABLE);
      expect(productInstance.canOrder()).toBe(true);

      productInstance.deductStock(10);
      expect(productInstance.getStockQuantity()).toBe(0);
      expect(productInstance.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);
      expect(productInstance.canOrder()).toBe(false);

      productInstance.restock(5);
      expect(productInstance.getStockQuantity()).toBe(5);
      expect(productInstance.getStatus()).toBe(ProductStatus.AVAILABLE);
      expect(productInstance.canOrder()).toBe(true);
    });

    it("should handle edge cases with empty arrays and null values", () => {
      const productInstance = new Product(
        mockId,
        mockCategoryId,
        "Edge Test",
        null,
        new Money(0),
        ProductType.FOOD,
        null,
        null,
        [],
        0,
        ProductStatus.UPCOMING,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(productInstance.getImages()).toHaveLength(0);
      expect(productInstance.getDescription()).toBeNull();
      expect(productInstance.getIngredients()).toBeNull();
      expect(productInstance.getPreparationTimeInMinutes()).toBeNull();
      expect(productInstance.getStockQuantity()).toBe(0);
      expect(productInstance.canOrder()).toBe(false);
      expect(productInstance.requiresPreparation()).toBe(true);
    });

    it("should handle large stock quantities", () => {
      const largeStock = Number.MAX_SAFE_INTEGER;
      const productInstance = new Product(
        mockId,
        mockCategoryId,
        "Large Stock",
        null,
        new Money(10),
        ProductType.PACKAGED,
        null,
        null,
        [],
        largeStock,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(productInstance.getStockQuantity()).toBe(largeStock);
      productInstance.deductStock(100);
      expect(productInstance.getStockQuantity()).toBe(largeStock - 100);
      productInstance.restock(50);
      expect(productInstance.getStockQuantity()).toBe(largeStock - 50);
    });

    it("should handle zero price", () => {
      const productInstance = new Product(
        mockId,
        mockCategoryId,
        "Free Product",
        null,
        new Money(0),
        ProductType.PACKAGED,
        null,
        null,
        [],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(productInstance.getPrice().getAmount()).toBe(0);
      productInstance.changePrice(0);
      expect(productInstance.getPrice().getAmount()).toBe(0);
    });

    it("should handle status transitions correctly with stock", () => {
      const productInstance = new Product(
        mockId,
        mockCategoryId,
        "Status Test",
        null,
        new Money(10),
        ProductType.FOOD,
        null,
        null,
        [],
        0,
        ProductStatus.OUT_OF_STOCK,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(productInstance.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);

      productInstance.setStatus(ProductStatus.AVAILABLE);
      expect(productInstance.getStatus()).toBe(ProductStatus.AVAILABLE);

      productInstance.deductStock(0);
      expect(productInstance.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);

      productInstance.setStatus(ProductStatus.AVAILABLE);
      expect(productInstance.getStatus()).toBe(ProductStatus.AVAILABLE);

      productInstance.setStatus(ProductStatus.OUT_OF_STOCK);
      expect(productInstance.getStatus()).toBe(ProductStatus.OUT_OF_STOCK);

      productInstance.restock(10);
      expect(productInstance.getStatus()).toBe(ProductStatus.AVAILABLE);

      productInstance.setStatus(ProductStatus.UNAVAILABLE);
      expect(productInstance.getStatus()).toBe(ProductStatus.UNAVAILABLE);
      expect(productInstance.getStockQuantity()).toBe(10);
    });

    it("should handle removing images and maintaining primary status", () => {
      const productWithThreeImages = new Product(
        mockId,
        mockCategoryId,
        "Multi Image",
        null,
        new Money(10),
        ProductType.FOOD,
        null,
        null,
        [
          ProductImage.create({
            productId: mockId,
            url: "https://example.com/img1.jpg",
            altText: "Image 1",
            isPrimary: true,
            sortOrder: 1,
          }),
          ProductImage.create({
            productId: mockId,
            url: "https://example.com/img2.jpg",
            altText: "Image 2",
            isPrimary: false,
            sortOrder: 2,
          }),
          ProductImage.create({
            productId: mockId,
            url: "https://example.com/img3.jpg",
            altText: "Image 3",
            isPrimary: false,
            sortOrder: 3,
          }),
        ],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      productWithThreeImages.removeImage("https://example.com/img1.jpg");
      const images = productWithThreeImages.getImages();
      expect(images[0].isPrimaryImage()).toBe(true);
      expect(images[0].getUrl()).toBe("https://example.com/img2.jpg");
      expect(images).toHaveLength(2);
    });
  });

  describe("error scenarios", () => {
    it("should throw appropriate error when deducting more than available", () => {
      const productInstance = new Product(
        mockId,
        mockCategoryId,
        "Low Stock",
        null,
        new Money(10),
        ProductType.FOOD,
        null,
        null,
        [],
        5,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(() => productInstance.deductStock(6)).toThrow(InsufficientStockException);
      expect(() => productInstance.deductStock(10)).toThrow(InsufficientStockException);
    });

    it("should throw appropriate error for invalid quantity in restock", () => {
      expect(() => product.restock(-5)).toThrow(InvalidRestockQuantityException);
    });

    it("should throw appropriate error for invalid quantity in deductStock", () => {
      expect(() => product.deductStock(-5)).toThrow(InvalidDeductQuantityException);
    });

    it("should throw appropriate error for invalid preparation time", () => {
      expect(() => product.changePreparationTime(0)).toThrow(InvalidPreparationTimeException);
      expect(() => product.changePreparationTime(-1)).toThrow(InvalidPreparationTimeException);
    });

    it("should throw appropriate error for invalid stock quantity", () => {
      expect(() => product.setStock(-10)).toThrow(InvalidStockQuantityException);
    });

    it("should throw appropriate error for invalid reorder images", () => {
      const productInstance = new Product(
        mockId,
        mockCategoryId,
        "Reorder Test",
        null,
        new Money(10),
        ProductType.FOOD,
        null,
        null,
        [
          ProductImage.create({
            productId: mockId,
            url: "https://example.com/img1.jpg",
            altText: "Image 1",
            isPrimary: true,
            sortOrder: 1,
          }),
        ],
        10,
        ProductStatus.AVAILABLE,
        mockCreatedAt,
        mockUpdatedAt,
      );

      const orderedUrlsWrongCount = ["https://example.com/img1.jpg", "https://example.com/img2.jpg"];
      expect(() => productInstance.reorderImages(orderedUrlsWrongCount)).toThrow(InvalidReorderProductImageException);

      const orderedUrlsWithWrongImage = ["https://example.com/img2.jpg"];
      expect(() => productInstance.reorderImages(orderedUrlsWithWrongImage)).toThrow(ProductImageNotFoundException);
    });
  });
});
