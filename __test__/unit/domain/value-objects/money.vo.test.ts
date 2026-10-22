import { Money } from "@/domain/value-objects/money.vo";
import { InsufficientMoneyAmountException, NegativeMoneyAmountException, InvalidMoneyDivisionException } from "@/domain/exceptions/money.exceptions";
import { InvalidNumericArgumentException } from "@/domain/exceptions/invalid-argument.exceptions";

describe("Money", () => {
  describe("constructor", () => {
    it("should create a Money instance with a valid positive integer amount", () => {
      const money = new Money(100);
      expect(money.getAmount()).toBe(100);
    });

    it("should create a Money instance with a valid zero amount", () => {
      const money = new Money(0);
      expect(money.getAmount()).toBe(0);
    });

    it("should throw Error when amount is not an integer", () => {
      expect(() => new Money(100.5)).toThrow("Money amount must be an integer (Rupiah).");
      expect(() => new Money(99.99)).toThrow("Money amount must be an integer (Rupiah).");
      expect(() => new Money(0.01)).toThrow("Money amount must be an integer (Rupiah).");
    });

    it("should throw NegativeMoneyAmountException when amount is negative", () => {
      expect(() => new Money(-1)).toThrow(NegativeMoneyAmountException);
      expect(() => new Money(-100)).toThrow(NegativeMoneyAmountException);
    });

    it("should throw NegativeMoneyAmountException with the correct amount in error", () => {
      const negativeAmount = -50;
      try {
        new Money(negativeAmount);
      } catch (error) {
        expect(error).toBeInstanceOf(NegativeMoneyAmountException);
        expect((error as NegativeMoneyAmountException).message).toContain(String(negativeAmount));
      }
    });

    it("should handle very large integer amounts", () => {
      const largeAmount = 9999999999;
      const money = new Money(largeAmount);
      expect(money.getAmount()).toBe(largeAmount);
    });

    it("should handle very small positive integer amounts", () => {
      const smallAmount = 1;
      const money = new Money(smallAmount);
      expect(money.getAmount()).toBe(smallAmount);
    });
  });

  describe("getAmount", () => {
    it("should return the correct amount", () => {
      const amount = 42;
      const money = new Money(amount);
      expect(money.getAmount()).toBe(amount);
    });
  });

  describe("isGreaterThan", () => {
    it("should return true when amount is greater than other", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      expect(money1.isGreaterThan(money2)).toBe(true);
    });

    it("should return false when amount is less than other", () => {
      const money1 = new Money(50);
      const money2 = new Money(100);
      expect(money1.isGreaterThan(money2)).toBe(false);
    });

    it("should return false when amounts are equal", () => {
      const money1 = new Money(100);
      const money2 = new Money(100);
      expect(money1.isGreaterThan(money2)).toBe(false);
    });

    it("should handle zero amounts correctly", () => {
      const money1 = new Money(0);
      const money2 = new Money(0);
      expect(money1.isGreaterThan(money2)).toBe(false);

      const money3 = new Money(1);
      expect(money3.isGreaterThan(money1)).toBe(true);
    });
  });

  describe("isGreaterThanOrEqual", () => {
    it("should return true when amount is greater than other", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      expect(money1.isGreaterThanOrEqual(money2)).toBe(true);
    });

    it("should return true when amounts are equal", () => {
      const money1 = new Money(100);
      const money2 = new Money(100);
      expect(money1.isGreaterThanOrEqual(money2)).toBe(true);
    });

    it("should return false when amount is less than other", () => {
      const money1 = new Money(50);
      const money2 = new Money(100);
      expect(money1.isGreaterThanOrEqual(money2)).toBe(false);
    });

    it("should handle zero amounts correctly", () => {
      const money1 = new Money(0);
      const money2 = new Money(0);
      expect(money1.isGreaterThanOrEqual(money2)).toBe(true);

      const money3 = new Money(1);
      expect(money3.isGreaterThanOrEqual(money1)).toBe(true);
    });
  });

  describe("isLessThan", () => {
    it("should return true when amount is less than other", () => {
      const money1 = new Money(50);
      const money2 = new Money(100);
      expect(money1.isLessThan(money2)).toBe(true);
    });

    it("should return false when amount is greater than other", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      expect(money1.isLessThan(money2)).toBe(false);
    });

    it("should return false when amounts are equal", () => {
      const money1 = new Money(100);
      const money2 = new Money(100);
      expect(money1.isLessThan(money2)).toBe(false);
    });

    it("should handle zero amounts correctly", () => {
      const money1 = new Money(0);
      const money2 = new Money(0);
      expect(money1.isLessThan(money2)).toBe(false);

      const money3 = new Money(1);
      expect(money1.isLessThan(money3)).toBe(true);
    });
  });

  describe("isLessThanOrEqual", () => {
    it("should return true when amount is less than other", () => {
      const money1 = new Money(50);
      const money2 = new Money(100);
      expect(money1.isLessThanOrEqual(money2)).toBe(true);
    });

    it("should return true when amounts are equal", () => {
      const money1 = new Money(100);
      const money2 = new Money(100);
      expect(money1.isLessThanOrEqual(money2)).toBe(true);
    });

    it("should return false when amount is greater than other", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      expect(money1.isLessThanOrEqual(money2)).toBe(false);
    });

    it("should handle zero amounts correctly", () => {
      const money1 = new Money(0);
      const money2 = new Money(0);
      expect(money1.isLessThanOrEqual(money2)).toBe(true);

      const money3 = new Money(1);
      expect(money1.isLessThanOrEqual(money3)).toBe(true);
    });
  });

  describe("isEqualTo", () => {
    it("should return true when amounts are equal", () => {
      const money1 = new Money(100);
      const money2 = new Money(100);
      expect(money1.isEqualTo(money2)).toBe(true);
    });

    it("should return false when amounts are not equal", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      expect(money1.isEqualTo(money2)).toBe(false);
    });

    it("should handle zero amounts correctly", () => {
      const money1 = new Money(0);
      const money2 = new Money(0);
      expect(money1.isEqualTo(money2)).toBe(true);
    });
  });

  describe("isZero", () => {
    it("should return true when amount is zero", () => {
      const money = new Money(0);
      expect(money.isZero()).toBe(true);
    });

    it("should return false when amount is positive", () => {
      const money = new Money(100);
      expect(money.isZero()).toBe(false);
    });

    it("should return false when amount is negative", () => {
      const money = new Money(0);
      expect(money.isZero()).toBe(true);
    });
  });

  describe("toString", () => {
    it("should return the amount as a string", () => {
      const money = new Money(100);
      expect(money.toString()).toBe("100");
    });

    it("should format zero correctly", () => {
      const money = new Money(0);
      expect(money.toString()).toBe("0");
    });

    it("should format large amounts correctly", () => {
      const money = new Money(1234567);
      expect(money.toString()).toBe("1234567");
    });
  });

  describe("add", () => {
    it("should add two positive amounts correctly", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      const result = money1.add(money2);
      expect(result.getAmount()).toBe(150);
    });

    it("should return a new Money instance", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      const result = money1.add(money2);
      expect(result).toBeInstanceOf(Money);
      expect(result).not.toBe(money1);
      expect(result).not.toBe(money2);
    });

    it("should add zero correctly", () => {
      const money1 = new Money(100);
      const money2 = new Money(0);
      const result = money1.add(money2);
      expect(result.getAmount()).toBe(100);
    });

    it("should handle adding large amounts", () => {
      const money1 = new Money(9999999999);
      const money2 = new Money(1);
      const result = money1.add(money2);
      expect(result.getAmount()).toBe(10000000000);
    });

    it("should preserve immutability when adding", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      const originalAmount1 = money1.getAmount();
      const originalAmount2 = money2.getAmount();

      money1.add(money2);

      expect(money1.getAmount()).toBe(originalAmount1);
      expect(money2.getAmount()).toBe(originalAmount2);
    });
  });

  describe("subtract", () => {
    it("should subtract two positive amounts correctly", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      const result = money1.subtract(money2);
      expect(result.getAmount()).toBe(50);
    });

    it("should return a new Money instance", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      const result = money1.subtract(money2);
      expect(result).toBeInstanceOf(Money);
      expect(result).not.toBe(money1);
      expect(result).not.toBe(money2);
    });

    it("should subtract zero correctly", () => {
      const money1 = new Money(100);
      const money2 = new Money(0);
      const result = money1.subtract(money2);
      expect(result.getAmount()).toBe(100);
    });

    it("should throw InsufficientMoneyAmountException when result would be negative", () => {
      const money1 = new Money(50);
      const money2 = new Money(100);
      expect(() => money1.subtract(money2)).toThrow(InsufficientMoneyAmountException);
    });

    it("should throw InsufficientMoneyAmountException with correct details", () => {
      const money1 = new Money(50);
      const money2 = new Money(100);
      try {
        money1.subtract(money2);
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientMoneyAmountException);
        expect((error as InsufficientMoneyAmountException).message).toContain("100");
        expect((error as InsufficientMoneyAmountException).message).toContain("50");
      }
    });

    it("should allow subtraction resulting in zero", () => {
      const money1 = new Money(100);
      const money2 = new Money(100);
      const result = money1.subtract(money2);
      expect(result.getAmount()).toBe(0);
      expect(result.isZero()).toBe(true);
    });

    it("should preserve immutability when subtracting", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      const originalAmount1 = money1.getAmount();
      const originalAmount2 = money2.getAmount();

      money1.subtract(money2);

      expect(money1.getAmount()).toBe(originalAmount1);
      expect(money2.getAmount()).toBe(originalAmount2);
    });
  });

  describe("multiply", () => {
    it("should multiply amount by a positive integer", () => {
      const money = new Money(100);
      const result = money.multiply(3);
      expect(result.getAmount()).toBe(300);
    });

    it("should return a new Money instance", () => {
      const money = new Money(100);
      const result = money.multiply(2);
      expect(result).toBeInstanceOf(Money);
      expect(result).not.toBe(money);
    });

    it("should multiply by zero correctly", () => {
      const money = new Money(100);
      const result = money.multiply(0);
      expect(result.getAmount()).toBe(0);
      expect(result.isZero()).toBe(true);
    });

    it("should multiply by 1 correctly", () => {
      const money = new Money(100);
      const result = money.multiply(1);
      expect(result.getAmount()).toBe(100);
    });

    it("should multiply by fractional quantities with rounding", () => {
      const money = new Money(100);
      const result = money.multiply(0.5);
      expect(result.getAmount()).toBe(50);
    });

    it("should round fractional results correctly", () => {
      const money = new Money(100);
      expect(money.multiply(0.333).getAmount()).toBe(33);
      expect(money.multiply(0.667).getAmount()).toBe(67);
    });

    it("should throw NegativeMoneyAmountException when quantity is negative", () => {
      const money = new Money(100);
      expect(() => money.multiply(-1)).toThrow(InvalidNumericArgumentException);
      expect(() => money.multiply(-2.5)).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException when quantity is NaN", () => {
      const money = new Money(100);
      expect(() => money.multiply(NaN)).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException when quantity is Infinity", () => {
      const money = new Money(100);
      expect(() => money.multiply(Infinity)).toThrow(InvalidNumericArgumentException);
      expect(() => money.multiply(-Infinity)).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException with correct amount in error", () => {
      const money = new Money(100);
      const negativeQuantity = -5;
      try {
        money.multiply(negativeQuantity);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidNumericArgumentException);
        expect((error as InvalidNumericArgumentException).message).toContain(String(negativeQuantity));
      }
    });

    it("should preserve immutability when multiplying", () => {
      const money = new Money(100);
      const originalAmount = money.getAmount();

      money.multiply(2);

      expect(money.getAmount()).toBe(originalAmount);
    });

    it("should handle multiplying by very large quantities", () => {
      const money = new Money(1);
      const result = money.multiply(Number.MAX_SAFE_INTEGER);
      expect(result.getAmount()).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe("divide", () => {
    it("should divide amount by a positive integer", () => {
      const money = new Money(100);
      const result = money.divide(2);
      expect(result.getAmount()).toBe(50);
    });

    it("should return a new Money instance", () => {
      const money = new Money(100);
      const result = money.divide(2);
      expect(result).toBeInstanceOf(Money);
      expect(result).not.toBe(money);
    });

    it("should round division results correctly", () => {
      const money = new Money(100);
      expect(money.divide(3).getAmount()).toBe(33);
      expect(money.divide(7).getAmount()).toBe(14);
    });

    it("should divide by 1 correctly", () => {
      const money = new Money(100);
      const result = money.divide(1);
      expect(result.getAmount()).toBe(100);
    });

    it("should throw InvalidMoneyDivisionException when divisor is zero", () => {
      const money = new Money(100);
      expect(() => money.divide(0)).toThrow(InvalidMoneyDivisionException);
    });

    it("should throw InvalidMoneyDivisionException when divisor is negative", () => {
      const money = new Money(100);
      expect(() => money.divide(-2)).toThrow(InvalidMoneyDivisionException);
    });

    it("should throw InvalidMoneyDivisionException when divisor is NaN", () => {
      const money = new Money(100);
      expect(() => money.divide(NaN)).toThrow(InvalidMoneyDivisionException);
    });

    it("should throw InvalidMoneyDivisionException when divisor is Infinity", () => {
      const money = new Money(100);
      expect(() => money.divide(Infinity)).toThrow(InvalidMoneyDivisionException);
      expect(() => money.divide(-Infinity)).toThrow(InvalidMoneyDivisionException);
    });

    it("should throw InvalidMoneyDivisionException with correct divisor in error", () => {
      const money = new Money(100);
      const divisor = 0;
      try {
        money.divide(divisor);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidMoneyDivisionException);
        expect((error as InvalidMoneyDivisionException).message).toContain(String(divisor));
      }
    });

    it("should preserve immutability when dividing", () => {
      const money = new Money(100);
      const originalAmount = money.getAmount();

      money.divide(2);

      expect(money.getAmount()).toBe(originalAmount);
    });

    it("should divide by fractional divisors", () => {
      const money = new Money(100);
      expect(money.divide(0.5).getAmount()).toBe(200);
      expect(money.divide(0.333).getAmount()).toBe(300);
    });
  });

  describe("percentage", () => {
    it("should calculate percentage correctly", () => {
      const money = new Money(1000);
      expect(money.percentage(10).getAmount()).toBe(100);
      expect(money.percentage(25).getAmount()).toBe(250);
      expect(money.percentage(100).getAmount()).toBe(1000);
    });

    it("should round percentage results correctly", () => {
      const money = new Money(100);
      expect(money.percentage(33).getAmount()).toBe(33);
      expect(money.percentage(67).getAmount()).toBe(67);
    });

    it("should handle 0% correctly", () => {
      const money = new Money(1000);
      const result = money.percentage(0);
      expect(result.getAmount()).toBe(0);
      expect(result.isZero()).toBe(true);
    });

    it("should throw NegativeMoneyAmountException when rate is negative", () => {
      const money = new Money(100);
      expect(() => money.percentage(-10)).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException when rate is NaN", () => {
      const money = new Money(100);
      expect(() => money.percentage(NaN)).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException when rate is Infinity", () => {
      const money = new Money(100);
      expect(() => money.percentage(Infinity)).toThrow(InvalidNumericArgumentException);
    });

    it("should preserve immutability when calculating percentage", () => {
      const money = new Money(1000);
      const originalAmount = money.getAmount();

      money.percentage(10);

      expect(money.getAmount()).toBe(originalAmount);
    });

    it("should handle fractional rates", () => {
      const money = new Money(100);
      expect(money.percentage(0.5).getAmount()).toBe(1);
      expect(money.percentage(1.5).getAmount()).toBe(2);
    });
  });

  describe("static methods", () => {
    describe("zero", () => {
      it("should create a Money instance with zero amount", () => {
        const zero = Money.zero();
        expect(zero).toBeInstanceOf(Money);
        expect(zero.getAmount()).toBe(0);
        expect(zero.isZero()).toBe(true);
      });
    });

    describe("min", () => {
      it("should return the smaller of two Money instances", () => {
        const money1 = new Money(100);
        const money2 = new Money(50);
        const result = Money.min(money1, money2);
        expect(result.getAmount()).toBe(50);
        expect(result).toBe(money2);
      });

      it("should return either when amounts are equal", () => {
        const money1 = new Money(100);
        const money2 = new Money(100);
        const result = Money.min(money1, money2);
        expect(result.getAmount()).toBe(100);
      });
    });

    describe("max", () => {
      it("should return the larger of two Money instances", () => {
        const money1 = new Money(100);
        const money2 = new Money(50);
        const result = Money.max(money1, money2);
        expect(result.getAmount()).toBe(100);
        expect(result).toBe(money1);
      });

      it("should return either when amounts are equal", () => {
        const money1 = new Money(100);
        const money2 = new Money(100);
        const result = Money.max(money1, money2);
        expect(result.getAmount()).toBe(100);
      });
    });

    describe("fromNumber", () => {
      it("should round the number and create a Money instance", () => {
        expect(Money.fromNumber(100.5).getAmount()).toBe(101);
        expect(Money.fromNumber(99.49).getAmount()).toBe(99);
        expect(Money.fromNumber(100).getAmount()).toBe(100);
      });

      it("should handle zero correctly", () => {
        const money = Money.fromNumber(0);
        expect(money.getAmount()).toBe(0);
        expect(money.isZero()).toBe(true);
      });

      it("should throw NegativeMoneyAmountException when amount is negative", () => {
        expect(() => Money.fromNumber(-10)).toThrow(NegativeMoneyAmountException);
      });

      it("should handle very large numbers", () => {
        const largeNumber = 9999999999.9;
        const money = Money.fromNumber(largeNumber);
        expect(money.getAmount()).toBe(10000000000);
      });
    });
  });

  describe("chaining operations", () => {
    it("should support method chaining for calculations", () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      const money3 = new Money(25);

      const result = money1.add(money2).subtract(money3).multiply(2);

      expect(result.getAmount()).toBe(250);
    });

    it("should handle complex chaining with immutability", () => {
      const original = new Money(100);
      const result = original.add(new Money(50)).multiply(2).subtract(new Money(50));

      expect(result.getAmount()).toBe(250);
      expect(original.getAmount()).toBe(100);
    });
  });

  describe("edge cases and extreme values", () => {
    it("should handle amount as integer", () => {
      const money = new Money(100);
      expect(money.getAmount()).toBe(100);
    });

    it("should handle adding to infinity", () => {
      const money1 = new Money(Number.MAX_SAFE_INTEGER);
      const money2 = new Money(Number.MAX_SAFE_INTEGER);
      const result = money1.add(money2);
      expect(result.getAmount()).toBe(Number.MAX_SAFE_INTEGER * 2);
    });

    it("should handle subtracting from very large numbers", () => {
      const money1 = new Money(Number.MAX_SAFE_INTEGER);
      const money2 = new Money(1);
      const result = money1.subtract(money2);
      expect(result.getAmount()).toBe(Number.MAX_SAFE_INTEGER - 1);
    });

    it("should handle division with rounding to nearest integer", () => {
      const money = new Money(10);
      expect(money.divide(3).getAmount()).toBe(3);
      expect(money.divide(4).getAmount()).toBe(3);
      expect(money.divide(6).getAmount()).toBe(2);
    });

    it("should handle multiplication with rounding to nearest integer", () => {
      const money = new Money(10);
      expect(money.multiply(0.333).getAmount()).toBe(3);
      expect(money.multiply(0.667).getAmount()).toBe(7);
    });
  });

  describe("type safety and edge conditions", () => {
    it("should not allow negative amount in constructor", () => {
      expect(() => new Money(-1)).toThrow(NegativeMoneyAmountException);
      expect(() => new Money(-100)).toThrow(NegativeMoneyAmountException);
    });

    it("should not allow non-integer amount in constructor", () => {
      expect(() => new Money(100.5)).toThrow("Money amount must be an integer (Rupiah).");
      expect(() => new Money(0.01)).toThrow("Money amount must be an integer (Rupiah).");
    });

    it("should handle subtraction that results in exactly zero", () => {
      const money1 = new Money(50);
      const money2 = new Money(50);
      const result = money1.subtract(money2);
      expect(result.isZero()).toBe(true);
      expect(result.getAmount()).toBe(0);
    });

    it("should handle comparisons with zero correctly", () => {
      const zero = new Money(0);
      const positive = new Money(10);

      expect(positive.isGreaterThan(zero)).toBe(true);
      expect(zero.isLessThan(positive)).toBe(true);
      expect(zero.isEqualTo(zero)).toBe(true);
      expect(zero.isZero()).toBe(true);
    });

    it("should handle isGreaterThanOrEqual correctly", () => {
      const money1 = new Money(100);
      const money2 = new Money(100);
      const money3 = new Money(50);

      expect(money1.isGreaterThanOrEqual(money2)).toBe(true);
      expect(money1.isGreaterThanOrEqual(money3)).toBe(true);
      expect(money3.isGreaterThanOrEqual(money1)).toBe(false);
    });

    it("should handle isLessThanOrEqual correctly", () => {
      const money1 = new Money(100);
      const money2 = new Money(100);
      const money3 = new Money(50);

      expect(money1.isLessThanOrEqual(money2)).toBe(true);
      expect(money3.isLessThanOrEqual(money1)).toBe(true);
      expect(money1.isLessThanOrEqual(money3)).toBe(false);
    });
  });

  describe("performance and consistency", () => {
    it("should maintain consistency across multiple operations", () => {
      const money = new Money(100);
      const result1 = money.add(new Money(50));
      const result2 = result1.subtract(new Money(25));
      const result3 = result2.multiply(2);

      expect(result3.getAmount()).toBe(250);
    });

    it("should produce same result regardless of operation order (when associative)", () => {
      const m1 = new Money(10);
      const m2 = new Money(20);
      const m3 = new Money(30);

      const result1 = m1.add(m2).add(m3);
      const result2 = m1.add(m2.add(m3));

      expect(result1.getAmount()).toBe(result2.getAmount());
    });

    it("should handle operations with zero correctly", () => {
      const zero = Money.zero();
      const money = new Money(100);

      expect(money.add(zero).getAmount()).toBe(100);
      expect(money.subtract(zero).getAmount()).toBe(100);
      expect(money.multiply(0).getAmount()).toBe(0);
      expect(zero.add(money).getAmount()).toBe(100);
    });
  });

  describe("validation and error scenarios", () => {
    it("should throw InvalidMoneyDivisionException when dividing by zero", () => {
      const money = new Money(100);
      expect(() => money.divide(0)).toThrow(InvalidMoneyDivisionException);
    });

    it("should throw InvalidMoneyDivisionException when dividing by negative number", () => {
      const money = new Money(100);
      expect(() => money.divide(-5)).toThrow(InvalidMoneyDivisionException);
    });

    it("should throw InvalidMoneyDivisionException when dividing by NaN", () => {
      const money = new Money(100);
      expect(() => money.divide(NaN)).toThrow(InvalidMoneyDivisionException);
    });

    it("should throw InvalidMoneyDivisionException when dividing by Infinity", () => {
      const money = new Money(100);
      expect(() => money.divide(Infinity)).toThrow(InvalidMoneyDivisionException);
    });

    it("should throw NegativeMoneyAmountException when multiplying by negative factor", () => {
      const money = new Money(100);
      expect(() => money.multiply(-5)).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException when multiplying by NaN", () => {
      const money = new Money(100);
      expect(() => money.multiply(NaN)).toThrow(InvalidNumericArgumentException);
    });

    it("should throw NegativeMoneyAmountException when multiplying by Infinity", () => {
      const money = new Money(100);
      expect(() => money.multiply(Infinity)).toThrow(InvalidNumericArgumentException);
    });
  });
});
