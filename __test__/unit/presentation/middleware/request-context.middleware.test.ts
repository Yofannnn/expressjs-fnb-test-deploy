import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { requestContextMiddleware } from "@/presentation/middleware/request-context.middleware";
import { NodeRequestContextAdapter } from "@/infrastructure/common/request-context.adapter";
import { AuthTokenUtil } from "@/presentation/utils/auth-token.utils";
import { getContainer } from "@/container";

jest.mock("@/infrastructure/common/request-context.adapter", () => ({
  NodeRequestContextAdapter: {
    enterWith: jest.fn(),
  },
}));

jest.mock("@/presentation/utils/auth-token.utils", () => ({
  AuthTokenUtil: {
    getAccessToken: jest.fn(),
  },
}));

jest.mock("@/container", () => ({
  getContainer: jest.fn(),
}));

jest.mock("crypto", () => ({
  randomUUID: jest.fn(),
}));

const mockedNodeRequestContextAdapter = NodeRequestContextAdapter as jest.Mocked<typeof NodeRequestContextAdapter>;
const mockedRandomUUID = randomUUID as jest.Mocked<typeof randomUUID>;
const mockedAuthTokenUtil = AuthTokenUtil as jest.Mocked<typeof AuthTokenUtil>;
const mockedGetContainer = getContainer as jest.Mocked<typeof getContainer>;

describe("requestContextMiddleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let mockAuthTokenDecoder: { decodeAccessToken: jest.Mock };
  let mockLogger: { debug: jest.Mock };

  const mockRequestId = "test-uuid-1234-5678";
  const mockIpAddress = "192.168.1.100";
  const mockUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const mockDeviceId = "device-123";
  const mockAccessToken = "access-token-123";
  const mockUserId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      ip: mockIpAddress,
      get: jest.fn(),
    };

    mockResponse = {};

    mockNext = jest.fn();

    mockAuthTokenDecoder = {
      decodeAccessToken: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
    };

    (mockedRandomUUID as jest.Mock).mockReturnValue(mockRequestId);
    (mockedAuthTokenUtil.getAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
    (mockedGetContainer as jest.Mock).mockReturnValue({
      authTokenDecoder: mockAuthTokenDecoder,
      logger: mockLogger,
    });
  });

  const createRequestWithIp = (ip: string | undefined): Partial<Request> => {
    return {
      ip: ip,
      get: jest.fn(),
    };
  };

  describe("Basic functionality", () => {
    it("should call NodeRequestContextAdapter.enterWith with correct data", () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === "user-agent") return mockUserAgent;
        if (header === "x-device-id") return mockDeviceId;
        return undefined;
      });

      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedRandomUUID).toHaveBeenCalled();
      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith({
        requestId: mockRequestId,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        deviceId: mockDeviceId,
        userId: mockUserId,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next() after setting up context", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("User ID resolution from access token", () => {
    it("should resolve userId from access token", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedAuthTokenUtil.getAccessToken).toHaveBeenCalledWith(mockRequest);
      expect(mockAuthTokenDecoder.decodeAccessToken).toHaveBeenCalledWith(mockAccessToken);
      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
        }),
      );
    });

    it("should set userId to undefined when no access token", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      (mockedAuthTokenUtil.getAccessToken as jest.Mock).mockReturnValue(undefined);

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthTokenDecoder.decodeAccessToken).not.toHaveBeenCalled();
      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });

    it("should set userId to undefined when access token is empty string", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      (mockedAuthTokenUtil.getAccessToken as jest.Mock).mockReturnValue("");

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthTokenDecoder.decodeAccessToken).not.toHaveBeenCalled();
      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });

    it("should handle decodeAccessToken returning undefined", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue(undefined);

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });

    it("should handle decodeAccessToken returning null", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue(null);

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });

    it("should handle decodeAccessToken returning object without sub", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({});

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });

    it("should handle decodeAccessToken error and continue as anonymous", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      const decodeError = new Error("Token decoding failed");
      mockAuthTokenDecoder.decodeAccessToken.mockImplementation(() => {
        throw decodeError;
      });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "requestContextMiddleware",
        event: "ACCESS_TOKEN_DECODE_FAILED",
        message: "Failed to decode access token, continuing as anonymous",
        data: { error: "Token decoding failed" },
      });
      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle non-Error decodeAccessToken errors", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockImplementation(() => {
        throw "String error";
      });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "requestContextMiddleware",
        event: "ACCESS_TOKEN_DECODE_FAILED",
        message: "Failed to decode access token, continuing as anonymous",
        data: { error: "String error" },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle decodeAccessToken errors with null error object", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockImplementation(() => {
        throw null;
      });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "requestContextMiddleware",
        event: "ACCESS_TOKEN_DECODE_FAILED",
        message: "Failed to decode access token, continuing as anonymous",
        data: { error: "null" },
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("IP address handling", () => {
    it("should use req.ip for ipAddress", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: mockIpAddress,
        }),
      );
    });

    it("should handle undefined req.ip", () => {
      const req = createRequestWithIp(undefined);
      (req.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(req as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: undefined,
        }),
      );
    });

    it("should handle IPv6 address", () => {
      const ipv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
      const req = createRequestWithIp(ipv6);
      (req.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(req as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: ipv6,
        }),
      );
    });
  });

  describe("User-Agent handling", () => {
    it("should use req.get('user-agent') for userAgent", () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === "user-agent") return mockUserAgent;
        return undefined;
      });
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.get).toHaveBeenCalledWith("user-agent");
      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: mockUserAgent,
        }),
      );
    });

    it("should use undefined when user-agent header is not present", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: undefined,
        }),
      );
    });

    it("should handle different browser user agents", () => {
      const chromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      (mockRequest.get as jest.Mock).mockReturnValue(chromeUA);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: chromeUA,
        }),
      );
    });
  });

  describe("Device ID handling", () => {
    it("should use req.get('x-device-id') for deviceId", () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === "x-device-id") return mockDeviceId;
        return undefined;
      });
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.get).toHaveBeenCalledWith("x-device-id");
      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: mockDeviceId,
        }),
      );
    });

    it("should use undefined when x-device-id header is not present", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: undefined,
        }),
      );
    });
  });

  describe("Request ID handling", () => {
    it("should generate a unique request ID using randomUUID", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedRandomUUID).toHaveBeenCalledTimes(1);
    });

    it("should use the generated UUID as requestId", () => {
      const customUUID = "custom-uuid-1234-5678-90ab-cdef";
      (mockedRandomUUID as jest.Mock).mockReturnValue(customUUID);
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: customUUID,
        }),
      );
    });
  });

  describe("Combined headers scenario", () => {
    it("should handle all headers present", () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === "user-agent") return mockUserAgent;
        if (header === "x-device-id") return mockDeviceId;
        return undefined;
      });
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith({
        requestId: mockRequestId,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        deviceId: mockDeviceId,
        userId: mockUserId,
      });
    });

    it("should handle missing all optional headers", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith({
        requestId: mockRequestId,
        ipAddress: mockIpAddress,
        userAgent: undefined,
        deviceId: undefined,
        userId: mockUserId,
      });
    });
  });

  describe("Error handling", () => {
    it("should propagate errors thrown in next()", () => {
      const error = new Error("Middleware error");
      mockNext.mockImplementation(() => {
        throw error;
      });
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      expect(() => {
        requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(error);
    });

    it("should handle randomUUID errors", () => {
      const error = new Error("UUID generation failed");
      (mockedRandomUUID as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      expect(() => {
        requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(error);
    });

    it("should handle errors in NodeRequestContextAdapter.enterWith", () => {
      const error = new Error("Async storage error");
      mockedNodeRequestContextAdapter.enterWith.mockImplementationOnce(() => {
        throw error;
      });
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      expect(() => {
        requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(error);
    });

    it("should handle getContainer errors", () => {
      const error = new Error("Container not initialized");
      (mockedGetContainer as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);

      expect(() => {
        requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "requestContextMiddleware",
        event: "ACCESS_TOKEN_DECODE_FAILED",
        message: "Failed to decode access token, continuing as anonymous",
        data: { error: "Container not initialized" },
      });

      expect(mockNext).toHaveBeenCalled();

      expect(mockedNodeRequestContextAdapter.enterWith).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle getContainer returning undefined", () => {
      (mockedGetContainer as jest.Mock).mockReturnValue(undefined);
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);

      expect(() => {
        requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow();
    });

    it("should handle authTokenDecoder being undefined", () => {
      (mockedGetContainer as jest.Mock).mockReturnValue({
        authTokenDecoder: undefined,
        logger: mockLogger,
      });
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);

      expect(() => {
        requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "ACCESS_TOKEN_DECODE_FAILED",
        }),
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle logger being undefined", () => {
      (mockedGetContainer as jest.Mock).mockReturnValue({
        authTokenDecoder: mockAuthTokenDecoder,
        logger: undefined,
      });
      (mockRequest.get as jest.Mock).mockReturnValue(mockUserAgent);

      expect(() => {
        requestContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });
  });

  describe("Express middleware integration", () => {
    it("should work as Express middleware", () => {
      const req = { ip: "1.2.3.4", get: jest.fn().mockReturnValue("Test") } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();
      mockAuthTokenDecoder.decodeAccessToken.mockReturnValue({ sub: mockUserId });

      requestContextMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
