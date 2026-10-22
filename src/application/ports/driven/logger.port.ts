export interface LogContext {
  event: string;
  context: string;
  message: string;
  stack?: string;
  userId?: string;
  sessionId?: string;
  durationMs?: number;
  data?: Record<string, unknown>;
}

export interface LoggerPort {
  debug(data: LogContext): void;
  info(data: LogContext): void;
  warn(data: LogContext): void;
  error(data: LogContext): void;
  fatal(data: LogContext): void;
}
