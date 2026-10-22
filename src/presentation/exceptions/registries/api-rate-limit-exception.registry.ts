import { Severity } from "@/application/types/severity.type";
import {
  BaseApiRateLimitException,
  BurstLimitExceededException,
  EmergencyThrottleException,
  RequestLimitExceededException,
} from "@/infrastructure/rate-limit/api-rate-limit.exceptions";
import { HttpExceptionMapping } from "../exception.mapper";

export type ExceptionConstructor = new (...args: any[]) => BaseApiRateLimitException;

export const apiRateLimitExceptionMap = new Map<ExceptionConstructor, HttpExceptionMapping>([
  [RequestLimitExceededException, { statusCode: 429, severity: Severity.LOW, retryable: false }],
  [BurstLimitExceededException, { statusCode: 429, severity: Severity.LOW, retryable: false }],
  [EmergencyThrottleException, { statusCode: 429, severity: Severity.LOW, retryable: false }],
]);
