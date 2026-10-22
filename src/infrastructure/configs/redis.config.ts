import type { ConnectionOptions } from "node:tls";
import { env } from "./env-reader";

export interface RedisConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: ConnectionOptions;
  connectTimeout: number;
  maxRetriesPerRequest: number;
  enableOfflineQueue: boolean;
  lazyConnect: boolean;
  family: 4 | 6;
}

export class RedisEnvConfig implements RedisConfig {
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly tls?: ConnectionOptions;
  readonly connectTimeout: number;
  readonly maxRetriesPerRequest: number;
  readonly enableOfflineQueue: boolean;
  readonly lazyConnect: boolean;
  readonly family: 4 | 6;

  constructor() {
    this.host = env.string("REDIS_HOST");
    this.port = env.number("REDIS_PORT", 6379);
    this.username = env.optionalString("REDIS_USERNAME");
    this.password = env.optionalString("REDIS_PASSWORD");
    this.tls = env.boolean("REDIS_TLS") ? {} : undefined;
    this.connectTimeout = env.number("REDIS_CONNECT_TIMEOUT_IN_MS", 1000);
    this.maxRetriesPerRequest = env.number("REDIS_MAX_RETRIES", 3);
    this.enableOfflineQueue = false;
    this.lazyConnect = false;
    this.family = 4;

    this.validate();
  }

  private validate(): void {
    if (this.connectTimeout <= 0) throw new Error("REDIS_CONNECT_TIMEOUT_IN_MS must be greater than 0");
    if (this.maxRetriesPerRequest < 0) throw new Error("REDIS_MAX_RETRIES must be 0 or greater");
    if (this.username && !this.password) throw new Error("REDIS_PASSWORD is required when REDIS_USERNAME is set");
  }
}
