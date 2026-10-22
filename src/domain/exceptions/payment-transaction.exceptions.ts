import { BaseDomainException } from "./base-domain.exception";

export class InvalidPaymentTransactionTransitionException extends BaseDomainException {
  override readonly name = "InvalidPaymentTransactionTransitionException";
  constructor(from: string, to: string) {
    super(`Cannot transition payment transaction from ${from} to ${to}`);
    this.withDetails({ from, to });
  }
}

export class ZeroRefundException extends BaseDomainException {
  override readonly name = "ZeroRefundException";
  constructor() {
    super("Refund amount cannot be zero");
  }
}

export class InvalidRefundSourceException extends BaseDomainException {
  override readonly name = "InvalidRefundSourceException";
  constructor(actualType: string) {
    super(`Can only refund a CHARGE transaction, but parent transaction is ${actualType}`);
  }
}

export class RefundOnUnsuccessfulChargeException extends BaseDomainException {
  override readonly name = "RefundOnUnsuccessfulChargeException";
  constructor(actualStatus: string) {
    super(`Can only refund a successful transaction, but parent transaction status is ${actualStatus}`);
  }
}

export class RefundAmountExceedsPreviousRefundsException extends BaseDomainException {
  override readonly name = "RefundAmountExceedsPreviousRefundsException";
  constructor(refundAmount: number, previousRefundsAmount: number, remainingRefundable: number) {
    super(
      `Refund amount cannot exceed the sum of previous refunds. Refund amount: ${refundAmount}, Previous refunds amount: ${previousRefundsAmount}, Remaining refundable: ${remainingRefundable}`,
    );
  }
}
