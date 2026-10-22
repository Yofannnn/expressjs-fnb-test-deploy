import { OrderItemResolverService } from "@/domain/services/order-item-resolver.service";
import { Product } from "@/domain/entities/product.entity";
import { OrderContainsUnknownProductsException } from "@/domain/exceptions/order.exceptions";
import { Money } from "@/domain/value-objects/money.vo";

describe("OrderItemResolverService", () => {
  const mockProductId1 = "product-123";
  const mockProductId2 = "product-456";
  const mockProductName1 = "Test Product 1";
  const mockProductName2 = "Test Product 2";
  const mockPriceAmount = 29999;
  const mockProductPrice = new Money(mockPriceAmount);

  let mockProduct1: jest.Mocked<Product>;
  let mockProduct2: jest.Mocked<Product>;

  beforeEach(() => {
    mockProduct1 = {
      getId: jest.fn().mockReturnValue(mockProductId1),
      getName: jest.fn().mockReturnValue(mockProductName1),
      getPrice: jest.fn().mockReturnValue(mockProductPrice),
      assertCanOrder: jest.fn(),
      getDescription: jest.fn(),
      getCategory: jest.fn(),
      getStatus: jest.fn(),
      getStockQuantity: jest.fn(),
      getWeight: jest.fn(),
      getDimensions: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      activate: jest.fn(),
      reduceStock: jest.fn(),
      increaseStock: jest.fn(),
      isAvailable: jest.fn(),
      getMaxOrderQuantity: jest.fn(),
      getMinOrderQuantity: jest.fn(),
    } as unknown as jest.Mocked<Product>;

    mockProduct2 = {
      getId: jest.fn().mockReturnValue(mockProductId2),
      getName: jest.fn().mockReturnValue(mockProductName2),
      getPrice: jest.fn().mockReturnValue(mockProductPrice),
      assertCanOrder: jest.fn(),
      getDescription: jest.fn(),
      getCategory: jest.fn(),
      getStatus: jest.fn(),
      getStockQuantity: jest.fn(),
      getWeight: jest.fn(),
      getDimensions: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      activate: jest.fn(),
      reduceStock: jest.fn(),
      increaseStock: jest.fn(),
      isAvailable: jest.fn(),
      getMaxOrderQuantity: jest.fn(),
      getMinOrderQuantity: jest.fn(),
    } as unknown as jest.Mocked<Product>;
  });

  describe("resolve", () => {
    describe("successful resolution", () => {
      it("should resolve a single ordered item to OrderItemCreationData with IDR price", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 2 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          productId: mockProductId1,
          productName: mockProductName1,
          priceSnapshot: mockPriceAmount,
          quantity: 2,
          note: undefined,
        });
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(2);
        expect(mockProduct1.getId).toHaveBeenCalled();
        expect(mockProduct1.getName).toHaveBeenCalled();
        expect(mockProduct1.getPrice).toHaveBeenCalled();
      });

      it("should resolve multiple ordered items to OrderItemCreationData", () => {
        const orderedItems = [
          { productId: mockProductId1, quantity: 1 },
          { productId: mockProductId2, quantity: 3 },
        ];
        const products = [mockProduct1, mockProduct2];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          productId: mockProductId1,
          productName: mockProductName1,
          priceSnapshot: mockPriceAmount,
          quantity: 1,
          note: undefined,
        });
        expect(result[1]).toEqual({
          productId: mockProductId2,
          productName: mockProductName2,
          priceSnapshot: mockPriceAmount,
          quantity: 3,
          note: undefined,
        });
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(1);
        expect(mockProduct2.assertCanOrder).toHaveBeenCalledWith(3);
      });

      it("should preserve the note from ordered items", () => {
        const note = "Extra sauce, no onions";
        const orderedItems = [{ productId: mockProductId1, quantity: 1, note }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].note).toBe(note);
      });

      it("should handle undefined note gracefully", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1, note: undefined }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].note).toBeUndefined();
      });

      it("should handle empty note string", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1, note: "" }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].note).toBe("");
      });

      it("should handle products in different order than ordered items", () => {
        const orderedItems = [
          { productId: mockProductId2, quantity: 2 },
          { productId: mockProductId1, quantity: 1 },
        ];
        const products = [mockProduct1, mockProduct2];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result).toHaveLength(2);
        expect(result[0].productId).toBe(mockProductId2);
        expect(result[1].productId).toBe(mockProductId1);
      });

      it("should handle quantity of 1", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].quantity).toBe(1);
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(1);
      });

      it("should handle large quantity", () => {
        const largeQuantity = 999;
        const orderedItems = [{ productId: mockProductId1, quantity: largeQuantity }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].quantity).toBe(largeQuantity);
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(largeQuantity);
      });

      it("should handle zero quantity", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 0 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].quantity).toBe(0);
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(0);
      });

      it("should handle products with different prices in IDR", () => {
        const price2 = new Money(49999);
        mockProduct2.getPrice.mockReturnValue(price2);

        const orderedItems = [
          { productId: mockProductId1, quantity: 1 },
          { productId: mockProductId2, quantity: 1 },
        ];
        const products = [mockProduct1, mockProduct2];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].priceSnapshot).toBe(mockPriceAmount);
        expect(result[1].priceSnapshot).toBe(49999);
      });

      it("should handle products with large IDR prices", () => {
        const largePrice = new Money(99999999);
        mockProduct1.getPrice.mockReturnValue(largePrice);

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].priceSnapshot).toBe(99999999);
      });

      it("should handle products with small IDR prices", () => {
        const smallPrice = new Money(100);
        mockProduct1.getPrice.mockReturnValue(smallPrice);

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].priceSnapshot).toBe(100);
      });

      it("should handle product names with special characters", () => {
        const specialName = 'Product!@#$%^&*()_+{}|:"<>?~`';
        mockProduct1.getName.mockReturnValue(specialName);

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].productName).toBe(specialName);
      });

      it("should handle product names with Unicode characters", () => {
        const unicodeName = "Produit 🚀✨ café";
        mockProduct1.getName.mockReturnValue(unicodeName);

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].productName).toBe(unicodeName);
      });
    });

    describe("product not found", () => {
      it("should throw OrderContainsUnknownProductsException when product not found", () => {
        const orderedItems = [{ productId: "unknown-product", quantity: 1 }];
        const products = [mockProduct1];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(OrderContainsUnknownProductsException);

        expect(mockProduct1.assertCanOrder).not.toHaveBeenCalled();
      });

      it("should throw when some products are found and some are not", () => {
        const orderedItems = [
          { productId: mockProductId1, quantity: 1 },
          { productId: "unknown-product", quantity: 2 },
        ];
        const products = [mockProduct1, mockProduct2];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(OrderContainsUnknownProductsException);

        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(1);
        expect(mockProduct2.assertCanOrder).not.toHaveBeenCalled();
      });

      it("should throw when productId is null", () => {
        const orderedItems = [{ productId: null as unknown as string, quantity: 1 }];
        const products = [mockProduct1];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(OrderContainsUnknownProductsException);
      });

      it("should throw when productId is undefined", () => {
        const orderedItems = [{ productId: undefined as unknown as string, quantity: 1 }];
        const products = [mockProduct1];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(OrderContainsUnknownProductsException);
      });

      it("should throw when productId is empty string", () => {
        const orderedItems = [{ productId: "", quantity: 1 }];
        const products = [mockProduct1];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(OrderContainsUnknownProductsException);
      });

      it("should throw with empty products array", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products: Product[] = [];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(OrderContainsUnknownProductsException);
      });

      it("should throw when product exists but is not in the Map due to ID mismatch", () => {
        mockProduct1.getId.mockReturnValue("different-id");

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(OrderContainsUnknownProductsException);
      });
    });

    describe("product validation", () => {
      it("should call assertCanOrder on each product", () => {
        const orderedItems = [
          { productId: mockProductId1, quantity: 2 },
          { productId: mockProductId2, quantity: 3 },
        ];
        const products = [mockProduct1, mockProduct2];

        OrderItemResolverService.resolve(orderedItems, products);

        expect(mockProduct1.assertCanOrder).toHaveBeenCalledTimes(1);
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(2);
        expect(mockProduct2.assertCanOrder).toHaveBeenCalledTimes(1);
        expect(mockProduct2.assertCanOrder).toHaveBeenCalledWith(3);
      });

      it("should propagate errors from assertCanOrder", () => {
        const error = new Error("Product cannot be ordered");
        mockProduct1.assertCanOrder.mockImplementation(() => {
          throw error;
        });

        const orderedItems = [{ productId: mockProductId1, quantity: 2 }];
        const products = [mockProduct1];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(error);

        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(2);
      });

      it("should throw OrderContainsUnknownProductsException when assertCanOrder throws with specific error", () => {
        class ProductNotAvailableError extends Error {}
        mockProduct1.assertCanOrder.mockImplementation(() => {
          throw new ProductNotAvailableError("Product is not available");
        });

        const orderedItems = [{ productId: mockProductId1, quantity: 2 }];
        const products = [mockProduct1];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(ProductNotAvailableError);
      });

      it("should validate each product's orderability", () => {
        const orderedItems = [
          { productId: mockProductId1, quantity: 5 },
          { productId: mockProductId2, quantity: 10 },
        ];
        const products = [mockProduct1, mockProduct2];

        OrderItemResolverService.resolve(orderedItems, products);

        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(5);
        expect(mockProduct2.assertCanOrder).toHaveBeenCalledWith(10);
      });
    });

    describe("data transformation", () => {
      it("should map product ID correctly", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].productId).toBe(mockProductId1);
        expect(mockProduct1.getId).toHaveBeenCalled();
      });

      it("should map product name correctly", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].productName).toBe(mockProductName1);
        expect(mockProduct1.getName).toHaveBeenCalled();
      });

      it("should map price snapshot correctly from Money VO", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].priceSnapshot).toBe(mockPriceAmount);
        expect(mockProduct1.getPrice).toHaveBeenCalled();
      });

      it("should map quantity correctly", () => {
        const quantity = 5;
        const orderedItems = [{ productId: mockProductId1, quantity }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].quantity).toBe(quantity);
      });

      it("should map note correctly", () => {
        const note = "Please make it spicy";
        const orderedItems = [{ productId: mockProductId1, quantity: 1, note }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].note).toBe(note);
      });

      it("should not include note field when not provided", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].note).toBeUndefined();
      });

      it("should preserve the order of ordered items", () => {
        const orderedItems = [
          { productId: mockProductId2, quantity: 3 },
          { productId: mockProductId1, quantity: 1 },
          { productId: mockProductId2, quantity: 2 },
        ];
        const products = [mockProduct1, mockProduct2];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].productId).toBe(mockProductId2);
        expect(result[1].productId).toBe(mockProductId1);
        expect(result[2].productId).toBe(mockProductId2);
      });
    });

    describe("edge cases", () => {
      it("should handle empty ordered items array", () => {
        const orderedItems: Array<{ productId: string; quantity: number }> = [];
        const products = [mockProduct1, mockProduct2];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result).toHaveLength(0);
        expect(mockProduct1.assertCanOrder).not.toHaveBeenCalled();
        expect(mockProduct2.assertCanOrder).not.toHaveBeenCalled();
      });

      it("should handle duplicate product IDs in ordered items", () => {
        const orderedItems = [
          { productId: mockProductId1, quantity: 2 },
          { productId: mockProductId1, quantity: 3 },
        ];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result).toHaveLength(2);
        expect(result[0].productId).toBe(mockProductId1);
        expect(result[0].quantity).toBe(2);
        expect(result[1].productId).toBe(mockProductId1);
        expect(result[1].quantity).toBe(3);
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledTimes(2);
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(2);
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(3);
      });

      it("should handle product with very long name", () => {
        const longName = "A".repeat(1000);
        mockProduct1.getName.mockReturnValue(longName);

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].productName).toBe(longName);
      });

      it("should handle product with very long ID", () => {
        const longId = "product-" + "a".repeat(1000);
        mockProduct1.getId.mockReturnValue(longId);

        const orderedItems = [{ productId: longId, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].productId).toBe(longId);
      });

      it("should handle very long note", () => {
        const longNote = "N".repeat(10000);
        const orderedItems = [{ productId: mockProductId1, quantity: 1, note: longNote }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].note).toBe(longNote);
      });

      it("should handle negative quantity", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: -5 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].quantity).toBe(-5);
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(-5);
      });

      it("should handle quantity as decimal", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 2.5 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].quantity).toBe(2.5);
        expect(mockProduct1.assertCanOrder).toHaveBeenCalledWith(2.5);
      });

      it("should handle product price with zero amount in IDR", () => {
        const zeroPrice = new Money(0);
        mockProduct1.getPrice.mockReturnValue(zeroPrice);

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].priceSnapshot).toBe(0);
      });

      it("should handle product price with decimal amount (should be integer in IDR)", () => {
        const integerPrice = new Money(29999);
        mockProduct1.getPrice.mockReturnValue(integerPrice);

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].priceSnapshot).toBe(29999);
      });
    });

    describe("method call ordering", () => {
      it("should call getPrice before assertCanOrder", () => {
        const callOrder: string[] = [];

        mockProduct1.getPrice.mockImplementation(() => {
          callOrder.push("getPrice");
          return mockProductPrice;
        });

        mockProduct1.assertCanOrder.mockImplementation(() => {
          callOrder.push("assertCanOrder");
        });

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        OrderItemResolverService.resolve(orderedItems, products);

        expect(callOrder).toEqual(["assertCanOrder", "getPrice"]);
      });

      it("should call getPrice and assertCanOrder before getName", () => {
        const callOrder: string[] = [];

        mockProduct1.getPrice.mockImplementation(() => {
          callOrder.push("getPrice");
          return mockProductPrice;
        });

        mockProduct1.assertCanOrder.mockImplementation(() => {
          callOrder.push("assertCanOrder");
        });

        mockProduct1.getName.mockImplementation(() => {
          callOrder.push("getName");
          return mockProductName1;
        });

        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        OrderItemResolverService.resolve(orderedItems, products);

        expect(callOrder).toEqual(["assertCanOrder", "getName", "getPrice"]);
      });
    });

    describe("performance considerations", () => {
      it("should execute resolution quickly for single item", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const startTime = Date.now();
        OrderItemResolverService.resolve(orderedItems, products);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(100);
      });

      it("should execute resolution quickly for multiple items", () => {
        const orderedItems = Array.from({ length: 100 }, (_, i) => ({
          productId: `product-${i}`,
          quantity: i + 1,
        }));
        const products = Array.from({ length: 100 }, (_, i) => {
          const product = {
            getId: jest.fn().mockReturnValue(`product-${i}`),
            getName: jest.fn().mockReturnValue(`Product ${i}`),
            getPrice: jest.fn().mockReturnValue(new Money(10000 + i * 1000)),
            assertCanOrder: jest.fn(),
          } as unknown as Product;
          return product;
        });

        const startTime = Date.now();
        OrderItemResolverService.resolve(orderedItems, products);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });

      it("should create productsById map efficiently", () => {
        const products = [mockProduct1, mockProduct2];

        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
          const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
          OrderItemResolverService.resolve(orderedItems, products);
        }
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe("type safety", () => {
      it("should accept OrderedItem array and Product array", () => {
        const orderedItems: Array<{ productId: string; quantity: number }> = [{ productId: mockProductId1, quantity: 1 }];
        const products: Product[] = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result).toBeInstanceOf(Array);
        expect(result[0]).toMatchObject({
          productId: expect.any(String),
          productName: expect.any(String),
          priceSnapshot: expect.any(Number),
          quantity: expect.any(Number),
        });
      });

      it("should return OrderItemCreationData array with number priceSnapshot", () => {
        const orderedItems = [{ productId: mockProductId1, quantity: 1 }];
        const products = [mockProduct1];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result).toBeInstanceOf(Array);
        expect(result[0]).toHaveProperty("productId");
        expect(result[0]).toHaveProperty("productName");
        expect(result[0]).toHaveProperty("priceSnapshot");
        expect(typeof result[0].priceSnapshot).toBe("number");
        expect(result[0]).toHaveProperty("quantity");
      });
    });

    describe("integration scenarios with IDR pricing", () => {
      it("should handle real-world order with multiple different products in IDR", () => {
        const orderedItems = [
          { productId: "pizza-margherita", quantity: 2, note: "Extra cheese" },
          { productId: "pizza-pepperoni", quantity: 1 },
          { productId: "garlic-bread", quantity: 3, note: "No garlic" },
        ];

        const pizzaMargherita = {
          getId: jest.fn().mockReturnValue("pizza-margherita"),
          getName: jest.fn().mockReturnValue("Pizza Margherita"),
          getPrice: jest.fn().mockReturnValue(new Money(12999)),
          assertCanOrder: jest.fn(),
        } as unknown as Product;

        const pizzaPepperoni = {
          getId: jest.fn().mockReturnValue("pizza-pepperoni"),
          getName: jest.fn().mockReturnValue("Pizza Pepperoni"),
          getPrice: jest.fn().mockReturnValue(new Money(14999)),
          assertCanOrder: jest.fn(),
        } as unknown as Product;

        const garlicBread = {
          getId: jest.fn().mockReturnValue("garlic-bread"),
          getName: jest.fn().mockReturnValue("Garlic Bread"),
          getPrice: jest.fn().mockReturnValue(new Money(4999)),
          assertCanOrder: jest.fn(),
        } as unknown as Product;

        const products = [pizzaMargherita, pizzaPepperoni, garlicBread];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({
          productId: "pizza-margherita",
          productName: "Pizza Margherita",
          priceSnapshot: 12999,
          quantity: 2,
          note: "Extra cheese",
        });
        expect(result[1]).toMatchObject({
          productId: "pizza-pepperoni",
          productName: "Pizza Pepperoni",
          priceSnapshot: 14999,
          quantity: 1,
        });
        expect(result[2]).toMatchObject({
          productId: "garlic-bread",
          productName: "Garlic Bread",
          priceSnapshot: 4999,
          quantity: 3,
          note: "No garlic",
        });

        expect(pizzaMargherita.assertCanOrder).toHaveBeenCalledWith(2);
        expect(pizzaPepperoni.assertCanOrder).toHaveBeenCalledWith(1);
        expect(garlicBread.assertCanOrder).toHaveBeenCalledWith(3);
      });

      it("should handle high-value products in IDR", () => {
        const orderedItems = [{ productId: "premium-steak", quantity: 1, note: "Medium rare" }];

        const premiumSteak = {
          getId: jest.fn().mockReturnValue("premium-steak"),
          getName: jest.fn().mockReturnValue("Premium Steak"),
          getPrice: jest.fn().mockReturnValue(new Money(350000)),
          assertCanOrder: jest.fn(),
        } as unknown as Product;

        const products = [premiumSteak];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].priceSnapshot).toBe(350000);
        expect(premiumSteak.assertCanOrder).toHaveBeenCalledWith(1);
      });

      it("should handle bulk order with IDR pricing", () => {
        const orderedItems = [{ productId: "snack", quantity: 100 }];

        const snack = {
          getId: jest.fn().mockReturnValue("snack"),
          getName: jest.fn().mockReturnValue("Snack Pack"),
          getPrice: jest.fn().mockReturnValue(new Money(2500)),
          assertCanOrder: jest.fn(),
        } as unknown as Product;

        const products = [snack];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result[0].priceSnapshot).toBe(2500);
        expect(result[0].quantity).toBe(100);
        expect(snack.assertCanOrder).toHaveBeenCalledWith(100);
      });

      it("should throw when one product is unknown in a real-world order", () => {
        const orderedItems = [
          { productId: "pizza-margherita", quantity: 2 },
          { productId: "unknown-product", quantity: 1 },
        ];

        const pizzaMargherita = {
          getId: jest.fn().mockReturnValue("pizza-margherita"),
          getName: jest.fn().mockReturnValue("Pizza Margherita"),
          getPrice: jest.fn().mockReturnValue(new Money(12999)),
          assertCanOrder: jest.fn(),
        } as unknown as Product;

        const products = [pizzaMargherita];

        expect(() => {
          OrderItemResolverService.resolve(orderedItems, products);
        }).toThrow(OrderContainsUnknownProductsException);

        expect(pizzaMargherita.assertCanOrder).toHaveBeenCalledWith(2);
      });

      it("should handle multiple items of the same product in a real-world order", () => {
        const orderedItems = [
          { productId: "pizza-margherita", quantity: 1 },
          { productId: "pizza-margherita", quantity: 2, note: "Well done" },
          { productId: "pizza-margherita", quantity: 1 },
        ];

        const pizzaMargherita = {
          getId: jest.fn().mockReturnValue("pizza-margherita"),
          getName: jest.fn().mockReturnValue("Pizza Margherita"),
          getPrice: jest.fn().mockReturnValue(new Money(12999)),
          assertCanOrder: jest.fn(),
        } as unknown as Product;

        const products = [pizzaMargherita];

        const result = OrderItemResolverService.resolve(orderedItems, products);

        expect(result).toHaveLength(3);
        expect(result[0].quantity).toBe(1);
        expect(result[1].quantity).toBe(2);
        expect(result[1].note).toBe("Well done");
        expect(result[2].quantity).toBe(1);
        expect(result[0].priceSnapshot).toBe(12999);
        expect(result[1].priceSnapshot).toBe(12999);
        expect(result[2].priceSnapshot).toBe(12999);

        expect(pizzaMargherita.assertCanOrder).toHaveBeenCalledTimes(3);
        expect(pizzaMargherita.assertCanOrder).toHaveBeenCalledWith(1);
        expect(pizzaMargherita.assertCanOrder).toHaveBeenCalledWith(2);
      });
    });
  });
});
