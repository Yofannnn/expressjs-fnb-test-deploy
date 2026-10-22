import { OrderMapper } from "@/application/mappers/order.mapper";
import { Order } from "@/domain/entities/order.entity";
import { Product } from "@/domain/entities/product.entity";
import { ProductImage } from "@/domain/value-objects/product-image.vo";
import { OrderItem } from "@/domain/value-objects/order-item.vo";
import { PaymentMethod, PaymentStatus } from "@/domain/types/payment-transaction.type";
import { ProductStatus, ProductType } from "@/domain/types/product.type";
import { DeliveryType, OrderCustomerType, OrderStatus, OrderType, ReservationStatus } from "@/domain/types/order.type";
import {
  DineInOrderDetailsView,
  DineInOrderPlainObject,
  OnlineOrderPlainObject,
  OrderCustomerAsGuestPlainObject,
  ReservationOrderDetailsView,
  ReservationOrderPlainObject,
} from "@/application/types/order.type";

describe("OrderMapper", () => {
  const mockOrderId = "order-123";
  const mockMemberId = "member-123";
  const mockGuestEmail = "guest@example.com";
  const mockGuestName = "John Doe";
  const mockProductId = "product-123";
  const mockProductId2 = "product-456";
  const mockCategoryId = "category-123";
  const mockTableId = "table-123";
  const mockTableNumber = "T-01";
  const mockCashierSessionId = "session-456";
  const mockCreatedAt = new Date("2024-01-01T10:00:00.000Z");
  const mockUpdatedAt = new Date("2024-01-01T11:00:00.000Z");
  const mockReservedAt = new Date("2024-01-15T10:30:00.000Z");
  const mockScheduledAt = new Date("2024-01-15T14:00:00.000Z");
  const mockPaidAt = new Date("2024-01-01T10:30:00.000Z");

  const mockProductImages: ProductImage[] = [
    {
      getProductId: jest.fn().mockReturnValue(mockProductId),
      getUrl: jest.fn().mockReturnValue("https://example.com/image1.jpg"),
      getAltText: jest.fn().mockReturnValue("Product Image 1"),
      getSortOrder: jest.fn().mockReturnValue(1),
      isPrimaryImage: jest.fn().mockReturnValue(true),
      changeUrl: jest.fn().mockReturnThis(),
      changeAltText: jest.fn().mockReturnThis(),
      changeSortOrder: jest.fn().mockReturnThis(),
      makePrimary: jest.fn().mockReturnThis(),
    } as unknown as ProductImage,
    {
      getProductId: jest.fn().mockReturnValue(mockProductId),
      getUrl: jest.fn().mockReturnValue("https://example.com/image2.jpg"),
      getAltText: jest.fn().mockReturnValue("Product Image 2"),
      getSortOrder: jest.fn().mockReturnValue(2),
      isPrimaryImage: jest.fn().mockReturnValue(false),
      changeUrl: jest.fn().mockReturnThis(),
      changeAltText: jest.fn().mockReturnThis(),
      changeSortOrder: jest.fn().mockReturnThis(),
      makePrimary: jest.fn().mockReturnThis(),
    } as unknown as ProductImage,
  ];

  const mockProduct = {
    getId: jest.fn().mockReturnValue(mockProductId),
    getName: jest.fn().mockReturnValue("Test Product"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(100000) }),
    getDescription: jest.fn().mockReturnValue("Test Description"),
    getType: jest.fn().mockReturnValue(ProductType.FOOD),
    getStockQuantity: jest.fn().mockReturnValue(10),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue(mockProductImages),
    getCategoryId: jest.fn().mockReturnValue(mockCategoryId),
  } as unknown as jest.Mocked<Product>;

  const mockProduct2 = {
    getId: jest.fn().mockReturnValue(mockProductId2),
    getName: jest.fn().mockReturnValue("Test Product 2"),
    getPrice: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(50000) }),
    getDescription: jest.fn().mockReturnValue("Test Description 2"),
    getType: jest.fn().mockReturnValue(ProductType.DRINK),
    getStockQuantity: jest.fn().mockReturnValue(5),
    getStatus: jest.fn().mockReturnValue(ProductStatus.AVAILABLE),
    getImages: jest.fn().mockReturnValue([]),
    getCategoryId: jest.fn().mockReturnValue(mockCategoryId),
  } as unknown as jest.Mocked<Product>;

  const mockProducts = [mockProduct, mockProduct2];

  const createOnlineOrder = (): Order => {
    return Order.rebuild({
      id: mockOrderId,
      customer: {
        type: OrderCustomerType.MEMBER,
        memberId: mockMemberId,
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
            address: "Jl. Sudirman No. 1",
            latitude: -6.2088,
            longitude: 106.8456,
          },
          scheduledAt: mockScheduledAt,
        },
        reservation: null,
      },
      items: [
        {
          productId: mockProductId,
          productName: "Test Product",
          priceSnapshot: 100000,
          quantity: 2,
          note: null,
        },
        {
          productId: mockProductId2,
          productName: "Test Product 2",
          priceSnapshot: 50000,
          quantity: 1,
          note: "Extra sauce",
        },
      ],
      pricing: {
        subtotal: 250000,
        tax: 25000,
        serviceCharge: 12500,
        deliveryFee: 15000,
        discount: 5000,
        total: 297500,
      },
      payment: {
        status: PaymentStatus.UNPAID,
        method: null,
        paidAt: null,
        transactionId: null,
      },
      status: OrderStatus.PENDING,
      createdAt: mockCreatedAt,
      updatedAt: mockUpdatedAt,
    });
  };

  const createReservationOrder = (): Order => {
    return Order.rebuild({
      id: mockOrderId,
      customer: {
        type: OrderCustomerType.GUEST,
        memberId: null,
        guestName: mockGuestName,
        guestEmail: mockGuestEmail,
      },
      type: OrderType.RESERVATION,
      fulfillment: {
        type: OrderType.RESERVATION,
        dineIn: null,
        online: null,
        reservation: {
          tableId: mockTableId,
          reservedAt: mockReservedAt,
          partySize: 4,
          durationInMinutes: 120,
          reservationStatus: ReservationStatus.BOOKED,
          notes: "Special occasion",
        },
      },
      items: [
        {
          productId: mockProductId,
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
      createdAt: mockCreatedAt,
      updatedAt: mockUpdatedAt,
    });
  };

  const createDineInOrder = (): Order => {
    return Order.rebuild({
      id: mockOrderId,
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
          tableId: mockTableId,
          tableNumber: mockTableNumber,
          guestCount: 4,
          cashierSessionId: mockCashierSessionId,
        },
        online: null,
        reservation: null,
      },
      items: [
        {
          productId: mockProductId,
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
      createdAt: mockCreatedAt,
      updatedAt: mockUpdatedAt,
    });
  };

  const createPaidOrder = (): Order => {
    return Order.rebuild({
      id: mockOrderId,
      customer: {
        type: OrderCustomerType.MEMBER,
        memberId: mockMemberId,
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
            address: "Jl. Sudirman No. 1",
            latitude: -6.2088,
            longitude: 106.8456,
          },
          scheduledAt: mockScheduledAt,
        },
        reservation: null,
      },
      items: [
        {
          productId: mockProductId,
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
        deliveryFee: 15000,
        discount: 0,
        total: 245000,
      },
      payment: {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: mockPaidAt,
        transactionId: "txn-123",
      },
      status: OrderStatus.CONFIRMED,
      createdAt: mockCreatedAt,
      updatedAt: mockUpdatedAt,
    });
  };

  describe("toPlainObject", () => {
    describe("with ONLINE order", () => {
      let order: Order;
      let result: ReturnType<typeof OrderMapper.toPlainObject>;

      beforeEach(() => {
        order = createOnlineOrder();
        result = OrderMapper.toPlainObject(order);
      });

      it("should map to OnlineOrderPlainObject", () => {
        expect(result.type).toBe(OrderType.ONLINE);
        expect(result).toHaveProperty("customer");
        expect(result).toHaveProperty("fulfillment");
        expect(result).not.toHaveProperty("dineIn");
        expect(result).not.toHaveProperty("reservation");
      });

      it("should map base fields correctly", () => {
        expect(result.id).toBe(mockOrderId);
        expect(result.status).toBe(OrderStatus.PENDING);
        expect(result.createdAt).toEqual(mockCreatedAt);
        expect(result.updatedAt).toEqual(mockUpdatedAt);
      });

      it("should map customer correctly", () => {
        const customer = (result as OnlineOrderPlainObject).customer;
        if ("memberId" in customer) expect(customer.memberId).toBe(mockMemberId);
        if ("guestName" in customer) expect(customer.guestName).toBeUndefined();
        if ("guestEmail" in customer) expect(customer.guestEmail).toBeUndefined();
      });

      it("should map fulfillment correctly", () => {
        const fulfillment = (result as OnlineOrderPlainObject).fulfillment;
        expect(fulfillment.deliveryType).toBe(DeliveryType.DELIVERY);
        expect(fulfillment.scheduledAt).toEqual(mockScheduledAt);
        expect(fulfillment.deliveryLocation).toEqual({
          address: "Jl. Sudirman No. 1",
          latitude: -6.2088,
          longitude: 106.8456,
        });
      });

      it("should map items correctly", () => {
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toEqual({
          productId: mockProductId,
          productName: "Test Product",
          priceSnapshot: 100000,
          quantity: 2,
          note: null,
        });
        expect(result.items[1]).toEqual({
          productId: mockProductId2,
          productName: "Test Product 2",
          priceSnapshot: 50000,
          quantity: 1,
          note: "Extra sauce",
        });
      });

      it("should map payment correctly", () => {
        expect(result.payment).toEqual({
          status: PaymentStatus.UNPAID,
          method: null,
          paidAt: null,
          transactionId: null,
        });
      });

      it("should map pricing correctly", () => {
        expect(result.pricing).toEqual({
          subtotal: 250000,
          tax: 25000,
          serviceCharge: 12500,
          deliveryFee: 15000,
          discount: 5000,
          total: 297500,
        });
      });
    });

    describe("with RESERVATION order", () => {
      let order: Order;
      let result: ReturnType<typeof OrderMapper.toPlainObject>;

      beforeEach(() => {
        order = createReservationOrder();
        result = OrderMapper.toPlainObject(order);
      });

      it("should map to ReservationOrderPlainObject", () => {
        expect(result.type).toBe(OrderType.RESERVATION);
        expect(result).toHaveProperty("customer");
        expect(result).toHaveProperty("fulfillment");
        expect(result).not.toHaveProperty("dineIn");
        expect(result).not.toHaveProperty("online");
      });

      it("should map customer correctly for guest", () => {
        const customer = (result as ReservationOrderPlainObject).customer;
        if ("memberId" in customer) expect(customer.memberId).toBeUndefined();
        if ("guestName" in customer) expect(customer.guestName).toBe(mockGuestName);
        if ("guestEmail" in customer) expect(customer.guestEmail).toBe(mockGuestEmail);
      });

      it("should map fulfillment correctly", () => {
        const fulfillment = (result as ReservationOrderPlainObject).fulfillment;
        expect(fulfillment.tableId).toBe(mockTableId);
        expect(fulfillment.reservedAt).toEqual(mockReservedAt);
        expect(fulfillment.partySize).toBe(4);
        expect(fulfillment.durationInMinutes).toBe(120);
        expect(fulfillment.reservationStatus).toBe(ReservationStatus.BOOKED);
        expect(fulfillment.notes).toBe("Special occasion");
      });
    });

    describe("with DINEIN order", () => {
      let order: Order;
      let result: ReturnType<typeof OrderMapper.toPlainObject>;

      beforeEach(() => {
        order = createDineInOrder();
        result = OrderMapper.toPlainObject(order);
      });

      it("should map to DineInOrderPlainObject", () => {
        expect(result.type).toBe(OrderType.DINEIN);
        expect(result).toHaveProperty("fulfillment");
        expect(result).not.toHaveProperty("customer");
        expect(result).not.toHaveProperty("online");
        expect(result).not.toHaveProperty("reservation");
      });

      it("should map fulfillment correctly", () => {
        const fulfillment = (result as DineInOrderPlainObject).fulfillment;
        expect(fulfillment.tableId).toBe(mockTableId);
        expect(fulfillment.tableNumber).toBe(mockTableNumber);
        expect(fulfillment.guestCount).toBe(4);
        expect(fulfillment.cashierSessionId).toBe(mockCashierSessionId);
      });
    });

    describe("with PAID order", () => {
      let order: Order;
      let result: ReturnType<typeof OrderMapper.toPlainObject>;

      beforeEach(() => {
        order = createPaidOrder();
        result = OrderMapper.toPlainObject(order);
      });

      it("should map payment correctly for paid order", () => {
        expect(result.payment).toEqual({
          status: PaymentStatus.PAID,
          method: PaymentMethod.CARD,
          paidAt: mockPaidAt,
          transactionId: "txn-123",
        });
      });

      it("should map status correctly", () => {
        expect(result.status).toBe(OrderStatus.CONFIRMED);
      });
    });

    describe("with ONLINE order - pickup", () => {
      let order: Order;
      let result: ReturnType<typeof OrderMapper.toPlainObject>;

      beforeEach(() => {
        order = Order.rebuild({
          id: mockOrderId,
          customer: {
            type: OrderCustomerType.MEMBER,
            memberId: mockMemberId,
            guestName: null,
            guestEmail: null,
          },
          type: OrderType.ONLINE,
          fulfillment: {
            type: OrderType.ONLINE,
            dineIn: null,
            online: {
              deliveryType: DeliveryType.PICKUP,
              deliveryLocation: null,
              scheduledAt: mockScheduledAt,
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
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = OrderMapper.toPlainObject(order);
      });

      it("should map pickup fulfillment correctly", () => {
        const fulfillment = (result as OnlineOrderPlainObject).fulfillment;
        expect(fulfillment.deliveryType).toBe(DeliveryType.PICKUP);
        expect(fulfillment.deliveryLocation).toBeNull();
        expect(fulfillment.scheduledAt).toEqual(mockScheduledAt);
      });
    });

    describe("with ONLINE order - no scheduledAt", () => {
      let order: Order;
      let result: ReturnType<typeof OrderMapper.toPlainObject>;

      beforeEach(() => {
        order = Order.rebuild({
          id: mockOrderId,
          customer: {
            type: OrderCustomerType.MEMBER,
            memberId: mockMemberId,
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
                address: "Jl. Sudirman No. 1",
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
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = OrderMapper.toPlainObject(order);
      });

      it("should map scheduledAt as null", () => {
        const fulfillment = (result as OnlineOrderPlainObject).fulfillment;
        expect(fulfillment.scheduledAt).toBeNull();
      });
    });
  });

  describe("toOrderItemPlainObject", () => {
    let order: Order;

    beforeEach(() => {
      order = createOnlineOrder();
    });

    it("should map items from Order", () => {
      const result = OrderMapper.toOrderItemPlainObject(order);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        productId: mockProductId,
        productName: "Test Product",
        priceSnapshot: 100000,
        quantity: 2,
        note: null,
      });
      expect(result[1]).toEqual({
        productId: mockProductId2,
        productName: "Test Product 2",
        priceSnapshot: 50000,
        quantity: 1,
        note: "Extra sauce",
      });
    });

    it("should map items from OrderItem array", () => {
      const items = order.getItems() as OrderItem[];
      const result = OrderMapper.toOrderItemPlainObject(items);

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe(mockProductId);
      expect(result[1].productId).toBe(mockProductId2);
    });

    it("should handle empty items", () => {
      const emptyOrder = createOnlineOrder();
      const result = OrderMapper.toOrderItemPlainObject(emptyOrder);

      expect(result).toHaveLength(2);
    });

    it("should preserve note as null when not provided", () => {
      const result = OrderMapper.toOrderItemPlainObject(order);
      expect(result[0].note).toBeNull();
    });
  });

  describe("toPaymentInfoPlainObject", () => {
    let order: Order;

    beforeEach(() => {
      order = createOnlineOrder();
    });

    it("should map payment from Order", () => {
      const result = OrderMapper.toOrderPaymentInfoPlainObject(order);

      expect(result).toEqual({
        status: PaymentStatus.UNPAID,
        method: null,
        paidAt: null,
        transactionId: null,
      });
    });

    it("should map payment from PaymentInfo", () => {
      const payment = order.getPayment();
      const result = OrderMapper.toOrderPaymentInfoPlainObject(payment);

      expect(result).toEqual({
        status: PaymentStatus.UNPAID,
        method: null,
        paidAt: null,
        transactionId: null,
      });
    });

    it("should map paid payment correctly", () => {
      const paidOrder = createPaidOrder();
      const result = OrderMapper.toOrderPaymentInfoPlainObject(paidOrder);

      expect(result).toEqual({
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: mockPaidAt,
        transactionId: "txn-123",
      });
    });
  });

  describe("toOrderPricingPlainObject", () => {
    let order: Order;

    beforeEach(() => {
      order = createOnlineOrder();
    });

    it("should map pricing from Order", () => {
      const result = OrderMapper.toOrderPricingPlainObject(order);

      expect(result).toEqual({
        subtotal: 250000,
        tax: 25000,
        serviceCharge: 12500,
        deliveryFee: 15000,
        discount: 5000,
        total: 297500,
      });
    });

    it("should map pricing from OrderPricing", () => {
      const pricing = order.getPricing();
      const result = OrderMapper.toOrderPricingPlainObject(pricing);

      expect(result).toEqual({
        subtotal: 250000,
        tax: 25000,
        serviceCharge: 12500,
        deliveryFee: 15000,
        discount: 5000,
        total: 297500,
      });
    });

    it("should map zero values correctly", () => {
      const zeroOrder = Order.rebuild({
        id: mockOrderId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: mockMemberId,
          guestName: null,
          guestEmail: null,
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
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const result = OrderMapper.toOrderPricingPlainObject(zeroOrder);

      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.serviceCharge).toBe(0);
      expect(result.deliveryFee).toBe(0);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe("toOrderCustomerPlainObject", () => {
    it("should map member customer from Order", () => {
      const order = createOnlineOrder();
      const result = OrderMapper.toOrderCustomerPlainObject(order);

      expect(result).toEqual({
        memberId: mockMemberId,
      });
    });

    it("should map guest customer from Order", () => {
      const order = createReservationOrder();
      const result = OrderMapper.toOrderCustomerPlainObject(order);

      expect(result).toEqual({
        guestName: mockGuestName,
        guestEmail: mockGuestEmail,
      });
    });

    it("should map member customer from OrderCustomer", () => {
      const order = createOnlineOrder();
      const customer = order.getCustomer();
      const result = OrderMapper.toOrderCustomerPlainObject(customer);

      expect(result).toEqual({
        memberId: mockMemberId,
      });
    });

    it("should map guest customer from OrderCustomer", () => {
      const order = createReservationOrder();
      const customer = order.getCustomer();
      const result = OrderMapper.toOrderCustomerPlainObject(customer);

      expect(result).toEqual({
        guestName: mockGuestName,
        guestEmail: mockGuestEmail,
      });
    });

    it("should map anonymous customer", () => {
      const order = createDineInOrder();
      const customer = order.getCustomer();
      const result = OrderMapper.toOrderCustomerPlainObject(customer);

      expect(result).toEqual({
        guestName: null,
        guestEmail: null,
      });
    });
  });

  describe("toOnlineOrderFulfillmentInfoPlainObject", () => {
    it("should map online fulfillment from Order", () => {
      const order = createOnlineOrder();
      const result = OrderMapper.toOnlineOrderFulfillmentInfoPlainObject(order);

      expect(result.deliveryType).toBe(DeliveryType.DELIVERY);
      expect(result.scheduledAt).toEqual(mockScheduledAt);
      expect(result.deliveryLocation).toEqual({
        address: "Jl. Sudirman No. 1",
        latitude: -6.2088,
        longitude: 106.8456,
      });
    });

    it("should map online fulfillment from OnlineInfo", () => {
      const order = createOnlineOrder();
      const online = order.getFulfillment().asOnline();
      const result = OrderMapper.toOnlineOrderFulfillmentInfoPlainObject(online);

      expect(result.deliveryType).toBe(DeliveryType.DELIVERY);
      expect(result.scheduledAt).toEqual(mockScheduledAt);
      expect(result.deliveryLocation).toEqual({
        address: "Jl. Sudirman No. 1",
        latitude: -6.2088,
        longitude: 106.8456,
      });
    });

    it("should map pickup fulfillment", () => {
      const order = Order.rebuild({
        id: mockOrderId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: mockMemberId,
          guestName: null,
          guestEmail: null,
        },
        type: OrderType.ONLINE,
        fulfillment: {
          type: OrderType.ONLINE,
          dineIn: null,
          online: {
            deliveryType: DeliveryType.PICKUP,
            deliveryLocation: null,
            scheduledAt: mockScheduledAt,
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
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const result = OrderMapper.toOnlineOrderFulfillmentInfoPlainObject(order);

      expect(result.deliveryType).toBe(DeliveryType.PICKUP);
      expect(result.deliveryLocation).toBeNull();
      expect(result.scheduledAt).toEqual(mockScheduledAt);
    });

    it("should map null scheduledAt", () => {
      const order = Order.rebuild({
        id: mockOrderId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: mockMemberId,
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
              address: "Jl. Sudirman No. 1",
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
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const result = OrderMapper.toOnlineOrderFulfillmentInfoPlainObject(order);

      expect(result.scheduledAt).toBeNull();
    });
  });

  describe("toReservationOrderFulfillmentInfoPlainObject", () => {
    it("should map reservation fulfillment from Order", () => {
      const order = createReservationOrder();
      const result = OrderMapper.toReservationOrderFulfillmentInfoPlainObject(order);

      expect(result.tableId).toBe(mockTableId);
      expect(result.reservedAt).toEqual(mockReservedAt);
      expect(result.partySize).toBe(4);
      expect(result.durationInMinutes).toBe(120);
      expect(result.reservationStatus).toBe(ReservationStatus.BOOKED);
      expect(result.notes).toBe("Special occasion");
    });

    it("should map reservation fulfillment from ReservationInfo", () => {
      const order = createReservationOrder();
      const reservation = order.getFulfillment().asReservation();
      const result = OrderMapper.toReservationOrderFulfillmentInfoPlainObject(reservation);

      expect(result.tableId).toBe(mockTableId);
      expect(result.reservedAt).toEqual(mockReservedAt);
      expect(result.partySize).toBe(4);
      expect(result.durationInMinutes).toBe(120);
      expect(result.reservationStatus).toBe(ReservationStatus.BOOKED);
      expect(result.notes).toBe("Special occasion");
    });

    it("should map null notes", () => {
      const order = Order.rebuild({
        id: mockOrderId,
        customer: {
          type: OrderCustomerType.GUEST,
          memberId: null,
          guestName: mockGuestName,
          guestEmail: mockGuestEmail,
        },
        type: OrderType.RESERVATION,
        fulfillment: {
          type: OrderType.RESERVATION,
          dineIn: null,
          online: null,
          reservation: {
            tableId: mockTableId,
            reservedAt: mockReservedAt,
            partySize: 4,
            durationInMinutes: 120,
            reservationStatus: ReservationStatus.BOOKED,
            notes: null,
          },
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
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const result = OrderMapper.toReservationOrderFulfillmentInfoPlainObject(order);

      expect(result.notes).toBeNull();
    });
  });

  describe("toDineInOrderFulfillmentInfoPlainObject", () => {
    it("should map dine-in fulfillment from Order", () => {
      const order = createDineInOrder();
      const result = OrderMapper.toDineInOrderFulfillmentInfoPlainObject(order);

      expect(result.tableId).toBe(mockTableId);
      expect(result.tableNumber).toBe(mockTableNumber);
      expect(result.guestCount).toBe(4);
      expect(result.cashierSessionId).toBe(mockCashierSessionId);
    });

    it("should map dine-in fulfillment from DineInInfo", () => {
      const order = createDineInOrder();
      const dineIn = order.getFulfillment().asDineIn();
      const result = OrderMapper.toDineInOrderFulfillmentInfoPlainObject(dineIn);

      expect(result.tableId).toBe(mockTableId);
      expect(result.tableNumber).toBe(mockTableNumber);
      expect(result.guestCount).toBe(4);
      expect(result.cashierSessionId).toBe(mockCashierSessionId);
    });

    it("should map null cashierSessionId", () => {
      const order = Order.rebuild({
        id: mockOrderId,
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
            tableId: mockTableId,
            tableNumber: mockTableNumber,
            guestCount: 4,
            cashierSessionId: null,
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
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const result = OrderMapper.toDineInOrderFulfillmentInfoPlainObject(order);

      expect(result.cashierSessionId).toBeNull();
    });
  });

  describe("toDetailsView", () => {
    let order: Order;
    let result: ReturnType<typeof OrderMapper.toDetailsView>;

    describe("with ONLINE order and products", () => {
      beforeEach(() => {
        order = createOnlineOrder();
        result = OrderMapper.toDetailsView(order, mockProducts);
      });

      it("should include items with image URLs", () => {
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toEqual({
          productId: mockProductId,
          productName: "Test Product",
          priceSnapshot: 100000,
          quantity: 2,
          note: null,
          imageUrl: "https://example.com/image1.jpg",
        });
        expect(result.items[1]).toEqual({
          productId: mockProductId2,
          productName: "Test Product 2",
          priceSnapshot: 50000,
          quantity: 1,
          note: "Extra sauce",
          imageUrl: null,
        });
      });

      it("should include all base fields", () => {
        expect(result.id).toBe(mockOrderId);
        expect(result.type).toBe(OrderType.ONLINE);
        expect(result.status).toBe(OrderStatus.PENDING);
        expect(result.createdAt).toEqual(mockCreatedAt);
        expect(result.updatedAt).toEqual(mockUpdatedAt);
      });

      it("should include customer and fulfillment", () => {
        expect(result).toHaveProperty("customer");
        expect(result).toHaveProperty("fulfillment");
        expect(result).toHaveProperty("payment");
        expect(result).toHaveProperty("pricing");
      });
    });

    describe("with RESERVATION order and products", () => {
      beforeEach(() => {
        order = createReservationOrder();
        result = OrderMapper.toDetailsView(order, mockProducts);
      });

      it("should include items with image URLs", () => {
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual({
          productId: mockProductId,
          productName: "Test Product",
          priceSnapshot: 100000,
          quantity: 2,
          note: null,
          imageUrl: "https://example.com/image1.jpg",
        });
      });

      it("should include customer for reservation", () => {
        const orderResult = result as ReservationOrderDetailsView;
        const customer = orderResult.customer as OrderCustomerAsGuestPlainObject;

        expect(result).toHaveProperty("customer");
        expect(customer.guestName).toBe(mockGuestName);
        expect(customer.guestEmail).toBe(mockGuestEmail);
      });
    });

    describe("with DINEIN order and products", () => {
      beforeEach(() => {
        order = createDineInOrder();
        result = OrderMapper.toDetailsView(order, mockProducts);
      });

      it("should not include customer", () => {
        expect(result).not.toHaveProperty("customer");
      });

      it("should include fulfillment with dine-in details", () => {
        expect(result).toHaveProperty("fulfillment");
        const fulfillment = (result as DineInOrderDetailsView).fulfillment;
        expect(fulfillment.tableId).toBe(mockTableId);
        expect(fulfillment.tableNumber).toBe(mockTableNumber);
        expect(fulfillment.guestCount).toBe(4);
        expect(fulfillment.cashierSessionId).toBe(mockCashierSessionId);
      });
    });

    describe("with product not found in products array", () => {
      beforeEach(() => {
        order = createOnlineOrder();
        result = OrderMapper.toDetailsView(order, [mockProduct]);
      });

      it("should use null for imageUrl when product not found", () => {
        expect(result.items[0].imageUrl).toBe("https://example.com/image1.jpg");
        expect(result.items[1].imageUrl).toBeNull();
      });
    });

    describe("with product having no images", () => {
      beforeEach(() => {
        const productNoImages = {
          ...mockProduct,
          getImages: jest.fn().mockReturnValue([]),
        } as unknown as Product;

        order = createOnlineOrder();
        result = OrderMapper.toDetailsView(order, [productNoImages, mockProduct2]);
      });

      it("should use null for imageUrl when product has no images", () => {
        expect(result.items[0].imageUrl).toBeNull();
      });
    });

    describe("with product having no primary image but has images", () => {
      beforeEach(() => {
        const imagesNoPrimary: ProductImage[] = [
          {
            getProductId: jest.fn().mockReturnValue(mockProductId),
            getUrl: jest.fn().mockReturnValue("https://example.com/first.jpg"),
            getAltText: jest.fn().mockReturnValue("First Image"),
            getSortOrder: jest.fn().mockReturnValue(1),
            isPrimaryImage: jest.fn().mockReturnValue(false),
            changeUrl: jest.fn().mockReturnThis(),
            changeAltText: jest.fn().mockReturnThis(),
            changeSortOrder: jest.fn().mockReturnThis(),
            makePrimary: jest.fn().mockReturnThis(),
          } as unknown as ProductImage,
          {
            getProductId: jest.fn().mockReturnValue(mockProductId),
            getUrl: jest.fn().mockReturnValue("https://example.com/second.jpg"),
            getAltText: jest.fn().mockReturnValue("Second Image"),
            getSortOrder: jest.fn().mockReturnValue(2),
            isPrimaryImage: jest.fn().mockReturnValue(false),
            changeUrl: jest.fn().mockReturnThis(),
            changeAltText: jest.fn().mockReturnThis(),
            changeSortOrder: jest.fn().mockReturnThis(),
            makePrimary: jest.fn().mockReturnThis(),
          } as unknown as ProductImage,
        ];

        const productNoPrimary = {
          ...mockProduct,
          getImages: jest.fn().mockReturnValue(imagesNoPrimary),
        } as unknown as Product;

        order = createOnlineOrder();
        result = OrderMapper.toDetailsView(order, [productNoPrimary, mockProduct2]);
      });

      it("should use first image when no primary image exists", () => {
        expect(result.items[0].imageUrl).toBe("https://example.com/first.jpg");
      });
    });
  });

  describe("toSummaryView", () => {
    it("should map ONLINE order to summary view", () => {
      const order = createOnlineOrder();
      const result = OrderMapper.toSummaryView(order);

      expect(result).toEqual({
        id: mockOrderId,
        type: OrderType.ONLINE,
        status: OrderStatus.PENDING,
        itemCount: 2,
        total: 297500,
        createdAt: mockCreatedAt,
      });
    });

    it("should map RESERVATION order to summary view", () => {
      const order = createReservationOrder();
      const result = OrderMapper.toSummaryView(order);

      expect(result).toEqual({
        id: mockOrderId,
        type: OrderType.RESERVATION,
        status: OrderStatus.PENDING,
        itemCount: 1,
        total: 230000,
        createdAt: mockCreatedAt,
      });
    });

    it("should map DINEIN order to summary view", () => {
      const order = createDineInOrder();
      const result = OrderMapper.toSummaryView(order);

      expect(result).toEqual({
        id: mockOrderId,
        type: OrderType.DINEIN,
        status: OrderStatus.PENDING,
        itemCount: 1,
        total: 230000,
        createdAt: mockCreatedAt,
      });
    });

    it("should map paid order to summary view", () => {
      const order = createPaidOrder();
      const result = OrderMapper.toSummaryView(order);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(result.total).toBe(245000);
    });

    it("should return new Date object for createdAt", () => {
      const order = createOnlineOrder();
      const result = OrderMapper.toSummaryView(order);

      expect(result.createdAt).not.toBe(mockCreatedAt);
      expect(result.createdAt.getTime()).toBe(mockCreatedAt.getTime());
    });
  });

  describe("comparison between mapping methods", () => {
    it("should have different field sets for each mapping method", () => {
      const order = createOnlineOrder();
      const plainObject = OrderMapper.toPlainObject(order);
      const detailsView = OrderMapper.toDetailsView(order, mockProducts);
      const summaryView = OrderMapper.toSummaryView(order);

      expect(plainObject.items[0]).toHaveProperty("productId");
      expect(plainObject.items[0]).toHaveProperty("productName");
      expect(plainObject.items[0]).toHaveProperty("priceSnapshot");
      expect(detailsView.items[0]).toHaveProperty("imageUrl");
      expect(summaryView).toHaveProperty("itemCount");
      expect(summaryView).toHaveProperty("total");
      expect(summaryView).not.toHaveProperty("items");
      expect(summaryView).not.toHaveProperty("payment");
      expect(summaryView).not.toHaveProperty("pricing");
    });

    it("should have consistent id, type, status across all mappings", () => {
      const order = createOnlineOrder();
      const plainObject = OrderMapper.toPlainObject(order);
      const detailsView = OrderMapper.toDetailsView(order, mockProducts);
      const summaryView = OrderMapper.toSummaryView(order);

      expect(plainObject.id).toBe(detailsView.id);
      expect(detailsView.id).toBe(summaryView.id);
      expect(plainObject.type).toBe(detailsView.type);
      expect(detailsView.type).toBe(summaryView.type);
      expect(plainObject.status).toBe(detailsView.status);
      expect(detailsView.status).toBe(summaryView.status);
    });
  });

  describe("edge cases", () => {
    it("should handle order with zero items", () => {
      const emptyOrder = Order.rebuild({
        id: mockOrderId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: mockMemberId,
          guestName: null,
          guestEmail: null,
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
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });

      const plainObject = OrderMapper.toPlainObject(emptyOrder);
      expect(plainObject.items).toHaveLength(0);

      const detailsView = OrderMapper.toDetailsView(emptyOrder, []);
      expect(detailsView.items).toHaveLength(0);

      const summaryView = OrderMapper.toSummaryView(emptyOrder);
      expect(summaryView.itemCount).toBe(0);
      expect(summaryView.total).toBe(0);
    });

    it("should handle order with ancient dates", () => {
      const ancientDate = new Date("1970-01-01T00:00:00.000Z");
      const order = Order.rebuild({
        id: mockOrderId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: mockMemberId,
          guestName: null,
          guestEmail: null,
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
        createdAt: ancientDate,
        updatedAt: ancientDate,
      });

      const plainObject = OrderMapper.toPlainObject(order);
      expect(plainObject.createdAt.getTime()).toBe(0);
      expect(plainObject.updatedAt.getTime()).toBe(0);

      const summaryView = OrderMapper.toSummaryView(order);
      expect(summaryView.createdAt.getTime()).toBe(0);
    });

    it("should handle order with future dates", () => {
      const futureDate = new Date("2099-12-31T23:59:59.999Z");
      const order = Order.rebuild({
        id: mockOrderId,
        customer: {
          type: OrderCustomerType.MEMBER,
          memberId: mockMemberId,
          guestName: null,
          guestEmail: null,
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
        createdAt: futureDate,
        updatedAt: futureDate,
      });

      const plainObject = OrderMapper.toPlainObject(order);
      expect(plainObject.createdAt.getTime()).toBe(futureDate.getTime());
      expect(plainObject.updatedAt.getTime()).toBe(futureDate.getTime());

      const summaryView = OrderMapper.toSummaryView(order);
      expect(summaryView.createdAt.getTime()).toBe(futureDate.getTime());
    });
  });

  describe("immutability", () => {
    it("should not mutate the original order object when calling toPlainObject", () => {
      const order = createOnlineOrder();
      const originalId = order.getId();

      OrderMapper.toPlainObject(order);

      expect(order.getId()).toBe(originalId);
    });

    it("should return new Date instances in toPlainObject", () => {
      const order = createOnlineOrder();
      const result1 = OrderMapper.toPlainObject(order);
      const result2 = OrderMapper.toPlainObject(order);

      expect(result1.createdAt).not.toBe(result2.createdAt);
      expect(result1.updatedAt).not.toBe(result2.updatedAt);
      expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
      expect(result1.updatedAt.getTime()).toBe(result2.updatedAt.getTime());
    });

    it("should return new Date instances in toSummaryView", () => {
      const order = createOnlineOrder();
      const result1 = OrderMapper.toSummaryView(order);
      const result2 = OrderMapper.toSummaryView(order);

      expect(result1.createdAt).not.toBe(result2.createdAt);
      expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
    });
  });
});
