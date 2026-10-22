import { HandlePaymentUseCasePort, HandlePaymentCommand, HandlePaymentResult } from "@/application/ports/driving/handle-payment.use-case.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { ChargeResult, PaymentGatewayPort } from "@/application/ports/driven/payment-gateway.port";
import { PaymentTransactionRepositoryPort } from "@/application/ports/driven/payment-transaction.repository.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { Order } from "@/domain/entities/order.entity";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { PaymentMethod } from "@/domain/types/payment-transaction.type";
import { OrderNotFoundException } from "@/application/exceptions/order.exceptions";
import {
  ChargeNotSuccessfulException,
  MissingPaymentMethodException,
  PaymentNotFoundException,
} from "@/application/exceptions/payment-transaction.exceptions";

export class HandlePaymentUseCase implements HandlePaymentUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: HandlePaymentCommand): Promise<HandlePaymentResult> {
    const startTime = Date.now();

    this.logPaymentStart(command.paymentId);

    const chargeResult = await this.verifyChargeSucceeded(command.paymentId);
    const method = this.assertMethodPresent(chargeResult);

    const result = await this.uow.commit(async (repos) => {
      const paymentTransaction = await this.findPaymentTransaction(command.paymentId, repos.paymentTransactionRepository);
      const order = await this.findOrder(paymentTransaction.getOrderId(), repos.orderRepository);

      if (paymentTransaction.isSuccessful()) {
        return { paymentTransaction, order, events: [] };
      }

      paymentTransaction.markSuccess(method, command.providerReferenceId, chargeResult.rawResponse);

      /* NOTE: if a payment succeeds at the gateway but the order can no
       * longer be confirmed (e.g. cancelled while payment was in flight),
       * this throws and rolls back — leaving a captured payment with no
       * confirmed order. Worth a deliberate reconciliation/refund policy
       * rather than leaving it as an unhandled edge case.
       */
      order.pay(method, paymentTransaction.getId());
      order.confirm();

      await Promise.all([
        repos.paymentTransactionRepository.update(paymentTransaction),
        repos.orderRepository.update(order),
        repos.productRepository.deductStockForItems(order.getItems().map((item) => ({ id: item.getProductId(), quantity: item.getQuantity() }))),
      ]);

      return { paymentTransaction, order, events: [...paymentTransaction.pullDomainEvents(), ...order.pullDomainEvents()] };
    });

    this.logSuccessfulPayment(startTime, command.paymentId);
    await this.eventBus.publishAll(result.events);

    return {
      id: result.paymentTransaction.getId(),
      orderId: result.order.getId(),
    };
  }

  private async verifyChargeSucceeded(paymentTransactionId: string): Promise<ChargeResult> {
    const result = await this.paymentGateway.getStatus(paymentTransactionId);
    if (result.gatewayStatus !== "SUCCESS") {
      throw new ChargeNotSuccessfulException(result.gatewayStatus);
    }
    return result;
  }

  private assertMethodPresent(chargeResult: ChargeResult): PaymentMethod {
    if (!chargeResult.method) {
      throw new MissingPaymentMethodException();
    }
    return chargeResult.method;
  }

  private async findPaymentTransaction(
    paymentTransactionId: string,
    paymentTransactionRepository: PaymentTransactionRepositoryPort,
  ): Promise<PaymentTransaction> {
    const paymentTransaction = await paymentTransactionRepository.findById(paymentTransactionId);
    if (!paymentTransaction) throw new PaymentNotFoundException();
    return paymentTransaction;
  }

  private async findOrder(orderId: string, orderRepository: OrderRepositoryPort): Promise<Order> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundException();
    return order;
  }

  private logPaymentStart(paymentTransactionId: string): void {
    this.logger.debug({
      context: "HandlePaymentUseCase",
      event: "PAYMENT_STARTED",
      message: "Payment started",
      data: { paymentTransactionId },
    });
  }

  private logSuccessfulPayment(startTime: number, paymentTransactionId: string): void {
    this.logger.info({
      context: "HandlePaymentUseCase",
      event: "PAYMENT_SUCCESSFUL",
      message: "Payment completed successfully",
      durationMs: Date.now() - startTime,
      data: { paymentTransactionId },
    });
  }
}
