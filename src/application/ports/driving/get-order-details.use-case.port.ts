import { OrderDetailsView } from "@/application/types/order.type";

export interface GetOrderDetailsCommand {
  id: string;
  memberId?: string;
  guestToken?: string;
}

export type GetOrderDetailsResult = OrderDetailsView;

export interface GetOrderDetailsUseCasePort {
  execute(command: GetOrderDetailsCommand): Promise<GetOrderDetailsResult>;
}
