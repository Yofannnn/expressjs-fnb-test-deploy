import {
  GetPaymentsByOrderIdUseCasePort,
  GetPaymentsByOrderIdCommand,
  GetPaymentsByOrderIdResult,
} from "@/application/ports/driving/get-payments-by-order-id.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { PaymentTransactionRepositoryPort } from "@/application/ports/driven/payment-transaction.repository.port";
import { Order } from "@/domain/entities/order.entity";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { OrderAccessControlService } from "@/domain/services/order-access-control.service";
import { PaymentMapper } from "@/application/mappers/payment-transaction.mapper";
import { OrderNotFoundException } from "@/application/exceptions/order.exceptions";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { GuestOrderAccessResolverService } from "@/domain/services/guest-order-access-resolver.service";
import { GuestOrderManagementToken } from "@/domain/entities/application-token.entity";
import { GuestOrderTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";

export class GetPaymentsByOrderIdUseCase implements GetPaymentsByOrderIdUseCasePort {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepositoryPort,
    private readonly orderRepository: OrderRepositoryPort,
    private readonly applicationTokenRepository: ApplicationTokenRepositoryPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: GetPaymentsByOrderIdCommand): Promise<GetPaymentsByOrderIdResult> {
    const startTime = Date.now();

    this.logGetPaymentsStart(command.orderId);

    const order = await this.findOrder(command.orderId);

    const guestOrderToken = command.guestToken ? await this.findGuestOrderManagementToken(command.guestToken) : undefined;
    const guestEmail = guestOrderToken ? GuestOrderAccessResolverService.resolveGuestEmail(guestOrderToken, order) : undefined;

    if (!OrderAccessControlService.canStaffAccessOrders(command.role)) {
      OrderAccessControlService.assertOwnership(order, command.memberId, guestEmail);
    }

    const paymentTransactions = await this.findPaymentTransactions(command.orderId);

    this.logSuccessfulGetPayments(startTime, command.orderId);

    if (OrderAccessControlService.canStaffAccessOrders(command.role)) {
      return { scope: "staff", payments: paymentTransactions.map((paymentTransaction) => PaymentMapper.toPlainObject(paymentTransaction)) };
    }

    return { scope: "customer", payments: paymentTransactions.map((paymentTransaction) => PaymentMapper.toDetailsView(paymentTransaction)) };
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

  private async findPaymentTransactions(orderId: string): Promise<PaymentTransaction[]> {
    const paymentTransaction = await this.paymentTransactionRepository.findByOrderId(orderId);
    return paymentTransaction;
  }

  private logGetPaymentsStart(orderId: string): void {
    this.logger.debug({
      context: "GetPaymentsByOrderIdUseCase",
      event: "GET_PAYMENT_STARTED",
      message: "Payments is being retrieved",
      data: { orderId },
    });
  }

  private logSuccessfulGetPayments(startTime: number, orderId: string): void {
    this.logger.info({
      context: "GetPaymentsByOrderIdUseCase",
      event: "GET_PAYMENT_SUCCESSFUL",
      message: "Payments retrieved successfully",
      durationMs: Date.now() - startTime,
      data: { orderId },
    });
  }
}
