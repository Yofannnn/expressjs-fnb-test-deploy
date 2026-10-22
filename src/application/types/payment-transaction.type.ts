import { PaymentMethod, PaymentTransactionStatus, PaymentTransactionType } from "@/domain/types/payment-transaction.type";

export interface PaymentTransactionPlainObject {
  id: string;
  orderId: string;
  type: PaymentTransactionType;
  amount: number;
  method: PaymentMethod | null;
  status: PaymentTransactionStatus;
  provider: string;
  providerReferenceId: string | null;
  parentTransactionId: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentDetailsView {
  id: string;
  orderId: string;
  type: PaymentTransactionType;
  amount: number;
  method: PaymentMethod | null;
  status: PaymentTransactionStatus;
  parentTransactionId: string | null;
  completedAt: Date | null;
  createdAt: Date;
}
