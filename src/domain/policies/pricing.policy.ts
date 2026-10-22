import { OrderType } from "../types/order.type";

export interface PricingPolicy {
  taxRatePercent: number;
  serviceChargeRatePercent: number;
  serviceChargeApplicableTypes: OrderType[];
}
