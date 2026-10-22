export interface ValidationIssue {
  field: string;
  message: string;
  code: string;
  received?: unknown;
  expected?: unknown;
}

export interface RequestValidationExceptionDetails {
  issues: ValidationIssue[];
  totalIssues: number;
}

export class RequestValidationException extends Error {
  override readonly name = "RequestValidationException";
  readonly details: RequestValidationExceptionDetails;

  constructor(details: RequestValidationExceptionDetails) {
    super(`Validation failed with ${details.totalIssues} issue(s)`);
    this.details = details;
  }

  static isRequestValidationException(error: unknown): error is RequestValidationException {
    return error instanceof RequestValidationException;
  }
}
