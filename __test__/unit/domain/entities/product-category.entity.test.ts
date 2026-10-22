import { ProductCategory } from "@/domain/entities/product-category.entity";
import { ProductCategoryCreationData, ProductCategoryRebuildData, ProductCategoryStatus } from "@/domain/types/product-category.type";

describe("ProductCategory", () => {
  const mockId = "cat-123";
  const mockName = "Electronics";
  const mockDescription = "All electronic products";
  const mockImageUrl = "https://example.com/category.jpg";
  const mockStatus = ProductCategoryStatus.ACTIVE;
  const mockSortOrder = 5;
  const mockCreatedAt = new Date("2024-01-01T00:00:00Z");
  const mockUpdatedAt = new Date("2024-01-01T00:00:00Z");

  describe("constructor and getters", () => {
    it("should create a ProductCategory instance with all properties", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      expect(category.getId()).toBe(mockId);
      expect(category.getName()).toBe(mockName);
      expect(category.getDescription()).toBe(mockDescription);
      expect(category.getImageUrl()).toBe(mockImageUrl);
      expect(category.getStatus()).toBe(mockStatus);
      expect(category.getSortOrder()).toBe(mockSortOrder);
      expect(category.getCreatedAt()).toEqual(mockCreatedAt);
      expect(category.getUpdatedAt()).toEqual(mockUpdatedAt);
    });

    it("should handle null description", () => {
      const category = new ProductCategory(mockId, mockName, null, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      expect(category.getDescription()).toBeNull();
    });

    it("should handle null imageUrl", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, null, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      expect(category.getImageUrl()).toBeNull();
    });

    it("should handle different statuses", () => {
      const inactiveCategory = new ProductCategory(
        mockId,
        mockName,
        mockDescription,
        mockImageUrl,
        ProductCategoryStatus.INACTIVE,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(inactiveCategory.getStatus()).toBe(ProductCategoryStatus.INACTIVE);
    });

    it("should return a new Date instance from getCreatedAt", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const createdAt = category.getCreatedAt();
      expect(createdAt).toEqual(mockCreatedAt);
      expect(createdAt).not.toBe(mockCreatedAt);
    });

    it("should return a new Date instance from getUpdatedAt", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const updatedAt = category.getUpdatedAt();
      expect(updatedAt).toEqual(mockUpdatedAt);
      expect(updatedAt).not.toBe(mockUpdatedAt);
    });

    it("should handle undefined values when using constructor with undefined", () => {
      const category = new ProductCategory(
        mockId,
        mockName,
        undefined as unknown as null,
        undefined as unknown as null,
        mockStatus,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(category.getDescription()).toBe(undefined);
      expect(category.getImageUrl()).toBe(undefined);
    });
  });

  describe("isCurrentlyActive", () => {
    it("should return true when status is ACTIVE", () => {
      const category = new ProductCategory(
        mockId,
        mockName,
        mockDescription,
        mockImageUrl,
        ProductCategoryStatus.ACTIVE,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(category.isCurrentlyActive()).toBe(true);
    });

    it("should return false when status is INACTIVE", () => {
      const category = new ProductCategory(
        mockId,
        mockName,
        mockDescription,
        mockImageUrl,
        ProductCategoryStatus.INACTIVE,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(category.isCurrentlyActive()).toBe(false);
    });
  });

  describe("rename", () => {
    it("should update the name and touch updatedAt", async () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const newName = "Home Appliances";
      const oldUpdatedAt = category.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));

      category.rename(newName);

      expect(category.getName()).toBe(newName);
      expect(category.getUpdatedAt()).not.toEqual(oldUpdatedAt);
      expect(category.getUpdatedAt().getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });

    it("should update name while preserving other properties", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const newName = "New Category Name";
      category.rename(newName);

      expect(category.getId()).toBe(mockId);
      expect(category.getDescription()).toBe(mockDescription);
      expect(category.getImageUrl()).toBe(mockImageUrl);
      expect(category.getStatus()).toBe(mockStatus);
      expect(category.getSortOrder()).toBe(mockSortOrder);
      expect(category.getCreatedAt()).toEqual(mockCreatedAt);
    });

    it("should handle empty string name", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.rename("");
      expect(category.getName()).toBe("");
    });
  });

  describe("changeDescription", () => {
    it("should update description from null to a value", () => {
      const category = new ProductCategory(mockId, mockName, null, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const newDescription = "New description";
      category.changeDescription(newDescription);

      expect(category.getDescription()).toBe(newDescription);
    });

    it("should update description from a value to null", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.changeDescription(null);

      expect(category.getDescription()).toBeNull();
    });

    it("should update description and touch updatedAt", async () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const newDescription = "Updated description";
      const oldUpdatedAt = category.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));

      category.changeDescription(newDescription);

      expect(category.getDescription()).toBe(newDescription);
      expect(category.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should preserve other properties when changing description", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.changeDescription("New description");

      expect(category.getId()).toBe(mockId);
      expect(category.getName()).toBe(mockName);
      expect(category.getImageUrl()).toBe(mockImageUrl);
      expect(category.getStatus()).toBe(mockStatus);
      expect(category.getSortOrder()).toBe(mockSortOrder);
    });

    it("should handle empty string description", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.changeDescription("");
      expect(category.getDescription()).toBe("");
    });
  });

  describe("setImage", () => {
    it("should update imageUrl from null to a value", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, null, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const newImageUrl = "https://example.com/new-image.jpg";
      category.setImage(newImageUrl);

      expect(category.getImageUrl()).toBe(newImageUrl);
    });

    it("should update imageUrl from a value to another", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const newImageUrl = "https://example.com/updated-image.jpg";
      category.setImage(newImageUrl);

      expect(category.getImageUrl()).toBe(newImageUrl);
    });

    it("should update imageUrl and touch updatedAt", async () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const newImageUrl = "https://example.com/new-image.jpg";
      const oldUpdatedAt = category.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));

      category.setImage(newImageUrl);

      expect(category.getImageUrl()).toBe(newImageUrl);
      expect(category.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should preserve other properties when setting image", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.setImage("https://example.com/new-image.jpg");

      expect(category.getId()).toBe(mockId);
      expect(category.getName()).toBe(mockName);
      expect(category.getDescription()).toBe(mockDescription);
      expect(category.getStatus()).toBe(mockStatus);
      expect(category.getSortOrder()).toBe(mockSortOrder);
    });

    it("should handle empty string imageUrl", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.setImage("");
      expect(category.getImageUrl()).toBe("");
    });
  });

  describe("reorder", () => {
    it("should update sortOrder", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const newSortOrder = 10;
      category.reorder(newSortOrder);

      expect(category.getSortOrder()).toBe(newSortOrder);
    });

    it("should update sortOrder and touch updatedAt", async () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const newSortOrder = 20;
      const oldUpdatedAt = category.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));

      category.reorder(newSortOrder);

      expect(category.getSortOrder()).toBe(newSortOrder);
      expect(category.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should handle zero sortOrder", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.reorder(0);

      expect(category.getSortOrder()).toBe(0);
    });

    it("should handle negative sortOrder", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.reorder(-5);

      expect(category.getSortOrder()).toBe(-5);
    });

    it("should preserve other properties when reordering", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.reorder(15);

      expect(category.getId()).toBe(mockId);
      expect(category.getName()).toBe(mockName);
      expect(category.getDescription()).toBe(mockDescription);
      expect(category.getImageUrl()).toBe(mockImageUrl);
      expect(category.getStatus()).toBe(mockStatus);
      expect(category.getCreatedAt()).toEqual(mockCreatedAt);
    });

    it("should handle decimal sortOrder by truncating", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.reorder(5.7);
      expect(category.getSortOrder()).toBe(5.7);
    });
  });

  describe("setStatus", () => {
    it("should update status from ACTIVE to INACTIVE", () => {
      const category = new ProductCategory(
        mockId,
        mockName,
        mockDescription,
        mockImageUrl,
        ProductCategoryStatus.ACTIVE,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      category.setStatus(ProductCategoryStatus.INACTIVE);

      expect(category.getStatus()).toBe(ProductCategoryStatus.INACTIVE);
      expect(category.isCurrentlyActive()).toBe(false);
    });

    it("should update status from INACTIVE to ACTIVE", () => {
      const category = new ProductCategory(
        mockId,
        mockName,
        mockDescription,
        mockImageUrl,
        ProductCategoryStatus.INACTIVE,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      category.setStatus(ProductCategoryStatus.ACTIVE);

      expect(category.getStatus()).toBe(ProductCategoryStatus.ACTIVE);
      expect(category.isCurrentlyActive()).toBe(true);
    });

    it("should set status to same value without issues", () => {
      const category = new ProductCategory(
        mockId,
        mockName,
        mockDescription,
        mockImageUrl,
        ProductCategoryStatus.ACTIVE,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      category.setStatus(ProductCategoryStatus.ACTIVE);

      expect(category.getStatus()).toBe(ProductCategoryStatus.ACTIVE);
      expect(category.isCurrentlyActive()).toBe(true);
    });

    it("should update status and touch updatedAt", async () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const oldUpdatedAt = category.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));

      category.setStatus(ProductCategoryStatus.INACTIVE);

      expect(category.getStatus()).toBe(ProductCategoryStatus.INACTIVE);
      expect(category.getUpdatedAt()).not.toEqual(oldUpdatedAt);
    });

    it("should preserve other properties when setting status", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.setStatus(ProductCategoryStatus.INACTIVE);

      expect(category.getId()).toBe(mockId);
      expect(category.getName()).toBe(mockName);
      expect(category.getDescription()).toBe(mockDescription);
      expect(category.getImageUrl()).toBe(mockImageUrl);
      expect(category.getSortOrder()).toBe(mockSortOrder);
      expect(category.getCreatedAt()).toEqual(mockCreatedAt);
    });
  });

  describe("private touch method", () => {
    it("should update updatedAt when any mutation method is called", async () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.getUpdatedAt();

      await new Promise((resolve) => setTimeout(resolve, 1));

      const methods = [
        () => category.rename("New Name"),
        () => category.changeDescription("New Description"),
        () => category.setImage("https://example.com/new.jpg"),
        () => category.reorder(10),
        () => category.setStatus(ProductCategoryStatus.INACTIVE),
      ];

      for (const method of methods) {
        const before = category.getUpdatedAt();
        await new Promise((resolve) => setTimeout(resolve, 1));
        method();
        const after = category.getUpdatedAt();
        expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
      }
    });

    it("should update updatedAt only when mutations are called, not on getters", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const initialUpdatedAt = category.getUpdatedAt();

      category.getId();
      category.getName();
      category.getDescription();
      category.getImageUrl();
      category.getStatus();
      category.getSortOrder();
      category.getCreatedAt();
      category.getUpdatedAt();
      category.isCurrentlyActive();

      expect(category.getUpdatedAt()).toEqual(initialUpdatedAt);
    });
  });

  describe("static create", () => {
    it("should create a ProductCategory with all provided data", () => {
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        description: mockDescription,
        imageUrl: mockImageUrl,
        sortOrder: mockSortOrder,
      };

      const category = ProductCategory.create(creationData);

      expect(category.getId()).toBe(mockId);
      expect(category.getName()).toBe(mockName);
      expect(category.getDescription()).toBe(mockDescription);
      expect(category.getImageUrl()).toBe(mockImageUrl);
      expect(category.getStatus()).toBe(ProductCategoryStatus.ACTIVE);
      expect(category.getSortOrder()).toBe(mockSortOrder);
      expect(category.getCreatedAt()).toBeInstanceOf(Date);
      expect(category.getUpdatedAt()).toBeInstanceOf(Date);
      expect(category.getCreatedAt().getTime()).toBeCloseTo(Date.now(), -3);
      expect(category.isCurrentlyActive()).toBe(true);
    });

    it("should create a ProductCategory with default values when optional fields are omitted", () => {
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        sortOrder: 1,
      };

      const category = ProductCategory.create(creationData);

      expect(category.getId()).toBe(mockId);
      expect(category.getName()).toBe(mockName);
      expect(category.getDescription()).toBeNull();
      expect(category.getImageUrl()).toBeNull();
      expect(category.getStatus()).toBe(ProductCategoryStatus.ACTIVE);
      expect(category.getSortOrder()).toBe(1);
      expect(category.getCreatedAt()).toBeInstanceOf(Date);
      expect(category.getUpdatedAt()).toBeInstanceOf(Date);
      expect(category.isCurrentlyActive()).toBe(true);
    });

    it("should create a ProductCategory with description set to null when undefined", () => {
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        description: undefined,
        sortOrder: 1,
      };

      const category = ProductCategory.create(creationData);

      expect(category.getDescription()).toBeNull();
    });

    it("should create a ProductCategory with imageUrl set to null when undefined", () => {
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        imageUrl: undefined,
        sortOrder: 1,
      };

      const category = ProductCategory.create(creationData);

      expect(category.getImageUrl()).toBeNull();
    });

    it("should create a ProductCategory with default sortOrder 1", () => {
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        sortOrder: 1,
      };

      const category = ProductCategory.create(creationData);

      expect(category.getSortOrder()).toBe(1);
    });

    it("should create a ProductCategory with status ACTIVE by default", () => {
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        sortOrder: 1,
      };

      const category = ProductCategory.create(creationData);

      expect(category.getStatus()).toBe(ProductCategoryStatus.ACTIVE);
    });

    it("should create a ProductCategory with createdAt and updatedAt set to current time", () => {
      const before = new Date();
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        sortOrder: 1,
      };
      const category = ProductCategory.create(creationData);
      const after = new Date();

      expect(category.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(category.getCreatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
      expect(category.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(category.getUpdatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should handle sortOrder 0 when provided", () => {
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        sortOrder: 0,
      };

      const category = ProductCategory.create(creationData);
      expect(category.getSortOrder()).toBe(0);
    });

    it("should handle negative sortOrder when provided", () => {
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        sortOrder: -5,
      };

      const category = ProductCategory.create(creationData);
      expect(category.getSortOrder()).toBe(-5);
    });
  });

  describe("static rebuild", () => {
    it("should rebuild a ProductCategory from rebuild data", () => {
      const rebuildData: ProductCategoryRebuildData = {
        id: mockId,
        name: mockName,
        description: mockDescription,
        imageUrl: mockImageUrl,
        status: mockStatus,
        sortOrder: mockSortOrder,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const category = ProductCategory.rebuild(rebuildData);

      expect(category.getId()).toBe(mockId);
      expect(category.getName()).toBe(mockName);
      expect(category.getDescription()).toBe(mockDescription);
      expect(category.getImageUrl()).toBe(mockImageUrl);
      expect(category.getStatus()).toBe(mockStatus);
      expect(category.getSortOrder()).toBe(mockSortOrder);
      expect(category.getCreatedAt()).toEqual(mockCreatedAt);
      expect(category.getUpdatedAt()).toEqual(mockUpdatedAt);
    });

    it("should rebuild a ProductCategory with null description", () => {
      const rebuildData: ProductCategoryRebuildData = {
        id: mockId,
        name: mockName,
        description: null,
        imageUrl: mockImageUrl,
        status: mockStatus,
        sortOrder: mockSortOrder,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const category = ProductCategory.rebuild(rebuildData);

      expect(category.getDescription()).toBeNull();
    });

    it("should rebuild a ProductCategory with null imageUrl", () => {
      const rebuildData: ProductCategoryRebuildData = {
        id: mockId,
        name: mockName,
        description: mockDescription,
        imageUrl: null,
        status: mockStatus,
        sortOrder: mockSortOrder,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const category = ProductCategory.rebuild(rebuildData);

      expect(category.getImageUrl()).toBeNull();
    });

    it("should rebuild a ProductCategory with different statuses", () => {
      const statuses = [ProductCategoryStatus.ACTIVE, ProductCategoryStatus.INACTIVE];

      for (const status of statuses) {
        const rebuildData: ProductCategoryRebuildData = {
          id: mockId,
          name: mockName,
          description: mockDescription,
          imageUrl: mockImageUrl,
          status: status,
          sortOrder: mockSortOrder,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        };

        const category = ProductCategory.rebuild(rebuildData);
        expect(category.getStatus()).toBe(status);
      }
    });

    it("should preserve the exact Date instances when rebuilding", () => {
      const rebuildData: ProductCategoryRebuildData = {
        id: mockId,
        name: mockName,
        description: mockDescription,
        imageUrl: mockImageUrl,
        status: mockStatus,
        sortOrder: mockSortOrder,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const category = ProductCategory.rebuild(rebuildData);

      expect(category.getCreatedAt()).toEqual(mockCreatedAt);
      expect(category.getUpdatedAt()).toEqual(mockUpdatedAt);
    });

    it("should preserve the exact Date instances (reference equality check)", () => {
      const rebuildData: ProductCategoryRebuildData = {
        id: mockId,
        name: mockName,
        description: mockDescription,
        imageUrl: mockImageUrl,
        status: mockStatus,
        sortOrder: mockSortOrder,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const category = ProductCategory.rebuild(rebuildData);

      expect(category.getCreatedAt().getTime()).toBe(mockCreatedAt.getTime());
      expect(category.getUpdatedAt().getTime()).toBe(mockUpdatedAt.getTime());
    });

    it("should rebuild with empty string fields correctly", () => {
      const rebuildData: ProductCategoryRebuildData = {
        id: mockId,
        name: "",
        description: "",
        imageUrl: "",
        status: mockStatus,
        sortOrder: mockSortOrder,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      };

      const category = ProductCategory.rebuild(rebuildData);

      expect(category.getName()).toBe("");
      expect(category.getDescription()).toBe("");
      expect(category.getImageUrl()).toBe("");
    });
  });

  describe("integration and usage scenarios", () => {
    it("should handle a complete lifecycle of a category", () => {
      const category = ProductCategory.create({
        id: mockId,
        name: "New Category",
        description: "Initial description",
        imageUrl: "https://example.com/initial.jpg",
        sortOrder: 1,
      });

      expect(category.isCurrentlyActive()).toBe(true);

      const initialUpdatedAt = category.getUpdatedAt();

      category.rename("Updated Category");
      category.changeDescription("Updated description");
      category.setImage("https://example.com/updated.jpg");
      category.reorder(2);

      expect(category.getName()).toBe("Updated Category");
      expect(category.getDescription()).toBe("Updated description");
      expect(category.getImageUrl()).toBe("https://example.com/updated.jpg");
      expect(category.getSortOrder()).toBe(2);

      category.setStatus(ProductCategoryStatus.INACTIVE);
      expect(category.isCurrentlyActive()).toBe(false);
      expect(category.getStatus()).toBe(ProductCategoryStatus.INACTIVE);

      category.setStatus(ProductCategoryStatus.ACTIVE);
      expect(category.isCurrentlyActive()).toBe(true);
      expect(category.getStatus()).toBe(ProductCategoryStatus.ACTIVE);

      expect(category.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it("should handle multiple updates in quick succession", async () => {
      const category = ProductCategory.create({
        id: mockId,
        name: "Test Category",
        description: "Initial description",
        sortOrder: 1,
      });

      const timestamps: Date[] = [];

      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        category.rename(`Category ${i}`);
        timestamps.push(category.getUpdatedAt());
      }

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(timestamps[i - 1].getTime());
      }
    });

    it("should maintain data consistency when multiple properties are updated", () => {
      const category = ProductCategory.create({
        id: mockId,
        name: "Original Name",
        description: "Original Description",
        sortOrder: 1,
      });

      category.rename("New Name");
      category.changeDescription("New Description");
      category.setImage("https://example.com/image.jpg");
      category.reorder(5);
      category.setStatus(ProductCategoryStatus.INACTIVE);

      expect(category.getName()).toBe("New Name");
      expect(category.getDescription()).toBe("New Description");
      expect(category.getImageUrl()).toBe("https://example.com/image.jpg");
      expect(category.getSortOrder()).toBe(5);
      expect(category.getStatus()).toBe(ProductCategoryStatus.INACTIVE);
      expect(category.isCurrentlyActive()).toBe(false);

      expect(category.getId()).toBe(mockId);
      expect(category.getCreatedAt()).toBeInstanceOf(Date);
    });

    it("should handle toggling status back and forth", () => {
      const category = ProductCategory.create({
        id: mockId,
        name: "Toggle Category",
        sortOrder: undefined as unknown as number,
      });

      expect(category.isCurrentlyActive()).toBe(true);

      category.setStatus(ProductCategoryStatus.INACTIVE);
      expect(category.isCurrentlyActive()).toBe(false);

      category.setStatus(ProductCategoryStatus.ACTIVE);
      expect(category.isCurrentlyActive()).toBe(true);

      category.setStatus(ProductCategoryStatus.INACTIVE);
      expect(category.isCurrentlyActive()).toBe(false);

      category.setStatus(ProductCategoryStatus.ACTIVE);
      expect(category.isCurrentlyActive()).toBe(true);
    });

    it("should handle chaining operations and maintain correct state", () => {
      const category = ProductCategory.create({
        id: mockId,
        name: "Test",
        sortOrder: 1,
      });

      category.rename("Test 2");
      category.setStatus(ProductCategoryStatus.INACTIVE);
      category.changeDescription("New desc");
      category.reorder(10);
      category.setImage("https://example.com/img.jpg");

      expect(category.getName()).toBe("Test 2");
      expect(category.getStatus()).toBe(ProductCategoryStatus.INACTIVE);
      expect(category.getDescription()).toBe("New desc");
      expect(category.getSortOrder()).toBe(10);
      expect(category.getImageUrl()).toBe("https://example.com/img.jpg");
      expect(category.isCurrentlyActive()).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string name", () => {
      const category = new ProductCategory(mockId, "", mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      expect(category.getName()).toBe("");
    });

    it("should handle empty string description", () => {
      const category = new ProductCategory(mockId, mockName, "", mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      expect(category.getDescription()).toBe("");
    });

    it("should handle empty string imageUrl", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, "", mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      expect(category.getImageUrl()).toBe("");
    });

    it("should handle very long strings", () => {
      const longString = "a".repeat(1000);
      const category = new ProductCategory(mockId, longString, longString, longString, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      expect(category.getName()).toBe(longString);
      expect(category.getDescription()).toBe(longString);
      expect(category.getImageUrl()).toBe(longString);
    });

    it("should handle special characters in strings", () => {
      const specialString = '!@#$%^&*()_+{}|:"<>?~`';
      const category = new ProductCategory(
        mockId,
        specialString,
        specialString,
        specialString,
        mockStatus,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(category.getName()).toBe(specialString);
      expect(category.getDescription()).toBe(specialString);
      expect(category.getImageUrl()).toBe(specialString);
    });

    it("should handle Unicode/emoji characters", () => {
      const unicodeString = "🚀 Category with emoji 🎉";
      const category = new ProductCategory(
        mockId,
        unicodeString,
        unicodeString,
        unicodeString,
        mockStatus,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      expect(category.getName()).toBe(unicodeString);
      expect(category.getDescription()).toBe(unicodeString);
      expect(category.getImageUrl()).toBe(unicodeString);
    });

    it("should handle very large sortOrder numbers", () => {
      const largeSortOrder = Number.MAX_SAFE_INTEGER;
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, largeSortOrder, mockCreatedAt, mockUpdatedAt);

      expect(category.getSortOrder()).toBe(largeSortOrder);
    });

    it("should handle null values in mutation methods", () => {
      const category = new ProductCategory(
        mockId,
        mockName,
        "Initial description",
        "https://example.com/image.jpg",
        mockStatus,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      category.changeDescription(null);
      expect(category.getDescription()).toBeNull();
    });

    it("should handle undefined values in mutation methods", () => {
      const category = new ProductCategory(
        mockId,
        mockName,
        "Initial description",
        "https://example.com/image.jpg",
        mockStatus,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      category.changeDescription(undefined as unknown as null);
      expect(category.getDescription()).toBe(undefined);
    });

    it("should handle null imageUrl in setImage", () => {
      const category = new ProductCategory(
        mockId,
        mockName,
        mockDescription,
        "https://example.com/image.jpg",
        mockStatus,
        mockSortOrder,
        mockCreatedAt,
        mockUpdatedAt,
      );

      category.setImage(null as unknown as string);
      expect(category.getImageUrl()).toBe(null);
    });

    it("should handle non-integer sortOrder values", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      category.reorder(5.7);
      expect(category.getSortOrder()).toBe(5.7);

      category.reorder(-3.14);
      expect(category.getSortOrder()).toBe(-3.14);
    });

    it("should handle Date objects with different timezones", () => {
      const differentTzDate = new Date("2024-01-01T00:00:00+05:00");
      const category = new ProductCategory(
        mockId,
        mockName,
        mockDescription,
        mockImageUrl,
        mockStatus,
        mockSortOrder,
        differentTzDate,
        differentTzDate,
      );

      expect(category.getCreatedAt()).toEqual(differentTzDate);
      expect(category.getUpdatedAt()).toEqual(differentTzDate);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle rename with very long name", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const veryLongName = "a".repeat(2000);
      category.rename(veryLongName);
      expect(category.getName()).toBe(veryLongName);
    });

    it("should handle multiple consecutive reorders", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const orders = [1, 5, 10, 3, 7];
      const timestamps: Date[] = [];

      for (const order of orders) {
        category.reorder(order);
        timestamps.push(category.getUpdatedAt());
      }

      expect(category.getSortOrder()).toBe(7);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(timestamps[i - 1].getTime());
      }
    });

    it("should handle multiple consecutive status changes", () => {
      const category = new ProductCategory(mockId, mockName, mockDescription, mockImageUrl, mockStatus, mockSortOrder, mockCreatedAt, mockUpdatedAt);

      const statuses = [ProductCategoryStatus.INACTIVE, ProductCategoryStatus.ACTIVE, ProductCategoryStatus.INACTIVE, ProductCategoryStatus.ACTIVE];

      for (const status of statuses) {
        category.setStatus(status);
        expect(category.getStatus()).toBe(status);
      }
    });

    it("should handle creation with explicit null values", () => {
      const creationData: ProductCategoryCreationData = {
        id: mockId,
        name: mockName,
        description: null as unknown as undefined,
        imageUrl: null as unknown as undefined,
        sortOrder: 5,
      };

      const category = ProductCategory.create(creationData);

      expect(category.getDescription()).toBeNull();
      expect(category.getImageUrl()).toBeNull();
      expect(category.getSortOrder()).toBe(5);
      expect(category.getStatus()).toBe(ProductCategoryStatus.ACTIVE);
    });
  });
});
