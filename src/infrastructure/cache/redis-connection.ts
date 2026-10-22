import Redis from "ioredis";
import { RedisConfig } from "../configs/redis.config";
import { LoggerPort } from "@/application/ports/driven/logger.port";

export class RedisConnectionManager {
  private _isHealthy = false;
  private readonly redis: Redis;

  constructor(
    private readonly config: RedisConfig,
    private readonly logger: LoggerPort,
  ) {
    this.redis = new Redis(config);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on("connect", () => {
      this._isHealthy = true;
      this.logger.info({
        context: "RedisClient",
        event: "CONNECTED",
        message: `Connected to Redis at ${this.config.host}:${this.config.port}`,
      });
    });

    this.redis.on("error", (error) => {
      this._isHealthy = false;
      this.logger.error({
        context: "RedisClient",
        event: "CONNECTION_ERROR",
        message: error instanceof Error ? error.message : "Unknown Redis error",
        stack: error instanceof Error ? error.stack : undefined,
        data: { host: this.config.host, port: this.config.port },
      });
    });

    this.redis.on("reconnecting", () => {
      this.logger.info({
        context: "RedisClient",
        event: "RECONNECTING",
        message: "Attempting to reconnect to Redis",
      });
    });

    this.redis.on("ready", () => {
      this._isHealthy = true;
      this.logger.info({
        context: "RedisClient",
        event: "READY",
        message: "Redis connection ready",
      });
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.info({
        context: "RedisClient",
        event: "MODULE_INITIALIZED",
        message: "Redis module initialized successfully",
      });
    } catch (error) {
      this._isHealthy = false;
      this.logger.error({
        context: "RedisClient",
        event: "INIT_ERROR",
        message: "Failed to initialize Redis connection",
        stack: error instanceof Error ? error.stack : undefined,
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.redis && this.redis.status !== "end") {
        await this.redis.quit();
        this.logger.info({
          context: "RedisClient",
          event: "MODULE_DESTROYED",
          message: "Redis connection closed gracefully",
        });
      }
    } catch (error) {
      this.logger.error({
        context: "RedisClient",
        event: "SHUTDOWN_ERROR",
        message: "Error during Redis shutdown",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  getClient(): Redis {
    return this.redis;
  }

  isHealthy(): boolean {
    return this._isHealthy;
  }

  async getConnectionStatus(): Promise<string> {
    return this.redis.status;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const duration = Date.now() - start;

      this.logger.info({
        context: "RedisClient",
        event: "HEALTH_CHECK_SUCCESS",
        message: "Redis health check succeeded",
        data: { duration },
      });

      if (duration > 1000) {
        this.logger.warn({
          context: "RedisClient",
          event: "SLOW_HEALTH_CHECK",
          message: `Redis ping took ${duration}ms`,
          data: { duration },
        });
      }

      this._isHealthy = true;
      return true;
    } catch (error) {
      this._isHealthy = false;
      this.logger.error({
        context: "RedisClient",
        event: "HEALTH_CHECK_FAILED",
        message: "Redis health check failed",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return false;
    }
  }

  async executeWithErrorHandling<T>(
    operation: string,
    key: string,
    fn: () => Promise<T>,
    options?: { retries?: number; fallbackValue?: T },
  ): Promise<T> {
    const retries = Math.max(1, options?.retries ?? 1);
    const hasFallback = options !== undefined && "fallbackValue" in options;
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await fn();

        this.logger.debug({
          context: "RedisClient",
          event: `${operation.toUpperCase()}_SUCCESS`,
          message: `Redis ${operation} completed successfully`,
          data: { key, attempt },
        });

        return result;
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === retries;

        this.logger.warn({
          context: "RedisClient",
          event: `${operation.toUpperCase()}_RETRY`,
          message: `Redis ${operation} failed for key ${key}, attempt ${attempt}/${retries}`,
          data: {
            error: error instanceof Error ? error.message : String(error),
            key,
            operation,
            attempt,
            isLastAttempt,
            connectionHealthy: this._isHealthy,
          },
        });

        if (!isLastAttempt) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    this.logger.error({
      context: "RedisClient",
      event: `${operation.toUpperCase()}_ERROR`,
      message: `Redis ${operation} failed for key ${key} after ${retries} attempts`,
      stack: lastError instanceof Error ? lastError.stack : undefined,
      data: {
        error: lastError instanceof Error ? lastError.message : String(lastError),
        key,
        operation,
      },
    });

    if (hasFallback) {
      this.logger.info({
        context: "RedisClient",
        event: "FALLBACK_USED",
        message: `Using fallback value for ${operation} operation`,
        data: { key, operation },
      });
      return options!.fallbackValue as T;
    }

    throw lastError;
  }
}
