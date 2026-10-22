import { IdGeneratorAdapter } from "@/infrastructure/common/id-generator.adapter";

const mockRandomUUID = jest.fn();

Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: mockRandomUUID,
  },
  writable: true,
});

describe("IdGeneratorAdapter", () => {
  let idGenerator: IdGeneratorAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    idGenerator = new IdGeneratorAdapter();
  });

  describe("generate", () => {
    it("should generate a UUID string", () => {
      const mockUuid = "550e8400-e29b-41d4-a716-446655440000";
      mockRandomUUID.mockReturnValue(mockUuid);

      const result = idGenerator.generate();

      expect(result).toBe(mockUuid);
      expect(mockRandomUUID).toHaveBeenCalledTimes(1);
    });

    it("should generate different UUIDs on multiple calls", () => {
      const mockUuid1 = "550e8400-e29b-41d4-a716-446655440000";
      const mockUuid2 = "650e8400-e29b-41d4-a716-446655440001";

      mockRandomUUID.mockReturnValueOnce(mockUuid1).mockReturnValueOnce(mockUuid2);

      const result1 = idGenerator.generate();
      const result2 = idGenerator.generate();

      expect(result1).toBe(mockUuid1);
      expect(result2).toBe(mockUuid2);
      expect(result1).not.toBe(result2);
      expect(mockRandomUUID).toHaveBeenCalledTimes(2);
    });

    it("should return a string type", () => {
      const mockUuid = "550e8400-e29b-41d4-a716-446655440000";
      mockRandomUUID.mockReturnValue(mockUuid);

      const result = idGenerator.generate();

      expect(typeof result).toBe("string");
    });

    it("should generate valid UUID format", () => {
      const mockUuid = "550e8400-e29b-41d4-a716-446655440000";
      mockRandomUUID.mockReturnValue(mockUuid);

      const result = idGenerator.generate();

      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should generate version 4 UUID (starts with 4 for version)", () => {
      const mockUuid = "550e8400-e29b-41d4-a716-446655440000";
      mockRandomUUID.mockReturnValue(mockUuid);

      const result = idGenerator.generate();

      const versionChar = result.charAt(14);
      expect(versionChar).toBe("4");
    });

    it("should generate variant 1 UUID (starts with 8,9,a,b for variant)", () => {
      const mockUuid = "550e8400-e29b-41d4-a716-446655440000";
      mockRandomUUID.mockReturnValue(mockUuid);

      const result = idGenerator.generate();

      const variantChar = result.charAt(19);
      expect(["8", "9", "a", "b"].includes(variantChar.toLowerCase())).toBe(true);
    });

    it("should handle crypto.randomUUID returning empty string", () => {
      mockRandomUUID.mockReturnValue("");

      const result = idGenerator.generate();

      expect(result).toBe("");
      expect(mockRandomUUID).toHaveBeenCalled();
    });

    it("should handle crypto.randomUUID throwing an error", () => {
      const error = new Error("Random UUID generation failed");
      mockRandomUUID.mockImplementation(() => {
        throw error;
      });

      expect(() => idGenerator.generate()).toThrow("Random UUID generation failed");
      expect(mockRandomUUID).toHaveBeenCalledTimes(1);
    });

    it("should handle crypto.randomUUID returning null", () => {
      mockRandomUUID.mockReturnValue(null as unknown as string);

      const result = idGenerator.generate();

      expect(result).toBeNull();
      expect(mockRandomUUID).toHaveBeenCalled();
    });

    it("should handle crypto.randomUUID returning undefined", () => {
      mockRandomUUID.mockReturnValue(undefined as unknown as string);

      const result = idGenerator.generate();

      expect(result).toBeUndefined();
      expect(mockRandomUUID).toHaveBeenCalled();
    });

    it("should generate many unique UUIDs in sequence", () => {
      const mockUuids = [
        "550e8400-e29b-41d4-a716-446655440000",
        "650e8400-e29b-41d4-a716-446655440001",
        "750e8400-e29b-41d4-a716-446655440002",
        "850e8400-e29b-41d4-a716-446655440003",
        "950e8400-e29b-41d4-a716-446655440004",
      ];

      mockRandomUUID.mockImplementation(() => {
        const index = mockRandomUUID.mock.calls.length - 1;
        return mockUuids[index] || "fallback-uuid";
      });

      const results = Array.from({ length: 5 }, () => idGenerator.generate());

      expect(results).toHaveLength(5);
      expect(results[0]).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(results[4]).toBe("950e8400-e29b-41d4-a716-446655440004");
      expect(new Set(results).size).toBe(5);
      expect(mockRandomUUID).toHaveBeenCalledTimes(5);
    });
  });

  describe("constructor", () => {
    it("should create an instance of IdGeneratorAdapter", () => {
      const adapter = new IdGeneratorAdapter();
      expect(adapter).toBeInstanceOf(IdGeneratorAdapter);
    });

    it("should have generate method", () => {
      const adapter = new IdGeneratorAdapter();
      expect(adapter.generate).toBeDefined();
      expect(typeof adapter.generate).toBe("function");
    });
  });

  describe("integration scenarios", () => {
    it("should generate valid IDs for multiple entities", () => {
      const mockUuid1 = "user-123-uuid";
      const mockUuid2 = "session-456-uuid";
      const mockUuid3 = "token-789-uuid";

      mockRandomUUID.mockReturnValueOnce(mockUuid1).mockReturnValueOnce(mockUuid2).mockReturnValueOnce(mockUuid3);

      const userId = idGenerator.generate();
      const sessionId = idGenerator.generate();
      const tokenId = idGenerator.generate();

      expect(userId).toBe(mockUuid1);
      expect(sessionId).toBe(mockUuid2);
      expect(tokenId).toBe(mockUuid3);
      expect(mockRandomUUID).toHaveBeenCalledTimes(3);
    });

    it("should handle rapid consecutive generations", () => {
      const mockUuids = Array.from({ length: 100 }, (_, i) => `uuid-${i}`);

      mockRandomUUID.mockImplementation(() => {
        const index = mockRandomUUID.mock.calls.length - 1;
        return mockUuids[index] || "fallback";
      });

      const start = performance.now();
      const results = Array.from({ length: 100 }, () => idGenerator.generate());
      const end = performance.now();

      expect(results).toHaveLength(100);
      expect(new Set(results).size).toBe(100);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe("edge cases", () => {
    it("should handle crypto.randomUUID returning a non-UUID string", () => {
      const nonUuidString = "not-a-uuid";
      mockRandomUUID.mockReturnValue(nonUuidString);

      const result = idGenerator.generate();

      expect(result).toBe(nonUuidString);
      expect(mockRandomUUID).toHaveBeenCalled();
    });

    it("should handle crypto.randomUUID returning a number as string", () => {
      const numberString = "12345";
      mockRandomUUID.mockReturnValue(numberString);

      const result = idGenerator.generate();

      expect(result).toBe(numberString);
      expect(typeof result).toBe("string");
    });

    it("should handle crypto.randomUUID returning a UUID with uppercase hex", () => {
      const uppercaseUuid = "550E8400-E29B-41D4-A716-446655440000";
      mockRandomUUID.mockReturnValue(uppercaseUuid);

      const result = idGenerator.generate();

      expect(result).toBe(uppercaseUuid);
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should handle crypto.randomUUID returning a UUID with braces", () => {
      const bracedUuid = "{550e8400-e29b-41d4-a716-446655440000}";
      mockRandomUUID.mockReturnValue(bracedUuid);

      const result = idGenerator.generate();

      expect(result).toBe(bracedUuid);
    });

    it("should handle crypto.randomUUID throwing a non-Error", () => {
      mockRandomUUID.mockImplementation(() => {
        throw "string error";
      });

      expect(() => idGenerator.generate()).toThrow("string error");
      expect(mockRandomUUID).toHaveBeenCalled();
    });
  });

  describe("performance", () => {
    it("should generate UUIDs quickly", () => {
      mockRandomUUID.mockReturnValue("550e8400-e29b-41d4-a716-446655440000");

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        idGenerator.generate();
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
      expect(mockRandomUUID).toHaveBeenCalledTimes(1000);
    });

    it("should handle high volume generation without errors", () => {
      mockRandomUUID.mockReturnValue("550e8400-e29b-41d4-a716-446655440000");

      expect(() => {
        for (let i = 0; i < 10000; i++) {
          idGenerator.generate();
        }
      }).not.toThrow();

      expect(mockRandomUUID).toHaveBeenCalledTimes(10000);
    });
  });

  describe("mock restoration", () => {
    it("should work with real crypto implementation if mock is restored", () => {
      const originalCrypto = global.crypto;

      if (!originalCrypto || typeof originalCrypto.randomUUID !== "function") {
        return;
      }

      const spy = jest.spyOn(originalCrypto, "randomUUID");

      const adapter = new IdGeneratorAdapter();
      const result = adapter.generate();

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      spy.mockRestore();
    });
  });
});
