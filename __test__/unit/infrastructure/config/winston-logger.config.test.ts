/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock("winston", () => {
  const mockFormat = {
    combine: jest.fn().mockReturnValue("combined"),
    timestamp: jest.fn().mockReturnValue("timestamp"),
    errors: jest.fn().mockReturnValue("errors"),
    json: jest.fn().mockReturnValue("json"),
    colorize: jest.fn().mockReturnValue("colorize"),
    printf: jest.fn().mockReturnValue("printf"),
  };

  return {
    format: mockFormat,
    transports: {
      Console: jest.fn(),
    },
    createLogger: jest.fn().mockReturnValue({}),
  };
});

jest.mock("winston-daily-rotate-file", () => {
  return jest.fn();
});

jest.mock("path", () => ({
  join: jest.fn().mockReturnValue("/mock/path"),
}));

describe("winston-logger.config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe("configuration", () => {
    it("should create logger with correct configuration in production environment", () => {
      process.env.NODE_ENV = "production";

      jest.resetModules();

      require("@/infrastructure/config/winston-logger.config");

      const winston = require("winston");
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warn",
        }),
      );
    });

    it("should create logger with correct configuration in development environment", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();

      require("@/infrastructure/config/winston-logger.config");

      const winston = require("winston");
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "debug",
        }),
      );
    });

    it("should set default level to debug when NODE_ENV is not production", () => {
      process.env.NODE_ENV = "test";

      jest.resetModules();

      require("@/infrastructure/config/winston-logger.config");

      const winston = require("winston");
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "debug",
        }),
      );
    });

    it("should configure console transport with correct levels", () => {
      process.env.NODE_ENV = "production";

      jest.resetModules();

      require("@/infrastructure/config/winston-logger.config");

      const winston = require("winston");
      expect(winston.transports.Console).toHaveBeenCalledWith({
        level: "error",
        format: "combined",
      });
    });

    it("should configure console transport with debug level in development", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();

      require("@/infrastructure/config/winston-logger.config");

      const winston = require("winston");
      expect(winston.transports.Console).toHaveBeenCalledWith({
        level: "debug",
        format: "combined",
      });
    });

    it("should configure DailyRotateFile transports correctly", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();

      const DailyRotateFile = require("winston-daily-rotate-file");
      require("path");

      require("@/infrastructure/config/winston-logger.config");

      expect(DailyRotateFile).toHaveBeenCalledTimes(2);
      expect(DailyRotateFile).toHaveBeenNthCalledWith(1, {
        filename: "/mock/path",
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
        level: "info",
        format: "combined",
      });

      expect(DailyRotateFile).toHaveBeenNthCalledWith(2, {
        filename: "/mock/path",
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "30d",
        level: "error",
        format: "combined",
      });
    });

    it("should use correct log format", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();

      require("@/infrastructure/config/winston-logger.config");

      const winston = require("winston");
      expect(winston.format.timestamp).toHaveBeenCalledWith({ format: "YYYY-MM-DD HH:mm:ss" });
      expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
      expect(winston.format.json).toHaveBeenCalled();
      expect(winston.format.colorize).toHaveBeenCalled();
      expect(winston.format.printf).toHaveBeenCalled();
    });

    it("should include all three transports in configuration", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();

      require("@/infrastructure/config/winston-logger.config");

      const winston = require("winston");
      const callArgs = winston.createLogger.mock.calls[0][0];
      expect(callArgs.transports).toHaveLength(3);
    });

    it("should format error logs with stack trace", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();

      const DailyRotateFile = require("winston-daily-rotate-file");

      require("@/infrastructure/config/winston-logger.config");

      expect(DailyRotateFile).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          format: "combined",
        }),
      );
    });

    it("should use path.join for log file paths", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();

      const path = require("path");

      require("@/infrastructure/config/winston-logger.config");

      expect(path.join).toHaveBeenCalledWith("logs", "app-%DATE%.log");
      expect(path.join).toHaveBeenCalledWith("logs", "error-%DATE%.log");
    });

    it("should export createLogger as a logger instance", () => {
      process.env.NODE_ENV = "development";

      jest.resetModules();

      const config = require("@/infrastructure/config/winston-logger.config");

      expect(config.createLogger).toBeDefined();
    });
  });
});
