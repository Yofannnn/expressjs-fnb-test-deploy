import {
  GetOnlineOrderQuoteUseCasePort,
  GetOnlineOrderQuoteCommand,
  GetOnlineOrderQuoteResult,
} from "@/application/ports/driving/get-online-order-quote.use-case.port";
import { DistanceCalculatorPort } from "@/application/ports/driven/distance-calculator.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { DeliveryFeePolicy } from "@/domain/policies/delivery-fee.policy";
import { PricingPolicy } from "@/domain/policies/pricing.policy";
import { DeliveryFeeCalculatorService } from "@/domain/services/delivery-fee-calculator.service";
import { StoreLocation } from "@/domain/types/store-location.type";
import { Coordinate } from "@/domain/value-objects/coordinate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { OrderItem } from "@/domain/value-objects/order-item.vo";
import { OrderPricing } from "@/domain/value-objects/order-pricing.vo";
import { OrderMapper } from "@/application/mappers/order.mapper";
import { OrderItemResolverService } from "@/domain/services/order-item-resolver.service";

export class GetOnlineOrderQuoteUseCase implements GetOnlineOrderQuoteUseCasePort {
  constructor(
    private readonly pricingPolicy: PricingPolicy,
    private readonly deliveryFeePolicy: DeliveryFeePolicy,
    private readonly storeLocation: StoreLocation,
    private readonly productRepository: ProductRepositoryPort,
    private readonly distanceCalculator: DistanceCalculatorPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: GetOnlineOrderQuoteCommand): Promise<GetOnlineOrderQuoteResult> {
    const startTime = Date.now();

    this.logGetOrderQuoteStart();

    const products = await this.productRepository.findByIds(command.items.map((item) => item.productId));
    const deliveryFee = await this.calculateDeliveryFee(command);

    const quote = OrderPricing.calculate({
      items: OrderItemResolverService.resolve(command.items, products).map((item) => OrderItem.create(item)),
      serviceChargeRatePercent: this.pricingPolicy.serviceChargeRatePercent,
      taxRatePercent: this.pricingPolicy.taxRatePercent,
      deliveryFee,
      discount: Money.zero(), // TODO: implement user loyalty
    });

    this.logSuccessfulGetOrderQuote(startTime);

    return OrderMapper.toOrderPricingPlainObject(quote);
  }

  private async calculateDeliveryFee(command: GetOnlineOrderQuoteCommand): Promise<Money> {
    if (!command.deliveryCoordinate) return Money.zero();

    const origin = Coordinate.create(this.storeLocation.coordinate);
    const destination = Coordinate.create(command.deliveryCoordinate);
    const distanceKm = await this.distanceCalculator.calculateDistance(origin, destination);

    return DeliveryFeeCalculatorService.calculate(distanceKm, this.deliveryFeePolicy);
  }

  private logGetOrderQuoteStart(): void {
    this.logger.debug({
      context: "GetOnlineOrderQuoteUseCase",
      event: "GET_ORDER_QUOTE_STARTED",
      message: "Order quote is being calculated",
    });
  }

  private logSuccessfulGetOrderQuote(startTime: number): void {
    this.logger.info({
      context: "GetOnlineOrderQuoteUseCase",
      event: "GET_ORDER_QUOTE_SUCCESSFUL",
      message: "Order quote calculated successfully",
      durationMs: Date.now() - startTime,
    });
  }
}
