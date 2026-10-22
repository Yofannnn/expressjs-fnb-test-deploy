import { LogContext, LoggerPort } from "@/application/ports/driven/logger.port";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { Logger } from "winston";

export class WinstonLogger implements LoggerPort {
  constructor(
    private readonly logger: Logger,
    private readonly requestContext: RequestContextPort,
  ) {}

  private formatPayload(level: string, data: LogContext) {
    const requestContextData = this.requestContext.get();

    return {
      level,
      timestamp: new Date().toISOString(),
      requestId: requestContextData.requestId,
      ipAddress: requestContextData.ipAddress,
      userAgent: requestContextData.userAgent,
      deviceId: requestContextData.deviceId,
      ...data,
    };
  }

  debug(data: LogContext) {
    this.logger.debug(this.formatPayload("debug", data));
  }

  info(data: LogContext) {
    this.logger.info(this.formatPayload("info", data));
  }

  warn(data: LogContext) {
    this.logger.warn(this.formatPayload("warn", data));
  }

  error(data: LogContext) {
    this.logger.error(this.formatPayload("error", data));
  }

  fatal(data: LogContext) {
    this.logger.log(this.formatPayload("fatal", data));
  }
}
