import { WinstonLogger } from "@/infrastructure/logger/winston-logger.adapter";
import { LogContext, LoggerPort } from "@/application/ports/driven/logger.port";
import { RequestContextPort, RequestContextData } from "@/application/ports/driven/request-context.port";
import { Logger } from "winston";

const createMockWinstonLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
});

describe("WinstonLogger Adapter", () => {
  let winstonLogger: WinstonLogger;
  let mockWinston: jest.Mocked<Logger>;
  let mockRequestContext: jest.Mocked<RequestContextPort>;

  const mockRequestContextData = {
    requestId: "req-123",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
    deviceId: "device-123",
  };

  const mockDate = new Date("2024-01-01T10:00:00.000Z");
  const RealDate = Date;

  beforeAll(() => {
    global.Date = class extends RealDate {
      constructor() {
        super();
        return mockDate;
      }

      static now() {
        return mockDate.getTime();
      }

      toISOString() {
        return mockDate.toISOString();
      }
    } as DateConstructor;
  });

  afterAll(() => {
    global.Date = RealDate;
  });

  beforeEach(() => {
    mockWinston = createMockWinstonLogger() as unknown as jest.Mocked<Logger>;
    mockRequestContext = {
      get: jest.fn().mockReturnValue(mockRequestContextData),
    } as jest.Mocked<RequestContextPort>;

    winstonLogger = new WinstonLogger(mockWinston, mockRequestContext);
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create instance with winston logger and request context", () => {
      expect(winstonLogger).toBeInstanceOf(WinstonLogger);
    });

    it("should accept any winston Logger instance", () => {
      const customWinston = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
      } as unknown as Logger;

      const logger = new WinstonLogger(customWinston, mockRequestContext);
      expect(logger).toBeDefined();
    });
  });

  describe("formatPayload method", () => {
    it("should add level, timestamp and request context to log data", () => {
      const logContext: LogContext = {
        event: "TEST_EVENT",
        context: "TestContext",
        message: "Test message",
      };

      const result = winstonLogger["formatPayload"]("info", logContext);

      expect(result).toEqual({
        level: "info",
        timestamp: "2024-01-01T10:00:00.000Z",
        requestId: mockRequestContextData.requestId,
        ipAddress: mockRequestContextData.ipAddress,
        userAgent: mockRequestContextData.userAgent,
        deviceId: mockRequestContextData.deviceId,
        event: "TEST_EVENT",
        context: "TestContext",
        message: "Test message",
      });
    });

    it("should preserve all original properties", () => {
      const complexContext: LogContext = {
        event: "COMPLEX",
        context: "ComplexTest",
        message: "Complex message",
        stack: "stack trace",
        userId: "user-789",
        sessionId: "session-123",
        durationMs: 1500,
        data: {
          key1: "value1",
          key2: 123,
          key3: true,
          nested: { inner: "value" },
        },
      };

      const result = winstonLogger["formatPayload"]("debug", complexContext);

      expect(result.level).toBe("debug");
      expect(result.timestamp).toBe("2024-01-01T10:00:00.000Z");
      expect(result.requestId).toBe(mockRequestContextData.requestId);
      expect(result.ipAddress).toBe(mockRequestContextData.ipAddress);
      expect(result.userAgent).toBe(mockRequestContextData.userAgent);
      expect(result.deviceId).toBe(mockRequestContextData.deviceId);
      expect(result.event).toBe(complexContext.event);
      expect(result.context).toBe(complexContext.context);
      expect(result.message).toBe(complexContext.message);
      expect(result.stack).toBe(complexContext.stack);
      expect(result.userId).toBe(complexContext.userId);
      expect(result.sessionId).toBe(complexContext.sessionId);
      expect(result.durationMs).toBe(complexContext.durationMs);
      expect(result.data).toEqual(complexContext.data);
    });

    it("should use request context from RequestContext adapter", () => {
      const customRequestData = {
        requestId: "custom-req-456",
        ipAddress: "10.0.0.1",
        userAgent: "CustomAgent/1.0",
        deviceId: "custom-device-456",
      };

      mockRequestContext.get.mockReturnValue(customRequestData);

      const logContext: LogContext = {
        event: "TEST",
        context: "Test",
        message: "Message",
      };

      const result = winstonLogger["formatPayload"]("info", logContext);

      expect(result.requestId).toBe("custom-req-456");
      expect(result.ipAddress).toBe("10.0.0.1");
      expect(result.userAgent).toBe("CustomAgent/1.0");
      expect(result.deviceId).toBe("custom-device-456");
    });

    it("should handle empty data object", () => {
      const context: LogContext = {
        event: "EMPTY_DATA",
        context: "Test",
        message: "Message",
        data: {},
      };

      const result = winstonLogger["formatPayload"]("warn", context);
      expect(result.data).toEqual({});
    });

    it("should handle undefined optional properties", () => {
      const context: LogContext = {
        event: "UNDEFINED",
        context: "Test",
        message: "Testing undefined",
      };

      const result = winstonLogger["formatPayload"]("error", context);

      expect(result.stack).toBeUndefined();
      expect(result.userId).toBeUndefined();
      expect(result.sessionId).toBeUndefined();
      expect(result.durationMs).toBeUndefined();
      expect(result.data).toBeUndefined();
    });

    it("should include request context even when requestContext.get returns partial data", () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "partial-req",
        ipAddress: undefined,
        userAgent: undefined,
        deviceId: undefined,
      });

      const context: LogContext = {
        event: "PARTIAL",
        context: "Test",
        message: "Partial context",
      };

      const result = winstonLogger["formatPayload"]("info", context);

      expect(result.requestId).toBe("partial-req");
      expect(result.ipAddress).toBeUndefined();
      expect(result.userAgent).toBeUndefined();
      expect(result.deviceId).toBeUndefined();
    });
  });

  describe("Logging methods", () => {
    const baseContext: LogContext = {
      event: "BASE_EVENT",
      context: "BaseContext",
      message: "Base message",
    };

    describe("debug", () => {
      it("should call winston.debug with formatted payload", () => {
        winstonLogger.debug(baseContext);

        expect(mockWinston.debug).toHaveBeenCalledTimes(1);
        expect(mockWinston.debug).toHaveBeenCalledWith({
          level: "debug",
          timestamp: mockDate.toISOString(),
          requestId: mockRequestContextData.requestId,
          ipAddress: mockRequestContextData.ipAddress,
          userAgent: mockRequestContextData.userAgent,
          deviceId: mockRequestContextData.deviceId,
          ...baseContext,
        });
      });

      it("should include additional context data", () => {
        const extendedContext: LogContext = {
          ...baseContext,
          userId: "debug-user",
          data: { debug: true, level: "verbose" },
        };

        winstonLogger.debug(extendedContext);

        const callArg = mockWinston.debug.mock.calls[0][0] as LogContext;
        expect(callArg.userId).toBe("debug-user");
        expect(callArg.data).toEqual({ debug: true, level: "verbose" });
      });
    });

    describe("info", () => {
      it("should call winston.info with formatted payload", () => {
        winstonLogger.info(baseContext);

        expect(mockWinston.info).toHaveBeenCalledTimes(1);
        expect(mockWinston.info).toHaveBeenCalledWith({
          level: "info",
          timestamp: mockDate.toISOString(),
          requestId: mockRequestContextData.requestId,
          ipAddress: mockRequestContextData.ipAddress,
          userAgent: mockRequestContextData.userAgent,
          deviceId: mockRequestContextData.deviceId,
          ...baseContext,
        });
      });

      it("should log performance metrics", () => {
        const perfContext: LogContext = {
          ...baseContext,
          durationMs: 234,
          data: { operation: "query", rows: 1000 },
        };

        winstonLogger.info(perfContext);

        const callArg = mockWinston.info.mock.calls[0][0] as LogContext;
        expect(callArg.durationMs).toBe(234);
        expect(callArg.data?.rows).toBe(1000);
      });
    });

    describe("warn", () => {
      it("should call winston.warn with formatted payload", () => {
        winstonLogger.warn(baseContext);

        expect(mockWinston.warn).toHaveBeenCalledTimes(1);
        expect(mockWinston.warn).toHaveBeenCalledWith({
          level: "warn",
          timestamp: mockDate.toISOString(),
          requestId: mockRequestContextData.requestId,
          ipAddress: mockRequestContextData.ipAddress,
          userAgent: mockRequestContextData.userAgent,
          deviceId: mockRequestContextData.deviceId,
          ...baseContext,
        });
      });

      it("should include warning details", () => {
        const warningContext: LogContext = {
          ...baseContext,
          message: "Deprecated API used",
          data: { deprecatedEndpoint: "/old-api", suggested: "/new-api" },
        };

        winstonLogger.warn(warningContext);

        const callArg = mockWinston.warn.mock.calls[0][0] as LogContext;
        expect(callArg.message).toBe("Deprecated API used");
        expect(callArg.data?.suggested).toBe("/new-api");
      });
    });

    describe("error", () => {
      it("should call winston.error with formatted payload", () => {
        winstonLogger.error(baseContext);

        expect(mockWinston.error).toHaveBeenCalledTimes(1);
        expect(mockWinston.error).toHaveBeenCalledWith({
          level: "error",
          timestamp: mockDate.toISOString(),
          requestId: mockRequestContextData.requestId,
          ipAddress: mockRequestContextData.ipAddress,
          userAgent: mockRequestContextData.userAgent,
          deviceId: mockRequestContextData.deviceId,
          ...baseContext,
        });
      });

      it("should include error stack traces", () => {
        const error = new Error("Test error");
        const errorContext: LogContext = {
          ...baseContext,
          message: "Error occurred during processing",
          stack: error.stack,
          data: { error: error.message, code: "ERR_TEST" },
        };

        winstonLogger.error(errorContext);

        const callArg = mockWinston.error.mock.calls[0][0] as LogContext;
        expect(callArg.stack).toBe(error.stack);
        expect(callArg.data?.code).toBe("ERR_TEST");
      });
    });

    describe("fatal", () => {
      it("should call winston.log with formatted payload", () => {
        winstonLogger.fatal(baseContext);

        expect(mockWinston.log).toHaveBeenCalledTimes(1);
        expect(mockWinston.log).toHaveBeenCalledWith({
          level: "fatal",
          timestamp: mockDate.toISOString(),
          requestId: mockRequestContextData.requestId,
          ipAddress: mockRequestContextData.ipAddress,
          userAgent: mockRequestContextData.userAgent,
          deviceId: mockRequestContextData.deviceId,
          ...baseContext,
        });
      });

      it("should log critical system events", () => {
        const fatalContext: LogContext = {
          ...baseContext,
          event: "SYSTEM_SHUTDOWN",
          message: "System shutting down due to critical error",
          data: {
            reason: "Out of memory",
            memoryUsage: "98%",
            uptime: "7d 3h 45m",
          },
        };

        winstonLogger.fatal(fatalContext);

        const callArg = mockWinston.log.mock.calls[0][0] as unknown as LogContext;
        expect(callArg.event).toBe("SYSTEM_SHUTDOWN");
        expect(callArg.data?.reason).toBe("Out of memory");
      });
    });
  });

  describe("Log level consistency", () => {
    it("should use correct winston method for each log level", () => {
      const context: LogContext = {
        event: "LEVEL_TEST",
        context: "LoggerTest",
        message: "Testing log levels",
      };

      winstonLogger.debug(context);
      expect(mockWinston.debug).toHaveBeenCalledWith(expect.objectContaining({ level: "debug" }));

      winstonLogger.info(context);
      expect(mockWinston.info).toHaveBeenCalledWith(expect.objectContaining({ level: "info" }));

      winstonLogger.warn(context);
      expect(mockWinston.warn).toHaveBeenCalledWith(expect.objectContaining({ level: "warn" }));

      winstonLogger.error(context);
      expect(mockWinston.error).toHaveBeenCalledWith(expect.objectContaining({ level: "error" }));

      winstonLogger.fatal(context);
      expect(mockWinston.log).toHaveBeenCalledWith(expect.objectContaining({ level: "fatal" }));
    });

    it("should maintain same timestamp for logs in quick succession", () => {
      const contexts: LogContext[] = [
        { event: "1", context: "C", message: "M1" },
        { event: "2", context: "C", message: "M2" },
        { event: "3", context: "C", message: "M3" },
      ];

      winstonLogger.info(contexts[0]);
      winstonLogger.warn(contexts[1]);
      winstonLogger.error(contexts[2]);

      [mockWinston.info, mockWinston.warn, mockWinston.error].forEach((method) => {
        const callArg = method.mock.calls[0][0] as any;
        expect(callArg.timestamp).toBe(mockDate.toISOString());
      });
    });
  });

  describe("Request context integration", () => {
    it("should include request context in all log calls", () => {
      const context: LogContext = {
        event: "CONTEXT_TEST",
        context: "ContextTest",
        message: "Testing context",
      };

      const requestData = {
        requestId: "context-req-456",
        ipAddress: "10.0.0.2",
        userAgent: "ContextAgent/1.0",
        deviceId: "context-device-456",
      };

      mockRequestContext.get.mockReturnValue(requestData);

      winstonLogger.info(context);

      const callArg = mockWinston.info.mock.calls[0][0] as RequestContextData;
      expect(callArg.requestId).toBe("context-req-456");
      expect(callArg.ipAddress).toBe("10.0.0.2");
      expect(callArg.userAgent).toBe("ContextAgent/1.0");
      expect(callArg.deviceId).toBe("context-device-456");
    });

    it("should handle request context with missing fields", () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "only-req",
        ipAddress: undefined,
        userAgent: undefined,
        deviceId: undefined,
      });

      const context: LogContext = {
        event: "MISSING",
        context: "Test",
        message: "Missing fields",
      };

      winstonLogger.info(context);

      const callArg = mockWinston.info.mock.calls[0][0] as RequestContextData;
      expect(callArg.requestId).toBe("only-req");
      expect(callArg.ipAddress).toBeUndefined();
      expect(callArg.userAgent).toBeUndefined();
      expect(callArg.deviceId).toBeUndefined();
    });

    it("should include request context even when requestContext.get returns SYSTEM data", () => {
      mockRequestContext.get.mockReturnValue({
        requestId: "SYSTEM",
        ipAddress: "SYSTEM",
        userAgent: "SYSTEM",
        deviceId: "SYSTEM",
      });

      const context: LogContext = {
        event: "SYSTEM_LOG",
        context: "Test",
        message: "System log",
      };

      winstonLogger.info(context);

      const callArg = mockWinston.info.mock.calls[0][0] as RequestContextData;
      expect(callArg.requestId).toBe("SYSTEM");
      expect(callArg.ipAddress).toBe("SYSTEM");
      expect(callArg.userAgent).toBe("SYSTEM");
      expect(callArg.deviceId).toBe("SYSTEM");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty log context object", () => {
      const emptyContext = {} as LogContext;

      expect(() => winstonLogger.info(emptyContext)).not.toThrow();
      expect(mockWinston.info).toHaveBeenCalled();
    });

    it("should handle null and undefined values in data", () => {
      const contextWithNulls: LogContext = {
        event: "NULL_TEST",
        context: "Test",
        message: "Test with nulls",
        data: {
          nullValue: null,
          undefinedValue: undefined,
          zero: 0,
          emptyString: "",
          falseValue: false,
        },
      };

      winstonLogger.info(contextWithNulls);

      const callArg = mockWinston.info.mock.calls[0][0] as LogContext;
      expect(callArg.data?.nullValue).toBeNull();
      expect(callArg.data?.undefinedValue).toBeUndefined();
      expect(callArg.data?.zero).toBe(0);
      expect(callArg.data?.emptyString).toBe("");
      expect(callArg.data?.falseValue).toBe(false);
    });

    it("should handle circular references in data", () => {
      const circularObj = { name: "circular" } as unknown as Record<string, unknown>;
      circularObj.self = circularObj;

      const context: LogContext = {
        event: "CIRCULAR",
        context: "Test",
        message: "Circular reference test",
        data: circularObj,
      };

      expect(() => winstonLogger.info(context)).not.toThrow();
      expect(mockWinston.info).toHaveBeenCalled();
    });

    it("should handle very large log messages", () => {
      const largeMessage = "A".repeat(10000);
      const context: LogContext = {
        event: "LARGE",
        context: "LargeTest",
        message: largeMessage,
        data: { largeArray: new Array(1000).fill("x") },
      };

      winstonLogger.info(context);

      const callArg = mockWinston.info.mock.calls[0][0] as LogContext;
      expect(callArg.message.length).toBe(10000);
      expect(callArg.data?.largeArray).toHaveLength(1000);
    });

    it("should handle special characters", () => {
      const specialContext: LogContext = {
        event: "SPECIAL_CHARS",
        context: "SpecialTest",
        message: "Message with special: áéíóú ñ ç @#$%^&*() 🚀🎉",
        data: {
          emoji: "🔥🐛🚀",
          newline: "line1\nline2\nline3",
          tab: "col1\tcol2\tcol3",
          quotes: "Single ' and double \" quotes",
          backslash: "C:\\Users\\Test\\file.txt",
        },
      };

      winstonLogger.info(specialContext);

      const callArg = mockWinston.info.mock.calls[0][0] as LogContext;
      expect(callArg.message).toContain("áéíóú");
      expect(callArg.message).toContain("🚀");
      expect(callArg.data?.emoji).toBe("🔥🐛🚀");
    });

    it("should handle request context with null values", () => {
      mockRequestContext.get.mockReturnValue({
        requestId: null as unknown as string,
        ipAddress: null as unknown as string,
        userAgent: null as unknown as string,
        deviceId: null as unknown as string,
      });

      const context: LogContext = {
        event: "NULL_CONTEXT",
        context: "Test",
        message: "Null context",
      };

      winstonLogger.info(context);

      const callArg = mockWinston.info.mock.calls[0][0] as RequestContextData;
      expect(callArg.requestId).toBeNull();
      expect(callArg.ipAddress).toBeNull();
      expect(callArg.userAgent).toBeNull();
      expect(callArg.deviceId).toBeNull();
    });
  });

  describe("Integration with ILogger interface", () => {
    it("should fully implement ILogger interface", () => {
      const logger: LoggerPort = winstonLogger;

      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.fatal).toBe("function");
    });

    it("should accept LogContext for all methods", () => {
      const validContext: LogContext = {
        event: "INTERFACE_TEST",
        context: "InterfaceTest",
        message: "Testing interface compliance",
      };

      const logger: LoggerPort = winstonLogger;

      expect(() => logger.debug(validContext)).not.toThrow();
      expect(() => logger.info(validContext)).not.toThrow();
      expect(() => logger.warn(validContext)).not.toThrow();
      expect(() => logger.error(validContext)).not.toThrow();
      expect(() => logger.fatal(validContext)).not.toThrow();
    });

    it("should be usable through Logger type", () => {
      const context: LogContext = {
        event: "TYPED_USAGE",
        context: "TypeTest",
        message: "Testing typed usage",
      };

      const loggers: LoggerPort[] = [winstonLogger];

      loggers.forEach((logger) => {
        expect(() => logger.info(context)).not.toThrow();
      });
    });
  });

  describe("Performance and immutability", () => {
    it("should not modify original context object", () => {
      const originalContext: LogContext = {
        event: "ORIGINAL",
        context: "ImmutabilityTest",
        message: "Original message",
        data: { original: true },
      };

      const contextCopy = { ...originalContext };

      winstonLogger.info(originalContext);

      expect(originalContext).toEqual(contextCopy);
      expect(originalContext).not.toHaveProperty("level");
      expect(originalContext).not.toHaveProperty("timestamp");
      expect(originalContext).not.toHaveProperty("requestId");
    });

    it("should handle rapid log calls", () => {
      const baseContext: LogContext = {
        event: "RAPID",
        context: "Performance",
        message: "Rapid logging",
      };

      for (let i = 0; i < 100; i++) {
        const context = {
          ...baseContext,
          data: { iteration: i, timestamp: Date.now() },
        };
        winstonLogger.info(context);
      }

      expect(mockWinston.info).toHaveBeenCalledTimes(100);
    });

    it("should be memory efficient with large data", () => {
      const largeData: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = "x".repeat(100);
      }

      const context: LogContext = {
        event: "MEMORY_TEST",
        context: "Memory",
        message: "Testing memory usage",
        data: largeData,
      };

      for (let i = 0; i < 10; i++) {
        winstonLogger.info(context);
      }

      expect(mockWinston.info).toHaveBeenCalledTimes(10);
    });
  });

  describe("Error handling", () => {
    it("should handle winston logger throwing error", () => {
      const error = new Error("Winston error");
      mockWinston.info.mockImplementation(() => {
        throw error;
      });

      const context: LogContext = {
        event: "ERROR",
        context: "Test",
        message: "Test error",
      };

      expect(() => winstonLogger.info(context)).toThrow("Winston error");
    });

    it("should handle winston logger throwing non-Error", () => {
      mockWinston.info.mockImplementation(() => {
        throw "string error";
      });

      const context: LogContext = {
        event: "ERROR",
        context: "Test",
        message: "Test error",
      };

      expect(() => winstonLogger.info(context)).toThrow("string error");
    });
  });
});
