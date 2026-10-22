import { PaymentTransaction } from "../entities/payment-transaction.entity";

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  QRIS = "QRIS",
  E_WALLET = "E_WALLET",
  BANK_TRANSFER = "BANK_TRANSFER",
  OTHER = "OTHER",
}

export enum PaymentStatus {
  UNPAID = "UNPAID",
  PAID = "PAID",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  REFUNDED = "REFUNDED",
  FAILED = "FAILED",
}

export enum PaymentTransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export enum PaymentTransactionType {
  CHARGE = "CHARGE",
  REFUND = "REFUND",
}

export interface InitiateChargeCreationData {
  id: string;
  orderId: string;
  amount: number;
  method?: PaymentMethod;
  provider: string;
}

export interface InitiateRefundCreationData {
  id: string;
  parentTransaction: PaymentTransaction;
  previousRefunds: PaymentTransaction[];
  amount: number;
  reason: string;
}

export interface PaymentTransactionRebuildData {
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
