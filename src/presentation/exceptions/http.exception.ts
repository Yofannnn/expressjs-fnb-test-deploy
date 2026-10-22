import { Severity } from "@/application/types/severity.type";

interface HttpExceptionToResponse {
  requestId: string;
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  retryable: boolean;
}

interface HttpExceptionCreationData {
  name: string;
  severity?: Severity;
  statusCode: number;
  message: string;
  retryable?: boolean;
  details?: unknown;
}

export class HttpException extends Error {
  constructor(
    public readonly name: string,
    public readonly timestamp: Date,
    public readonly severity: Severity,
    public readonly statusCode: number,
    public readonly message: string,
    public readonly retryable?: boolean,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  toResponse(requestId: string): HttpExceptionToResponse {
    return {
      requestId,
      message: this.message,
      code: `HTTP_${this.statusCode}`,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      retryable: this.isRetryable(),
    };
  }

  isRetryable(): boolean {
    if (this.retryable !== undefined) {
      return this.retryable;
    }
    return [429, 500, 502, 503, 504].includes(this.statusCode || 500);
  }

  static create(data: HttpExceptionCreationData): HttpException {
    return new HttpException(data.name, new Date(), data.severity || Severity.LOW, data.statusCode, data.message, data.retryable, data.details);
  }
}
