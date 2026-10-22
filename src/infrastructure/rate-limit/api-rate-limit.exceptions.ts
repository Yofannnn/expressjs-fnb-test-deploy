export interface ApiRateLimitExceptionDetails {
  attempts: number;
  maxAttempts: number;
  ttl: number;
}

export class BaseApiRateLimitException extends Error {
  readonly details: ApiRateLimitExceptionDetails;

  constructor(message: string, details: ApiRateLimitExceptionDetails) {
    super(message);
    this.details = details;
  }

  static isApiRateLimitException(error: unknown): error is BaseApiRateLimitException {
    return error instanceof BaseApiRateLimitException;
  }
}

export class RequestLimitExceededException extends BaseApiRateLimitException {
  override readonly name = "RequestLimitExceededException";

  constructor(details: ApiRateLimitExceptionDetails) {
    super(`Too many requests. Please try again in ${details.ttl} seconds`, details);
  }
}

export class BurstLimitExceededException extends BaseApiRateLimitException {
  override readonly name = "BurstLimitExceededException";

  constructor(details: ApiRateLimitExceptionDetails) {
    super(`Too many requests in short time. Please slow down and try again in ${details.ttl} seconds`, details);
  }
}

export class EmergencyThrottleException extends BaseApiRateLimitException {
  override readonly name = "EmergencyThrottleException";

  constructor(details: ApiRateLimitExceptionDetails) {
    super(`Service temporarily limited. Please try again in ${details.ttl} seconds`, details);
  }
}
