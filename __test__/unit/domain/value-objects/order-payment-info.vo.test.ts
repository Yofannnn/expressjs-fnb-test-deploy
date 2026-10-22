import { OrderPaymentInfo } from "@/domain/value-objects/order-payment-info.vo";
import { PaymentMethod, PaymentStatus } from "@/domain/types/payment-transaction.type";
import { OrderPaymentInfoRebuildData } from "@/domain/types/order.type";
import { InvalidOrderPaymentStateTransitionException } from "@/domain/exceptions/order.exceptions";

describe("OrderPaymentInfo", () => {
  describe("unpaid", () => {
    it("should create an unpaid OrderPaymentInfo instance", () => {
      const paymentInfo = OrderPaymentInfo.unpaid();

      expect(paymentInfo).toBeInstanceOf(OrderPaymentInfo);
      expect(paymentInfo.getStatus()).toBe(PaymentStatus.UNPAID);
      expect(paymentInfo.getMethod()).toBeNull();
      expect(paymentInfo.getPaidAt()).toBeNull();
      expect(paymentInfo.getTransactionId()).toBeNull();
      expect(paymentInfo.isPaid()).toBe(false);
    });

    it("should return a new OrderPaymentInfo instance each time", () => {
      const paymentInfo1 = OrderPaymentInfo.unpaid();
      const paymentInfo2 = OrderPaymentInfo.unpaid();

      expect(paymentInfo1).not.toBe(paymentInfo2);
      expect(paymentInfo1.getStatus()).toBe(paymentInfo2.getStatus());
    });
  });

  describe("rebuild", () => {
    it("should rebuild a OrderPaymentInfo instance with all data", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);

      expect(paymentInfo).toBeInstanceOf(OrderPaymentInfo);
      expect(paymentInfo.getStatus()).toBe(PaymentStatus.PAID);
      expect(paymentInfo.getMethod()).toBe(PaymentMethod.CARD);
      expect(paymentInfo.getPaidAt()).toEqual(paidAt);
      expect(paymentInfo.getTransactionId()).toBe("txn-123456");
      expect(paymentInfo.isPaid()).toBe(true);
    });

    it("should rebuild an unpaid OrderPaymentInfo instance", () => {
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.UNPAID,
        method: null,
        paidAt: null,
        transactionId: null,
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);

      expect(paymentInfo.getStatus()).toBe(PaymentStatus.UNPAID);
      expect(paymentInfo.getMethod()).toBeNull();
      expect(paymentInfo.getPaidAt()).toBeNull();
      expect(paymentInfo.getTransactionId()).toBeNull();
      expect(paymentInfo.isPaid()).toBe(false);
    });

    it("should rebuild a failed OrderPaymentInfo instance", () => {
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.FAILED,
        method: PaymentMethod.QRIS,
        paidAt: null,
        transactionId: null,
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);

      expect(paymentInfo.getStatus()).toBe(PaymentStatus.FAILED);
      expect(paymentInfo.getMethod()).toBe(PaymentMethod.QRIS);
      expect(paymentInfo.getPaidAt()).toBeNull();
      expect(paymentInfo.getTransactionId()).toBeNull();
      expect(paymentInfo.isPaid()).toBe(false);
    });

    it("should rebuild a refunded OrderPaymentInfo instance", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.REFUNDED,
        method: PaymentMethod.E_WALLET,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);

      expect(paymentInfo.getStatus()).toBe(PaymentStatus.REFUNDED);
      expect(paymentInfo.getMethod()).toBe(PaymentMethod.E_WALLET);
      expect(paymentInfo.getPaidAt()).toEqual(paidAt);
      expect(paymentInfo.getTransactionId()).toBe("txn-123456");
      expect(paymentInfo.isPaid()).toBe(false);
    });

    it("should return a new OrderPaymentInfo instance", () => {
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-123456",
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);
      expect(paymentInfo).toBeInstanceOf(OrderPaymentInfo);
    });
  });

  describe("getters", () => {
    it("should return status", () => {
      const paymentInfo = OrderPaymentInfo.unpaid();
      expect(paymentInfo.getStatus()).toBe(PaymentStatus.UNPAID);
    });

    it("should return method", () => {
      const paymentInfo = OrderPaymentInfo.unpaid();
      expect(paymentInfo.getMethod()).toBeNull();
    });

    it("should return paidAt", () => {
      const paymentInfo = OrderPaymentInfo.unpaid();
      expect(paymentInfo.getPaidAt()).toBeNull();
    });

    it("should return transactionId", () => {
      const paymentInfo = OrderPaymentInfo.unpaid();
      expect(paymentInfo.getTransactionId()).toBeNull();
    });

    it("should return a copy of Date for paidAt", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);
      const returnedDate = paymentInfo.getPaidAt();

      expect(returnedDate).not.toBe(paidAt);
      expect(returnedDate).toEqual(paidAt);
    });

    it("should return null for paidAt when not set", () => {
      const paymentInfo = OrderPaymentInfo.unpaid();
      expect(paymentInfo.getPaidAt()).toBeNull();
    });
  });

  describe("isPaid", () => {
    it("should return true when status is PAID", () => {
      const paidAt = new Date();
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);
      expect(paymentInfo.isPaid()).toBe(true);
    });

    it("should return false when status is UNPAID", () => {
      const paymentInfo = OrderPaymentInfo.unpaid();
      expect(paymentInfo.isPaid()).toBe(false);
    });

    it("should return false when status is FAILED", () => {
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.FAILED,
        method: null,
        paidAt: null,
        transactionId: null,
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);
      expect(paymentInfo.isPaid()).toBe(false);
    });

    it("should return false when status is REFUNDED", () => {
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.REFUNDED,
        method: null,
        paidAt: null,
        transactionId: null,
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);
      expect(paymentInfo.isPaid()).toBe(false);
    });
  });

  describe("markAsPaid", () => {
    it("should mark unpaid payment as paid", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const paid = unpaid.markAsPaid(PaymentMethod.CARD, "txn-123456", paidAt);

      expect(paid).toBeInstanceOf(OrderPaymentInfo);
      expect(paid).not.toBe(unpaid);
      expect(paid.getStatus()).toBe(PaymentStatus.PAID);
      expect(paid.getMethod()).toBe(PaymentMethod.CARD);
      expect(paid.getPaidAt()).toEqual(paidAt);
      expect(paid.getTransactionId()).toBe("txn-123456");
      expect(paid.isPaid()).toBe(true);
    });

    it("should use current date when paidAt is not provided", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      const before = new Date();
      const paid = unpaid.markAsPaid(PaymentMethod.QRIS, "txn-789");
      const after = new Date();

      expect(paid.getStatus()).toBe(PaymentStatus.PAID);
      expect(paid.getMethod()).toBe(PaymentMethod.QRIS);
      expect(paid.getTransactionId()).toBe("txn-789");
      expect(paid.getPaidAt()).toBeInstanceOf(Date);
      expect(paid.getPaidAt()!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(paid.getPaidAt()!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should preserve immutability of original", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      const originalStatus = unpaid.getStatus();
      const originalMethod = unpaid.getMethod();
      const originalPaidAt = unpaid.getPaidAt();
      const originalTransactionId = unpaid.getTransactionId();

      unpaid.markAsPaid(PaymentMethod.CARD, "txn-123456");

      expect(unpaid.getStatus()).toBe(originalStatus);
      expect(unpaid.getMethod()).toBe(originalMethod);
      expect(unpaid.getPaidAt()).toBe(originalPaidAt);
      expect(unpaid.getTransactionId()).toBe(originalTransactionId);
    });

    it("should handle different payment methods", () => {
      const unpaid = OrderPaymentInfo.unpaid();

      const cashPayment = unpaid.markAsPaid(PaymentMethod.CASH, "txn-001");
      expect(cashPayment.getMethod()).toBe(PaymentMethod.CASH);

      const cardPayment = unpaid.markAsPaid(PaymentMethod.CARD, "txn-002");
      expect(cardPayment.getMethod()).toBe(PaymentMethod.CARD);

      const qrisPayment = unpaid.markAsPaid(PaymentMethod.QRIS, "txn-003");
      expect(qrisPayment.getMethod()).toBe(PaymentMethod.QRIS);

      const eWalletPayment = unpaid.markAsPaid(PaymentMethod.E_WALLET, "txn-004");
      expect(eWalletPayment.getMethod()).toBe(PaymentMethod.E_WALLET);

      const bankTransferPayment = unpaid.markAsPaid(PaymentMethod.BANK_TRANSFER, "txn-005");
      expect(bankTransferPayment.getMethod()).toBe(PaymentMethod.BANK_TRANSFER);

      const otherPayment = unpaid.markAsPaid(PaymentMethod.OTHER, "txn-006");
      expect(otherPayment.getMethod()).toBe(PaymentMethod.OTHER);
    });

    it("should throw InvalidOrderPaymentStateTransitionException when status is PAID", () => {
      const paidAt = new Date();
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      expect(() => paid.markAsPaid(PaymentMethod.QRIS, "txn-789")).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException when status is FAILED", () => {
      const paidAt = new Date();
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const failed = paid.markAsFailed();
      expect(() => failed.markAsPaid(PaymentMethod.CARD, "txn-789")).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException when status is REFUNDED", () => {
      const paidAt = new Date();
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const refunded = paid.markAsRefunded();
      expect(() => refunded.markAsPaid(PaymentMethod.CARD, "txn-789")).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException with correct error message", () => {
      const paid = OrderPaymentInfo.rebuild({
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-123456",
      });

      try {
        paid.markAsPaid(PaymentMethod.QRIS, "txn-789");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidOrderPaymentStateTransitionException);
        expect((error as InvalidOrderPaymentStateTransitionException).message).toContain(PaymentStatus.PAID);
        expect((error as InvalidOrderPaymentStateTransitionException).message).toContain(PaymentStatus.PAID);
      }
    });

    it("should handle empty transaction ID", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      const paid = unpaid.markAsPaid(PaymentMethod.CARD, "");

      expect(paid.getTransactionId()).toBe("");
    });

    it("should handle very long transaction ID", () => {
      const longTransactionId = "txn-" + "a".repeat(1000);
      const unpaid = OrderPaymentInfo.unpaid();
      const paid = unpaid.markAsPaid(PaymentMethod.CARD, longTransactionId);

      expect(paid.getTransactionId()).toBe(longTransactionId);
    });
  });

  describe("markAsFailed", () => {
    it("should mark paid payment as failed", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const failed = paid.markAsFailed();

      expect(failed).toBeInstanceOf(OrderPaymentInfo);
      expect(failed).not.toBe(paid);
      expect(failed.getStatus()).toBe(PaymentStatus.FAILED);
      expect(failed.getMethod()).toBe(PaymentMethod.CARD);
      expect(failed.getPaidAt()).toEqual(paidAt);
      expect(failed.getTransactionId()).toBe("txn-123456");
      expect(failed.isPaid()).toBe(false);
    });

    it("should preserve immutability of original", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const originalStatus = paid.getStatus();
      const originalMethod = paid.getMethod();
      const originalPaidAt = paid.getPaidAt();
      const originalTransactionId = paid.getTransactionId();

      paid.markAsFailed();

      expect(paid.getStatus()).toBe(originalStatus);
      expect(paid.getMethod()).toBe(originalMethod);
      expect(paid.getPaidAt()).toEqual(originalPaidAt);
      expect(paid.getTransactionId()).toBe(originalTransactionId);
    });

    it("should throw InvalidOrderPaymentStateTransitionException when unpaid", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      expect(() => unpaid.markAsFailed()).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException when already failed", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const failed = paid.markAsFailed();
      expect(() => failed.markAsFailed()).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException when refunded", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const refunded = paid.markAsRefunded();
      expect(() => refunded.markAsFailed()).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException with correct error message", () => {
      const unpaid = OrderPaymentInfo.unpaid();

      try {
        unpaid.markAsFailed();
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidOrderPaymentStateTransitionException);
        expect((error as InvalidOrderPaymentStateTransitionException).message).toContain(PaymentStatus.UNPAID);
        expect((error as InvalidOrderPaymentStateTransitionException).message).toContain(PaymentStatus.FAILED);
      }
    });
  });

  describe("markAsRefunded", () => {
    it("should mark paid payment as refunded", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const refunded = paid.markAsRefunded();

      expect(refunded).toBeInstanceOf(OrderPaymentInfo);
      expect(refunded).not.toBe(paid);
      expect(refunded.getStatus()).toBe(PaymentStatus.REFUNDED);
      expect(refunded.getMethod()).toBe(PaymentMethod.CARD);
      expect(refunded.getPaidAt()).toEqual(paidAt);
      expect(refunded.getTransactionId()).toBe("txn-123456");
      expect(refunded.isPaid()).toBe(false);
    });

    it("should preserve immutability of original", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const originalStatus = paid.getStatus();
      const originalMethod = paid.getMethod();
      const originalPaidAt = paid.getPaidAt();
      const originalTransactionId = paid.getTransactionId();

      paid.markAsRefunded();

      expect(paid.getStatus()).toBe(originalStatus);
      expect(paid.getMethod()).toBe(originalMethod);
      expect(paid.getPaidAt()).toEqual(originalPaidAt);
      expect(paid.getTransactionId()).toBe(originalTransactionId);
    });

    it("should throw InvalidOrderPaymentStateTransitionException when unpaid", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      expect(() => unpaid.markAsRefunded()).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException when failed", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const failed = paid.markAsFailed();
      expect(() => failed.markAsRefunded()).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException when already refunded", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const refunded = paid.markAsRefunded();
      expect(() => refunded.markAsRefunded()).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException with correct error message", () => {
      const unpaid = OrderPaymentInfo.unpaid();

      try {
        unpaid.markAsRefunded();
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidOrderPaymentStateTransitionException);
        expect((error as InvalidOrderPaymentStateTransitionException).message).toContain(PaymentStatus.UNPAID);
        expect((error as InvalidOrderPaymentStateTransitionException).message).toContain(PaymentStatus.REFUNDED);
      }
    });
  });

  describe("chaining operations", () => {
    it("should support method chaining for state transitions", () => {
      const paymentInfo = OrderPaymentInfo.unpaid().markAsPaid(PaymentMethod.CARD, "txn-123456").markAsRefunded();

      expect(paymentInfo.getStatus()).toBe(PaymentStatus.REFUNDED);
      expect(paymentInfo.getMethod()).toBe(PaymentMethod.CARD);
      expect(paymentInfo.getTransactionId()).toBe("txn-123456");
      expect(paymentInfo.isPaid()).toBe(false);
    });

    it("should handle chaining with immutability", () => {
      const original = OrderPaymentInfo.unpaid();
      const result = original.markAsPaid(PaymentMethod.CARD, "txn-123456").markAsFailed();

      expect(result.getStatus()).toBe(PaymentStatus.FAILED);
      expect(original.getStatus()).toBe(PaymentStatus.UNPAID);
    });

    it("should support chain: unpaid -> paid -> failed", () => {
      const result = OrderPaymentInfo.unpaid().markAsPaid(PaymentMethod.QRIS, "txn-001").markAsFailed();

      expect(result.getStatus()).toBe(PaymentStatus.FAILED);
      expect(result.getMethod()).toBe(PaymentMethod.QRIS);
      expect(result.getTransactionId()).toBe("txn-001");
      expect(result.getPaidAt()).toBeInstanceOf(Date);
    });

    it("should support chain: unpaid -> paid -> refunded", () => {
      const result = OrderPaymentInfo.unpaid().markAsPaid(PaymentMethod.E_WALLET, "txn-002").markAsRefunded();

      expect(result.getStatus()).toBe(PaymentStatus.REFUNDED);
      expect(result.getMethod()).toBe(PaymentMethod.E_WALLET);
      expect(result.getTransactionId()).toBe("txn-002");
      expect(result.getPaidAt()).toBeInstanceOf(Date);
    });
  });

  describe("immutability", () => {
    it("should return a new instance from markAsPaid", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      const paid = unpaid.markAsPaid(PaymentMethod.CARD, "txn-123456");

      expect(paid).not.toBe(unpaid);
      expect(paid.getStatus()).toBe(PaymentStatus.PAID);
      expect(unpaid.getStatus()).toBe(PaymentStatus.UNPAID);
    });

    it("should return a new instance from markAsFailed", () => {
      const paidAt = new Date();
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const failed = paid.markAsFailed();

      expect(failed).not.toBe(paid);
      expect(failed.getStatus()).toBe(PaymentStatus.FAILED);
      expect(paid.getStatus()).toBe(PaymentStatus.PAID);
    });

    it("should return a new instance from markAsRefunded", () => {
      const paidAt = new Date();
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const refunded = paid.markAsRefunded();

      expect(refunded).not.toBe(paid);
      expect(refunded.getStatus()).toBe(PaymentStatus.REFUNDED);
      expect(paid.getStatus()).toBe(PaymentStatus.PAID);
    });

    it("should return a new instance from unpaid each time", () => {
      const paymentInfo1 = OrderPaymentInfo.unpaid();
      const paymentInfo2 = OrderPaymentInfo.unpaid();

      expect(paymentInfo1).not.toBe(paymentInfo2);
      expect(paymentInfo1.getStatus()).toBe(paymentInfo2.getStatus());
    });

    it("should return a new instance from rebuild each time", () => {
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-123456",
      };

      const paymentInfo1 = OrderPaymentInfo.rebuild(data);
      const paymentInfo2 = OrderPaymentInfo.rebuild(data);

      expect(paymentInfo1).not.toBe(paymentInfo2);
      expect(paymentInfo1.getStatus()).toBe(paymentInfo2.getStatus());
      expect(paymentInfo1.getMethod()).toBe(paymentInfo2.getMethod());
      expect(paymentInfo1.getTransactionId()).toBe(paymentInfo2.getTransactionId());
    });
  });

  describe("edge cases", () => {
    it("should handle date with timezone", () => {
      const paidAt = new Date("2024-01-15T10:30:00+07:00");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);
      expect(paymentInfo.getPaidAt()).toEqual(paidAt);
    });

    it("should handle current date correctly in markAsPaid", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      const before = new Date();
      const paid = unpaid.markAsPaid(PaymentMethod.CARD, "txn-123456");
      const after = new Date();

      const paidAt = paid.getPaidAt()!;
      expect(paidAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(paidAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should handle invalid date strings when rebuilding", () => {
      const invalidDate = new Date("invalid");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: invalidDate,
        transactionId: "txn-123456",
      };

      const paymentInfo = OrderPaymentInfo.rebuild(data);
      expect(paymentInfo.getPaidAt()).toBeInstanceOf(Date);
      expect(isNaN(paymentInfo.getPaidAt()!.getTime())).toBe(true);
    });

    it("should handle transactionId with special characters", () => {
      const specialId = "txn-!@#$%^&*()_+{}|:<>?~";
      const unpaid = OrderPaymentInfo.unpaid();
      const paid = unpaid.markAsPaid(PaymentMethod.CARD, specialId);

      expect(paid.getTransactionId()).toBe(specialId);
    });

    it("should handle Unicode characters in transactionId", () => {
      const unicodeId = "txn-🔐✨payment🚀";
      const unpaid = OrderPaymentInfo.unpaid();
      const paid = unpaid.markAsPaid(PaymentMethod.CARD, unicodeId);

      expect(paid.getTransactionId()).toBe(unicodeId);
    });
  });

  describe("consistency", () => {
    it("should maintain consistency between unpaid and rebuild", () => {
      const fromUnpaid = OrderPaymentInfo.unpaid();
      const fromRebuild = OrderPaymentInfo.rebuild({
        status: PaymentStatus.UNPAID,
        method: null,
        paidAt: null,
        transactionId: null,
      });

      expect(fromUnpaid.getStatus()).toBe(fromRebuild.getStatus());
      expect(fromUnpaid.getMethod()).toBe(fromRebuild.getMethod());
      expect(fromUnpaid.getPaidAt()).toBe(fromRebuild.getPaidAt());
      expect(fromUnpaid.getTransactionId()).toBe(fromRebuild.getTransactionId());
    });

    it("should maintain consistency across state transitions", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      const paid = unpaid.markAsPaid(PaymentMethod.CARD, "txn-123456");
      const failed = paid.markAsFailed();

      expect(failed.getStatus()).toBe(PaymentStatus.FAILED);
      expect(failed.getMethod()).toBe(PaymentMethod.CARD);
      expect(failed.getTransactionId()).toBe("txn-123456");
      expect(failed.getPaidAt()).toEqual(paid.getPaidAt());
    });

    it("should maintain payment data through status changes", () => {
      const paidAt = new Date("2024-01-15T10:30:00Z");
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const refunded = paid.markAsRefunded();

      expect(refunded.getMethod()).toBe(PaymentMethod.CARD);
      expect(refunded.getTransactionId()).toBe("txn-123456");
      expect(refunded.getPaidAt()).toEqual(paidAt);
    });
  });

  describe("error scenarios", () => {
    it("should throw InvalidOrderPaymentStateTransitionException with correct status and next for markAsPaid", () => {
      const paid = OrderPaymentInfo.rebuild({
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-123456",
      });

      try {
        paid.markAsPaid(PaymentMethod.QRIS, "txn-789");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidOrderPaymentStateTransitionException);
        expect((error as InvalidOrderPaymentStateTransitionException).message).toContain(PaymentStatus.PAID);
        expect((error as InvalidOrderPaymentStateTransitionException).message).toContain(PaymentStatus.PAID);
      }
    });

    it("should throw InvalidOrderPaymentStateTransitionException for invalid transition from FAILED to PAID", () => {
      const paidAt = new Date();
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const failed = paid.markAsFailed();
      expect(() => failed.markAsPaid(PaymentMethod.CARD, "txn-789")).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException for invalid transition from REFUNDED to PAID", () => {
      const paidAt = new Date();
      const data: OrderPaymentInfoRebuildData = {
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: paidAt,
        transactionId: "txn-123456",
      };

      const paid = OrderPaymentInfo.rebuild(data);
      const refunded = paid.markAsRefunded();
      expect(() => refunded.markAsPaid(PaymentMethod.CARD, "txn-789")).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException for invalid transition from UNPAID to FAILED", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      expect(() => unpaid.markAsFailed()).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should throw InvalidOrderPaymentStateTransitionException for invalid transition from UNPAID to REFUNDED", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      expect(() => unpaid.markAsRefunded()).toThrow(InvalidOrderPaymentStateTransitionException);
    });
  });

  describe("state machine validation", () => {
    it("should only allow UNPAID -> PAID transition", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      expect(() => unpaid.markAsPaid(PaymentMethod.CARD, "txn-001")).not.toThrow();

      const paid = OrderPaymentInfo.rebuild({
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-001",
      });
      expect(() => paid.markAsPaid(PaymentMethod.CARD, "txn-002")).toThrow(InvalidOrderPaymentStateTransitionException);

      const failed = OrderPaymentInfo.rebuild({
        status: PaymentStatus.FAILED,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-001",
      });
      expect(() => failed.markAsPaid(PaymentMethod.CARD, "txn-002")).toThrow(InvalidOrderPaymentStateTransitionException);

      const refunded = OrderPaymentInfo.rebuild({
        status: PaymentStatus.REFUNDED,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-001",
      });
      expect(() => refunded.markAsPaid(PaymentMethod.CARD, "txn-002")).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should only allow PAID -> FAILED transition", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      expect(() => unpaid.markAsFailed()).toThrow(InvalidOrderPaymentStateTransitionException);

      const paid = OrderPaymentInfo.rebuild({
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-001",
      });
      expect(() => paid.markAsFailed()).not.toThrow();

      const failed = OrderPaymentInfo.rebuild({
        status: PaymentStatus.FAILED,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-001",
      });
      expect(() => failed.markAsFailed()).toThrow(InvalidOrderPaymentStateTransitionException);

      const refunded = OrderPaymentInfo.rebuild({
        status: PaymentStatus.REFUNDED,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-001",
      });
      expect(() => refunded.markAsFailed()).toThrow(InvalidOrderPaymentStateTransitionException);
    });

    it("should only allow PAID -> REFUNDED transition", () => {
      const unpaid = OrderPaymentInfo.unpaid();
      expect(() => unpaid.markAsRefunded()).toThrow(InvalidOrderPaymentStateTransitionException);

      const paid = OrderPaymentInfo.rebuild({
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-001",
      });
      expect(() => paid.markAsRefunded()).not.toThrow();

      const failed = OrderPaymentInfo.rebuild({
        status: PaymentStatus.FAILED,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-001",
      });
      expect(() => failed.markAsRefunded()).toThrow(InvalidOrderPaymentStateTransitionException);

      const refunded = OrderPaymentInfo.rebuild({
        status: PaymentStatus.REFUNDED,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
        transactionId: "txn-001",
      });
      expect(() => refunded.markAsRefunded()).toThrow(InvalidOrderPaymentStateTransitionException);
    });
  });
});
