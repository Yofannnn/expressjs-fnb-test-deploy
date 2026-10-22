import { BaseDomainException } from "./base-domain.exception";

export class InvalidMoneyAmountException extends BaseDomainException {
  override readonly name = "InvalidMoneyAmountException";
  constructor(message: string) {
    super(message);
  }
}

export class NegativeMoneyAmountException extends BaseDomainException {
  override readonly name = "NegativeMoneyAmountException";
  constructor(amount: number) {
    super(`Money amount cannot be negative. Provided: ${amount}`);
  }
}

export class InsufficientMoneyAmountException extends BaseDomainException {
  override readonly name = "InsufficientMoneyAmountException";
  constructor(amount: number, available: number) {
    super(`Insufficient amount. Requested: ${amount}, Available: ${available}`);
  }
}

export class InvalidMoneyDivisionException extends BaseDomainException {
  override readonly name = "InvalidMoneyDivisionException";
  constructor(divisor: number) {
    super(`Money cannot be divided by ${divisor}. Divisor must be greater than zero.`);
  }
}
