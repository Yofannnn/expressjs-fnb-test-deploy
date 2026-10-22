import { OrderPricingCalculationData, OrderPricingRebuildData } from "../types/order.type";
import { Money } from "./money.vo";

export class OrderPricing {
  constructor(
    private readonly subtotal: Money,
    private readonly tax: Money,
    private readonly serviceCharge: Money,
    private readonly deliveryFee: Money,
    private readonly discount: Money,
    private readonly total: Money,
  ) {}

  getSubtotal(): Money {
    return this.subtotal;
  }

  getTax(): Money {
    return this.tax;
  }

  getServiceCharge(): Money {
    return this.serviceCharge;
  }

  getDeliveryFee(): Money {
    return this.deliveryFee;
  }

  getDiscount(): Money {
    return this.discount;
  }

  getTotal(): Money {
    return this.total;
  }

  static calculate(data: OrderPricingCalculationData): OrderPricing {
    const subtotal = data.items.reduce((sum, item) => sum.add(item.getSubtotal()), Money.zero());
    const tax = subtotal.percentage(data.taxRatePercent);
    const serviceCharge = subtotal.percentage(data.serviceChargeRatePercent);
    const deliveryFee = data.deliveryFee ?? Money.zero();
    const discount = data.discount ?? Money.zero();
    const total = subtotal.add(tax).add(serviceCharge).add(deliveryFee).subtract(discount);

    return new OrderPricing(subtotal, tax, serviceCharge, deliveryFee, discount, total);
  }

  static rebuild({ subtotal, tax, serviceCharge, deliveryFee, discount, total }: OrderPricingRebuildData): OrderPricing {
    return new OrderPricing(
      new Money(subtotal),
      new Money(tax),
      new Money(serviceCharge),
      new Money(deliveryFee),
      new Money(discount),
      new Money(total),
    );
  }
}
