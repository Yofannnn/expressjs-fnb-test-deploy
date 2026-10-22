import { JWTTokenVerifierAdapter } from "@/infrastructure/security/jwt-token-verifier.adapter";
import { AccessTokenPayload, RefreshTokenPayload } from "@/application/types/auth-token.type";
import { JwtConfig } from "@/infrastructure/config/jwt.config";
import jwt, { JwtPayload } from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("JWTTokenVerifierAdapter", () => {
  let tokenVerifier: JWTTokenVerifierAdapter;
  let mockConfig: jest.Mocked<JwtConfig>;
  let mockJwt: jest.Mocked<typeof jwt>;

  const mockAccessSecret = "access-secret-key-12345678901234567890";
  const mockRefreshSecret = "refresh-secret-key-12345678901234567890";

  beforeEach(() => {
    mockConfig = {
      accessSecret: mockAccessSecret,
      refreshSecret: mockRefreshSecret,
    } as jest.Mocked<JwtConfig>;

    mockJwt = jwt as jest.Mocked<typeof jwt>;

    tokenVerifier = new JWTTokenVerifierAdapter(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with config", () => {
      const verifier = new JWTTokenVerifierAdapter(mockConfig);
      expect(verifier).toBeInstanceOf(JWTTokenVerifierAdapter);
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify and return access token payload", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
        iat: 1234567890,
        exp: 1234567900,
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result).toEqual({
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      });
    });

    it("should call jwt.verify with correct parameters", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      tokenVerifier.verifyAccessToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, mockAccessSecret);
    });

    it("should use access secret from config", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      tokenVerifier.verifyAccessToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, mockAccessSecret);
    });

    it("should extract only required fields from payload", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
        iat: 1234567890,
        exp: 1234567900,
        extraField: "should not be included",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result).toEqual({
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      });
      expect(result).not.toHaveProperty("iat");
      expect(result).not.toHaveProperty("exp");
      expect(result).not.toHaveProperty("extraField");
    });

    it("should handle different user roles", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: "admin-456",
        email: "admin@example.com",
        name: "Admin User",
        role: "ADMIN",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.role).toBe("ADMIN");
    });

    it("should handle special characters in email and name", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test+tag@sub.example.com",
        name: "Test O'Brien",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.email).toBe("test+tag@sub.example.com");
      expect(result.name).toBe("Test O'Brien");
    });

    it("should handle missing sub in payload", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.sub).toBeUndefined();
    });

    it("should handle missing email in payload", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        name: "Test User",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.email).toBeUndefined();
    });

    it("should handle missing name in payload", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.name).toBeUndefined();
    });

    it("should handle missing role in payload", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.role).toBeUndefined();
    });

    it("should throw error for invalid token", () => {
      const token = "invalid.token";
      const error = new Error("invalid signature");

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow("invalid signature");
    });

    it("should throw error for expired token", () => {
      const token = "expired.token";
      const error = new Error("jwt expired");

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow("jwt expired");
    });

    it("should throw error for malformed token", () => {
      const token = "malformed";
      const error = new Error("jwt malformed");

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow("jwt malformed");
    });

    it("should handle payload with null values", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: null as unknown as string,
        email: null,
        name: null,
        role: null,
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.sub).toBeNull();
      expect(result.email).toBeNull();
      expect(result.name).toBeNull();
      expect(result.role).toBeNull();
    });

    it("should handle payload with numeric values", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: 12345 as unknown as string,
        email: "test@example.com",
        name: "Test User",
        role: 1,
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.sub).toBe(12345);
      expect(result.role).toBe(1);
    });

    it("should handle payload with object sub", () => {
      const token = "valid.access.token";
      const mockPayload: JwtPayload = {
        sub: { id: "user-123", type: "user" } as unknown as string,
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.sub).toEqual({ id: "user-123", type: "user" });
    });

    it("should handle JsonWebTokenError", () => {
      const token = "invalid.token";
      const error = new Error("JsonWebTokenError");
      error.name = "JsonWebTokenError";

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow();
    });

    it("should handle TokenExpiredError", () => {
      const token = "expired.token";
      const error = new Error("TokenExpiredError");
      error.name = "TokenExpiredError";

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow();
    });

    it("should handle NotBeforeError", () => {
      const token = "notbefore.token";
      const error = new Error("NotBeforeError");
      error.name = "NotBeforeError";

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow();
    });

    it("should handle generic error from verify", () => {
      const token = "error.token";
      const error = new Error("Generic error");

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow("Generic error");
    });

    it("should handle config with empty access secret", () => {
      const configWithEmptySecret: JwtConfig = {
        accessSecret: "",
        refreshSecret: mockRefreshSecret,
      };

      const verifier = new JWTTokenVerifierAdapter(configWithEmptySecret);
      const token = "valid.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = verifier.verifyAccessToken(token);

      expect(result).toBeDefined();
      expect(mockJwt.verify).toHaveBeenCalledWith(token, "");
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify and return refresh token payload", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sid: "session-abc-123",
        sub: "user-123",
        iat: 1234567890,
        exp: 1234567900,
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyRefreshToken(token);

      expect(result).toEqual({
        sid: "session-abc-123",
        sub: "user-123",
      });
    });

    it("should call jwt.verify with correct parameters", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sid: "session-abc-123",
        sub: "user-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      tokenVerifier.verifyRefreshToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, mockRefreshSecret);
    });

    it("should use refresh secret from config", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sid: "session-abc-123",
        sub: "user-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      tokenVerifier.verifyRefreshToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, mockRefreshSecret);
    });

    it("should extract only required fields from payload", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sid: "session-abc-123",
        sub: "user-123",
        iat: 1234567890,
        exp: 1234567900,
        extraField: "should not be included",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyRefreshToken(token);

      expect(result).toEqual({
        sid: "session-abc-123",
        sub: "user-123",
      });
      expect(result).not.toHaveProperty("iat");
      expect(result).not.toHaveProperty("exp");
      expect(result).not.toHaveProperty("extraField");
    });

    it("should NOT include email or role in refresh token payload", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sid: "session-abc-123",
        sub: "user-123",
        email: "test@example.com",
        role: "USER",
        name: "Test User",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyRefreshToken(token);

      expect(result).not.toHaveProperty("email");
      expect(result).not.toHaveProperty("role");
      expect(result).not.toHaveProperty("name");
    });

    it("should handle missing sid in payload", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyRefreshToken(token);

      expect(result.sid).toBeUndefined();
    });

    it("should handle missing sub in payload", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sid: "session-abc-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyRefreshToken(token);

      expect(result.sub).toBeUndefined();
    });

    it("should handle different session IDs", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sid: "550e8400-e29b-41d4-a716-446655440000",
        sub: "user-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyRefreshToken(token);

      expect(result.sid).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("should throw error for invalid token", () => {
      const token = "invalid.token";
      const error = new Error("invalid signature");

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyRefreshToken(token)).toThrow("invalid signature");
    });

    it("should throw error for expired token", () => {
      const token = "expired.token";
      const error = new Error("jwt expired");

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyRefreshToken(token)).toThrow("jwt expired");
    });

    it("should throw error for malformed token", () => {
      const token = "malformed";
      const error = new Error("jwt malformed");

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyRefreshToken(token)).toThrow("jwt malformed");
    });

    it("should handle payload with null values", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sid: null,
        sub: null as unknown as string,
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyRefreshToken(token);

      expect(result.sid).toBeNull();
      expect(result.sub).toBeNull();
    });

    it("should handle payload with numeric sid", () => {
      const token = "valid.refresh.token";
      const mockPayload: JwtPayload = {
        sid: 12345,
        sub: "user-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyRefreshToken(token);

      expect(result.sid).toBe(12345);
    });

    it("should handle JsonWebTokenError for refresh token", () => {
      const token = "invalid.token";
      const error = new Error("JsonWebTokenError");
      error.name = "JsonWebTokenError";

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyRefreshToken(token)).toThrow();
    });

    it("should handle TokenExpiredError for refresh token", () => {
      const token = "expired.token";
      const error = new Error("TokenExpiredError");
      error.name = "TokenExpiredError";

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenVerifier.verifyRefreshToken(token)).toThrow();
    });

    it("should handle config with empty refresh secret", () => {
      const configWithEmptySecret: JwtConfig = {
        accessSecret: mockAccessSecret,
        refreshSecret: "",
      };

      const verifier = new JWTTokenVerifierAdapter(configWithEmptySecret);
      const token = "valid.token";
      const mockPayload: JwtPayload = {
        sid: "session-123",
        sub: "user-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = verifier.verifyRefreshToken(token);

      expect(result).toBeDefined();
      expect(mockJwt.verify).toHaveBeenCalledWith(token, "");
    });
  });

  describe("verifyAccessToken vs verifyRefreshToken", () => {
    it("should use different secrets for access and refresh tokens", () => {
      const accessToken = "access.token";
      const refreshToken = "refresh.token";

      mockJwt.verify.mockReturnValue({ sub: "user-123" } as unknown as void);

      tokenVerifier.verifyAccessToken(accessToken);
      tokenVerifier.verifyRefreshToken(refreshToken);

      expect(mockJwt.verify).toHaveBeenNthCalledWith(1, accessToken, mockAccessSecret);
      expect(mockJwt.verify).toHaveBeenNthCalledWith(2, refreshToken, mockRefreshSecret);
    });

    it("should return different payload structures", () => {
      const accessToken = "access.token";
      const refreshToken = "refresh.token";

      mockJwt.verify.mockReturnValueOnce({
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      } as unknown as void);

      mockJwt.verify.mockReturnValueOnce({
        sid: "session-123",
        sub: "user-123",
      } as unknown as void);

      const accessResult = tokenVerifier.verifyAccessToken(accessToken);
      const refreshResult = tokenVerifier.verifyRefreshToken(refreshToken);

      expect(accessResult).toHaveProperty("name");
      expect(accessResult).toHaveProperty("email");
      expect(accessResult).toHaveProperty("role");
      expect(accessResult).not.toHaveProperty("sid");

      expect(refreshResult).toHaveProperty("sid");
      expect(refreshResult).not.toHaveProperty("name");
      expect(refreshResult).not.toHaveProperty("email");
      expect(refreshResult).not.toHaveProperty("role");
    });
  });

  describe("multiple calls", () => {
    it("should handle multiple verifyAccessToken calls", () => {
      mockJwt.verify
        .mockReturnValueOnce({ sub: "user-1", email: "user1@test.com", name: "User One", role: "USER" } as unknown as void)
        .mockReturnValueOnce({ sub: "user-2", email: "user2@test.com", name: "User Two", role: "ADMIN" } as unknown as void);

      const result1 = tokenVerifier.verifyAccessToken("token1");
      const result2 = tokenVerifier.verifyAccessToken("token2");

      expect(result1.sub).toBe("user-1");
      expect(result2.sub).toBe("user-2");
      expect(mockJwt.verify).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple verifyRefreshToken calls", () => {
      mockJwt.verify
        .mockReturnValueOnce({ sid: "session-1", sub: "user-1" } as unknown as void)
        .mockReturnValueOnce({ sid: "session-2", sub: "user-2" } as unknown as void);

      const result1 = tokenVerifier.verifyRefreshToken("token1");
      const result2 = tokenVerifier.verifyRefreshToken("token2");

      expect(result1.sid).toBe("session-1");
      expect(result2.sid).toBe("session-2");
      expect(mockJwt.verify).toHaveBeenCalledTimes(2);
    });

    it("should handle mixed verify calls", () => {
      mockJwt.verify
        .mockReturnValueOnce({ sub: "user-1", email: "user1@test.com", name: "User One", role: "USER" } as unknown as void)
        .mockReturnValueOnce({ sid: "session-1", sub: "user-1" } as unknown as void);

      const accessResult = tokenVerifier.verifyAccessToken("token1");
      const refreshResult = tokenVerifier.verifyRefreshToken("token2");

      expect(accessResult).toHaveProperty("name");
      expect(refreshResult).toHaveProperty("sid");
      expect(mockJwt.verify).toHaveBeenCalledTimes(2);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete access token verification flow", () => {
      const token = "complete.access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
        iat: 1609459200,
        exp: 1609462800,
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const verified = tokenVerifier.verifyAccessToken(token);

      expect(verified.sub).toBe("user-123");
      expect(verified.email).toBe("test@example.com");
      expect(verified.name).toBe("Test User");
      expect(verified.role).toBe("USER");
    });

    it("should handle complete refresh token verification flow", () => {
      const token = "complete.refresh.token";
      const mockPayload: JwtPayload = {
        sid: "session-123",
        sub: "user-123",
        iat: 1609459200,
        exp: 1609462800,
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const verified = tokenVerifier.verifyRefreshToken(token);

      expect(verified.sid).toBe("session-123");
      expect(verified.sub).toBe("user-123");
    });

    it("should handle payload with undefined fields in access token", () => {
      const token = "token.with.undefined";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: undefined,
        name: "Test User",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result.email).toBeUndefined();
    });

    it("should handle payload with undefined fields in refresh token", () => {
      const token = "token.with.undefined";
      const mockPayload: JwtPayload = {
        sid: "session-123",
        sub: "user-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyRefreshToken(token);

      expect(result).toEqual({
        sid: "session-123",
        sub: "user-123",
      });
    });

    it("should handle payload with boolean fields in access token", () => {
      const token = "token.with.boolean";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        isActive: true,
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = tokenVerifier.verifyAccessToken(token);

      expect(result).toHaveProperty("sub", "user-123");
      expect(result).toHaveProperty("email", "test@example.com");
      expect(result).toHaveProperty("role", "USER");
    });
  });

  describe("error scenarios edge cases", () => {
    it("should handle verify throwing non-Error object", () => {
      const token = "error.token";

      mockJwt.verify.mockImplementation(() => {
        throw "string error";
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow();
    });

    it("should handle verify throwing null", () => {
      const token = "error.token";

      mockJwt.verify.mockImplementation(() => {
        throw null;
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow();
    });

    it("should handle empty string token", () => {
      const token = "";

      mockJwt.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow();
    });

    it("should handle token with only one part", () => {
      const token = "singlepart";

      mockJwt.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow();
    });

    it("should handle verify returning null", () => {
      const token = "null.token";

      mockJwt.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow();
    });

    it("should handle verify returning undefined", () => {
      const token = "undefined.token";

      mockJwt.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      expect(() => tokenVerifier.verifyAccessToken(token)).toThrow();
    });

    it("should handle config with null access secret", () => {
      const configWithNullSecret: JwtConfig = {
        accessSecret: null as unknown as string,
        refreshSecret: mockRefreshSecret,
      };

      const verifier = new JWTTokenVerifierAdapter(configWithNullSecret);
      const token = "valid.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = verifier.verifyAccessToken(token);

      expect(result).toBeDefined();
      expect(mockJwt.verify).toHaveBeenCalledWith(token, null);
    });

    it("should handle config with null refresh secret", () => {
      const configWithNullSecret: JwtConfig = {
        accessSecret: mockAccessSecret,
        refreshSecret: null as unknown as string,
      };

      const verifier = new JWTTokenVerifierAdapter(configWithNullSecret);
      const token = "valid.token";
      const mockPayload: JwtPayload = {
        sid: "session-123",
        sub: "user-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result = verifier.verifyRefreshToken(token);

      expect(result).toBeDefined();
      expect(mockJwt.verify).toHaveBeenCalledWith(token, null);
    });
  });

  describe("type safety tests", () => {
    it("should return AccessTokenPayload type for access token", () => {
      const token = "access.token";
      const mockPayload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result: AccessTokenPayload = tokenVerifier.verifyAccessToken(token);

      expect(result).toHaveProperty("sub");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("role");
    });

    it("should return RefreshTokenPayload type for refresh token", () => {
      const token = "refresh.token";
      const mockPayload: JwtPayload = {
        sid: "session-123",
        sub: "user-123",
      };

      mockJwt.verify.mockReturnValue(mockPayload as unknown as void);

      const result: RefreshTokenPayload = tokenVerifier.verifyRefreshToken(token);

      expect(result).toHaveProperty("sid");
      expect(result).toHaveProperty("sub");
    });
  });
});
