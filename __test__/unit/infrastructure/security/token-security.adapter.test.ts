import { TokenSecurityAdapter } from "@/infrastructure/security/token-security.adapter";
import crypto, { Hash } from "crypto";

jest.mock("crypto");

describe("TokenSecurityAdapter", () => {
  let tokenSecurity: TokenSecurityAdapter;
  let mockCrypto: jest.Mocked<typeof crypto>;

  beforeEach(() => {
    mockCrypto = crypto as jest.Mocked<typeof crypto>;
    tokenSecurity = new TokenSecurityAdapter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance", () => {
      const adapter = new TokenSecurityAdapter();
      expect(adapter).toBeInstanceOf(TokenSecurityAdapter);
    });
  });

  describe("generateSecureToken", () => {
    let mockRandomBytes: jest.MockedFunction<typeof crypto.randomBytes>;

    beforeEach(() => {
      mockRandomBytes = jest.fn();
      mockCrypto.randomBytes = mockRandomBytes;
    });

    it("should generate secure token with default length", () => {
      const mockBuffer = Buffer.from("a".repeat(64), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken();

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should generate secure token with custom length", () => {
      const mockBuffer = Buffer.from("b".repeat(32), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(16);

      expect(mockRandomBytes).toHaveBeenCalledWith(16);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should generate token with very long length", () => {
      const mockBuffer = Buffer.from("c".repeat(256), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(128);

      expect(mockRandomBytes).toHaveBeenCalledWith(128);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should use default length when length is 0", () => {
      const mockBuffer = Buffer.from("d".repeat(64), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(0);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should use default length when length is negative", () => {
      const mockBuffer = Buffer.from("e".repeat(64), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(-5);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should use default length when length is NaN", () => {
      const mockBuffer = Buffer.from("f".repeat(64), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(NaN);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should use default length when length is Infinity", () => {
      const mockBuffer = Buffer.from("g".repeat(64), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(Infinity);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should use default length when length is -Infinity", () => {
      const mockBuffer = Buffer.from("h".repeat(64), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(-Infinity);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should floor decimal length", () => {
      const mockBuffer = Buffer.from("i".repeat(32), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(7.9);

      expect(mockRandomBytes).toHaveBeenCalledWith(7);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should return hex string", () => {
      const mockBuffer = Buffer.from("ff".repeat(32), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(32);

      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it("should generate different tokens on multiple calls", () => {
      const mockBuffer1 = Buffer.from("aa".repeat(32), "hex");
      const mockBuffer2 = Buffer.from("bb".repeat(32), "hex");

      mockRandomBytes.mockReturnValueOnce(mockBuffer1 as unknown as void).mockReturnValueOnce(mockBuffer2 as unknown as void);

      const result1 = tokenSecurity.generateSecureToken();
      const result2 = tokenSecurity.generateSecureToken();

      expect(result1).not.toBe(result2);
    });

    it("should handle length of 1", () => {
      const mockBuffer = Buffer.from("ff", "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(1);

      expect(mockRandomBytes).toHaveBeenCalledWith(1);
      expect(result).toBe("ff");
    });

    it("should return string type", () => {
      const mockBuffer = Buffer.from("aa".repeat(32), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken();

      expect(typeof result).toBe("string");
    });

    it("should handle length with trailing decimals", () => {
      const mockBuffer = Buffer.from("jj".repeat(20), "hex");
      mockRandomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(10.999);

      expect(mockRandomBytes).toHaveBeenCalledWith(10);
      expect(result).toBe(mockBuffer.toString("hex"));
    });
  });

  describe("generateDeviceFingerprint", () => {
    let mockCreateHash: jest.Mock;
    let mockUpdate: jest.Mock;
    let mockDigest: jest.Mock;

    beforeEach(() => {
      mockDigest = jest.fn();
      mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
      mockCreateHash = jest.fn().mockReturnValue({ update: mockUpdate });
      mockCrypto.createHash = mockCreateHash;
    });

    it("should generate fingerprint with userAgent and ipAddress", () => {
      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
      const ipAddress = "192.168.1.1";
      const mockHash = "abc123def456";

      mockDigest.mockReturnValue(mockHash);

      const result = tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockCreateHash).toHaveBeenCalledWith("sha256");
      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0 (windows nt 10.0; win64; x64)-192.168.1.1");
      expect(mockDigest).toHaveBeenCalledWith("hex");
      expect(result).toBe(mockHash);
    });

    it("should normalize userAgent to lowercase", () => {
      const userAgent = "MOZILLA/5.0 (WINDOWS)";
      const ipAddress = "192.168.1.1";
      const mockHash = "hash123";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0 (windows)-192.168.1.1");
    });

    it("should trim whitespace from userAgent", () => {
      const userAgent = "  Mozilla/5.0  ";
      const ipAddress = "192.168.1.1";
      const mockHash = "hash456";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0-192.168.1.1");
    });

    it("should trim whitespace from ipAddress", () => {
      const userAgent = "Mozilla/5.0";
      const ipAddress = "  192.168.1.1  ";
      const mockHash = "hash789";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0-192.168.1.1");
    });

    it("should use 'unknown' when userAgent is undefined", () => {
      const ipAddress = "192.168.1.1";
      const mockHash = "hashdefault";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(undefined, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("unknown-192.168.1.1");
    });

    it("should use 'unknown' when ipAddress is undefined", () => {
      const userAgent = "Mozilla/5.0";
      const mockHash = "hashdefault2";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, undefined);

      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0-unknown");
    });

    it("should use 'unknown' for both when both are undefined", () => {
      const mockHash = "hashboth";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(undefined, undefined);

      expect(mockUpdate).toHaveBeenCalledWith("unknown-unknown");
    });

    it("should use 'unknown' when userAgent is empty string", () => {
      const userAgent = "";
      const ipAddress = "192.168.1.1";
      const mockHash = "hashempty";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("unknown-192.168.1.1");
    });

    it("should use 'unknown' when ipAddress is empty string", () => {
      const userAgent = "Mozilla/5.0";
      const ipAddress = "";
      const mockHash = "hashempty2";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0-unknown");
    });

    it("should handle special characters in userAgent", () => {
      const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";
      const ipAddress = "192.168.1.1";
      const mockHash = "hashspecial";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith(expect.stringContaining("mozilla/5.0"));
      expect(mockUpdate).toHaveBeenCalledWith(expect.stringContaining("applewebkit"));
    });

    it("should handle IPv6 addresses", () => {
      const userAgent = "Mozilla/5.0";
      const ipAddress = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
      const mockHash = "hashipv6";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0-2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    });

    it("should generate same fingerprint for same inputs", () => {
      const userAgent = "Mozilla/5.0";
      const ipAddress = "192.168.1.1";
      const mockHash = "samehash";

      mockDigest.mockReturnValue(mockHash);

      const result1 = tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);
      const result2 = tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(result1).toBe(result2);
    });

    it("should generate different fingerprint for different userAgents", () => {
      const ipAddress = "192.168.1.1";
      const mockHash1 = "hash1";
      const mockHash2 = "hash2";

      mockDigest.mockReturnValueOnce(mockHash1).mockReturnValueOnce(mockHash2);

      const result1 = tokenSecurity.generateDeviceFingerprint("Mozilla/5.0", ipAddress);
      const result2 = tokenSecurity.generateDeviceFingerprint("Chrome/91.0", ipAddress);

      expect(result1).not.toBe(result2);
    });

    it("should generate different fingerprint for different ipAddresses", () => {
      const userAgent = "Mozilla/5.0";
      const mockHash1 = "hash1";
      const mockHash2 = "hash2";

      mockDigest.mockReturnValueOnce(mockHash1).mockReturnValueOnce(mockHash2);

      const result1 = tokenSecurity.generateDeviceFingerprint(userAgent, "192.168.1.1");
      const result2 = tokenSecurity.generateDeviceFingerprint(userAgent, "192.168.1.2");

      expect(result1).not.toBe(result2);
    });

    it("should use sha256 algorithm", () => {
      const userAgent = "Mozilla/5.0";
      const ipAddress = "192.168.1.1";
      const mockHash = "hashalgo";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockCreateHash).toHaveBeenCalledWith("sha256");
    });

    it("should return hex encoded hash", () => {
      const userAgent = "Mozilla/5.0";
      const ipAddress = "192.168.1.1";
      const mockHash = "abcdef123456";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockDigest).toHaveBeenCalledWith("hex");
    });

    it("should return string type", () => {
      const userAgent = "Mozilla/5.0";
      const ipAddress = "192.168.1.1";
      const mockHash = "hashstring";

      mockDigest.mockReturnValue(mockHash);

      const result = tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(typeof result).toBe("string");
    });

    it("should handle userAgent with multiple spaces", () => {
      const userAgent = "Mozilla/5.0    Windows    NT";
      const ipAddress = "192.168.1.1";
      const mockHash = "hashspaces";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0    windows    nt-192.168.1.1");
    });

    it("should handle userAgent with newlines and tabs", () => {
      const userAgent = "Mozilla/5.0\n\tWindows";
      const ipAddress = "192.168.1.1";
      const mockHash = "hashwhitespace";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith(expect.stringContaining("mozilla"));
      expect(mockUpdate).toHaveBeenCalledWith(expect.stringContaining("windows"));
    });

    it("should handle localhost IP", () => {
      const userAgent = "Mozilla/5.0";
      const ipAddress = "127.0.0.1";
      const mockHash = "hashlocalhost";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0-127.0.0.1");
    });

    it("should handle userAgent with unicode characters", () => {
      const userAgent = "Mozilla/5.0 (Windows NT 10.0) 中文";
      const ipAddress = "192.168.1.1";
      const mockHash = "hashunicode";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith(expect.stringContaining("中文"));
    });

    it("should handle userAgent with emoji", () => {
      const userAgent = "Mozilla/5.0 🚀";
      const ipAddress = "192.168.1.1";
      const mockHash = "hashemoji";

      mockDigest.mockReturnValue(mockHash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith(expect.stringContaining("🚀"));
    });
  });

  describe("private method normalizeTokenLength", () => {
    it("should return default length for invalid values", () => {
      const adapter = new TokenSecurityAdapter();
      const normalizeLength = (adapter as any).normalizeTokenLength.bind(adapter);

      expect(normalizeLength(0)).toBe(32);
      expect(normalizeLength(-5)).toBe(32);
      expect(normalizeLength(NaN)).toBe(32);
      expect(normalizeLength(Infinity)).toBe(32);
      expect(normalizeLength(-Infinity)).toBe(32);
    });

    it("should floor decimal values", () => {
      const adapter = new TokenSecurityAdapter();
      const normalizeLength = (adapter as any).normalizeTokenLength.bind(adapter);

      expect(normalizeLength(10.7)).toBe(10);
      expect(normalizeLength(10.2)).toBe(10);
    });

    it("should return the value for valid numbers", () => {
      const adapter = new TokenSecurityAdapter();
      const normalizeLength = (adapter as any).normalizeTokenLength.bind(adapter);

      expect(normalizeLength(32)).toBe(32);
      expect(normalizeLength(16)).toBe(16);
      expect(normalizeLength(64)).toBe(64);
    });
  });

  describe("private method normalizeString", () => {
    it("should return lowercase trimmed string", () => {
      const adapter = new TokenSecurityAdapter();
      const normalizeString = (adapter as any).normalizeString.bind(adapter);

      expect(normalizeString("  TEST  ")).toBe("test");
      expect(normalizeString("TeSt")).toBe("test");
    });

    it("should return 'unknown' for empty string", () => {
      const adapter = new TokenSecurityAdapter();
      const normalizeString = (adapter as any).normalizeString.bind(adapter);

      expect(normalizeString("")).toBe("unknown");
      expect(normalizeString("   ")).toBe("unknown");
    });

    it("should return 'unknown' for undefined", () => {
      const adapter = new TokenSecurityAdapter();
      const normalizeString = (adapter as any).normalizeString.bind(adapter);

      expect(normalizeString(undefined)).toBe("unknown");
    });

    it("should return 'unknown' for null-like strings", () => {
      const adapter = new TokenSecurityAdapter();
      const normalizeString = (adapter as any).normalizeString.bind(adapter);

      expect(normalizeString("null")).toBe("null");
      expect(normalizeString("undefined")).toBe("undefined");
    });
  });

  describe("integration scenarios", () => {
    it("should generate unique identifiers for complete security flow", () => {
      const mockBuffer = Buffer.from("aa".repeat(32), "hex");
      mockCrypto.randomBytes.mockReturnValue(mockBuffer as unknown as void);

      const mockDigest = jest.fn().mockReturnValue("fingerprint123");
      const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdate } as unknown as Hash);

      const token = tokenSecurity.generateSecureToken(32);
      const fingerprint = tokenSecurity.generateDeviceFingerprint("Mozilla/5.0", "192.168.1.1");

      expect(token).toBe(mockBuffer.toString("hex"));
      expect(fingerprint).toBe("fingerprint123");
    });

    it("should handle edge case with all empty inputs for fingerprint", () => {
      const mockDigest = jest.fn().mockReturnValue("emptyfingerprint");
      const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdate } as unknown as Hash);

      const result = tokenSecurity.generateDeviceFingerprint("", "");

      expect(result).toBe("emptyfingerprint");
      expect(mockUpdate).toHaveBeenCalledWith("unknown-unknown");
    });

    it("should generate different token and fingerprint", () => {
      const mockBuffer1 = Buffer.from("aa".repeat(32), "hex");
      const mockBuffer2 = Buffer.from("bb".repeat(32), "hex");
      mockCrypto.randomBytes.mockReturnValueOnce(mockBuffer1 as unknown as void).mockReturnValueOnce(mockBuffer2 as unknown as void);

      const mockDigest1 = jest.fn().mockReturnValue("fp1");
      const mockDigest2 = jest.fn().mockReturnValue("fp2");
      const mockUpdate1 = jest.fn().mockReturnValue({ digest: mockDigest1 });
      const mockUpdate2 = jest.fn().mockReturnValue({ digest: mockDigest2 });
      mockCrypto.createHash
        .mockReturnValueOnce({ update: mockUpdate1 } as unknown as Hash)
        .mockReturnValueOnce({ update: mockUpdate2 } as unknown as Hash);

      const token1 = tokenSecurity.generateSecureToken();
      const token2 = tokenSecurity.generateSecureToken();
      const fp1 = tokenSecurity.generateDeviceFingerprint("Mozilla/5.0", "192.168.1.1");
      const fp2 = tokenSecurity.generateDeviceFingerprint("Chrome/91.0", "192.168.1.2");

      expect(token1).not.toBe(token2);
      expect(fp1).not.toBe(fp2);
    });
  });

  describe("edge cases", () => {
    it("should handle very long userAgent strings", () => {
      const longUserAgent = "Mozilla/5.0 " + "a".repeat(1000);
      const ipAddress = "192.168.1.1";
      const mockDigest = jest.fn().mockReturnValue("longhash");
      const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdate } as unknown as Hash);

      const result = tokenSecurity.generateDeviceFingerprint(longUserAgent, ipAddress);

      expect(result).toBe("longhash");
      expect(mockUpdate).toHaveBeenCalledWith(expect.stringContaining("a".repeat(1000)));
    });

    it("should handle null-like strings in userAgent", () => {
      const userAgent = "null";
      const ipAddress = "192.168.1.1";
      const mockDigest = jest.fn().mockReturnValue("nullhash");
      const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdate } as unknown as Hash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("null-192.168.1.1");
    });

    it("should handle 'undefined' string in userAgent", () => {
      const userAgent = "undefined";
      const ipAddress = "192.168.1.1";
      const mockDigest = jest.fn().mockReturnValue("undefinedhash");
      const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdate } as unknown as Hash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("undefined-192.168.1.1");
    });

    it("should handle very large length for token generation", () => {
      const largeLength = 1000000;
      const mockBuffer = Buffer.from("zz".repeat(1000000), "hex");
      mockCrypto.randomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(largeLength);

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(largeLength);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should handle length as string number", () => {
      const mockBuffer = Buffer.from("kk".repeat(16), "hex");
      mockCrypto.randomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken("8" as unknown as number);

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should handle null length for token generation", () => {
      const mockBuffer = Buffer.from("ll".repeat(32), "hex");
      mockCrypto.randomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(null as unknown as number);

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should handle undefined length for token generation", () => {
      const mockBuffer = Buffer.from("mm".repeat(32), "hex");
      mockCrypto.randomBytes.mockReturnValue(mockBuffer as unknown as void);

      const result = tokenSecurity.generateSecureToken(undefined as unknown as number);

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(mockBuffer.toString("hex"));
    });

    it("should handle userAgent with only whitespace", () => {
      const userAgent = "   ";
      const ipAddress = "192.168.1.1";
      const mockDigest = jest.fn().mockReturnValue("whitespacehash");
      const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdate } as unknown as Hash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("unknown-192.168.1.1");
    });

    it("should handle ipAddress with only whitespace", () => {
      const userAgent = "Mozilla/5.0";
      const ipAddress = "   ";
      const mockDigest = jest.fn().mockReturnValue("ipwhitespacehash");
      const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdate } as unknown as Hash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("mozilla/5.0-unknown");
    });

    it("should handle both userAgent and ipAddress with only whitespace", () => {
      const userAgent = "   ";
      const ipAddress = "   ";
      const mockDigest = jest.fn().mockReturnValue("bothwhitespacehash");
      const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdate } as unknown as Hash);

      tokenSecurity.generateDeviceFingerprint(userAgent, ipAddress);

      expect(mockUpdate).toHaveBeenCalledWith("unknown-unknown");
    });
  });

  describe("crypto error handling", () => {
    it("should handle crypto.randomBytes error", () => {
      const error = new Error("Random bytes generation failed");
      mockCrypto.randomBytes.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenSecurity.generateSecureToken()).toThrow("Random bytes generation failed");
    });

    it("should handle crypto.createHash error", () => {
      const error = new Error("Hash creation failed");
      mockCrypto.createHash.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenSecurity.generateDeviceFingerprint("test", "192.168.1.1")).toThrow("Hash creation failed");
    });

    it("should handle crypto.update error", () => {
      const error = new Error("Update failed");
      const mockUpdateFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdateFn } as unknown as Hash);

      expect(() => tokenSecurity.generateDeviceFingerprint("test", "192.168.1.1")).toThrow("Update failed");
    });

    it("should handle crypto.digest error", () => {
      const error = new Error("Digest failed");
      const mockDigestFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const mockUpdateFn = jest.fn().mockReturnValue({ digest: mockDigestFn });
      mockCrypto.createHash.mockReturnValue({ update: mockUpdateFn } as unknown as Hash);

      expect(() => tokenSecurity.generateDeviceFingerprint("test", "192.168.1.1")).toThrow("Digest failed");
    });
  });
});
