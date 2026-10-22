import { NodeRequestContextAdapter } from "@/infrastructure/common/request-context.adapter";
import { RequestContextData } from "@/application/ports/driven/request-context";
import { AsyncLocalStorage } from "async_hooks";

jest.mock("async_hooks", () => {
  const mockStorage = {
    run: jest.fn((_data, callback) => callback()),
    enterWith: jest.fn(),
    getStore: jest.fn(),
  };

  return {
    AsyncLocalStorage: jest.fn(() => mockStorage),
  };
});

describe("NodeRequestContextAdapter", () => {
  let mockStorage: jest.Mocked<AsyncLocalStorage<RequestContextData>>;
  let adapter: NodeRequestContextAdapter;

  const mockRequestData: RequestContextData = {
    requestId: "req-123",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
    deviceId: "device-123",
  };

  const defaultSystemData = {
    requestId: "SYSTEM",
    ipAddress: "SYSTEM",
    userAgent: "SYSTEM",
    deviceId: "SYSTEM",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = NodeRequestContextAdapter["storage"] as jest.Mocked<AsyncLocalStorage<RequestContextData>>;
    adapter = new NodeRequestContextAdapter();
  });

  describe("constructor", () => {
    it("should create an instance of NodeRequestContextAdapter", () => {
      expect(adapter).toBeInstanceOf(NodeRequestContextAdapter);
    });

    it("should have static storage property", () => {
      expect(NodeRequestContextAdapter["storage"]).toBeDefined();
      expect(NodeRequestContextAdapter["storage"]).toBe(mockStorage);
    });
  });

  describe("static run", () => {
    it("should execute callback with storage context", () => {
      const callback = jest.fn();

      NodeRequestContextAdapter.run(mockRequestData, callback);

      expect(mockStorage.run).toHaveBeenCalledWith(mockRequestData, callback);
    });

    it("should pass the correct data to storage.run", () => {
      const callback = jest.fn();
      const customData: RequestContextData = {
        requestId: "custom-req-456",
        ipAddress: "10.0.0.1",
        userAgent: "CustomAgent/1.0",
        deviceId: "custom-device-456",
      };

      NodeRequestContextAdapter.run(customData, callback);

      expect(mockStorage.run).toHaveBeenCalledWith(customData, callback);
    });

    it("should handle callback that throws an error", () => {
      const error = new Error("Callback error");
      const callback = jest.fn(() => {
        throw error;
      });

      expect(() => {
        NodeRequestContextAdapter.run(mockRequestData, callback);
      }).toThrow(error);

      expect(mockStorage.run).toHaveBeenCalledWith(mockRequestData, callback);
    });

    it("should handle callback with no parameters", () => {
      const callback = jest.fn();

      NodeRequestContextAdapter.run(mockRequestData, callback);

      expect(mockStorage.run).toHaveBeenCalledWith(mockRequestData, callback);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle callback that returns a value", () => {
      const callback = jest.fn().mockReturnValue("result");

      const result = NodeRequestContextAdapter.run(mockRequestData, callback);

      expect(result).toBe("result");
      expect(mockStorage.run).toHaveBeenCalledWith(mockRequestData, callback);
    });
  });

  describe("static enterWith", () => {
    it("should set storage context with enterWith", () => {
      NodeRequestContextAdapter.enterWith(mockRequestData);

      expect(mockStorage.enterWith).toHaveBeenCalledWith(mockRequestData);
    });

    it("should pass the correct data to storage.enterWith", () => {
      const customData: RequestContextData = {
        requestId: "custom-req-456",
        ipAddress: "10.0.0.1",
        userAgent: "CustomAgent/1.0",
        deviceId: "custom-device-456",
      };

      NodeRequestContextAdapter.enterWith(customData);

      expect(mockStorage.enterWith).toHaveBeenCalledWith(customData);
    });

    it("should handle enterWith with undefined data", () => {
      NodeRequestContextAdapter.enterWith(undefined as unknown as RequestContextData);

      expect(mockStorage.enterWith).toHaveBeenCalledWith(undefined);
    });

    it("should handle enterWith with null data", () => {
      NodeRequestContextAdapter.enterWith(null as unknown as RequestContextData);

      expect(mockStorage.enterWith).toHaveBeenCalledWith(null);
    });

    it("should handle enterWith with empty object", () => {
      const emptyData = {};
      NodeRequestContextAdapter.enterWith(emptyData as RequestContextData);

      expect(mockStorage.enterWith).toHaveBeenCalledWith(emptyData);
    });
  });

  describe("get", () => {
    it("should return stored context data when available", () => {
      mockStorage.getStore.mockReturnValue(mockRequestData);

      const result = adapter.get();

      expect(result).toEqual(mockRequestData);
      expect(mockStorage.getStore).toHaveBeenCalledTimes(1);
    });

    it("should return default SYSTEM data when no context is available", () => {
      mockStorage.getStore.mockReturnValue(undefined);

      const result = adapter.get();

      expect(result).toEqual(defaultSystemData);
      expect(mockStorage.getStore).toHaveBeenCalledTimes(1);
    });

    it("should return default SYSTEM data when context is null", () => {
      mockStorage.getStore.mockReturnValue(null as unknown as RequestContextData);

      const result = adapter.get();

      expect(result).toEqual(defaultSystemData);
      expect(mockStorage.getStore).toHaveBeenCalledTimes(1);
    });

    it("should return data with partial fields", () => {
      const partialData: RequestContextData = {
        requestId: "req-123",
        ipAddress: "192.168.1.1",
      };
      mockStorage.getStore.mockReturnValue(partialData);

      const result = adapter.get();

      expect(result).toEqual({
        requestId: "req-123",
        ipAddress: "192.168.1.1",
        userAgent: undefined,
        deviceId: undefined,
      });
      expect(mockStorage.getStore).toHaveBeenCalledTimes(1);
    });

    it("should return data with only requestId", () => {
      const minimalData: RequestContextData = {
        requestId: "req-123",
      };
      mockStorage.getStore.mockReturnValue(minimalData);

      const result = adapter.get();

      expect(result).toEqual({
        requestId: "req-123",
        ipAddress: undefined,
        userAgent: undefined,
        deviceId: undefined,
      });
      expect(mockStorage.getStore).toHaveBeenCalledTimes(1);
    });

    it("should return different data for different contexts", () => {
      const data1: RequestContextData = {
        requestId: "req-1",
        ipAddress: "1.1.1.1",
        userAgent: "Agent1",
        deviceId: "device-1",
      };

      const data2: RequestContextData = {
        requestId: "req-2",
        ipAddress: "2.2.2.2",
        userAgent: "Agent2",
        deviceId: "device-2",
      };

      mockStorage.getStore.mockReturnValueOnce(data1).mockReturnValueOnce(data2);

      const result1 = adapter.get();
      const result2 = adapter.get();

      expect(result1).toEqual(data1);
      expect(result2).toEqual(data2);
      expect(result1).not.toEqual(result2);
      expect(mockStorage.getStore).toHaveBeenCalledTimes(2);
    });

    it("should handle empty string values", () => {
      const emptyData: RequestContextData = {
        requestId: "",
        ipAddress: "",
        userAgent: "",
        deviceId: "",
      };
      mockStorage.getStore.mockReturnValue(emptyData);

      const result = adapter.get();

      expect(result).toEqual(emptyData);
      expect(mockStorage.getStore).toHaveBeenCalledTimes(1);
    });

    it("should handle special characters in data", () => {
      const specialData: RequestContextData = {
        requestId: "req-!@#$%^&*()",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0 (特殊字符)",
        deviceId: "device-!@#$%",
      };
      mockStorage.getStore.mockReturnValue(specialData);

      const result = adapter.get();

      expect(result).toEqual(specialData);
      expect(mockStorage.getStore).toHaveBeenCalledTimes(1);
    });
  });

  describe("integration scenarios", () => {
    it("should properly store and retrieve context within a run block", () => {
      const testData: RequestContextData = {
        requestId: "test-req-123",
        ipAddress: "10.0.0.1",
        userAgent: "TestAgent/1.0",
        deviceId: "test-device-123",
      };

      mockStorage.run.mockImplementation((data, callback) => {
        mockStorage.getStore.mockReturnValue(data);
        return callback();
      });

      let retrievedData: RequestContextData | undefined;

      NodeRequestContextAdapter.run(testData, () => {
        retrievedData = adapter.get();
      });

      expect(retrievedData).toEqual(testData);
    });

    it("should properly store and retrieve context with enterWith", () => {
      const testData: RequestContextData = {
        requestId: "enterwith-req-123",
        ipAddress: "10.0.0.1",
        userAgent: "EnterWithAgent/1.0",
        deviceId: "enterwith-device-123",
      };

      mockStorage.enterWith.mockImplementation((data) => {
        mockStorage.getStore.mockReturnValue(data);
      });

      NodeRequestContextAdapter.enterWith(testData);

      const result = adapter.get();

      expect(result).toEqual(testData);
      expect(mockStorage.enterWith).toHaveBeenCalledWith(testData);
      expect(mockStorage.getStore).toHaveBeenCalledTimes(1);
    });

    it("should handle nested run blocks", () => {
      const outerData: RequestContextData = {
        requestId: "outer-req",
        ipAddress: "1.1.1.1",
        userAgent: "OuterAgent",
        deviceId: "outer-device",
      };

      const innerData: RequestContextData = {
        requestId: "inner-req",
        ipAddress: "2.2.2.2",
        userAgent: "InnerAgent",
        deviceId: "inner-device",
      };

      let outerResult: RequestContextData | undefined;
      let innerResult: RequestContextData | undefined;

      mockStorage.run.mockImplementation((data, callback) => {
        mockStorage.getStore.mockReturnValue(data);
        return callback();
      });

      NodeRequestContextAdapter.run(outerData, () => {
        outerResult = adapter.get();
        NodeRequestContextAdapter.run(innerData, () => {
          innerResult = adapter.get();
        });
      });

      expect(outerResult).toEqual(outerData);
      expect(innerResult).toEqual(innerData);
      expect(outerResult).not.toEqual(innerResult);
    });

    it("should handle enterWith then run nested", () => {
      const outerData: RequestContextData = {
        requestId: "enterwith-outer",
        ipAddress: "1.1.1.1",
        userAgent: "OuterAgent",
        deviceId: "outer-device",
      };

      const innerData: RequestContextData = {
        requestId: "run-inner",
        ipAddress: "2.2.2.2",
        userAgent: "InnerAgent",
        deviceId: "inner-device",
      };

      let innerResult: RequestContextData | undefined;

      mockStorage.enterWith.mockImplementation((data) => {
        mockStorage.getStore.mockReturnValue(data);
      });

      mockStorage.run.mockImplementation((data, callback) => {
        mockStorage.getStore.mockReturnValue(data);
        return callback();
      });

      NodeRequestContextAdapter.enterWith(outerData);
      const outerResult = adapter.get();

      NodeRequestContextAdapter.run(innerData, () => {
        innerResult = adapter.get();
      });

      expect(outerResult).toEqual(outerData);
      expect(innerResult).toEqual(innerData);
    });

    it("should maintain default data when run block is not used", () => {
      mockStorage.getStore.mockReturnValue(undefined);

      const result = adapter.get();

      expect(result).toEqual(defaultSystemData);
    });

    it("should properly handle asynchronous operations with run", async () => {
      const testData: RequestContextData = {
        requestId: "async-req-123",
        ipAddress: "10.0.0.1",
        userAgent: "AsyncAgent/1.0",
        deviceId: "async-device-123",
      };

      mockStorage.run.mockImplementation((data, callback) => {
        mockStorage.getStore.mockReturnValue(data);
        return callback();
      });

      let retrievedData: RequestContextData | undefined;

      await new Promise<void>((resolve) => {
        NodeRequestContextAdapter.run(testData, async () => {
          await new Promise((r) => setTimeout(r, 10));
          retrievedData = adapter.get();
          resolve();
        });
      });

      expect(retrievedData).toEqual(testData);
    });

    it("should properly handle asynchronous operations with enterWith", async () => {
      const testData: RequestContextData = {
        requestId: "async-enterwith-123",
        ipAddress: "10.0.0.1",
        userAgent: "AsyncEnterWithAgent/1.0",
        deviceId: "async-enterwith-device-123",
      };

      mockStorage.enterWith.mockImplementation((data) => {
        mockStorage.getStore.mockReturnValue(data);
      });

      NodeRequestContextAdapter.enterWith(testData);

      let retrievedData: RequestContextData | undefined;

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          retrievedData = adapter.get();
          resolve();
        }, 10);
      });

      expect(retrievedData).toEqual(testData);
      expect(mockStorage.enterWith).toHaveBeenCalledWith(testData);
    });
  });

  describe("edge cases", () => {
    it("should handle get called before any run or enterWith", () => {
      mockStorage.getStore.mockReturnValue(undefined);

      const result = adapter.get();

      expect(result).toEqual(defaultSystemData);
      expect(mockStorage.getStore).toHaveBeenCalledTimes(1);
    });

    it("should handle run with undefined data", () => {
      const callback = jest.fn();

      NodeRequestContextAdapter.run(undefined as unknown as RequestContextData, callback);

      expect(mockStorage.run).toHaveBeenCalledWith(undefined, callback);
    });

    it("should handle run with null data", () => {
      const callback = jest.fn();

      NodeRequestContextAdapter.run(null as unknown as RequestContextData, callback);

      expect(mockStorage.run).toHaveBeenCalledWith(null, callback);
    });

    it("should handle run with empty object", () => {
      const emptyData = {};
      const callback = jest.fn();

      NodeRequestContextAdapter.run(emptyData as RequestContextData, callback);

      expect(mockStorage.run).toHaveBeenCalledWith(emptyData, callback);
    });

    it("should handle get returning data with undefined fields", () => {
      const dataWithUndefined: RequestContextData = {
        requestId: "req-123",
        ipAddress: undefined,
        userAgent: undefined,
        deviceId: undefined,
      };
      mockStorage.getStore.mockReturnValue(dataWithUndefined);

      const result = adapter.get();

      expect(result).toEqual({
        requestId: "req-123",
        ipAddress: undefined,
        userAgent: undefined,
        deviceId: undefined,
      });
    });

    it("should handle get returning data with null fields", () => {
      const dataWithNull: RequestContextData = {
        requestId: "req-123",
        ipAddress: null as unknown as undefined,
        userAgent: null as unknown as undefined,
        deviceId: null as unknown as undefined,
      };
      mockStorage.getStore.mockReturnValue(dataWithNull);

      const result = adapter.get();

      expect(result).toEqual(dataWithNull);
    });

    it("should handle extremely large data objects", () => {
      const largeData: RequestContextData = {
        requestId: "req-123",
        ipAddress: "192.168.1.1",
        userAgent: "a".repeat(10000),
        deviceId: "b".repeat(10000),
      };
      mockStorage.getStore.mockReturnValue(largeData);

      const result = adapter.get();

      expect(result).toEqual(largeData);
      expect(result.userAgent?.length).toBe(10000);
      expect(result.deviceId?.length).toBe(10000);
    });
  });

  describe("static storage", () => {
    it("should be a shared storage across instances", () => {
      const adapter1 = new NodeRequestContextAdapter();
      const adapter2 = new NodeRequestContextAdapter();

      const testData: RequestContextData = {
        requestId: "shared-req",
        ipAddress: "1.1.1.1",
        userAgent: "SharedAgent",
        deviceId: "shared-device",
      };

      mockStorage.run.mockImplementation((data, callback) => {
        mockStorage.getStore.mockReturnValue(data);
        return callback();
      });

      let result1: RequestContextData | undefined;
      let result2: RequestContextData | undefined;

      NodeRequestContextAdapter.run(testData, () => {
        result1 = adapter1.get();
        result2 = adapter2.get();
      });

      expect(result1).toEqual(testData);
      expect(result2).toEqual(testData);
    });

    it("should maintain data between different adapter instances", () => {
      const adapter1 = new NodeRequestContextAdapter();
      const adapter2 = new NodeRequestContextAdapter();

      const testData: RequestContextData = {
        requestId: "cross-instance",
        ipAddress: "2.2.2.2",
        userAgent: "CrossAgent",
        deviceId: "cross-device",
      };

      mockStorage.run.mockImplementation((data, callback) => {
        mockStorage.getStore.mockReturnValue(data);
        return callback();
      });

      let result1: RequestContextData | undefined;
      let result2: RequestContextData | undefined;

      NodeRequestContextAdapter.run(testData, () => {
        result1 = adapter1.get();
        result2 = adapter2.get();
      });

      expect(result1).toEqual(testData);
      expect(result2).toEqual(testData);
      expect(result1).toEqual(result2);
    });

    it("should share data between run and enterWith", () => {
      const testData: RequestContextData = {
        requestId: "shared-run-enterwith",
        ipAddress: "3.3.3.3",
        userAgent: "SharedAgent",
        deviceId: "shared-device",
      };

      mockStorage.run.mockImplementation((data, callback) => {
        mockStorage.getStore.mockReturnValue(data);
        return callback();
      });

      mockStorage.enterWith.mockImplementation((data) => {
        mockStorage.getStore.mockReturnValue(data);
      });

      let runResult: RequestContextData | undefined;

      NodeRequestContextAdapter.run(testData, () => {
        runResult = adapter.get();
      });

      NodeRequestContextAdapter.enterWith(testData);
      const enterWithResult = adapter.get();

      expect(runResult).toEqual(testData);
      expect(enterWithResult).toEqual(testData);
    });
  });

  describe("concurrency scenarios", () => {
    it("should handle concurrent run blocks with different data", async () => {
      const data1: RequestContextData = {
        requestId: "concurrent-1",
        ipAddress: "1.1.1.1",
        userAgent: "Agent1",
        deviceId: "device-1",
      };

      const data2: RequestContextData = {
        requestId: "concurrent-2",
        ipAddress: "2.2.2.2",
        userAgent: "Agent2",
        deviceId: "device-2",
      };

      mockStorage.run.mockImplementation((data, callback) => {
        mockStorage.getStore.mockReturnValue(data);
        return callback();
      });

      const results: RequestContextData[] = [];

      await Promise.all([
        new Promise<void>((resolve) => {
          NodeRequestContextAdapter.run(data1, () => {
            results.push(adapter.get());
            resolve();
          });
        }),
        new Promise<void>((resolve) => {
          NodeRequestContextAdapter.run(data2, () => {
            results.push(adapter.get());
            resolve();
          });
        }),
      ]);

      expect(results).toContainEqual(data1);
      expect(results).toContainEqual(data2);
    });

    it("should handle concurrent enterWith calls", () => {
      const data1: RequestContextData = {
        requestId: "concurrent-enter-1",
        ipAddress: "1.1.1.1",
        userAgent: "Agent1",
        deviceId: "device-1",
      };

      const data2: RequestContextData = {
        requestId: "concurrent-enter-2",
        ipAddress: "2.2.2.2",
        userAgent: "Agent2",
        deviceId: "device-2",
      };

      mockStorage.enterWith.mockImplementation((data) => {
        mockStorage.getStore.mockReturnValue(data);
      });

      NodeRequestContextAdapter.enterWith(data1);
      const result1 = adapter.get();

      NodeRequestContextAdapter.enterWith(data2);
      const result2 = adapter.get();

      expect(result1).toEqual(data1);
      expect(result2).toEqual(data2);
    });
  });
});
