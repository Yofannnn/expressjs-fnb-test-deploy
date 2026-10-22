import { Response } from "express";
import { HTTPErrorHandler } from "@/presentation/handlers/http-error.handler";
import { RequestContext } from "@/application/ports/driven/request-context";
import { Logger } from "@/application/ports/driven/logger";
import { AppException } from "@/application/exceptions/app.exception";
import { SERVER_EXCEPTIONS } from "@/application/exceptions/server.exception";
import { BaseDomainException } from "@/domain/exceptions/base-domain.exception";
import { DomainToApplicationException } from "@/application/mappers/domain-to-application-exception.mapper";
import { Severity } from "@/application/types/severity.enum";
import { AppExceptionName } from "@/application/types/exceptions/app.exception.types";

jest.mock("@/application/exceptions/server.exception");
jest.mock("@/application/mappers/domain-to-application-exception.mapper");
jest.mock("@/domain/exceptions/base-domain.exception");

const mockedServerExceptions = SERVER_EXCEPTIONS as jest.Mocked<typeof SERVER_EXCEPTIONS>;
const mockedDomainToApplicationException = DomainToApplicationException as jest.Mocked<typeof DomainToApplicationException>;
const mockedBaseDomainException = BaseDomainException as jest.Mocked<typeof BaseDomainException>;

describe("HTTPErrorHandler", () => {
  let handler: HTTPErrorHandler;
  let mockLogger: jest.Mocked<Logger>;
  let mockRequestContext: jest.Mocked<RequestContext>;
  let mockResponse: jest.Mocked<Response>;
  const mockRequestId = "test-request-id-123";
  const mockContextData = {
    requestId: mockRequestId,
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0 Test Browser",
  };

  const createAppException = (
    name: AppExceptionName,
    statusCode: number,
    message: string,
    options?: {
      severity?: Severity;
      userMessage?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
    },
  ): AppException => {
    return new AppException(
      name,
      new Date(),
      options?.severity || Severity.LOW,
      statusCode,
      message,
      options?.userMessage,
      options?.retryable,
      options?.details,
    );
  };

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockRequestContext = {
      get: jest.fn().mockReturnValue(mockContextData),
    } as jest.Mocked<RequestContext>;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Response>;

    handler = new HTTPErrorHandler(mockRequestContext, mockLogger);

    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create an instance with requestContext and logger", () => {
      expect(handler).toBeInstanceOf(HTTPErrorHandler);
    });

    it("should inject dependencies correctly", () => {
      const customRequestContext = { get: jest.fn() } as unknown as RequestContext;
      const customLogger = { error: jest.fn() } as unknown as Logger;
      const customHandler = new HTTPErrorHandler(customRequestContext, customLogger);

      expect(customHandler).toBeDefined();
    });
  });

  describe("handleError method", () => {
    it("should handle AppException and return response", async () => {
      const mockAppError = createAppException("ValidationException", 400, "Validation failed", {
        severity: Severity.LOW,
        userMessage: "Please check your input",
        retryable: false,
        details: { field: "email", errors: ["Invalid email format"] },
      });

      const result = await handler.handleError(mockAppError, mockResponse);

      expect(result).toBe(mockResponse);
      expect(mockRequestContext.get).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.set).toHaveBeenCalledWith({
        "X-Request-ID": mockRequestId,
        "Content-Type": "application/json",
      });
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          message: "Validation failed",
          userMessage: "Please check your input",
          retryable: false,
        }),
      );
    });

    it("should handle BaseDomainException and map to AppException", async () => {
      const mockDomainException = new Error("Domain error");
      const mockAppError = createAppException("DomainException", 422, "Mapped domain error", {
        severity: Severity.MEDIUM,
        userMessage: "Domain error occurred",
        retryable: false,
        details: { reason: "validation", field: "email" },
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(true);
      mockedDomainToApplicationException.map.mockReturnValue(mockAppError);

      await handler.handleError(mockDomainException, mockResponse);

      expect(mockedBaseDomainException.isDomainException).toHaveBeenCalledWith(mockDomainException);
      expect(mockedDomainToApplicationException.map).toHaveBeenCalledWith(mockDomainException);
      expect(mockRequestContext.get).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
        }),
      );
    });

    it("should log error for domain exceptions with status >= 500", async () => {
      const mockDomainException = new Error("Server domain error");
      const mockAppError = createAppException("ServerException", 503, "Server error", {
        severity: Severity.HIGH,
        userMessage: "Service unavailable",
        retryable: true,
        details: { service: "database", error: "Connection timeout" },
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(true);
      mockedDomainToApplicationException.map.mockReturnValue(mockAppError);

      await handler.handleError(mockDomainException, mockResponse);

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "HTTPErrorHandler",
        event: "SERVER_ERROR",
        message: "Server domain error",
        stack: expect.any(String),
        data: { error: mockDomainException },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(503);
    });

    it("should not log error for domain exceptions with status < 500", async () => {
      const mockDomainException = new Error("Client domain error");
      const mockAppError = createAppException("DomainException", 422, "Client error", {
        severity: Severity.LOW,
        userMessage: "Invalid input",
        retryable: false,
        details: { field: "email" },
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(true);
      mockedDomainToApplicationException.map.mockReturnValue(mockAppError);

      await handler.handleError(mockDomainException, mockResponse);

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(422);
    });

    it("should handle unknown errors and return internal server error", async () => {
      const unknownError = new Error("Unknown error");
      const mockServerError = createAppException("ServerException", 500, "Internal server error", {
        severity: Severity.CRITICAL,
        userMessage: "Something went wrong",
        retryable: true,
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(false);
      mockedServerExceptions.INTERNAL_SERVER_ERROR.mockReturnValue(mockServerError);

      await handler.handleError(unknownError, mockResponse);

      expect(mockedServerExceptions.INTERNAL_SERVER_ERROR).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "HTTPErrorHandler",
        event: "UNKNOWN_ERROR",
        message: "Unknown error",
        stack: expect.any(String),
        data: { error: unknownError },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
        }),
      );
    });

    it("should handle non-Error objects", async () => {
      const nonError = "string error";
      const mockServerError = createAppException("ServerException", 500, "Internal server error", {
        severity: Severity.CRITICAL,
        userMessage: "An error occurred",
        retryable: true,
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(false);
      mockedServerExceptions.INTERNAL_SERVER_ERROR.mockReturnValue(mockServerError);

      await handler.handleError(nonError, mockResponse);

      expect(mockedServerExceptions.INTERNAL_SERVER_ERROR).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "HTTPErrorHandler",
        event: "UNKNOWN_ERROR",
        message: "Unknown error",
        stack: undefined,
        data: { error: nonError },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it("should handle null/undefined errors", async () => {
      const mockServerError = createAppException("ServerException", 500, "Internal server error", {
        severity: Severity.CRITICAL,
        userMessage: "An error occurred",
        retryable: true,
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(false);
      mockedServerExceptions.INTERNAL_SERVER_ERROR.mockReturnValue(mockServerError);

      await handler.handleError(null, mockResponse);
      await handler.handleError(undefined, mockResponse);

      expect(mockedServerExceptions.INTERNAL_SERVER_ERROR).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledTimes(2);
    });

    it("should handle errors with no stack trace", async () => {
      const error = new Error("Error without stack");
      Object.defineProperty(error, "stack", { value: undefined });

      const mockServerError = createAppException("ServerException", 500, "Internal server error", {
        severity: Severity.CRITICAL,
        userMessage: "An error occurred",
        retryable: true,
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(false);
      mockedServerExceptions.INTERNAL_SERVER_ERROR.mockReturnValue(mockServerError);

      await handler.handleError(error, mockResponse);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: undefined,
        }),
      );
    });
  });

  describe("normalizeError method", () => {
    describe("BaseDomainException handling", () => {
      it("should map domain exceptions to AppException", () => {
        const domainException = new Error("Domain error");
        const mappedAppError = createAppException("DomainException", 400, "Mapped error", {
          severity: Severity.MEDIUM,
          userMessage: "Domain error occurred",
          retryable: false,
          details: { reason: "business_rule" },
        });

        mockedBaseDomainException.isDomainException.mockReturnValue(true);
        mockedDomainToApplicationException.map.mockReturnValue(mappedAppError);

        const result = handler["normalizeError"](domainException);

        expect(result).toBe(mappedAppError);
        expect(mockedBaseDomainException.isDomainException).toHaveBeenCalledWith(domainException);
        expect(mockedDomainToApplicationException.map).toHaveBeenCalledWith(domainException);
      });

      it("should log for domain exceptions with status >= 500", () => {
        const domainException = new Error("Server domain error");
        const mappedAppError = createAppException("ServerException", 500, "Server error", {
          severity: Severity.HIGH,
          userMessage: "Internal server error",
          retryable: true,
        });

        mockedBaseDomainException.isDomainException.mockReturnValue(true);
        mockedDomainToApplicationException.map.mockReturnValue(mappedAppError);

        handler["normalizeError"](domainException);

        expect(mockLogger.error).toHaveBeenCalledWith({
          context: "HTTPErrorHandler",
          event: "SERVER_ERROR",
          message: "Server domain error",
          stack: expect.any(String),
          data: { error: domainException },
        });
      });

      it("should not log for domain exceptions with status < 500", () => {
        const domainException = new Error("Client error");
        const mappedAppError = createAppException("ValidationException", 400, "Client error", {
          severity: Severity.LOW,
          userMessage: "Invalid input",
          retryable: false,
        });

        mockedBaseDomainException.isDomainException.mockReturnValue(true);
        mockedDomainToApplicationException.map.mockReturnValue(mappedAppError);

        handler["normalizeError"](domainException);

        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it("should handle domain exceptions that are not instances of Error", () => {
        const domainException = { custom: "domain error" };

        mockedBaseDomainException.isDomainException.mockReturnValue(true);
        mockedDomainToApplicationException.map.mockReturnValue(
          createAppException("DomainException", 400, "Mapped domain error", {
            severity: Severity.MEDIUM,
            userMessage: "Domain error occurred",
            retryable: false,
          }),
        );

        const result = handler["normalizeError"](domainException);
        expect(result).toBeInstanceOf(AppException);
      });
    });

    describe("AppException handling", () => {
      it("should return AppException directly", () => {
        const appError = createAppException("AuthException", 401, "Authentication failed", {
          severity: Severity.MEDIUM,
          userMessage: "Please login",
          retryable: false,
          details: { reason: "invalid_token" },
        });

        mockedBaseDomainException.isDomainException.mockReturnValue(false);

        const result = handler["normalizeError"](appError);

        expect(result).toBe(appError);
      });

      it("should preserve AppException properties", () => {
        const timestamp = new Date();
        const appError = new AppException("RateLimitException", timestamp, Severity.HIGH, 429, "Too many requests", "Please slow down", true, {
          limit: 100,
          window: "1m",
          remaining: 0,
        });

        mockedBaseDomainException.isDomainException.mockReturnValue(false);

        const result = handler["normalizeError"](appError);

        expect(result.name).toBe("RateLimitException");
        expect(result.timestamp).toBe(timestamp);
        expect(result.severity).toBe(Severity.HIGH);
        expect(result.statusCode).toBe(429);
        expect(result.message).toBe("Too many requests");
        expect(result.userMessage).toBe("Please slow down");
        expect(result.retryable).toBe(true);
        expect(result.details).toEqual({ limit: 100, window: "1m", remaining: 0 });
      });
    });

    describe("Unknown error handling", () => {
      it("should return server error for unknown errors", () => {
        const unknownError = new Error("Random error");
        const serverError = createAppException("ServerException", 500, "Internal server error", {
          severity: Severity.CRITICAL,
          userMessage: "Something went wrong",
          retryable: true,
        });

        mockedBaseDomainException.isDomainException.mockReturnValue(false);
        mockedServerExceptions.INTERNAL_SERVER_ERROR.mockReturnValue(serverError);

        const result = handler["normalizeError"](unknownError);

        expect(result).toBe(serverError);
        expect(mockedServerExceptions.INTERNAL_SERVER_ERROR).toHaveBeenCalled();
      });

      it("should log unknown errors", () => {
        const unknownError = new Error("Random error");
        const serverError = createAppException("ServerException", 500, "Internal server error", {
          severity: Severity.CRITICAL,
          userMessage: "Something went wrong",
          retryable: true,
        });

        mockedBaseDomainException.isDomainException.mockReturnValue(false);
        mockedServerExceptions.INTERNAL_SERVER_ERROR.mockReturnValue(serverError);

        handler["normalizeError"](unknownError);

        expect(mockLogger.error).toHaveBeenCalledWith({
          context: "HTTPErrorHandler",
          event: "UNKNOWN_ERROR",
          message: "Random error",
          stack: expect.any(String),
          data: { error: unknownError },
        });
      });

      it("should handle errors with circular references", () => {
        const circularError = { message: "Circular error" };
        (circularError as unknown as { self?: unknown }).self = circularError;

        const serverError = createAppException("ServerException", 500, "Internal server error", {
          severity: Severity.CRITICAL,
          userMessage: "Something went wrong",
          retryable: true,
        });

        mockedBaseDomainException.isDomainException.mockReturnValue(false);
        mockedServerExceptions.INTERNAL_SERVER_ERROR.mockReturnValue(serverError);

        expect(() => handler["normalizeError"](circularError)).not.toThrow();
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe("buildErrorResponse method", () => {
    it("should build response with error details", () => {
      const timestamp = new Date();
      const appError = new AppException("ValidationException", timestamp, Severity.LOW, 422, "Validation failed", "Please check your input", false, {
        field: "email",
        errors: ["Invalid email format", "Email is required"],
      });

      const result = handler["buildErrorResponse"](appError, mockResponse);

      expect(result).toBe(mockResponse);
      expect(mockRequestContext.get).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.set).toHaveBeenCalledWith({
        "X-Request-ID": mockRequestId,
        "Content-Type": "application/json",
      });
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          message: "Validation failed",
          userMessage: "Please check your input",
          details: { field: "email", errors: ["Invalid email format", "Email is required"] },
          retryable: false,
          timestamp: timestamp.toISOString(),
        }),
      );
    });

    it("should set correct status code", () => {
      const statusCodes = [400, 401, 403, 404, 422, 429, 500, 502, 503, 504];

      statusCodes.forEach((statusCode) => {
        const appError = createAppException("ServerException", statusCode, `Error with status ${statusCode}`, {
          severity: Severity.MEDIUM,
          userMessage: `Status ${statusCode} error`,
          retryable: statusCode >= 500,
          details: { status: statusCode },
        });

        handler["buildErrorResponse"](appError, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
      });
    });
  });

  describe("Error flow integration", () => {
    it("should handle complete error flow: DomainException -> AppException -> Response", async () => {
      const domainException = new Error("Business rule violation");
      const mappedAppError = createAppException("DomainException", 409, "Business rule violation", {
        severity: Severity.MEDIUM,
        userMessage: "Conflict detected",
        retryable: false,
        details: { rule: "unique_email", value: "user@example.com" },
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(true);
      mockedDomainToApplicationException.map.mockReturnValue(mappedAppError);

      await handler.handleError(domainException, mockResponse);

      expect(mockedBaseDomainException.isDomainException).toHaveBeenCalledWith(domainException);
      expect(mockedDomainToApplicationException.map).toHaveBeenCalledWith(domainException);
      expect(mockRequestContext.get).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          message: "Business rule violation",
          userMessage: "Conflict detected",
          details: { rule: "unique_email", value: "user@example.com" },
        }),
      );
    });

    it("should handle complete error flow: Unknown error -> ServerError -> Response", async () => {
      const unknownError = new Error("Unexpected");
      const serverError = createAppException("ServerException", 500, "Internal server error", {
        severity: Severity.CRITICAL,
        userMessage: "Something went wrong",
        retryable: true,
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(false);
      mockedServerExceptions.INTERNAL_SERVER_ERROR.mockReturnValue(serverError);

      await handler.handleError(unknownError, mockResponse);

      expect(mockedServerExceptions.INTERNAL_SERVER_ERROR).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          retryable: true,
        }),
      );
    });

    it("should maintain consistent request ID throughout the flow", async () => {
      const customRequestId = "custom-request-id-456";
      mockRequestContext.get.mockReturnValue({
        ...mockContextData,
        requestId: customRequestId,
      });

      const appError = createAppException("ValidationException", 400, "Error", {
        severity: Severity.LOW,
        userMessage: "Validation error",
        retryable: false,
      });

      await handler.handleError(appError, mockResponse);

      expect(mockResponse.set).toHaveBeenCalledWith({
        "X-Request-ID": customRequestId,
        "Content-Type": "application/json",
      });
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: customRequestId,
        }),
      );
    });
  });

  describe("Edge cases and error scenarios", () => {
    it("should handle requestContext.get() throwing an error", async () => {
      mockRequestContext.get.mockImplementation(() => {
        throw new Error("Request context error");
      });

      const appError = createAppException("ServerException", 500, "Error", {
        severity: Severity.HIGH,
        userMessage: "An error occurred",
        retryable: true,
      });

      await expect(handler.handleError(appError, mockResponse)).rejects.toThrow("Request context error");
    });

    it("should handle response methods throwing errors", async () => {
      mockResponse.status.mockImplementation(() => {
        throw new Error("Response status error");
      });

      const appError = createAppException("ServerException", 500, "Error", {
        severity: Severity.HIGH,
        userMessage: "An error occurred",
        retryable: true,
      });

      await expect(handler.handleError(appError, mockResponse)).rejects.toThrow("Response status error");
    });

    it("should handle errors with very long messages", async () => {
      const longMessage = "a".repeat(10000);
      const appError = createAppException("ValidationException", 400, longMessage, {
        severity: Severity.LOW,
        userMessage: "Long message error",
        retryable: false,
      });

      await handler.handleError(appError, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: longMessage,
        }),
      );
    });

    it("should correctly determine retryable status for all status codes", async () => {
      const testCases = [
        { statusCode: 200, expected: false },
        { statusCode: 301, expected: false },
        { statusCode: 400, expected: false },
        { statusCode: 401, expected: false },
        { statusCode: 403, expected: false },
        { statusCode: 404, expected: false },
        { statusCode: 422, expected: false },
        { statusCode: 429, expected: true },
        { statusCode: 500, expected: true },
        { statusCode: 502, expected: true },
        { statusCode: 503, expected: true },
        { statusCode: 504, expected: true },
      ];

      for (const { statusCode, expected } of testCases) {
        const appError = createAppException("ServerException", statusCode, `Error ${statusCode}`, {
          severity: Severity.MEDIUM,
          userMessage: `Message for ${statusCode}`,
          retryable: undefined,
        });

        await handler.handleError(appError, mockResponse);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            retryable: expected,
          }),
        );
      }
    });

    it("should handle explicitly set retryable flag overriding status code", async () => {
      const appError1 = createAppException("DomainException", 400, "Error with explicit retryable true", {
        severity: Severity.LOW,
        userMessage: "Retryable client error",
        retryable: true,
      });

      await handler.handleError(appError1, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          retryable: true,
        }),
      );

      const appError2 = createAppException("ServerException", 503, "Error with explicit retryable false", {
        severity: Severity.HIGH,
        userMessage: "Non-retryable server error",
        retryable: false,
      });

      await handler.handleError(appError2, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          retryable: false,
        }),
      );
    });

    it("should handle concurrent error handling", async () => {
      const errors = [
        createAppException("ValidationException", 400, "Error 1", { severity: Severity.LOW }),
        createAppException("AuthException", 401, "Error 2", { severity: Severity.MEDIUM }),
        createAppException("ServerException", 500, "Error 3", { severity: Severity.HIGH }),
      ];

      const promises = errors.map((error) => handler.handleError(error, mockResponse));
      await Promise.all(promises);

      expect(mockResponse.status).toHaveBeenCalledTimes(3);
      expect(mockResponse.json).toHaveBeenCalledTimes(3);
      expect(mockRequestContext.get).toHaveBeenCalledTimes(3);
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle AppException with userMessage undefined", async () => {
      const appError = createAppException("DomainException", 400, "Error", {
        severity: Severity.LOW,
        userMessage: undefined,
        retryable: false,
      });

      await handler.handleError(appError, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: undefined,
        }),
      );
    });

    it("should handle AppException with details undefined", async () => {
      const appError = createAppException("DomainException", 400, "Error", {
        severity: Severity.LOW,
        userMessage: "User message",
        retryable: false,
        details: undefined,
      });

      await handler.handleError(appError, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: undefined,
        }),
      );
    });

    it("should handle domain exception with metadata", async () => {
      const domainException = new BaseDomainException("Domain error", { field: "email", value: "test@example.com" });
      const mappedAppError = createAppException("DomainException", 400, "Domain error", {
        severity: Severity.MEDIUM,
        userMessage: "Domain error occurred",
        retryable: false,
        details: { field: "email", value: "test@example.com" },
      });

      mockedBaseDomainException.isDomainException.mockReturnValue(true);
      mockedDomainToApplicationException.map.mockReturnValue(mappedAppError);

      await handler.handleError(domainException, mockResponse);

      expect(mockedDomainToApplicationException.map).toHaveBeenCalledWith(domainException);
    });

    it("should handle requestContext with undefined ipAddress", async () => {
      mockRequestContext.get.mockReturnValue({
        requestId: mockRequestId,
        ipAddress: undefined,
        userAgent: undefined,
      });

      const appError = createAppException("ValidationException", 400, "Error", {
        severity: Severity.LOW,
        userMessage: "Validation error",
        retryable: false,
      });

      await handler.handleError(appError, mockResponse);

      expect(mockResponse.set).toHaveBeenCalledWith({
        "X-Request-ID": mockRequestId,
        "Content-Type": "application/json",
      });
    });
  });
});
