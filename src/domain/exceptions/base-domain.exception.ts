export class BaseDomainException extends Error {
  readonly details: Record<string, unknown> = {};

  constructor(message: string) {
    super(message);
  }

  withDetails(details: Record<string, unknown>): this {
    Object.assign(this.details, details);
    return this;
  }

  static isDomainException(error: unknown): error is BaseDomainException {
    return error instanceof BaseDomainException;
  }
}
