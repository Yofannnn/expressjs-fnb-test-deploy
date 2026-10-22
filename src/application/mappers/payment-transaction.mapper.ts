import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { PaymentDetailsView, PaymentTransactionPlainObject } from "../types/payment-transaction.type";

export class PaymentMapper {
  static toPlainObject(payment: PaymentTransaction): PaymentTransactionPlainObject {
    return {
      id: payment.getId(),
      orderId: payment.getOrderId(),
      amount: payment.getAmount().getAmount(),
      method: payment.getMethod(),
      status: payment.getStatus(),
      completedAt: payment.getCompletedAt(),
      type: payment.getType(),
      parentTransactionId: payment.getParentTransactionId(),
      failureReason: payment.getFailureReason(),
      provider: payment.getProvider(),
      providerReferenceId: payment.getProviderReferenceId(),
      metadata: payment.getMetadata(),
      createdAt: payment.getCreatedAt(),
      updatedAt: payment.getUpdatedAt(),
    };
  }

  static toDetailsView(payment: PaymentTransaction): PaymentDetailsView {
    return {
      id: payment.getId(),
      orderId: payment.getOrderId(),
      status: payment.getStatus(),
      amount: payment.getAmount().getAmount(),
      method: payment.getMethod(),
      completedAt: payment.getCompletedAt(),
      type: payment.getType(),
      parentTransactionId: payment.getParentTransactionId(),
      createdAt: payment.getCreatedAt(),
    };
  }
}
