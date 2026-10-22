import { OrderPricingPlainObject } from "@/application/types/order.type";

export interface GetOnlineOrderQuoteCommand {
  items: Array<{ productId: string; quantity: number }>;
  memberId?: string;
  deliveryCoordinate?: { latitude: number; longitude: number };
}

export type GetOnlineOrderQuoteResult = OrderPricingPlainObject;

export interface GetOnlineOrderQuoteUseCasePort {
  execute(command: GetOnlineOrderQuoteCommand): Promise<GetOnlineOrderQuoteResult>;
}
