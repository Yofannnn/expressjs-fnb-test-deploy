import { BaseDomainException } from "./base-domain.exception";

export class InvalidExpirationDateException extends BaseDomainException {
  override readonly name = "InvalidExpirationDateException";
  constructor(received: Date) {
    super("Expiration date must be a valid Date");
    this.withDetails({ received });
  }
}

export class InvalidExpirationDurationException extends BaseDomainException {
  override readonly name = "InvalidExpirationDurationException";
  constructor(unit: "milliseconds" | "days" | "hours" | "minutes", received: unknown) {
    super(`Expiration ${unit} must be a positive number`);
    this.withDetails({ unit, received });
  }
}
