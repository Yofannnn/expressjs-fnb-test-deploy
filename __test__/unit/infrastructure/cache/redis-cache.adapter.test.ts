/* eslint-disable @typescript-eslint/no-require-imports */
import { RedisCacheClient } from "@/infrastructure/cache/redis-cache.adapter";
import { Logger } from "@/application/ports/driven/logger";
import { RedisConfig } from "@/infrastructure/config/redis.config";

const mockRedisInstance = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue("PONG"),
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  exists: jest.fn(),
  eval: jest.fn(),
  on: jest.fn(),
  status: "ready",
};

jest.mock("ioredis", () => {
  return {
    Redis: jest.fn().mockImplementation(() => mockRedisInstance),
  };
});

describe("RedisCacheClient", () => {
  let redisCacheClient: RedisCacheClient;
  let mockConfig: jest.Mocked<RedisConfig>;
  let mockLogger: jest.Mocked<Logger>;
  let mockRedis: jest.Mocked<typeof mockRedisInstance>;
  let eventHandlers: Record<string, (...args: unknown[]) => unknown>;

  beforeEach(() => {
    eventHandlers = {};

    mockRedis = mockRedisInstance;

    (Object.keys(mockRedis) as Array<keyof typeof mockRedis>).forEach((key) => {
      const value = mockRedis[key];

      if (typeof value === "function" && "mockReset" in value) {
        value.mockReset();
      }
    });

    mockRedis.connect.mockResolvedValue(undefined);
    mockRedis.quit.mockResolvedValue(undefined);
    mockRedis.ping.mockResolvedValue("PONG");
    mockRedis.on.mockImplementation((event: string, handler: (...args: unknown[]) => unknown) => {
      eventHandlers[event] = handler;
      return mockRedis;
    });
    mockRedis.status = "ready";

    mockConfig = {
      host: "localhost",
      port: 6379,
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
    } as jest.Mocked<RedisConfig>;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    redisCacheClient = new RedisCacheClient(mockConfig, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct configuration", () => {
      const { Redis } = require("ioredis");
      expect(Redis).toHaveBeenCalledWith({
        host: "localhost",
        port: 6379,
        connectTimeout: 10000,
        maxRetriesPerRequest: 3,
      });
    });

    it("should initialize with default connectTimeout", () => {
      const configWithoutTimeout: RedisConfig = {
        host: "localhost",
        port: 6379,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        enableOfflineQueue: false,
        lazyConnect: false,
        family: 4,
      };

      const { Redis } = require("ioredis");
      Redis.mockClear();

      new RedisCacheClient(configWithoutTimeout, mockLogger);

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          connectTimeout: 10000,
        }),
      );
    });

    it("should initialize with default maxRetriesPerRequest", () => {
      const configWithoutRetries: RedisConfig = {
        host: "localhost",
        port: 6379,
        connectTimeout: 10000,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: false,
        family: 4,
      };

      const { Redis } = require("ioredis");
      Redis.mockClear();

      new RedisCacheClient(configWithoutRetries, mockLogger);

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetriesPerRequest: 3,
        }),
      );
    });

    it("should setup event handlers", () => {
      expect(mockRedis.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith("reconnecting", expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith("ready", expect.any(Function));
    });

    it("should set isHealthy to false initially", () => {
      expect(redisCacheClient["isHealthy"]).toBe(false);
    });
  });

  describe("event handlers", () => {
    it("should log and set healthy on connect event", () => {
      eventHandlers["connect"]();

      expect(redisCacheClient["isHealthy"]).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "CONNECTED",
        message: "Connected to Redis at localhost:6379",
      });
    });

    it("should log and set unhealthy on error event", () => {
      const error = new Error("Connection failed");
      eventHandlers["error"](error);

      expect(redisCacheClient["isHealthy"]).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "CONNECTION_ERROR",
        message: "Connection failed",
        stack: error.stack,
        data: { host: "localhost", port: 6379 },
      });
    });

    it("should handle non-Error objects in error event", () => {
      eventHandlers["error"]("string error");

      expect(redisCacheClient["isHealthy"]).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "CONNECTION_ERROR",
        message: "Unknown Redis error",
        stack: undefined,
        data: { host: "localhost", port: 6379 },
      });
    });

    it("should log on reconnecting event", () => {
      eventHandlers["reconnecting"]();

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "RECONNECTING",
        message: "Attempting to reconnect to Redis",
      });
    });

    it("should log and set healthy on ready event", () => {
      eventHandlers["ready"]();

      expect(redisCacheClient["isHealthy"]).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "READY",
        message: "Redis connection ready",
      });
    });
  });

  describe("onModuleInit", () => {
    it("should connect to Redis successfully", async () => {
      eventHandlers["connect"]();

      await redisCacheClient.onModuleInit();

      expect(mockRedis.connect).toHaveBeenCalled();
      expect(redisCacheClient["isHealthy"]).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "MODULE_INITIALIZED",
        message: "Redis module initialized successfully",
      });
    });

    it("should handle connection errors", async () => {
      const error = new Error("Connection failed");
      mockRedis.connect.mockRejectedValueOnce(error);

      await expect(redisCacheClient.onModuleInit()).rejects.toThrow("Connection failed");

      expect(redisCacheClient["isHealthy"]).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "INIT_ERROR",
        message: "Failed to initialize Redis connection",
        stack: error.stack,
        data: { error: "Connection failed" },
      });
    });

    it("should handle non-Error connection errors", async () => {
      mockRedis.connect.mockRejectedValueOnce("string error");

      try {
        await redisCacheClient.onModuleInit();
        fail("Expected exception was not thrown");
      } catch (error) {
        expect(error).toBe("string error");
      }

      expect(redisCacheClient["isHealthy"]).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "INIT_ERROR",
        message: "Failed to initialize Redis connection",
        stack: undefined,
        data: { error: "string error" },
      });
    });
  });

  describe("onModuleDestroy", () => {
    it("should close Redis connection gracefully", async () => {
      mockRedis.status = "ready";

      await redisCacheClient.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "MODULE_DESTROYED",
        message: "Redis connection closed gracefully",
      });
    });

    it("should not quit if connection is already ended", async () => {
      mockRedis.status = "end";

      await redisCacheClient.onModuleDestroy();

      expect(mockRedis.quit).not.toHaveBeenCalled();
    });

    it("should handle shutdown errors", async () => {
      const error = new Error("Shutdown failed");
      mockRedis.quit.mockRejectedValueOnce(error);

      await redisCacheClient.onModuleDestroy();

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "SHUTDOWN_ERROR",
        message: "Error during Redis shutdown",
        data: { error: "Shutdown failed" },
      });
    });

    it("should handle non-Error shutdown errors", async () => {
      mockRedis.quit.mockRejectedValueOnce("string error");

      await redisCacheClient.onModuleDestroy();

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "SHUTDOWN_ERROR",
        message: "Error during Redis shutdown",
        data: { error: "string error" },
      });
    });
  });

  describe("executeWithErrorHandling", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should execute operation successfully", async () => {
      const operation = "TEST";
      const key = "test-key";
      const fn = jest.fn().mockResolvedValue("success");

      const result = await redisCacheClient["executeWithErrorHandling"](operation, key, fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "TEST_SUCCESS",
        message: "Redis TEST completed successfully",
        data: { key },
      });
    });

    it("should use fallback value when Redis is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));
      const fn = jest.fn();

      const result = await redisCacheClient["executeWithErrorHandling"]("TEST", "test-key", fn, "fallback");

      expect(result).toBe("fallback");
      expect(fn).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "OPERATION_BLOCKED",
        message: "Redis is not healthy - cannot perform TEST",
        data: { operation: "TEST", key: "test-key" },
      });
    });

    it("should throw when Redis is unhealthy and no fallback", async () => {
      eventHandlers["error"](new Error("Connection lost"));
      const fn = jest.fn();

      await expect(redisCacheClient["executeWithErrorHandling"]("TEST", "test-key", fn)).rejects.toThrow(
        "Redis is not healthy - cannot perform TEST",
      );

      expect(fn).not.toHaveBeenCalled();
    });

    it("should use fallback value on error", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Operation failed"));

      const result = await redisCacheClient["executeWithErrorHandling"]("TEST", "test-key", fn, "fallback");

      expect(result).toBe("fallback");
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "FALLBACK_USED",
        message: "Using fallback value for TEST operation",
        data: { key: "test-key", operation: "TEST" },
      });
    });

    it("should throw on error when no fallback", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Operation failed"));

      await expect(redisCacheClient["executeWithErrorHandling"]("TEST", "test-key", fn)).rejects.toThrow("Operation failed");

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "TEST_ERROR",
        message: "Redis TEST failed for key test-key",
        stack: expect.any(String),
        data: {
          error: "Operation failed",
          key: "test-key",
          operation: "TEST",
        },
      });
    });
  });

  describe("set", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should set value without TTL", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");

      await redisCacheClient.set("test-key", "test-value");

      expect(mockRedis.set).toHaveBeenCalledWith("test-key", "test-value");
    });

    it("should set value with TTL", async () => {
      mockRedis.setex.mockResolvedValueOnce("OK");

      await redisCacheClient.set("test-key", "test-value", 3600);

      expect(mockRedis.setex).toHaveBeenCalledWith("test-key", 3600, "test-value");
    });

    it("should use set when TTL is 0", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");

      await redisCacheClient.set("test-key", "test-value", 0);

      expect(mockRedis.set).toHaveBeenCalledWith("test-key", "test-value");
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it("should use set when TTL is negative", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");

      await redisCacheClient.set("test-key", "test-value", -1);

      expect(mockRedis.set).toHaveBeenCalledWith("test-key", "test-value");
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it("should throw error when Redis is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));

      await expect(redisCacheClient.set("test-key", "test-value")).rejects.toThrow("Redis is not healthy - cannot perform SET");
    });

    it("should handle and log Redis errors", async () => {
      const error = new Error("Redis error");
      mockRedis.set.mockRejectedValueOnce(error);

      await expect(redisCacheClient.set("test-key", "test-value")).rejects.toThrow("Redis error");
    });
  });

  describe("get", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should get value successfully", async () => {
      mockRedis.get.mockResolvedValueOnce("test-value");

      const result = await redisCacheClient.get("test-key");

      expect(result).toBe("test-value");
      expect(mockRedis.get).toHaveBeenCalledWith("test-key");
    });

    it("should return null when key does not exist", async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await redisCacheClient.get("test-key");

      expect(result).toBeNull();
    });

    it("should return fallback value on error", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisCacheClient.get("test-key");

      expect(result).toBeNull();
    });
  });

  describe("del", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should delete key successfully", async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      const result = await redisCacheClient.del("test-key");

      expect(result).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith("test-key");
    });

    it("should return 0 when key does not exist", async () => {
      mockRedis.del.mockResolvedValueOnce(0);

      const result = await redisCacheClient.del("test-key");

      expect(result).toBe(0);
    });

    it("should return fallback value on error", async () => {
      mockRedis.del.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisCacheClient.del("test-key");

      expect(result).toBe(0);
    });
  });

  describe("incr", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should increment value successfully", async () => {
      mockRedis.incr.mockResolvedValueOnce(5);

      const result = await redisCacheClient.incr("test-key");

      expect(result).toBe(5);
      expect(mockRedis.incr).toHaveBeenCalledWith("test-key");
    });

    it("should return fallback value on error", async () => {
      mockRedis.incr.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisCacheClient.incr("test-key");

      expect(result).toBe(0);
    });

    it("should create key and set to 1 when key does not exist", async () => {
      mockRedis.incr.mockResolvedValueOnce(1);

      const result = await redisCacheClient.incr("new-key");

      expect(result).toBe(1);
      expect(mockRedis.incr).toHaveBeenCalledWith("new-key");
    });
  });

  describe("expire", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should set expiration successfully", async () => {
      mockRedis.expire.mockResolvedValueOnce(1);

      const result = await redisCacheClient.expire("test-key", 3600);

      expect(result).toBe(1);
      expect(mockRedis.expire).toHaveBeenCalledWith("test-key", 3600);
    });

    it("should throw error when TTL is 0", async () => {
      await expect(redisCacheClient.expire("test-key", 0)).rejects.toThrow("TTL must be greater than 0");
    });

    it("should throw error when TTL is negative", async () => {
      await expect(redisCacheClient.expire("test-key", -1)).rejects.toThrow("TTL must be greater than 0");
    });

    it("should return fallback value on error", async () => {
      mockRedis.expire.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisCacheClient.expire("test-key", 3600);

      expect(result).toBe(0);
    });

    it("should return 0 when key does not exist", async () => {
      mockRedis.expire.mockResolvedValueOnce(0);

      const result = await redisCacheClient.expire("test-key", 3600);

      expect(result).toBe(0);
    });
  });

  describe("ttl", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should get TTL successfully", async () => {
      mockRedis.ttl.mockResolvedValueOnce(3600);

      const result = await redisCacheClient.ttl("test-key");

      expect(result).toBe(3600);
      expect(mockRedis.ttl).toHaveBeenCalledWith("test-key");
    });

    it("should return -1 for key with no expiration", async () => {
      mockRedis.ttl.mockResolvedValueOnce(-1);

      const result = await redisCacheClient.ttl("test-key");

      expect(result).toBe(-1);
    });

    it("should return -2 for key that does not exist", async () => {
      mockRedis.ttl.mockResolvedValueOnce(-2);

      const result = await redisCacheClient.ttl("test-key");

      expect(result).toBe(-2);
    });

    it("should return fallback value on error", async () => {
      mockRedis.ttl.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisCacheClient.ttl("test-key");

      expect(result).toBe(-1);
    });
  });

  describe("exists", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should return true when key exists", async () => {
      mockRedis.exists.mockResolvedValueOnce(1);

      const result = await redisCacheClient.exists("test-key");

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith("test-key");
    });

    it("should return false when key does not exist", async () => {
      mockRedis.exists.mockResolvedValueOnce(0);

      const result = await redisCacheClient.exists("test-key");

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      mockRedis.exists.mockRejectedValueOnce(new Error("Redis error"));

      const result = await redisCacheClient.exists("test-key");

      expect(result).toBe(false);
    });
  });

  describe("eval", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should execute Lua script successfully", async () => {
      const script = "return redis.call('GET', KEYS[1])";
      mockRedis.eval.mockResolvedValueOnce("test-value");

      const result = await redisCacheClient.eval(script, 1, "test-key");

      expect(result).toBe("test-value");
      expect(mockRedis.eval).toHaveBeenCalledWith(script, 1, "test-key");
    });

    it("should execute Lua script with multiple keys and args", async () => {
      const script = "return redis.call('MGET', KEYS[1], KEYS[2])";
      mockRedis.eval.mockResolvedValueOnce(["value1", "value2"]);

      const result = await redisCacheClient.eval(script, 2, "key1", "key2", "arg1", "arg2");

      expect(result).toEqual(["value1", "value2"]);
      expect(mockRedis.eval).toHaveBeenCalledWith(script, 2, "key1", "key2", "arg1", "arg2");
    });

    it("should return null on error", async () => {
      const script = "return redis.call('GET', KEYS[1])";
      mockRedis.eval.mockRejectedValueOnce(new Error("Script error"));

      const result = await redisCacheClient.eval(script, 1, "test-key");

      expect(result).toBeNull();
    });

    it("should return null when Redis is unhealthy", async () => {
      eventHandlers["error"](new Error("Connection lost"));

      const result = await redisCacheClient.eval("return 1", 0);

      expect(result).toBeNull();
    });
  });

  describe("isCacheHealthy", () => {
    it("should return true when ping succeeds", async () => {
      mockRedis.ping.mockResolvedValueOnce("PONG");

      const result = await redisCacheClient.isCacheHealthy();

      expect(result).toBe(true);
      expect(redisCacheClient["isHealthy"]).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "HEALTH_CHECK_SUCCESS",
        message: "Redis health check succeeded",
        data: { duration: expect.any(Number) },
      });
    });

    it("should return false when ping fails", async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error("Connection lost"));

      const result = await redisCacheClient.isCacheHealthy();

      expect(result).toBe(false);
      expect(redisCacheClient["isHealthy"]).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "HEALTH_CHECK_FAILED",
        message: "Redis health check failed",
        data: { error: "Connection lost" },
      });
    });

    it("should warn when ping is slow", async () => {
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000;
        return 2500;
      });

      mockRedis.ping.mockResolvedValueOnce("PONG");

      const result = await redisCacheClient.isCacheHealthy();

      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "SLOW_HEALTH_CHECK",
        message: "Redis ping took 1500ms",
        data: { duration: 1500 },
      });

      Date.now = originalDateNow;
    });

    it("should handle non-Error ping failures", async () => {
      mockRedis.ping.mockRejectedValueOnce("string error");

      const result = await redisCacheClient.isCacheHealthy();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "HEALTH_CHECK_FAILED",
        message: "Redis health check failed",
        data: { error: "string error" },
      });
    });
  });

  describe("getConnectionStatus", () => {
    it("should return current connection status", async () => {
      mockRedis.status = "ready";

      const status = await redisCacheClient.getConnectionStatus();

      expect(status).toBe("ready");
    });

    it("should return different statuses", async () => {
      mockRedis.status = "connecting";
      expect(await redisCacheClient.getConnectionStatus()).toBe("connecting");

      mockRedis.status = "end";
      expect(await redisCacheClient.getConnectionStatus()).toBe("end");

      mockRedis.status = "reconnecting";
      expect(await redisCacheClient.getConnectionStatus()).toBe("reconnecting");
    });
  });

  describe("integration scenarios", () => {
    beforeEach(() => {
      eventHandlers["connect"]();
    });

    it("should handle sequential operations", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");
      mockRedis.get.mockResolvedValueOnce("test-value");
      mockRedis.del.mockResolvedValueOnce(1);

      await redisCacheClient.set("key1", "value1");
      const value = await redisCacheClient.get("key1");
      await redisCacheClient.del("key1");

      expect(value).toBe("test-value");
      expect(mockRedis.set).toHaveBeenCalledWith("key1", "value1");
      expect(mockRedis.get).toHaveBeenCalledWith("key1");
      expect(mockRedis.del).toHaveBeenCalledWith("key1");
    });

    it("should handle TTL operations flow", async () => {
      mockRedis.setex.mockResolvedValueOnce("OK");
      mockRedis.ttl.mockResolvedValueOnce(3600);
      mockRedis.expire.mockResolvedValueOnce(1);

      await redisCacheClient.set("key1", "value1", 3600);
      const ttl = await redisCacheClient.ttl("key1");
      await redisCacheClient.expire("key1", 7200);

      expect(ttl).toBe(3600);
      expect(mockRedis.setex).toHaveBeenCalledWith("key1", 3600, "value1");
      expect(mockRedis.ttl).toHaveBeenCalledWith("key1");
      expect(mockRedis.expire).toHaveBeenCalledWith("key1", 7200);
    });

    it("should handle increment operations", async () => {
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.incr.mockResolvedValueOnce(2);
      mockRedis.incr.mockResolvedValueOnce(3);

      const result1 = await redisCacheClient.incr("counter");
      const result2 = await redisCacheClient.incr("counter");
      const result3 = await redisCacheClient.incr("counter");

      expect(result1).toBe(1);
      expect(result2).toBe(2);
      expect(result3).toBe(3);
      expect(mockRedis.incr).toHaveBeenCalledTimes(3);
    });

    it("should handle Lua script with fallback on error", async () => {
      const script = "return redis.call('GET', KEYS[1])";
      mockRedis.eval.mockRejectedValueOnce(new Error("Script error"));

      const result = await redisCacheClient.eval(script, 1, "test-key");

      expect(result).toBeNull();
    });
  });

  describe("error handling edge cases", () => {
    it("should handle Redis connection timeout", async () => {
      eventHandlers["connect"]();

      const timeoutError = new Error("Connection timeout");
      mockRedis.set.mockRejectedValueOnce(timeoutError);

      await expect(redisCacheClient.set("test-key", "test-value")).rejects.toThrow("Connection timeout");
    });

    it("should handle Redis connection refused", async () => {
      const refusedError = new Error("Connection refused");
      eventHandlers["error"](refusedError);

      const result = await redisCacheClient.get("test-key");

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "RedisClient",
        event: "OPERATION_BLOCKED",
        message: "Redis is not healthy - cannot perform GET",
        data: { operation: "GET", key: "test-key" },
      });
    });

    it("should recover from connection errors", async () => {
      eventHandlers["error"](new Error("Connection lost"));

      eventHandlers["connect"]();

      mockRedis.get.mockResolvedValueOnce("recovered-value");

      const result = await redisCacheClient.get("test-key");

      expect(result).toBe("recovered-value");
      expect(redisCacheClient["isHealthy"]).toBe(true);
    });
  });
});
