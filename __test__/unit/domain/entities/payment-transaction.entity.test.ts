import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";
import {
  PaymentChargeInitiatedEvent,
  PaymentRefundInitiatedEvent,
  PaymentTransactionSucceededEvent,
  PaymentTransactionFailedEvent,
  PaymentTransactionExpiredEvent,
  PaymentTransactionCancelledEvent,
} from "@/domain/events/payment-transaction.events";
import {
  InvalidPaymentTransactionTransitionException,
  InvalidRefundSourceException,
  RefundOnUnsuccessfulChargeException,
  ZeroRefundException,
  RefundAmountExceedsPreviousRefundsException,
} from "@/domain/exceptions/payment-transaction.exceptions";
import { NegativeMoneyAmountException } from "@/domain/exceptions/money.exceptions";
import {
  InitiateChargeCreationData,
  InitiateRefundCreationData,
  PaymentMethod,
  PaymentTransactionRebuildData,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from "@/domain/types/payment-transaction.type";

describe("PaymentTransaction", () => {
  const mockId = "txn-123";
  const mockOrderId = "order-123";
  const mockAmount = 100000;
  const mockProvider = "Midtrans";
  const mockMethod = PaymentMethod.CARD;

  describe("initiateCharge", () => {
    it("should create a charge transaction with all valid data", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };

      const transaction = PaymentTransaction.initiateCharge(data);

      expect(transaction).toBeInstanceOf(PaymentTransaction);
      expect(transaction.getId()).toBe(mockId);
      expect(transaction.getOrderId()).toBe(mockOrderId);
      expect(transaction.getType()).toBe(PaymentTransactionType.CHARGE);
      expect(transaction.getAmount()).toBeInstanceOf(Money);
      expect(transaction.getAmount().getAmount()).toBe(mockAmount);
      expect(transaction.getMethod()).toBe(mockMethod);
      expect(transaction.getStatus()).toBe(PaymentTransactionStatus.PENDING);
      expect(transaction.getProvider()).toBe(mockProvider);
      expect(transaction.getProviderReferenceId()).toBeNull();
      expect(transaction.getParentTransactionId()).toBeNull();
      expect(transaction.getFailureReason()).toBeNull();
      expect(transaction.getMetadata()).toBeNull();
      expect(transaction.getCompletedAt()).toBeNull();
      expect(transaction.getCreatedAt()).toBeInstanceOf(Date);
      expect(transaction.getUpdatedAt()).toBeInstanceOf(Date);
      expect(transaction.isSuccessful()).toBe(false);
    });

    it("should create a charge transaction without method", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        provider: mockProvider,
      };

      const transaction = PaymentTransaction.initiateCharge(data);
      expect(transaction.getMethod()).toBeNull();
    });

    it("should emit PaymentChargeInitiatedEvent", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };

      const transaction = PaymentTransaction.initiateCharge(data);
      const events = transaction.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PaymentChargeInitiatedEvent);
      expect((events[0] as PaymentChargeInitiatedEvent).aggregateId).toBe(mockId);
    });
  });

  describe("initiateRefund", () => {
    let parentTransaction: PaymentTransaction;
    let previousRefunds: PaymentTransaction[];

    beforeEach(() => {
      const chargeData: InitiateChargeCreationData = {
        id: "charge-123",
        orderId: mockOrderId,
        amount: 100000,
        method: mockMethod,
        provider: mockProvider,
      };
      parentTransaction = PaymentTransaction.initiateCharge(chargeData);
      parentTransaction.markSuccess();
      previousRefunds = [];
    });

    it("should create a refund transaction with valid data", () => {
      const data: InitiateRefundCreationData = {
        id: "refund-123",
        parentTransaction,
        previousRefunds,
        amount: 50000,
        reason: "Customer requested refund",
      };

      const refund = PaymentTransaction.initiateRefund(data);

      expect(refund).toBeInstanceOf(PaymentTransaction);
      expect(refund.getId()).toBe("refund-123");
      expect(refund.getOrderId()).toBe(mockOrderId);
      expect(refund.getType()).toBe(PaymentTransactionType.REFUND);
      expect(refund.getAmount().getAmount()).toBe(50000);
      expect(refund.getMethod()).toBe(mockMethod);
      expect(refund.getStatus()).toBe(PaymentTransactionStatus.PENDING);
      expect(refund.getProvider()).toBe(mockProvider);
      expect(refund.getProviderReferenceId()).toBeNull();
      expect(refund.getParentTransactionId()).toBe("charge-123");
      expect(refund.getFailureReason()).toBeNull();
      expect(refund.getMetadata()).toEqual({ reason: "Customer requested refund" });
      expect(refund.getCompletedAt()).toBeNull();
      expect(refund.isSuccessful()).toBe(false);
    });

    it("should emit PaymentRefundInitiatedEvent", () => {
      const data: InitiateRefundCreationData = {
        id: "refund-123",
        parentTransaction,
        previousRefunds,
        amount: 50000,
        reason: "Customer requested refund",
      };

      const refund = PaymentTransaction.initiateRefund(data);
      const events = refund.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PaymentRefundInitiatedEvent);
      expect((events[0] as PaymentRefundInitiatedEvent).aggregateId).toBe("refund-123");
    });

    it("should handle refund with previous successful refunds", () => {
      const refund1Data: InitiateRefundCreationData = {
        id: "refund-1",
        parentTransaction,
        previousRefunds: [],
        amount: 30000,
        reason: "First refund",
      };
      const refund1 = PaymentTransaction.initiateRefund(refund1Data);
      refund1.markSuccess();

      const data: InitiateRefundCreationData = {
        id: "refund-2",
        parentTransaction,
        previousRefunds: [refund1],
        amount: 20000,
        reason: "Second refund",
      };

      const refund2 = PaymentTransaction.initiateRefund(data);
      expect(refund2.getAmount().getAmount()).toBe(20000);
    });

    it("should throw ZeroRefundException when amount is zero", () => {
      const data: InitiateRefundCreationData = {
        id: "refund-123",
        parentTransaction,
        previousRefunds,
        amount: 0,
        reason: "Zero refund",
      };

      expect(() => PaymentTransaction.initiateRefund(data)).toThrow(ZeroRefundException);
    });

    it("should throw InvalidRefundSourceException when parent is not CHARGE", () => {
      const refundData: InitiateRefundCreationData = {
        id: "refund-123",
        parentTransaction,
        previousRefunds: [],
        amount: 50000,
        reason: "First refund",
      };
      const refund = PaymentTransaction.initiateRefund(refundData);

      const data: InitiateRefundCreationData = {
        id: "refund-456",
        parentTransaction: refund,
        previousRefunds: [],
        amount: 25000,
        reason: "Refund from refund",
      };

      expect(() => PaymentTransaction.initiateRefund(data)).toThrow(InvalidRefundSourceException);
    });

    it("should throw RefundOnUnsuccessfulChargeException when parent charge is not SUCCESS", () => {
      const pendingChargeData: InitiateChargeCreationData = {
        id: "charge-456",
        orderId: mockOrderId,
        amount: 100000,
        method: mockMethod,
        provider: mockProvider,
      };
      const pendingCharge = PaymentTransaction.initiateCharge(pendingChargeData);

      const data: InitiateRefundCreationData = {
        id: "refund-123",
        parentTransaction: pendingCharge,
        previousRefunds: [],
        amount: 50000,
        reason: "Refund on pending charge",
      };

      expect(() => PaymentTransaction.initiateRefund(data)).toThrow(RefundOnUnsuccessfulChargeException);
    });

    it("should throw RefundAmountExceedsPreviousRefundsException when refund exceeds remaining", () => {
      const data: InitiateRefundCreationData = {
        id: "refund-123",
        parentTransaction,
        previousRefunds,
        amount: 150000,
        reason: "Excessive refund",
      };

      expect(() => PaymentTransaction.initiateRefund(data)).toThrow(RefundAmountExceedsPreviousRefundsException);
    });

    it("should throw RefundAmountExceedsPreviousRefundsException with correct amounts", () => {
      const data: InitiateRefundCreationData = {
        id: "refund-123",
        parentTransaction,
        previousRefunds,
        amount: 150000,
        reason: "Excessive refund",
      };

      try {
        PaymentTransaction.initiateRefund(data);
      } catch (error) {
        expect(error).toBeInstanceOf(RefundAmountExceedsPreviousRefundsException);
        expect((error as RefundAmountExceedsPreviousRefundsException).message).toContain("150000");
      }
    });
  });

  describe("rebuild", () => {
    it("should rebuild a transaction from rebuild data", () => {
      const now = new Date();
      const data: PaymentTransactionRebuildData = {
        id: mockId,
        orderId: mockOrderId,
        type: PaymentTransactionType.CHARGE,
        amount: mockAmount,
        method: mockMethod,
        status: PaymentTransactionStatus.SUCCESS,
        provider: mockProvider,
        providerReferenceId: "ref-123",
        parentTransactionId: null,
        failureReason: null,
        metadata: { key: "value" },
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const transaction = PaymentTransaction.rebuild(data);

      expect(transaction).toBeInstanceOf(PaymentTransaction);
      expect(transaction.getId()).toBe(mockId);
      expect(transaction.getOrderId()).toBe(mockOrderId);
      expect(transaction.getType()).toBe(PaymentTransactionType.CHARGE);
      expect(transaction.getAmount().getAmount()).toBe(mockAmount);
      expect(transaction.getMethod()).toBe(mockMethod);
      expect(transaction.getStatus()).toBe(PaymentTransactionStatus.SUCCESS);
      expect(transaction.getProvider()).toBe(mockProvider);
      expect(transaction.getProviderReferenceId()).toBe("ref-123");
      expect(transaction.getParentTransactionId()).toBeNull();
      expect(transaction.getFailureReason()).toBeNull();
      expect(transaction.getMetadata()).toEqual({ key: "value" });
      expect(transaction.getCompletedAt()).toEqual(now);
      expect(transaction.getCreatedAt()).toEqual(now);
      expect(transaction.getUpdatedAt()).toEqual(now);
      expect(transaction.isSuccessful()).toBe(true);
    });

    it("should rebuild a refund transaction", () => {
      const now = new Date();
      const data: PaymentTransactionRebuildData = {
        id: "refund-123",
        orderId: mockOrderId,
        type: PaymentTransactionType.REFUND,
        amount: 50000,
        method: mockMethod,
        status: PaymentTransactionStatus.PENDING,
        provider: mockProvider,
        providerReferenceId: null,
        parentTransactionId: "charge-123",
        failureReason: null,
        metadata: { reason: "Refund" },
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const transaction = PaymentTransaction.rebuild(data);

      expect(transaction.getType()).toBe(PaymentTransactionType.REFUND);
      expect(transaction.getParentTransactionId()).toBe("charge-123");
      expect(transaction.isSuccessful()).toBe(false);
    });

    it("should rebuild with null values", () => {
      const now = new Date();
      const data: PaymentTransactionRebuildData = {
        id: mockId,
        orderId: mockOrderId,
        type: PaymentTransactionType.CHARGE,
        amount: mockAmount,
        method: null,
        status: PaymentTransactionStatus.FAILED,
        provider: mockProvider,
        providerReferenceId: null,
        parentTransactionId: null,
        failureReason: "Payment failed",
        metadata: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const transaction = PaymentTransaction.rebuild(data);

      expect(transaction.getMethod()).toBeNull();
      expect(transaction.getProviderReferenceId()).toBeNull();
      expect(transaction.getParentTransactionId()).toBeNull();
      expect(transaction.getFailureReason()).toBe("Payment failed");
      expect(transaction.getMetadata()).toBeNull();
      expect(transaction.getCompletedAt()).toBeNull();
      expect(transaction.isSuccessful()).toBe(false);
    });
  });

  describe("getters", () => {
    let transaction: PaymentTransaction;

    beforeEach(() => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      transaction = PaymentTransaction.initiateCharge(data);
    });

    it("should return id", () => {
      expect(transaction.getId()).toBe(mockId);
    });

    it("should return orderId", () => {
      expect(transaction.getOrderId()).toBe(mockOrderId);
    });

    it("should return type", () => {
      expect(transaction.getType()).toBe(PaymentTransactionType.CHARGE);
    });

    it("should return amount as Money", () => {
      expect(transaction.getAmount()).toBeInstanceOf(Money);
      expect(transaction.getAmount().getAmount()).toBe(mockAmount);
    });

    it("should return method", () => {
      expect(transaction.getMethod()).toBe(mockMethod);
    });

    it("should return status", () => {
      expect(transaction.getStatus()).toBe(PaymentTransactionStatus.PENDING);
    });

    it("should return provider", () => {
      expect(transaction.getProvider()).toBe(mockProvider);
    });

    it("should return providerReferenceId", () => {
      expect(transaction.getProviderReferenceId()).toBeNull();
    });

    it("should return parentTransactionId", () => {
      expect(transaction.getParentTransactionId()).toBeNull();
    });

    it("should return failureReason", () => {
      expect(transaction.getFailureReason()).toBeNull();
    });

    it("should return metadata", () => {
      expect(transaction.getMetadata()).toBeNull();
    });

    it("should return completedAt as a copy", () => {
      expect(transaction.getCompletedAt()).toBeNull();
    });

    it("should return createdAt as a copy", () => {
      const createdAt = transaction.getCreatedAt();
      const originalCreatedAt = transaction.getCreatedAt();
      expect(createdAt).not.toBe(originalCreatedAt);
      expect(createdAt).toEqual(originalCreatedAt);
    });

    it("should return updatedAt as a copy", () => {
      const updatedAt = transaction.getUpdatedAt();
      const originalUpdatedAt = transaction.getUpdatedAt();
      expect(updatedAt).not.toBe(originalUpdatedAt);
      expect(updatedAt).toEqual(originalUpdatedAt);
    });
  });

  describe("isSuccessful", () => {
    it("should return true when status is SUCCESS", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      transaction.markSuccess();
      expect(transaction.isSuccessful()).toBe(true);
    });

    it("should return false when status is PENDING", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      expect(transaction.isSuccessful()).toBe(false);
    });

    it("should return false when status is FAILED", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      transaction.markFailed("Payment failed");
      expect(transaction.isSuccessful()).toBe(false);
    });

    it("should return false when status is EXPIRED", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      transaction.markExpired();
      expect(transaction.isSuccessful()).toBe(false);
    });

    it("should return false when status is CANCELLED", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      transaction.cancel();
      expect(transaction.isSuccessful()).toBe(false);
    });
  });

  describe("markSuccess", () => {
    let transaction: PaymentTransaction;

    beforeEach(() => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      transaction = PaymentTransaction.initiateCharge(data);
      transaction.pullDomainEvents();
    });

    it("should mark transaction as SUCCESS", () => {
      transaction.markSuccess();
      expect(transaction.getStatus()).toBe(PaymentTransactionStatus.SUCCESS);
      expect(transaction.isSuccessful()).toBe(true);
    });

    it("should update method when provided", () => {
      transaction.markSuccess(PaymentMethod.QRIS);
      expect(transaction.getMethod()).toBe(PaymentMethod.QRIS);
    });

    it("should preserve method when not provided", () => {
      transaction.markSuccess();
      expect(transaction.getMethod()).toBe(mockMethod);
    });

    it("should update providerReferenceId when provided", () => {
      transaction.markSuccess(undefined, "ref-456");
      expect(transaction.getProviderReferenceId()).toBe("ref-456");
    });

    it("should preserve providerReferenceId when not provided", () => {
      transaction.markSuccess();
      expect(transaction.getProviderReferenceId()).toBeNull();
    });

    it("should update metadata when provided", () => {
      const metadata = { key: "value" };
      transaction.markSuccess(undefined, undefined, metadata);
      expect(transaction.getMetadata()).toEqual(metadata);
    });

    it("should set completedAt", () => {
      const before = new Date();
      transaction.markSuccess();
      const after = new Date();
      const completedAt = transaction.getCompletedAt()!;
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should update updatedAt", () => {
      const before = transaction.getUpdatedAt();
      transaction.markSuccess();
      const after = transaction.getUpdatedAt();
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("should emit PaymentTransactionSucceededEvent", () => {
      transaction.markSuccess();
      const events = transaction.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(PaymentTransactionSucceededEvent);
      expect((events[0] as PaymentTransactionSucceededEvent).aggregateId).toBe(mockId);
    });

    it("should throw InvalidPaymentTransactionTransitionException when already SUCCESS", () => {
      transaction.markSuccess();
      expect(() => transaction.markSuccess()).toThrow(InvalidPaymentTransactionTransitionException);
    });

    it("should throw InvalidPaymentTransactionTransitionException when FAILED", () => {
      transaction.markFailed("Payment failed");
      expect(() => transaction.markSuccess()).toThrow(InvalidPaymentTransactionTransitionException);
    });
  });

  describe("markFailed", () => {
    let transaction: PaymentTransaction;

    beforeEach(() => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      transaction = PaymentTransaction.initiateCharge(data);
      transaction.pullDomainEvents();
    });

    it("should mark transaction as FAILED", () => {
      const reason = "Payment declined";
      transaction.markFailed(reason);
      expect(transaction.getStatus()).toBe(PaymentTransactionStatus.FAILED);
      expect(transaction.getFailureReason()).toBe(reason);
      expect(transaction.isSuccessful()).toBe(false);
    });

    it("should update metadata when provided", () => {
      const metadata = { errorCode: "123" };
      transaction.markFailed("Payment failed", metadata);
      expect(transaction.getMetadata()).toEqual(metadata);
    });

    it("should preserve metadata when not provided", () => {
      transaction.markFailed("Payment failed");
      expect(transaction.getMetadata()).toBeNull();
    });

    it("should set completedAt", () => {
      const before = new Date();
      transaction.markFailed("Payment failed");
      const after = new Date();
      const completedAt = transaction.getCompletedAt()!;
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should update updatedAt", () => {
      const before = transaction.getUpdatedAt();
      transaction.markFailed("Payment failed");
      const after = transaction.getUpdatedAt();
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("should emit PaymentTransactionFailedEvent", () => {
      const reason = "Payment declined";
      transaction.markFailed(reason);
      const events = transaction.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(PaymentTransactionFailedEvent);
      expect((events[0] as PaymentTransactionFailedEvent).aggregateId).toBe(mockId);
    });

    it("should throw InvalidPaymentTransactionTransitionException when already SUCCESS", () => {
      transaction.markSuccess();
      expect(() => transaction.markFailed("Payment failed")).toThrow(InvalidPaymentTransactionTransitionException);
    });

    it("should throw InvalidPaymentTransactionTransitionException when already FAILED", () => {
      transaction.markFailed("Payment failed");
      expect(() => transaction.markFailed("Another failure")).toThrow(InvalidPaymentTransactionTransitionException);
    });
  });

  describe("markExpired", () => {
    let transaction: PaymentTransaction;

    beforeEach(() => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      transaction = PaymentTransaction.initiateCharge(data);
      transaction.pullDomainEvents();
    });

    it("should mark transaction as EXPIRED", () => {
      transaction.markExpired();
      expect(transaction.getStatus()).toBe(PaymentTransactionStatus.EXPIRED);
      expect(transaction.isSuccessful()).toBe(false);
    });

    it("should set completedAt", () => {
      const before = new Date();
      transaction.markExpired();
      const after = new Date();
      const completedAt = transaction.getCompletedAt()!;
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should update updatedAt", () => {
      const before = transaction.getUpdatedAt();
      transaction.markExpired();
      const after = transaction.getUpdatedAt();
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("should emit PaymentTransactionExpiredEvent", () => {
      transaction.markExpired();
      const events = transaction.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(PaymentTransactionExpiredEvent);
      expect((events[0] as PaymentTransactionExpiredEvent).aggregateId).toBe(mockId);
    });

    it("should throw InvalidPaymentTransactionTransitionException when already SUCCESS", () => {
      transaction.markSuccess();
      expect(() => transaction.markExpired()).toThrow(InvalidPaymentTransactionTransitionException);
    });
  });

  describe("cancel", () => {
    let transaction: PaymentTransaction;

    beforeEach(() => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      transaction = PaymentTransaction.initiateCharge(data);
      transaction.pullDomainEvents();
    });

    it("should mark transaction as CANCELLED", () => {
      transaction.cancel();
      expect(transaction.getStatus()).toBe(PaymentTransactionStatus.CANCELLED);
      expect(transaction.isSuccessful()).toBe(false);
    });

    it("should set completedAt", () => {
      const before = new Date();
      transaction.cancel();
      const after = new Date();
      const completedAt = transaction.getCompletedAt()!;
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should update updatedAt", () => {
      const before = transaction.getUpdatedAt();
      transaction.cancel();
      const after = transaction.getUpdatedAt();
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("should emit PaymentTransactionCancelledEvent", () => {
      transaction.cancel();
      const events = transaction.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(PaymentTransactionCancelledEvent);
      expect((events[0] as PaymentTransactionCancelledEvent).aggregateId).toBe(mockId);
    });

    it("should throw InvalidPaymentTransactionTransitionException when already SUCCESS", () => {
      transaction.markSuccess();
      expect(() => transaction.cancel()).toThrow(InvalidPaymentTransactionTransitionException);
    });

    it("should throw InvalidPaymentTransactionTransitionException when already CANCELLED", () => {
      transaction.cancel();
      expect(() => transaction.cancel()).toThrow(InvalidPaymentTransactionTransitionException);
    });
  });

  describe("event emission", () => {
    it("should clear events after retrieval", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);

      expect(transaction.pullDomainEvents()).toHaveLength(1);
      expect(transaction.pullDomainEvents()).toHaveLength(0);
    });

    it("should emit multiple events for refund flow", () => {
      const chargeData: InitiateChargeCreationData = {
        id: "charge-123",
        orderId: mockOrderId,
        amount: 100000,
        method: mockMethod,
        provider: mockProvider,
      };
      const charge = PaymentTransaction.initiateCharge(chargeData);
      charge.markSuccess();

      const refundData: InitiateRefundCreationData = {
        id: "refund-123",
        parentTransaction: charge,
        previousRefunds: [],
        amount: 50000,
        reason: "Refund",
      };
      const refund = PaymentTransaction.initiateRefund(refundData);
      refund.markSuccess();

      const events = refund.pullDomainEvents();

      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(PaymentRefundInitiatedEvent);
      expect(events[1]).toBeInstanceOf(PaymentTransactionSucceededEvent);
    });
  });

  describe("edge cases and error scenarios", () => {
    it("should handle zero amount charge", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: 0,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      expect(transaction.getAmount().getAmount()).toBe(0);
      expect(transaction.getAmount().isZero()).toBe(true);
    });

    it("should throw NegativeMoneyAmountException for negative amount charge", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: -1000,
        method: mockMethod,
        provider: mockProvider,
      };
      expect(() => PaymentTransaction.initiateCharge(data)).toThrow(NegativeMoneyAmountException);
    });

    it("should handle large amounts", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: 9999999999,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      expect(transaction.getAmount().getAmount()).toBe(9999999999);
    });

    it("should handle empty provider", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: "",
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      expect(transaction.getProvider()).toBe("");
    });

    it("should handle long failure reason", () => {
      const longReason = "Payment failed " + "due to ".repeat(100);
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      transaction.markFailed(longReason);
      expect(transaction.getFailureReason()).toBe(longReason);
    });

    it("should handle long providerReferenceId", () => {
      const longRef = "ref-" + "a".repeat(1000);
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      transaction.markSuccess(undefined, longRef);
      expect(transaction.getProviderReferenceId()).toBe(longRef);
    });
  });

  describe("transaction validation", () => {
    it("should throw InvalidPaymentTransactionTransitionException with correct message", () => {
      const data: InitiateChargeCreationData = {
        id: mockId,
        orderId: mockOrderId,
        amount: mockAmount,
        method: mockMethod,
        provider: mockProvider,
      };
      const transaction = PaymentTransaction.initiateCharge(data);
      transaction.markSuccess();

      try {
        transaction.markFailed("Invalid transition");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPaymentTransactionTransitionException);
        expect((error as InvalidPaymentTransactionTransitionException).message).toContain(PaymentTransactionStatus.SUCCESS);
        expect((error as InvalidPaymentTransactionTransitionException).message).toContain(PaymentTransactionStatus.FAILED);
      }
    });

    it("should throw InvalidRefundSourceException with correct type", () => {
      const chargeData: InitiateChargeCreationData = {
        id: "charge-123",
        orderId: mockOrderId,
        amount: 100000,
        method: mockMethod,
        provider: mockProvider,
      };
      const charge = PaymentTransaction.initiateCharge(chargeData);
      charge.markSuccess();

      const refundData: InitiateRefundCreationData = {
        id: "refund-123",
        parentTransaction: charge,
        previousRefunds: [],
        amount: 50000,
        reason: "Refund",
      };
      const refund = PaymentTransaction.initiateRefund(refundData);

      const invalidData: InitiateRefundCreationData = {
        id: "refund-456",
        parentTransaction: refund,
        previousRefunds: [],
        amount: 25000,
        reason: "Refund from refund",
      };

      try {
        PaymentTransaction.initiateRefund(invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidRefundSourceException);
        expect((error as InvalidRefundSourceException).message).toContain(PaymentTransactionType.REFUND);
        expect((error as InvalidRefundSourceException).message).toContain(PaymentTransactionType.CHARGE);
      }
    });
  });
});
