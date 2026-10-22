import { BaseApplicationException } from "./base-application.exception";

export class PaymentNotFoundException extends BaseApplicationException {
  override readonly name = "PaymentNotFoundException";
  constructor() {
    super("Payment transaction not found");
  }
}

export class ChargeNotSuccessfulException extends BaseApplicationException {
  override readonly name = "ChargeNotSuccessfulException";
  constructor(status: string) {
    super("Payment charge not successful");
    this.withDetails({ status });
  }
}

export class MissingPaymentMethodException extends BaseApplicationException {
  override readonly name = "MissingPaymentMethodException";
  constructor() {
    super("Missing payment method");
  }
}
