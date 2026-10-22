import { OrderFulfillmentInfo, DineInInfo, OnlineInfo, ReservationInfo } from "@/domain/value-objects/order-fulfillment-info.vo";
import { Location } from "@/domain/value-objects/location.vo";
import { DeliveryAddressRequiredException, InvalidFulfillmentAccessException } from "@/domain/exceptions/order.exceptions";
import {
  DeliveryType,
  DineInInfoCreationData,
  DineInInfoRebuildData,
  OnlineInfoCreationData,
  OnlineInfoRebuildData,
  OrderType,
  ReservationInfoCreationData,
  ReservationInfoRebuildData,
  ReservationStatus,
} from "@/domain/types/order.type";

describe("DineInInfo", () => {
  describe("constructor", () => {
    it("should create a DineInInfo instance with all valid data", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, "session-456");

      expect(dineIn).toBeInstanceOf(DineInInfo);
      expect(dineIn.getTableId()).toBe("table-123");
      expect(dineIn.getTableNumber()).toBe("T-01");
      expect(dineIn.getGuestCount()).toBe(4);
      expect(dineIn.getCashierSessionId()).toBe("session-456");
    });

    it("should create a DineInInfo instance with null cashier session", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);

      expect(dineIn.getCashierSessionId()).toBeNull();
    });

    it("should create a DineInInfo instance with zero guest count", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 0, null);
      expect(dineIn.getGuestCount()).toBe(0);
    });

    it("should create a DineInInfo instance with negative guest count", () => {
      const dineIn = new DineInInfo("table-123", "T-01", -1, null);
      expect(dineIn.getGuestCount()).toBe(-1);
    });
  });

  describe("create", () => {
    it("should create DineInInfo from creation data", () => {
      const data: DineInInfoCreationData = {
        tableId: "table-123",
        tableNumber: "T-01",
        guestCount: 4,
        cashierSessionId: "session-456",
      };

      const dineIn = DineInInfo.create(data);

      expect(dineIn).toBeInstanceOf(DineInInfo);
      expect(dineIn.getTableId()).toBe("table-123");
      expect(dineIn.getTableNumber()).toBe("T-01");
      expect(dineIn.getGuestCount()).toBe(4);
      expect(dineIn.getCashierSessionId()).toBe("session-456");
    });

    it("should create DineInInfo with undefined cashier session", () => {
      const data: DineInInfoCreationData = {
        tableId: "table-123",
        tableNumber: "T-01",
        guestCount: 4,
      };

      const dineIn = DineInInfo.create(data);
      expect(dineIn.getCashierSessionId()).toBeNull();
    });
  });

  describe("rebuild", () => {
    it("should rebuild DineInInfo from rebuild data", () => {
      const data: DineInInfoRebuildData = {
        tableId: "table-123",
        tableNumber: "T-01",
        guestCount: 4,
        cashierSessionId: "session-456",
      };

      const dineIn = DineInInfo.rebuild(data);

      expect(dineIn).toBeInstanceOf(DineInInfo);
      expect(dineIn.getTableId()).toBe("table-123");
      expect(dineIn.getTableNumber()).toBe("T-01");
      expect(dineIn.getGuestCount()).toBe(4);
      expect(dineIn.getCashierSessionId()).toBe("session-456");
    });

    it("should rebuild DineInInfo with null cashier session", () => {
      const data: DineInInfoRebuildData = {
        tableId: "table-123",
        tableNumber: "T-01",
        guestCount: 4,
        cashierSessionId: null,
      };

      const dineIn = DineInInfo.rebuild(data);
      expect(dineIn.getCashierSessionId()).toBeNull();
    });
  });

  describe("getters", () => {
    it("should return tableId", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      expect(dineIn.getTableId()).toBe("table-123");
    });

    it("should return tableNumber", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      expect(dineIn.getTableNumber()).toBe("T-01");
    });

    it("should return guestCount", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      expect(dineIn.getGuestCount()).toBe(4);
    });

    it("should return cashierSessionId", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, "session-456");
      expect(dineIn.getCashierSessionId()).toBe("session-456");
    });
  });

  describe("immutability", () => {
    it("should return a new instance from create each time", () => {
      const data: DineInInfoCreationData = {
        tableId: "table-123",
        tableNumber: "T-01",
        guestCount: 4,
      };

      const dineIn1 = DineInInfo.create(data);
      const dineIn2 = DineInInfo.create(data);

      expect(dineIn1).not.toBe(dineIn2);
      expect(dineIn1.getTableId()).toBe(dineIn2.getTableId());
    });
  });
});

describe("OnlineInfo", () => {
  describe("constructor", () => {
    it("should create an OnlineInfo instance with delivery type DELIVERY and location", () => {
      const location = Location.create({ address: "Jl. Sudirman", latitude: -6.2088, longitude: 106.8456 });
      const scheduledAt = new Date("2024-01-15T10:30:00Z");
      const online = new OnlineInfo(DeliveryType.DELIVERY, location, scheduledAt);

      expect(online).toBeInstanceOf(OnlineInfo);
      expect(online.getDeliveryType()).toBe(DeliveryType.DELIVERY);
      expect(online.getDeliveryLocation()).toBe(location);
      expect(online.getScheduledAt()).toEqual(scheduledAt);
    });

    it("should create an OnlineInfo instance with delivery type PICKUP and no location", () => {
      const online = new OnlineInfo(DeliveryType.PICKUP, null, null);

      expect(online.getDeliveryType()).toBe(DeliveryType.PICKUP);
      expect(online.getDeliveryLocation()).toBeNull();
      expect(online.getScheduledAt()).toBeNull();
    });

    it("should create an OnlineInfo instance with null scheduledAt", () => {
      const location = Location.create({ address: "Jl. Sudirman", latitude: -6.2088, longitude: 106.8456 });
      const online = new OnlineInfo(DeliveryType.DELIVERY, location, null);

      expect(online.getScheduledAt()).toBeNull();
    });
  });

  describe("create", () => {
    it("should create OnlineInfo for DELIVERY with location", () => {
      const data: OnlineInfoCreationData = {
        deliveryType: DeliveryType.DELIVERY,
        deliveryAddress: "Jl. Sudirman",
        deliveryLatitude: -6.2088,
        deliveryLongitude: 106.8456,
        scheduledAt: new Date("2024-01-15T10:30:00Z"),
      };

      const online = OnlineInfo.create(data);

      expect(online.getDeliveryType()).toBe(DeliveryType.DELIVERY);
      expect(online.getDeliveryLocation()).toBeInstanceOf(Location);
      expect(online.getDeliveryLocation()?.getAddress()).toBe("Jl. Sudirman");
      expect(online.getScheduledAt()).toEqual(data.scheduledAt);
    });

    it("should create OnlineInfo for DELIVERY without scheduledAt", () => {
      const data: OnlineInfoCreationData = {
        deliveryType: DeliveryType.DELIVERY,
        deliveryAddress: "Jl. Sudirman",
        deliveryLatitude: -6.2088,
        deliveryLongitude: 106.8456,
      };

      const online = OnlineInfo.create(data);
      expect(online.getScheduledAt()).toBeNull();
    });

    it("should create OnlineInfo for PICKUP without location", () => {
      const data: OnlineInfoCreationData = {
        deliveryType: DeliveryType.PICKUP,
      };

      const online = OnlineInfo.create(data);

      expect(online.getDeliveryType()).toBe(DeliveryType.PICKUP);
      expect(online.getDeliveryLocation()).toBeNull();
      expect(online.getScheduledAt()).toBeNull();
    });

    it("should create OnlineInfo for PICKUP with scheduledAt", () => {
      const scheduledAt = new Date("2024-01-15T10:30:00Z");
      const data: OnlineInfoCreationData = {
        deliveryType: DeliveryType.PICKUP,
        scheduledAt: scheduledAt,
      };

      const online = OnlineInfo.create(data);
      expect(online.getScheduledAt()).toEqual(scheduledAt);
    });

    it("should throw DeliveryAddressRequiredException for DELIVERY without location", () => {
      const data: OnlineInfoCreationData = {
        deliveryType: DeliveryType.DELIVERY,
      };

      expect(() => OnlineInfo.create(data)).toThrow(DeliveryAddressRequiredException);
    });

    it("should throw DeliveryAddressRequiredException with correct message", () => {
      const data: OnlineInfoCreationData = {
        deliveryType: DeliveryType.DELIVERY,
      };

      try {
        OnlineInfo.create(data);
      } catch (error) {
        expect(error).toBeInstanceOf(DeliveryAddressRequiredException);
        expect((error as DeliveryAddressRequiredException).message).toBe("A delivery address must be provided for delivery orders.");
      }
    });
  });

  describe("rebuild", () => {
    it("should rebuild OnlineInfo for DELIVERY with location", () => {
      const data: OnlineInfoRebuildData = {
        deliveryType: DeliveryType.DELIVERY,
        deliveryLocation: {
          address: "Jl. Sudirman",
          latitude: -6.2088,
          longitude: 106.8456,
        },
        scheduledAt: new Date("2024-01-15T10:30:00Z"),
      };

      const online = OnlineInfo.rebuild(data);

      expect(online.getDeliveryType()).toBe(DeliveryType.DELIVERY);
      expect(online.getDeliveryLocation()).toBeInstanceOf(Location);
      expect(online.getDeliveryLocation()?.getAddress()).toBe("Jl. Sudirman");
      expect(online.getScheduledAt()).toEqual(data.scheduledAt);
    });

    it("should rebuild OnlineInfo for PICKUP without location", () => {
      const data: OnlineInfoRebuildData = {
        deliveryType: DeliveryType.PICKUP,
        deliveryLocation: null,
        scheduledAt: null,
      };

      const online = OnlineInfo.rebuild(data);

      expect(online.getDeliveryType()).toBe(DeliveryType.PICKUP);
      expect(online.getDeliveryLocation()).toBeNull();
      expect(online.getScheduledAt()).toBeNull();
    });

    it("should rebuild OnlineInfo with null scheduledAt", () => {
      const data: OnlineInfoRebuildData = {
        deliveryType: DeliveryType.DELIVERY,
        deliveryLocation: {
          address: "Jl. Sudirman",
          latitude: -6.2088,
          longitude: 106.8456,
        },
        scheduledAt: null,
      };

      const online = OnlineInfo.rebuild(data);
      expect(online.getScheduledAt()).toBeNull();
    });
  });

  describe("getters", () => {
    it("should return deliveryType", () => {
      const online = new OnlineInfo(DeliveryType.DELIVERY, null, null);
      expect(online.getDeliveryType()).toBe(DeliveryType.DELIVERY);
    });

    it("should return deliveryLocation", () => {
      const location = Location.create({ address: "Jl. Sudirman", latitude: -6.2088, longitude: 106.8456 });
      const online = new OnlineInfo(DeliveryType.DELIVERY, location, null);
      expect(online.getDeliveryLocation()).toBe(location);
    });

    it("should return scheduledAt", () => {
      const scheduledAt = new Date("2024-01-15T10:30:00Z");
      const online = new OnlineInfo(DeliveryType.DELIVERY, null, scheduledAt);
      expect(online.getScheduledAt()).toEqual(scheduledAt);
    });

    it("should return a copy of Date for scheduledAt", () => {
      const scheduledAt = new Date("2024-01-15T10:30:00Z");
      const online = new OnlineInfo(DeliveryType.DELIVERY, null, scheduledAt);
      const returnedDate = online.getScheduledAt();

      expect(returnedDate).not.toBe(scheduledAt);
      expect(returnedDate).toEqual(scheduledAt);
    });
  });

  describe("immutability", () => {
    it("should return a new instance from create each time", () => {
      const data: OnlineInfoCreationData = {
        deliveryType: DeliveryType.PICKUP,
      };

      const online1 = OnlineInfo.create(data);
      const online2 = OnlineInfo.create(data);

      expect(online1).not.toBe(online2);
      expect(online1.getDeliveryType()).toBe(online2.getDeliveryType());
    });

    it("should return a new instance from rebuild each time", () => {
      const data: OnlineInfoRebuildData = {
        deliveryType: DeliveryType.PICKUP,
        deliveryLocation: null,
        scheduledAt: null,
      };

      const online1 = OnlineInfo.rebuild(data);
      const online2 = OnlineInfo.rebuild(data);

      expect(online1).not.toBe(online2);
      expect(online1.getDeliveryType()).toBe(online2.getDeliveryType());
    });
  });
});

describe("ReservationInfo", () => {
  const reservedAt = new Date("2024-01-15T10:30:00Z");

  describe("constructor", () => {
    it("should create a ReservationInfo instance with all valid data", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, "Special occasion");

      expect(reservation).toBeInstanceOf(ReservationInfo);
      expect(reservation.getTableId()).toBe("table-123");
      expect(reservation.getReservedAt()).toEqual(reservedAt);
      expect(reservation.getPartySize()).toBe(4);
      expect(reservation.getDurationInMinutes()).toBe(120);
      expect(reservation.getReservationStatus()).toBe(ReservationStatus.BOOKED);
      expect(reservation.getNotes()).toBe("Special occasion");
    });

    it("should create a ReservationInfo instance with null notes", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);

      expect(reservation.getNotes()).toBeNull();
    });

    it("should create a ReservationInfo instance with zero party size", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 0, 120, ReservationStatus.BOOKED, null);

      expect(reservation.getPartySize()).toBe(0);
    });

    it("should create a ReservationInfo instance with zero duration", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 0, ReservationStatus.BOOKED, null);

      expect(reservation.getDurationInMinutes()).toBe(0);
    });
  });

  describe("create", () => {
    it("should create ReservationInfo from creation data", () => {
      const data: ReservationInfoCreationData = {
        tableId: "table-123",
        reservedAt: reservedAt,
        partySize: 4,
        durationInMinutes: 120,
        reservationStatus: ReservationStatus.BOOKED,
        notes: "Special occasion",
      };

      const reservation = ReservationInfo.create(data);

      expect(reservation.getTableId()).toBe("table-123");
      expect(reservation.getReservedAt()).toEqual(reservedAt);
      expect(reservation.getPartySize()).toBe(4);
      expect(reservation.getDurationInMinutes()).toBe(120);
      expect(reservation.getReservationStatus()).toBe(ReservationStatus.BOOKED);
      expect(reservation.getNotes()).toBe("Special occasion");
    });

    it("should create ReservationInfo with undefined notes", () => {
      const data: ReservationInfoCreationData = {
        tableId: "table-123",
        reservedAt: reservedAt,
        partySize: 4,
        durationInMinutes: 120,
        reservationStatus: ReservationStatus.BOOKED,
      };

      const reservation = ReservationInfo.create(data);
      expect(reservation.getNotes()).toBeNull();
    });
  });

  describe("rebuild", () => {
    it("should rebuild ReservationInfo from rebuild data", () => {
      const data: ReservationInfoRebuildData = {
        tableId: "table-123",
        reservedAt: reservedAt,
        partySize: 4,
        durationInMinutes: 120,
        reservationStatus: ReservationStatus.BOOKED,
        notes: "Special occasion",
      };

      const reservation = ReservationInfo.rebuild(data);

      expect(reservation.getTableId()).toBe("table-123");
      expect(reservation.getReservedAt()).toEqual(reservedAt);
      expect(reservation.getPartySize()).toBe(4);
      expect(reservation.getDurationInMinutes()).toBe(120);
      expect(reservation.getReservationStatus()).toBe(ReservationStatus.BOOKED);
      expect(reservation.getNotes()).toBe("Special occasion");
    });

    it("should rebuild ReservationInfo with null notes", () => {
      const data: ReservationInfoRebuildData = {
        tableId: "table-123",
        reservedAt: reservedAt,
        partySize: 4,
        durationInMinutes: 120,
        reservationStatus: ReservationStatus.BOOKED,
        notes: null,
      };

      const reservation = ReservationInfo.rebuild(data);
      expect(reservation.getNotes()).toBeNull();
    });
  });

  describe("getters", () => {
    it("should return tableId", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      expect(reservation.getTableId()).toBe("table-123");
    });

    it("should return reservedAt", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      expect(reservation.getReservedAt()).toEqual(reservedAt);
    });

    it("should return a copy of Date for reservedAt", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      const returnedDate = reservation.getReservedAt();

      expect(returnedDate).not.toBe(reservedAt);
      expect(returnedDate).toEqual(reservedAt);
    });

    it("should return partySize", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      expect(reservation.getPartySize()).toBe(4);
    });

    it("should return durationInMinutes", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      expect(reservation.getDurationInMinutes()).toBe(120);
    });

    it("should return reservationStatus", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      expect(reservation.getReservationStatus()).toBe(ReservationStatus.BOOKED);
    });

    it("should return notes", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, "Special");
      expect(reservation.getNotes()).toBe("Special");
    });
  });

  describe("state transitions", () => {
    it("should transition from BOOKED to SEATED", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      const seated = reservation.seated();

      expect(seated).not.toBe(reservation);
      expect(seated.getReservationStatus()).toBe(ReservationStatus.SEATED);
      expect(seated.getTableId()).toBe(reservation.getTableId());
      expect(seated.getReservedAt()).toEqual(reservation.getReservedAt());
      expect(seated.getPartySize()).toBe(reservation.getPartySize());
      expect(seated.getDurationInMinutes()).toBe(reservation.getDurationInMinutes());
      expect(seated.getNotes()).toBe(reservation.getNotes());
    });

    it("should transition from BOOKED to NO_SHOW", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      const noShow = reservation.noShow();

      expect(noShow).not.toBe(reservation);
      expect(noShow.getReservationStatus()).toBe(ReservationStatus.NO_SHOW);
    });

    it("should transition from BOOKED to CANCELLED", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      const cancelled = reservation.cancelled();

      expect(cancelled).not.toBe(reservation);
      expect(cancelled.getReservationStatus()).toBe(ReservationStatus.CANCELLED);
    });

    it("should transition from SEATED to CANCELLED", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.SEATED, null);
      const cancelled = reservation.cancelled();

      expect(cancelled.getReservationStatus()).toBe(ReservationStatus.CANCELLED);
    });

    it("should preserve immutability on state transitions", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      const originalStatus = reservation.getReservationStatus();

      reservation.seated();

      expect(reservation.getReservationStatus()).toBe(originalStatus);
    });

    it("should preserve notes on state transitions", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, "Special notes");
      const seated = reservation.seated();

      expect(seated.getNotes()).toBe("Special notes");
    });
  });

  describe("immutability", () => {
    it("should return a new instance from create each time", () => {
      const data: ReservationInfoCreationData = {
        tableId: "table-123",
        reservedAt: reservedAt,
        partySize: 4,
        durationInMinutes: 120,
        reservationStatus: ReservationStatus.BOOKED,
      };

      const reservation1 = ReservationInfo.create(data);
      const reservation2 = ReservationInfo.create(data);

      expect(reservation1).not.toBe(reservation2);
      expect(reservation1.getTableId()).toBe(reservation2.getTableId());
    });
  });
});

describe("OrderFulfillmentInfo", () => {
  describe("dineIn", () => {
    it("should create OrderFulfillmentInfo for DINEIN", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      const fulfillment = OrderFulfillmentInfo.dineIn(dineIn);

      expect(fulfillment).toBeInstanceOf(OrderFulfillmentInfo);
      expect(fulfillment.getType()).toBe(OrderType.DINEIN);
      expect(fulfillment.asDineIn()).toBe(dineIn);
    });

    it("should throw when accessing asOnline for DINEIN", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      const fulfillment = OrderFulfillmentInfo.dineIn(dineIn);

      expect(() => fulfillment.asOnline()).toThrow(InvalidFulfillmentAccessException);
    });

    it("should throw when accessing asReservation for DINEIN", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      const fulfillment = OrderFulfillmentInfo.dineIn(dineIn);

      expect(() => fulfillment.asReservation()).toThrow(InvalidFulfillmentAccessException);
    });

    it("should throw InvalidFulfillmentAccessException with correct message for DINEIN", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      const fulfillment = OrderFulfillmentInfo.dineIn(dineIn);

      try {
        fulfillment.asOnline();
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidFulfillmentAccessException);
        expect((error as InvalidFulfillmentAccessException).message).toContain(OrderType.DINEIN);
        expect((error as InvalidFulfillmentAccessException).message).toContain(OrderType.ONLINE);
      }
    });
  });

  describe("online", () => {
    it("should create OrderFulfillmentInfo for ONLINE", () => {
      const online = new OnlineInfo(DeliveryType.PICKUP, null, null);
      const fulfillment = OrderFulfillmentInfo.online(online);

      expect(fulfillment).toBeInstanceOf(OrderFulfillmentInfo);
      expect(fulfillment.getType()).toBe(OrderType.ONLINE);
      expect(fulfillment.asOnline()).toBe(online);
    });

    it("should throw when accessing asDineIn for ONLINE", () => {
      const online = new OnlineInfo(DeliveryType.PICKUP, null, null);
      const fulfillment = OrderFulfillmentInfo.online(online);

      expect(() => fulfillment.asDineIn()).toThrow(InvalidFulfillmentAccessException);
    });

    it("should throw when accessing asReservation for ONLINE", () => {
      const online = new OnlineInfo(DeliveryType.PICKUP, null, null);
      const fulfillment = OrderFulfillmentInfo.online(online);

      expect(() => fulfillment.asReservation()).toThrow(InvalidFulfillmentAccessException);
    });
  });

  describe("reservation", () => {
    const reservedAt = new Date("2024-01-15T10:30:00Z");

    it("should create OrderFulfillmentInfo for RESERVATION", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      const fulfillment = OrderFulfillmentInfo.reservation(reservation);

      expect(fulfillment).toBeInstanceOf(OrderFulfillmentInfo);
      expect(fulfillment.getType()).toBe(OrderType.RESERVATION);
      expect(fulfillment.asReservation()).toBe(reservation);
    });

    it("should throw when accessing asDineIn for RESERVATION", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      const fulfillment = OrderFulfillmentInfo.reservation(reservation);

      expect(() => fulfillment.asDineIn()).toThrow(InvalidFulfillmentAccessException);
    });

    it("should throw when accessing asOnline for RESERVATION", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      const fulfillment = OrderFulfillmentInfo.reservation(reservation);

      expect(() => fulfillment.asOnline()).toThrow(InvalidFulfillmentAccessException);
    });
  });

  describe("withDineIn", () => {
    it("should update dineIn info while preserving type", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      const fulfillment = OrderFulfillmentInfo.dineIn(dineIn);

      const newDineIn = new DineInInfo("table-456", "T-02", 6, "session-789");
      const updated = fulfillment.withDineIn(newDineIn);

      expect(updated).not.toBe(fulfillment);
      expect(updated.getType()).toBe(OrderType.DINEIN);
      expect(updated.asDineIn()).toBe(newDineIn);
    });

    it("should preserve other info when updating dineIn", () => {
      const online = new OnlineInfo(DeliveryType.PICKUP, null, null);
      const fulfillment = OrderFulfillmentInfo.online(online);
      const newDineIn = new DineInInfo("table-456", "T-02", 6, "session-789");
      const updated = fulfillment.withDineIn(newDineIn);

      expect(updated.getType()).toBe(OrderType.ONLINE);
      expect(updated.asOnline()).toBe(online);
    });
  });

  describe("withOnline", () => {
    it("should update online info while preserving type", () => {
      const online = new OnlineInfo(DeliveryType.PICKUP, null, null);
      const fulfillment = OrderFulfillmentInfo.online(online);

      const newOnline = new OnlineInfo(
        DeliveryType.DELIVERY,
        Location.create({ address: "Jl. Sudirman", latitude: -6.2088, longitude: 106.8456 }),
        null,
      );
      const updated = fulfillment.withOnline(newOnline);

      expect(updated).not.toBe(fulfillment);
      expect(updated.getType()).toBe(OrderType.ONLINE);
      expect(updated.asOnline()).toBe(newOnline);
    });
  });

  describe("withReservation", () => {
    const reservedAt = new Date("2024-01-15T10:30:00Z");

    it("should update reservation info while preserving type", () => {
      const reservation = new ReservationInfo("table-123", reservedAt, 4, 120, ReservationStatus.BOOKED, null);
      const fulfillment = OrderFulfillmentInfo.reservation(reservation);

      const newReservation = new ReservationInfo("table-456", reservedAt, 6, 90, ReservationStatus.SEATED, "Updated");
      const updated = fulfillment.withReservation(newReservation);

      expect(updated).not.toBe(fulfillment);
      expect(updated.getType()).toBe(OrderType.RESERVATION);
      expect(updated.asReservation()).toBe(newReservation);
    });
  });

  describe("rebuild", () => {
    it("should rebuild OrderFulfillmentInfo for DINEIN", () => {
      const data = {
        type: OrderType.DINEIN,
        dineIn: {
          tableId: "table-123",
          tableNumber: "T-01",
          guestCount: 4,
          cashierSessionId: "session-456",
        },
        online: null,
        reservation: null,
      };

      const fulfillment = OrderFulfillmentInfo.rebuild(data);

      expect(fulfillment.getType()).toBe(OrderType.DINEIN);
      expect(fulfillment.asDineIn()).toBeInstanceOf(DineInInfo);
      expect(fulfillment.asDineIn().getTableId()).toBe("table-123");
    });

    it("should rebuild OrderFulfillmentInfo for ONLINE", () => {
      const data = {
        type: OrderType.ONLINE,
        dineIn: null,
        online: {
          deliveryType: DeliveryType.PICKUP,
          deliveryLocation: null,
          scheduledAt: null,
        },
        reservation: null,
      };

      const fulfillment = OrderFulfillmentInfo.rebuild(data);

      expect(fulfillment.getType()).toBe(OrderType.ONLINE);
      expect(fulfillment.asOnline()).toBeInstanceOf(OnlineInfo);
      expect(fulfillment.asOnline().getDeliveryType()).toBe(DeliveryType.PICKUP);
    });

    it("should rebuild OrderFulfillmentInfo for RESERVATION", () => {
      const reservedAt = new Date("2024-01-15T10:30:00Z");
      const data = {
        type: OrderType.RESERVATION,
        dineIn: null,
        online: null,
        reservation: {
          tableId: "table-123",
          reservedAt: reservedAt,
          partySize: 4,
          durationInMinutes: 120,
          reservationStatus: ReservationStatus.BOOKED,
          notes: null,
        },
      };

      const fulfillment = OrderFulfillmentInfo.rebuild(data);

      expect(fulfillment.getType()).toBe(OrderType.RESERVATION);
      expect(fulfillment.asReservation()).toBeInstanceOf(ReservationInfo);
      expect(fulfillment.asReservation().getTableId()).toBe("table-123");
    });

    it("should rebuild OrderFulfillmentInfo with all nulls", () => {
      const data = {
        type: OrderType.DINEIN,
        dineIn: null,
        online: null,
        reservation: null,
      };

      const fulfillment = OrderFulfillmentInfo.rebuild(data);

      expect(fulfillment.getType()).toBe(OrderType.DINEIN);
      expect(() => fulfillment.asDineIn()).toThrow(InvalidFulfillmentAccessException);
    });
  });

  describe("immutability", () => {
    it("should return a new instance from dineIn each time", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      const fulfillment1 = OrderFulfillmentInfo.dineIn(dineIn);
      const fulfillment2 = OrderFulfillmentInfo.dineIn(dineIn);

      expect(fulfillment1).not.toBe(fulfillment2);
      expect(fulfillment1.getType()).toBe(fulfillment2.getType());
    });

    it("should return a new instance from withDineIn", () => {
      const dineIn = new DineInInfo("table-123", "T-01", 4, null);
      const fulfillment = OrderFulfillmentInfo.dineIn(dineIn);
      const newDineIn = new DineInInfo("table-456", "T-02", 6, null);
      const updated = fulfillment.withDineIn(newDineIn);

      expect(updated).not.toBe(fulfillment);
      expect(fulfillment.asDineIn()).toBe(dineIn);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string tableId in DineInInfo", () => {
      const dineIn = new DineInInfo("", "T-01", 4, null);
      expect(dineIn.getTableId()).toBe("");
    });

    it("should handle empty string tableNumber in DineInInfo", () => {
      const dineIn = new DineInInfo("table-123", "", 4, null);
      expect(dineIn.getTableNumber()).toBe("");
    });

    it("should handle very long transaction IDs", () => {
      const longId = "session-" + "a".repeat(1000);
      const dineIn = new DineInInfo("table-123", "T-01", 4, longId);
      expect(dineIn.getCashierSessionId()).toBe(longId);
    });

    it("should handle very long notes in ReservationInfo", () => {
      const longNotes = "Note " + "content ".repeat(500);
      const reservation = new ReservationInfo("table-123", new Date(), 4, 120, ReservationStatus.BOOKED, longNotes);
      expect(reservation.getNotes()).toBe(longNotes);
    });
  });
});
