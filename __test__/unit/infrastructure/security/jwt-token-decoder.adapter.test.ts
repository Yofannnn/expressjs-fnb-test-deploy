import { JwtTokenDecoderAdapter } from "@/infrastructure/security/jwt-token-decoder.adapter";
import { AccessTokenPayload, RefreshTokenPayload } from "@/application/types/auth-token.type";
import jwt from "jsonwebtoken";

jest.mock("jsonwebtoken", () => ({
  decode: jest.fn(),
}));

describe("JwtTokenDecoderAdapter", () => {
  let decoder: JwtTokenDecoderAdapter;
  const mockDecode = jwt.decode as jest.MockedFunction<typeof jwt.decode>;

  beforeEach(() => {
    decoder = new JwtTokenDecoderAdapter();
    jest.clearAllMocks();
  });

  describe("decodeAccessToken", () => {
    const validAccessToken = "valid-access-token";
    const currentTimestamp = Date.now();
    const expTimestamp = currentTimestamp + 3600000;
    const expSeconds = Math.floor(expTimestamp / 1000);

    const validDecodedPayload = {
      sub: "user-123",
      email: "user@example.com",
      name: "Test User",
      role: "admin",
      exp: expSeconds,
      iat: Math.floor(currentTimestamp / 1000),
    };

    it("should successfully decode a valid access token", () => {
      mockDecode.mockReturnValue(validDecodedPayload);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(mockDecode).toHaveBeenCalledTimes(1);
      expect(mockDecode).toHaveBeenCalledWith(validAccessToken);
      expect(result).toEqual({
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        role: "admin",
      });
    });

    it("should return null when token is invalid", () => {
      mockDecode.mockReturnValue(null);

      const result = decoder.decodeAccessToken("invalid-token");

      expect(mockDecode).toHaveBeenCalledTimes(1);
      expect(mockDecode).toHaveBeenCalledWith("invalid-token");
      expect(result).toBeNull();
    });

    it("should handle token with missing optional fields", () => {
      const minimalPayload = {
        sub: "user-123",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(minimalPayload);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result).toEqual({
        sub: "user-123",
        email: undefined,
        name: undefined,
        role: undefined,
      });
    });

    it("should handle token with additional fields", () => {
      const payloadWithExtra = {
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        role: "user",
        exp: expSeconds,
        extraField: "extra-value",
        someOtherField: 123,
      };
      mockDecode.mockReturnValue(payloadWithExtra);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result).toEqual({
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        role: "user",
      });
      expect(result).not.toHaveProperty("extraField");
      expect(result).not.toHaveProperty("someOtherField");
    });

    it("should handle token with number values as strings", () => {
      const payloadWithStringNumbers = {
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        role: "admin",
        exp: "1234567890",
      };
      mockDecode.mockReturnValue(payloadWithStringNumbers as unknown as jwt.JwtPayload);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result).toEqual({
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        role: "admin",
      });
    });

    it("should handle payload with sub as number", () => {
      const payloadWithNumberSub = {
        sub: 12345,
        email: "user@example.com",
        name: "Test User",
        role: "admin",
        exp: expSeconds,
      } as unknown as AccessTokenPayload;
      mockDecode.mockReturnValue(payloadWithNumberSub);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result?.sub).toBe(12345);
    });

    it("should handle payload with sub as object", () => {
      const payloadWithObjectSub = {
        sub: { id: "user-123", type: "user" },
        email: "user@example.com",
        name: "Test User",
        role: "admin",
        exp: expSeconds,
      } as unknown as AccessTokenPayload;
      mockDecode.mockReturnValue(payloadWithObjectSub);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result?.sub).toEqual({ id: "user-123", type: "user" });
    });

    it("should handle token with null sub", () => {
      const payloadWithNullSub = {
        sub: null,
        email: "user@example.com",
        name: "Test User",
        role: "admin",
        exp: expSeconds,
      } as unknown as AccessTokenPayload;
      mockDecode.mockReturnValue(payloadWithNullSub);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result?.sub).toBeNull();
    });

    it("should handle token with undefined sub", () => {
      const payloadWithUndefinedSub = {
        email: "user@example.com",
        name: "Test User",
        role: "admin",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithUndefinedSub);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result?.sub).toBeUndefined();
    });

    it("should handle special characters in email and name", () => {
      const payloadWithSpecialChars = {
        sub: "user-123",
        email: "test+tag@sub.example.com",
        name: "Test O'Brien",
        role: "admin",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithSpecialChars);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result?.email).toBe("test+tag@sub.example.com");
      expect(result?.name).toBe("Test O'Brien");
    });

    it("should handle Unicode characters in email and name", () => {
      const payloadWithUnicode = {
        sub: "user-123",
        email: "测试@example.com",
        name: "测试用户",
        role: "admin",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithUnicode);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result?.email).toBe("测试@example.com");
      expect(result?.name).toBe("测试用户");
    });

    it("should handle very long name", () => {
      const longName = "A".repeat(1000);
      const payloadWithLongName = {
        sub: "user-123",
        email: "user@example.com",
        name: longName,
        role: "admin",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithLongName);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result?.name).toBe(longName);
    });

    it("should handle token with empty string fields", () => {
      const payloadWithEmptyFields = {
        sub: "",
        email: "",
        name: "",
        role: "",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithEmptyFields);

      const result = decoder.decodeAccessToken(validAccessToken);

      expect(result?.sub).toBe("");
      expect(result?.email).toBe("");
      expect(result?.name).toBe("");
      expect(result?.role).toBe("");
    });
  });

  describe("decodeRefreshToken", () => {
    const validRefreshToken = "valid-refresh-token";
    const currentTimestamp = Date.now();
    const expTimestamp = currentTimestamp + 604800000;
    const expSeconds = Math.floor(expTimestamp / 1000);

    const validDecodedPayload = {
      sid: "session-456",
      sub: "user-123",
      exp: expSeconds,
      iat: Math.floor(currentTimestamp / 1000),
    };

    it("should successfully decode a valid refresh token", () => {
      mockDecode.mockReturnValue(validDecodedPayload);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(mockDecode).toHaveBeenCalledTimes(1);
      expect(mockDecode).toHaveBeenCalledWith(validRefreshToken);
      expect(result).toEqual({
        sid: "session-456",
        sub: "user-123",
      });
    });

    it("should return null when token is invalid", () => {
      mockDecode.mockReturnValue(null);

      const result = decoder.decodeRefreshToken("invalid-token");

      expect(mockDecode).toHaveBeenCalledTimes(1);
      expect(mockDecode).toHaveBeenCalledWith("invalid-token");
      expect(result).toBeNull();
    });

    it("should handle token with missing sid field", () => {
      const payloadWithoutSid = {
        sub: "user-123",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithoutSid);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result).toEqual({
        sid: undefined,
        sub: "user-123",
      });
    });

    it("should handle token with missing sub field", () => {
      const payloadWithoutSub = {
        sid: "session-456",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithoutSub);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result).toEqual({
        sid: "session-456",
        sub: undefined,
      });
    });

    it("should handle token with additional fields", () => {
      const payloadWithExtra = {
        sid: "session-456",
        sub: "user-123",
        exp: expSeconds,
        deviceId: "device-789",
        ipAddress: "192.168.1.1",
        email: "user@example.com",
        role: "admin",
      };
      mockDecode.mockReturnValue(payloadWithExtra);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result).toEqual({
        sid: "session-456",
        sub: "user-123",
      });
      expect(result).not.toHaveProperty("email");
      expect(result).not.toHaveProperty("role");
      expect(result).not.toHaveProperty("deviceId");
    });

    it("should handle token with sid as number", () => {
      const payloadWithNumberSid = {
        sid: 12345,
        sub: "user-123",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithNumberSid);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result?.sid).toBe(12345);
    });

    it("should handle token with sid as object", () => {
      const payloadWithObjectSid = {
        sid: { id: "session-456", type: "session" },
        sub: "user-123",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithObjectSid);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result?.sid).toEqual({ id: "session-456", type: "session" });
    });

    it("should handle token with null sid", () => {
      const payloadWithNullSid = {
        sid: null,
        sub: "user-123",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithNullSid);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result?.sid).toBeNull();
    });

    it("should handle token with null sub", () => {
      const payloadWithNullSub = {
        sid: "session-456",
        sub: null,
        exp: expSeconds,
      } as unknown as RefreshTokenPayload;
      mockDecode.mockReturnValue(payloadWithNullSub);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result?.sub).toBeNull();
    });

    it("should handle token with undefined sid", () => {
      const payloadWithUndefinedSid = {
        sub: "user-123",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithUndefinedSid);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result?.sid).toBeUndefined();
    });

    it("should handle token with undefined sub", () => {
      const payloadWithUndefinedSub = {
        sid: "session-456",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithUndefinedSub);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result?.sub).toBeUndefined();
    });

    it("should handle UUID format sid", () => {
      const payloadWithUuid = {
        sid: "550e8400-e29b-41d4-a716-446655440000",
        sub: "user-123",
        exp: expSeconds,
      };
      mockDecode.mockReturnValue(payloadWithUuid);

      const result = decoder.decodeRefreshToken(validRefreshToken);

      expect(result?.sid).toBe("550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("decodeAccessToken vs decodeRefreshToken differences", () => {
    it("should return different payload structures", () => {
      const token = "test.token";
      const mockPayload = {
        sid: "session-456",
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        role: "admin",
        exp: 1234567890,
      };

      mockDecode.mockReturnValue(mockPayload);

      const accessResult = decoder.decodeAccessToken(token);
      const refreshResult = decoder.decodeRefreshToken(token);

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

  describe("Edge Cases", () => {
    it("should handle empty string token for decodeAccessToken", () => {
      mockDecode.mockReturnValue(null);

      const result = decoder.decodeAccessToken("");

      expect(mockDecode).toHaveBeenCalledWith("");
      expect(result).toBeNull();
    });

    it("should handle empty string token for decodeRefreshToken", () => {
      mockDecode.mockReturnValue(null);

      const result = decoder.decodeRefreshToken("");

      expect(mockDecode).toHaveBeenCalledWith("");
      expect(result).toBeNull();
    });

    it("should handle malformed token for decodeAccessToken", () => {
      mockDecode.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(() => decoder.decodeAccessToken("malformed.token.here")).toThrow("Invalid token");
    });

    it("should handle malformed token for decodeRefreshToken", () => {
      mockDecode.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(() => decoder.decodeRefreshToken("malformed.token.here")).toThrow("Invalid token");
    });

    it("should handle decode throwing non-Error object", () => {
      mockDecode.mockImplementation(() => {
        throw "string error";
      });

      expect(() => decoder.decodeAccessToken("token")).toThrow("string error");
    });

    it("should handle decode throwing null", () => {
      mockDecode.mockImplementation(() => {
        throw null;
      });

      expect(() => decoder.decodeAccessToken("token")).toThrow();
    });

    it("should handle token with only one segment", () => {
      mockDecode.mockReturnValue(null);

      const result = decoder.decodeAccessToken("singlepart");

      expect(result).toBeNull();
    });

    it("should handle token with two segments", () => {
      mockDecode.mockReturnValue(null);

      const result = decoder.decodeAccessToken("two.parts");

      expect(result).toBeNull();
    });

    it("should handle token with boolean values in payload", () => {
      const payloadWithBooleans = {
        sub: "user-123",
        email: "user@example.com",
        isActive: true,
        isVerified: false,
        role: "admin",
        exp: 1234567890,
      };
      mockDecode.mockReturnValue(payloadWithBooleans);

      const result = decoder.decodeAccessToken("token");

      expect(result).toEqual({
        sub: "user-123",
        email: "user@example.com",
        name: undefined,
        role: "admin",
      });
    });

    it("should handle token with array values", () => {
      const payloadWithArray = {
        sub: "user-123",
        email: "user@example.com",
        roles: ["admin", "user"],
        name: "Test User",
        role: "admin",
        exp: 1234567890,
      };
      mockDecode.mockReturnValue(payloadWithArray);

      const result = decoder.decodeAccessToken("token");

      expect(result).toEqual({
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        role: "admin",
      });
    });
  });

  describe("Multiple calls", () => {
    it("should handle multiple decodeAccessToken calls", () => {
      const payload1 = {
        sub: "user-1",
        email: "user1@example.com",
        name: "User One",
        role: "admin",
        exp: 1234567890,
      };
      const payload2 = {
        sub: "user-2",
        email: "user2@example.com",
        name: "User Two",
        role: "user",
        exp: 1234567891,
      };

      mockDecode.mockReturnValueOnce(payload1).mockReturnValueOnce(payload2);

      const result1 = decoder.decodeAccessToken("token1");
      const result2 = decoder.decodeAccessToken("token2");

      expect(result1?.sub).toBe("user-1");
      expect(result2?.sub).toBe("user-2");
      expect(mockDecode).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple decodeRefreshToken calls", () => {
      const payload1 = {
        sid: "session-1",
        sub: "user-1",
        exp: 1234567890,
      };
      const payload2 = {
        sid: "session-2",
        sub: "user-2",
        exp: 1234567891,
      };

      mockDecode.mockReturnValueOnce(payload1).mockReturnValueOnce(payload2);

      const result1 = decoder.decodeRefreshToken("token1");
      const result2 = decoder.decodeRefreshToken("token2");

      expect(result1?.sid).toBe("session-1");
      expect(result2?.sid).toBe("session-2");
      expect(mockDecode).toHaveBeenCalledTimes(2);
    });

    it("should handle mixed decode calls", () => {
      const accessPayload = {
        sub: "user-1",
        email: "user1@example.com",
        name: "User One",
        role: "admin",
        exp: 1234567890,
      };
      const refreshPayload = {
        sid: "session-1",
        sub: "user-1",
        exp: 1234567891,
      };

      mockDecode.mockReturnValueOnce(accessPayload).mockReturnValueOnce(refreshPayload);

      const accessResult = decoder.decodeAccessToken("token1");
      const refreshResult = decoder.decodeRefreshToken("token2");

      expect(accessResult).toHaveProperty("name");
      expect(refreshResult).toHaveProperty("sid");
      expect(mockDecode).toHaveBeenCalledTimes(2);
    });
  });

  describe("Return value verification", () => {
    it("should return AccessTokenPayload type for access token", () => {
      const payload = {
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        role: "admin",
        exp: 1234567890,
      };
      mockDecode.mockReturnValue(payload);

      const result = decoder.decodeAccessToken("token");

      expect(result).toHaveProperty("sub");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("role");
      expect(result).not.toHaveProperty("sid");
    });

    it("should return RefreshTokenPayload type for refresh token", () => {
      const payload = {
        sid: "session-456",
        sub: "user-123",
        exp: 1234567890,
      };
      mockDecode.mockReturnValue(payload);

      const result = decoder.decodeRefreshToken("token");

      expect(result).toHaveProperty("sid");
      expect(result).toHaveProperty("sub");
      expect(result).not.toHaveProperty("email");
      expect(result).not.toHaveProperty("name");
      expect(result).not.toHaveProperty("role");
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete access token decode flow", () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
        exp: 1609459200,
        iat: 1609455600,
      };

      mockDecode.mockReturnValue(payload);

      const result = decoder.decodeAccessToken("complete.access.token");

      expect(result).toEqual({
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      });
    });

    it("should handle complete refresh token decode flow", () => {
      const payload = {
        sid: "session-123",
        sub: "user-123",
        exp: 1609459200,
        iat: 1609455600,
      };

      mockDecode.mockReturnValue(payload);

      const result = decoder.decodeRefreshToken("complete.refresh.token");

      expect(result).toEqual({
        sid: "session-123",
        sub: "user-123",
      });
    });

    it("should handle token without sub in access token", () => {
      const payload = {
        email: "test@example.com",
        name: "Test User",
        role: "USER",
        exp: 1609459200,
      };

      mockDecode.mockReturnValue(payload);

      const result = decoder.decodeAccessToken("token");

      expect(result?.sub).toBeUndefined();
      expect(result?.email).toBe("test@example.com");
      expect(result?.name).toBe("Test User");
      expect(result?.role).toBe("USER");
    });

    it("should handle token without sub in refresh token", () => {
      const payload = {
        sid: "session-123",
        exp: 1609459200,
      };

      mockDecode.mockReturnValue(payload);

      const result = decoder.decodeRefreshToken("token");

      expect(result?.sid).toBe("session-123");
      expect(result?.sub).toBeUndefined();
    });
  });
});
