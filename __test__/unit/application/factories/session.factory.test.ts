import { SessionFactory } from "@/application/factories/session.factory";
import { User } from "@/domain/entities/user.entity";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { AuthTokenIssuerPort } from "@/application/ports/driven/auth-token-issuer.port";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";
import { Session } from "@/domain/entities/session.entity";
import { AuthTokenPair } from "@/application/types/auth-token.type";
import { TimeUtil } from "@/utils/time.util";
import { SessionPolicy } from "@/domain/policies/session.policy";

jest.mock("@/utils/time.util");

describe("SessionFactory", () => {
  let sessionFactory: SessionFactory;
  let mockSessionPolicy: jest.Mocked<SessionPolicy>;
  let mockAuthTokenIssuer: jest.Mocked<AuthTokenIssuerPort>;
  let mockFingerprintProvider: jest.Mocked<FingerprintPort>;
  let mockIdGenerator: jest.Mocked<IdGeneratorPort>;
  let mockRequestContext: jest.Mocked<RequestContextPort>;
  let mockUser: jest.Mocked<User>;

  const mockAccessToken = "mock-access-token";
  const mockRefreshToken = "mock-refresh-token";
  const mockTokenFingerprint = "fingerprint-789";
  const mockSessionId = "session-123";
  const mockTokenFamily = "token-family-456";
  const mockUserId = "user-123";
  const mockDeviceId = "device-abc";
  const mockIpAddress = "192.168.1.100";
  const mockUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const mockRequestId = "request-uuid-1234-5678";

  const mockAccessExpiryMinutes = 15;
  const mockRefreshExpiryDays = 7;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T10:00:00.000Z"));

    mockSessionPolicy = {
      accessTokenLifetimeMinutes: mockAccessExpiryMinutes,
      refreshTokenLifetimeDays: mockRefreshExpiryDays,
    } as jest.Mocked<SessionPolicy>;

    mockAuthTokenIssuer = {
      issueAccessToken: jest.fn().mockReturnValue(mockAccessToken),
      issueRefreshToken: jest.fn().mockReturnValue(mockRefreshToken),
    } as jest.Mocked<AuthTokenIssuerPort>;

    mockFingerprintProvider = {
      fingerprint: jest.fn().mockReturnValue(mockTokenFingerprint),
      compareFingerprint: jest.fn(),
    } as jest.Mocked<FingerprintPort>;

    mockIdGenerator = {
      generate: jest.fn().mockReturnValueOnce(mockSessionId).mockReturnValueOnce(mockTokenFamily),
    } as jest.Mocked<IdGeneratorPort>;

    mockRequestContext = {
      get: jest.fn().mockReturnValue({
        deviceId: mockDeviceId,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      }),
    } as jest.Mocked<RequestContextPort>;

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
    } as unknown as jest.Mocked<User>;

    (TimeUtil.daysToMs as jest.Mock).mockImplementation((days: number) => days * 24 * 60 * 60 * 1000);

    sessionFactory = new SessionFactory(mockSessionPolicy, mockAuthTokenIssuer, mockFingerprintProvider, mockIdGenerator, mockRequestContext);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Constructor", () => {
    it("should initialize with all dependencies", () => {
      expect(sessionFactory).toBeInstanceOf(SessionFactory);
    });

    it("should calculate refresh expiration date correctly", () => {
      const now = new Date("2024-01-01T10:00:00.000Z");
      jest.setSystemTime(now);

      new SessionFactory(mockSessionPolicy, mockAuthTokenIssuer, mockFingerprintProvider, mockIdGenerator, mockRequestContext);

      expect(TimeUtil.daysToMs).toHaveBeenCalledWith(mockRefreshExpiryDays);
    });

    it("should use session policy for refresh token lifetime", () => {
      new SessionFactory(mockSessionPolicy, mockAuthTokenIssuer, mockFingerprintProvider, mockIdGenerator, mockRequestContext);

      expect(mockSessionPolicy.refreshTokenLifetimeDays).toBe(mockRefreshExpiryDays);
    });

    it("should handle zero days refresh token lifetime", () => {
      mockSessionPolicy.refreshTokenLifetimeDays = 0;

      const factory = new SessionFactory(mockSessionPolicy, mockAuthTokenIssuer, mockFingerprintProvider, mockIdGenerator, mockRequestContext);

      expect(factory).toBeInstanceOf(SessionFactory);
    });

    it("should handle very large days for refresh token lifetime", () => {
      mockSessionPolicy.refreshTokenLifetimeDays = 365;

      const factory = new SessionFactory(mockSessionPolicy, mockAuthTokenIssuer, mockFingerprintProvider, mockIdGenerator, mockRequestContext);

      expect(factory).toBeInstanceOf(SessionFactory);
    });
  });

  describe("build", () => {
    let result: { session: Session } & AuthTokenPair;

    describe("with complete request context", () => {
      beforeEach(() => {
        result = sessionFactory.build(mockUser);
      });

      it("should call issueAccessToken with correct parameters", () => {
        expect(mockAuthTokenIssuer.issueAccessToken).toHaveBeenCalledWith(mockUser);
      });

      it("should call issueRefreshToken with correct parameters", () => {
        expect(mockAuthTokenIssuer.issueRefreshToken).toHaveBeenCalledWith(mockUser, mockSessionId);
      });

      it("should get request context correctly", () => {
        expect(mockRequestContext.get).toHaveBeenCalled();
      });

      it("should generate session ID", () => {
        expect(mockIdGenerator.generate).toHaveBeenCalled();
      });

      it("should generate token family when not provided", () => {
        expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
      });

      it("should fingerprint the refresh token", () => {
        expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockRefreshToken);
      });

      it("should return a session object", () => {
        expect(result.session).toBeInstanceOf(Session);
        expect(result.session.getId()).toBe(mockSessionId);
        expect(result.session.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(result.session.getTokenFamily()).toBe(mockTokenFamily);
        expect(result.session.getUserId()).toBe(mockUserId);
        expect(result.session.getIpAddress()).toBe(mockIpAddress);
        expect(result.session.getDeviceId()).toBe(mockDeviceId);
        expect(result.session.getUserAgent()).toBe(mockUserAgent);
      });

      it("should return access and refresh tokens", () => {
        expect(result.accessToken).toBe(mockAccessToken);
        expect(result.refreshToken).toBe(mockRefreshToken);
      });

      it("should create session with correct expiration", () => {
        const expectedExpiresAt = new Date(Date.now() + TimeUtil.daysToMs(mockRefreshExpiryDays));
        const expiresAt = result.session.getExpiresAt();
        expect(expiresAt).toBeInstanceOf(Date);
        expect(expiresAt.getTime()).toBe(expectedExpiresAt.getTime());
      });

      it("should create session with null revoked fields", () => {
        expect(result.session.getRevokedAt()).toBeNull();
        expect(result.session.getRevokeReason()).toBeNull();
      });

      it("should create session with createdAt and updatedAt", () => {
        expect(result.session.getCreatedAt()).toBeInstanceOf(Date);
        expect(result.session.getUpdatedAt()).toBeInstanceOf(Date);
      });

      it("should return both session and tokens in the result", () => {
        expect(result).toHaveProperty("session");
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
      });
    });

    describe("with continued token family", () => {
      const continuedTokenFamily = "continued-family-789";

      beforeEach(() => {
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockReturnValueOnce(mockSessionId);

        result = sessionFactory.build(mockUser, continuedTokenFamily);
      });

      it("should use continued token family instead of generating new one", () => {
        expect(mockIdGenerator.generate).toHaveBeenCalledTimes(1);
        expect(result.session.getTokenFamily()).toBe(continuedTokenFamily);
      });

      it("should still generate session ID", () => {
        expect(mockIdGenerator.generate).toHaveBeenCalledWith();
        expect(result.session.getId()).toBe(mockSessionId);
      });

      it("should fingerprint the refresh token", () => {
        expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockRefreshToken);
      });
    });

    describe("with null request context values", () => {
      beforeEach(() => {
        mockRequestContext.get.mockReturnValue({
          requestId: null as unknown as string,
          deviceId: null as unknown as string,
          ipAddress: null as unknown as string,
          userAgent: null as unknown as string,
        });

        result = sessionFactory.build(mockUser);
      });

      it("should create session with null optional fields", () => {
        expect(result.session.getDeviceId()).toBeNull();
        expect(result.session.getIpAddress()).toBeNull();
        expect(result.session.getUserAgent()).toBeNull();
      });

      it("should still have required fields set", () => {
        expect(result.session.getId()).toBe(mockSessionId);
        expect(result.session.getUserId()).toBe(mockUserId);
        expect(result.session.getTokenFingerprint()).toBe(mockTokenFingerprint);
      });
    });

    describe("with partial request context", () => {
      beforeEach(() => {
        mockRequestContext.get.mockReturnValue({
          requestId: null as unknown as string,
          deviceId: mockDeviceId,
          ipAddress: null as unknown as string,
          userAgent: null as unknown as string,
        });

        result = sessionFactory.build(mockUser);
      });

      it("should handle mixed null and non-null values", () => {
        expect(result.session.getDeviceId()).toBe(mockDeviceId);
        expect(result.session.getIpAddress()).toBeNull();
        expect(result.session.getUserAgent()).toBeNull();
      });
    });

    describe("with empty string request context values", () => {
      beforeEach(() => {
        mockRequestContext.get.mockReturnValue({
          requestId: "",
          deviceId: "",
          ipAddress: "",
          userAgent: "",
        });

        result = sessionFactory.build(mockUser);
      });

      it("should handle empty strings in request context", () => {
        expect(result.session.getDeviceId()).toBe(null);
        expect(result.session.getIpAddress()).toBe(null);
        expect(result.session.getUserAgent()).toBe(null);
      });
    });

    describe("with undefined request context values", () => {
      beforeEach(() => {
        mockRequestContext.get.mockReturnValue({
          requestId: undefined as unknown as string,
          deviceId: undefined as unknown as string,
          ipAddress: undefined as unknown as string,
          userAgent: undefined as unknown as string,
        });

        result = sessionFactory.build(mockUser);
      });

      it("should handle undefined values in request context", () => {
        expect(result.session.getDeviceId()).toBeNull();
        expect(result.session.getIpAddress()).toBeNull();
        expect(result.session.getUserAgent()).toBeNull();
      });
    });

    describe("error handling", () => {
      it("should throw if fingerprint provider fails", () => {
        const error = new Error("Fingerprint generation failed");
        mockFingerprintProvider.fingerprint.mockImplementation(() => {
          throw error;
        });

        expect(() => sessionFactory.build(mockUser)).toThrow("Fingerprint generation failed");
      });

      it("should throw if token issuer fails for access token", () => {
        const error = new Error("Token issuance failed");
        mockAuthTokenIssuer.issueAccessToken.mockImplementation(() => {
          throw error;
        });

        expect(() => sessionFactory.build(mockUser)).toThrow("Token issuance failed");
      });

      it("should throw if token issuer fails for refresh token", () => {
        const error = new Error("Token issuance failed");
        mockAuthTokenIssuer.issueRefreshToken.mockImplementation(() => {
          throw error;
        });

        expect(() => sessionFactory.build(mockUser)).toThrow("Token issuance failed");
      });

      it("should throw if ID generator fails for session ID", () => {
        const error = new Error("ID generation failed");
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockImplementation(() => {
          throw error;
        });

        expect(() => sessionFactory.build(mockUser)).toThrow("ID generation failed");
      });

      it("should throw if ID generator fails for token family", () => {
        const error = new Error("ID generation failed");
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockReturnValueOnce(mockSessionId);
        mockIdGenerator.generate.mockImplementationOnce(() => {
          throw error;
        });

        expect(() => sessionFactory.build(mockUser)).toThrow("ID generation failed");
      });

      it("should throw if request context fails", () => {
        const error = new Error("Request context failed");
        mockRequestContext.get.mockImplementation(() => {
          throw error;
        });

        expect(() => sessionFactory.build(mockUser)).toThrow("Request context failed");
      });
    });

    describe("token family behavior", () => {
      it("should generate new token family when not provided", () => {
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockReturnValueOnce(mockSessionId).mockReturnValueOnce(mockTokenFamily);

        const result = sessionFactory.build(mockUser);
        expect(result.session.getTokenFamily()).toBe(mockTokenFamily);
        expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
      });

      it("should use provided token family when available", () => {
        const customFamily = "custom-family-123";
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockReturnValueOnce(mockSessionId);

        const result = sessionFactory.build(mockUser, customFamily);
        expect(result.session.getTokenFamily()).toBe(customFamily);
        expect(mockIdGenerator.generate).toHaveBeenCalledTimes(1);
      });

      it("should handle empty string as token family (treats as falsy, generates new)", () => {
        const emptyFamily = "";
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockReturnValueOnce(mockSessionId).mockReturnValueOnce(mockTokenFamily);

        const result = sessionFactory.build(mockUser, emptyFamily);

        expect(result.session.getTokenFamily()).toBe(mockTokenFamily);
        expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
      });

      it("should handle null as token family (treats as falsy, generates new)", () => {
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockReturnValueOnce(mockSessionId).mockReturnValueOnce(mockTokenFamily);

        const result = sessionFactory.build(mockUser, null as unknown as string);

        expect(result.session.getTokenFamily()).toBe(mockTokenFamily);
        expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
      });

      it("should handle undefined as token family (treats as falsy, generates new)", () => {
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockReturnValueOnce(mockSessionId).mockReturnValueOnce(mockTokenFamily);

        const result = sessionFactory.build(mockUser, undefined);

        expect(result.session.getTokenFamily()).toBe(mockTokenFamily);
        expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
      });
    });

    describe("session creation details", () => {
      it("should create session with all required fields", () => {
        const result = sessionFactory.build(mockUser);

        const session = result.session;
        expect(session.getId()).toBe(mockSessionId);
        expect(session.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(session.getTokenFamily()).toBe(mockTokenFamily);
        expect(session.getUserId()).toBe(mockUserId);
        expect(session.getExpiresAt()).toBeInstanceOf(Date);
        expect(session.getCreatedAt()).toBeInstanceOf(Date);
        expect(session.getUpdatedAt()).toBeInstanceOf(Date);
      });

      it("should create session with revoked fields as null", () => {
        const result = sessionFactory.build(mockUser);
        const session = result.session;

        expect(session.getRevokedAt()).toBeNull();
        expect(session.getRevokeReason()).toBeNull();
      });

      it("should create session with correct token fingerprint", () => {
        const result = sessionFactory.build(mockUser);
        expect(result.session.getTokenFingerprint()).toBe(mockTokenFingerprint);
        expect(mockFingerprintProvider.fingerprint).toHaveBeenCalledWith(mockRefreshToken);
      });

      it("should create session with device information from request context", () => {
        const result = sessionFactory.build(mockUser);
        const session = result.session;

        expect(session.getDeviceId()).toBe(mockDeviceId);
        expect(session.getIpAddress()).toBe(mockIpAddress);
        expect(session.getUserAgent()).toBe(mockUserAgent);
      });
    });

    describe("integration scenarios", () => {
      it("should successfully create session with all dependencies", () => {
        const result = sessionFactory.build(mockUser);

        expect(result).toHaveProperty("session");
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
        expect(result.session).toBeInstanceOf(Session);
        expect(result.accessToken).toBe(mockAccessToken);
        expect(result.refreshToken).toBe(mockRefreshToken);
      });

      it("should handle multiple sequential builds", () => {
        mockIdGenerator.generate
          .mockReset()
          .mockReturnValueOnce("session-1")
          .mockReturnValueOnce("family-1")
          .mockReturnValueOnce("session-2")
          .mockReturnValueOnce("family-2");

        mockAuthTokenIssuer.issueAccessToken.mockReset().mockReturnValueOnce("access-1").mockReturnValueOnce("access-2");

        mockAuthTokenIssuer.issueRefreshToken.mockReset().mockReturnValueOnce("refresh-1").mockReturnValueOnce("refresh-2");

        const result1 = sessionFactory.build(mockUser);
        const result2 = sessionFactory.build(mockUser);

        expect(result1.session.getId()).toBe("session-1");
        expect(result2.session.getId()).toBe("session-2");
        expect(result1.session.getTokenFamily()).toBe("family-1");
        expect(result2.session.getTokenFamily()).toBe("family-2");
        expect(result1.accessToken).toBe("access-1");
        expect(result2.accessToken).toBe("access-2");
      });

      it("should handle multiple builds with same token family", () => {
        const tokenFamily = "same-family-123";
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockReturnValueOnce("session-1").mockReturnValueOnce("session-2");

        const result1 = sessionFactory.build(mockUser, tokenFamily);
        const result2 = sessionFactory.build(mockUser, tokenFamily);

        expect(result1.session.getTokenFamily()).toBe(tokenFamily);
        expect(result2.session.getTokenFamily()).toBe(tokenFamily);
        expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
        expect(result1.session.getId()).toBe("session-1");
        expect(result2.session.getId()).toBe("session-2");
      });

      it("should create sessions with different IDs but same family", () => {
        const tokenFamily = "same-family-123";
        mockIdGenerator.generate.mockReset();
        mockIdGenerator.generate.mockReturnValueOnce("session-1").mockReturnValueOnce("session-2");

        const result1 = sessionFactory.build(mockUser, tokenFamily);
        const result2 = sessionFactory.build(mockUser, tokenFamily);

        expect(result1.session.getId()).toBe("session-1");
        expect(result2.session.getId()).toBe("session-2");
        expect(result1.session.getTokenFamily()).toBe(tokenFamily);
        expect(result2.session.getTokenFamily()).toBe(tokenFamily);
      });

      it("should fingerprint refresh token before creating session", () => {
        const fingerprintSpy = jest.spyOn(mockFingerprintProvider, "fingerprint");
        sessionFactory.build(mockUser);

        expect(fingerprintSpy).toHaveBeenCalledWith(mockRefreshToken);
        expect(fingerprintSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe("edge cases", () => {
      it("should handle user with very long ID", () => {
        const longUserId = "a".repeat(1000);
        mockUser.getId.mockReturnValue(longUserId);

        const result = sessionFactory.build(mockUser);
        expect(result.session.getUserId()).toBe(longUserId);
      });

      it("should handle very long user agent string", () => {
        const longUserAgent = "a".repeat(10000);
        mockRequestContext.get.mockReturnValue({
          requestId: mockRequestId,
          deviceId: mockDeviceId,
          ipAddress: mockIpAddress,
          userAgent: longUserAgent,
        });

        const result = sessionFactory.build(mockUser);
        expect(result.session.getUserAgent()).toBe(longUserAgent);
      });

      it("should handle very long device ID", () => {
        const longDeviceId = "a".repeat(1000);
        mockRequestContext.get.mockReturnValue({
          requestId: mockRequestId,
          deviceId: longDeviceId,
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
        });

        const result = sessionFactory.build(mockUser);
        expect(result.session.getDeviceId()).toBe(longDeviceId);
      });

      it("should handle IPv6 address", () => {
        const ipv6Address = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
        mockRequestContext.get.mockReturnValue({
          requestId: mockRequestId,
          deviceId: mockDeviceId,
          ipAddress: ipv6Address,
          userAgent: mockUserAgent,
        });

        const result = sessionFactory.build(mockUser);
        expect(result.session.getIpAddress()).toBe(ipv6Address);
      });

      it("should handle session policy with zero access token lifetime", () => {
        mockSessionPolicy.accessTokenLifetimeMinutes = 0;

        const factory = new SessionFactory(mockSessionPolicy, mockAuthTokenIssuer, mockFingerprintProvider, mockIdGenerator, mockRequestContext);

        expect(factory).toBeInstanceOf(SessionFactory);
        expect(mockSessionPolicy.accessTokenLifetimeMinutes).toBe(0);
      });

      it("should handle special characters in device ID", () => {
        const specialDeviceId = "device!@#$%^&*()_+";
        mockRequestContext.get.mockReturnValue({
          requestId: mockRequestId,
          deviceId: specialDeviceId,
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
        });

        const result = sessionFactory.build(mockUser);
        expect(result.session.getDeviceId()).toBe(specialDeviceId);
      });

      it("should handle Unicode characters in user agent", () => {
        const unicodeUserAgent = "🚀 Browser ✨";
        mockRequestContext.get.mockReturnValue({
          requestId: mockRequestId,
          deviceId: mockDeviceId,
          ipAddress: mockIpAddress,
          userAgent: unicodeUserAgent,
        });

        const result = sessionFactory.build(mockUser);
        expect(result.session.getUserAgent()).toBe(unicodeUserAgent);
      });

      it("should handle refresh expiration at exact boundary", () => {
        const now = new Date("2024-01-01T00:00:00.000Z");
        jest.setSystemTime(now);

        const factory = new SessionFactory(mockSessionPolicy, mockAuthTokenIssuer, mockFingerprintProvider, mockIdGenerator, mockRequestContext);

        const result = factory.build(mockUser);
        const expected = new Date(now.getTime() + TimeUtil.daysToMs(mockRefreshExpiryDays));
        expect(result.session.getExpiresAt().getTime()).toBe(expected.getTime());
      });
    });

    describe("performance considerations", () => {
      it("should execute build quickly", () => {
        const startTime = Date.now();
        sessionFactory.build(mockUser);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(100);
      });

      it("should handle multiple builds efficiently", () => {
        const startTime = Date.now();
        for (let i = 0; i < 1000; i++) {
          sessionFactory.build(mockUser);
        }
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe("type safety", () => {
      it("should accept User for user parameter", () => {
        const user: User = mockUser as User;

        const result = sessionFactory.build(user);
        expect(result).toHaveProperty("session");
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
      });

      it("should accept optional string for continuedTokenFamily", () => {
        const tokenFamily = "some-family";

        const result = sessionFactory.build(mockUser, tokenFamily);
        expect(result.session.getTokenFamily()).toBe(tokenFamily);
      });

      it("should return SessionBuildResult type", () => {
        const result = sessionFactory.build(mockUser);

        expect(result).toHaveProperty("session");
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
        expect(result.session).toBeInstanceOf(Session);
        expect(typeof result.accessToken).toBe("string");
        expect(typeof result.refreshToken).toBe("string");
      });
    });
  });
});
