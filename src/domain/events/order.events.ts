import { BaseDomainEvent } from "./base-domain.event";
import { DomainEventType } from "../types/domain-event.type";
import { DeliveryType, OrderStatus, ReservationStatus } from "../types/order.type";
import { PaymentMethod } from "../types/payment-transaction.type";

interface OrderCustomerAsMemberData {
  memberId: string | null;
}

interface OrderCustomerAsGuestData {
  guestName: string | null;
  guestEmail: string | null;
}

type OrderCustomerData = OrderCustomerAsMemberData | OrderCustomerAsGuestData;

interface OnlineOrderFulfillmentInfoData {
  deliveryType: DeliveryType;
  deliveryLocation: {
    address: string;
    latitude: number;
    longitude: number;
  } | null;
  scheduledAt: Date | null;
}

interface ReservationOrderFulfillmentInfoData {
  tableId: string;
  reservedAt: Date;
  partySize: number;
  durationInMinutes: number;
  reservationStatus: ReservationStatus;
  notes: string | null;
}

interface DineInOrderFulfillmentInfoData {
  tableId: string;
  tableNumber: string;
  guestCount: number;
  cashierSessionId: string | null;
}

interface OrderItemData {
  productId: string;
  productName: string;
  priceSnapshot: number;
  quantity: number;
  note: string | null;
}

interface OrderPricingData {
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  deliveryFee: number;
}

export class DineInOrderCreatedEvent extends BaseDomainEvent<{
  fulfillment: DineInOrderFulfillmentInfoData;
  pricing: OrderPricingData;
  items: OrderItemData[];
}> {
  constructor(aggregateId: string, fulfillment: DineInOrderFulfillmentInfoData, pricing: OrderPricingData, items: OrderItemData[]) {
    super(aggregateId, DomainEventType.DINEIN_ORDER_CREATED, { fulfillment, pricing, items });
  }
}

export class OnlineOrderCreatedEvent extends BaseDomainEvent<{
  customer: OrderCustomerData;
  fulfillment: OnlineOrderFulfillmentInfoData;
  pricing: OrderPricingData;
  items: OrderItemData[];
}> {
  constructor(
    aggregateId: string,
    customer: OrderCustomerData,
    fulfillment: OnlineOrderFulfillmentInfoData,
    pricing: OrderPricingData,
    items: OrderItemData[],
  ) {
    super(aggregateId, DomainEventType.ONLINE_ORDER_CREATED, { customer, fulfillment, pricing, items });
  }
}

export class ReservationOrderCreatedEvent extends BaseDomainEvent<{
  customer: OrderCustomerData;
  fulfillment: ReservationOrderFulfillmentInfoData;
  pricing: OrderPricingData;
  items: OrderItemData[];
}> {
  constructor(
    aggregateId: string,
    customer: OrderCustomerData,
    fulfillment: ReservationOrderFulfillmentInfoData,
    pricing: OrderPricingData,
    items: OrderItemData[],
  ) {
    super(aggregateId, DomainEventType.RESERVATION_ORDER_CREATED, { customer, fulfillment, pricing, items });
  }
}

export class OrderPaidEvent extends BaseDomainEvent<{ method: PaymentMethod; transactionId: string }> {
  constructor(aggregateId: string, method: PaymentMethod, transactionId: string) {
    super(aggregateId, DomainEventType.ORDER_PAID, { method, transactionId });
  }
}

export class OrderConfirmedEvent extends BaseDomainEvent<{ previousStatus: OrderStatus }> {
  constructor(aggregateId: string, previousStatus: OrderStatus) {
    super(aggregateId, DomainEventType.ORDER_CONFIRMED, { previousStatus });
  }
}

export class OrderPreparationStartedEvent extends BaseDomainEvent<{ previousStatus: OrderStatus }> {
  constructor(aggregateId: string, previousStatus: OrderStatus) {
    super(aggregateId, DomainEventType.ORDER_PREPARING, { previousStatus });
  }
}

export class OrderReadyEvent extends BaseDomainEvent<{ previousStatus: OrderStatus }> {
  constructor(aggregateId: string, previousStatus: OrderStatus) {
    super(aggregateId, DomainEventType.ORDER_READY, { previousStatus });
  }
}

export class OrderCompletedEvent extends BaseDomainEvent<{ previousStatus: OrderStatus }> {
  constructor(aggregateId: string, previousStatus: OrderStatus) {
    super(aggregateId, DomainEventType.ORDER_COMPLETED, { previousStatus });
  }
}

export class OrderCancelledEvent extends BaseDomainEvent<{ previousStatus: OrderStatus; reason?: string }> {
  constructor(aggregateId: string, previousStatus: OrderStatus, reason?: string) {
    super(aggregateId, DomainEventType.ORDER_CANCELLED, { previousStatus, reason });
  }
}

export class OrderRejectedEvent extends BaseDomainEvent<{ previousStatus: OrderStatus }> {
  constructor(aggregateId: string, previousStatus: OrderStatus) {
    super(aggregateId, DomainEventType.ORDER_REJECTED, { previousStatus });
  }
}

export class ReservationSeatedEvent extends BaseDomainEvent<{ tableId: string }> {
  constructor(aggregateId: string, tableId: string) {
    super(aggregateId, DomainEventType.RESERVATION_SEATED, { tableId });
  }
}

export class ReservationNoShowEvent extends BaseDomainEvent<{ tableId: string }> {
  constructor(aggregateId: string, tableId: string) {
    super(aggregateId, DomainEventType.RESERVATION_NO_SHOW, { tableId });
  }
}

export class ReservationCancelledEvent extends BaseDomainEvent<{ tableId: string }> {
  constructor(aggregateId: string, tableId: string) {
    super(aggregateId, DomainEventType.RESERVATION_CANCELLED, { tableId });
  }
}
