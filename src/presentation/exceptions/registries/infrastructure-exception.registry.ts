import { ExternalServiceUnavailableException, BaseInfrastructureException } from "@/infrastructure/exceptions/infrastructure.exceptions";
import { HttpExceptionMapping } from "../exception.mapper";
import { Severity } from "@/application/types/severity.type";

type ExceptionConstructor = new (...args: any[]) => BaseInfrastructureException;

export const infrastructureExceptionMap = new Map<ExceptionConstructor, HttpExceptionMapping>([
  [ExternalServiceUnavailableException, { statusCode: 503, retryable: false, severity: Severity.HIGH }],
]);
