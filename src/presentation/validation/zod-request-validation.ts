import { ZodError, ZodType } from "zod";
import { RequestValidationException, RequestValidationExceptionDetails } from "../exceptions/request-validation.exception";

interface ValidationIssue {
  field: string;
  message: string;
  code: string;
  received?: unknown;
  expected?: unknown;
}

export class ZodRequestValidation {
  constructor() {}

  validate<T>(schema: ZodType<T>, data: unknown): T {
    const parseResult = schema.safeParse(data);

    if (!parseResult.success) throw new RequestValidationException(this.normalizeValidationDetails(parseResult.error));

    return parseResult.data;
  }

  private normalizeValidationDetails(zodError: ZodError): RequestValidationExceptionDetails {
    const issues: ValidationIssue[] = zodError.issues.map((issue) => ({
      field: issue.path.join(".") || "root",
      message: issue.message,
      code: issue.code,
      received: issue.input,
      ...(issue.code === "invalid_type" && { expected: issue.expected }),
    }));

    return {
      issues,
      totalIssues: issues.length,
    };
  }
}
