import { DeliveryDistanceExceededException } from "../exceptions/order.exceptions";
import { DeliveryFeePolicy } from "../policies/delivery-fee.policy";
import { Money } from "../value-objects/money.vo";

export class DeliveryFeeCalculatorService {
  static calculate(distanceKm: number, policy: DeliveryFeePolicy): Money {
    if (distanceKm > policy.maxDeliveryDistanceKm) {
      throw new DeliveryDistanceExceededException(distanceKm, policy.maxDeliveryDistanceKm);
    }
    if (distanceKm <= policy.freeDeliveryRadiusKm) {
      return Money.zero();
    }
    if (distanceKm <= policy.baseFeeCoversUpToKm) {
      return new Money(policy.baseFee);
    }
    const extraKm = Math.ceil(distanceKm - policy.baseFeeCoversUpToKm);
    return new Money(policy.baseFee + extraKm * policy.perKmRateBeyondBase);
  }
}
