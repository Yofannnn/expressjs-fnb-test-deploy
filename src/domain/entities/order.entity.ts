import { AggregateRoot } from "../common/aggregate-root";
import { OrderCustomer } from "../value-objects/order-customer.vo";
import { DineInInfo, OnlineInfo, OrderFulfillmentInfo, ReservationInfo } from "../value-objects/order-fulfillment-info.vo";
import { OrderItem } from "../value-objects/order-item.vo";
import { OrderPricing } from "../value-objects/order-pricing.vo";
import { OrderPaymentInfo } from "../value-objects/order-payment-info.vo";
import { Money } from "../value-objects/money.vo";
import { PaymentMethod } from "../types/payment-transaction.type";
import {
  DineInOrderCreationData,
  OnlineOrderCreationData,
  OrderRebuildData,
  OrderStatus,
  OrderType,
  ReservationOrderCreationData,
} from "../types/order.type";
import { InvalidOrderStatusTransitionException, InvalidOrderTypeOperationException, OrderAlreadyPaidException } from "../exceptions/order.exceptions";
import {
  DineInOrderCreatedEvent,
  OnlineOrderCreatedEvent,
  ReservationOrderCreatedEvent,
  OrderPaidEvent,
  OrderConfirmedEvent,
  OrderPreparationStartedEvent,
  OrderReadyEvent,
  OrderCompletedEvent,
  OrderCancelledEvent,
  OrderRejectedEvent,
  ReservationCancelledEvent,
  ReservationNoShowEvent,
  ReservationSeatedEvent,
} from "../events/order.events";

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REJECTED]: [],
};

export class Order extends AggregateRoot {
  private constructor(
    private readonly id: string,
    private customer: OrderCustomer,
    private readonly type: OrderType,
    private fulfillment: OrderFulfillmentInfo,
    private items: OrderItem[],
    private pricing: OrderPricing,
    private payment: OrderPaymentInfo,
    private status: OrderStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  getId(): string {
    return this.id;
  }

  getType(): OrderType {
    return this.type;
  }

  getStatus(): OrderStatus {
    return this.status;
  }

  getCustomer(): OrderCustomer {
    return this.customer;
  }

  getItems(): readonly OrderItem[] {
    return this.items;
  }

  getPricing(): OrderPricing {
    return this.pricing;
  }

  getFulfillment(): OrderFulfillmentInfo {
    return this.fulfillment;
  }

  getPayment(): OrderPaymentInfo {
    return this.payment;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  isOwnedByMember(memberId: string): boolean {
    return this.customer.getMemberId() === memberId;
  }

  isOwnedByGuest(email: string): boolean {
    return this.customer.getGuestEmail() === email;
  }

  confirm(): void {
    const previousStatus = this.status;
    this.transitionTo(OrderStatus.CONFIRMED);
    this.touch();
    this.emit(new OrderConfirmedEvent(this.id, previousStatus));
  }

  startPreparing(): void {
    const previousStatus = this.status;
    this.transitionTo(OrderStatus.PREPARING);
    this.touch();
    this.emit(new OrderPreparationStartedEvent(this.id, previousStatus));
  }

  markReady(): void {
    const previousStatus = this.status;
    this.transitionTo(OrderStatus.READY);
    this.touch();
    this.emit(new OrderReadyEvent(this.id, previousStatus));
  }

  complete(): void {
    const previousStatus = this.status;
    this.transitionTo(OrderStatus.COMPLETED);
    this.touch();
    this.emit(new OrderCompletedEvent(this.id, previousStatus));
  }

  cancel(): void {
    const previousStatus = this.status;
    this.transitionTo(OrderStatus.CANCELLED);
    this.touch();
    this.emit(new OrderCancelledEvent(this.id, previousStatus));
  }

  reject(): void {
    const previousStatus = this.status;
    this.transitionTo(OrderStatus.REJECTED);
    this.touch();
    this.emit(new OrderRejectedEvent(this.id, previousStatus));
  }

  pay(method: PaymentMethod, transactionId: string): void {
    this.assertNotPaid();
    this.payment = this.payment.markAsPaid(method, transactionId);
    this.touch();
    this.emit(new OrderPaidEvent(this.id, method, transactionId));
  }

  seatReservation(): void {
    const reservation = this.updateReservation("seat a reservation", (r) => r.seated());
    this.touch();
    this.emit(new ReservationSeatedEvent(this.id, reservation.getTableId()));
  }

  markReservationNoShow(): void {
    const previousStatus = this.status;
    const reservation = this.updateReservation("mark a reservation as no-show", (r) => r.noShow());
    this.transitionTo(OrderStatus.CANCELLED);
    this.emit(new ReservationNoShowEvent(this.id, reservation.getTableId()));
    this.emit(new OrderCancelledEvent(this.id, previousStatus, "no-show"));
    this.touch();
  }

  markReservationCancelled(): void {
    const previousStatus = this.status;
    const reservation = this.updateReservation("cancel a reservation", (r) => r.cancelled());
    this.transitionTo(OrderStatus.CANCELLED);
    this.emit(new ReservationCancelledEvent(this.id, reservation.getTableId()));
    this.emit(new OrderCancelledEvent(this.id, previousStatus));
    this.touch();
  }

  assertNotPaid(): void {
    if (this.payment.isPaid()) throw new OrderAlreadyPaidException(this.id);
  }

  private updateReservation(operation: string, fn: (r: ReservationInfo) => ReservationInfo): ReservationInfo {
    if (this.type !== OrderType.RESERVATION) throw new InvalidOrderTypeOperationException(this.id, operation, OrderType.RESERVATION, this.type);
    const reservation = fn(this.fulfillment.asReservation());
    this.fulfillment = this.fulfillment.withReservation(reservation);
    return reservation;
  }

  private canTransitionStatus(from: OrderStatus, to: OrderStatus): boolean {
    return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  private transitionTo(next: OrderStatus): void {
    if (!this.canTransitionStatus(this.status, next)) throw new InvalidOrderStatusTransitionException(this.id, this.status, next);
    this.status = next;
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  static createDineInOrder(data: DineInOrderCreationData): Order {
    const orderItems = data.items.map((item) => OrderItem.create(item));
    const now = new Date();

    const order = new Order(
      data.id,
      OrderCustomer.create(),
      OrderType.DINEIN,
      OrderFulfillmentInfo.dineIn(DineInInfo.create(data.fulfillment)),
      orderItems,
      OrderPricing.calculate({
        items: orderItems,
        taxRatePercent: data.taxRatePercent,
        serviceChargeRatePercent: data.serviceChargeRatePercent,
        discount: new Money(data.discount ?? 0),
      }),
      OrderPaymentInfo.unpaid(),
      OrderStatus.PENDING,
      now,
      now,
    );

    order.emit(
      new DineInOrderCreatedEvent(
        order.id,
        {
          cashierSessionId: order.fulfillment.asDineIn().getCashierSessionId(),
          guestCount: order.fulfillment.asDineIn().getGuestCount(),
          tableId: order.fulfillment.asDineIn().getTableId(),
          tableNumber: order.fulfillment.asDineIn().getTableNumber(),
        },
        {
          subtotal: order.pricing.getSubtotal().getAmount(),
          tax: order.pricing.getTax().getAmount(),
          serviceCharge: order.pricing.getServiceCharge().getAmount(),
          deliveryFee: order.pricing.getDeliveryFee().getAmount(),
          discount: order.pricing.getDiscount().getAmount(),
          total: order.pricing.getTotal().getAmount(),
        },
        order.items.map((item) => ({
          productId: item.getProductId(),
          productName: item.getProductName(),
          priceSnapshot: item.getPriceSnapshot().getAmount(),
          quantity: item.getQuantity(),
          note: item.getNote(),
        })),
      ),
    );

    return order;
  }

  static createOnlineOrder(data: OnlineOrderCreationData): Order {
    const orderItems = data.items.map((item) => OrderItem.create(item));
    const now = new Date();

    const order = new Order(
      data.id,
      OrderCustomer.create(data.customer),
      OrderType.ONLINE,
      OrderFulfillmentInfo.online(OnlineInfo.create(data.fulfillment)),
      orderItems,
      OrderPricing.calculate({
        items: orderItems,
        taxRatePercent: data.taxRatePercent,
        serviceChargeRatePercent: data.serviceChargeRatePercent,
        deliveryFee: new Money(data.deliveryFee ?? 0),
        discount: new Money(data.discount ?? 0),
      }),
      OrderPaymentInfo.unpaid(),
      OrderStatus.PENDING,
      now,
      now,
    );

    order.emit(
      new OnlineOrderCreatedEvent(
        order.id,
        {
          guestEmail: order.customer.getGuestEmail(),
          guestName: order.customer.getGuestName(),
          memberId: order.customer.getMemberId(),
        },
        {
          deliveryLocation: order.fulfillment.asOnline().getDeliveryLocation()
            ? {
                address: order.fulfillment.asOnline().getDeliveryLocation()!.getAddress(),
                latitude: order.fulfillment.asOnline().getDeliveryLocation()!.getCoordinate().getLatitude(),
                longitude: order.fulfillment.asOnline().getDeliveryLocation()!.getCoordinate().getLongitude(),
              }
            : null,
          deliveryType: order.fulfillment.asOnline().getDeliveryType(),
          scheduledAt: order.fulfillment.asOnline().getScheduledAt(),
        },
        {
          subtotal: order.pricing.getSubtotal().getAmount(),
          tax: order.pricing.getTax().getAmount(),
          serviceCharge: order.pricing.getServiceCharge().getAmount(),
          deliveryFee: order.pricing.getDeliveryFee().getAmount(),
          discount: order.pricing.getDiscount().getAmount(),
          total: order.pricing.getTotal().getAmount(),
        },
        order.items.map((item) => ({
          productId: item.getProductId(),
          productName: item.getProductName(),
          priceSnapshot: item.getPriceSnapshot().getAmount(),
          quantity: item.getQuantity(),
          note: item.getNote(),
        })),
      ),
    );

    return order;
  }

  static createReservationOrder(data: ReservationOrderCreationData): Order {
    const orderItems = data.items ? data.items.map((item) => OrderItem.create(item)) : [];
    const now = new Date();

    const order = new Order(
      data.id,
      OrderCustomer.create(data.customer),
      OrderType.RESERVATION,
      OrderFulfillmentInfo.reservation(ReservationInfo.create(data.fulfillment)),
      orderItems,
      OrderPricing.calculate({
        items: orderItems,
        taxRatePercent: data.taxRatePercent,
        serviceChargeRatePercent: data.serviceChargeRatePercent,
        discount: new Money(data.discount ?? 0),
      }),
      OrderPaymentInfo.unpaid(),
      OrderStatus.PENDING,
      now,
      now,
    );

    order.emit(
      new ReservationOrderCreatedEvent(
        order.id,
        {
          memberId: order.customer.getMemberId(),
          guestName: order.customer.getGuestName(),
          guestEmail: order.customer.getGuestEmail(),
        },
        {
          tableId: order.fulfillment.asReservation().getTableId(),
          reservedAt: order.fulfillment.asReservation().getReservedAt(),
          partySize: order.fulfillment.asReservation().getPartySize(),
          durationInMinutes: order.fulfillment.asReservation().getDurationInMinutes(),
          reservationStatus: order.fulfillment.asReservation().getReservationStatus(),
          notes: order.fulfillment.asReservation().getNotes(),
        },
        {
          subtotal: order.pricing.getSubtotal().getAmount(),
          tax: order.pricing.getTax().getAmount(),
          serviceCharge: order.pricing.getServiceCharge().getAmount(),
          deliveryFee: order.pricing.getDeliveryFee().getAmount(),
          discount: order.pricing.getDiscount().getAmount(),
          total: order.pricing.getTotal().getAmount(),
        },
        order.items.map((item) => ({
          productId: item.getProductId(),
          productName: item.getProductName(),
          priceSnapshot: item.getPriceSnapshot().getAmount(),
          quantity: item.getQuantity(),
          note: item.getNote(),
        })),
      ),
    );

    return order;
  }

  static rebuild(data: OrderRebuildData): Order {
    return new Order(
      data.id,
      OrderCustomer.rebuild(data.customer),
      data.type,
      OrderFulfillmentInfo.rebuild(data.fulfillment),
      data.items.map((item) => OrderItem.rebuild(item)),
      OrderPricing.rebuild(data.pricing),
      OrderPaymentInfo.rebuild(data.payment),
      data.status,
      data.createdAt,
      data.updatedAt,
    );
  }
}
