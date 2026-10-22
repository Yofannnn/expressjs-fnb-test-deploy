import { DeliveryType } from "@/domain/types/order.type";

export interface CreateOnlineOrderItem {
  productId: string;
  quantity: number;
  note?: string;
}

export interface CreateOnlineOrderCommand {
  memberId?: string;
  guestName?: string;
  guestEmail?: string;
  deliveryType: DeliveryType;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  scheduledAt?: Date;
  items: CreateOnlineOrderItem[];
}

export interface CreateOnlineOrderResult {
  id: string;
}

export interface CreateOnlineOrderUseCasePort {
  execute(command: CreateOnlineOrderCommand): Promise<CreateOnlineOrderResult>;
}
