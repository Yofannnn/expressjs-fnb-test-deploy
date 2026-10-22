import { OrderItemCreationData, OrderItemRebuildData } from "../types/order.type";
import { Money } from "./money.vo";

export class OrderItem {
  constructor(
    private readonly productId: string,
    private readonly productName: string,
    private readonly priceSnapshot: Money,
    private readonly quantity: number,
    private readonly note: string | null,
  ) {}

  getProductId(): string {
    return this.productId;
  }

  getProductName(): string {
    return this.productName;
  }

  getPriceSnapshot(): Money {
    return this.priceSnapshot;
  }

  getQuantity(): number {
    return this.quantity;
  }

  getNote(): string | null {
    return this.note;
  }

  getSubtotal(): Money {
    return this.priceSnapshot.multiply(this.quantity);
  }

  withQuantity(quantity: number): OrderItem {
    return new OrderItem(this.productId, this.productName, this.priceSnapshot, quantity, this.note);
  }

  static create(data: OrderItemCreationData): OrderItem {
    return new OrderItem(data.productId, data.productName, new Money(data.priceSnapshot), data.quantity, data.note || null);
  }

  static rebuild(data: OrderItemRebuildData): OrderItem {
    return new OrderItem(data.productId, data.productName, new Money(data.priceSnapshot), data.quantity, data.note);
  }
}
