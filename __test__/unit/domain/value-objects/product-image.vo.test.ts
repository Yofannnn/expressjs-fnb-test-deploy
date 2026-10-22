import { ProductImage } from "@/domain/value-objects/product-image.vo";
import { ProductImageCreationData, ProductImageRebuildData } from "@/domain/types/product.type";

describe("ProductImage", () => {
  const mockProductId = "prod-123";
  const mockUrl = "https://example.com/image.jpg";
  const mockAltText = "Product image description";
  const mockSortOrder = 5;

  describe("constructor and getters", () => {
    it("should create a ProductImage instance with all properties", () => {
      const image = new ProductImage(mockProductId, mockUrl, mockAltText, true, mockSortOrder);

      expect(image.getProductId()).toBe(mockProductId);
      expect(image.getUrl()).toBe(mockUrl);
      expect(image.getAltText()).toBe(mockAltText);
      expect(image.isPrimaryImage()).toBe(true);
      expect(image.getSortOrder()).toBe(mockSortOrder);
    });

    it("should handle null altText", () => {
      const image = new ProductImage(mockProductId, mockUrl, null, false, 0);

      expect(image.getAltText()).toBeNull();
    });

    it("should handle false isPrimary", () => {
      const image = new ProductImage(mockProductId, mockUrl, mockAltText, false, 0);

      expect(image.isPrimaryImage()).toBe(false);
    });
  });

  describe("changeUrl", () => {
    it("should return a new ProductImage with updated URL", () => {
      const originalImage = new ProductImage(mockProductId, mockUrl, mockAltText, true, mockSortOrder);

      const newUrl = "https://example.com/new-image.jpg";
      const updatedImage = originalImage.changeUrl(newUrl);

      expect(updatedImage).not.toBe(originalImage);
      expect(updatedImage.getUrl()).toBe(newUrl);
      expect(updatedImage.getProductId()).toBe(originalImage.getProductId());
      expect(updatedImage.getAltText()).toBe(originalImage.getAltText());
      expect(updatedImage.isPrimaryImage()).toBe(originalImage.isPrimaryImage());
      expect(updatedImage.getSortOrder()).toBe(originalImage.getSortOrder());
    });
  });

  describe("changeAltText", () => {
    it("should return a new ProductImage with updated altText", () => {
      const originalImage = new ProductImage(mockProductId, mockUrl, mockAltText, true, mockSortOrder);

      const newAltText = "New description";
      const updatedImage = originalImage.changeAltText(newAltText);

      expect(updatedImage).not.toBe(originalImage);
      expect(updatedImage.getAltText()).toBe(newAltText);
      expect(updatedImage.getProductId()).toBe(originalImage.getProductId());
      expect(updatedImage.getUrl()).toBe(originalImage.getUrl());
      expect(updatedImage.isPrimaryImage()).toBe(originalImage.isPrimaryImage());
      expect(updatedImage.getSortOrder()).toBe(originalImage.getSortOrder());
    });
  });

  describe("changeSortOrder", () => {
    it("should return a new ProductImage with updated sortOrder", () => {
      const originalImage = new ProductImage(mockProductId, mockUrl, mockAltText, true, mockSortOrder);

      const newSortOrder = 10;
      const updatedImage = originalImage.changeSortOrder(newSortOrder);

      expect(updatedImage).not.toBe(originalImage);
      expect(updatedImage.getSortOrder()).toBe(newSortOrder);
      expect(updatedImage.getProductId()).toBe(originalImage.getProductId());
      expect(updatedImage.getUrl()).toBe(originalImage.getUrl());
      expect(updatedImage.getAltText()).toBe(originalImage.getAltText());
      expect(updatedImage.isPrimaryImage()).toBe(originalImage.isPrimaryImage());
    });
  });

  describe("makePrimary", () => {
    it("should return a new ProductImage with isPrimary set to true", () => {
      const originalImage = new ProductImage(mockProductId, mockUrl, mockAltText, false, mockSortOrder);

      const updatedImage = originalImage.makePrimary();

      expect(updatedImage).not.toBe(originalImage);
      expect(updatedImage.isPrimaryImage()).toBe(true);
      expect(updatedImage.getProductId()).toBe(originalImage.getProductId());
      expect(updatedImage.getUrl()).toBe(originalImage.getUrl());
      expect(updatedImage.getAltText()).toBe(originalImage.getAltText());
      expect(updatedImage.getSortOrder()).toBe(originalImage.getSortOrder());
    });

    it("should keep isPrimary true when already primary", () => {
      const originalImage = new ProductImage(mockProductId, mockUrl, mockAltText, true, mockSortOrder);

      const updatedImage = originalImage.makePrimary();

      expect(updatedImage.isPrimaryImage()).toBe(true);
    });
  });

  describe("static create", () => {
    it("should create a ProductImage from creation data with all properties", () => {
      const creationData: ProductImageCreationData = {
        productId: mockProductId,
        url: mockUrl,
        altText: mockAltText,
        isPrimary: true,
        sortOrder: mockSortOrder,
      };

      const image = ProductImage.create(creationData);

      expect(image.getProductId()).toBe(mockProductId);
      expect(image.getUrl()).toBe(mockUrl);
      expect(image.getAltText()).toBe(mockAltText);
      expect(image.isPrimaryImage()).toBe(true);
      expect(image.getSortOrder()).toBe(mockSortOrder);
    });

    it("should create a ProductImage with default values when optional fields are omitted", () => {
      const creationData: ProductImageCreationData = {
        productId: mockProductId,
        url: mockUrl,
      };

      const image = ProductImage.create(creationData);

      expect(image.getProductId()).toBe(mockProductId);
      expect(image.getUrl()).toBe(mockUrl);
      expect(image.getAltText()).toBeNull();
      expect(image.isPrimaryImage()).toBe(false);
      expect(image.getSortOrder()).toBe(0);
    });

    it("should create a ProductImage with altText set to null when altText is undefined", () => {
      const creationData: ProductImageCreationData = {
        productId: mockProductId,
        url: mockUrl,
        altText: undefined,
      };

      const image = ProductImage.create(creationData);

      expect(image.getAltText()).toBeNull();
    });

    it("should create a ProductImage with default isPrimary false", () => {
      const creationData: ProductImageCreationData = {
        productId: mockProductId,
        url: mockUrl,
        sortOrder: mockSortOrder,
      };

      const image = ProductImage.create(creationData);

      expect(image.isPrimaryImage()).toBe(false);
    });

    it("should create a ProductImage with default sortOrder 0", () => {
      const creationData: ProductImageCreationData = {
        productId: mockProductId,
        url: mockUrl,
        isPrimary: true,
      };

      const image = ProductImage.create(creationData);

      expect(image.getSortOrder()).toBe(0);
    });
  });

  describe("static rebuild", () => {
    it("should rebuild a ProductImage from rebuild data", () => {
      const rebuildData: ProductImageRebuildData = {
        productId: mockProductId,
        url: mockUrl,
        altText: mockAltText,
        isPrimary: true,
        sortOrder: mockSortOrder,
      };

      const image = ProductImage.rebuild(rebuildData);

      expect(image.getProductId()).toBe(mockProductId);
      expect(image.getUrl()).toBe(mockUrl);
      expect(image.getAltText()).toBe(mockAltText);
      expect(image.isPrimaryImage()).toBe(true);
      expect(image.getSortOrder()).toBe(mockSortOrder);
    });

    it("should rebuild a ProductImage with null altText", () => {
      const rebuildData: ProductImageRebuildData = {
        productId: mockProductId,
        url: mockUrl,
        altText: null,
        isPrimary: false,
        sortOrder: 0,
      };

      const image = ProductImage.rebuild(rebuildData);

      expect(image.getAltText()).toBeNull();
    });

    it("should rebuild a ProductImage with false isPrimary", () => {
      const rebuildData: ProductImageRebuildData = {
        productId: mockProductId,
        url: mockUrl,
        altText: mockAltText,
        isPrimary: false,
        sortOrder: mockSortOrder,
      };

      const image = ProductImage.rebuild(rebuildData);

      expect(image.isPrimaryImage()).toBe(false);
    });
  });

  describe("immutability", () => {
    it("should not mutate original object when calling change methods", () => {
      const originalImage = new ProductImage(mockProductId, mockUrl, mockAltText, false, mockSortOrder);

      const urlChanged = originalImage.changeUrl("new-url.jpg");
      const altChanged = originalImage.changeAltText("new alt");
      const orderChanged = originalImage.changeSortOrder(99);
      const primaryChanged = originalImage.makePrimary();

      expect(originalImage.getUrl()).toBe(mockUrl);
      expect(originalImage.getAltText()).toBe(mockAltText);
      expect(originalImage.getSortOrder()).toBe(mockSortOrder);
      expect(originalImage.isPrimaryImage()).toBe(false);
      expect(urlChanged).not.toBe(originalImage);
      expect(altChanged).not.toBe(originalImage);
      expect(orderChanged).not.toBe(originalImage);
      expect(primaryChanged).not.toBe(originalImage);
    });
  });

  describe("edge cases", () => {
    it("should handle empty URL string", () => {
      const image = new ProductImage(mockProductId, "", mockAltText, true, 0);
      expect(image.getUrl()).toBe("");
    });

    it("should handle negative sortOrder", () => {
      const image = new ProductImage(mockProductId, mockUrl, mockAltText, true, -5);
      expect(image.getSortOrder()).toBe(-5);
    });

    it("should handle large sortOrder numbers", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const image = new ProductImage(mockProductId, mockUrl, mockAltText, true, largeNumber);
      expect(image.getSortOrder()).toBe(largeNumber);
    });

    it("should handle special characters in altText", () => {
      const specialAlt = "Image! @ # $ % ^ & * ( )";
      const image = new ProductImage(mockProductId, mockUrl, specialAlt, true, 0);
      expect(image.getAltText()).toBe(specialAlt);
    });

    it("should handle URL with query parameters", () => {
      const urlWithParams = "https://example.com/image.jpg?width=100&height=100";
      const image = new ProductImage(mockProductId, urlWithParams, mockAltText, true, 0);
      expect(image.getUrl()).toBe(urlWithParams);
    });
  });
});
