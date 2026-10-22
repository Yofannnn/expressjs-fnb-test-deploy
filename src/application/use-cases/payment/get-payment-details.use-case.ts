import {
  GetPaymentDetailsCommand,
  GetPaymentDetailsResult,
  GetPaymentDetailsUseCasePort,
} from "@/application/ports/driving/get-payment-details.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PaymentTransactionRepositoryPort } from "@/application/ports/driven/payment-transaction.repository.port";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { Order } from "@/domain/entities/order.entity";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { PaymentMapper } from "@/application/mappers/payment-transaction.mapper";
import { OrderAccessControlService } from "@/domain/services/order-access-control.service";
import { PaymentNotFoundException } from "@/application/exceptions/payment-transaction.exceptions";
import { OrderNotFoundException } from "@/application/exceptions/order.exceptions";
import { GuestOrderManagementToken } from "@/domain/entities/application-token.entity";
import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { GuestOrderAccessResolverService } from "@/domain/services/guest-order-access-resolver.service";
import { GuestOrderTokenNotFoundException } from "@/application/exceptions/application-token.exceptions";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";

export class GetPaymentDetailsUseCase implements GetPaymentDetailsUseCasePort {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepositoryPort,
    private readonly orderRepository: OrderRepositoryPort,
    private readonly applicationTokenRepository: ApplicationTokenRepositoryPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: GetPaymentDetailsCommand): Promise<GetPaymentDetailsResult> {
    const startTime = Date.now();

    this.logGetPaymentDetailsStart(command.orderId);

    const order = await this.findOrder(command.orderId);

    const guestOrderToken = command.guestToken ? await this.findGuestOrderManagementToken(command.guestToken) : undefined;
    const guestEmail = guestOrderToken ? GuestOrderAccessResolverService.resolveGuestEmail(guestOrderToken, order) : undefined;

    if (!OrderAccessControlService.canStaffAccessOrders(command.role)) {
      OrderAccessControlService.assertOwnership(order, command.memberId, guestEmail);
    }

    const paymentTransaction = await this.findPaymentTransaction(command.paymentId, command.orderId);

    this.logSuccessfulGetPaymentDetails(startTime, command.orderId);

    if (OrderAccessControlService.canStaffAccessOrders(command.role)) {
      return { scope: "staff", payment: PaymentMapper.toPlainObject(paymentTransaction) };
    }

    return { scope: "customer", payment: PaymentMapper.toDetailsView(paymentTransaction) };
  }

  private async findGuestOrderManagementToken(guestToken: string): Promise<GuestOrderManagementToken> {
    const tokenFingerprint = this.fingerprintProvider.fingerprint(guestToken);

    const token = await this.applicationTokenRepository.findByTokenFingerprint(tokenFingerprint);
    if (!token || !(token instanceof GuestOrderManagementToken)) throw new GuestOrderTokenNotFoundException();

    return token;
  }

  private async findPaymentTransaction(paymentTransactionId: string, orderId: string): Promise<PaymentTransaction> {
    const paymentTransaction = await this.paymentTransactionRepository.findById(paymentTransactionId);

    if (!paymentTransaction) throw new PaymentNotFoundException();
    if (paymentTransaction.getOrderId() !== orderId) throw new PaymentNotFoundException();

    return paymentTransaction;
  }

  private async findOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundException();
    return order;
  }

  private logGetPaymentDetailsStart(orderId: string): void {
    this.logger.debug({
      context: "GetPaymentDetailsUseCase",
      event: "GET_PAYMENT_STARTED",
      message: "Payment is being retrieved",
      data: { orderId },
    });
  }

  private logSuccessfulGetPaymentDetails(startTime: number, orderId: string): void {
    this.logger.info({
      context: "GetPaymentDetailsUseCase",
      event: "GET_PAYMENT_SUCCESSFUL",
      message: "Payment retrieved successfully",
      durationMs: Date.now() - startTime,
      data: { orderId },
    });
  }
}
