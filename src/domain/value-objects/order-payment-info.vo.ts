import { OrderPaymentInfoRebuildData } from "../types/order.type";
import { PaymentMethod, PaymentStatus } from "../types/payment-transaction.type";
import { InvalidOrderPaymentStateTransitionException } from "../exceptions/order.exceptions";

export class OrderPaymentInfo {
  private constructor(
    private readonly status: PaymentStatus,
    private readonly method: PaymentMethod | null,
    private readonly paidAt: Date | null,
    private readonly transactionId: string | null,
  ) {}

  getStatus(): PaymentStatus {
    return this.status;
  }

  getMethod(): PaymentMethod | null {
    return this.method;
  }

  getPaidAt(): Date | null {
    return this.paidAt ? new Date(this.paidAt) : null;
  }

  getTransactionId(): string | null {
    return this.transactionId;
  }

  isPaid(): boolean {
    return this.status === PaymentStatus.PAID;
  }

  markAsPaid(method: PaymentMethod, transactionId: string, paidAt: Date = new Date()): OrderPaymentInfo {
    this.ensureStatus(PaymentStatus.UNPAID, PaymentStatus.PAID);
    return new OrderPaymentInfo(PaymentStatus.PAID, method, paidAt, transactionId);
  }

  markAsFailed(): OrderPaymentInfo {
    this.ensureStatus(PaymentStatus.PAID, PaymentStatus.FAILED);
    return new OrderPaymentInfo(PaymentStatus.FAILED, this.method, this.paidAt, this.transactionId);
  }

  markAsRefunded(): OrderPaymentInfo {
    this.ensureStatus(PaymentStatus.PAID, PaymentStatus.REFUNDED);
    return new OrderPaymentInfo(PaymentStatus.REFUNDED, this.method, this.paidAt, this.transactionId);
  }

  private ensureStatus(expected: PaymentStatus, next: PaymentStatus): void {
    if (this.status !== expected) {
      throw new InvalidOrderPaymentStateTransitionException(this.status, next);
    }
  }

  static unpaid(): OrderPaymentInfo {
    return new OrderPaymentInfo(PaymentStatus.UNPAID, null, null, null);
  }

  static rebuild(data: OrderPaymentInfoRebuildData): OrderPaymentInfo {
    return new OrderPaymentInfo(data.status, data.method, data.paidAt, data.transactionId);
  }
}
