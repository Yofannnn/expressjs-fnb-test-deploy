import { Severity } from "@/application/types/severity.type";
import { BaseDomainException } from "@/domain/exceptions/base-domain.exception";
import { BaseApplicationException } from "@/application/exceptions/base-application.exception";
import { BaseInfrastructureException } from "@/infrastructure/exceptions/infrastructure.exceptions";
import { HttpException } from "./http.exception";
import { RequestValidationException } from "@/presentation/exceptions/request-validation.exception";
import { BaseApiRateLimitException } from "@/infrastructure/rate-limit/api-rate-limit.exceptions";
import { domainExceptionMap } from "./registries/domain-exception.registry";
import { applicationExceptionMap } from "./registries/application-exception.registry";
import { infrastructureExceptionMap } from "./registries/infrastructure-exception.registry";
import { apiRateLimitExceptionMap } from "./registries/api-rate-limit-exception.registry";
import { requestValidationExceptionMap } from "./registries/request-validation.exception.registry";

export type MappableExceptions =
  BaseDomainException | BaseApplicationException | BaseInfrastructureException | BaseApiRateLimitException | RequestValidationException;

export interface HttpExceptionMapping {
  statusCode: number;
  severity: Severity;
  retryable: boolean;
}

export class ExceptionMapper {
  static map(error: unknown): HttpException | null {
    if (BaseApiRateLimitException.isApiRateLimitException(error)) {
      return this.mapFrom(error, apiRateLimitExceptionMap);
    }

    if (RequestValidationException.isRequestValidationException(error)) {
      return this.mapFrom(error, requestValidationExceptionMap);
    }

    if (BaseApplicationException.isApplicationException(error)) {
      return this.mapFrom(error, applicationExceptionMap);
    }

    if (BaseDomainException.isDomainException(error)) {
      return this.mapFrom(error, domainExceptionMap);
    }

    if (BaseInfrastructureException.isInfrastructureException(error)) {
      return this.mapFrom(error, infrastructureExceptionMap);
    }

    return null;
  }

  private static mapFrom<T extends MappableExceptions>(
    error: T,
    registry: Map<new (...args: unknown[]) => T, HttpExceptionMapping>,
  ): HttpException | null {
    const mapping = [...registry.entries()].find(([exception]) => error instanceof exception)?.[1];
    if (!mapping) return null;

    return HttpException.create({
      name: error.name,
      message: error.message,
      details: error.details,
      statusCode: mapping.statusCode,
      severity: mapping.severity,
      retryable: mapping.retryable,
    });
  }
}
