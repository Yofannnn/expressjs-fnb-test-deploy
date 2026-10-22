import { Location } from "./location.vo";
import {
  DeliveryType,
  DineInInfoCreationData,
  DineInInfoRebuildData,
  OnlineInfoCreationData,
  OnlineInfoRebuildData,
  OrderFulfillmentInfoRebuildData,
  OrderType,
  ReservationInfoCreationData,
  ReservationInfoRebuildData,
  ReservationStatus,
} from "../types/order.type";
import {
  DeliveryAddressRequiredException,
  DeliveryLatitudeRequiredException,
  DeliveryLongitudeRequiredException,
  InvalidFulfillmentAccessException,
} from "../exceptions/order.exceptions";

export class DineInInfo {
  constructor(
    private readonly tableId: string,
    private readonly tableNumber: string,
    private readonly guestCount: number,
    private readonly cashierSessionId: string | null,
  ) {}

  getTableId(): string {
    return this.tableId;
  }

  getTableNumber(): string {
    return this.tableNumber;
  }

  getGuestCount(): number {
    return this.guestCount;
  }

  getCashierSessionId(): string | null {
    return this.cashierSessionId;
  }

  static create(data: DineInInfoCreationData): DineInInfo {
    return new DineInInfo(data.tableId, data.tableNumber, data.guestCount, data.cashierSessionId || null);
  }

  static rebuild(data: DineInInfoRebuildData): DineInInfo {
    return new DineInInfo(data.tableId, data.tableNumber, data.guestCount, data.cashierSessionId);
  }
}

export class OnlineInfo {
  constructor(
    private readonly deliveryType: DeliveryType,
    private readonly deliveryLocation: Location | null,
    private readonly scheduledAt: Date | null,
  ) {}

  getDeliveryType(): DeliveryType {
    return this.deliveryType;
  }

  getDeliveryLocation(): Location | null {
    return this.deliveryLocation;
  }

  getScheduledAt(): Date | null {
    return this.scheduledAt ? new Date(this.scheduledAt) : null;
  }

  isPickup(): boolean {
    return this.deliveryType === DeliveryType.PICKUP;
  }

  isDelivery(): boolean {
    return this.deliveryType === DeliveryType.DELIVERY;
  }

  static create(data: OnlineInfoCreationData): OnlineInfo {
    if (data.deliveryType === DeliveryType.PICKUP) {
      return new OnlineInfo(data.deliveryType, null, data.scheduledAt || null);
    }

    if (!data.deliveryAddress) throw new DeliveryAddressRequiredException();
    if (data.deliveryLatitude === undefined) throw new DeliveryLatitudeRequiredException();
    if (data.deliveryLongitude === undefined) throw new DeliveryLongitudeRequiredException();

    return new OnlineInfo(
      data.deliveryType,
      Location.create({ address: data.deliveryAddress, latitude: data.deliveryLatitude, longitude: data.deliveryLongitude }),
      data.scheduledAt || null,
    );
  }

  static rebuild(data: OnlineInfoRebuildData): OnlineInfo {
    return new OnlineInfo(data.deliveryType, data.deliveryLocation ? Location.rebuild(data.deliveryLocation) : null, data.scheduledAt);
  }
}

export class ReservationInfo {
  constructor(
    private readonly tableId: string,
    private readonly reservedAt: Date,
    private readonly partySize: number,
    private readonly durationInMinutes: number,
    private readonly reservationStatus: ReservationStatus,
    private readonly notes: string | null,
  ) {}

  getTableId(): string {
    return this.tableId;
  }

  getReservedAt(): Date {
    return new Date(this.reservedAt);
  }

  getPartySize(): number {
    return this.partySize;
  }

  getDurationInMinutes(): number {
    return this.durationInMinutes;
  }

  getReservationStatus(): ReservationStatus {
    return this.reservationStatus;
  }

  getNotes(): string | null {
    return this.notes;
  }

  seated(): ReservationInfo {
    return new ReservationInfo(this.tableId, this.reservedAt, this.partySize, this.durationInMinutes, ReservationStatus.SEATED, this.notes);
  }

  noShow(): ReservationInfo {
    return new ReservationInfo(this.tableId, this.reservedAt, this.partySize, this.durationInMinutes, ReservationStatus.NO_SHOW, this.notes);
  }

  cancelled(): ReservationInfo {
    return new ReservationInfo(this.tableId, this.reservedAt, this.partySize, this.durationInMinutes, ReservationStatus.CANCELLED, this.notes);
  }

  static create(data: ReservationInfoCreationData): ReservationInfo {
    return new ReservationInfo(
      data.tableId,
      data.reservedAt,
      data.partySize,
      data.durationInMinutes,
      data.reservationStatus ?? ReservationStatus.BOOKED,
      data.notes || null,
    );
  }

  static rebuild(data: ReservationInfoRebuildData): ReservationInfo {
    return new ReservationInfo(data.tableId, data.reservedAt, data.partySize, data.durationInMinutes, data.reservationStatus, data.notes);
  }
}

export class OrderFulfillmentInfo {
  private constructor(
    private readonly type: OrderType,
    private readonly dineIn: DineInInfo | null,
    private readonly online: OnlineInfo | null,
    private readonly reservation: ReservationInfo | null,
  ) {}

  getType(): OrderType {
    return this.type;
  }

  getDineIn(): DineInInfo | null {
    return this.dineIn;
  }

  getOnline(): OnlineInfo | null {
    return this.online;
  }

  getReservation(): ReservationInfo | null {
    return this.reservation;
  }

  asDineIn(): DineInInfo {
    if (!this.dineIn) throw new InvalidFulfillmentAccessException(this.type, OrderType.DINEIN);
    return this.dineIn;
  }

  asOnline(): OnlineInfo {
    if (!this.online) throw new InvalidFulfillmentAccessException(this.type, OrderType.ONLINE);
    return this.online;
  }

  asReservation(): ReservationInfo {
    if (!this.reservation) throw new InvalidFulfillmentAccessException(this.type, OrderType.RESERVATION);
    return this.reservation;
  }

  withDineIn(dineIn: DineInInfo): OrderFulfillmentInfo {
    return new OrderFulfillmentInfo(this.type, dineIn, this.online, this.reservation);
  }

  withOnline(online: OnlineInfo): OrderFulfillmentInfo {
    return new OrderFulfillmentInfo(this.type, this.dineIn, online, this.reservation);
  }

  withReservation(reservation: ReservationInfo): OrderFulfillmentInfo {
    return new OrderFulfillmentInfo(this.type, this.dineIn, this.online, reservation);
  }

  isDineIn(): boolean {
    return this.type === OrderType.DINEIN;
  }

  isOnline(): boolean {
    return this.type === OrderType.ONLINE;
  }

  isReservation(): boolean {
    return this.type === OrderType.RESERVATION;
  }

  static dineIn(info: DineInInfo): OrderFulfillmentInfo {
    return new OrderFulfillmentInfo(OrderType.DINEIN, info, null, null);
  }

  static online(info: OnlineInfo): OrderFulfillmentInfo {
    return new OrderFulfillmentInfo(OrderType.ONLINE, null, info, null);
  }

  static reservation(info: ReservationInfo): OrderFulfillmentInfo {
    return new OrderFulfillmentInfo(OrderType.RESERVATION, null, null, info);
  }

  static rebuild(data: OrderFulfillmentInfoRebuildData): OrderFulfillmentInfo {
    return new OrderFulfillmentInfo(
      data.type,
      data.dineIn ? DineInInfo.rebuild(data.dineIn) : null,
      data.online ? OnlineInfo.rebuild(data.online) : null,
      data.reservation ? ReservationInfo.rebuild(data.reservation) : null,
    );
  }
}
