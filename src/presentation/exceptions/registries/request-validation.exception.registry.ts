import { RequestValidationException } from "@/presentation/exceptions/request-validation.exception";
import { HttpExceptionMapping } from "../exception.mapper";
import { Severity } from "@/application/types/severity.type";

type ExceptionConstructor = new (...args: any[]) => RequestValidationException;

export const requestValidationExceptionMap = new Map<ExceptionConstructor, HttpExceptionMapping>([
  [RequestValidationException, { statusCode: 400, retryable: false, severity: Severity.LOW }],
]);
