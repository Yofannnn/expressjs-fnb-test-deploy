import { ProductCategoryReorderValidatorService } from "@/domain/services/product-category-reorder-validator.service";
import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryStatus } from "@/domain/types/product-category.type";
import {
  ProductCategoryDuplicateSortOrderException,
  ProductCategoryIncompleteReorderListException,
  UnknownProductCategoryInReorderException,
} from "@/domain/exceptions/product-category.exceptions";

describe("ProductCategoryReorderValidatorService", () => {
  const mockId1 = "category-1";
  const mockId2 = "category-2";
  const mockId3 = "category-3";
  const mockName1 = "Category 1";
  const mockName2 = "Category 2";
  const mockName3 = "Category 3";

  let mockCategory1: jest.Mocked<ProductCategory>;
  let mockCategory2: jest.Mocked<ProductCategory>;
  let mockCategory3: jest.Mocked<ProductCategory>;

  beforeEach(() => {
    mockCategory1 = {
      getId: jest.fn().mockReturnValue(mockId1),
      getName: jest.fn().mockReturnValue(mockName1),
      getDescription: jest.fn(),
      getImageUrl: jest.fn(),
      getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
      getSortOrder: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isCurrentlyActive: jest.fn(),
      rename: jest.fn(),
      changeDescription: jest.fn(),
      setImage: jest.fn(),
      reorder: jest.fn(),
      setStatus: jest.fn(),
      assertActive: jest.fn(),
    } as unknown as jest.Mocked<ProductCategory>;

    mockCategory2 = {
      getId: jest.fn().mockReturnValue(mockId2),
      getName: jest.fn().mockReturnValue(mockName2),
      getDescription: jest.fn(),
      getImageUrl: jest.fn(),
      getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
      getSortOrder: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isCurrentlyActive: jest.fn(),
      rename: jest.fn(),
      changeDescription: jest.fn(),
      setImage: jest.fn(),
      reorder: jest.fn(),
      setStatus: jest.fn(),
      assertActive: jest.fn(),
    } as unknown as jest.Mocked<ProductCategory>;

    mockCategory3 = {
      getId: jest.fn().mockReturnValue(mockId3),
      getName: jest.fn().mockReturnValue(mockName3),
      getDescription: jest.fn(),
      getImageUrl: jest.fn(),
      getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.ACTIVE),
      getSortOrder: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      isCurrentlyActive: jest.fn(),
      rename: jest.fn(),
      changeDescription: jest.fn(),
      setImage: jest.fn(),
      reorder: jest.fn(),
      setStatus: jest.fn(),
      assertActive: jest.fn(),
    } as unknown as jest.Mocked<ProductCategory>;
  });

  describe("assertValid", () => {
    describe("successful validation", () => {
      it("should not throw when payload matches all categories with unique sort orders", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 2 },
          { id: mockId3, sortOrder: 3 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();

        expect(mockCategory1.getId).toHaveBeenCalled();
        expect(mockCategory2.getId).toHaveBeenCalled();
        expect(mockCategory3.getId).toHaveBeenCalled();
      });

      it("should not throw when sort orders are not sequential", () => {
        const payload = [
          { id: mockId1, sortOrder: 5 },
          { id: mockId2, sortOrder: 10 },
          { id: mockId3, sortOrder: 15 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should not throw when sort orders are in descending order", () => {
        const payload = [
          { id: mockId1, sortOrder: 3 },
          { id: mockId2, sortOrder: 2 },
          { id: mockId3, sortOrder: 1 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should not throw when sort orders include zero", () => {
        const payload = [
          { id: mockId1, sortOrder: 0 },
          { id: mockId2, sortOrder: 1 },
          { id: mockId3, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should not throw when sort orders include negative numbers", () => {
        const payload = [
          { id: mockId1, sortOrder: -5 },
          { id: mockId2, sortOrder: -3 },
          { id: mockId3, sortOrder: -1 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should not throw when payload is in different order than allCategories", () => {
        const payload = [
          { id: mockId3, sortOrder: 1 },
          { id: mockId1, sortOrder: 2 },
          { id: mockId2, sortOrder: 3 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should not throw with single category", () => {
        const payload = [{ id: mockId1, sortOrder: 1 }];
        const allCategories = [mockCategory1];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should not throw with two categories", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should not throw with large sort order values", () => {
        const payload = [
          { id: mockId1, sortOrder: 999999 },
          { id: mockId2, sortOrder: 1000000 },
          { id: mockId3, sortOrder: 1000001 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should not throw with very large number of categories", () => {
        const categories = Array.from({ length: 100 }, (_, i) => {
          const mock = {
            getId: jest.fn().mockReturnValue(`category-${i}`),
            getName: jest.fn().mockReturnValue(`Category ${i}`),
          } as unknown as jest.Mocked<ProductCategory>;
          return mock;
        });

        const payload = categories.map((c, i) => ({
          id: c.getId(),
          sortOrder: i + 1,
        }));

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, categories);
        }).not.toThrow();
      });
    });

    describe("incomplete reorder list", () => {
      it("should throw ProductCategoryIncompleteReorderListException when payload has fewer items", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryIncompleteReorderListException);
      });

      it("should throw ProductCategoryIncompleteReorderListException when payload has more items", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 2 },
          { id: mockId3, sortOrder: 3 },
          { id: "extra-category", sortOrder: 4 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryIncompleteReorderListException);
      });

      it("should throw when payload is empty but categories exist", () => {
        const payload: Array<{ id: string; sortOrder: number }> = [];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryIncompleteReorderListException);
      });

      it("should throw with correct error message", () => {
        const payload = [{ id: mockId1, sortOrder: 1 }];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        try {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
          fail("Expected ProductCategoryIncompleteReorderListException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ProductCategoryIncompleteReorderListException);
          expect((error as ProductCategoryIncompleteReorderListException).message).toContain("Incomplete reorder list");
        }
      });
    });

    describe("unknown category in reorder", () => {
      it("should throw UnknownProductCategoryInReorderException when payload contains unknown ID", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: "unknown-category", sortOrder: 2 },
          { id: mockId3, sortOrder: 3 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(UnknownProductCategoryInReorderException);
      });

      it("should throw when payload contains ID that doesn't match any category", () => {
        const payload = [
          { id: "non-existent-1", sortOrder: 1 },
          { id: "non-existent-2", sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(UnknownProductCategoryInReorderException);
      });

      it("should throw when payload contains empty string ID", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: "", sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(UnknownProductCategoryInReorderException);
      });

      it("should throw when payload contains null ID", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: null as unknown as string, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(UnknownProductCategoryInReorderException);
      });

      it("should throw when payload contains undefined ID", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: undefined as unknown as string, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(UnknownProductCategoryInReorderException);
      });

      it("should throw with correct error message", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: "unknown-category", sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        try {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
          fail("Expected UnknownProductCategoryInReorderException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(UnknownProductCategoryInReorderException);
          expect((error as UnknownProductCategoryInReorderException).message).toContain("Unknown product category in reorder list");
        }
      });
    });

    describe("duplicate sort orders", () => {
      it("should throw ProductCategoryDuplicateSortOrderException when sort orders are duplicated", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 1 },
          { id: mockId3, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryDuplicateSortOrderException);
      });

      it("should throw when all sort orders are the same", () => {
        const payload = [
          { id: mockId1, sortOrder: 5 },
          { id: mockId2, sortOrder: 5 },
          { id: mockId3, sortOrder: 5 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryDuplicateSortOrderException);
      });

      it("should throw when duplicate sort orders are negative", () => {
        const payload = [
          { id: mockId1, sortOrder: -5 },
          { id: mockId2, sortOrder: -5 },
          { id: mockId3, sortOrder: -3 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryDuplicateSortOrderException);
      });

      it("should throw when duplicate sort orders are zero", () => {
        const payload = [
          { id: mockId1, sortOrder: 0 },
          { id: mockId2, sortOrder: 0 },
          { id: mockId3, sortOrder: 1 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryDuplicateSortOrderException);
      });

      it("should throw with correct error message", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 1 },
          { id: mockId3, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        try {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
          fail("Expected ProductCategoryDuplicateSortOrderException was not thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ProductCategoryDuplicateSortOrderException);
          expect((error as ProductCategoryDuplicateSortOrderException).message).toContain("Duplicate sort order");
        }
      });
    });

    describe("multiple validation failures", () => {
      it("should throw incomplete list error first when both incomplete and unknown", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: "unknown-category", sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryIncompleteReorderListException);
      });

      it("should throw incomplete list error first when both incomplete and duplicate", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 1 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryIncompleteReorderListException);
      });

      it("should throw unknown category error before duplicate sort order", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: "unknown-category", sortOrder: 1 },
          { id: mockId3, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(UnknownProductCategoryInReorderException);
      });
    });

    describe("edge cases", () => {
      it("should handle empty categories list with empty payload", () => {
        const payload: Array<{ id: string; sortOrder: number }> = [];
        const allCategories: ProductCategory[] = [];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should handle categories with different ID case sensitivity", () => {
        const payload = [
          { id: "CATEGORY-1", sortOrder: 1 },
          { id: "CATEGORY-2", sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        mockCategory1.getId.mockReturnValue("CATEGORY-1");
        mockCategory2.getId.mockReturnValue("CATEGORY-2");

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should handle categories with special characters in ID", () => {
        const specialId = "category-!@#$%^&*()";
        const mockCategory = {
          getId: jest.fn().mockReturnValue(specialId),
          getName: jest.fn(),
        } as unknown as jest.Mocked<ProductCategory>;

        const payload = [{ id: specialId, sortOrder: 1 }];
        const allCategories = [mockCategory];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should handle categories with UUID-like IDs", () => {
        const uuid1 = "123e4567-e89b-12d3-a456-426614174000";
        const uuid2 = "223e4567-e89b-12d3-a456-426614174001";

        const mockCategory1 = {
          getId: jest.fn().mockReturnValue(uuid1),
          getName: jest.fn(),
        } as unknown as jest.Mocked<ProductCategory>;

        const mockCategory2 = {
          getId: jest.fn().mockReturnValue(uuid2),
          getName: jest.fn(),
        } as unknown as jest.Mocked<ProductCategory>;

        const payload = [
          { id: uuid1, sortOrder: 1 },
          { id: uuid2, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });
    });

    describe("performance considerations", () => {
      it("should execute validation quickly", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 2 },
          { id: mockId3, sortOrder: 3 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        const startTime = Date.now();
        ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(100);
      });

      it("should handle multiple validations efficiently", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 2 },
          { id: mockId3, sortOrder: 3 },
        ];
        const allCategories = [mockCategory1, mockCategory2, mockCategory3];

        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });

      it("should handle large payload efficiently", () => {
        const categories = Array.from({ length: 1000 }, (_, i) => {
          const mock = {
            getId: jest.fn().mockReturnValue(`category-${i}`),
            getName: jest.fn().mockReturnValue(`Category ${i}`),
          } as unknown as jest.Mocked<ProductCategory>;
          return mock;
        });

        const payload = categories.map((c, i) => ({
          id: c.getId(),
          sortOrder: i + 1,
        }));

        const startTime = Date.now();
        ProductCategoryReorderValidatorService.assertValid(payload, categories);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(500);
      });
    });

    describe("type safety", () => {
      it("should accept array of payload objects", () => {
        const payload: Array<{ id: string; sortOrder: number }> = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should accept ProductCategory array", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 2 },
        ];
        const allCategories: ProductCategory[] = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should return void", () => {
        const payload = [{ id: mockId1, sortOrder: 1 }];
        const allCategories = [mockCategory1];

        const result = ProductCategoryReorderValidatorService.assertValid(payload, allCategories);

        expect(result).toBeUndefined();
      });
    });

    describe("integration scenarios", () => {
      it("should work with real ProductCategory entities", () => {
        const category1 = ProductCategory.create({
          id: mockId1,
          name: mockName1,
          sortOrder: 1,
        });
        const category2 = ProductCategory.create({
          id: mockId2,
          name: mockName2,
          sortOrder: 2,
        });
        const category3 = ProductCategory.create({
          id: mockId3,
          name: mockName3,
          sortOrder: 3,
        });

        const payload = [
          { id: mockId1, sortOrder: 3 },
          { id: mockId2, sortOrder: 1 },
          { id: mockId3, sortOrder: 2 },
        ];
        const allCategories = [category1, category2, category3];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });

      it("should work with real ProductCategory entities and detect duplicates", () => {
        const category1 = ProductCategory.create({
          id: mockId1,
          name: mockName1,
          sortOrder: 1,
        });
        const category2 = ProductCategory.create({
          id: mockId2,
          name: mockName2,
          sortOrder: 2,
        });

        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 1 },
        ];
        const allCategories = [category1, category2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryDuplicateSortOrderException);
      });

      it("should work with real ProductCategory entities and detect incomplete list", () => {
        const category1 = ProductCategory.create({
          id: mockId1,
          name: mockName1,
          sortOrder: 1,
        });
        const category2 = ProductCategory.create({
          id: mockId2,
          name: mockName2,
          sortOrder: 2,
        });

        const payload = [{ id: mockId1, sortOrder: 1 }];
        const allCategories = [category1, category2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryIncompleteReorderListException);
      });

      it("should work with real ProductCategory entities and detect unknown category", () => {
        const category1 = ProductCategory.create({
          id: mockId1,
          name: mockName1,
          sortOrder: 1,
        });
        const category2 = ProductCategory.create({
          id: mockId2,
          name: mockName2,
          sortOrder: 2,
        });

        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: "unknown-category", sortOrder: 2 },
        ];
        const allCategories = [category1, category2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(UnknownProductCategoryInReorderException);
      });

      it("should handle reorder with inactive categories", () => {
        const inactiveCategory = {
          getId: jest.fn().mockReturnValue(mockId1),
          getName: jest.fn().mockReturnValue(mockName1),
          getStatus: jest.fn().mockReturnValue(ProductCategoryStatus.INACTIVE),
        } as unknown as jest.Mocked<ProductCategory>;

        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 2 },
        ];
        const allCategories = [inactiveCategory, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).not.toThrow();
      });
    });

    describe("validation order", () => {
      it("should check length first", () => {
        const payload = [{ id: mockId1, sortOrder: 1 }];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryIncompleteReorderListException);

        expect(mockCategory1.getId).not.toHaveBeenCalled();
        expect(mockCategory2.getId).not.toHaveBeenCalled();
      });

      it("should check unknown IDs after length check", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: "unknown", sortOrder: 2 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(UnknownProductCategoryInReorderException);

        expect(mockCategory1.getId).toHaveBeenCalled();
        expect(mockCategory2.getId).toHaveBeenCalled();
      });

      it("should check duplicate sort orders after unknown IDs", () => {
        const payload = [
          { id: mockId1, sortOrder: 1 },
          { id: mockId2, sortOrder: 1 },
        ];
        const allCategories = [mockCategory1, mockCategory2];

        expect(() => {
          ProductCategoryReorderValidatorService.assertValid(payload, allCategories);
        }).toThrow(ProductCategoryDuplicateSortOrderException);

        expect(mockCategory1.getId).toHaveBeenCalled();
        expect(mockCategory2.getId).toHaveBeenCalled();
      });
    });
  });
});
