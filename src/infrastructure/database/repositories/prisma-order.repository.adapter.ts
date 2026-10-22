import { Transactional, TransactionContext } from "@/infrastructure/database/database.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { BrowseOrdersQuery, OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { PrismaDatabaseClient } from "../prisma-database-client";
import { PrismaTransactionContext } from "../prisma-transaction-context";
import { PrismaRepository } from "./prisma.repository";
import { Order } from "@/domain/entities/order.entity";
import { OrderFulfillmentInfo } from "@/domain/value-objects/order-fulfillment-info.vo";
import { OrderPricing } from "@/domain/value-objects/order-pricing.vo";
import { OrderPaymentInfo } from "@/domain/value-objects/order-payment-info.vo";
import { OrderItem } from "@/domain/value-objects/order-item.vo";
import { PaymentMethod, PaymentStatus } from "@/domain/types/payment-transaction.type";
import {
  DeliveryType,
  OrderCustomerRebuildData,
  OrderCustomerType,
  OrderFulfillmentInfoRebuildData,
  OrderStatus,
  OrderType,
  ReservationStatus,
} from "@/domain/types/order.type";
import {
  Prisma,
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  OrderDeliveryLocation as PrismaOrderDeliveryLocation,
  PaymentTransaction as PrismaPaymentTransaction,
} from "../../../../prisma/generated";

export class PrismaOrderRepositoryAdapter
  extends PrismaRepository<PrismaOrderRepositoryAdapter>
  implements OrderRepositoryPort, Transactional<PrismaOrderRepositoryAdapter>
{
  protected repositoryName = "PrismaOrderRepositoryAdapter";

  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: PrismaDatabaseClient,
    protected readonly transactionContext?: PrismaTransactionContext,
  ) {
    super(logger, dbClient, transactionContext);
  }

  withTransaction(tx: TransactionContext): PrismaOrderRepositoryAdapter {
    return this.createTransactionalInstance(tx);
  }

  async insert(order: Order): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();

        const data: Prisma.OrderCreateInput = {
          id: order.getId(),
          type: order.getType(),
          status: order.getStatus(),

          memberId: order.getCustomer().getMemberId(),
          guestName: order.getCustomer().getGuestName(),
          guestEmail: order.getCustomer().getGuestEmail(),

          ...this.pricingData(order.getPricing()),
          ...this.paymentData(order.getPayment()),
          ...this.fulfillmentCreateData(order.getFulfillment()),

          createdAt: order.getCreatedAt(),
          updatedAt: order.getUpdatedAt(),

          items: {
            create: order.getItems().map((item) => this.itemCreateData(item)),
          },
        };

        await prisma.order.create({ data });
      },
      "insert",
      {},
    );
  }

  async update(order: Order): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const orderId = order.getId();
        const fulfillment = order.getFulfillment();

        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: order.getStatus(),
            ...this.pricingData(order.getPricing()),
            ...this.paymentData(order.getPayment()),
            ...this.fulfillmentUpdateData(fulfillment),
            updatedAt: order.getUpdatedAt(),
          },
        });

        if (fulfillment.isOnline() && fulfillment.asOnline().isDelivery()) {
          const location = fulfillment.asOnline().getDeliveryLocation();

          await prisma.orderDeliveryLocation.upsert({
            where: { orderId },
            create: {
              orderId,
              address: location!.getAddress(),
              latitude: location!.getCoordinate().getLatitude(),
              longitude: location!.getCoordinate().getLongitude(),
            },
            update: {
              address: location!.getAddress(),
              latitude: location!.getCoordinate().getLatitude(),
              longitude: location!.getCoordinate().getLongitude(),
            },
          });
        }

        await prisma.orderItem.deleteMany({ where: { orderId } });
        if (order.getItems().length > 0) {
          await prisma.orderItem.createMany({
            data: order.getItems().map((item) => ({ orderId, ...this.itemCreateData(item) })),
          });
        }
      },
      "update",
      { id: order.getId() },
    );
  }

  async findById(id: string): Promise<Order | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const order = await prisma.order.findUnique({
          where: { id },
          include: {
            onlineDeliveryLocation: true,
            items: true,
            transactions: {
              where: { status: "SUCCESS" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });

        return order ? this.toEntity(order) : null;
      },
      "findById",
      { id },
    );
  }

  async browse(query: BrowseOrdersQuery): Promise<Order[]> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const orders = await prisma.order.findMany({
          where: { type: query.type, status: query.status, memberId: query.memberId, guestEmail: query.guestEmail },
          include: {
            items: true,
            onlineDeliveryLocation: true,
            transactions: { where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { createdAt: "desc" },
        });
        return orders.map((order) => this.toEntity(order));
      },
      "browse",
      { query },
    );
  }

  private pricingData(pricing: OrderPricing) {
    return {
      subtotal: pricing.getSubtotal().getAmount(),
      tax: pricing.getTax().getAmount(),
      serviceCharge: pricing.getServiceCharge().getAmount(),
      deliveryFee: pricing.getDeliveryFee().getAmount(),
      discount: pricing.getDiscount().getAmount(),
      total: pricing.getTotal().getAmount(),
    };
  }

  private paymentData(payment: OrderPaymentInfo) {
    return {
      paymentMethod: payment.getMethod(),
      paymentStatus: payment.getStatus(),
      paidAt: payment.getPaidAt(),
    };
  }

  private itemCreateData(item: OrderItem) {
    return {
      productId: item.getProductId(),
      productName: item.getProductName(),
      priceSnapshot: item.getPriceSnapshot().getAmount(),
      quantity: item.getQuantity(),
      note: item.getNote(),
    };
  }

  private fulfillmentCreateData(fulfillment: OrderFulfillmentInfo): Partial<Prisma.OrderCreateInput> {
    if (fulfillment.isOnline()) {
      const online = fulfillment.asOnline();
      const data: Partial<Prisma.OrderCreateInput> = {
        onlineDeliveryType: online.getDeliveryType(),
        onlineScheduledAt: online.getScheduledAt(),
      };

      if (online.isDelivery()) {
        const location = online.getDeliveryLocation();
        data.onlineDeliveryLocation = {
          create: {
            address: location!.getAddress(),
            latitude: location!.getCoordinate().getLatitude(),
            longitude: location!.getCoordinate().getLongitude(),
          },
        };
      }

      return data;
    }

    if (fulfillment.isReservation()) {
      return this.reservationData(fulfillment);
    }

    if (fulfillment.isDineIn()) {
      const dineIn = fulfillment.asDineIn();
      return {
        dineInTableId: dineIn.getTableId(),
        dineInTableNumber: dineIn.getTableNumber(),
        dineInGuestCount: dineIn.getGuestCount(),
        dineInCashierSessionId: dineIn.getCashierSessionId(),
      };
    }

    return {};
  }

  private fulfillmentUpdateData(fulfillment: OrderFulfillmentInfo): Partial<Prisma.OrderUpdateInput> {
    if (fulfillment.isReservation()) {
      return this.reservationData(fulfillment);
    }
    return {};
  }

  private reservationData(fulfillment: OrderFulfillmentInfo) {
    const reservation = fulfillment.asReservation();
    return {
      reservationTableId: reservation.getTableId(),
      reservationReservedAt: reservation.getReservedAt(),
      reservationPartySize: reservation.getPartySize(),
      reservationDurationMinutes: reservation.getDurationInMinutes(),
      reservationStatus: reservation.getReservationStatus(),
      reservationNotes: reservation.getNotes(),
    };
  }

  private toEntity(
    data: PrismaOrder & {
      transactions: PrismaPaymentTransaction[];
      onlineDeliveryLocation: PrismaOrderDeliveryLocation | null;
      items: PrismaOrderItem[];
    },
  ): Order {
    return Order.rebuild({
      id: data.id,
      status: data.status as OrderStatus,
      type: data.type as OrderType,
      customer: this.customerRebuildData(data),
      fulfillment: this.fulfillmentRebuildData(data),
      items: data.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        priceSnapshot: item.priceSnapshot,
        quantity: item.quantity,
        note: item.note,
      })),
      payment: {
        method: data.paymentMethod as PaymentMethod,
        status: data.paymentStatus as PaymentStatus,
        paidAt: data.paidAt,
        transactionId: data.transactions.length > 0 ? data.transactions[0].id : null,
      },
      pricing: {
        subtotal: data.subtotal,
        tax: data.tax,
        serviceCharge: data.serviceCharge,
        deliveryFee: data.deliveryFee,
        discount: data.discount,
        total: data.total,
      },
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private customerRebuildData(data: PrismaOrder): OrderCustomerRebuildData {
    if (data.memberId) {
      return {
        type: OrderCustomerType.MEMBER,
        memberId: data.memberId,
        guestName: null,
        guestEmail: null,
      };
    }
    return {
      type: OrderCustomerType.GUEST,
      memberId: null,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
    };
  }

  private fulfillmentRebuildData(
    data: PrismaOrder & { onlineDeliveryLocation: PrismaOrderDeliveryLocation | null; items: PrismaOrderItem[] },
  ): OrderFulfillmentInfoRebuildData {
    if (data.type === "RESERVATION") {
      return {
        type: OrderType.RESERVATION,
        reservation: {
          tableId: data.reservationTableId!,
          reservedAt: data.reservationReservedAt!,
          reservationStatus: data.reservationStatus! as ReservationStatus,
          partySize: data.reservationPartySize!,
          durationInMinutes: data.reservationDurationMinutes!,
          notes: data.reservationNotes,
        },
        online: null,
        dineIn: null,
      };
    }

    if (data.type === "ONLINE") {
      return {
        type: OrderType.ONLINE,
        online: {
          deliveryType: data.onlineDeliveryType as DeliveryType,
          deliveryLocation: data.onlineDeliveryLocation && {
            address: data.onlineDeliveryLocation.address,
            latitude: data.onlineDeliveryLocation.latitude,
            longitude: data.onlineDeliveryLocation.longitude,
          },
          scheduledAt: data.onlineScheduledAt,
        },
        reservation: null,
        dineIn: null,
      };
    }

    if (data.type === "DINEIN") {
      return {
        type: OrderType.DINEIN,
        dineIn: {
          tableId: data.dineInTableId!,
          tableNumber: data.dineInTableNumber!,
          guestCount: data.dineInGuestCount!,
          cashierSessionId: data.dineInCashierSessionId!,
        },
        reservation: null,
        online: null,
      };
    }

    throw new Error("Invalid fulfillment type");
  }
}
