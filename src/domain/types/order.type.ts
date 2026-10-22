import { Money } from "../value-objects/money.vo";
import { OrderItem } from "../value-objects/order-item.vo";
import { LocationRebuildData } from "./location.type";
import { PaymentMethod, PaymentStatus } from "./payment-transaction.type";

export enum OrderCustomerType {
  MEMBER = "MEMBER",
  GUEST = "GUEST",
  ANONYMOUS = "ANONYMOUS",
}

export interface OrderCustomerCreationData {
  memberId?: string;
  guestName?: string;
  guestEmail?: string;
}

export interface OrderCustomerRebuildData {
  type: OrderCustomerType;
  memberId: string | null;
  guestName: string | null;
  guestEmail: string | null;
}

export interface DineInInfoCreationData {
  tableId: string;
  tableNumber: string;
  guestCount: number;
  cashierSessionId?: string;
}

export interface DineInInfoRebuildData {
  tableId: string;
  tableNumber: string;
  guestCount: number;
  cashierSessionId: string | null;
}

export enum DeliveryType {
  DELIVERY = "DELIVERY",
  PICKUP = "PICKUP",
}

export interface OnlineInfoCreationData {
  deliveryType: DeliveryType;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  scheduledAt?: Date;
}

export interface OnlineInfoRebuildData {
  deliveryType: DeliveryType;
  deliveryLocation: LocationRebuildData | null;
  scheduledAt: Date | null;
}

export enum ReservationStatus {
  BOOKED = "BOOKED",
  SEATED = "SEATED",
  NO_SHOW = "NO_SHOW",
  CANCELLED = "CANCELLED",
}

export interface ReservationInfoCreationData {
  tableId: string;
  reservedAt: Date;
  partySize: number;
  durationInMinutes: number;
  reservationStatus?: ReservationStatus;
  notes?: string;
}

export interface ReservationInfoRebuildData {
  tableId: string;
  reservedAt: Date;
  partySize: number;
  durationInMinutes: number;
  reservationStatus: ReservationStatus;
  notes: string | null;
}

export interface OrderFulfillmentInfoRebuildData {
  type: OrderType;
  dineIn: DineInInfoRebuildData | null;
  online: OnlineInfoRebuildData | null;
  reservation: ReservationInfoRebuildData | null;
}

export interface OrderItemCreationData {
  productId: string;
  productName: string;
  priceSnapshot: number;
  quantity: number;
  note?: string;
}

export interface OrderItemRebuildData {
  productId: string;
  productName: string;
  priceSnapshot: number;
  quantity: number;
  note: string | null;
}

export interface OrderPaymentInfoRebuildData {
  status: PaymentStatus;
  method: PaymentMethod | null;
  paidAt: Date | null;
  transactionId: string | null;
}

export interface OrderPricingCalculationData {
  items: OrderItem[];
  taxRatePercent: number;
  serviceChargeRatePercent: number;
  deliveryFee?: Money;
  discount?: Money;
}

export interface OrderPricingRebuildData {
  subtotal: number;
  tax: number;
  serviceCharge: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

export enum OrderType {
  RESERVATION = "RESERVATION",
  ONLINE = "ONLINE",
  DINEIN = "DINEIN",
}

export interface BaseOrderCreationData {
  id: string;
  items: OrderItemCreationData[];
  taxRatePercent: number;
  serviceChargeRatePercent: number;
  discount?: number;
}

export interface DineInOrderCreationData extends BaseOrderCreationData {
  fulfillment: DineInInfoCreationData;
}

export interface OnlineOrderCreationData extends BaseOrderCreationData {
  customer: OrderCustomerCreationData;
  fulfillment: OnlineInfoCreationData;
  deliveryFee?: number;
}

export interface ReservationOrderCreationData extends BaseOrderCreationData {
  customer: OrderCustomerCreationData;
  fulfillment: ReservationInfoCreationData;
}

export interface OrderRebuildData {
  id: string;
  customer: OrderCustomerRebuildData;
  type: OrderType;
  fulfillment: OrderFulfillmentInfoRebuildData;
  items: OrderItemRebuildData[];
  pricing: OrderPricingRebuildData;
  payment: OrderPaymentInfoRebuildData;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}
