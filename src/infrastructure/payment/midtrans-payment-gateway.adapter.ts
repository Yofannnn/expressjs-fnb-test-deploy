import { createHash } from "crypto";
import { ChargeCommand, ChargeResult, PaymentGatewayPort, RefundCommand, RefundResult } from "@/application/ports/driven/payment-gateway.port";
import { PaymentMethod } from "@/domain/types/payment-transaction.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { MidtransConfig } from "../configs/midtrans.config";
import { ExternalServiceUnavailableException } from "../exceptions/infrastructure.exceptions";

interface MidtransSnapChargeResponse {
  token: string;
  redirect_url: string;
}

interface MidtransSnapRefundResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: "pending" | "settlement" | "capture" | "deny" | "cancel" | "expire" | "failure";
  gross_amount: string;
  refund_chargeback_id: string;
  refund_amount: string;
  refund_key: string;
  payer_phone_number: string;
  merchant_invoice: string;
}

interface MidtransStatusResponse {
  transaction_id: string;
  order_id: string;
  transaction_status: "pending" | "settlement" | "capture" | "deny" | "cancel" | "expire" | "failure";
  fraud_status?: "accept" | "deny" | "challenge";
  payment_type: string;
  gross_amount: string;
  status_code: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  actions?: Array<{ name: string; method: string; url: string }>;
  expiry_time?: string;
  [key: string]: unknown;
}

export class MidtransPaymentGatewayAdapter implements PaymentGatewayPort {
  public readonly providerName = "MIDTRANS";

  constructor(
    private readonly config: MidtransConfig,
    private readonly logger: LoggerPort,
  ) {}

  async charge(command: ChargeCommand): Promise<ChargeResult> {
    const payload = {
      transaction_details: {
        order_id: command.transactionId,
        gross_amount: command.amount.getAmount(),
      },
      credit_card: { secure: true },
    };

    const response = await fetch(this.config.snapBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.buildAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      this.logger.error({
        context: "MidtransPaymentGatewayAdapter",
        event: "CHARGE_FAILED",
        message: "Midtrans charge failed",
        data: { errorBody },
      });
      throw new ExternalServiceUnavailableException("Payment service");
    }

    const body = (await response.json()) as MidtransSnapChargeResponse;

    return {
      providerReferenceId: null,
      gatewayStatus: "PENDING",
      redirectUrl: body.redirect_url,
      method: null,
      snapToken: body.token,
      paymentInstructions: null,
      rawResponse: body as unknown as Record<string, unknown>,
    };
  }

  async refund(command: RefundCommand): Promise<RefundResult> {
    const url = `${this.config.coreApiBaseUrl}/${command.transactionId}/refund`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.buildAuthHeader(),
      },
      body: JSON.stringify({
        amount: command.amount.getAmount(),
        reason: command.reason,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      this.logger.error({
        context: "MidtransPaymentGatewayAdapter",
        event: "REFUND_FAILED",
        message: "Midtrans refund failed",
        data: { errorBody },
      });
      throw new ExternalServiceUnavailableException("Payment service");
    }

    const body = (await response.json()) as MidtransSnapRefundResponse;

    return {
      refundKey: body.refund_key,
      refundAmount: body.refund_amount,
      rawResponse: body as unknown as Record<string, unknown>,
    };
  }

  async getStatus(paymentTransactionId: string): Promise<ChargeResult> {
    const url = `${this.config.coreApiBaseUrl}/${paymentTransactionId}/status`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.buildAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorBody = await response.json();
      this.logger.error({
        context: "MidtransPaymentGatewayAdapter",
        event: "STATUS_CHECK_FAILED",
        message: "Midtrans status check failed",
        data: { errorBody },
      });
      throw new ExternalServiceUnavailableException("Payment service");
    }

    const body = (await response.json()) as MidtransStatusResponse;
    return this.mapStatusResponseToChargeResult(body);
  }

  verifyWebhookSignature(payload: Record<string, unknown>, signature: string): boolean {
    const orderId = payload.order_id as string;
    const statusCode = payload.status_code as string;
    const grossAmount = payload.gross_amount as string;

    if (!orderId || !statusCode || !grossAmount) {
      return false;
    }

    const expectedSignature = createHash("sha512")
      .update(orderId + statusCode + grossAmount + this.config.serverKey)
      .digest("hex");

    return expectedSignature === signature;
  }

  private buildAuthHeader(): string {
    return "Basic " + Buffer.from(this.config.serverKey + ":").toString("base64");
  }

  private extractPaymentInstructions(body: MidtransStatusResponse): Record<string, unknown> | null {
    if (body.va_numbers?.length) {
      return { type: "VIRTUAL_ACCOUNT", vaNumbers: body.va_numbers, expiryTime: body.expiry_time };
    }
    if (body.actions?.length) {
      return { type: "ACTIONS", actions: body.actions, expiryTime: body.expiry_time };
    }
    return null;
  }

  private mapStatusResponseToChargeResult(body: MidtransStatusResponse): ChargeResult {
    return {
      providerReferenceId: body.transaction_id,
      gatewayStatus: this.mapTransactionStatus(body.transaction_status, body.fraud_status),
      method: this.mapPaymentType(body.payment_type),
      redirectUrl: null,
      snapToken: null,
      paymentInstructions: this.extractPaymentInstructions(body),
      rawResponse: body as unknown as Record<string, unknown>,
    };
  }

  private mapTransactionStatus(status: MidtransStatusResponse["transaction_status"], fraudStatus?: string): ChargeResult["gatewayStatus"] {
    switch (status) {
      case "settlement":
        return "SUCCESS";
      case "capture":
        return fraudStatus === "accept" ? "SUCCESS" : "PENDING";
      case "pending":
        return "PENDING";
      case "deny":
      case "cancel":
      case "expire":
      case "failure":
        return "FAILED";
      default:
        this.logger.error({
          context: "MidtransPaymentGatewayAdapter",
          event: "CHARGE_FAILED",
          message: "Unmapped Midtrans transaction_status",
          data: { status },
        });
        throw new ExternalServiceUnavailableException("Payment service");
    }
  }

  private mapPaymentType(midtransPaymentType: string): PaymentMethod {
    const mapping: Record<string, PaymentMethod> = {
      gopay: PaymentMethod.E_WALLET,
      shopeepay: PaymentMethod.E_WALLET,
      dana: PaymentMethod.E_WALLET,
      ovo: PaymentMethod.E_WALLET,
      linkaja: PaymentMethod.E_WALLET,
      qris: PaymentMethod.QRIS,
      bank_transfer: PaymentMethod.BANK_TRANSFER,
      echannel: PaymentMethod.BANK_TRANSFER,
      permata_va: PaymentMethod.BANK_TRANSFER,
      bca_va: PaymentMethod.BANK_TRANSFER,
      bni_va: PaymentMethod.BANK_TRANSFER,
      credit_card: PaymentMethod.CARD,
      cstore: PaymentMethod.CASH,
      akulaku: PaymentMethod.OTHER,
      kredivo: PaymentMethod.OTHER,
    };

    const mapped = mapping[midtransPaymentType];

    if (!mapped) {
      this.logger.error({
        context: "MidtransPaymentGatewayAdapter",
        event: "UNMAPPED_PAYMENT_TYPE",
        message: "Unmapped Midtrans payment type — falling back to OTHER",
        data: { midtransPaymentType },
      });
      return PaymentMethod.OTHER;
    }

    return mapped;
  }
}
