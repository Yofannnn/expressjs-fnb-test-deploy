export class BaseApplicationException extends Error {
  readonly details: Record<string, unknown> = {};

  constructor(message: string) {
    super(message);
  }

  withDetails(details: Record<string, unknown>): this {
    Object.assign(this.details, details);
    return this;
  }

  static isApplicationException(error: unknown): error is BaseApplicationException {
    return error instanceof BaseApplicationException;
  }
}
