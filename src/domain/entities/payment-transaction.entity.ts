import { AggregateRoot } from "../common/aggregate-root";
import { Money } from "../value-objects/money.vo";
import {
  InitiateChargeCreationData,
  InitiateRefundCreationData,
  PaymentMethod,
  PaymentTransactionRebuildData,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from "../types/payment-transaction.type";
import {
  PaymentChargeInitiatedEvent,
  PaymentRefundInitiatedEvent,
  PaymentTransactionSucceededEvent,
  PaymentTransactionFailedEvent,
  PaymentTransactionExpiredEvent,
  PaymentTransactionCancelledEvent,
} from "../events/payment-transaction.events";
import {
  InvalidPaymentTransactionTransitionException,
  InvalidRefundSourceException,
  RefundOnUnsuccessfulChargeException,
  ZeroRefundException,
  RefundAmountExceedsPreviousRefundsException,
} from "../exceptions/payment-transaction.exceptions";

const TRANSACTION_STATUS_TRANSITIONS: Record<PaymentTransactionStatus, PaymentTransactionStatus[]> = {
  [PaymentTransactionStatus.PENDING]: [
    PaymentTransactionStatus.SUCCESS,
    PaymentTransactionStatus.FAILED,
    PaymentTransactionStatus.EXPIRED,
    PaymentTransactionStatus.CANCELLED,
  ],
  [PaymentTransactionStatus.SUCCESS]: [],
  [PaymentTransactionStatus.FAILED]: [],
  [PaymentTransactionStatus.EXPIRED]: [],
  [PaymentTransactionStatus.CANCELLED]: [],
};

export class PaymentTransaction extends AggregateRoot {
  private constructor(
    private readonly id: string,
    private readonly orderId: string,
    private readonly type: PaymentTransactionType,
    private readonly amount: Money,
    private method: PaymentMethod | null,
    private status: PaymentTransactionStatus,
    private readonly provider: string,
    private providerReferenceId: string | null,
    private readonly parentTransactionId: string | null,
    private failureReason: string | null,
    private metadata: Record<string, unknown> | null,
    private completedAt: Date | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  getId(): string {
    return this.id;
  }

  getOrderId(): string {
    return this.orderId;
  }

  getType(): PaymentTransactionType {
    return this.type;
  }

  getAmount(): Money {
    return this.amount;
  }

  getMethod(): PaymentMethod | null {
    return this.method;
  }

  getStatus(): PaymentTransactionStatus {
    return this.status;
  }

  getProvider(): string {
    return this.provider;
  }

  getProviderReferenceId(): string | null {
    return this.providerReferenceId;
  }

  getParentTransactionId(): string | null {
    return this.parentTransactionId;
  }

  getFailureReason(): string | null {
    return this.failureReason;
  }

  getMetadata(): Record<string, unknown> | null {
    return this.metadata;
  }

  getCompletedAt(): Date | null {
    return this.completedAt ? new Date(this.completedAt) : null;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  isSuccessful(): boolean {
    return this.status === PaymentTransactionStatus.SUCCESS;
  }

  markSuccess(method?: PaymentMethod, providerReferenceId?: string, metadata?: Record<string, unknown>): void {
    this.transitionTo(PaymentTransactionStatus.SUCCESS);
    this.method = method ?? this.method;
    this.providerReferenceId = providerReferenceId ?? this.providerReferenceId;
    this.metadata = metadata ?? this.metadata;
    this.completedAt = new Date();
    this.touch();
    this.emit(
      new PaymentTransactionSucceededEvent(this.id, this.orderId, this.type, this.amount.getAmount(), this.method ?? undefined, providerReferenceId),
    );
  }

  markFailed(reason: string, metadata?: Record<string, unknown>): void {
    this.transitionTo(PaymentTransactionStatus.FAILED);
    this.failureReason = reason;
    this.metadata = metadata ?? this.metadata;
    this.completedAt = new Date();
    this.touch();
    this.emit(new PaymentTransactionFailedEvent(this.id, this.orderId, this.type, reason));
  }

  markExpired(): void {
    this.transitionTo(PaymentTransactionStatus.EXPIRED);
    this.completedAt = new Date();
    this.touch();
    this.emit(new PaymentTransactionExpiredEvent(this.id, this.orderId, this.type));
  }

  cancel(): void {
    this.transitionTo(PaymentTransactionStatus.CANCELLED);
    this.completedAt = new Date();
    this.touch();
    this.emit(new PaymentTransactionCancelledEvent(this.id, this.orderId, this.type));
  }

  private canTransitionStatus(from: PaymentTransactionStatus, to: PaymentTransactionStatus): boolean {
    return TRANSACTION_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  private transitionTo(next: PaymentTransactionStatus): void {
    if (!this.canTransitionStatus(this.status, next)) {
      throw new InvalidPaymentTransactionTransitionException(this.status, next);
    }
    this.status = next;
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  static initiateCharge(data: InitiateChargeCreationData): PaymentTransaction {
    const now = new Date();
    const transaction = new PaymentTransaction(
      data.id,
      data.orderId,
      PaymentTransactionType.CHARGE,
      new Money(data.amount),
      data.method ?? null,
      PaymentTransactionStatus.PENDING,
      data.provider,
      null,
      null,
      null,
      null,
      null,
      now,
      now,
    );
    transaction.emit(new PaymentChargeInitiatedEvent(data.id, data.orderId, data.amount, data.provider));
    return transaction;
  }

  static initiateRefund(data: InitiateRefundCreationData): PaymentTransaction {
    const parent = data.parentTransaction;
    const refundAmount = new Money(data.amount);

    if (refundAmount.isZero()) {
      throw new ZeroRefundException();
    }
    if (parent.getType() !== PaymentTransactionType.CHARGE) {
      throw new InvalidRefundSourceException(parent.getType());
    }
    if (parent.getStatus() !== PaymentTransactionStatus.SUCCESS) {
      throw new RefundOnUnsuccessfulChargeException(parent.getStatus());
    }

    const previousRefundsAmount = data.previousRefunds
      .filter((refund) => refund.getStatus() === PaymentTransactionStatus.SUCCESS)
      .map((refund) => refund.getAmount())
      .reduce((acc, amount) => acc.add(amount), Money.zero());

    const remainingRefundable = parent.getAmount().subtract(previousRefundsAmount);

    if (refundAmount.isGreaterThan(remainingRefundable)) {
      throw new RefundAmountExceedsPreviousRefundsException(data.amount, previousRefundsAmount.getAmount(), remainingRefundable.getAmount());
    }

    const now = new Date();
    const transaction = new PaymentTransaction(
      data.id,
      parent.getOrderId(),
      PaymentTransactionType.REFUND,
      refundAmount,
      parent.getMethod(),
      PaymentTransactionStatus.PENDING,
      parent.getProvider(),
      null,
      parent.getId(),
      null,
      { reason: data.reason },
      null,
      now,
      now,
    );
    transaction.emit(new PaymentRefundInitiatedEvent(data.id, parent.getOrderId(), parent.getId(), data.amount, data.reason));
    return transaction;
  }

  static rebuild(data: PaymentTransactionRebuildData): PaymentTransaction {
    return new PaymentTransaction(
      data.id,
      data.orderId,
      data.type,
      new Money(data.amount),
      data.method,
      data.status,
      data.provider,
      data.providerReferenceId,
      data.parentTransactionId,
      data.failureReason,
      data.metadata,
      data.completedAt,
      data.createdAt,
      data.updatedAt,
    );
  }
}
