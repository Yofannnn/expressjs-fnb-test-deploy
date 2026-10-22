import { BaseDomainEvent } from "./base-domain.event";
import { DomainEventType } from "../types/domain-event.type";
import { PaymentMethod, PaymentTransactionType } from "../types/payment-transaction.type";

export class PaymentChargeInitiatedEvent extends BaseDomainEvent<{ orderId: string; amount: number; provider: string }> {
  constructor(aggregateId: string, orderId: string, amount: number, provider: string) {
    super(aggregateId, DomainEventType.PAYMENT_CHARGE_INITIATED, { orderId, amount, provider });
  }
}

export class PaymentRefundInitiatedEvent extends BaseDomainEvent<{ orderId: string; parentTransactionId: string; amount: number; reason: string }> {
  constructor(aggregateId: string, orderId: string, parentTransactionId: string, amount: number, reason: string) {
    super(aggregateId, DomainEventType.PAYMENT_REFUND_INITIATED, { orderId, parentTransactionId, amount, reason });
  }
}

export class PaymentTransactionSucceededEvent extends BaseDomainEvent<{
  orderId: string;
  type: PaymentTransactionType;
  amount: number;
  method?: PaymentMethod;
  providerReferenceId?: string;
}> {
  constructor(
    aggregateId: string,
    orderId: string,
    type: PaymentTransactionType,
    amount: number,
    method?: PaymentMethod,
    providerReferenceId?: string,
  ) {
    super(aggregateId, DomainEventType.PAYMENT_TRANSACTION_SUCCEEDED, { orderId, type, amount, method, providerReferenceId });
  }
}

export class PaymentTransactionFailedEvent extends BaseDomainEvent<{ orderId: string; type: PaymentTransactionType; reason: string }> {
  constructor(aggregateId: string, orderId: string, type: PaymentTransactionType, reason: string) {
    super(aggregateId, DomainEventType.PAYMENT_TRANSACTION_FAILED, { orderId, type, reason });
  }
}

export class PaymentTransactionExpiredEvent extends BaseDomainEvent<{ orderId: string; type: PaymentTransactionType }> {
  constructor(aggregateId: string, orderId: string, type: PaymentTransactionType) {
    super(aggregateId, DomainEventType.PAYMENT_TRANSACTION_EXPIRED, { orderId, type });
  }
}

export class PaymentTransactionCancelledEvent extends BaseDomainEvent<{ orderId: string; type: PaymentTransactionType }> {
  constructor(aggregateId: string, orderId: string, type: PaymentTransactionType) {
    super(aggregateId, DomainEventType.PAYMENT_TRANSACTION_CANCELLED, { orderId, type });
  }
}
