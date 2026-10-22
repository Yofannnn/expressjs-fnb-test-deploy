import { Order } from "@/domain/entities/order.entity";
import { OrderCustomer } from "@/domain/value-objects/order-customer.vo";
import { DineInInfo, OnlineInfo, OrderFulfillmentInfo, ReservationInfo } from "@/domain/value-objects/order-fulfillment-info.vo";
import { OrderPricing } from "@/domain/value-objects/order-pricing.vo";
import { OrderPaymentInfo } from "@/domain/value-objects/order-payment-info.vo";
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
} from "@/domain/events/order.events";
import {
  InvalidOrderGuestDataException,
  InvalidOrderStatusTransitionException,
  InvalidOrderTypeOperationException,
  OrderAlreadyPaidException,
} from "@/domain/exceptions/order.exceptions";
import {
  DeliveryType,
  DineInOrderCreationData,
  OnlineOrderCreationData,
  OrderCustomerType,
  OrderRebuildData,
  OrderStatus,
  OrderType,
  ReservationOrderCreationData,
  ReservationStatus,
} from "@/domain/types/order.type";
import { PaymentMethod, PaymentStatus } from "@/domain/types/payment-transaction.type";

describe("Order", () => {
  const mockId = "order-123";
  const mockCustomerData = {
    memberId: "member-123",
  };
  const mockItemData = {
    productId: "product-123",
    productName: "Test Product",
    priceSnapshot: 100000,
    quantity: 2,
    note: undefined,
  };
  const mockDineInFulfillmentData = {
    tableId: "table-123",
    tableNumber: "T-01",
    guestCount: 4,
    cashierSessionId: "session-456",
  };
  const mockOnlineFulfillmentData = {
    deliveryType: DeliveryType.DELIVERY,
    deliveryAddress: "Jl. Sudirman",
    deliveryLatitude: -6.2088,
    deliveryLongitude: 106.8456,
  };
  const mockReservationFulfillmentData = {
    tableId: "table-123",
    reservedAt: new Date("2024-01-15T10:30:00Z"),
    partySize: 4,
    durationInMinutes: 120,
    reservationStatus: ReservationStatus.BOOKED,
  };
  const mockTaxRate = 10;
  const mockServiceChargeRate = 5;

  describe("createDineInOrder", () => {
    it("should create a DINEIN order with all valid data", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };

      const order = Order.createDineInOrder(data);

      expect(order).toBeInstanceOf(Order);
      expect(order.getId()).toBe(mockId);
      expect(order.getType()).toBe(OrderType.DINEIN);
      expect(order.getStatus()).toBe(OrderStatus.PENDING);
      expect(order.getCustomer()).toBeInstanceOf(OrderCustomer);
      expect(order.getCustomer().isAnonymous()).toBe(true);
      expect(order.getItems()).toHaveLength(1);
      expect(order.getPricing()).toBeInstanceOf(OrderPricing);
      expect(order.getPayment()).toBeInstanceOf(OrderPaymentInfo);
      expect(order.getFulfillment()).toBeInstanceOf(OrderFulfillmentInfo);
      expect(order.getCreatedAt()).toBeInstanceOf(Date);
      expect(order.getUpdatedAt()).toBeInstanceOf(Date);
      expect(order.getFulfillment().asDineIn()).toBeInstanceOf(DineInInfo);
    });

    it("should create a DINEIN order with discount", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
        discount: 5000,
      };

      const order = Order.createDineInOrder(data);
      expect(order.getPricing().getDiscount().getAmount()).toBe(5000);
    });

    it("should create a DINEIN order with multiple items", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData, { ...mockItemData, productId: "product-456" }],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };

      const order = Order.createDineInOrder(data);
      expect(order.getItems()).toHaveLength(2);
    });

    it("should create a DINEIN order with empty items", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };

      const order = Order.createDineInOrder(data);
      expect(order.getItems()).toHaveLength(0);
    });

    it("should emit DineInOrderCreatedEvent", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };

      const order = Order.createDineInOrder(data);
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(DineInOrderCreatedEvent);
      expect((events[0] as DineInOrderCreatedEvent).aggregateId).toBe(mockId);
      expect((events[0] as DineInOrderCreatedEvent).payload.fulfillment.tableId).toBe("table-123");
      expect((events[0] as DineInOrderCreatedEvent).payload.items).toHaveLength(1);
    });
  });

  describe("createOnlineOrder", () => {
    it("should create an ONLINE order with all valid data", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
        deliveryFee: 15000,
      };

      const order = Order.createOnlineOrder(data);

      expect(order).toBeInstanceOf(Order);
      expect(order.getId()).toBe(mockId);
      expect(order.getType()).toBe(OrderType.ONLINE);
      expect(order.getStatus()).toBe(OrderStatus.PENDING);
      expect(order.getCustomer().isMember()).toBe(true);
      expect(order.getFulfillment().asOnline()).toBeInstanceOf(OnlineInfo);
      expect(order.getPricing().getDeliveryFee().getAmount()).toBe(15000);
    });

    it("should create an ONLINE order without delivery fee", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };

      const order = Order.createOnlineOrder(data);
      expect(order.getPricing().getDeliveryFee().isZero()).toBe(true);
    });

    it("should create an ONLINE order with discount", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
        discount: 5000,
      };

      const order = Order.createOnlineOrder(data);
      expect(order.getPricing().getDiscount().getAmount()).toBe(5000);
    });

    it("should create an ONLINE order with guest customer", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: {
          guestName: "John Doe",
          guestEmail: "john@example.com",
        },
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };

      const order = Order.createOnlineOrder(data);
      expect(order.getCustomer().isGuest()).toBe(true);
      expect(order.getCustomer().getGuestName()).toBe("John Doe");
      expect(order.getCustomer().getGuestEmail()).toBe("john@example.com");
    });

    it("should emit OnlineOrderCreatedEvent", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };

      const order = Order.createOnlineOrder(data);
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OnlineOrderCreatedEvent);
      expect((events[0] as OnlineOrderCreatedEvent).aggregateId).toBe(mockId);
      expect((events[0] as OnlineOrderCreatedEvent).payload.fulfillment.deliveryType).toBe(DeliveryType.DELIVERY);

      const customer = (events[0] as OnlineOrderCreatedEvent).payload.customer;
      if ("memberId" in customer) {
        expect(customer.memberId).toBe("member-123");
      }
    });
  });

  describe("createReservationOrder", () => {
    it("should create a RESERVATION order with all valid data", () => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockReservationFulfillmentData,
      };

      const order = Order.createReservationOrder(data);

      expect(order).toBeInstanceOf(Order);
      expect(order.getId()).toBe(mockId);
      expect(order.getType()).toBe(OrderType.RESERVATION);
      expect(order.getStatus()).toBe(OrderStatus.PENDING);
      expect(order.getCustomer().isMember()).toBe(true);
      expect(order.getFulfillment().asReservation()).toBeInstanceOf(ReservationInfo);
    });

    it("should create a RESERVATION order without items", () => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockReservationFulfillmentData,
      };

      const order = Order.createReservationOrder(data);
      expect(order.getItems()).toHaveLength(0);
    });

    it("should create a RESERVATION order with discount", () => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockReservationFulfillmentData,
        discount: 5000,
      };

      const order = Order.createReservationOrder(data);
      expect(order.getPricing().getDiscount().getAmount()).toBe(5000);
    });

    it("should create a RESERVATION order with guest customer", () => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: {
          guestName: "Jane Doe",
          guestEmail: "jane@example.com",
        },
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockReservationFulfillmentData,
      };

      const order = Order.createReservationOrder(data);
      expect(order.getCustomer().isGuest()).toBe(true);
      expect(order.getCustomer().getGuestName()).toBe("Jane Doe");
      expect(order.getCustomer().getGuestEmail()).toBe("jane@example.com");
    });

    it("should emit ReservationOrderCreatedEvent", () => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockReservationFulfillmentData,
      };

      const order = Order.createReservationOrder(data);
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ReservationOrderCreatedEvent);
      expect((events[0] as ReservationOrderCreatedEvent).aggregateId).toBe(mockId);
      expect((events[0] as ReservationOrderCreatedEvent).payload.fulfillment.tableId).toBe("table-123");
    });
  });

  describe("rebuild", () => {
    it("should rebuild an order from rebuild data", () => {
      const now = new Date();
      const data: OrderRebuildData = {
        id: mockId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: "member-123",
          guestName: null,
          guestEmail: null,
        },
        type: OrderType.DINEIN,
        fulfillment: {
          type: OrderType.DINEIN,
          dineIn: {
            tableId: "table-123",
            tableNumber: "T-01",
            guestCount: 4,
            cashierSessionId: "session-456",
          },
          online: null,
          reservation: null,
        },
        items: [
          {
            productId: "product-123",
            productName: "Test Product",
            priceSnapshot: 100000,
            quantity: 2,
            note: null,
          },
        ],
        pricing: {
          subtotal: 200000,
          tax: 20000,
          serviceCharge: 10000,
          deliveryFee: 0,
          discount: 0,
          total: 230000,
        },
        payment: {
          status: PaymentStatus.UNPAID,
          method: null,
          paidAt: null,
          transactionId: null,
        },
        status: OrderStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      };

      const order = Order.rebuild(data);

      expect(order).toBeInstanceOf(Order);
      expect(order.getId()).toBe(mockId);
      expect(order.getType()).toBe(OrderType.DINEIN);
      expect(order.getStatus()).toBe(OrderStatus.PENDING);
      expect(order.getCustomer()).toBeInstanceOf(OrderCustomer);
      expect(order.getCustomer().isMember()).toBe(true);
      expect(order.getItems()).toHaveLength(1);
      expect(order.getPricing()).toBeInstanceOf(OrderPricing);
      expect(order.getPayment()).toBeInstanceOf(OrderPaymentInfo);
      expect(order.getFulfillment()).toBeInstanceOf(OrderFulfillmentInfo);
    });

    it("should rebuild an order with null values", () => {
      const now = new Date();
      const data: OrderRebuildData = {
        id: mockId,
        customer: {
          type: OrderCustomerType.GUEST,
          memberId: null,
          guestName: "John Doe",
          guestEmail: "john@example.com",
        },
        type: OrderType.ONLINE,
        fulfillment: {
          type: OrderType.ONLINE,
          dineIn: null,
          online: {
            deliveryType: DeliveryType.PICKUP,
            deliveryLocation: null,
            scheduledAt: null,
          },
          reservation: null,
        },
        items: [],
        pricing: {
          subtotal: 0,
          tax: 0,
          serviceCharge: 0,
          deliveryFee: 0,
          discount: 0,
          total: 0,
        },
        payment: {
          status: PaymentStatus.UNPAID,
          method: null,
          paidAt: null,
          transactionId: null,
        },
        status: OrderStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      };

      const order = Order.rebuild(data);
      expect(order.getCustomer().isGuest()).toBe(true);
      expect(order.getFulfillment().asOnline().getDeliveryLocation()).toBeNull();
    });

    it("should rebuild an order with paid payment", () => {
      const now = new Date();
      const data: OrderRebuildData = {
        id: mockId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: "member-123",
          guestName: null,
          guestEmail: null,
        },
        type: OrderType.DINEIN,
        fulfillment: {
          type: OrderType.DINEIN,
          dineIn: {
            tableId: "table-123",
            tableNumber: "T-01",
            guestCount: 4,
            cashierSessionId: "session-456",
          },
          online: null,
          reservation: null,
        },
        items: [],
        pricing: {
          subtotal: 0,
          tax: 0,
          serviceCharge: 0,
          deliveryFee: 0,
          discount: 0,
          total: 0,
        },
        payment: {
          status: PaymentStatus.PAID,
          method: PaymentMethod.CARD,
          paidAt: now,
          transactionId: "txn-123",
        },
        status: OrderStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      };

      const order = Order.rebuild(data);
      expect(order.getPayment().isPaid()).toBe(true);
      expect(order.getPayment().getMethod()).toBe(PaymentMethod.CARD);
      expect(order.getPayment().getTransactionId()).toBe("txn-123");
    });
  });

  describe("getters", () => {
    let order: Order;

    beforeEach(() => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      order = Order.createDineInOrder(data);
    });

    it("should return id", () => {
      expect(order.getId()).toBe(mockId);
    });

    it("should return type", () => {
      expect(order.getType()).toBe(OrderType.DINEIN);
    });

    it("should return status", () => {
      expect(order.getStatus()).toBe(OrderStatus.PENDING);
    });

    it("should return customer", () => {
      expect(order.getCustomer()).toBeInstanceOf(OrderCustomer);
    });

    it("should return items as readonly array", () => {
      const items = order.getItems();
      expect(items).toBeInstanceOf(Array);
      expect(items).toHaveLength(1);
      expect(items[0].getProductId()).toBe("product-123");
      expect(items[0].getQuantity()).toBe(2);
    });

    it("should return pricing", () => {
      expect(order.getPricing()).toBeInstanceOf(OrderPricing);
    });

    it("should return fulfillment", () => {
      expect(order.getFulfillment()).toBeInstanceOf(OrderFulfillmentInfo);
    });

    it("should return payment", () => {
      expect(order.getPayment()).toBeInstanceOf(OrderPaymentInfo);
      expect(order.getPayment().isPaid()).toBe(false);
    });

    it("should return createdAt as a copy", () => {
      const createdAt = order.getCreatedAt();
      const originalCreatedAt = order.getCreatedAt();
      expect(createdAt).not.toBe(originalCreatedAt);
      expect(createdAt).toEqual(originalCreatedAt);
    });

    it("should return updatedAt as a copy", () => {
      const updatedAt = order.getUpdatedAt();
      const originalUpdatedAt = order.getUpdatedAt();
      expect(updatedAt).not.toBe(originalUpdatedAt);
      expect(updatedAt).toEqual(originalUpdatedAt);
    });
  });

  describe("isOwnedByMember", () => {
    it("should return true when memberId matches", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: { memberId: "member-123" },
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };
      const order = Order.createOnlineOrder(data);
      expect(order.isOwnedByMember("member-123")).toBe(true);
    });

    it("should return false when memberId does not match", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: { memberId: "member-123" },
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };
      const order = Order.createOnlineOrder(data);
      expect(order.isOwnedByMember("member-456")).toBe(false);
    });

    it("should return false for guest order", () => {
      const guestData: OnlineOrderCreationData = {
        id: "guest-order",
        customer: { guestName: "John Doe", guestEmail: "john@example.com" },
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };
      const guestOrder = Order.createOnlineOrder(guestData);
      expect(guestOrder.isOwnedByMember("member-123")).toBe(false);
    });

    it("should return false for dine-in order (always anonymous)", () => {
      const dineInData: DineInOrderCreationData = {
        id: "dinein-order",
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const dineInOrder = Order.createDineInOrder(dineInData);
      expect(dineInOrder.getCustomer().isAnonymous()).toBe(true);
      expect(dineInOrder.isOwnedByMember("member-123")).toBe(false);
    });
  });

  describe("isOwnedByGuest", () => {
    it("should return true when guestEmail matches", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: { guestName: "John Doe", guestEmail: "john@example.com" },
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };
      const order = Order.createOnlineOrder(data);
      expect(order.isOwnedByGuest("john@example.com")).toBe(true);
    });

    it("should return false when guestEmail does not match", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: { guestName: "John Doe", guestEmail: "john@example.com" },
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };
      const order = Order.createOnlineOrder(data);
      expect(order.isOwnedByGuest("jane@example.com")).toBe(false);
    });

    it("should return false for member order", () => {
      const memberData: OnlineOrderCreationData = {
        id: "member-order",
        customer: { memberId: "member-123" },
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };
      const memberOrder = Order.createOnlineOrder(memberData);
      expect(memberOrder.isOwnedByGuest("john@example.com")).toBe(false);
    });

    it("should return false for dine-in order (always anonymous)", () => {
      const dineInData: DineInOrderCreationData = {
        id: "dinein-order",
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const dineInOrder = Order.createDineInOrder(dineInData);
      expect(dineInOrder.getCustomer().isAnonymous()).toBe(true);
      expect(dineInOrder.isOwnedByGuest("john@example.com")).toBe(false);
    });
  });

  describe("state transitions", () => {
    let order: Order;

    beforeEach(() => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      order = Order.createDineInOrder(data);
      order.pullDomainEvents();
    });

    describe("confirm", () => {
      it("should transition from PENDING to CONFIRMED", () => {
        order.confirm();
        expect(order.getStatus()).toBe(OrderStatus.CONFIRMED);
      });

      it("should emit OrderConfirmedEvent", () => {
        order.confirm();
        const events = order.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(OrderConfirmedEvent);
        expect((events[0] as OrderConfirmedEvent).payload.previousStatus).toBe(OrderStatus.PENDING);
      });

      it("should update updatedAt", () => {
        const before = order.getUpdatedAt();
        order.confirm();
        const after = order.getUpdatedAt();
        expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });

      it("should throw InvalidOrderStatusTransitionException when already CONFIRMED", () => {
        order.confirm();
        expect(() => order.confirm()).toThrow(InvalidOrderStatusTransitionException);
      });

      it("should throw InvalidOrderStatusTransitionException when status is COMPLETED", () => {
        order.confirm();
        order.startPreparing();
        order.markReady();
        order.complete();
        expect(() => order.confirm()).toThrow(InvalidOrderStatusTransitionException);
      });
    });

    describe("startPreparing", () => {
      it("should transition from CONFIRMED to PREPARING", () => {
        order.confirm();
        order.startPreparing();
        expect(order.getStatus()).toBe(OrderStatus.PREPARING);
      });

      it("should emit OrderPreparationStartedEvent", () => {
        order.confirm();
        order.startPreparing();
        const events = order.pullDomainEvents();
        expect(events[1]).toBeInstanceOf(OrderPreparationStartedEvent);
        expect((events[1] as OrderPreparationStartedEvent).payload.previousStatus).toBe(OrderStatus.CONFIRMED);
      });

      it("should throw InvalidOrderStatusTransitionException from PENDING", () => {
        expect(() => order.startPreparing()).toThrow(InvalidOrderStatusTransitionException);
      });

      it("should throw InvalidOrderStatusTransitionException from READY", () => {
        order.confirm();
        order.startPreparing();
        order.markReady();
        expect(() => order.startPreparing()).toThrow(InvalidOrderStatusTransitionException);
      });
    });

    describe("markReady", () => {
      it("should transition from PREPARING to READY", () => {
        order.confirm();
        order.startPreparing();
        order.markReady();
        expect(order.getStatus()).toBe(OrderStatus.READY);
      });

      it("should emit OrderReadyEvent", () => {
        order.confirm();
        order.startPreparing();
        order.markReady();
        const events = order.pullDomainEvents();
        expect(events[2]).toBeInstanceOf(OrderReadyEvent);
        expect((events[2] as OrderReadyEvent).payload.previousStatus).toBe(OrderStatus.PREPARING);
      });

      it("should throw InvalidOrderStatusTransitionException from PENDING", () => {
        expect(() => order.markReady()).toThrow(InvalidOrderStatusTransitionException);
      });
    });

    describe("complete", () => {
      it("should transition from READY to COMPLETED", () => {
        order.confirm();
        order.startPreparing();
        order.markReady();
        order.complete();
        expect(order.getStatus()).toBe(OrderStatus.COMPLETED);
      });

      it("should emit OrderCompletedEvent", () => {
        order.confirm();
        order.startPreparing();
        order.markReady();
        order.complete();
        const events = order.pullDomainEvents();
        expect(events[3]).toBeInstanceOf(OrderCompletedEvent);
        expect((events[3] as OrderCompletedEvent).payload.previousStatus).toBe(OrderStatus.READY);
      });

      it("should throw InvalidOrderStatusTransitionException from PENDING", () => {
        expect(() => order.complete()).toThrow(InvalidOrderStatusTransitionException);
      });
    });

    describe("cancel", () => {
      it("should transition from PENDING to CANCELLED", () => {
        order.cancel();
        expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
      });

      it("should emit OrderCancelledEvent", () => {
        order.cancel();
        const events = order.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(OrderCancelledEvent);
        expect((events[0] as OrderCancelledEvent).payload.previousStatus).toBe(OrderStatus.PENDING);
        expect((events[0] as OrderCancelledEvent).payload.reason).toBeUndefined();
      });

      it("should transition from CONFIRMED to CANCELLED", () => {
        order.confirm();
        order.cancel();
        expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
      });

      it("should transition from PREPARING to CANCELLED", () => {
        order.confirm();
        order.startPreparing();
        order.cancel();
        expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
      });

      it("should throw InvalidOrderStatusTransitionException from COMPLETED", () => {
        order.confirm();
        order.startPreparing();
        order.markReady();
        order.complete();
        expect(() => order.cancel()).toThrow(InvalidOrderStatusTransitionException);
      });
    });

    describe("reject", () => {
      it("should transition from PENDING to REJECTED", () => {
        order.reject();
        expect(order.getStatus()).toBe(OrderStatus.REJECTED);
      });

      it("should emit OrderRejectedEvent", () => {
        order.reject();
        const events = order.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(OrderRejectedEvent);
        expect((events[0] as OrderRejectedEvent).payload.previousStatus).toBe(OrderStatus.PENDING);
      });

      it("should throw InvalidOrderStatusTransitionException from CONFIRMED", () => {
        order.confirm();
        expect(() => order.reject()).toThrow(InvalidOrderStatusTransitionException);
      });
    });
  });

  describe("pay", () => {
    let order: Order;

    beforeEach(() => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      order = Order.createDineInOrder(data);
      order.pullDomainEvents();
    });

    it("should mark order as paid", () => {
      order.pay(PaymentMethod.CARD, "txn-123456");
      expect(order.getPayment().isPaid()).toBe(true);
      expect(order.getPayment().getMethod()).toBe(PaymentMethod.CARD);
      expect(order.getPayment().getTransactionId()).toBe("txn-123456");
    });

    it("should emit OrderPaidEvent", () => {
      order.pay(PaymentMethod.QRIS, "txn-789");
      const events = order.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderPaidEvent);
      expect((events[0] as OrderPaidEvent).payload.method).toBe(PaymentMethod.QRIS);
      expect((events[0] as OrderPaidEvent).payload.transactionId).toBe("txn-789");
    });

    it("should update updatedAt", () => {
      const before = order.getUpdatedAt();
      order.pay(PaymentMethod.CARD, "txn-123456");
      const after = order.getUpdatedAt();
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("should throw OrderAlreadyPaidException when already paid", () => {
      order.pay(PaymentMethod.CARD, "txn-123456");
      expect(() => order.pay(PaymentMethod.QRIS, "txn-789")).toThrow(OrderAlreadyPaidException);
    });

    it("should throw OrderAlreadyPaidException with order id", () => {
      order.pay(PaymentMethod.CARD, "txn-123456");
      try {
        order.pay(PaymentMethod.QRIS, "txn-789");
      } catch (error) {
        expect(error).toBeInstanceOf(OrderAlreadyPaidException);
        expect((error as OrderAlreadyPaidException).message).toContain(mockId);
      }
    });
  });

  describe("reservation operations", () => {
    let order: Order;

    beforeEach(() => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockReservationFulfillmentData,
      };
      order = Order.createReservationOrder(data);
      order.pullDomainEvents();
    });

    describe("seatReservation", () => {
      it("should seat a reservation", () => {
        order.seatReservation();
        const reservation = order.getFulfillment().asReservation();
        expect(reservation.getReservationStatus()).toBe(ReservationStatus.SEATED);
      });

      it("should emit ReservationSeatedEvent", () => {
        order.seatReservation();
        const events = order.pullDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(ReservationSeatedEvent);
        expect((events[0] as ReservationSeatedEvent).payload.tableId).toBe("table-123");
      });

      it("should update updatedAt", () => {
        const before = order.getUpdatedAt();
        order.seatReservation();
        const after = order.getUpdatedAt();
        expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });

      it("should throw InvalidOrderTypeOperationException for non-reservation order", () => {
        const dineInData: DineInOrderCreationData = {
          id: "dinein-123",
          items: [mockItemData],
          taxRatePercent: mockTaxRate,
          serviceChargeRatePercent: mockServiceChargeRate,
          fulfillment: mockDineInFulfillmentData,
        };
        const dineInOrder = Order.createDineInOrder(dineInData);
        expect(() => dineInOrder.seatReservation()).toThrow(InvalidOrderTypeOperationException);
      });

      it("should throw with correct error message", () => {
        const dineInData: DineInOrderCreationData = {
          id: "dinein-123",
          items: [mockItemData],
          taxRatePercent: mockTaxRate,
          serviceChargeRatePercent: mockServiceChargeRate,
          fulfillment: mockDineInFulfillmentData,
        };
        const dineInOrder = Order.createDineInOrder(dineInData);
        try {
          dineInOrder.seatReservation();
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidOrderTypeOperationException);
          expect((error as InvalidOrderTypeOperationException).message).toContain("dinein-123");
          expect((error as InvalidOrderTypeOperationException).message).toContain("seat a reservation");
          expect((error as InvalidOrderTypeOperationException).message).toContain(OrderType.RESERVATION);
          expect((error as InvalidOrderTypeOperationException).message).toContain(OrderType.DINEIN);
        }
      });
    });

    describe("markReservationNoShow", () => {
      it("should mark reservation as no-show and cancel order", () => {
        order.markReservationNoShow();
        const reservation = order.getFulfillment().asReservation();
        expect(reservation.getReservationStatus()).toBe(ReservationStatus.NO_SHOW);
        expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
      });

      it("should emit ReservationNoShowEvent and OrderCancelledEvent", () => {
        order.markReservationNoShow();
        const events = order.pullDomainEvents();
        expect(events).toHaveLength(2);
        expect(events[0]).toBeInstanceOf(ReservationNoShowEvent);
        expect((events[0] as ReservationNoShowEvent).payload.tableId).toBe("table-123");
        expect(events[1]).toBeInstanceOf(OrderCancelledEvent);
        expect((events[1] as OrderCancelledEvent).payload.reason).toBe("no-show");
        expect((events[1] as OrderCancelledEvent).payload.previousStatus).toBe(OrderStatus.PENDING);
      });

      it("should throw InvalidOrderTypeOperationException for non-reservation order", () => {
        const dineInData: DineInOrderCreationData = {
          id: "dinein-123",
          items: [mockItemData],
          taxRatePercent: mockTaxRate,
          serviceChargeRatePercent: mockServiceChargeRate,
          fulfillment: mockDineInFulfillmentData,
        };
        const dineInOrder = Order.createDineInOrder(dineInData);
        expect(() => dineInOrder.markReservationNoShow()).toThrow(InvalidOrderTypeOperationException);
      });

      it("should throw with correct error message", () => {
        const dineInData: DineInOrderCreationData = {
          id: "dinein-123",
          items: [mockItemData],
          taxRatePercent: mockTaxRate,
          serviceChargeRatePercent: mockServiceChargeRate,
          fulfillment: mockDineInFulfillmentData,
        };
        const dineInOrder = Order.createDineInOrder(dineInData);
        try {
          dineInOrder.markReservationNoShow();
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidOrderTypeOperationException);
          expect((error as InvalidOrderTypeOperationException).message).toContain("dinein-123");
          expect((error as InvalidOrderTypeOperationException).message).toContain("mark a reservation as no-show");
          expect((error as InvalidOrderTypeOperationException).message).toContain(OrderType.RESERVATION);
          expect((error as InvalidOrderTypeOperationException).message).toContain(OrderType.DINEIN);
        }
      });
    });

    describe("markReservationCancelled", () => {
      it("should mark reservation as cancelled and cancel order", () => {
        order.markReservationCancelled();
        const reservation = order.getFulfillment().asReservation();
        expect(reservation.getReservationStatus()).toBe(ReservationStatus.CANCELLED);
        expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
      });

      it("should emit ReservationCancelledEvent and OrderCancelledEvent", () => {
        order.markReservationCancelled();
        const events = order.pullDomainEvents();
        expect(events).toHaveLength(2);
        expect(events[0]).toBeInstanceOf(ReservationCancelledEvent);
        expect((events[0] as ReservationCancelledEvent).payload.tableId).toBe("table-123");
        expect(events[1]).toBeInstanceOf(OrderCancelledEvent);
        expect((events[1] as OrderCancelledEvent).payload.previousStatus).toBe(OrderStatus.PENDING);
      });

      it("should throw InvalidOrderTypeOperationException for non-reservation order", () => {
        const dineInData: DineInOrderCreationData = {
          id: "dinein-123",
          items: [mockItemData],
          taxRatePercent: mockTaxRate,
          serviceChargeRatePercent: mockServiceChargeRate,
          fulfillment: mockDineInFulfillmentData,
        };
        const dineInOrder = Order.createDineInOrder(dineInData);
        expect(() => dineInOrder.markReservationCancelled()).toThrow(InvalidOrderTypeOperationException);
      });

      it("should throw with correct error message", () => {
        const dineInData: DineInOrderCreationData = {
          id: "dinein-123",
          items: [mockItemData],
          taxRatePercent: mockTaxRate,
          serviceChargeRatePercent: mockServiceChargeRate,
          fulfillment: mockDineInFulfillmentData,
        };
        const dineInOrder = Order.createDineInOrder(dineInData);
        try {
          dineInOrder.markReservationCancelled();
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidOrderTypeOperationException);
          expect((error as InvalidOrderTypeOperationException).message).toContain("dinein-123");
          expect((error as InvalidOrderTypeOperationException).message).toContain("cancel a reservation");
          expect((error as InvalidOrderTypeOperationException).message).toContain(OrderType.RESERVATION);
          expect((error as InvalidOrderTypeOperationException).message).toContain(OrderType.DINEIN);
        }
      });
    });
  });

  describe("edge cases and error scenarios", () => {
    it("should handle empty items in DINEIN order", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);
      expect(order.getItems()).toHaveLength(0);
      expect(order.getPricing().getSubtotal().isZero()).toBe(true);
    });

    it("should handle zero tax rate", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: 0,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);
      expect(order.getPricing().getTax().isZero()).toBe(true);
    });

    it("should handle zero service charge rate", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: 0,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);
      expect(order.getPricing().getServiceCharge().isZero()).toBe(true);
    });

    it("should handle guest customer in ONLINE order", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: {
          guestName: "John Doe",
          guestEmail: "john@example.com",
        },
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };
      const order = Order.createOnlineOrder(data);
      expect(order.getCustomer().isGuest()).toBe(true);
      expect(order.getCustomer().getGuestName()).toBe("John Doe");
    });

    it("should handle anonymous customer in ONLINE order", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: {},
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
      };
      expect(() => Order.createOnlineOrder(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should handle anonymous customer in RESERVATION order", () => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: {},
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockReservationFulfillmentData,
      };
      expect(() => Order.createReservationOrder(data)).toThrow(InvalidOrderGuestDataException);
    });

    it("should handle DINEIN order always having anonymous customer", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };

      const order = Order.createDineInOrder(data);
      expect(order.getCustomer().isAnonymous()).toBe(true);
      expect(order.getCustomer().getMemberId()).toBeNull();
      expect(order.getCustomer().getGuestName()).toBeNull();
      expect(order.getCustomer().getGuestEmail()).toBeNull();
    });
  });

  describe("event emission", () => {
    it("should clear events after retrieval", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);

      expect(order.pullDomainEvents()).toHaveLength(1);
      expect(order.pullDomainEvents()).toHaveLength(0);
    });

    it("should emit multiple events for reservation no-show", () => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockReservationFulfillmentData,
      };
      const order = Order.createReservationOrder(data);
      order.pullDomainEvents();

      order.markReservationNoShow();
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(ReservationNoShowEvent);
      expect(events[1]).toBeInstanceOf(OrderCancelledEvent);
    });

    it("should emit multiple events for reservation cancellation", () => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockReservationFulfillmentData,
      };
      const order = Order.createReservationOrder(data);
      order.pullDomainEvents();

      order.markReservationCancelled();
      const events = order.pullDomainEvents();

      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(ReservationCancelledEvent);
      expect(events[1]).toBeInstanceOf(OrderCancelledEvent);
    });

    it("should emit correct events for full order lifecycle", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);
      order.pullDomainEvents();

      order.confirm();
      order.startPreparing();
      order.markReady();
      order.complete();

      const events = order.pullDomainEvents();
      expect(events).toHaveLength(4);
      expect(events[0]).toBeInstanceOf(OrderConfirmedEvent);
      expect(events[1]).toBeInstanceOf(OrderPreparationStartedEvent);
      expect(events[2]).toBeInstanceOf(OrderReadyEvent);
      expect(events[3]).toBeInstanceOf(OrderCompletedEvent);
    });

    it("should emit correct events for pay and confirm", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);
      order.pullDomainEvents();

      order.pay(PaymentMethod.CARD, "txn-123");
      order.confirm();

      const events = order.pullDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(OrderPaidEvent);
      expect(events[1]).toBeInstanceOf(OrderConfirmedEvent);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle online order with scheduledAt", () => {
      const scheduledAt = new Date("2024-01-20T10:00:00Z");
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: {
          ...mockOnlineFulfillmentData,
          scheduledAt,
        },
      };

      const order = Order.createOnlineOrder(data);
      expect(order.getFulfillment().asOnline().getScheduledAt()).toEqual(scheduledAt);
    });

    it("should handle online order with pickup delivery type", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: {
          deliveryType: DeliveryType.PICKUP,
          deliveryAddress: null as unknown as undefined,
          deliveryLatitude: null as unknown as undefined,
          deliveryLongitude: null as unknown as undefined,
          scheduledAt: null as unknown as undefined,
        },
      };

      const order = Order.createOnlineOrder(data);
      expect(order.getFulfillment().asOnline().getDeliveryType()).toBe(DeliveryType.PICKUP);
      expect(order.getFulfillment().asOnline().getDeliveryLocation()).toBeNull();
    });

    it("should handle online order with scheduled pickup", () => {
      const scheduledAt = new Date("2024-01-20T10:00:00Z");
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: {
          deliveryType: DeliveryType.PICKUP,
          deliveryAddress: null as unknown as undefined,
          deliveryLatitude: null as unknown as undefined,
          deliveryLongitude: null as unknown as undefined,
          scheduledAt,
        },
      };

      const order = Order.createOnlineOrder(data);
      expect(order.getFulfillment().asOnline().getDeliveryType()).toBe(DeliveryType.PICKUP);
      expect(order.getFulfillment().asOnline().getScheduledAt()).toEqual(scheduledAt);
    });

    it("should handle reservation with notes", () => {
      const data: ReservationOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: {
          ...mockReservationFulfillmentData,
          notes: "Special occasion, window seat preferred",
        },
      };

      const order = Order.createReservationOrder(data);
      expect(order.getFulfillment().asReservation().getNotes()).toBe("Special occasion, window seat preferred");
    });

    it("should handle multiple status transitions in sequence", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);

      order.confirm();
      expect(order.getStatus()).toBe(OrderStatus.CONFIRMED);

      order.startPreparing();
      expect(order.getStatus()).toBe(OrderStatus.PREPARING);

      order.markReady();
      expect(order.getStatus()).toBe(OrderStatus.READY);

      order.complete();
      expect(order.getStatus()).toBe(OrderStatus.COMPLETED);
    });

    it("should handle cancellation after payment", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);

      order.pay(PaymentMethod.CARD, "txn-123");
      order.confirm();
      order.cancel();

      expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
      expect(order.getPayment().isPaid()).toBe(true);
    });

    it("should handle rebuild with different customer types", () => {
      const now = new Date();
      const data: OrderRebuildData = {
        id: mockId,
        customer: {
          type: OrderCustomerType.ANONYMOUS,
          memberId: null,
          guestName: null,
          guestEmail: null,
        },
        type: OrderType.DINEIN,
        fulfillment: {
          type: OrderType.DINEIN,
          dineIn: {
            tableId: "table-123",
            tableNumber: "T-01",
            guestCount: 4,
            cashierSessionId: "session-456",
          },
          online: null,
          reservation: null,
        },
        items: [],
        pricing: {
          subtotal: 0,
          tax: 0,
          serviceCharge: 0,
          deliveryFee: 0,
          discount: 0,
          total: 0,
        },
        payment: {
          status: PaymentStatus.UNPAID,
          method: null,
          paidAt: null,
          transactionId: null,
        },
        status: OrderStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      };

      const order = Order.rebuild(data);
      expect(order.getCustomer().isAnonymous()).toBe(true);
    });

    it("should handle reject after confirm throws error", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);

      order.confirm();
      expect(() => order.reject()).toThrow(InvalidOrderStatusTransitionException);
    });

    it("should handle cancel after confirm", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);

      order.confirm();
      order.cancel();
      expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
    });

    it("should handle cancel during preparing", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);

      order.confirm();
      order.startPreparing();
      order.cancel();
      expect(order.getStatus()).toBe(OrderStatus.CANCELLED);
    });

    it("should handle all status transitions and verify status", () => {
      const data: DineInOrderCreationData = {
        id: mockId,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockDineInFulfillmentData,
      };
      const order = Order.createDineInOrder(data);

      expect(order.getStatus()).toBe(OrderStatus.PENDING);

      order.confirm();
      expect(order.getStatus()).toBe(OrderStatus.CONFIRMED);

      order.startPreparing();
      expect(order.getStatus()).toBe(OrderStatus.PREPARING);

      order.markReady();
      expect(order.getStatus()).toBe(OrderStatus.READY);

      order.complete();
      expect(order.getStatus()).toBe(OrderStatus.COMPLETED);
    });

    it("should handle online order with delivery fee and discount combined", () => {
      const data: OnlineOrderCreationData = {
        id: mockId,
        customer: mockCustomerData,
        items: [mockItemData],
        taxRatePercent: mockTaxRate,
        serviceChargeRatePercent: mockServiceChargeRate,
        fulfillment: mockOnlineFulfillmentData,
        deliveryFee: 15000,
        discount: 5000,
      };

      const order = Order.createOnlineOrder(data);
      expect(order.getPricing().getDeliveryFee().getAmount()).toBe(15000);
      expect(order.getPricing().getDiscount().getAmount()).toBe(5000);
    });

    it("should handle rebuild with guest customer type", () => {
      const now = new Date();
      const data: OrderRebuildData = {
        id: mockId,
        customer: {
          type: OrderCustomerType.GUEST,
          memberId: null,
          guestName: "John Doe",
          guestEmail: "john@example.com",
        },
        type: OrderType.ONLINE,
        fulfillment: {
          type: OrderType.ONLINE,
          dineIn: null,
          online: {
            deliveryType: DeliveryType.DELIVERY,
            deliveryLocation: {
              address: "Jl. Sudirman",
              latitude: -6.2088,
              longitude: 106.8456,
            },
            scheduledAt: null,
          },
          reservation: null,
        },
        items: [],
        pricing: {
          subtotal: 0,
          tax: 0,
          serviceCharge: 0,
          deliveryFee: 0,
          discount: 0,
          total: 0,
        },
        payment: {
          status: PaymentStatus.UNPAID,
          method: null,
          paidAt: null,
          transactionId: null,
        },
        status: OrderStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      };

      const order = Order.rebuild(data);
      expect(order.getCustomer().isGuest()).toBe(true);
      expect(order.getCustomer().getGuestName()).toBe("John Doe");
      expect(order.getCustomer().getGuestEmail()).toBe("john@example.com");
    });

    it("should handle rebuild with member customer type", () => {
      const now = new Date();
      const data: OrderRebuildData = {
        id: mockId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: "member-123",
          guestName: null,
          guestEmail: null,
        },
        type: OrderType.ONLINE,
        fulfillment: {
          type: OrderType.ONLINE,
          dineIn: null,
          online: {
            deliveryType: DeliveryType.DELIVERY,
            deliveryLocation: {
              address: "Jl. Sudirman",
              latitude: -6.2088,
              longitude: 106.8456,
            },
            scheduledAt: null,
          },
          reservation: null,
        },
        items: [],
        pricing: {
          subtotal: 0,
          tax: 0,
          serviceCharge: 0,
          deliveryFee: 0,
          discount: 0,
          total: 0,
        },
        payment: {
          status: PaymentStatus.UNPAID,
          method: null,
          paidAt: null,
          transactionId: null,
        },
        status: OrderStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      };

      const order = Order.rebuild(data);
      expect(order.getCustomer().isMember()).toBe(true);
      expect(order.getCustomer().getMemberId()).toBe("member-123");
    });
  });
});
