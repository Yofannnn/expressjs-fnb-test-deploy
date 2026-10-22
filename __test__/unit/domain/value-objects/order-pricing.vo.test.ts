import { OrderPricing } from "@/domain/value-objects/order-pricing.vo";
import { OrderItem } from "@/domain/value-objects/order-item.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { OrderPricingCalculationData, OrderPricingRebuildData } from "@/domain/types/order.type";
import { InsufficientMoneyAmountException, NegativeMoneyAmountException } from "@/domain/exceptions/money.exceptions";
import { InvalidNumericArgumentException } from "@/domain/exceptions/invalid-argument.exceptions";

describe("OrderPricing", () => {
  describe("constructor", () => {
    it("should create an OrderPricing instance with all valid data", () => {
      const subtotal = new Money(100000);
      const tax = new Money(10000);
      const serviceCharge = new Money(5000);
      const deliveryFee = new Money(15000);
      const discount = new Money(5000);
      const total = new Money(125000);

      const orderPricing = new OrderPricing(subtotal, tax, serviceCharge, deliveryFee, discount, total);

      expect(orderPricing).toBeInstanceOf(OrderPricing);
      expect(orderPricing.getSubtotal()).toBe(subtotal);
      expect(orderPricing.getTax()).toBe(tax);
      expect(orderPricing.getServiceCharge()).toBe(serviceCharge);
      expect(orderPricing.getDeliveryFee()).toBe(deliveryFee);
      expect(orderPricing.getDiscount()).toBe(discount);
      expect(orderPricing.getTotal()).toBe(total);
    });

    it("should handle zero values", () => {
      const zero = Money.zero();
      const orderPricing = new OrderPricing(zero, zero, zero, zero, zero, zero);

      expect(orderPricing.getSubtotal().isZero()).toBe(true);
      expect(orderPricing.getTax().isZero()).toBe(true);
      expect(orderPricing.getServiceCharge().isZero()).toBe(true);
      expect(orderPricing.getDeliveryFee().isZero()).toBe(true);
      expect(orderPricing.getDiscount().isZero()).toBe(true);
      expect(orderPricing.getTotal().isZero()).toBe(true);
    });

    it("should handle large values", () => {
      const largeAmount = new Money(999999999);
      const orderPricing = new OrderPricing(largeAmount, largeAmount, largeAmount, largeAmount, largeAmount, largeAmount);

      expect(orderPricing.getSubtotal().getAmount()).toBe(999999999);
      expect(orderPricing.getTotal().getAmount()).toBe(999999999);
    });
  });

  describe("calculate", () => {
    it("should calculate pricing correctly with all components", () => {
      const item1 = new OrderItem("product-1", "Product 1", new Money(100000), 2, null);
      const item2 = new OrderItem("product-2", "Product 2", new Money(50000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item1, item2],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getSubtotal().getAmount()).toBe(250000);
      expect(orderPricing.getTax().getAmount()).toBe(25000);
      expect(orderPricing.getServiceCharge().getAmount()).toBe(12500);
      expect(orderPricing.getDeliveryFee().getAmount()).toBe(15000);
      expect(orderPricing.getDiscount().getAmount()).toBe(5000);
      expect(orderPricing.getTotal().getAmount()).toBe(297500);
    });

    it("should calculate pricing correctly with no delivery fee", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: undefined,
        discount: undefined,
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getSubtotal().getAmount()).toBe(100000);
      expect(orderPricing.getTax().getAmount()).toBe(10000);
      expect(orderPricing.getServiceCharge().getAmount()).toBe(5000);
      expect(orderPricing.getDeliveryFee().isZero()).toBe(true);
      expect(orderPricing.getDiscount().isZero()).toBe(true);
      expect(orderPricing.getTotal().getAmount()).toBe(115000);
    });

    it("should calculate pricing correctly with no discount", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: undefined,
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getSubtotal().getAmount()).toBe(100000);
      expect(orderPricing.getTax().getAmount()).toBe(10000);
      expect(orderPricing.getServiceCharge().getAmount()).toBe(5000);
      expect(orderPricing.getDeliveryFee().getAmount()).toBe(15000);
      expect(orderPricing.getDiscount().isZero()).toBe(true);
      expect(orderPricing.getTotal().getAmount()).toBe(130000);
    });

    it("should calculate pricing correctly with zero tax rate", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 0,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getTax().isZero()).toBe(true);
      expect(orderPricing.getTotal().getAmount()).toBe(115000);
    });

    it("should calculate pricing correctly with zero service charge rate", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 0,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getServiceCharge().isZero()).toBe(true);
      expect(orderPricing.getTotal().getAmount()).toBe(120000);
    });

    it("should calculate pricing correctly with multiple items", () => {
      const items = [
        new OrderItem("product-1", "Product 1", new Money(10000), 3, null),
        new OrderItem("product-2", "Product 2", new Money(25000), 2, null),
        new OrderItem("product-3", "Product 3", new Money(5000), 5, null),
      ];

      const data: OrderPricingCalculationData = {
        items,
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(20000),
        discount: new Money(10000),
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getSubtotal().getAmount()).toBe(105000);
      expect(orderPricing.getTax().getAmount()).toBe(10500);
      expect(orderPricing.getServiceCharge().getAmount()).toBe(5250);
      expect(orderPricing.getDeliveryFee().getAmount()).toBe(20000);
      expect(orderPricing.getDiscount().getAmount()).toBe(10000);
      expect(orderPricing.getTotal().getAmount()).toBe(130750);
    });

    it("should handle discount larger than subtotal", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(150000),
      };

      expect(() => OrderPricing.calculate(data)).toThrow(InsufficientMoneyAmountException);
    });

    it("should return a new OrderPricing instance", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const orderPricing = OrderPricing.calculate(data);
      expect(orderPricing).toBeInstanceOf(OrderPricing);
    });
  });

  describe("rebuild", () => {
    it("should rebuild an OrderPricing instance from rebuild data", () => {
      const data: OrderPricingRebuildData = {
        subtotal: 100000,
        tax: 10000,
        serviceCharge: 5000,
        deliveryFee: 15000,
        discount: 5000,
        total: 125000,
      };

      const orderPricing = OrderPricing.rebuild(data);

      expect(orderPricing).toBeInstanceOf(OrderPricing);
      expect(orderPricing.getSubtotal()).toBeInstanceOf(Money);
      expect(orderPricing.getSubtotal().getAmount()).toBe(100000);
      expect(orderPricing.getTax().getAmount()).toBe(10000);
      expect(orderPricing.getServiceCharge().getAmount()).toBe(5000);
      expect(orderPricing.getDeliveryFee().getAmount()).toBe(15000);
      expect(orderPricing.getDiscount().getAmount()).toBe(5000);
      expect(orderPricing.getTotal().getAmount()).toBe(125000);
    });

    it("should rebuild with zero values", () => {
      const data: OrderPricingRebuildData = {
        subtotal: 0,
        tax: 0,
        serviceCharge: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
      };

      const orderPricing = OrderPricing.rebuild(data);

      expect(orderPricing.getSubtotal().isZero()).toBe(true);
      expect(orderPricing.getTax().isZero()).toBe(true);
      expect(orderPricing.getServiceCharge().isZero()).toBe(true);
      expect(orderPricing.getDeliveryFee().isZero()).toBe(true);
      expect(orderPricing.getDiscount().isZero()).toBe(true);
      expect(orderPricing.getTotal().isZero()).toBe(true);
    });

    it("should rebuild with large values", () => {
      const data: OrderPricingRebuildData = {
        subtotal: 999999999,
        tax: 99999999,
        serviceCharge: 99999999,
        deliveryFee: 99999999,
        discount: 99999999,
        total: 999999999,
      };

      const orderPricing = OrderPricing.rebuild(data);

      expect(orderPricing.getSubtotal().getAmount()).toBe(999999999);
      expect(orderPricing.getTax().getAmount()).toBe(99999999);
      expect(orderPricing.getServiceCharge().getAmount()).toBe(99999999);
      expect(orderPricing.getDeliveryFee().getAmount()).toBe(99999999);
      expect(orderPricing.getDiscount().getAmount()).toBe(99999999);
      expect(orderPricing.getTotal().getAmount()).toBe(999999999);
    });

    it("should return a new OrderPricing instance", () => {
      const data: OrderPricingRebuildData = {
        subtotal: 100000,
        tax: 10000,
        serviceCharge: 5000,
        deliveryFee: 15000,
        discount: 5000,
        total: 125000,
      };

      const orderPricing = OrderPricing.rebuild(data);
      expect(orderPricing).toBeInstanceOf(OrderPricing);
    });

    it("should create Money instances from numbers", () => {
      const data: OrderPricingRebuildData = {
        subtotal: 100000,
        tax: 10000,
        serviceCharge: 5000,
        deliveryFee: 15000,
        discount: 5000,
        total: 125000,
      };

      const orderPricing = OrderPricing.rebuild(data);

      expect(orderPricing.getSubtotal()).toBeInstanceOf(Money);
      expect(orderPricing.getTax()).toBeInstanceOf(Money);
      expect(orderPricing.getServiceCharge()).toBeInstanceOf(Money);
      expect(orderPricing.getDeliveryFee()).toBeInstanceOf(Money);
      expect(orderPricing.getDiscount()).toBeInstanceOf(Money);
      expect(orderPricing.getTotal()).toBeInstanceOf(Money);
    });
  });

  describe("getters", () => {
    it("should return subtotal", () => {
      const subtotal = new Money(100000);
      const orderPricing = new OrderPricing(subtotal, new Money(10000), new Money(5000), new Money(15000), new Money(5000), new Money(125000));

      expect(orderPricing.getSubtotal()).toBe(subtotal);
    });

    it("should return tax", () => {
      const tax = new Money(10000);
      const orderPricing = new OrderPricing(new Money(100000), tax, new Money(5000), new Money(15000), new Money(5000), new Money(125000));

      expect(orderPricing.getTax()).toBe(tax);
    });

    it("should return service charge", () => {
      const serviceCharge = new Money(5000);
      const orderPricing = new OrderPricing(new Money(100000), new Money(10000), serviceCharge, new Money(15000), new Money(5000), new Money(125000));

      expect(orderPricing.getServiceCharge()).toBe(serviceCharge);
    });

    it("should return delivery fee", () => {
      const deliveryFee = new Money(15000);
      const orderPricing = new OrderPricing(new Money(100000), new Money(10000), new Money(5000), deliveryFee, new Money(5000), new Money(125000));

      expect(orderPricing.getDeliveryFee()).toBe(deliveryFee);
    });

    it("should return discount", () => {
      const discount = new Money(5000);
      const orderPricing = new OrderPricing(new Money(100000), new Money(10000), new Money(5000), new Money(15000), discount, new Money(125000));

      expect(orderPricing.getDiscount()).toBe(discount);
    });

    it("should return total", () => {
      const total = new Money(125000);
      const orderPricing = new OrderPricing(new Money(100000), new Money(10000), new Money(5000), new Money(15000), new Money(5000), total);

      expect(orderPricing.getTotal()).toBe(total);
    });
  });

  describe("immutability", () => {
    it("should return a new instance from calculate each time", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const pricing1 = OrderPricing.calculate(data);
      const pricing2 = OrderPricing.calculate(data);

      expect(pricing1).not.toBe(pricing2);
      expect(pricing1.getSubtotal().getAmount()).toBe(pricing2.getSubtotal().getAmount());
      expect(pricing1.getTax().getAmount()).toBe(pricing2.getTax().getAmount());
      expect(pricing1.getTotal().getAmount()).toBe(pricing2.getTotal().getAmount());
    });

    it("should return a new instance from rebuild each time", () => {
      const data: OrderPricingRebuildData = {
        subtotal: 100000,
        tax: 10000,
        serviceCharge: 5000,
        deliveryFee: 15000,
        discount: 5000,
        total: 125000,
      };

      const pricing1 = OrderPricing.rebuild(data);
      const pricing2 = OrderPricing.rebuild(data);

      expect(pricing1).not.toBe(pricing2);
      expect(pricing1.getSubtotal().getAmount()).toBe(pricing2.getSubtotal().getAmount());
      expect(pricing1.getTotal().getAmount()).toBe(pricing2.getTotal().getAmount());
    });

    it("should preserve immutability of Money objects", () => {
      const subtotal = new Money(100000);
      const orderPricing = new OrderPricing(subtotal, new Money(10000), new Money(5000), new Money(15000), new Money(5000), new Money(125000));

      const originalSubtotal = orderPricing.getSubtotal().getAmount();
      orderPricing.getSubtotal().add(new Money(1000));

      expect(orderPricing.getSubtotal().getAmount()).toBe(originalSubtotal);
    });
  });

  describe("edge cases and extreme values", () => {
    it("should handle empty items array", () => {
      const data: OrderPricingCalculationData = {
        items: [],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getSubtotal().isZero()).toBe(true);
      expect(orderPricing.getTax().isZero()).toBe(true);
      expect(orderPricing.getServiceCharge().isZero()).toBe(true);
      expect(orderPricing.getDeliveryFee().getAmount()).toBe(15000);
      expect(orderPricing.getDiscount().getAmount()).toBe(5000);
      expect(orderPricing.getTotal().getAmount()).toBe(10000);
    });

    it("should handle very high tax rate", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 100,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getTax().getAmount()).toBe(100000);
      expect(orderPricing.getTotal().getAmount()).toBe(215000);
    });

    it("should handle very high service charge rate", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 100,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getServiceCharge().getAmount()).toBe(100000);
      expect(orderPricing.getTotal().getAmount()).toBe(220000);
    });

    it("should handle discount equal to total", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(130000),
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getTotal().isZero()).toBe(true);
    });

    it("should handle very large number of items", () => {
      const items = Array.from({ length: 100 }, (_, i) => new OrderItem(`product-${i}`, `Product ${i}`, new Money(1000), 1, null));

      const data: OrderPricingCalculationData = {
        items,
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const orderPricing = OrderPricing.calculate(data);

      expect(orderPricing.getSubtotal().getAmount()).toBe(100000);
      expect(orderPricing.getTax().getAmount()).toBe(10000);
      expect(orderPricing.getServiceCharge().getAmount()).toBe(5000);
      expect(orderPricing.getTotal().getAmount()).toBe(125000);
    });
  });

  describe("validation and error scenarios", () => {
    it("should throw InsufficientMoneyAmountException when discount exceeds total", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(150000),
      };

      expect(() => OrderPricing.calculate(data)).toThrow(InsufficientMoneyAmountException);
    });

    it("should throw NegativeMoneyAmountException for negative tax rate", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: -10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      expect(() => OrderPricing.calculate(data)).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException for negative service charge rate", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: -5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      expect(() => OrderPricing.calculate(data)).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException when rebuilding with negative subtotal", () => {
      const data: OrderPricingRebuildData = {
        subtotal: -100000,
        tax: 10000,
        serviceCharge: 5000,
        deliveryFee: 15000,
        discount: 5000,
        total: 125000,
      };

      expect(() => OrderPricing.rebuild(data)).toThrow(NegativeMoneyAmountException);
    });

    it("should throw NegativeMoneyAmountException when rebuilding with negative total", () => {
      const data: OrderPricingRebuildData = {
        subtotal: 100000,
        tax: 10000,
        serviceCharge: 5000,
        deliveryFee: 15000,
        discount: 5000,
        total: -125000,
      };

      expect(() => OrderPricing.rebuild(data)).toThrow(NegativeMoneyAmountException);
    });
  });

  describe("consistency", () => {
    it("should maintain consistency between calculate and rebuild", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 2, null);

      const calculateData: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const fromCalculate = OrderPricing.calculate(calculateData);

      const rebuildData: OrderPricingRebuildData = {
        subtotal: fromCalculate.getSubtotal().getAmount(),
        tax: fromCalculate.getTax().getAmount(),
        serviceCharge: fromCalculate.getServiceCharge().getAmount(),
        deliveryFee: fromCalculate.getDeliveryFee().getAmount(),
        discount: fromCalculate.getDiscount().getAmount(),
        total: fromCalculate.getTotal().getAmount(),
      };

      const fromRebuild = OrderPricing.rebuild(rebuildData);

      expect(fromCalculate.getSubtotal().getAmount()).toBe(fromRebuild.getSubtotal().getAmount());
      expect(fromCalculate.getTax().getAmount()).toBe(fromRebuild.getTax().getAmount());
      expect(fromCalculate.getServiceCharge().getAmount()).toBe(fromRebuild.getServiceCharge().getAmount());
      expect(fromCalculate.getDeliveryFee().getAmount()).toBe(fromRebuild.getDeliveryFee().getAmount());
      expect(fromCalculate.getDiscount().getAmount()).toBe(fromRebuild.getDiscount().getAmount());
      expect(fromCalculate.getTotal().getAmount()).toBe(fromRebuild.getTotal().getAmount());
    });

    it("should correctly calculate total as sum of all components minus discount", () => {
      const item = new OrderItem("product-1", "Product 1", new Money(100000), 1, null);

      const data: OrderPricingCalculationData = {
        items: [item],
        taxRatePercent: 10,
        serviceChargeRatePercent: 5,
        deliveryFee: new Money(15000),
        discount: new Money(5000),
      };

      const orderPricing = OrderPricing.calculate(data);
      const expectedTotal = orderPricing
        .getSubtotal()
        .add(orderPricing.getTax())
        .add(orderPricing.getServiceCharge())
        .add(orderPricing.getDeliveryFee())
        .subtract(orderPricing.getDiscount());

      expect(orderPricing.getTotal().getAmount()).toBe(expectedTotal.getAmount());
    });
  });
});
