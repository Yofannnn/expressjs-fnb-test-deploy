import { JWTTokenIssuerAdapter } from "@/infrastructure/security/jwt-token-issuer.adapter";
import { User } from "@/domain/entities/user.entity";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { JwtConfig } from "@/infrastructure/config/jwt.config";
import { SessionPolicy } from "@/domain/policies/session.policy";
import jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("JWTTokenIssuerAdapter", () => {
  let tokenIssuer: JWTTokenIssuerAdapter;
  let mockSessionPolicy: jest.Mocked<SessionPolicy>;
  let mockConfig: jest.Mocked<JwtConfig>;
  let mockUser: jest.Mocked<User>;
  let mockJwt: jest.Mocked<typeof jwt>;

  const mockAccessSecret = "access-secret-key-12345678901234567890";
  const mockRefreshSecret = "refresh-secret-key-12345678901234567890";
  const mockSessionId = "session-abc-123";
  const mockAccessTokenLifetimeMinutes = 15;
  const mockRefreshTokenLifetimeDays = 7;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSessionPolicy = {
      accessTokenLifetimeMinutes: mockAccessTokenLifetimeMinutes,
      refreshTokenLifetimeDays: mockRefreshTokenLifetimeDays,
    } as jest.Mocked<SessionPolicy>;

    mockConfig = {
      accessSecret: mockAccessSecret,
      refreshSecret: mockRefreshSecret,
    } as jest.Mocked<JwtConfig>;

    mockUser = {
      getId: jest.fn().mockReturnValue("user-123"),
      getEmail: jest.fn().mockReturnValue("test@example.com"),
      getName: jest.fn().mockReturnValue("Test User"),
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
    } as unknown as jest.Mocked<User>;

    mockJwt = jwt as jest.Mocked<typeof jwt>;
    mockJwt.sign.mockReturnValue("mock-token" as unknown as void);

    tokenIssuer = new JWTTokenIssuerAdapter(mockSessionPolicy, mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with session policy and config", () => {
      const issuer = new JWTTokenIssuerAdapter(mockSessionPolicy, mockConfig);
      expect(issuer).toBeInstanceOf(JWTTokenIssuerAdapter);
    });
  });

  describe("issueAccessToken", () => {
    it("should issue access token as string", () => {
      const result = tokenIssuer.issueAccessToken(mockUser);

      expect(result).toBe("mock-token");
      expect(typeof result).toBe("string");
    });

    it("should call jwt.sign with correct parameters", () => {
      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          sub: "user-123",
          email: "test@example.com",
          name: "Test User",
          role: UserRoleType.MEMBER,
        },
        mockAccessSecret,
        {
          expiresIn: `${mockAccessTokenLifetimeMinutes}m`,
        },
      );
    });

    it("should use session policy for access token lifetime", () => {
      tokenIssuer.issueAccessToken(mockUser);

      expect(mockSessionPolicy.accessTokenLifetimeMinutes).toBe(mockAccessTokenLifetimeMinutes);
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.any(String), { expiresIn: `${mockAccessTokenLifetimeMinutes}m` });
    });

    it("should retrieve user information from user entity", () => {
      tokenIssuer.issueAccessToken(mockUser);

      expect(mockUser.getId).toHaveBeenCalled();
      expect(mockUser.getEmail).toHaveBeenCalled();
      expect(mockUser.getName).toHaveBeenCalled();
      expect(mockUser.getRole).toHaveBeenCalled();
    });

    it("should handle different user roles", () => {
      mockUser.getRole.mockReturnValue(UserRoleType.ADMIN);

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRoleType.ADMIN,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle user role as string", () => {
      mockUser.getRole.mockReturnValue(UserRoleType.MEMBER);

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "MEMBER",
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle special characters in user data", () => {
      mockUser.getEmail.mockReturnValue("test+special@example.com");
      mockUser.getName.mockReturnValue("Test O'Brien");

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test+special@example.com",
          name: "Test O'Brien",
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle empty user name", () => {
      mockUser.getName.mockReturnValue("");

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "",
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle null user name", () => {
      mockUser.getName.mockReturnValue(null as unknown as string);

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          name: null,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle undefined user name", () => {
      mockUser.getName.mockReturnValue(undefined as unknown as string);

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          name: undefined,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle very long user names", () => {
      const longName = "A".repeat(1000);
      mockUser.getName.mockReturnValue(longName);

      const result = tokenIssuer.issueAccessToken(mockUser);

      expect(result).toBe("mock-token");
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          name: longName,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle Unicode characters in user name", () => {
      mockUser.getName.mockReturnValue("测试用户");

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "测试用户",
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle Unicode characters in email", () => {
      mockUser.getEmail.mockReturnValue("测试@example.com");

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "测试@example.com",
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle different access token lifetime from policy", () => {
      mockSessionPolicy.accessTokenLifetimeMinutes = 30;

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.any(String), { expiresIn: "30m" });
    });
  });

  describe("issueRefreshToken", () => {
    it("should issue refresh token as string", () => {
      const result = tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(result).toBe("mock-token");
      expect(typeof result).toBe("string");
    });

    it("should call jwt.sign with correct parameters", () => {
      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          sid: mockSessionId,
          sub: "user-123",
        },
        mockRefreshSecret,
        {
          expiresIn: `${mockRefreshTokenLifetimeDays}d`,
        },
      );
    });

    it("should use session policy for refresh token lifetime", () => {
      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockSessionPolicy.refreshTokenLifetimeDays).toBe(mockRefreshTokenLifetimeDays);
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.any(String), { expiresIn: `${mockRefreshTokenLifetimeDays}d` });
    });

    it("should include session ID in payload", () => {
      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sid: mockSessionId,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should retrieve user information from user entity", () => {
      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockUser.getId).toHaveBeenCalled();
    });

    it("should NOT call getName or getEmail or getRole for refresh token", () => {
      mockUser.getName.mockClear();
      mockUser.getEmail.mockClear();
      mockUser.getRole.mockClear();

      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockUser.getName).not.toHaveBeenCalled();
      expect(mockUser.getEmail).not.toHaveBeenCalled();
      expect(mockUser.getRole).not.toHaveBeenCalled();
    });

    it("should handle different session IDs", () => {
      const differentSessionId = "session-xyz-789";

      tokenIssuer.issueRefreshToken(mockUser, differentSessionId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sid: differentSessionId,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle UUID session IDs", () => {
      const uuidSessionId = "550e8400-e29b-41d4-a716-446655440000";

      tokenIssuer.issueRefreshToken(mockUser, uuidSessionId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sid: uuidSessionId,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle empty session ID", () => {
      const emptySessionId = "";

      tokenIssuer.issueRefreshToken(mockUser, emptySessionId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sid: "",
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle null session ID", () => {
      tokenIssuer.issueRefreshToken(mockUser, null as unknown as string);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sid: null,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle undefined session ID", () => {
      tokenIssuer.issueRefreshToken(mockUser, undefined as unknown as string);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sid: undefined,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle very long session IDs", () => {
      const longSessionId = "session-" + "x".repeat(1000);

      const result = tokenIssuer.issueRefreshToken(mockUser, longSessionId);

      expect(result).toBe("mock-token");
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sid: longSessionId,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should handle different refresh token lifetime from policy", () => {
      mockSessionPolicy.refreshTokenLifetimeDays = 30;

      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.any(String), { expiresIn: "30d" });
    });
  });

  describe("access token vs refresh token differences", () => {
    beforeEach(() => {
      mockJwt.sign.mockReturnValue("mock-token" as unknown as void);
    });

    it("should create tokens with different secrets", () => {
      tokenIssuer.issueAccessToken(mockUser);
      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockJwt.sign).toHaveBeenNthCalledWith(1, expect.any(Object), mockAccessSecret, expect.any(Object));
      expect(mockJwt.sign).toHaveBeenNthCalledWith(2, expect.any(Object), mockRefreshSecret, expect.any(Object));
    });

    it("should include name, email, role in access token but not refresh token", () => {
      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test User",
          email: "test@example.com",
          role: UserRoleType.MEMBER,
        }),
        expect.any(String),
        expect.any(Object),
      );

      mockJwt.sign.mockClear();
      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      const refreshCallArgs = mockJwt.sign.mock.calls[0][0];
      expect(refreshCallArgs).not.toHaveProperty("name");
      expect(refreshCallArgs).not.toHaveProperty("email");
      expect(refreshCallArgs).not.toHaveProperty("role");
    });

    it("should include sid in refresh token but not access token", () => {
      tokenIssuer.issueAccessToken(mockUser);

      const accessCallArgs = mockJwt.sign.mock.calls[0][0];
      expect(accessCallArgs).not.toHaveProperty("sid");

      mockJwt.sign.mockClear();
      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sid: mockSessionId,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should return different string values for different tokens", () => {
      mockJwt.sign.mockReturnValueOnce("access-token-123" as unknown as void).mockReturnValueOnce("refresh-token-456" as unknown as void);

      const accessToken = tokenIssuer.issueAccessToken(mockUser);
      const refreshToken = tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(accessToken).toBe("access-token-123");
      expect(refreshToken).toBe("refresh-token-456");
      expect(accessToken).not.toBe(refreshToken);
    });

    it("should use different expiration formats for tokens", () => {
      tokenIssuer.issueAccessToken(mockUser);
      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockJwt.sign).toHaveBeenNthCalledWith(1, expect.any(Object), expect.any(String), { expiresIn: "15m" });
      expect(mockJwt.sign).toHaveBeenNthCalledWith(2, expect.any(Object), expect.any(String), { expiresIn: "7d" });
    });
  });

  describe("error handling", () => {
    it("should propagate jwt.sign errors for access token", () => {
      const error = new Error("JWT signing failed");
      mockJwt.sign.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenIssuer.issueAccessToken(mockUser)).toThrow("JWT signing failed");
    });

    it("should propagate jwt.sign errors for refresh token", () => {
      const error = new Error("JWT signing failed");
      mockJwt.sign.mockImplementation(() => {
        throw error;
      });

      expect(() => tokenIssuer.issueRefreshToken(mockUser, mockSessionId)).toThrow("JWT signing failed");
    });

    it("should handle jwt.sign returning empty string", () => {
      mockJwt.sign.mockReturnValue("" as unknown as void);

      const result = tokenIssuer.issueAccessToken(mockUser);

      expect(result).toBe("");
    });

    it("should handle jwt.sign returning null", () => {
      mockJwt.sign.mockReturnValue(null as unknown as void);

      const result = tokenIssuer.issueAccessToken(mockUser);

      expect(result).toBeNull();
    });
  });

  describe("multiple token issuances", () => {
    it("should handle multiple access token issuances", () => {
      mockJwt.sign
        .mockReturnValueOnce("token-1" as unknown as void)
        .mockReturnValueOnce("token-2" as unknown as void)
        .mockReturnValueOnce("token-3" as unknown as void);

      const token1 = tokenIssuer.issueAccessToken(mockUser);
      const token2 = tokenIssuer.issueAccessToken(mockUser);
      const token3 = tokenIssuer.issueAccessToken(mockUser);

      expect(token1).toBe("token-1");
      expect(token2).toBe("token-2");
      expect(token3).toBe("token-3");
      expect(mockJwt.sign).toHaveBeenCalledTimes(3);
    });

    it("should handle multiple refresh token issuances", () => {
      mockJwt.sign
        .mockReturnValueOnce("refresh-1" as unknown as void)
        .mockReturnValueOnce("refresh-2" as unknown as void)
        .mockReturnValueOnce("refresh-3" as unknown as void);

      const token1 = tokenIssuer.issueRefreshToken(mockUser, "session-1");
      const token2 = tokenIssuer.issueRefreshToken(mockUser, "session-2");
      const token3 = tokenIssuer.issueRefreshToken(mockUser, "session-3");

      expect(token1).toBe("refresh-1");
      expect(token2).toBe("refresh-2");
      expect(token3).toBe("refresh-3");
      expect(mockJwt.sign).toHaveBeenCalledTimes(3);
    });

    it("should handle mixed token issuances", () => {
      mockJwt.sign
        .mockReturnValueOnce("access-1" as unknown as void)
        .mockReturnValueOnce("refresh-1" as unknown as void)
        .mockReturnValueOnce("access-2" as unknown as void)
        .mockReturnValueOnce("refresh-2" as unknown as void);

      tokenIssuer.issueAccessToken(mockUser);
      tokenIssuer.issueRefreshToken(mockUser, "session-1");
      tokenIssuer.issueAccessToken(mockUser);
      tokenIssuer.issueRefreshToken(mockUser, "session-2");

      expect(mockJwt.sign).toHaveBeenCalledTimes(4);
    });
  });

  describe("config edge cases", () => {
    it("should handle when accessSecret is empty", () => {
      const configWithEmptySecret: JwtConfig = {
        accessSecret: "",
        refreshSecret: mockRefreshSecret,
      };

      const issuer = new JWTTokenIssuerAdapter(mockSessionPolicy, configWithEmptySecret);

      expect(() => issuer.issueAccessToken(mockUser)).not.toThrow();
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), "", expect.any(Object));
    });

    it("should handle when refreshSecret is empty", () => {
      const configWithEmptySecret: JwtConfig = {
        accessSecret: mockAccessSecret,
        refreshSecret: "",
      };

      const issuer = new JWTTokenIssuerAdapter(mockSessionPolicy, configWithEmptySecret);

      expect(() => issuer.issueRefreshToken(mockUser, mockSessionId)).not.toThrow();
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), "", expect.any(Object));
    });

    it("should handle when accessSecret is undefined", () => {
      const configWithUndefinedSecret: JwtConfig = {
        accessSecret: undefined as unknown as string,
        refreshSecret: mockRefreshSecret,
      };

      const issuer = new JWTTokenIssuerAdapter(mockSessionPolicy, configWithUndefinedSecret);

      expect(() => issuer.issueAccessToken(mockUser)).not.toThrow();
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), undefined, expect.any(Object));
    });

    it("should handle when refreshSecret is undefined", () => {
      const configWithUndefinedSecret: JwtConfig = {
        accessSecret: mockAccessSecret,
        refreshSecret: undefined as unknown as string,
      };

      const issuer = new JWTTokenIssuerAdapter(mockSessionPolicy, configWithUndefinedSecret);

      expect(() => issuer.issueRefreshToken(mockUser, mockSessionId)).not.toThrow();
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), undefined, expect.any(Object));
    });

    it("should handle when accessSecret is null", () => {
      const configWithNullSecret: JwtConfig = {
        accessSecret: null as unknown as string,
        refreshSecret: mockRefreshSecret,
      };

      const issuer = new JWTTokenIssuerAdapter(mockSessionPolicy, configWithNullSecret);

      expect(() => issuer.issueAccessToken(mockUser)).not.toThrow();
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), null, expect.any(Object));
    });

    it("should handle when refreshSecret is null", () => {
      const configWithNullSecret: JwtConfig = {
        accessSecret: mockAccessSecret,
        refreshSecret: null as unknown as string,
      };

      const issuer = new JWTTokenIssuerAdapter(mockSessionPolicy, configWithNullSecret);

      expect(() => issuer.issueRefreshToken(mockUser, mockSessionId)).not.toThrow();
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), null, expect.any(Object));
    });
  });

  describe("integration scenarios", () => {
    it("should issue both tokens with correct payloads", () => {
      mockJwt.sign.mockReturnValueOnce("access-token" as unknown as void).mockReturnValueOnce("refresh-token" as unknown as void);

      const accessToken = tokenIssuer.issueAccessToken(mockUser);
      const refreshToken = tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(accessToken).toBe("access-token");
      expect(refreshToken).toBe("refresh-token");
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple users", () => {
      const user1 = {
        ...mockUser,
        getId: jest.fn().mockReturnValue("user-1"),
        getEmail: jest.fn().mockReturnValue("user1@example.com"),
        getName: jest.fn().mockReturnValue("User One"),
        getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      } as unknown as jest.Mocked<User>;

      const user2 = {
        ...mockUser,
        getId: jest.fn().mockReturnValue("user-2"),
        getEmail: jest.fn().mockReturnValue("user2@example.com"),
        getName: jest.fn().mockReturnValue("User Two"),
        getRole: jest.fn().mockReturnValue(UserRoleType.ADMIN),
      } as unknown as jest.Mocked<User>;

      mockJwt.sign
        .mockReturnValueOnce("access-1" as unknown as void)
        .mockReturnValueOnce("refresh-1" as unknown as void)
        .mockReturnValueOnce("access-2" as unknown as void)
        .mockReturnValueOnce("refresh-2" as unknown as void);

      tokenIssuer.issueAccessToken(user1);
      tokenIssuer.issueRefreshToken(user1, "session-1");
      tokenIssuer.issueAccessToken(user2);
      tokenIssuer.issueRefreshToken(user2, "session-2");

      expect(mockJwt.sign).toHaveBeenCalledTimes(4);
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.objectContaining({ sub: "user-1" }), expect.any(String), expect.any(Object));
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.objectContaining({ sub: "user-2" }), expect.any(String), expect.any(Object));
    });

    it("should handle zero access token lifetime", () => {
      mockSessionPolicy.accessTokenLifetimeMinutes = 0;

      tokenIssuer.issueAccessToken(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.any(String), { expiresIn: "0m" });
    });

    it("should handle zero refresh token lifetime", () => {
      mockSessionPolicy.refreshTokenLifetimeDays = 0;

      tokenIssuer.issueRefreshToken(mockUser, mockSessionId);

      expect(mockJwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.any(String), { expiresIn: "0d" });
    });
  });
});
