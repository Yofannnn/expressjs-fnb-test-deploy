import { ProductMapper } from "@/application/mappers/product.mapper";
import { Product } from "@/domain/entities/product.entity";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductStatus, ProductType } from "@/domain/types/product.type";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";

describe("ProductMapper", () => {
  const mockId = "product-123";
  const mockCategoryId = "category-456";
  const mockName = "Delicious Pizza";
  const mockDescription = "A delicious handmade pizza with fresh ingredients";
  const mockPrice = 50000;
  const mockType = ProductType.FOOD;
  const mockIngredients = "Flour, Tomato sauce, Mozzarella, Basil";
  const mockPreparationTime = 25;
  const mockStockQuantity = 50;
  const mockStatus = ProductStatus.AVAILABLE;
  const mockCreatedAt = new Date("2024-01-01T10:00:00.000Z");
  const mockUpdatedAt = new Date("2024-01-01T11:00:00.000Z");

  const mockCategoryName = "Pizza Category";
  const mockCategoryDescription = "All kinds of delicious pizzas";
  const mockCategoryImageUrl = "https://example.com/category.jpg";
  const mockCategoryStatus = ProductCategoryStatus.ACTIVE;
  const mockCategorySortOrder = 1;
  const mockCategoryCreatedAt = new Date("2024-01-01T09:00:00.000Z");
  const mockCategoryUpdatedAt = new Date("2024-01-01T09:30:00.000Z");

  const mockImages = [
    {
      productId: mockId,
      url: "https://example.com/image1.jpg",
      altText: "Delicious Pizza image 1",
      isPrimary: true,
      sortOrder: 1,
    },
    {
      productId: mockId,
      url: "https://example.com/image2.jpg",
      altText: "Delicious Pizza image 2",
      isPrimary: false,
      sortOrder: 2,
    },
    {
      productId: mockId,
      url: "https://example.com/image3.jpg",
      altText: "Delicious Pizza image 3",
      isPrimary: false,
      sortOrder: 3,
    },
  ];

  let product: Product;
  let category: ProductCategory;

  beforeEach(() => {
    product = Product.rebuild({
      id: mockId,
      categoryId: mockCategoryId,
      name: mockName,
      description: mockDescription,
      price: mockPrice,
      type: mockType,
      ingredients: mockIngredients,
      preparationTimeInMinutes: mockPreparationTime,
      stockQuantity: mockStockQuantity,
      status: mockStatus,
      images: mockImages,
      createdAt: mockCreatedAt,
      updatedAt: mockUpdatedAt,
    });

    category = ProductCategory.rebuild({
      id: mockCategoryId,
      name: mockCategoryName,
      description: mockCategoryDescription,
      imageUrl: mockCategoryImageUrl,
      status: mockCategoryStatus,
      sortOrder: mockCategorySortOrder,
      createdAt: mockCategoryCreatedAt,
      updatedAt: mockCategoryUpdatedAt,
    });
  });

  describe("toPlainObject", () => {
    let result: ReturnType<typeof ProductMapper.toPlainObject>;

    describe("with complete product data", () => {
      beforeEach(() => {
        result = ProductMapper.toPlainObject(product);
      });

      it("should map all basic fields correctly", () => {
        expect(result).toEqual({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: mockImages.map((img) => ({
            productId: img.productId,
            url: img.url,
            altText: img.altText,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
          })),
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

      it("should return images sorted by sortOrder", () => {
        expect(result.images[0].sortOrder).toBe(1);
        expect(result.images[1].sortOrder).toBe(2);
        expect(result.images[2].sortOrder).toBe(3);
      });

      it("should preserve image data correctly", () => {
        expect(result.images).toHaveLength(3);
        expect(result.images[0]).toEqual({
          productId: mockId,
          url: "https://example.com/image1.jpg",
          altText: "Delicious Pizza image 1",
          isPrimary: true,
          sortOrder: 1,
        });
        expect(result.images[1]).toEqual({
          productId: mockId,
          url: "https://example.com/image2.jpg",
          altText: "Delicious Pizza image 2",
          isPrimary: false,
          sortOrder: 2,
        });
        expect(result.images[2]).toEqual({
          productId: mockId,
          url: "https://example.com/image3.jpg",
          altText: "Delicious Pizza image 3",
          isPrimary: false,
          sortOrder: 3,
        });
      });
    });

    describe("with product having minimal data", () => {
      beforeEach(() => {
        const minimalProduct = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: null,
          price: 20000,
          type: ProductType.DRINK,
          ingredients: null,
          preparationTimeInMinutes: null,
          stockQuantity: 0,
          status: ProductStatus.UNAVAILABLE,
          images: [
            {
              productId: mockId,
              url: "https://example.com/drink.jpg",
              altText: "Drink image 1",
              isPrimary: true,
              sortOrder: 1,
            },
          ],
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toPlainObject(minimalProduct);
      });

      it("should map minimal product correctly", () => {
        expect(result.id).toBe(mockId);
        expect(result.categoryId).toBe(mockCategoryId);
        expect(result.name).toBe(mockName);
        expect(result.description).toBeNull();
        expect(result.price).toBe(20000);
        expect(result.type).toBe(ProductType.DRINK);
        expect(result.ingredients).toBeNull();
        expect(result.preparationTimeInMinutes).toBeNull();
        expect(result.stockQuantity).toBe(0);
        expect(result.status).toBe(ProductStatus.UNAVAILABLE);
        expect(result.images).toHaveLength(1);
      });
    });

    describe("with product having no images", () => {
      beforeEach(() => {
        const productNoImages = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: [],
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toPlainObject(productNoImages);
      });

      it("should map empty images array correctly", () => {
        expect(result.images).toEqual([]);
        expect(result.images).toHaveLength(0);
      });
    });

    describe("edge cases", () => {
      it("should handle zero price correctly", () => {
        const productZeroPrice = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: 0,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: mockImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toPlainObject(productZeroPrice);
        expect(result.price).toBe(0);
      });

      it("should handle preparation time as null", () => {
        const productNullPrep = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: ProductType.DRINK,
          ingredients: null,
          preparationTimeInMinutes: null,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: mockImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toPlainObject(productNullPrep);
        expect(result.preparationTimeInMinutes).toBeNull();
      });
    });
  });

  describe("toDetailView", () => {
    let result: ReturnType<typeof ProductMapper.toDetailView>;

    describe("with complete product and category data", () => {
      beforeEach(() => {
        result = ProductMapper.toDetailView(product, category);
      });

      it("should map all product fields correctly", () => {
        expect(result.id).toBe(mockId);
        expect(result.name).toBe(mockName);
        expect(result.price).toBe(mockPrice);
        expect(result.description).toBe(mockDescription);
        expect(result.type).toBe(mockType);
        expect(result.ingredients).toBe(mockIngredients);
        expect(result.preparationTimeInMinutes).toBe(mockPreparationTime);
        expect(result.stockQuantity).toBe(mockStockQuantity);
        expect(result.status).toBe(mockStatus);
        expect(result.createdAt).toEqual(mockCreatedAt);
        expect(result.updatedAt).toEqual(mockUpdatedAt);
      });

      it("should map category fields correctly", () => {
        expect(result.category.id).toBe(mockCategoryId);
        expect(result.category.name).toBe(mockCategoryName);
        expect(result.category.description).toBe(mockCategoryDescription);
        expect(result.category.imageUrl).toBe(mockCategoryImageUrl);
      });

      it("should map images correctly", () => {
        expect(result.images).toHaveLength(3);
        expect(result.images[0]).toEqual({
          url: "https://example.com/image1.jpg",
          altText: "Delicious Pizza image 1",
          isPrimary: true,
          sortOrder: 1,
        });
        expect(result.images[1]).toEqual({
          url: "https://example.com/image2.jpg",
          altText: "Delicious Pizza image 2",
          isPrimary: false,
          sortOrder: 2,
        });
        expect(result.images[2]).toEqual({
          url: "https://example.com/image3.jpg",
          altText: "Delicious Pizza image 3",
          isPrimary: false,
          sortOrder: 3,
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

    describe("with product having null optional fields", () => {
      beforeEach(() => {
        const productNullFields = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: null,
          price: mockPrice,
          type: ProductType.DRINK,
          ingredients: null,
          preparationTimeInMinutes: null,
          stockQuantity: 0,
          status: ProductStatus.UNAVAILABLE,
          images: [],
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toDetailView(productNullFields, category);
      });

      it("should map null fields correctly", () => {
        expect(result.description).toBeNull();
        expect(result.ingredients).toBeNull();
        expect(result.preparationTimeInMinutes).toBeNull();
        expect(result.stockQuantity).toBe(0);
        expect(result.status).toBe(ProductStatus.UNAVAILABLE);
        expect(result.type).toBe(ProductType.DRINK);
      });

      it("should map empty images array", () => {
        expect(result.images).toEqual([]);
      });
    });

    describe("with category having null fields", () => {
      beforeEach(() => {
        const categoryNullFields = ProductCategory.rebuild({
          id: mockCategoryId,
          name: mockCategoryName,
          description: null,
          imageUrl: null,
          status: mockCategoryStatus,
          sortOrder: mockCategorySortOrder,
          createdAt: mockCategoryCreatedAt,
          updatedAt: mockCategoryUpdatedAt,
        });

        result = ProductMapper.toDetailView(product, categoryNullFields);
      });

      it("should map category null fields correctly", () => {
        expect(result.category.description).toBeNull();
        expect(result.category.imageUrl).toBeNull();
      });
    });

    describe("with product having single image", () => {
      beforeEach(() => {
        const singleImage = [
          {
            productId: mockId,
            url: "https://example.com/single.jpg",
            altText: "Single product image",
            isPrimary: true,
            sortOrder: 1,
          },
        ];

        const productSingleImage = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: singleImage,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toDetailView(productSingleImage, category);
      });

      it("should map single image correctly", () => {
        expect(result.images).toHaveLength(1);
        expect(result.images[0].isPrimary).toBe(true);
        expect(result.images[0].sortOrder).toBe(1);
        expect(result.images[0].url).toBe("https://example.com/single.jpg");
      });
    });

    describe("with unsorted images", () => {
      beforeEach(() => {
        const unsortedImages = [
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
        ];

        const productUnsorted = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: unsortedImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toDetailView(productUnsorted, category);
      });

      it("should sort images by sortOrder", () => {
        expect(result.images[0].sortOrder).toBe(1);
        expect(result.images[0].url).toBe("https://example.com/image1.jpg");
        expect(result.images[1].sortOrder).toBe(2);
        expect(result.images[1].url).toBe("https://example.com/image2.jpg");
        expect(result.images[2].sortOrder).toBe(3);
        expect(result.images[2].url).toBe("https://example.com/image3.jpg");
      });
    });
  });

  describe("toSummaryView", () => {
    let result: ReturnType<typeof ProductMapper.toSummaryView>;

    describe("with complete product data with primary image", () => {
      beforeEach(() => {
        result = ProductMapper.toSummaryView(product);
      });

      it("should map basic fields correctly", () => {
        expect(result.id).toBe(mockId);
        expect(result.name).toBe(mockName);
        expect(result.price).toBe(mockPrice);
        expect(result.categoryId).toBe(mockCategoryId);
        expect(result.status).toBe(mockStatus);
      });

      it("should map primary image URL correctly", () => {
        expect(result.primaryImageUrl).toBe("https://example.com/image1.jpg");
      });

      it("should not include description, type, ingredients, preparationTime, stockQuantity, images, createdAt, updatedAt", () => {
        expect(result).not.toHaveProperty("description");
        expect(result).not.toHaveProperty("type");
        expect(result).not.toHaveProperty("ingredients");
        expect(result).not.toHaveProperty("preparationTimeInMinutes");
        expect(result).not.toHaveProperty("stockQuantity");
        expect(result).not.toHaveProperty("images");
        expect(result).not.toHaveProperty("createdAt");
        expect(result).not.toHaveProperty("updatedAt");
      });
    });

    describe("with product having no images", () => {
      let productNoImages: Product;

      beforeEach(() => {
        productNoImages = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: [],
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });
      });

      it("should throw error when no images exist", () => {
        expect(() => ProductMapper.toSummaryView(productNoImages)).toThrow();
      });
    });

    describe("with product having no primary image but has images", () => {
      beforeEach(() => {
        const noPrimaryImages = [
          {
            productId: mockId,
            url: "https://example.com/image1.jpg",
            altText: "Image 1",
            isPrimary: false,
            sortOrder: 1,
          },
          {
            productId: mockId,
            url: "https://example.com/image2.jpg",
            altText: "Image 2",
            isPrimary: false,
            sortOrder: 2,
          },
        ];

        const productNoPrimary = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: noPrimaryImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toSummaryView(productNoPrimary);
      });

      it("should use first image URL when no primary image exists", () => {
        expect(result.primaryImageUrl).toBe("https://example.com/image1.jpg");
      });
    });

    describe("with product having primary image not first in order", () => {
      beforeEach(() => {
        const primaryNotFirst = [
          {
            productId: mockId,
            url: "https://example.com/image1.jpg",
            altText: "Image 1",
            isPrimary: false,
            sortOrder: 1,
          },
          {
            productId: mockId,
            url: "https://example.com/image2.jpg",
            altText: "Image 2",
            isPrimary: true,
            sortOrder: 2,
          },
          {
            productId: mockId,
            url: "https://example.com/image3.jpg",
            altText: "Image 3",
            isPrimary: false,
            sortOrder: 3,
          },
        ];

        const productPrimaryNotFirst = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: primaryNotFirst,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toSummaryView(productPrimaryNotFirst);
      });

      it("should use primary image URL even when not first in order", () => {
        expect(result.primaryImageUrl).toBe("https://example.com/image2.jpg");
      });
    });

    describe("with product having different statuses", () => {
      it("should map UPCOMING status correctly", () => {
        const productUpcoming = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: 0,
          status: ProductStatus.UPCOMING,
          images: mockImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toSummaryView(productUpcoming);
        expect(result.status).toBe(ProductStatus.UPCOMING);
      });

      it("should map AVAILABLE status correctly", () => {
        const productAvailable = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: 100,
          status: ProductStatus.AVAILABLE,
          images: mockImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toSummaryView(productAvailable);
        expect(result.status).toBe(ProductStatus.AVAILABLE);
      });

      it("should map UNAVAILABLE status correctly", () => {
        const productUnavailable = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: 0,
          status: ProductStatus.UNAVAILABLE,
          images: mockImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toSummaryView(productUnavailable);
        expect(result.status).toBe(ProductStatus.UNAVAILABLE);
      });

      it("should map DISCONTINUED status correctly", () => {
        const productDiscontinued = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: mockType,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: 0,
          status: ProductStatus.DISCONTINUED,
          images: mockImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toSummaryView(productDiscontinued);
        expect(result.status).toBe(ProductStatus.DISCONTINUED);
      });
    });

    describe("with product having different types", () => {
      it("should map FOOD type correctly (type not included in summary view)", () => {
        const productFood = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: ProductType.FOOD,
          ingredients: mockIngredients,
          preparationTimeInMinutes: mockPreparationTime,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: mockImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toSummaryView(productFood);
        expect(result.id).toBe(mockId);
        // type is not in summary view
      });

      it("should map DRINK type correctly (type not included in summary view)", () => {
        const productDrink = Product.rebuild({
          id: mockId,
          categoryId: mockCategoryId,
          name: mockName,
          description: mockDescription,
          price: mockPrice,
          type: ProductType.DRINK,
          ingredients: null,
          preparationTimeInMinutes: null,
          stockQuantity: mockStockQuantity,
          status: mockStatus,
          images: mockImages,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = ProductMapper.toSummaryView(productDrink);
        expect(result.id).toBe(mockId);
      });
    });
  });

  describe("comparison between mapping methods", () => {
    it("should have different field sets for each mapping method", () => {
      const plainObject = ProductMapper.toPlainObject(product);
      const detailView = ProductMapper.toDetailView(product, category);
      const summaryView = ProductMapper.toSummaryView(product);

      // toPlainObject has all fields
      expect(plainObject).toHaveProperty("categoryId");
      expect(plainObject).toHaveProperty("description");
      expect(plainObject).toHaveProperty("type");
      expect(plainObject).toHaveProperty("ingredients");
      expect(plainObject).toHaveProperty("preparationTimeInMinutes");
      expect(plainObject).toHaveProperty("stockQuantity");
      expect(plainObject).toHaveProperty("images");
      expect(plainObject).toHaveProperty("updatedAt");

      // toDetailView has category object
      expect(detailView).toHaveProperty("category");
      expect(detailView.category).toHaveProperty("id");
      expect(detailView.category).toHaveProperty("name");
      expect(detailView.category).toHaveProperty("description");
      expect(detailView.category).toHaveProperty("imageUrl");

      // toSummaryView has only limited fields
      expect(summaryView).toHaveProperty("primaryImageUrl");
      expect(summaryView).not.toHaveProperty("description");
      expect(summaryView).not.toHaveProperty("type");
      expect(summaryView).not.toHaveProperty("ingredients");
      expect(summaryView).not.toHaveProperty("preparationTimeInMinutes");
      expect(summaryView).not.toHaveProperty("stockQuantity");
      expect(summaryView).not.toHaveProperty("images");
      expect(summaryView).not.toHaveProperty("createdAt");
      expect(summaryView).not.toHaveProperty("updatedAt");
    });

    it("should have consistent id, name, price, status across all mappings", () => {
      const plainObject = ProductMapper.toPlainObject(product);
      const detailView = ProductMapper.toDetailView(product, category);
      const summaryView = ProductMapper.toSummaryView(product);

      expect(plainObject.id).toBe(detailView.id);
      expect(detailView.id).toBe(summaryView.id);

      expect(plainObject.name).toBe(detailView.name);
      expect(detailView.name).toBe(summaryView.name);

      expect(plainObject.price).toBe(detailView.price);
      expect(detailView.price).toBe(summaryView.price);

      expect(plainObject.status).toBe(detailView.status);
      expect(detailView.status).toBe(summaryView.status);
    });
  });

  describe("edge cases for toSummaryView", () => {
    it("should handle product with empty string image URL", () => {
      const emptyUrlImages = [
        {
          productId: mockId,
          url: "",
          altText: "Empty URL image",
          isPrimary: true,
          sortOrder: 1,
        },
      ];

      const productEmptyUrl = Product.rebuild({
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        description: mockDescription,
        price: mockPrice,
        type: mockType,
        ingredients: mockIngredients,
        preparationTimeInMinutes: mockPreparationTime,
        stockQuantity: mockStockQuantity,
        status: mockStatus,
        images: emptyUrlImages,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const result = ProductMapper.toSummaryView(productEmptyUrl);
      expect(result.primaryImageUrl).toBe("");
    });

    it("should handle product with null alt text in primary image", () => {
      const nullAltImages = [
        {
          productId: mockId,
          url: "https://example.com/image.jpg",
          altText: null as unknown as string,
          isPrimary: true,
          sortOrder: 1,
        },
      ];

      const productNullAlt = Product.rebuild({
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        description: mockDescription,
        price: mockPrice,
        type: mockType,
        ingredients: mockIngredients,
        preparationTimeInMinutes: mockPreparationTime,
        stockQuantity: mockStockQuantity,
        status: mockStatus,
        images: nullAltImages,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const result = ProductMapper.toSummaryView(productNullAlt);
      expect(result.primaryImageUrl).toBe("https://example.com/image.jpg");
    });
  });

  describe("immutability", () => {
    it("should not mutate the original product object when calling toPlainObject", () => {
      const originalId = product.getId();
      const originalName = product.getName();

      ProductMapper.toPlainObject(product);

      expect(product.getId()).toBe(originalId);
      expect(product.getName()).toBe(originalName);
    });

    it("should not mutate the original product object when calling toDetailView", () => {
      const originalId = product.getId();
      const originalName = product.getName();

      ProductMapper.toDetailView(product, category);

      expect(product.getId()).toBe(originalId);
      expect(product.getName()).toBe(originalName);
    });

    it("should not mutate the original product object when calling toSummaryView", () => {
      const originalId = product.getId();
      const originalName = product.getName();

      ProductMapper.toSummaryView(product);

      expect(product.getId()).toBe(originalId);
      expect(product.getName()).toBe(originalName);
    });

    it("should return new Date instances for each mapping call in toDetailView", () => {
      const result1 = ProductMapper.toDetailView(product, category);
      const result2 = ProductMapper.toDetailView(product, category);

      expect(result1.createdAt).not.toBe(result2.createdAt);
      expect(result1.updatedAt).not.toBe(result2.updatedAt);
      expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
      expect(result1.updatedAt.getTime()).toBe(result2.updatedAt.getTime());
    });

    it("should return new Date instances for each mapping call in toPlainObject", () => {
      const result1 = ProductMapper.toPlainObject(product);
      const result2 = ProductMapper.toPlainObject(product);

      expect(result1.createdAt).not.toBe(result2.createdAt);
      expect(result1.updatedAt).not.toBe(result2.updatedAt);
      expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
      expect(result1.updatedAt.getTime()).toBe(result2.updatedAt.getTime());
    });
  });

  describe("product state validation", () => {
    it("should correctly map product that can be ordered in detail view", () => {
      const result = ProductMapper.toDetailView(product, category);
      expect(result.status).toBe(ProductStatus.AVAILABLE);
      expect(result.stockQuantity).toBeGreaterThan(0);
    });

    it("should correctly map product that cannot be ordered (unavailable) in detail view", () => {
      const productUnavailable = Product.rebuild({
        id: mockId,
        categoryId: mockCategoryId,
        name: mockName,
        description: mockDescription,
        price: mockPrice,
        type: mockType,
        ingredients: mockIngredients,
        preparationTimeInMinutes: mockPreparationTime,
        stockQuantity: 5,
        status: ProductStatus.UNAVAILABLE,
        images: mockImages,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const result = ProductMapper.toDetailView(productUnavailable, category);
      expect(result.status).toBe(ProductStatus.UNAVAILABLE);
    });
  });
});
