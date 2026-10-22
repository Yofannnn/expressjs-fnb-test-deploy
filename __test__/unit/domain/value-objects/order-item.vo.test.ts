import { OrderItem } from "@/domain/value-objects/order-item.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { OrderItemCreationData, OrderItemRebuildData } from "@/domain/types/order.type";
import { InvalidNumericArgumentException } from "@/domain/exceptions/invalid-argument.exceptions";

describe("OrderItem", () => {
  describe("constructor", () => {
    it("should create an OrderItem instance with all valid data", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 2, "Extra notes");

      expect(orderItem).toBeInstanceOf(OrderItem);
      expect(orderItem.getProductId()).toBe("product-123");
      expect(orderItem.getProductName()).toBe("Test Product");
      expect(orderItem.getPriceSnapshot()).toBe(priceSnapshot);
      expect(orderItem.getQuantity()).toBe(2);
      expect(orderItem.getNote()).toBe("Extra notes");
    });

    it("should create an OrderItem instance with null note", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 2, null);

      expect(orderItem.getNote()).toBeNull();
    });

    it("should handle zero quantity", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 0, null);

      expect(orderItem.getQuantity()).toBe(0);
    });

    it("should handle negative quantity", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, -1, null);

      expect(orderItem.getQuantity()).toBe(-1);
    });

    it("should handle empty product ID", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("", "Test Product", priceSnapshot, 2, null);

      expect(orderItem.getProductId()).toBe("");
    });

    it("should handle empty product name", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "", priceSnapshot, 2, null);

      expect(orderItem.getProductName()).toBe("");
    });

    it("should handle empty note", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 2, "");

      expect(orderItem.getNote()).toBe("");
    });
  });

  describe("create", () => {
    it("should create an OrderItem from creation data", () => {
      const data: OrderItemCreationData = {
        productId: "product-456",
        productName: "Another Product",
        priceSnapshot: 150000,
        quantity: 3,
        note: "Special instructions",
      };

      const orderItem = OrderItem.create(data);

      expect(orderItem).toBeInstanceOf(OrderItem);
      expect(orderItem.getProductId()).toBe("product-456");
      expect(orderItem.getProductName()).toBe("Another Product");
      expect(orderItem.getPriceSnapshot()).toBeInstanceOf(Money);
      expect(orderItem.getPriceSnapshot().getAmount()).toBe(150000);
      expect(orderItem.getQuantity()).toBe(3);
      expect(orderItem.getNote()).toBe("Special instructions");
    });

    it("should create an OrderItem with null note when note is undefined", () => {
      const data: OrderItemCreationData = {
        productId: "product-456",
        productName: "Another Product",
        priceSnapshot: 150000,
        quantity: 3,
      };

      const orderItem = OrderItem.create(data);

      expect(orderItem.getNote()).toBeNull();
    });

    it("should create an OrderItem with null note when note is null", () => {
      const data: OrderItemCreationData = {
        productId: "product-456",
        productName: "Another Product",
        priceSnapshot: 150000,
        quantity: 3,
        note: null as unknown as undefined,
      };

      const orderItem = OrderItem.create(data);

      expect(orderItem.getNote()).toBeNull();
    });

    it("should create an OrderItem with empty string note", () => {
      const data: OrderItemCreationData = {
        productId: "product-456",
        productName: "Another Product",
        priceSnapshot: 150000,
        quantity: 3,
        note: "",
      };

      const orderItem = OrderItem.create(data);

      expect(orderItem.getNote()).toBe(null);
    });

    it("should create Money instance from price snapshot number", () => {
      const data: OrderItemCreationData = {
        productId: "product-456",
        productName: "Another Product",
        priceSnapshot: 150000,
        quantity: 3,
      };

      const orderItem = OrderItem.create(data);
      const priceSnapshot = orderItem.getPriceSnapshot();

      expect(priceSnapshot).toBeInstanceOf(Money);
      expect(priceSnapshot.getAmount()).toBe(150000);
    });

    it("should return a new OrderItem instance", () => {
      const data: OrderItemCreationData = {
        productId: "product-456",
        productName: "Another Product",
        priceSnapshot: 150000,
        quantity: 3,
      };

      const orderItem = OrderItem.create(data);
      expect(orderItem).toBeInstanceOf(OrderItem);
    });
  });

  describe("rebuild", () => {
    it("should rebuild an OrderItem from rebuild data", () => {
      const data: OrderItemRebuildData = {
        productId: "product-789",
        productName: "Rebuilt Product",
        priceSnapshot: 200000,
        quantity: 5,
        note: "Rebuilt note",
      };

      const orderItem = OrderItem.rebuild(data);

      expect(orderItem).toBeInstanceOf(OrderItem);
      expect(orderItem.getProductId()).toBe("product-789");
      expect(orderItem.getProductName()).toBe("Rebuilt Product");
      expect(orderItem.getPriceSnapshot()).toBeInstanceOf(Money);
      expect(orderItem.getPriceSnapshot().getAmount()).toBe(200000);
      expect(orderItem.getQuantity()).toBe(5);
      expect(orderItem.getNote()).toBe("Rebuilt note");
    });

    it("should rebuild with null note", () => {
      const data: OrderItemRebuildData = {
        productId: "product-789",
        productName: "Rebuilt Product",
        priceSnapshot: 200000,
        quantity: 5,
        note: null,
      };

      const orderItem = OrderItem.rebuild(data);
      expect(orderItem.getNote()).toBeNull();
    });

    it("should rebuild with empty string note", () => {
      const data: OrderItemRebuildData = {
        productId: "product-789",
        productName: "Rebuilt Product",
        priceSnapshot: 200000,
        quantity: 5,
        note: "",
      };

      const orderItem = OrderItem.rebuild(data);
      expect(orderItem.getNote()).toBe("");
    });

    it("should return a new OrderItem instance", () => {
      const data: OrderItemRebuildData = {
        productId: "product-789",
        productName: "Rebuilt Product",
        priceSnapshot: 200000,
        quantity: 5,
        note: null,
      };

      const orderItem = OrderItem.rebuild(data);
      expect(orderItem).toBeInstanceOf(OrderItem);
    });
  });

  describe("getters", () => {
    it("should return product ID", () => {
      const orderItem = new OrderItem("product-123", "Test Product", new Money(100000), 2, null);
      expect(orderItem.getProductId()).toBe("product-123");
    });

    it("should return product name", () => {
      const orderItem = new OrderItem("product-123", "Test Product", new Money(100000), 2, null);
      expect(orderItem.getProductName()).toBe("Test Product");
    });

    it("should return price snapshot", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 2, null);
      expect(orderItem.getPriceSnapshot()).toBe(priceSnapshot);
    });

    it("should return quantity", () => {
      const orderItem = new OrderItem("product-123", "Test Product", new Money(100000), 2, null);
      expect(orderItem.getQuantity()).toBe(2);
    });

    it("should return note", () => {
      const orderItem = new OrderItem("product-123", "Test Product", new Money(100000), 2, "Test note");
      expect(orderItem.getNote()).toBe("Test note");
    });

    it("should return null for null note", () => {
      const orderItem = new OrderItem("product-123", "Test Product", new Money(100000), 2, null);
      expect(orderItem.getNote()).toBeNull();
    });
  });

  describe("getSubtotal", () => {
    it("should calculate subtotal correctly for positive quantity", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 3, null);

      const subtotal = orderItem.getSubtotal();
      expect(subtotal).toBeInstanceOf(Money);
      expect(subtotal.getAmount()).toBe(300000);
    });

    it("should calculate subtotal correctly for quantity of 1", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 1, null);

      const subtotal = orderItem.getSubtotal();
      expect(subtotal.getAmount()).toBe(100000);
    });

    it("should calculate subtotal correctly for quantity of 0", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 0, null);

      const subtotal = orderItem.getSubtotal();
      expect(subtotal.getAmount()).toBe(0);
    });

    it("should throw NegativeMoneyAmountException for negative quantity", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, -2, null);

      expect(() => orderItem.getSubtotal()).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException with correct amount in error", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, -2, null);

      try {
        orderItem.getSubtotal();
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidNumericArgumentException);
        expect((error as InvalidNumericArgumentException).message).toContain("-2");
      }
    });

    it("should return a new Money instance", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 3, null);

      const subtotal = orderItem.getSubtotal();
      expect(subtotal).toBeInstanceOf(Money);
      expect(subtotal).not.toBe(priceSnapshot);
    });

    it("should handle large quantities", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 1000, null);

      const subtotal = orderItem.getSubtotal();
      expect(subtotal.getAmount()).toBe(100000000);
    });

    it("should handle large price values", () => {
      const priceSnapshot = new Money(999999999);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 2, null);

      const subtotal = orderItem.getSubtotal();
      expect(subtotal.getAmount()).toBe(1999999998);
    });
  });

  describe("withQuantity", () => {
    it("should create a new OrderItem with updated quantity", () => {
      const original = new OrderItem("product-123", "Test Product", new Money(100000), 2, "Original note");

      const updated = original.withQuantity(5);

      expect(updated).toBeInstanceOf(OrderItem);
      expect(updated).not.toBe(original);
      expect(updated.getProductId()).toBe(original.getProductId());
      expect(updated.getProductName()).toBe(original.getProductName());
      expect(updated.getPriceSnapshot()).toBe(original.getPriceSnapshot());
      expect(updated.getQuantity()).toBe(5);
      expect(updated.getNote()).toBe(original.getNote());
    });

    it("should preserve original immutability", () => {
      const original = new OrderItem("product-123", "Test Product", new Money(100000), 2, "Original note");

      const originalQuantity = original.getQuantity();
      original.withQuantity(5);

      expect(original.getQuantity()).toBe(originalQuantity);
    });

    it("should handle quantity of 0", () => {
      const original = new OrderItem("product-123", "Test Product", new Money(100000), 2, null);

      const updated = original.withQuantity(0);
      expect(updated.getQuantity()).toBe(0);
    });

    it("should handle negative quantity", () => {
      const original = new OrderItem("product-123", "Test Product", new Money(100000), 2, null);

      const updated = original.withQuantity(-5);
      expect(updated.getQuantity()).toBe(-5);
    });

    it("should preserve note when updating quantity", () => {
      const original = new OrderItem("product-123", "Test Product", new Money(100000), 2, "Special note");

      const updated = original.withQuantity(10);
      expect(updated.getNote()).toBe("Special note");
    });

    it("should preserve null note when updating quantity", () => {
      const original = new OrderItem("product-123", "Test Product", new Money(100000), 2, null);

      const updated = original.withQuantity(10);
      expect(updated.getNote()).toBeNull();
    });
  });

  describe("immutability", () => {
    it("should return a new instance from create each time", () => {
      const data: OrderItemCreationData = {
        productId: "product-123",
        productName: "Test Product",
        priceSnapshot: 100000,
        quantity: 2,
      };

      const item1 = OrderItem.create(data);
      const item2 = OrderItem.create(data);

      expect(item1).not.toBe(item2);
      expect(item1.getProductId()).toBe(item2.getProductId());
      expect(item1.getProductName()).toBe(item2.getProductName());
      expect(item1.getQuantity()).toBe(item2.getQuantity());
    });

    it("should return a new instance from rebuild each time", () => {
      const data: OrderItemRebuildData = {
        productId: "product-123",
        productName: "Test Product",
        priceSnapshot: 100000,
        quantity: 2,
        note: null,
      };

      const item1 = OrderItem.rebuild(data);
      const item2 = OrderItem.rebuild(data);

      expect(item1).not.toBe(item2);
      expect(item1.getProductId()).toBe(item2.getProductId());
      expect(item1.getProductName()).toBe(item2.getProductName());
      expect(item1.getQuantity()).toBe(item2.getQuantity());
    });

    it("should preserve immutability when getting subtotal", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 3, null);

      const originalPrice = orderItem.getPriceSnapshot().getAmount();
      orderItem.getSubtotal();

      expect(orderItem.getPriceSnapshot().getAmount()).toBe(originalPrice);
    });
  });

  describe("edge cases and extreme values", () => {
    it("should handle very long product ID", () => {
      const longId = "product-" + "a".repeat(1000);
      const orderItem = new OrderItem(longId, "Test Product", new Money(100000), 2, null);
      expect(orderItem.getProductId()).toBe(longId);
    });

    it("should handle very long product name", () => {
      const longName = "Product " + "Name ".repeat(500);
      const orderItem = new OrderItem("product-123", longName, new Money(100000), 2, null);
      expect(orderItem.getProductName()).toBe(longName);
    });

    it("should handle very long note", () => {
      const longNote = "Note " + "content ".repeat(500);
      const orderItem = new OrderItem("product-123", "Test Product", new Money(100000), 2, longNote);
      expect(orderItem.getNote()).toBe(longNote);
    });

    it("should handle very large quantity", () => {
      const orderItem = new OrderItem("product-123", "Test Product", new Money(1000), Number.MAX_SAFE_INTEGER, null);
      expect(orderItem.getQuantity()).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle very small quantity", () => {
      const orderItem = new OrderItem("product-123", "Test Product", new Money(1000), -Number.MAX_SAFE_INTEGER, null);
      expect(orderItem.getQuantity()).toBe(-Number.MAX_SAFE_INTEGER);
    });

    it("should handle special characters in product ID", () => {
      const orderItem = new OrderItem("product-123_!@#$%^&*()", "Test Product", new Money(100000), 2, null);
      expect(orderItem.getProductId()).toBe("product-123_!@#$%^&*()");
    });

    it("should handle special characters in product name", () => {
      const orderItem = new OrderItem("product-123", "Test Product !@#$%^&*()", new Money(100000), 2, null);
      expect(orderItem.getProductName()).toBe("Test Product !@#$%^&*()");
    });

    it("should handle Unicode characters in product name", () => {
      const orderItem = new OrderItem("product-123", "Test Product 测试 🎉", new Money(100000), 2, null);
      expect(orderItem.getProductName()).toBe("Test Product 测试 🎉");
    });

    it("should handle Unicode characters in note", () => {
      const orderItem = new OrderItem("product-123", "Test Product", new Money(100000), 2, "Note with 测试 🎉");
      expect(orderItem.getNote()).toBe("Note with 测试 🎉");
    });
  });

  describe("consistency", () => {
    it("should maintain consistency between create and rebuild", () => {
      const createData: OrderItemCreationData = {
        productId: "product-123",
        productName: "Test Product",
        priceSnapshot: 100000,
        quantity: 2,
        note: "Test note",
      };

      const rebuildData: OrderItemRebuildData = {
        productId: "product-123",
        productName: "Test Product",
        priceSnapshot: 100000,
        quantity: 2,
        note: "Test note",
      };

      const fromCreate = OrderItem.create(createData);
      const fromRebuild = OrderItem.rebuild(rebuildData);

      expect(fromCreate.getProductId()).toBe(fromRebuild.getProductId());
      expect(fromCreate.getProductName()).toBe(fromRebuild.getProductName());
      expect(fromCreate.getPriceSnapshot().getAmount()).toBe(fromRebuild.getPriceSnapshot().getAmount());
      expect(fromCreate.getQuantity()).toBe(fromRebuild.getQuantity());
      expect(fromCreate.getNote()).toBe(fromRebuild.getNote());
    });

    it("should maintain consistency between withQuantity and new instance", () => {
      const original = new OrderItem("product-123", "Test Product", new Money(100000), 2, null);

      const updated = original.withQuantity(5);
      const newInstance = new OrderItem("product-123", "Test Product", new Money(100000), 5, null);

      expect(updated.getProductId()).toBe(newInstance.getProductId());
      expect(updated.getProductName()).toBe(newInstance.getProductName());
      expect(updated.getPriceSnapshot().getAmount()).toBe(newInstance.getPriceSnapshot().getAmount());
      expect(updated.getQuantity()).toBe(newInstance.getQuantity());
      expect(updated.getNote()).toBe(newInstance.getNote());
    });
  });

  describe("type safety", () => {
    it("should handle undefined note in create", () => {
      const data: OrderItemCreationData = {
        productId: "product-123",
        productName: "Test Product",
        priceSnapshot: 100000,
        quantity: 2,
      };

      const orderItem = OrderItem.create(data);
      expect(orderItem.getNote()).toBeNull();
    });

    it("should handle null note in create", () => {
      const data: OrderItemCreationData = {
        productId: "product-123",
        productName: "Test Product",
        priceSnapshot: 100000,
        quantity: 2,
        note: null as unknown as undefined,
      };

      const orderItem = OrderItem.create(data);
      expect(orderItem.getNote()).toBeNull();
    });

    it("should handle empty string note in create", () => {
      const data: OrderItemCreationData = {
        productId: "product-123",
        productName: "Test Product",
        priceSnapshot: 100000,
        quantity: 2,
        note: "",
      };

      const orderItem = OrderItem.create(data);
      expect(orderItem.getNote()).toBe(null);
    });

    it("should handle price snapshot as Money instance in constructor", () => {
      const priceSnapshot = new Money(100000);
      const orderItem = new OrderItem("product-123", "Test Product", priceSnapshot, 2, null);

      expect(orderItem.getPriceSnapshot()).toBe(priceSnapshot);
    });
  });
});
