import { DeliveryFeePolicy } from "@/domain/policies/delivery-fee.policy";
import { env } from "./env-reader";

export class DeliveryFeePolicyEnvConfig implements DeliveryFeePolicy {
  baseFee: number;
  baseFeeCoversUpToKm: number;
  freeDeliveryRadiusKm: number;
  maxDeliveryDistanceKm: number;
  perKmRateBeyondBase: number;

  constructor() {
    this.baseFee = env.number("BASE_FEE", 5000);
    this.baseFeeCoversUpToKm = env.number("BASE_FEE_COVERS_UP_TO_KM", 3);
    this.freeDeliveryRadiusKm = env.number("FREE_DELIVERY_RADIUS_KM", 1);
    this.maxDeliveryDistanceKm = env.number("MAX_DELIVERY_DISTANCE_KM", 30);
    this.perKmRateBeyondBase = env.number("PER_KM_RATE_BEYOND_BASE", 1500);
  }

  private validate(): void {
    if (this.baseFee < 0) throw new Error("Delivery fee cannot be negative");
    if (this.baseFeeCoversUpToKm < 0) throw new Error("Base fee covers up to km cannot be negative");
    if (this.freeDeliveryRadiusKm < 0) throw new Error("Free delivery radius cannot be negative");
    if (this.maxDeliveryDistanceKm < 0) throw new Error("Max delivery distance cannot be negative");
    if (this.perKmRateBeyondBase < 0) throw new Error("Per km rate beyond base cannot be negative");
  }
}
