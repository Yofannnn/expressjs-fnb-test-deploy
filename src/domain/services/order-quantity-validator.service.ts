import { MinimumOrderQuantityNotMetException } from "../exceptions/order.exceptions";
import { OrderConstraintPolicy } from "../policies/order-constraint.policy";

export class OrderQuantityValidatorService {
  static assertMinimumQuantityMet(totalQuantity: number, policy: OrderConstraintPolicy): void {
    if (totalQuantity < policy.minimumOrderQuantity) {
      throw new MinimumOrderQuantityNotMetException(policy.minimumOrderQuantity, totalQuantity);
    }
  }
}
