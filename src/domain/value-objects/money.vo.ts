import { InvalidNumericArgumentException } from "../exceptions/invalid-argument.exceptions";
import {
  InsufficientMoneyAmountException,
  InvalidMoneyAmountException,
  InvalidMoneyDivisionException,
  NegativeMoneyAmountException,
} from "../exceptions/money.exceptions";

export class Money {
  constructor(private readonly amount: number) {
    if (!Number.isInteger(amount)) throw new InvalidMoneyAmountException("Money amount must be an integer (Rupiah).");
    if (amount < 0) throw new NegativeMoneyAmountException(amount);
  }

  getAmount(): number {
    return this.amount;
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    const result = this.amount - other.amount;

    if (result < 0) throw new InsufficientMoneyAmountException(other.amount, this.amount);

    return new Money(result);
  }

  multiply(factor: number): Money {
    if (!Number.isFinite(factor) || factor < 0) throw new InvalidNumericArgumentException("factor", factor, "must be finite and non-negative");

    return new Money(Math.round(this.amount * factor));
  }

  divide(divisor: number): Money {
    if (!Number.isFinite(divisor) || divisor <= 0) throw new InvalidMoneyDivisionException(divisor);

    return new Money(Math.round(this.amount / divisor));
  }

  percentage(rate: number): Money {
    if (!Number.isFinite(rate) || rate < 0) throw new InvalidNumericArgumentException("rate", rate, "must be finite and non-negative");

    return new Money(Math.round((this.amount * rate) / 100));
  }

  isGreaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.amount >= other.amount;
  }

  isLessThan(other: Money): boolean {
    return this.amount < other.amount;
  }

  isLessThanOrEqual(other: Money): boolean {
    return this.amount <= other.amount;
  }

  isEqualTo(other: Money): boolean {
    return this.amount === other.amount;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  toString(): string {
    return this.amount.toString();
  }

  static zero(): Money {
    return new Money(0);
  }

  static min(a: Money, b: Money): Money {
    return a.amount <= b.amount ? a : b;
  }

  static max(a: Money, b: Money): Money {
    return a.amount >= b.amount ? a : b;
  }

  static fromNumber(amount: number): Money {
    return new Money(Math.round(amount));
  }
}
