import { PaymentMapper } from "@/application/mappers/payment-transaction.mapper";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { PaymentMethod, PaymentTransactionStatus, PaymentTransactionType } from "@/domain/types/payment-transaction.type";

describe("PaymentTransactionMapper", () => {
  const mockId = "payment-123";
  const mockOrderId = "order-456";
  const mockAmount = 230000;
  const mockMethod = PaymentMethod.CARD;
  const mockStatus = PaymentTransactionStatus.SUCCESS;
  const mockType = PaymentTransactionType.CHARGE;
  const mockProvider = "Midtrans";
  const mockProviderReferenceId = "ref-789";
  const mockParentTransactionId = "parent-123";
  const mockFailureReason = null;
  const mockMetadata = { customer: "John Doe", note: "Test payment" };
  const mockCompletedAt = new Date("2024-01-01T10:30:00.000Z");
  const mockCreatedAt = new Date("2024-01-01T10:00:00.000Z");
  const mockUpdatedAt = new Date("2024-01-01T11:00:00.000Z");

  let payment: PaymentTransaction;

  beforeEach(() => {
    payment = PaymentTransaction.rebuild({
      id: mockId,
      orderId: mockOrderId,
      type: mockType,
      amount: mockAmount,
      method: mockMethod,
      status: mockStatus,
      provider: mockProvider,
      providerReferenceId: mockProviderReferenceId,
      parentTransactionId: mockParentTransactionId,
      failureReason: mockFailureReason,
      metadata: mockMetadata,
      completedAt: mockCompletedAt,
      createdAt: mockCreatedAt,
      updatedAt: mockUpdatedAt,
    });
  });

  describe("toPlainObject", () => {
    let result: ReturnType<typeof PaymentMapper.toPlainObject>;

    describe("with complete payment data", () => {
      beforeEach(() => {
        result = PaymentMapper.toPlainObject(payment);
      });

      it("should map all fields correctly", () => {
        expect(result).toEqual({
          id: mockId,
          orderId: mockOrderId,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          completedAt: mockCompletedAt,
          type: mockType,
          parentTransactionId: mockParentTransactionId,
          failureReason: mockFailureReason,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          metadata: mockMetadata,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });
      });

      it("should return new Date objects, not references", () => {
        expect(result.createdAt).not.toBe(mockCreatedAt);
        expect(result.updatedAt).not.toBe(mockUpdatedAt);
        expect(result.completedAt).not.toBe(mockCompletedAt);
      });

      it("should preserve date values accurately", () => {
        expect(result.createdAt.getTime()).toBe(mockCreatedAt.getTime());
        expect(result.updatedAt.getTime()).toBe(mockUpdatedAt.getTime());
        expect(result.completedAt?.getTime()).toBe(mockCompletedAt.getTime());
      });
    });

    describe("with payment having null optional fields", () => {
      beforeEach(() => {
        const paymentWithNulls = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: PaymentTransactionType.CHARGE,
          amount: mockAmount,
          method: null,
          status: PaymentTransactionStatus.PENDING,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentWithNulls);
      });

      it("should map null fields correctly", () => {
        expect(result.method).toBeNull();
        expect(result.providerReferenceId).toBeNull();
        expect(result.parentTransactionId).toBeNull();
        expect(result.failureReason).toBeNull();
        expect(result.metadata).toBeNull();
        expect(result.completedAt).toBeNull();
        expect(result.status).toBe(PaymentTransactionStatus.PENDING);
      });
    });

    describe("with payment having different statuses", () => {
      it("should map SUCCESS status correctly", () => {
        const paymentSuccess = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.SUCCESS,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentSuccess);
        expect(result.status).toBe(PaymentTransactionStatus.SUCCESS);
        expect(result.completedAt).toEqual(mockCompletedAt);
      });

      it("should map FAILED status correctly", () => {
        const failedReason = "Payment declined by bank";
        const paymentFailed = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.FAILED,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: failedReason,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentFailed);
        expect(result.status).toBe(PaymentTransactionStatus.FAILED);
        expect(result.failureReason).toBe(failedReason);
        expect(result.completedAt).toBeNull();
      });

      it("should map PENDING status correctly", () => {
        const paymentPending = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.PENDING,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentPending);
        expect(result.status).toBe(PaymentTransactionStatus.PENDING);
        expect(result.completedAt).toBeNull();
      });

      it("should map EXPIRED status correctly", () => {
        const paymentExpired = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.EXPIRED,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentExpired);
        expect(result.status).toBe(PaymentTransactionStatus.EXPIRED);
      });

      it("should map CANCELLED status correctly", () => {
        const paymentCancelled = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.CANCELLED,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentCancelled);
        expect(result.status).toBe(PaymentTransactionStatus.CANCELLED);
      });
    });

    describe("with payment having different types", () => {
      it("should map CHARGE type correctly", () => {
        const paymentCharge = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: PaymentTransactionType.CHARGE,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentCharge);
        expect(result.type).toBe(PaymentTransactionType.CHARGE);
        expect(result.parentTransactionId).toBeNull();
      });

      it("should map REFUND type correctly", () => {
        const paymentRefund = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: PaymentTransactionType.REFUND,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: mockParentTransactionId,
          failureReason: null,
          metadata: { reason: "Customer requested refund" },
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentRefund);
        expect(result.type).toBe(PaymentTransactionType.REFUND);
        expect(result.parentTransactionId).toBe(mockParentTransactionId);
        expect(result.metadata).toEqual({ reason: "Customer requested refund" });
      });
    });

    describe("with payment having different payment methods", () => {
      it("should map CARD method correctly", () => {
        const paymentCard = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: PaymentMethod.CARD,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentCard);
        expect(result.method).toBe(PaymentMethod.CARD);
      });

      it("should map QRIS method correctly", () => {
        const paymentQris = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: PaymentMethod.QRIS,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentQris);
        expect(result.method).toBe(PaymentMethod.QRIS);
      });

      it("should map E_WALLET method correctly", () => {
        const paymentEWallet = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: PaymentMethod.E_WALLET,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentEWallet);
        expect(result.method).toBe(PaymentMethod.E_WALLET);
      });

      it("should map BANK_TRANSFER method correctly", () => {
        const paymentBankTransfer = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: PaymentMethod.BANK_TRANSFER,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentBankTransfer);
        expect(result.method).toBe(PaymentMethod.BANK_TRANSFER);
      });

      it("should map null method correctly", () => {
        const paymentNullMethod = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: null,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentNullMethod);
        expect(result.method).toBeNull();
      });
    });

    describe("with payment having metadata", () => {
      it("should map metadata with simple values", () => {
        const metadata = { key: "value", test: 123 };
        const paymentWithMetadata = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: metadata,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentWithMetadata);
        expect(result.metadata).toEqual(metadata);
      });

      it("should map metadata with nested objects", () => {
        const metadata = { customer: { name: "John", email: "john@example.com" }, items: ["item1", "item2"] };
        const paymentWithMetadata = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: metadata,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentWithMetadata);
        expect(result.metadata).toEqual(metadata);
      });

      it("should map null metadata correctly", () => {
        const paymentNullMetadata = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentNullMetadata);
        expect(result.metadata).toBeNull();
      });
    });

    describe("with payment having different amounts", () => {
      it("should map zero amount correctly", () => {
        const paymentZero = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: 0,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentZero);
        expect(result.amount).toBe(0);
      });

      it("should map large amount correctly", () => {
        const largeAmount = 9999999999;
        const paymentLarge = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: largeAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentLarge);
        expect(result.amount).toBe(largeAmount);
      });
    });

    describe("with payment having different provider values", () => {
      it("should map provider correctly", () => {
        const providers = ["Midtrans", "Xendit", "Stripe", "Doku"];

        for (const provider of providers) {
          const paymentWithProvider = PaymentTransaction.rebuild({
            id: mockId,
            orderId: mockOrderId,
            type: mockType,
            amount: mockAmount,
            method: mockMethod,
            status: mockStatus,
            provider: provider,
            providerReferenceId: mockProviderReferenceId,
            parentTransactionId: null,
            failureReason: null,
            metadata: null,
            completedAt: mockCompletedAt,
            createdAt: mockCreatedAt,
            updatedAt: mockUpdatedAt,
          });

          result = PaymentMapper.toPlainObject(paymentWithProvider);
          expect(result.provider).toBe(provider);
        }
      });
    });

    describe("edge cases", () => {
      it("should handle ancient dates", () => {
        const ancientDate = new Date("1970-01-01T00:00:00.000Z");
        const paymentAncient = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: ancientDate,
          createdAt: ancientDate,
          updatedAt: ancientDate,
        });

        result = PaymentMapper.toPlainObject(paymentAncient);

        expect(result.createdAt.getTime()).toBe(0);
        expect(result.updatedAt.getTime()).toBe(0);
        expect(result.completedAt?.getTime()).toBe(0);
      });

      it("should handle future dates", () => {
        const futureDate = new Date("2099-12-31T23:59:59.999Z");
        const paymentFuture = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: futureDate,
          createdAt: futureDate,
          updatedAt: futureDate,
        });

        result = PaymentMapper.toPlainObject(paymentFuture);

        expect(result.createdAt.getTime()).toBe(futureDate.getTime());
        expect(result.updatedAt.getTime()).toBe(futureDate.getTime());
        expect(result.completedAt?.getTime()).toBe(futureDate.getTime());
      });

      it("should handle UUID-like IDs", () => {
        const uuidId = "550e8400-e29b-41d4-a716-446655440000";
        const paymentUuid = PaymentTransaction.rebuild({
          id: uuidId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toPlainObject(paymentUuid);
        expect(result.id).toBe(uuidId);
      });
    });

    describe("immutability", () => {
      it("should not mutate the original payment object", () => {
        const originalId = payment.getId();
        const originalOrderId = payment.getOrderId();
        const originalAmount = payment.getAmount();

        PaymentMapper.toPlainObject(payment);

        expect(payment.getId()).toBe(originalId);
        expect(payment.getOrderId()).toBe(originalOrderId);
        expect(payment.getAmount()).toBe(originalAmount);
      });

      it("should return new Date instances for each mapping call", () => {
        const result1 = PaymentMapper.toPlainObject(payment);
        const result2 = PaymentMapper.toPlainObject(payment);

        expect(result1).not.toBe(result2);
        expect(result1.createdAt).not.toBe(result2.createdAt);
        expect(result1.updatedAt).not.toBe(result2.updatedAt);
        expect(result1.completedAt).not.toBe(result2.completedAt);
        expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
        expect(result1.updatedAt.getTime()).toBe(result2.updatedAt.getTime());
        expect(result1.completedAt?.getTime()).toBe(result2.completedAt?.getTime());
      });
    });
  });

  describe("toDetailsView", () => {
    let result: ReturnType<typeof PaymentMapper.toDetailsView>;

    describe("with complete payment data", () => {
      beforeEach(() => {
        result = PaymentMapper.toDetailsView(payment);
      });

      it("should map all fields correctly", () => {
        expect(result).toEqual({
          id: mockId,
          orderId: mockOrderId,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          completedAt: mockCompletedAt,
          type: mockType,
          parentTransactionId: mockParentTransactionId,
          createdAt: mockCreatedAt,
        });
      });

      it("should return new Date objects, not references", () => {
        expect(result.createdAt).not.toBe(mockCreatedAt);
        expect(result.completedAt).not.toBe(mockCompletedAt);
      });

      it("should preserve date values accurately", () => {
        expect(result.createdAt.getTime()).toBe(mockCreatedAt.getTime());
        expect(result.completedAt?.getTime()).toBe(mockCompletedAt.getTime());
      });

      it("should not include provider, providerReferenceId, failureReason, metadata, updatedAt", () => {
        expect(result).not.toHaveProperty("provider");
        expect(result).not.toHaveProperty("providerReferenceId");
        expect(result).not.toHaveProperty("failureReason");
        expect(result).not.toHaveProperty("metadata");
        expect(result).not.toHaveProperty("updatedAt");
      });
    });

    describe("with payment having null optional fields", () => {
      beforeEach(() => {
        const paymentWithNulls = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: PaymentTransactionType.CHARGE,
          amount: mockAmount,
          method: null,
          status: PaymentTransactionStatus.PENDING,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentWithNulls);
      });

      it("should map null fields correctly", () => {
        expect(result.method).toBeNull();
        expect(result.parentTransactionId).toBeNull();
        expect(result.completedAt).toBeNull();
        expect(result.status).toBe(PaymentTransactionStatus.PENDING);
      });
    });

    describe("with payment having different statuses", () => {
      it("should map SUCCESS status correctly", () => {
        const paymentSuccess = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.SUCCESS,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentSuccess);
        expect(result.status).toBe(PaymentTransactionStatus.SUCCESS);
        expect(result.completedAt).toEqual(mockCompletedAt);
      });

      it("should map FAILED status correctly", () => {
        const failedReason = "Payment declined by bank";
        const paymentFailed = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.FAILED,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: failedReason,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentFailed);
        expect(result.status).toBe(PaymentTransactionStatus.FAILED);
        expect(result.completedAt).toBeNull();
      });

      it("should map PENDING status correctly", () => {
        const paymentPending = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.PENDING,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentPending);
        expect(result.status).toBe(PaymentTransactionStatus.PENDING);
        expect(result.completedAt).toBeNull();
      });

      it("should map EXPIRED status correctly", () => {
        const paymentExpired = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.EXPIRED,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentExpired);
        expect(result.status).toBe(PaymentTransactionStatus.EXPIRED);
      });

      it("should map CANCELLED status correctly", () => {
        const paymentCancelled = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: PaymentTransactionStatus.CANCELLED,
          provider: mockProvider,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: null,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentCancelled);
        expect(result.status).toBe(PaymentTransactionStatus.CANCELLED);
      });
    });

    describe("with payment having different types", () => {
      it("should map CHARGE type correctly", () => {
        const paymentCharge = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: PaymentTransactionType.CHARGE,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentCharge);
        expect(result.type).toBe(PaymentTransactionType.CHARGE);
        expect(result.parentTransactionId).toBeNull();
      });

      it("should map REFUND type correctly", () => {
        const paymentRefund = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: PaymentTransactionType.REFUND,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: mockParentTransactionId,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentRefund);
        expect(result.type).toBe(PaymentTransactionType.REFUND);
        expect(result.parentTransactionId).toBe(mockParentTransactionId);
      });
    });

    describe("with payment having different payment methods", () => {
      it("should map CARD method correctly", () => {
        const paymentCard = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: PaymentMethod.CARD,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentCard);
        expect(result.method).toBe(PaymentMethod.CARD);
      });

      it("should map QRIS method correctly", () => {
        const paymentQris = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: PaymentMethod.QRIS,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentQris);
        expect(result.method).toBe(PaymentMethod.QRIS);
      });

      it("should map null method correctly", () => {
        const paymentNullMethod = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: null,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentNullMethod);
        expect(result.method).toBeNull();
      });
    });

    describe("with payment having different amounts", () => {
      it("should map zero amount correctly", () => {
        const paymentZero = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: 0,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentZero);
        expect(result.amount).toBe(0);
      });

      it("should map large amount correctly", () => {
        const largeAmount = 9999999999;
        const paymentLarge = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: largeAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentLarge);
        expect(result.amount).toBe(largeAmount);
      });
    });

    describe("edge cases", () => {
      it("should handle ancient dates", () => {
        const ancientDate = new Date("1970-01-01T00:00:00.000Z");
        const paymentAncient = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: ancientDate,
          createdAt: ancientDate,
          updatedAt: ancientDate,
        });

        result = PaymentMapper.toDetailsView(paymentAncient);

        expect(result.createdAt.getTime()).toBe(0);
        expect(result.completedAt?.getTime()).toBe(0);
      });

      it("should handle future dates", () => {
        const futureDate = new Date("2099-12-31T23:59:59.999Z");
        const paymentFuture = PaymentTransaction.rebuild({
          id: mockId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: futureDate,
          createdAt: futureDate,
          updatedAt: futureDate,
        });

        result = PaymentMapper.toDetailsView(paymentFuture);

        expect(result.createdAt.getTime()).toBe(futureDate.getTime());
        expect(result.completedAt?.getTime()).toBe(futureDate.getTime());
      });

      it("should handle UUID-like IDs", () => {
        const uuidId = "550e8400-e29b-41d4-a716-446655440000";
        const paymentUuid = PaymentTransaction.rebuild({
          id: uuidId,
          orderId: mockOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentUuid);
        expect(result.id).toBe(uuidId);
      });

      it("should handle special characters in orderId", () => {
        const specialOrderId = "order-123_!@#$%^&*()";
        const paymentSpecial = PaymentTransaction.rebuild({
          id: mockId,
          orderId: specialOrderId,
          type: mockType,
          amount: mockAmount,
          method: mockMethod,
          status: mockStatus,
          provider: mockProvider,
          providerReferenceId: mockProviderReferenceId,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: mockCompletedAt,
          createdAt: mockCreatedAt,
          updatedAt: mockUpdatedAt,
        });

        result = PaymentMapper.toDetailsView(paymentSpecial);
        expect(result.orderId).toBe(specialOrderId);
      });
    });

    describe("immutability", () => {
      it("should not mutate the original payment object", () => {
        const originalId = payment.getId();
        const originalOrderId = payment.getOrderId();
        const originalAmount = payment.getAmount();

        PaymentMapper.toDetailsView(payment);

        expect(payment.getId()).toBe(originalId);
        expect(payment.getOrderId()).toBe(originalOrderId);
        expect(payment.getAmount()).toBe(originalAmount);
      });

      it("should return new Date instances for each mapping call", () => {
        const result1 = PaymentMapper.toDetailsView(payment);
        const result2 = PaymentMapper.toDetailsView(payment);

        expect(result1).not.toBe(result2);
        expect(result1.createdAt).not.toBe(result2.createdAt);
        expect(result1.completedAt).not.toBe(result2.completedAt);
        expect(result1.createdAt.getTime()).toBe(result2.createdAt.getTime());
        expect(result1.completedAt?.getTime()).toBe(result2.completedAt?.getTime());
      });
    });
  });

  describe("comparison between toPlainObject and toDetailsView", () => {
    it("should have different field sets", () => {
      const plainObject = PaymentMapper.toPlainObject(payment);
      const detailsView = PaymentMapper.toDetailsView(payment);

      expect(plainObject).toHaveProperty("provider");
      expect(plainObject).toHaveProperty("providerReferenceId");
      expect(plainObject).toHaveProperty("failureReason");
      expect(plainObject).toHaveProperty("metadata");
      expect(plainObject).toHaveProperty("updatedAt");
      expect(detailsView).not.toHaveProperty("provider");
      expect(detailsView).not.toHaveProperty("providerReferenceId");
      expect(detailsView).not.toHaveProperty("failureReason");
      expect(detailsView).not.toHaveProperty("metadata");
      expect(detailsView).not.toHaveProperty("updatedAt");
      expect(plainObject.id).toBe(detailsView.id);
      expect(plainObject.orderId).toBe(detailsView.orderId);
      expect(plainObject.amount).toBe(detailsView.amount);
      expect(plainObject.method).toBe(detailsView.method);
      expect(plainObject.status).toBe(detailsView.status);
      expect(plainObject.type).toBe(detailsView.type);
      expect(plainObject.parentTransactionId).toBe(detailsView.parentTransactionId);
      expect(plainObject.completedAt?.getTime()).toBe(detailsView.completedAt?.getTime());
      expect(plainObject.createdAt.getTime()).toBe(detailsView.createdAt.getTime());
    });

    it("should return consistent values for shared fields", () => {
      const plainObject = PaymentMapper.toPlainObject(payment);
      const detailsView = PaymentMapper.toDetailsView(payment);

      expect(plainObject.id).toBe(detailsView.id);
      expect(plainObject.orderId).toBe(detailsView.orderId);
      expect(plainObject.amount).toBe(detailsView.amount);
      expect(plainObject.method).toBe(detailsView.method);
      expect(plainObject.status).toBe(detailsView.status);
      expect(plainObject.type).toBe(detailsView.type);
    });
  });
});
