import {
  GetOrderDetailsUseCasePort,
  GetOrderDetailsCommand,
  GetOrderDetailsResult,
} from "@/application/ports/driving/get-order-details.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { GuestOrderAccessResolverService } from "@/domain/services/guest-order-access-resolver.service";
import { OrderMapper } from "@/application/mappers/order.mapper";
import { ProductRepositoryPort } from "@/application/ports/driven/product.repository.port";
import { OrderAccessControlService } from "@/domain/services/order-access-control.service";
import { OrderNotFoundException } from "@/application/exceptions/order.exceptions";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { GuestOrderManagementToken } from "@/domain/entities/application-token.entity";
import { GuestOrderTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";

export class GetOrderDetailsUseCase implements GetOrderDetailsUseCasePort {
  constructor(
    private readonly orderRepository: OrderRepositoryPort,
    private readonly productRepository: ProductRepositoryPort,
    private readonly applicationTokenRepository: ApplicationTokenRepositoryPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ id, memberId, guestToken }: GetOrderDetailsCommand): Promise<GetOrderDetailsResult> {
    const startTime = Date.now();

    this.logGetOrderStart(id);

    const order = await this.orderRepository.findById(id);
    if (!order) throw new OrderNotFoundException();

    const guestOrderToken = guestToken ? await this.findGuestOrderManagementToken(guestToken) : undefined;
    const guestEmail = guestOrderToken ? GuestOrderAccessResolverService.resolveGuestEmail(guestOrderToken, order) : undefined;

    OrderAccessControlService.assertOwnership(order, memberId, guestEmail);

    const productIds = order.getItems().map((item) => item.getProductId());
    const products = await this.productRepository.findByIds(productIds);

    this.logSuccessfulGetOrder(startTime, id);

    return OrderMapper.toDetailsView(order, products);
  }

  private async findGuestOrderManagementToken(guestToken: string): Promise<GuestOrderManagementToken> {
    const tokenFingerprint = this.fingerprintProvider.fingerprint(guestToken);

    const token = await this.applicationTokenRepository.findByTokenFingerprint(tokenFingerprint);
    if (!token || !(token instanceof GuestOrderManagementToken)) throw new GuestOrderTokenNotFoundException();

    return token;
  }

  private logGetOrderStart(orderId: string): void {
    this.logger.debug({
      context: "GetOrderDetailsUseCase",
      event: "GET_ORDER_STARTED",
      message: "Order is being retrieved",
      data: { orderId },
    });
  }

  private logSuccessfulGetOrder(startTime: number, orderId: string): void {
    this.logger.info({
      context: "GetOrderDetailsUseCase",
      event: "GET_ORDER_SUCCESSFUL",
      message: "Order retrieved successfully",
      durationMs: Date.now() - startTime,
      data: { orderId },
    });
  }
}
