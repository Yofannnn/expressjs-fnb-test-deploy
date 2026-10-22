import { OrderConstraintPolicy } from "@/domain/policies/order-constraint.policy";
import { env } from "./env-reader";

export class OrderConstraintPolicyEnvConfig implements OrderConstraintPolicy {
  minimumOrderQuantity: number;
  orderExpiryInMinutes: number;

  constructor() {
    this.minimumOrderQuantity = env.number("MINIMUM_ORDER_QUANTITY", 1);
    this.orderExpiryInMinutes = env.number("ORDER_EXPIRY_IN_MINUTES", 15);
    this.validate();
  }

  private validate(): void {
    if (this.minimumOrderQuantity <= 0) throw new Error("MINIMUM_ORDER_QUANTITY must be greater than 0");
    if (this.orderExpiryInMinutes <= 0) throw new Error("ORDER_EXPIRY_IN_MINUTES must be greater than 0");
  }
}
