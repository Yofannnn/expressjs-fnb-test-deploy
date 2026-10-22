import { PricingPolicy } from "@/domain/policies/pricing.policy";
import { OrderType } from "@/domain/types/order.type";
import { env } from "./env-reader";

export class PricingPolicyEnvConfig implements PricingPolicy {
  readonly serviceChargeApplicableTypes: OrderType[];
  readonly serviceChargeRatePercent: number;
  readonly taxRatePercent: number;

  constructor() {
    this.serviceChargeApplicableTypes = env.array("SERVICE_CHARGE_APPLICABLE_TYPES", [OrderType.ONLINE, OrderType.DINEIN]) as OrderType[];
    this.serviceChargeRatePercent = env.number("SERVICE_CHARGE_RATE_PERCENT", 5);
    this.taxRatePercent = env.number("TAX_RATE_PERCENT", 11);

    this.validate();
  }

  private validate(): void {
    this.validatePercentage("SERVICE_CHARGE_RATE_PERCENT", this.serviceChargeRatePercent);
    this.validatePercentage("TAX_RATE_PERCENT", this.taxRatePercent);
    this.validateOrderTypes(this.serviceChargeApplicableTypes);
  }

  private validatePercentage(name: string, value: number): void {
    if (value < 0 || value > 100) {
      throw new Error(`${name} must be between 0 and 100`);
    }
  }

  private validateOrderTypes(types: OrderType[]): void {
    const validTypes = new Set(Object.values(OrderType));

    for (const type of types) {
      if (!validTypes.has(type)) {
        throw new Error(`Invalid order type: ${type}`);
      }
    }
  }
}
