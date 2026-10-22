import { Order } from "@/domain/entities/order.entity";
import { OrderStatus, OrderType } from "@/domain/types/order.type";

export enum OrderSort {
  NEWEST = "NEWEST",
  OLDEST = "OLDEST",
}

export interface BrowseOrdersQuery {
  memberId?: string;
  guestEmail?: string;
  type?: OrderType;
  status?: OrderStatus;
  sort?: OrderSort;
}

export interface OrderRepositoryPort {
  insert(order: Order): Promise<void>;
  update(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  browse(query: BrowseOrdersQuery): Promise<Order[]>;
}
