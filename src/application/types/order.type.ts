import { DeliveryType, OrderStatus, OrderType, ReservationStatus } from "@/domain/types/order.type";
import { LocationPlainObject } from "./location.type";
import { PaymentMethod, PaymentStatus } from "@/domain/types/payment-transaction.type";

export interface OrderCustomerAsMemberPlainObject {
  memberId: string | null;
}

export interface OrderCustomerAsGuestPlainObject {
  guestName: string | null;
  guestEmail: string | null;
}

export type OrderCustomerPlainObject = OrderCustomerAsMemberPlainObject | OrderCustomerAsGuestPlainObject;

export interface OnlineOrderFulfillmentInfoPlainObject {
  deliveryType: DeliveryType;
  deliveryLocation: LocationPlainObject | null;
  scheduledAt: Date | null;
}

export interface ReservationOrderFulfillmentInfoPlainObject {
  tableId: string;
  reservedAt: Date;
  partySize: number;
  durationInMinutes: number;
  reservationStatus: ReservationStatus;
  notes: string | null;
}

export interface DineInOrderFulfillmentInfoPlainObject {
  tableId: string;
  tableNumber: string;
  guestCount: number;
  cashierSessionId: string | null;
}

export interface OrderItemPlainObject {
  productId: string;
  productName: string;
  priceSnapshot: number;
  quantity: number;
  note: string | null;
}

export interface OrderPaymentInfoPlainObject {
  status: PaymentStatus;
  method: PaymentMethod | null;
  paidAt: Date | null;
  transactionId: string | null;
}

export interface OrderPricingPlainObject {
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  deliveryFee: number;
}

export interface BaseOrderPlainObject {
  id: string;
  items: OrderItemPlainObject[];
  payment: OrderPaymentInfoPlainObject;
  pricing: OrderPricingPlainObject;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DineInOrderPlainObject extends BaseOrderPlainObject {
  type: OrderType.DINEIN;
  fulfillment: DineInOrderFulfillmentInfoPlainObject;
}

export interface OnlineOrderPlainObject extends BaseOrderPlainObject {
  type: OrderType.ONLINE;
  customer: OrderCustomerPlainObject;
  fulfillment: OnlineOrderFulfillmentInfoPlainObject;
}

export interface ReservationOrderPlainObject extends BaseOrderPlainObject {
  type: OrderType.RESERVATION;
  customer: OrderCustomerPlainObject;
  fulfillment: ReservationOrderFulfillmentInfoPlainObject;
}

export type OrderPlainObject = DineInOrderPlainObject | OnlineOrderPlainObject | ReservationOrderPlainObject;

export interface OrderItemDetailView extends OrderItemPlainObject {
  imageUrl: string | null;
}

export interface OnlineOrderDetailsView {
  id: string;
  type: OrderType.ONLINE;
  customer: OrderCustomerPlainObject;
  fulfillment: OnlineOrderFulfillmentInfoPlainObject;
  items: OrderItemDetailView[];
  payment: OrderPaymentInfoPlainObject;
  pricing: OrderPricingPlainObject;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationOrderDetailsView {
  id: string;
  type: OrderType.RESERVATION;
  customer: OrderCustomerPlainObject;
  fulfillment: ReservationOrderFulfillmentInfoPlainObject;
  items: OrderItemDetailView[];
  payment: OrderPaymentInfoPlainObject;
  pricing: OrderPricingPlainObject;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DineInOrderDetailsView {
  id: string;
  type: OrderType.DINEIN;
  fulfillment: DineInOrderFulfillmentInfoPlainObject;
  items: OrderItemDetailView[];
  payment: OrderPaymentInfoPlainObject;
  pricing: OrderPricingPlainObject;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDetailsView = OnlineOrderDetailsView | ReservationOrderDetailsView | DineInOrderDetailsView;

export interface OrderSummaryView {
  id: string;
  type: OrderType;
  status: OrderStatus;
  itemCount: number;
  total: number;
  createdAt: Date;
}
