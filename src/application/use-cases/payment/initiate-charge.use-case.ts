import { InitiateChargeUseCasePort, InitiateChargeCommand, InitiateChargeResult } from "@/application/ports/driving/initiate-charge.use-case.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { ChargeResult, PaymentGatewayPort } from "@/application/ports/driven/payment-gateway.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { Order } from "@/domain/entities/order.entity";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { PaymentMethod } from "@/domain/types/payment-transaction.type";
import { OrderAccessControlService } from "@/domain/services/order-access-control.service";
import { OrderNotFoundException } from "@/application/exceptions/order.exceptions";
import { GuestOrderManagementToken } from "@/domain/entities/application-token.entity";
import { GuestOrderAccessResolverService } from "@/domain/services/guest-order-access-resolver.service";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { GuestOrderTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";

export class InitiateChargeUseCase implements InitiateChargeUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly orderRepository: OrderRepositoryPort,
    private readonly applicationTokenRepository: ApplicationTokenRepositoryPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: InitiateChargeCommand): Promise<InitiateChargeResult> {
    const startTime = Date.now();

    this.logInitiateChargeStart(command.orderId);

    const order = await this.findOrder(command.orderId);

    const guestOrderToken = command.guestToken ? await this.findGuestOrderManagementToken(command.guestToken) : undefined;
    const guestEmail = guestOrderToken ? GuestOrderAccessResolverService.resolveGuestEmail(guestOrderToken, order) : undefined;

    OrderAccessControlService.assertOwnership(order, command.memberId, guestEmail);
    order.assertNotPaid();

    const paymentTransaction = this.buildChargeTransaction(order, command.method);
    const chargeResult = await this.initPaymentGatewayCharge(paymentTransaction);

    const result = await this.uow.commit(async (repos) => {
      await repos.paymentTransactionRepository.insert(paymentTransaction);
      return { paymentTransaction, events: paymentTransaction.pullDomainEvents() };
    });

    this.logSuccessfulInitiateCharge(startTime, command.orderId);
    await this.eventBus.publishAll(result.events);

    return {
      id: result.paymentTransaction.getId(),
      redirectUrl: chargeResult.redirectUrl,
      snapToken: chargeResult.snapToken,
    };
  }

  private async findGuestOrderManagementToken(guestToken: string): Promise<GuestOrderManagementToken> {
    const tokenFingerprint = this.fingerprintProvider.fingerprint(guestToken);

    const token = await this.applicationTokenRepository.findByTokenFingerprint(tokenFingerprint);
    if (!token || !(token instanceof GuestOrderManagementToken)) throw new GuestOrderTokenNotFoundException();

    return token;
  }

  private async findOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundException();
    return order;
  }

  private buildChargeTransaction(order: Order, method?: PaymentMethod): PaymentTransaction {
    return PaymentTransaction.initiateCharge({
      id: this.idGenerator.generate(),
      orderId: order.getId(),
      amount: order.getPricing().getTotal().getAmount(),
      provider: this.paymentGateway.providerName,
      method,
    });
  }

  private async initPaymentGatewayCharge(paymentTransaction: PaymentTransaction): Promise<ChargeResult> {
    return await this.paymentGateway.charge({
      transactionId: paymentTransaction.getId(),
      amount: paymentTransaction.getAmount(),
      method: paymentTransaction.getMethod(),
    });
  }

  private logInitiateChargeStart(orderId: string): void {
    this.logger.debug({
      context: "InitiateChargeUseCase",
      event: "INITIATE_CHARGE_STARTED",
      message: "Initiate charge started",
      data: { orderId },
    });
  }

  private logSuccessfulInitiateCharge(startTime: number, orderId: string): void {
    this.logger.info({
      context: "InitiateChargeUseCase",
      event: "INITIATE_CHARGE_SUCCESSFUL",
      message: "Charge initiated successfully",
      durationMs: Date.now() - startTime,
      data: { orderId },
    });
  }
}
