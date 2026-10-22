import { Response } from "express";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { Severity } from "@/application/types/severity.type";
import { ExceptionMapper } from "../exceptions/exception.mapper";
import { HttpException } from "../exceptions/http.exception";

export class HTTPErrorFilter {
  constructor(
    private readonly requestContext: RequestContextPort,
    private readonly logger: LoggerPort,
  ) {}

  async catch(error: unknown, res: Response): Promise<Response> {
    const appError = this.normalizeError(error);

    this.logException(appError, error);

    return this.buildErrorResponse(appError, res);
  }

  private normalizeError(error: unknown): HttpException {
    const mapped = ExceptionMapper.map(error);
    if (mapped) return mapped;

    this.logger.error({
      context: "HTTPErrorFilter",
      event: "UNEXPECTED_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      data: { error },
    });

    return HttpException.create({
      name: "UnknownError",
      message: "Internal Server Error",
      severity: Severity.HIGH,
      statusCode: 500,
      retryable: false,
    });
  }

  private logException(presentationError: HttpException, originalError: unknown): void {
    const logData = {
      context: "HTTPErrorFilter",
      event: "EXCEPTION_HANDLED",
      name: presentationError.name,
      statusCode: presentationError.statusCode,
      severity: presentationError.severity,
      requestId: this.requestContext.get().requestId,
      message: presentationError.message,
      details: presentationError.details,
      stack: originalError instanceof Error ? originalError.stack : undefined,
    };

    switch (presentationError.severity) {
      case Severity.CRITICAL:
      case Severity.HIGH:
        this.logger.error(logData);
        break;
      case Severity.MEDIUM:
        this.logger.warn(logData);
        break;
      case Severity.LOW:
      default:
        this.logger.debug(logData);
        break;
    }
  }

  private buildErrorResponse(error: HttpException, res: Response): Response {
    const requestContextData = this.requestContext.get();
    const response = error.toResponse(requestContextData.requestId);

    return res
      .status(error.statusCode)
      .set({
        "X-Request-ID": response.requestId,
        "Content-Type": "application/json",
      })
      .json(response);
  }
}
