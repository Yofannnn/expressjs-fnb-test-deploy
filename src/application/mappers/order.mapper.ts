import { Order } from "@/domain/entities/order.entity";
import { Product } from "@/domain/entities/product.entity";
import { OrderPricing } from "@/domain/value-objects/order-pricing.vo";
import { OrderItem } from "@/domain/value-objects/order-item.vo";
import { OrderCustomer } from "@/domain/value-objects/order-customer.vo";
import { DineInInfo, OnlineInfo, ReservationInfo } from "@/domain/value-objects/order-fulfillment-info.vo";
import { OrderPaymentInfo } from "@/domain/value-objects/order-payment-info.vo";
import { OrderType } from "@/domain/types/order.type";
import {
  BaseOrderPlainObject,
  DineInOrderFulfillmentInfoPlainObject,
  DineInOrderPlainObject,
  OnlineOrderFulfillmentInfoPlainObject,
  OnlineOrderPlainObject,
  OrderCustomerPlainObject,
  OrderDetailsView,
  OrderItemDetailView,
  OrderItemPlainObject,
  OrderPaymentInfoPlainObject,
  OrderPlainObject,
  OrderPricingPlainObject,
  OrderSummaryView,
  ReservationOrderFulfillmentInfoPlainObject,
  ReservationOrderPlainObject,
} from "../types/order.type";

export class OrderMapper {
  static toPlainObject(order: Order): OrderPlainObject {
    switch (order.getType()) {
      case OrderType.ONLINE:
        return this.toOnlineOrderPlainObject(order);
      case OrderType.RESERVATION:
        return this.toReservationOrderPlainObject(order);
      case OrderType.DINEIN:
        return this.toDineInOrderPlainObject(order);
    }
  }

  static toOnlineOrderPlainObject(order: Order): OnlineOrderPlainObject {
    return {
      ...this.mapBase(order),
      type: OrderType.ONLINE,
      customer: this.toOrderCustomerPlainObject(order),
      fulfillment: this.toOnlineOrderFulfillmentInfoPlainObject(order),
    };
  }

  static toReservationOrderPlainObject(order: Order): ReservationOrderPlainObject {
    return {
      ...this.mapBase(order),
      type: OrderType.RESERVATION,
      customer: this.toOrderCustomerPlainObject(order),
      fulfillment: this.toReservationOrderFulfillmentInfoPlainObject(order),
    };
  }

  static toDineInOrderPlainObject(order: Order): DineInOrderPlainObject {
    return {
      ...this.mapBase(order),
      type: OrderType.DINEIN,
      fulfillment: this.toDineInOrderFulfillmentInfoPlainObject(order),
    };
  }

  private static mapBase(order: Order): Omit<BaseOrderPlainObject, "type"> {
    return {
      id: order.getId(),
      status: order.getStatus(),
      items: this.toOrderItemPlainObject(order),
      payment: this.toOrderPaymentInfoPlainObject(order),
      pricing: this.toOrderPricingPlainObject(order),
      createdAt: order.getCreatedAt(),
      updatedAt: order.getUpdatedAt(),
    };
  }

  static toOrderItemPlainObject(data: Order | OrderItem[]): OrderItemPlainObject[] {
    const items = data instanceof Order ? data.getItems() : data;

    return items.map((item) => ({
      productId: item.getProductId(),
      productName: item.getProductName(),
      priceSnapshot: item.getPriceSnapshot().getAmount(),
      quantity: item.getQuantity(),
      note: item.getNote(),
    }));
  }

  static toOrderPaymentInfoPlainObject(data: Order | OrderPaymentInfo): OrderPaymentInfoPlainObject {
    const payment = data instanceof Order ? data.getPayment() : data;

    return {
      method: payment.getMethod(),
      status: payment.getStatus(),
      paidAt: payment.getPaidAt(),
      transactionId: payment.getTransactionId(),
    };
  }

  static toOrderPricingPlainObject(data: Order | OrderPricing): OrderPricingPlainObject {
    const pricing = data instanceof Order ? data.getPricing() : data;

    return {
      subtotal: pricing.getSubtotal().getAmount(),
      tax: pricing.getTax().getAmount(),
      serviceCharge: pricing.getServiceCharge().getAmount(),
      discount: pricing.getDiscount().getAmount(),
      deliveryFee: pricing.getDeliveryFee().getAmount(),
      total: pricing.getTotal().getAmount(),
    };
  }

  static toOrderCustomerPlainObject(data: Order | OrderCustomer): OrderCustomerPlainObject {
    const customer = data instanceof Order ? data.getCustomer() : data;

    if (customer.getMemberId()) {
      return {
        memberId: customer.getMemberId()!,
      };
    }

    return {
      guestName: customer.getGuestName()!,
      guestEmail: customer.getGuestEmail()!,
    };
  }

  static toOnlineOrderFulfillmentInfoPlainObject(data: Order | OnlineInfo): OnlineOrderFulfillmentInfoPlainObject {
    const online = data instanceof Order ? data.getFulfillment().asOnline() : data;
    const location = online.getDeliveryLocation();

    return {
      deliveryType: online.getDeliveryType(),
      scheduledAt: online.getScheduledAt(),
      deliveryLocation: location
        ? {
            address: location.getAddress(),
            latitude: location.getCoordinate().getLatitude(),
            longitude: location.getCoordinate().getLongitude(),
          }
        : null,
    };
  }

  static toReservationOrderFulfillmentInfoPlainObject(data: Order | ReservationInfo): ReservationOrderFulfillmentInfoPlainObject {
    const reservation = data instanceof Order ? data.getFulfillment().asReservation() : data;

    return {
      tableId: reservation.getTableId(),
      reservedAt: reservation.getReservedAt(),
      durationInMinutes: reservation.getDurationInMinutes(),
      partySize: reservation.getPartySize(),
      reservationStatus: reservation.getReservationStatus(),
      notes: reservation.getNotes(),
    };
  }

  static toDineInOrderFulfillmentInfoPlainObject(data: Order | DineInInfo): DineInOrderFulfillmentInfoPlainObject {
    const dineIn = data instanceof Order ? data.getFulfillment().asDineIn() : data;

    return {
      tableId: dineIn.getTableId(),
      tableNumber: dineIn.getTableNumber(),
      guestCount: dineIn.getGuestCount(),
      cashierSessionId: dineIn.getCashierSessionId(),
    };
  }

  static toDetailsView(order: Order, products: Product[]): OrderDetailsView {
    const productsById = new Map(products.map((product) => [product.getId(), product]));

    const items: OrderItemDetailView[] = order.getItems().map((item) => {
      const product = productsById.get(item.getProductId());
      const images = product?.getImages() ?? [];
      const primaryImage = images.find((image) => image.isPrimaryImage()) ?? images[0];

      return {
        productId: item.getProductId(),
        productName: item.getProductName(),
        priceSnapshot: item.getPriceSnapshot().getAmount(),
        quantity: item.getQuantity(),
        note: item.getNote(),
        imageUrl: primaryImage?.getUrl() ?? null,
      };
    });

    const base = this.toPlainObject(order);
    return { ...base, items };
  }

  static toSummaryView(order: Order): OrderSummaryView {
    return {
      id: order.getId(),
      type: order.getType(),
      status: order.getStatus(),
      itemCount: order.getItems().length,
      total: order.getPricing().getTotal().getAmount(),
      createdAt: order.getCreatedAt(),
    };
  }
}
