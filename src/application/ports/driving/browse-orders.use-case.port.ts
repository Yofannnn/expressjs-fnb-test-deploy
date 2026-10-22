import { OrderSummaryView } from "@/application/types/order.type";
import { OrderStatus, OrderType } from "@/domain/types/order.type";
import { UserRoleType } from "@/domain/types/user.type";

export enum OrderSort {
  NEWEST = "NEWEST",
  OLDEST = "OLDEST",
}

export interface BrowseOrdersQueryCommand {
  type?: OrderType;
  status?: OrderStatus;
  sort?: OrderSort;
}

export interface BrowseOrdersCommand {
  userId: string;
  role: UserRoleType;
  query: BrowseOrdersQueryCommand;
}

export type BrowseOrdersResult = OrderSummaryView[];

export interface BrowseOrdersUseCasePort {
  execute(command: BrowseOrdersCommand): Promise<BrowseOrdersResult>;
}
