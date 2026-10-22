import {
  CreateOnlineOrderUseCasePort,
  CreateOnlineOrderCommand,
  CreateOnlineOrderResult,
} from "@/application/ports/driving/create-online-order.use-case.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { DistanceCalculatorPort } from "@/application/ports/driven/distance-calculator.port";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { Order } from "@/domain/entities/order.entity";
import { Product } from "@/domain/entities/product.entity";
import { DeliveryFeePolicy } from "@/domain/policies/delivery-fee.policy";
import { OrderConstraintPolicy } from "@/domain/policies/order-constraint.policy";
import { PricingPolicy } from "@/domain/policies/pricing.policy";
import { DeliveryFeeCalculatorService } from "@/domain/services/delivery-fee-calculator.service";
import { StoreLocation } from "@/domain/types/store-location.type";
import { DeliveryType } from "@/domain/types/order.type";
import { Coordinate } from "@/domain/value-objects/coordinate.vo";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { GuestOrderManagementToken } from "@/domain/entities/application-token.entity";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { OrderQuantityValidatorService } from "@/domain/services/order-quantity-validator.service";
import { OrderItemResolverService } from "@/domain/services/order-item-resolver.service";

export class CreateOnlineOrderUseCase implements CreateOnlineOrderUseCasePort {
  constructor(
    private readonly orderConstraintPolicy: OrderConstraintPolicy,
    private readonly deliveryFeePolicy: DeliveryFeePolicy,
    private readonly pricingPolicy: PricingPolicy,
    private readonly storeLocation: StoreLocation,
    private readonly uow: UnitOfWorkPort,
    private readonly applicationTokenFactory: ApplicationTokenFactory,
    private readonly idGenerator: IdGeneratorPort,
    private readonly distanceCalculator: DistanceCalculatorPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: CreateOnlineOrderCommand): Promise<CreateOnlineOrderResult> {
    const startTime = Date.now();
    this.logOrderStart(command.memberId, command.guestName);

    OrderQuantityValidatorService.assertMinimumQuantityMet(
      command.items.reduce((sum, item) => sum + item.quantity, 0),
      this.orderConstraintPolicy,
    );

    const deliveryFee = await this.calculateDeliveryFee(command);

    const result = await this.uow.commit(async (repos) => {
      const products = await repos.productRepository.findByIds(command.items.map((item) => item.productId));
      const order = this.createOrder(command, products, deliveryFee);
      const guestOrderManagementToken = this.buildGuestToken(order);

      await Promise.all([
        repos.orderRepository.insert(order),
        ...(guestOrderManagementToken ? [repos.applicationTokenRepository.insert(guestOrderManagementToken)] : []),
      ]);

      const events: DomainEvent[] = [...order.pullDomainEvents()];
      if (guestOrderManagementToken) events.push(...guestOrderManagementToken.pullDomainEvents());

      return { order, events };
    });

    this.logSuccessfulOrder(startTime, command.memberId, command.guestName);

    await this.eventBus.publishAll(result.events);

    return { id: result.order.getId() };
  }

  private async calculateDeliveryFee(command: CreateOnlineOrderCommand): Promise<number> {
    if (command.deliveryType === DeliveryType.PICKUP) return 0;

    if (!command.deliveryLatitude || !command.deliveryLongitude) return 0;

    const origin = Coordinate.create(this.storeLocation.coordinate);
    const destination = Coordinate.create({ latitude: command.deliveryLatitude, longitude: command.deliveryLongitude });
    const distanceKm = await this.distanceCalculator.calculateDistance(origin, destination);

    return DeliveryFeeCalculatorService.calculate(distanceKm, this.deliveryFeePolicy).getAmount();
  }

  private calculateDiscount(): number {
    return 0; // TODO: implement user loyalty
  }

  private createOrder(command: CreateOnlineOrderCommand, products: Product[], deliveryFee: number): Order {
    return Order.createOnlineOrder({
      id: this.idGenerator.generate(),
      customer: {
        memberId: command.memberId,
        guestName: command.guestName,
        guestEmail: command.guestEmail,
      },
      fulfillment: {
        deliveryType: command.deliveryType,
        deliveryAddress: command.deliveryAddress,
        deliveryLatitude: command.deliveryLatitude,
        deliveryLongitude: command.deliveryLongitude,
        scheduledAt: command.scheduledAt,
      },
      items: OrderItemResolverService.resolve(command.items, products),
      taxRatePercent: this.pricingPolicy.taxRatePercent,
      serviceChargeRatePercent: this.pricingPolicy.serviceChargeRatePercent,
      deliveryFee,
      discount: this.calculateDiscount(),
    });
  }

  private buildGuestToken(order: Order): GuestOrderManagementToken | undefined {
    if (!order.getCustomer().isGuest()) return undefined;
    return this.applicationTokenFactory.issueGuestOrderManagement(order);
  }

  private logOrderStart(userId?: string, guestName?: string): void {
    this.logger.debug({
      context: "CreateOnlineOrderUseCase",
      event: "ORDER_STARTED",
      message: "Order started",
      userId,
      data: { guestName },
    });
  }

  private logSuccessfulOrder(startTime: number, userId?: string, guestName?: string): void {
    this.logger.info({
      context: "CreateOnlineOrderUseCase",
      event: "ORDER_SUCCESSFUL",
      message: "Order created successfully",
      userId,
      durationMs: Date.now() - startTime,
      data: { guestName },
    });
  }
}
