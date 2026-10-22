export class BaseInfrastructureException extends Error {
  readonly details: Record<string, unknown> = {};

  constructor(message: string) {
    super(message);
  }

  withDetails(details: Record<string, unknown>): this {
    Object.assign(this.details, details);
    return this;
  }

  static isInfrastructureException(error: unknown): error is BaseInfrastructureException {
    return error instanceof BaseInfrastructureException;
  }
}

export class ExternalServiceUnavailableException extends BaseInfrastructureException {
  override readonly name = "ExternalServiceUnavailableException";
  constructor(service: string) {
    super(`${service} is currently unavailable`);
    this.withDetails({ service });
  }
}
