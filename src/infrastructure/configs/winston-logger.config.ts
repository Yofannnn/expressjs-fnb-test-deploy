import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";
const isServerless = !!process.env.VERCEL;

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  ...(isServerless ? [] : [winston.format.colorize()]),
  winston.format.printf(({ timestamp, level, message, context, stack }) => {
    const contextStr = context ? `[${context}] ` : "";
    const stackStr = stack ? `\n${stack}` : "";
    return `${timestamp} ${level}: ${contextStr}${message}${stackStr}`;
  }),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: isServerless ? "info" : isProduction ? "error" : "debug",
    format: consoleFormat,
  }),
];

if (!isServerless) {
  transports.push(
    new DailyRotateFile({
      filename: path.join("logs", "app-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
      format: logFormat,
    }),
    new DailyRotateFile({
      filename: path.join("logs", "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
      level: "error",
      format: logFormat,
    }),
  );
}

const winstonConfig: winston.LoggerOptions = {
  level: isServerless ? "info" : isProduction ? "warn" : "debug",
  format: logFormat,
  transports,
};

export const createLogger: winston.Logger = winston.createLogger(winstonConfig);
