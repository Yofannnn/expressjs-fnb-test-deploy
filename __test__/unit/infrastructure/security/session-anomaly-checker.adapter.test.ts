import { SessionAnomalyCheckerAdapter } from "@/infrastructure/security/session-anomaly-checker.adapter";
import { TokenSecurity } from "@/application/ports/driven/token-security";
import { Session } from "@/domain/entities/session.entity";

describe("SessionAnomalyCheckerAdapter", () => {
  let checker: SessionAnomalyCheckerAdapter;
  let mockTokenSecurity: jest.Mocked<TokenSecurity>;

  const mockSessionId = "session-123";
  const mockUserId = "user-123";
  const mockTokenHash = "hashed-token-456";
  const mockTokenFamily = "family-789";
  const mockExpiresAt = new Date("2024-01-08T10:00:00.000Z");
  const mockCreatedAt = new Date("2024-01-01T10:00:00.000Z");
  const mockUpdatedAt = new Date("2024-01-01T10:00:00.000Z");
  const mockUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const mockIpAddress = "192.168.1.100";
  const mockDeviceId = "device-abc";
  const mockFingerprint = "fingerprint-123456789";

  const createMockSession = (userAgent: string | null = mockUserAgent, ipAddress: string | null = mockIpAddress): Session => {
    return Session.rebuild({
      id: mockSessionId,
      userId: mockUserId,
      tokenHash: mockTokenHash,
      tokenFamily: mockTokenFamily,
      expiresAt: mockExpiresAt,
      ipAddress,
      deviceId: mockDeviceId,
      userAgent,
      revokedAt: null,
      revokeReason: null,
      createdAt: mockCreatedAt,
      updatedAt: mockUpdatedAt,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTokenSecurity = {
      generateSecureToken: jest.fn(),
      generateDeviceFingerprint: jest.fn(),
    } as unknown as jest.Mocked<TokenSecurity>;

    mockTokenSecurity.generateDeviceFingerprint.mockReturnValue(mockFingerprint);

    checker = new SessionAnomalyCheckerAdapter(mockTokenSecurity);
  });

  describe("constructor", () => {
    it("should initialize with TokenSecurity", () => {
      expect(checker).toBeInstanceOf(SessionAnomalyCheckerAdapter);
    });
  });

  describe("isFingerprintMismatch", () => {
    it("should return false when fingerprints match", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = mockUserAgent;
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledTimes(2);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(currentUserAgent, currentIp);
    });

    it("should return true when fingerprints do not match", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = "Different User Agent";
      const currentIp = "10.0.0.1";

      mockTokenSecurity.generateDeviceFingerprint.mockReturnValueOnce("fingerprint-original").mockReturnValueOnce("fingerprint-current");

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(true);
    });

    it("should handle null currentUserAgent", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = null;
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, mockIpAddress);
    });

    it("should handle null currentIp", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = mockUserAgent;
      const currentIp = null;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, undefined);
    });

    it("should handle null both currentUserAgent and currentIp", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = null;
      const currentIp = null;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle null session userAgent", () => {
      const session = createMockSession(null, mockIpAddress);
      const currentUserAgent = mockUserAgent;
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(currentUserAgent, currentIp);
    });

    it("should handle null session ipAddress", () => {
      const session = createMockSession(mockUserAgent, null);
      const currentUserAgent = mockUserAgent;
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, undefined);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(currentUserAgent, currentIp);
    });

    it("should handle null session userAgent and null currentUserAgent", () => {
      const session = createMockSession(null, mockIpAddress);
      const currentUserAgent = null;
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, mockIpAddress);
    });

    it("should handle null session ipAddress and null currentIp", () => {
      const session = createMockSession(mockUserAgent, null);
      const currentUserAgent = mockUserAgent;
      const currentIp = null;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, undefined);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, undefined);
    });

    it("should handle empty string userAgent", () => {
      const session = createMockSession("", mockIpAddress);
      const currentUserAgent = "";
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, mockIpAddress);
    });

    it("should handle empty string ipAddress", () => {
      const session = createMockSession(mockUserAgent, "");
      const currentUserAgent = mockUserAgent;
      const currentIp = "";

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, undefined);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, undefined);
    });

    it("should handle different userAgent but same fingerprint", () => {
      const session = createMockSession("User Agent 1", mockIpAddress);
      const currentUserAgent = "User Agent 2";
      const currentIp = mockIpAddress;

      mockTokenSecurity.generateDeviceFingerprint.mockReturnValueOnce("same-fingerprint").mockReturnValueOnce("same-fingerprint");

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
    });

    it("should handle different ipAddress but same fingerprint", () => {
      const session = createMockSession(mockUserAgent, "192.168.1.1");
      const currentUserAgent = mockUserAgent;
      const currentIp = "192.168.1.2";

      mockTokenSecurity.generateDeviceFingerprint.mockReturnValueOnce("same-fingerprint").mockReturnValueOnce("same-fingerprint");

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
    });

    it("should handle different userAgent and ipAddress but same fingerprint", () => {
      const session = createMockSession("User Agent 1", "192.168.1.1");
      const currentUserAgent = "User Agent 2";
      const currentIp = "192.168.1.2";

      mockTokenSecurity.generateDeviceFingerprint.mockReturnValueOnce("same-fingerprint").mockReturnValueOnce("same-fingerprint");

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
    });

    it("should handle very long userAgent strings", () => {
      const longUserAgent = "a".repeat(10000);
      const session = createMockSession(longUserAgent, mockIpAddress);
      const currentUserAgent = longUserAgent;
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(longUserAgent, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(longUserAgent, mockIpAddress);
    });

    it("should handle very long ipAddress strings", () => {
      const longIpAddress = "a".repeat(1000);
      const session = createMockSession(mockUserAgent, longIpAddress);
      const currentUserAgent = mockUserAgent;
      const currentIp = longIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, longIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, longIpAddress);
    });

    it("should handle IPv6 addresses", () => {
      const ipv6Address = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
      const session = createMockSession(mockUserAgent, ipv6Address);
      const currentUserAgent = mockUserAgent;
      const currentIp = ipv6Address;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, ipv6Address);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, ipv6Address);
    });

    it("should handle special characters in userAgent", () => {
      const specialUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) !@#$%^&*()";
      const session = createMockSession(specialUserAgent, mockIpAddress);
      const currentUserAgent = specialUserAgent;
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(specialUserAgent, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(specialUserAgent, mockIpAddress);
    });

    it("should handle Unicode characters in userAgent", () => {
      const unicodeUserAgent = "Mozilla/5.0 🚀 (Windows NT 10.0) 测试";
      const session = createMockSession(unicodeUserAgent, mockIpAddress);
      const currentUserAgent = unicodeUserAgent;
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(unicodeUserAgent, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(unicodeUserAgent, mockIpAddress);
    });
  });

  describe("edge cases", () => {
    it("should handle session with null userAgent and null ipAddress", () => {
      const session = createMockSession(null, null);
      const currentUserAgent = mockUserAgent;
      const currentIp = mockIpAddress;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, undefined);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(currentUserAgent, currentIp);
    });

    it("should handle currentUserAgent and currentIp both null with session having values", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = null;
      const currentIp = null;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, mockIpAddress);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle session with empty strings and current with null", () => {
      const session = createMockSession("", "");
      const currentUserAgent = null;
      const currentIp = null;

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, undefined);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle session with null and current with empty strings", () => {
      const session = createMockSession(null, null);
      const currentUserAgent = "";
      const currentIp = "";

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, undefined);
      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe("TokenSecurity interaction", () => {
    it("should call generateDeviceFingerprint exactly twice", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = mockUserAgent;
      const currentIp = mockIpAddress;

      checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledTimes(2);
    });

    it("should call generateDeviceFingerprint with original session data", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = "Different User Agent";
      const currentIp = "10.0.0.1";

      checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(mockUserAgent, mockIpAddress);
    });

    it("should call generateDeviceFingerprint with current request data", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = "Different User Agent";
      const currentIp = "10.0.0.1";

      checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(currentUserAgent, currentIp);
    });

    it("should pass undefined to generateDeviceFingerprint when session fields are null", () => {
      const session = createMockSession(null, null);
      const currentUserAgent = mockUserAgent;
      const currentIp = mockIpAddress;

      checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should pass undefined to generateDeviceFingerprint when current fields are null", () => {
      const session = createMockSession(mockUserAgent, mockIpAddress);
      const currentUserAgent = null;
      const currentIp = null;

      checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(mockTokenSecurity.generateDeviceFingerprint).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe("integration scenarios", () => {
    it("should correctly identify anomaly when userAgent changes", () => {
      const session = createMockSession("Chrome/100.0", "192.168.1.1");
      const currentUserAgent = "Firefox/90.0";
      const currentIp = "192.168.1.1";

      mockTokenSecurity.generateDeviceFingerprint.mockReturnValueOnce("fingerprint-1").mockReturnValueOnce("fingerprint-2");

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(true);
    });

    it("should correctly identify anomaly when ipAddress changes", () => {
      const session = createMockSession("Chrome/100.0", "192.168.1.1");
      const currentUserAgent = "Chrome/100.0";
      const currentIp = "10.0.0.1";

      mockTokenSecurity.generateDeviceFingerprint.mockReturnValueOnce("fingerprint-1").mockReturnValueOnce("fingerprint-2");

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(true);
    });

    it("should correctly identify anomaly when both userAgent and ipAddress change", () => {
      const session = createMockSession("Chrome/100.0", "192.168.1.1");
      const currentUserAgent = "Firefox/90.0";
      const currentIp = "10.0.0.1";

      mockTokenSecurity.generateDeviceFingerprint.mockReturnValueOnce("fingerprint-1").mockReturnValueOnce("fingerprint-2");

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(true);
    });

    it("should correctly identify no anomaly when session and current match", () => {
      const session = createMockSession("Chrome/100.0", "192.168.1.1");
      const currentUserAgent = "Chrome/100.0";
      const currentIp = "192.168.1.1";

      mockTokenSecurity.generateDeviceFingerprint.mockReturnValueOnce("fingerprint-1").mockReturnValueOnce("fingerprint-1");

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
    });

    it("should handle session with null values and current with matching null equivalents", () => {
      const session = createMockSession(null, null);
      const currentUserAgent = null;
      const currentIp = null;

      mockTokenSecurity.generateDeviceFingerprint.mockReturnValueOnce("fingerprint-1").mockReturnValueOnce("fingerprint-1");

      const result = checker.isFingerprintMismatch(session, currentUserAgent, currentIp);

      expect(result).toBe(false);
    });
  });
});
