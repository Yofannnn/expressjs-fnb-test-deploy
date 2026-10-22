import { PaymentMethod } from "@/domain/types/payment-transaction.type";
import { Money } from "@/domain/value-objects/money.vo";

export interface ChargeCommand {
  transactionId: string;
  amount: Money;
  method: PaymentMethod | null;
}

export interface RefundCommand {
  transactionId: string;
  amount: Money;
  reason: string;
}

export type GatewayStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface ChargeResult {
  providerReferenceId: string | null;
  method: PaymentMethod | null;
  gatewayStatus: GatewayStatus;
  redirectUrl: string | null;
  snapToken: string | null;
  paymentInstructions: Record<string, unknown> | null;
  rawResponse: Record<string, unknown>;
}

export interface RefundResult {
  refundKey: string;
  refundAmount: string;
  rawResponse: Record<string, unknown>;
}

export interface PaymentGatewayPort {
  readonly providerName: string;
  charge(command: ChargeCommand): Promise<ChargeResult>;
  refund(command: RefundCommand): Promise<RefundResult>;
  getStatus(paymentTransactionId: string): Promise<ChargeResult>;
  verifyWebhookSignature(payload: Record<string, unknown>, signature: string): boolean;
}
