import { ProductCategoryMapper } from "@/application/mappers/product-category.mapper";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";

describe("ProductCategoryMapper", () => {
  const mockId = "category-123";
  const mockName = "Pizza";
  const mockDescription = "All kinds of delicious pizzas";
  const mockImageUrl = "https://example.com/category-pizza.jpg";
  const mockStatus = ProductCategoryStatus.ACTIVE;
  const mockSortOrder = 1;
  const mockCreatedAt = new Date("2024-01-01T10:00:00.000Z");
  const mockUpdatedAt = new Date("2024-01-01T11:00:00.000Z");

  describe("toPlainObject", () => {
    let category: ProductCategory;
    let result: ReturnType<typeof ProductCategoryMapper.toPlainObject>;

    describe("with complete category data", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
      });

      it("should map all basic fields correctly", () => {
        expect(result).toEqual({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });
      });

      it("should return new Date objects, not references", () => {
        expect(result.createdAt).not.toBe(mockCreatedAt);
        expect(result.updatedAt).not.toBe(mockUpdatedAt);
      });

      it("should preserve date values accurately", () => {
        expect(result.createdAt.getTime()).toBe(mockCreatedAt.getTime());
        expect(result.updatedAt.getTime()).toBe(mockUpdatedAt.getTime());
      });
    });

    describe("with minimal category data", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: null,
          imageUrl: null,
          status: ProductCategoryStatus.ACTIVE,
          sortOrder: 5,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
      });

      it("should map minimal category correctly", () => {
        expect(result.id).toBe(mockId);
        expect(result.name).toBe(mockName);
        expect(result.description).toBeNull();
        expect(result.imageUrl).toBeNull();
        expect(result.status).toBe(ProductCategoryStatus.ACTIVE);
        expect(result.sortOrder).toBe(5);
      });
    });

    describe("with inactive category", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: ProductCategoryStatus.INACTIVE,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
      });

      it("should map inactive category correctly", () => {
        expect(result.status).toBe(ProductCategoryStatus.INACTIVE);
        expect(result.id).toBe(mockId);
        expect(result.name).toBe(mockName);
        expect(result.description).toBe(mockDescription);
        expect(result.imageUrl).toBe(mockImageUrl);
        expect(result.sortOrder).toBe(mockSortOrder);
      });
    });

    describe("with category having no description", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: null,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
      });

      it("should map description as null", () => {
        expect(result.description).toBeNull();
        expect(result.imageUrl).toBe(mockImageUrl);
      });
    });

    describe("with category having no image", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: null,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
      });

      it("should map imageUrl as null", () => {
        expect(result.imageUrl).toBeNull();
        expect(result.description).toBe(mockDescription);
      });
    });

    describe("with category having both description and image null", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: null,
          imageUrl: null,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
      });

      it("should map both as null", () => {
        expect(result.description).toBeNull();
        expect(result.imageUrl).toBeNull();
      });
    });

    describe("with category having different sort orders", () => {
      it("should map sort order 0 correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: 0,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.sortOrder).toBe(0);
      });

      it("should map sort order 100 correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: 100,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.sortOrder).toBe(100);
      });

      it("should map negative sort order correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: -5,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.sortOrder).toBe(-5);
      });
    });

    describe("with category having special characters", () => {
      const specialName = "Café & Pâtisserie - Spécialités!";
      const specialDescription = "Delicious treats with é, ñ, ü, and 🍰🎉";
      const specialImageUrl = "https://example.com/café-pâtisserie.jpg";

      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: specialName,
          description: specialDescription,
          imageUrl: specialImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
      });

      it("should handle special characters correctly", () => {
        expect(result.name).toBe(specialName);
        expect(result.description).toBe(specialDescription);
        expect(result.imageUrl).toBe(specialImageUrl);
      });
    });

    describe("with category having long text fields", () => {
      const longName = "A".repeat(200);
      const longDescription = "B".repeat(1000);
      const longImageUrl = "https://example.com/" + "c".repeat(200) + ".jpg";

      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: longName,
          description: longDescription,
          imageUrl: longImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
      });

      it("should handle long text fields correctly", () => {
        expect(result.name).toBe(longName);
        expect(result.description).toBe(longDescription);
        expect(result.imageUrl).toBe(longImageUrl);
      });
    });

    describe("with category having empty strings", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: "",
          description: "",
          imageUrl: "",
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
      });

      it("should map empty strings correctly", () => {
        expect(result.name).toBe("");
        expect(result.description).toBe("");
        expect(result.imageUrl).toBe("");
      });
    });

    describe("edge cases", () => {
      it("should handle ancient dates", () => {
        const ancientDate = new Date("1970-01-01T00:00:00.000Z");

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: ancientDate,
          updatedAt: ancientDate,
        });

        result = ProductCategoryMapper.toPlainObject(category);

        expect(result.createdAt.getTime()).toBe(0);
        expect(result.updatedAt.getTime()).toBe(0);
      });

      it("should handle future dates", () => {
        const futureDate = new Date("2099-12-31T23:59:59.999Z");

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: futureDate,
          updatedAt: futureDate,
        });

        result = ProductCategoryMapper.toPlainObject(category);

        expect(result.createdAt.getTime()).toBe(futureDate.getTime());
        expect(result.updatedAt.getTime()).toBe(futureDate.getTime());
      });

      it("should handle UUID-like IDs", () => {
        const uuidId = "550e8400-e29b-41d4-a716-446655440000";

        category = ProductCategory.rebuild({
          id: uuidId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.id).toBe(uuidId);
      });

      it("should handle numeric IDs as strings", () => {
        const numericId = "12345";

        category = ProductCategory.rebuild({
          id: numericId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.id).toBe(numericId);
      });
    });

    describe("immutability", () => {
      it("should not mutate the original category object", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const originalId = category.getId();
        const originalName = category.getName();
        const originalDescription = category.getDescription();
        const originalImageUrl = category.getImageUrl();
        const originalStatus = category.getStatus();
        const originalSortOrder = category.getSortOrder();
        const originalCreatedAt = category.getCreatedAt();
        const originalUpdatedAt = category.getUpdatedAt();

        ProductCategoryMapper.toPlainObject(category);

        expect(category.getId()).toBe(originalId);
        expect(category.getName()).toBe(originalName);
        expect(category.getDescription()).toBe(originalDescription);
        expect(category.getImageUrl()).toBe(originalImageUrl);
        expect(category.getStatus()).toBe(originalStatus);
        expect(category.getSortOrder()).toBe(originalSortOrder);
        expect(category.getCreatedAt()).toEqual(originalCreatedAt);
        expect(category.getUpdatedAt()).toEqual(originalUpdatedAt);
      });

      it("should return new Date instances for each mapping call", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result1 = ProductCategoryMapper.toPlainObject(category);
        const result2 = ProductCategoryMapper.toPlainObject(category);

        expect(result1).not.toBe(result2);
        expect(result1.createdAt).not.toBe(result2.createdAt);
        expect(result1.updatedAt).not.toBe(result2.updatedAt);
        expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
        expect(result1.updatedAt.getTime()).toBe(result2.updatedAt.getTime());
        expect(result1.id).toBe(result2.id);
        expect(result1.name).toBe(result2.name);
        expect(result1.description).toBe(result2.description);
        expect(result1.imageUrl).toBe(result2.imageUrl);
        expect(result1.status).toBe(result2.status);
        expect(result1.sortOrder).toBe(result2.sortOrder);
      });
    });

    describe("mapping consistency", () => {
      it("should map all fields consistently with the interface", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);

        expect(result).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          imageUrl: expect.any(String),
          status: expect.any(String),
          sortOrder: expect.any(Number),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        });
      });

      it("should produce consistent results when mapped multiple times", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result1 = ProductCategoryMapper.toPlainObject(category);
        const result2 = ProductCategoryMapper.toPlainObject(category);

        expect(result1).toEqual(result2);
        expect(result1).not.toBe(result2);
        expect(result1.createdAt).not.toBe(result2.createdAt);
        expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
        expect(result1.updatedAt).not.toBe(result2.updatedAt);
        expect(result1.updatedAt.getTime()).toBe(result2.updatedAt.getTime());
        expect(result1.id).toBe(result2.id);
        expect(result1.name).toBe(result2.name);
        expect(result1.description).toBe(result2.description);
        expect(result1.imageUrl).toBe(result2.imageUrl);
        expect(result1.status).toBe(result2.status);
        expect(result1.sortOrder).toBe(result2.sortOrder);
      });

      it("should maintain type consistency for optional fields", () => {
        const categoryWithNulls = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: null,
          imageUrl: null,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(categoryWithNulls);

        expect(result.description).toBeNull();
        expect(result.imageUrl).toBeNull();
        expect(typeof result.name).toBe("string");
        expect(typeof result.status).toBe("string");
        expect(typeof result.sortOrder).toBe("number");
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe("status-specific scenarios", () => {
      it("should handle ACTIVE status correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: ProductCategoryStatus.ACTIVE,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.status).toBe(ProductCategoryStatus.ACTIVE);
      });

      it("should handle INACTIVE status correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: ProductCategoryStatus.INACTIVE,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.status).toBe(ProductCategoryStatus.INACTIVE);
      });
    });

    describe("image URL scenarios", () => {
      it("should handle http image URL", () => {
        const httpUrl = "http://example.com/image.jpg";

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: httpUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.imageUrl).toBe(httpUrl);
      });

      it("should handle https image URL", () => {
        const httpsUrl = "https://example.com/image.jpg";

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: httpsUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.imageUrl).toBe(httpsUrl);
      });

      it("should handle image URL with query parameters", () => {
        const urlWithParams = "https://example.com/image.jpg?width=300&height=200";

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: urlWithParams,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.imageUrl).toBe(urlWithParams);
      });

      it("should handle image URL with special characters", () => {
        const urlWithSpecialChars = "https://example.com/café%20pâtisserie.jpg";

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: urlWithSpecialChars,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.imageUrl).toBe(urlWithSpecialChars);
      });

      it("should handle image URL as empty string", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: "",
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toPlainObject(category);
        expect(result.imageUrl).toBe("");
      });
    });
  });

  describe("toSummaryView", () => {
    let category: ProductCategory;
    let result: ReturnType<typeof ProductCategoryMapper.toSummaryView>;

    describe("with complete category data", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
      });

      it("should map all fields correctly", () => {
        expect(result).toEqual({
          id: mockId,
          name: mockName,
          status: mockStatus,
          imageUrl: mockImageUrl,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
        });
      });

      it("should not include description and updatedAt", () => {
        expect(result).not.toHaveProperty("description");
        expect(result).not.toHaveProperty("updatedAt");
      });

      it("should return new Date object for createdAt, not reference", () => {
        expect(result.createdAt).not.toBe(mockCreatedAt);
      });

      it("should preserve date value accurately", () => {
        expect(result.createdAt.getTime()).toBe(mockCreatedAt.getTime());
      });
    });

    describe("with minimal category data", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: null,
          imageUrl: null,
          status: ProductCategoryStatus.ACTIVE,
          sortOrder: 5,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
      });

      it("should map minimal category correctly", () => {
        expect(result.id).toBe(mockId);
        expect(result.name).toBe(mockName);
        expect(result.imageUrl).toBeNull();
        expect(result.status).toBe(ProductCategoryStatus.ACTIVE);
        expect(result.sortOrder).toBe(5);
        expect(result.createdAt).toEqual(mockCreatedAt);
      });
    });

    describe("with inactive category", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: ProductCategoryStatus.INACTIVE,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
      });

      it("should map inactive category correctly", () => {
        expect(result.status).toBe(ProductCategoryStatus.INACTIVE);
        expect(result.id).toBe(mockId);
        expect(result.name).toBe(mockName);
        expect(result.imageUrl).toBe(mockImageUrl);
        expect(result.sortOrder).toBe(mockSortOrder);
      });
    });

    describe("with category having null imageUrl", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: null,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
      });

      it("should map imageUrl as null", () => {
        expect(result.imageUrl).toBeNull();
      });
    });

    describe("with category having empty strings", () => {
      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: "",
          description: "",
          imageUrl: "",
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
      });

      it("should map empty strings correctly", () => {
        expect(result.name).toBe("");
        expect(result.imageUrl).toBe("");
      });
    });

    describe("with category having different sort orders", () => {
      it("should map sort order 0 correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: 0,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
        expect(result.sortOrder).toBe(0);
      });

      it("should map sort order 100 correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: 100,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
        expect(result.sortOrder).toBe(100);
      });

      it("should map negative sort order correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: -5,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
        expect(result.sortOrder).toBe(-5);
      });
    });

    describe("with category having special characters", () => {
      const specialName = "Café & Pâtisserie - Spécialités!";
      const specialImageUrl = "https://example.com/café-pâtisserie.jpg";

      beforeEach(() => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: specialName,
          description: "Description",
          imageUrl: specialImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
      });

      it("should handle special characters correctly", () => {
        expect(result.name).toBe(specialName);
        expect(result.imageUrl).toBe(specialImageUrl);
      });
    });

    describe("edge cases", () => {
      it("should handle ancient dates", () => {
        const ancientDate = new Date("1970-01-01T00:00:00.000Z");

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: ancientDate,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);

        expect(result.createdAt.getTime()).toBe(0);
      });

      it("should handle future dates", () => {
        const futureDate = new Date("2099-12-31T23:59:59.999Z");

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: futureDate,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);

        expect(result.createdAt.getTime()).toBe(futureDate.getTime());
      });

      it("should handle UUID-like IDs", () => {
        const uuidId = "550e8400-e29b-41d4-a716-446655440000";

        category = ProductCategory.rebuild({
          id: uuidId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
        expect(result.id).toBe(uuidId);
      });
    });

    describe("immutability", () => {
      it("should not mutate the original category object", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const originalId = category.getId();
        const originalName = category.getName();
        const originalStatus = category.getStatus();
        const originalSortOrder = category.getSortOrder();
        const originalCreatedAt = category.getCreatedAt();

        ProductCategoryMapper.toSummaryView(category);

        expect(category.getId()).toBe(originalId);
        expect(category.getName()).toBe(originalName);
        expect(category.getStatus()).toBe(originalStatus);
        expect(category.getSortOrder()).toBe(originalSortOrder);
        expect(category.getCreatedAt()).toEqual(originalCreatedAt);
      });

      it("should return new Date instances for each mapping call", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result1 = ProductCategoryMapper.toSummaryView(category);
        const result2 = ProductCategoryMapper.toSummaryView(category);

        expect(result1).not.toBe(result2);
        expect(result1.createdAt).not.toBe(result2.createdAt);
        expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
        expect(result1.id).toBe(result2.id);
        expect(result1.name).toBe(result2.name);
        expect(result1.imageUrl).toBe(result2.imageUrl);
        expect(result1.status).toBe(result2.status);
        expect(result1.sortOrder).toBe(result2.sortOrder);
      });
    });

    describe("mapping consistency", () => {
      it("should map all fields consistently with the interface", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);

        expect(result).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          status: expect.any(String),
          imageUrl: expect.any(String),
          sortOrder: expect.any(Number),
          createdAt: expect.any(Date),
        });
      });

      it("should produce consistent results when mapped multiple times", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        const result1 = ProductCategoryMapper.toSummaryView(category);
        const result2 = ProductCategoryMapper.toSummaryView(category);

        expect(result1).toEqual(result2);
        expect(result1).not.toBe(result2);
        expect(result1.createdAt).not.toBe(result2.createdAt);
        expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
        expect(result1.id).toBe(result2.id);
        expect(result1.name).toBe(result2.name);
        expect(result1.imageUrl).toBe(result2.imageUrl);
        expect(result1.status).toBe(result2.status);
        expect(result1.sortOrder).toBe(result2.sortOrder);
      });
    });

    describe("status-specific scenarios", () => {
      it("should handle ACTIVE status correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: ProductCategoryStatus.ACTIVE,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
        expect(result.status).toBe(ProductCategoryStatus.ACTIVE);
      });

      it("should handle INACTIVE status correctly", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: ProductCategoryStatus.INACTIVE,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
        expect(result.status).toBe(ProductCategoryStatus.INACTIVE);
      });
    });

    describe("image URL scenarios", () => {
      it("should handle http image URL", () => {
        const httpUrl = "http://example.com/image.jpg";

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: httpUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
        expect(result.imageUrl).toBe(httpUrl);
      });

      it("should handle https image URL", () => {
        const httpsUrl = "https://example.com/image.jpg";

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: httpsUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
        expect(result.imageUrl).toBe(httpsUrl);
      });

      it("should handle image URL as empty string", () => {
        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: "",
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);
        expect(result.imageUrl).toBe("");
      });
    });

    describe("date precision", () => {
      it("should preserve milliseconds precision", () => {
        const preciseDate = new Date("2024-01-01T10:00:00.123Z");

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: preciseDate,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);

        expect(result.createdAt.getMilliseconds()).toBe(123);
      });

      it("should preserve timezone information by using UTC", () => {
        const utcDate = new Date("2024-01-01T10:00:00.000Z");

        category = ProductCategory.rebuild({
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: mockStatus,
          sortOrder: mockSortOrder,
          createdAt: utcDate,
          updatedAt: mockUpdatedAt,
        });

        result = ProductCategoryMapper.toSummaryView(category);

        expect(result.createdAt.toISOString()).toBe("2024-01-01T10:00:00.000Z");
      });
    });
  });

  describe("comparison between toPlainObject and toSummaryView", () => {
    it("should have different field sets", () => {
      const category = ProductCategory.rebuild({
        id: mockId,
        name: mockName,
        description: mockDescription,
        imageUrl: mockImageUrl,
        status: mockStatus,
        sortOrder: mockSortOrder,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const plainObject = ProductCategoryMapper.toPlainObject(category);
      const summaryView = ProductCategoryMapper.toSummaryView(category);

      expect(plainObject).toHaveProperty("description");
      expect(plainObject).toHaveProperty("updatedAt");
      expect(summaryView).not.toHaveProperty("description");
      expect(summaryView).not.toHaveProperty("updatedAt");

      expect(plainObject.id).toBe(summaryView.id);
      expect(plainObject.name).toBe(summaryView.name);
      expect(plainObject.status).toBe(summaryView.status);
      expect(plainObject.imageUrl).toBe(summaryView.imageUrl);
      expect(plainObject.sortOrder).toBe(summaryView.sortOrder);
      expect(plainObject.createdAt.getTime()).toBe(summaryView.createdAt.getTime());
    });
  });
});
