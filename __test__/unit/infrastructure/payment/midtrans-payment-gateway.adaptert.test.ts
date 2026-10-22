import { MidtransPaymentGatewayAdapter } from "@/infrastructure/payment/midtrans-payment-gateway.adapter";
import { ChargeCommand, RefundCommand } from "@/application/ports/driven/payment-gateway.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { MidtransConfig } from "@/infrastructure/config/midtrans.config";
import { Money } from "@/domain/value-objects/money.vo";
import { createHash } from "crypto";
import { PaymentMethod } from "@/domain/types/payment-transaction.type";

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

global.fetch = jest.fn();

jest.mock("crypto", () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mocked-signature"),
  }),
}));

describe("MidtransPaymentGatewayAdapter", () => {
  let adapter: MidtransPaymentGatewayAdapter;
  let mockConfig: jest.Mocked<MidtransConfig>;
  let mockLogger: jest.Mocked<LoggerPort>;
  let mockFetch: jest.Mock;

  const mockServerKey = "SB-Mid-server-1234567890";
  const mockSnapBaseUrl = "https://app.sandbox.midtrans.com/snap/v1";
  const mockCoreApiBaseUrl = "https://api.sandbox.midtrans.com/v2";
  const mockTransactionId = "txn-123";
  const mockAmount = 230000;
  const mockReason = "Customer requested refund";

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.Mock;

    mockConfig = {
      serverKey: mockServerKey,
      isProduction: false,
      snapBaseUrl: mockSnapBaseUrl,
      coreApiBaseUrl: mockCoreApiBaseUrl,
    } as jest.Mocked<MidtransConfig>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<LoggerPort>;

    adapter = new MidtransPaymentGatewayAdapter(mockConfig, mockLogger);
  });

  describe("providerName", () => {
    it("should return MIDTRANS as provider name", () => {
      expect(adapter.providerName).toBe("MIDTRANS");
    });
  });

  describe("charge", () => {
    const chargeCommand: ChargeCommand = {
      transactionId: mockTransactionId,
      amount: new Money(mockAmount),
      method: PaymentMethod.CARD,
    };

    const mockSnapResponse = {
      token: "snap-token-123",
      redirect_url: "https://app.sandbox.midtrans.com/snap/v1/redirect",
    };

    it("should charge successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSnapResponse),
      });

      const result = await adapter.charge(chargeCommand);

      expect(result).toEqual({
        providerReferenceId: null,
        gatewayStatus: "PENDING",
        redirectUrl: mockSnapResponse.redirect_url,
        method: null,
        snapToken: mockSnapResponse.token,
        paymentInstructions: null,
        rawResponse: mockSnapResponse,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        mockSnapBaseUrl,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Basic"),
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: mockTransactionId,
              gross_amount: mockAmount,
            },
            credit_card: { secure: true },
          }),
        }),
      );
    });

    it("should handle charge with different amounts", async () => {
      const differentAmount = 50000;
      const command = {
        ...chargeCommand,
        amount: new Money(differentAmount),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSnapResponse),
      });

      await adapter.charge(command);

      expect(mockFetch).toHaveBeenCalledWith(
        mockSnapBaseUrl,
        expect.objectContaining({
          body: JSON.stringify({
            transaction_details: {
              order_id: mockTransactionId,
              gross_amount: differentAmount,
            },
            credit_card: { secure: true },
          }),
        }),
      );
    });

    it("should handle charge with null method", async () => {
      const command = {
        ...chargeCommand,
        method: null,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSnapResponse),
      });

      await adapter.charge(command);

      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        mockSnapBaseUrl,
        expect.objectContaining({
          body: JSON.stringify({
            transaction_details: {
              order_id: mockTransactionId,
              gross_amount: mockAmount,
            },
            credit_card: { secure: true },
          }),
        }),
      );
    });

    it("should handle charge with different payment methods", async () => {
      const methods = [PaymentMethod.CARD, PaymentMethod.QRIS, PaymentMethod.E_WALLET];

      for (const method of methods) {
        const command = {
          ...chargeCommand,
          method,
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSnapResponse),
        });

        await adapter.charge(command);

        const callArgs = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const body = JSON.parse(callArgs[1].body);
        expect(body.transaction_details.order_id).toBe(mockTransactionId);
        expect(body.transaction_details.gross_amount).toBe(mockAmount);
      }
    });

    it("should throw INTERNAL_SERVER_ERROR when fetch fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: "Something went wrong" }),
      });

      await expect(adapter.charge(chargeCommand)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log error when charge fails", async () => {
      const errorBody = { error: "Payment gateway error" };
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue(errorBody),
      });

      try {
        await adapter.charge(chargeCommand);
      } catch {
        // Expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "MidtransPaymentGatewayAdapter",
          event: "CHARGE_FAILED",
          data: { errorBody },
        }),
      );
    });

    it("should throw SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR on fetch failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(adapter.charge(chargeCommand)).rejects.toMatchObject({
        name: "ExternalServiceUnavailableException",
      });
    });

    it("should handle fetch network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(adapter.charge(chargeCommand)).rejects.toThrow("Network error");
    });

    it("should build correct auth header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSnapResponse),
      });

      await adapter.charge(chargeCommand);

      const callArgs = mockFetch.mock.calls[0];
      const authHeader = callArgs[1].headers.Authorization;
      expect(authHeader).toBe("Basic " + Buffer.from(mockServerKey + ":").toString("base64"));
    });
  });

  describe("refund", () => {
    const refundCommand: RefundCommand = {
      transactionId: mockTransactionId,
      amount: new Money(mockAmount),
      reason: mockReason,
    };

    const mockRefundResponse = {
      status_code: "200",
      status_message: "Success",
      transaction_id: mockTransactionId,
      order_id: "order-123",
      payment_type: "credit_card",
      transaction_time: "2024-01-15 10:30:00",
      transaction_status: "settlement" as const,
      gross_amount: mockAmount.toString(),
      refund_chargeback_id: "refund-123",
      refund_amount: mockAmount.toString(),
      refund_key: "refund-key-123",
      payer_phone_number: "08123456789",
      merchant_invoice: "INV-123",
    };

    it("should refund successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockRefundResponse),
      });

      const result = await adapter.refund(refundCommand);

      expect(result).toEqual({
        refundKey: mockRefundResponse.refund_key,
        refundAmount: mockRefundResponse.refund_amount,
        rawResponse: mockRefundResponse,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockCoreApiBaseUrl}/${mockTransactionId}/refund`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Basic"),
          },
          body: JSON.stringify({
            amount: mockAmount,
            reason: mockReason,
          }),
        }),
      );
    });

    it("should throw INTERNAL_SERVER_ERROR when refund fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: "Refund failed" }),
      });

      await expect(adapter.refund(refundCommand)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log error when refund fails", async () => {
      const errorBody = { error: "Refund processing error" };
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue(errorBody),
      });

      try {
        await adapter.refund(refundCommand);
      } catch {
        // Expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "MidtransPaymentGatewayAdapter",
          event: "REFUND_FAILED",
          data: { errorBody },
        }),
      );
    });

    it("should handle fetch network error on refund", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(adapter.refund(refundCommand)).rejects.toThrow("Network error");
    });

    it("should build correct auth header for refund", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockRefundResponse),
      });

      await adapter.refund(refundCommand);

      const callArgs = mockFetch.mock.calls[0];
      const authHeader = callArgs[1].headers.Authorization;
      expect(authHeader).toBe("Basic " + Buffer.from(mockServerKey + ":").toString("base64"));
    });
  });

  describe("getStatus", () => {
    const mockStatusResponse = {
      transaction_id: "txn-123",
      order_id: "order-123",
      transaction_status: "settlement" as const,
      payment_type: "credit_card",
      gross_amount: "230000",
      status_code: "200",
      va_numbers: [{ bank: "BCA", va_number: "1234567890" }],
      actions: [{ name: "action", method: "GET", url: "https://example.com" }],
      expiry_time: "2024-01-15T10:30:00Z",
    };

    it("should get status successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockStatusResponse),
      });

      const result = await adapter.getStatus(mockTransactionId);

      expect(result).toEqual({
        providerReferenceId: mockStatusResponse.transaction_id,
        gatewayStatus: "SUCCESS",
        method: PaymentMethod.CARD,
        redirectUrl: null,
        snapToken: null,
        paymentInstructions: {
          type: "VIRTUAL_ACCOUNT",
          vaNumbers: mockStatusResponse.va_numbers,
          expiryTime: mockStatusResponse.expiry_time,
        },
        rawResponse: mockStatusResponse,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockCoreApiBaseUrl}/${mockTransactionId}/status`,
        expect.objectContaining({
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Basic"),
          },
        }),
      );
    });

    it("should handle status with actions instead of va_numbers", async () => {
      const responseWithActions = {
        ...mockStatusResponse,
        va_numbers: undefined,
        actions: [{ name: "action", method: "GET", url: "https://example.com" }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(responseWithActions),
      });

      const result = await adapter.getStatus(mockTransactionId);

      expect(result.paymentInstructions).toEqual({
        type: "ACTIONS",
        actions: responseWithActions.actions,
        expiryTime: responseWithActions.expiry_time,
      });
    });

    it("should handle status with no payment instructions", async () => {
      const responseWithoutInstructions = {
        ...mockStatusResponse,
        va_numbers: undefined,
        actions: undefined,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(responseWithoutInstructions),
      });

      const result = await adapter.getStatus(mockTransactionId);

      expect(result.paymentInstructions).toBeNull();
    });

    it("should map status correctly for different transaction statuses", async () => {
      const statuses = [
        { midtrans: "settlement", expected: "SUCCESS" },
        { midtrans: "capture", expected: "PENDING" },
        { midtrans: "pending", expected: "PENDING" },
        { midtrans: "deny", expected: "FAILED" },
        { midtrans: "cancel", expected: "FAILED" },
        { midtrans: "expire", expected: "FAILED" },
        { midtrans: "failure", expected: "FAILED" },
      ];

      for (const { midtrans, expected } of statuses) {
        const response = {
          ...mockStatusResponse,
          transaction_status: midtrans,
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(response),
        });

        const result = await adapter.getStatus(mockTransactionId);
        expect(result.gatewayStatus).toBe(expected);
      }
    });

    it("should map fraud status for capture transaction", async () => {
      const response = {
        ...mockStatusResponse,
        transaction_status: "capture" as const,
        fraud_status: "accept" as const,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(response),
      });

      const result = await adapter.getStatus(mockTransactionId);
      expect(result.gatewayStatus).toBe("SUCCESS");
    });

    it("should map payment types correctly", async () => {
      const paymentMappings = [
        { midtrans: "gopay", expected: PaymentMethod.E_WALLET },
        { midtrans: "shopeepay", expected: PaymentMethod.E_WALLET },
        { midtrans: "dana", expected: PaymentMethod.E_WALLET },
        { midtrans: "ovo", expected: PaymentMethod.E_WALLET },
        { midtrans: "linkaja", expected: PaymentMethod.E_WALLET },
        { midtrans: "qris", expected: PaymentMethod.QRIS },
        { midtrans: "bank_transfer", expected: PaymentMethod.BANK_TRANSFER },
        { midtrans: "echannel", expected: PaymentMethod.BANK_TRANSFER },
        { midtrans: "permata_va", expected: PaymentMethod.BANK_TRANSFER },
        { midtrans: "bca_va", expected: PaymentMethod.BANK_TRANSFER },
        { midtrans: "bni_va", expected: PaymentMethod.BANK_TRANSFER },
        { midtrans: "credit_card", expected: PaymentMethod.CARD },
        { midtrans: "cstore", expected: PaymentMethod.CASH },
        { midtrans: "akulaku", expected: PaymentMethod.OTHER },
        { midtrans: "kredivo", expected: PaymentMethod.OTHER },
        { midtrans: "unknown", expected: PaymentMethod.OTHER },
      ];

      for (const { midtrans, expected } of paymentMappings) {
        const response = {
          ...mockStatusResponse,
          payment_type: midtrans,
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(response),
        });

        const result = await adapter.getStatus(mockTransactionId);
        expect(result.method).toBe(expected);
      }
    });

    it("should throw INTERNAL_SERVER_ERROR when status check fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: "Status check failed" }),
      });

      await expect(adapter.getStatus(mockTransactionId)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log error when status check fails", async () => {
      const errorBody = { error: "Transaction not found" };
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue(errorBody),
      });

      try {
        await adapter.getStatus(mockTransactionId);
      } catch {
        // Expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "MidtransPaymentGatewayAdapter",
          event: "STATUS_CHECK_FAILED",
          data: { errorBody },
        }),
      );
    });

    it("should throw SERVER_EXCEPTIONS.INTERNAL_SERVER_ERROR on unknown status", async () => {
      const response = {
        ...mockStatusResponse,
        transaction_status: "unknown",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(response),
      });

      await expect(adapter.getStatus(mockTransactionId)).rejects.toMatchObject({
        name: "ExternalServiceUnavailableException",
      });

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle fetch network error on status check", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(adapter.getStatus(mockTransactionId)).rejects.toThrow("Network error");
    });

    it("should build correct auth header for status check", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockStatusResponse),
      });

      await adapter.getStatus(mockTransactionId);

      const callArgs = mockFetch.mock.calls[0];
      const authHeader = callArgs[1].headers.Authorization;
      expect(authHeader).toBe("Basic " + Buffer.from(mockServerKey + ":").toString("base64"));
    });
  });

  describe("verifyWebhookSignature", () => {
    const mockPayload = {
      order_id: "order-123",
      status_code: "200",
      gross_amount: "230000",
    };

    it("should verify webhook signature successfully", () => {
      const signature = "mocked-signature";
      const result = adapter.verifyWebhookSignature(mockPayload, signature);

      expect(result).toBe(true);
      expect(createHash).toHaveBeenCalledWith("sha512");
    });

    it("should return false when order_id is missing", () => {
      const payload = {
        status_code: "200",
        gross_amount: "230000",
      };

      const result = adapter.verifyWebhookSignature(payload, "signature");

      expect(result).toBe(false);
    });

    it("should return false when status_code is missing", () => {
      const payload = {
        order_id: "order-123",
        gross_amount: "230000",
      };

      const result = adapter.verifyWebhookSignature(payload, "signature");

      expect(result).toBe(false);
    });

    it("should return false when gross_amount is missing", () => {
      const payload = {
        order_id: "order-123",
        status_code: "200",
      };

      const result = adapter.verifyWebhookSignature(payload, "signature");

      expect(result).toBe(false);
    });

    it("should return false when signature does not match", () => {
      const mockDigest = jest.fn().mockReturnValue("different-signature");
      const mockUpdate = jest.fn().mockReturnThis();
      (createHash as jest.Mock).mockReturnValue({
        update: mockUpdate,
        digest: mockDigest,
      });

      const result = adapter.verifyWebhookSignature(mockPayload, "wrong-signature");

      expect(result).toBe(false);
    });

    it("should use server key in signature generation", () => {
      const signature = "mocked-signature";
      adapter.verifyWebhookSignature(mockPayload, signature);

      const mockHash = (createHash as jest.Mock).mock.results[0].value;
      expect(mockHash.update).toHaveBeenCalledWith(
        `${mockPayload.order_id}${mockPayload.status_code}${mockPayload.gross_amount}${mockConfig.serverKey}`,
      );
    });

    it("should handle empty payload", () => {
      const result = adapter.verifyWebhookSignature({}, "signature");

      expect(result).toBe(false);
    });

    it("should handle missing server key", () => {
      const configWithoutKey = {
        ...mockConfig,
        serverKey: "",
      };
      const adapterWithoutKey = new MidtransPaymentGatewayAdapter(configWithoutKey, mockLogger);
      const result = adapterWithoutKey.verifyWebhookSignature(mockPayload, "signature");

      expect(result).toBe(false);
    });
  });

  describe("buildAuthHeader", () => {
    it("should build correct auth header with server key", () => {
      const authHeader = (adapter as unknown as { buildAuthHeader: () => string }).buildAuthHeader();
      expect(authHeader).toBe("Basic " + Buffer.from(mockServerKey + ":").toString("base64"));
    });

    it("should build auth header with empty server key", () => {
      const configWithoutKey = {
        ...mockConfig,
        serverKey: "",
      };
      const adapterWithoutKey = new MidtransPaymentGatewayAdapter(configWithoutKey, mockLogger);

      const authHeader = (adapterWithoutKey as unknown as { buildAuthHeader: () => string }).buildAuthHeader();
      expect(authHeader).toBe("Basic " + Buffer.from(":").toString("base64"));
    });
  });

  describe("extractPaymentInstructions", () => {
    it("should extract VA instructions", () => {
      const body = {
        va_numbers: [{ bank: "BCA", va_number: "1234567890" }],
        expiry_time: "2024-01-15T10:30:00Z",
      };

      const result = (
        adapter as unknown as { extractPaymentInstructions: (body: MidtransStatusResponse) => Record<string, unknown> | null }
      ).extractPaymentInstructions(body as MidtransStatusResponse);
      expect(result).toEqual({
        type: "VIRTUAL_ACCOUNT",
        vaNumbers: body.va_numbers,
        expiryTime: body.expiry_time,
      });
    });

    it("should extract actions instructions", () => {
      const body = {
        actions: [{ name: "action", method: "GET", url: "https://example.com" }],
        expiry_time: "2024-01-15T10:30:00Z",
      };

      const result = (
        adapter as unknown as { extractPaymentInstructions: (body: MidtransStatusResponse) => Record<string, unknown> | null }
      ).extractPaymentInstructions(body as MidtransStatusResponse);
      expect(result).toEqual({
        type: "ACTIONS",
        actions: body.actions,
        expiryTime: body.expiry_time,
      });
    });

    it("should return null when no instructions available", () => {
      const body = {};

      const result = (
        adapter as unknown as { extractPaymentInstructions: (body: MidtransStatusResponse) => Record<string, unknown> | null }
      ).extractPaymentInstructions(body as MidtransStatusResponse);
      expect(result).toBeNull();
    });
  });

  describe("mapTransactionStatus", () => {
    it("should map 'settlement' to SUCCESS", () => {
      const result = (adapter as unknown as { mapTransactionStatus: (status: string) => string }).mapTransactionStatus("settlement");
      expect(result).toBe("SUCCESS");
    });

    it("should map 'capture' without accept fraud to PENDING", () => {
      const result = (adapter as unknown as { mapTransactionStatus: (status: string) => string }).mapTransactionStatus("capture");
      expect(result).toBe("PENDING");
    });

    it("should map 'pending' to PENDING", () => {
      const result = (adapter as unknown as { mapTransactionStatus: (status: string) => string }).mapTransactionStatus("pending");
      expect(result).toBe("PENDING");
    });

    it("should map 'deny' to FAILED", () => {
      const result = (adapter as unknown as { mapTransactionStatus: (status: string) => string }).mapTransactionStatus("deny");
      expect(result).toBe("FAILED");
    });

    it("should map 'cancel' to FAILED", () => {
      const result = (adapter as unknown as { mapTransactionStatus: (status: string) => string }).mapTransactionStatus("cancel");
      expect(result).toBe("FAILED");
    });

    it("should map 'expire' to FAILED", () => {
      const result = (adapter as unknown as { mapTransactionStatus: (status: string) => string }).mapTransactionStatus("expire");
      expect(result).toBe("FAILED");
    });

    it("should map 'failure' to FAILED", () => {
      const result = (adapter as unknown as { mapTransactionStatus: (status: string) => string }).mapTransactionStatus("failure");
      expect(result).toBe("FAILED");
    });

    it("should throw for unknown status", () => {
      expect(() => (adapter as unknown as { mapTransactionStatus: (status: string) => string }).mapTransactionStatus("unknown")).toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("mapPaymentType", () => {
    it("should map all known payment types", () => {
      const mappings = [
        { input: "gopay", expected: PaymentMethod.E_WALLET },
        { input: "shopeepay", expected: PaymentMethod.E_WALLET },
        { input: "dana", expected: PaymentMethod.E_WALLET },
        { input: "ovo", expected: PaymentMethod.E_WALLET },
        { input: "linkaja", expected: PaymentMethod.E_WALLET },
        { input: "qris", expected: PaymentMethod.QRIS },
        { input: "bank_transfer", expected: PaymentMethod.BANK_TRANSFER },
        { input: "echannel", expected: PaymentMethod.BANK_TRANSFER },
        { input: "permata_va", expected: PaymentMethod.BANK_TRANSFER },
        { input: "bca_va", expected: PaymentMethod.BANK_TRANSFER },
        { input: "bni_va", expected: PaymentMethod.BANK_TRANSFER },
        { input: "credit_card", expected: PaymentMethod.CARD },
        { input: "cstore", expected: PaymentMethod.CASH },
        { input: "akulaku", expected: PaymentMethod.OTHER },
        { input: "kredivo", expected: PaymentMethod.OTHER },
      ];

      for (const { input, expected } of mappings) {
        const result = (adapter as unknown as { mapPaymentType: (input: string) => PaymentMethod }).mapPaymentType(input);
        expect(result).toBe(expected);
      }
    });

    it("should map unknown payment type to OTHER and log error", () => {
      const result = (adapter as unknown as { mapPaymentType: (input: string) => PaymentMethod }).mapPaymentType("unknown_payment_type");
      expect(result).toBe(PaymentMethod.OTHER);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "UNMAPPED_PAYMENT_TYPE",
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle zero amount charge", async () => {
      const command = {
        transactionId: mockTransactionId,
        amount: new Money(0),
        method: PaymentMethod.CARD,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          token: "snap-token-123",
          redirect_url: "https://example.com",
        }),
      });

      const result = await adapter.charge(command);
      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        mockSnapBaseUrl,
        expect.objectContaining({
          body: JSON.stringify({
            transaction_details: {
              order_id: mockTransactionId,
              gross_amount: 0,
            },
            credit_card: { secure: true },
          }),
        }),
      );
    });

    it("should handle large amount charge", async () => {
      const largeAmount = 9999999999;
      const command = {
        transactionId: mockTransactionId,
        amount: new Money(largeAmount),
        method: PaymentMethod.CARD,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          token: "snap-token-123",
          redirect_url: "https://example.com",
        }),
      });

      await adapter.charge(command);

      expect(mockFetch).toHaveBeenCalledWith(
        mockSnapBaseUrl,
        expect.objectContaining({
          body: JSON.stringify({
            transaction_details: {
              order_id: mockTransactionId,
              gross_amount: largeAmount,
            },
            credit_card: { secure: true },
          }),
        }),
      );
    });

    it("should handle empty redirect URL in charge response", async () => {
      const response = {
        token: "snap-token-123",
        redirect_url: "",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(response),
      });

      const result = await adapter.charge({
        transactionId: mockTransactionId,
        amount: new Money(mockAmount),
        method: PaymentMethod.CARD,
      });

      expect(result.redirectUrl).toBe("");
    });

    it("should handle missing token in charge response", async () => {
      const response = {
        redirect_url: "https://example.com",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(response),
      });

      const result = await adapter.charge({
        transactionId: mockTransactionId,
        amount: new Money(mockAmount),
        method: PaymentMethod.CARD,
      });

      expect(result.snapToken).toBeUndefined();
    });

    it("should handle malformed JSON response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      });

      await expect(
        adapter.charge({
          transactionId: mockTransactionId,
          amount: new Money(mockAmount),
          method: PaymentMethod.CARD,
        }),
      ).rejects.toThrow("Invalid JSON");
    });

    it("should handle malformed JSON error response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      });

      await expect(
        adapter.charge({
          transactionId: mockTransactionId,
          amount: new Money(mockAmount),
          method: PaymentMethod.CARD,
        }),
      ).rejects.toThrow("Invalid JSON");
    });
  });
});
