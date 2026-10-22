import { Request } from "express";
import { AuthTokenUtil } from "@/presentation/utils/auth-token.utils";
import { AUTH_EXCEPTIONS } from "@/application/exceptions/auth.exceptions";
import { AUTH_CONSTANTS } from "@/presentation/constants/auth.constants";
import { AppException } from "@/application/exceptions/app.exception";

jest.mock("@/application/exceptions/auth.exception");

const mockedAuthExceptions = AUTH_EXCEPTIONS as jest.Mocked<typeof AUTH_EXCEPTIONS>;

describe("AuthTokenUtil", () => {
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      cookies: {},
    };

    jest.clearAllMocks();
  });

  describe("getAccessToken", () => {
    it("should extract token from valid Bearer authorization header", () => {
      const token = "valid.jwt.token";
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should return undefined when authorization header is missing", () => {
      mockRequest.headers = {};

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should return undefined when authorization header is empty string", () => {
      mockRequest.headers = {
        authorization: "",
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should return undefined when authorization header has wrong scheme", () => {
      mockRequest.headers = {
        authorization: "Basic dXNlcjpwYXNz",
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should return undefined when token is missing after Bearer scheme", () => {
      mockRequest.headers = {
        authorization: "Bearer ",
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should return undefined when token is empty after Bearer scheme", () => {
      mockRequest.headers = {
        authorization: "Bearer",
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should handle authorization header with extra spaces", () => {
      const token = "valid.jwt.token";
      mockRequest.headers = {
        authorization: `  Bearer   ${token}  `,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should handle authorization header with lowercase bearer scheme", () => {
      const token = "valid.jwt.token";
      mockRequest.headers = {
        authorization: `bearer ${token}`,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should handle authorization header with multiple spaces between scheme and token", () => {
      const token = "valid.jwt.token";
      mockRequest.headers = {
        authorization: `Bearer    ${token}`,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should return the token even if it contains special characters", () => {
      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should handle headers with extra whitespace around the entire value", () => {
      const token = "valid.jwt.token";
      mockRequest.headers = {
        authorization: ` Bearer ${token} `,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });
  });

  describe("getRefreshToken", () => {
    const cookieName = AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME;

    it("should extract refresh token from cookies", () => {
      const token = "refresh.token.123";
      mockRequest.cookies = {
        [cookieName]: token,
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should return undefined when cookies object is missing", () => {
      mockRequest.cookies = undefined;

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should return undefined when refresh token cookie is not present", () => {
      mockRequest.cookies = {
        other_cookie: "some_value",
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should return undefined when refresh token cookie is empty string", () => {
      mockRequest.cookies = {
        [cookieName]: "",
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(result).toBe("");
    });

    it("should return undefined when cookies is empty object", () => {
      mockRequest.cookies = {};

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should handle refresh token with special characters", () => {
      const token = "refresh-token-with-special-chars!@#$%^&*()";
      mockRequest.cookies = {
        [cookieName]: token,
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should handle refresh token with spaces", () => {
      const token = "refresh token with spaces";
      mockRequest.cookies = {
        [cookieName]: token,
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should handle multiple cookies and extract the correct one", () => {
      const token = "refresh.token.456";
      mockRequest.cookies = {
        session_id: "session123",
        [cookieName]: token,
        csrf_token: "csrf456",
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should handle cookies with similar names", () => {
      const token = "refresh.token.789";
      mockRequest.cookies = {
        [`${cookieName}_old`]: "old.token",
        [cookieName]: token,
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(result).toBe(token);
    });
  });

  describe("requireAccessToken", () => {
    it("should return token when authorization header is valid", () => {
      const token = "valid.jwt.token";
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const result = AuthTokenUtil.requireAccessToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should throw INVALID_ACCESS_TOKEN when authorization header is missing", () => {
      mockRequest.headers = {};
      const expectedError = new Error("Invalid access token");
      mockedAuthExceptions.INVALID_ACCESS_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireAccessToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).toHaveBeenCalled();
    });

    it("should throw INVALID_ACCESS_TOKEN when authorization header is empty", () => {
      mockRequest.headers = {
        authorization: "",
      };
      const expectedError = new Error("Invalid access token");
      mockedAuthExceptions.INVALID_ACCESS_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireAccessToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).toHaveBeenCalled();
    });

    it("should throw INVALID_ACCESS_TOKEN when scheme is not Bearer", () => {
      mockRequest.headers = {
        authorization: "Basic dXNlcjpwYXNz",
      };
      const expectedError = new Error("Invalid access token");
      mockedAuthExceptions.INVALID_ACCESS_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireAccessToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).toHaveBeenCalled();
    });

    it("should throw INVALID_ACCESS_TOKEN when token is missing after Bearer", () => {
      mockRequest.headers = {
        authorization: "Bearer ",
      };
      const expectedError = new Error("Invalid access token");
      mockedAuthExceptions.INVALID_ACCESS_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireAccessToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).toHaveBeenCalled();
    });

    it("should throw INVALID_ACCESS_TOKEN when token is empty after Bearer", () => {
      mockRequest.headers = {
        authorization: "Bearer",
      };
      const expectedError = new Error("Invalid access token");
      mockedAuthExceptions.INVALID_ACCESS_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireAccessToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).toHaveBeenCalled();
    });

    it("should throw INVALID_ACCESS_TOKEN when authorization header has lowercase bearer", () => {
      const token = "valid.jwt.token";
      mockRequest.headers = {
        authorization: `bearer ${token}`,
      };
      const expectedError = new Error("Invalid access token");
      mockedAuthExceptions.INVALID_ACCESS_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireAccessToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).toHaveBeenCalled();
    });

    it("should handle authorization header with extra spaces and return token", () => {
      const token = "valid.jwt.token";
      mockRequest.headers = {
        authorization: `  Bearer   ${token}  `,
      };

      const expectedError = new Error("Invalid access token");
      mockedAuthExceptions.INVALID_ACCESS_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireAccessToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).toHaveBeenCalled();
    });

    it("should handle authorization header with multiple spaces and return token", () => {
      const token = "valid.jwt.token";
      mockRequest.headers = {
        authorization: `Bearer    ${token}`,
      };

      const expectedError = new Error("Invalid access token");
      mockedAuthExceptions.INVALID_ACCESS_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireAccessToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).toHaveBeenCalled();
    });
  });

  describe("requireRefreshToken", () => {
    const cookieName = AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME;

    it("should return token when refresh token exists in cookies", () => {
      const token = "refresh.token.123";
      mockRequest.cookies = {
        [cookieName]: token,
      };

      const result = AuthTokenUtil.requireRefreshToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should throw INVALID_REFRESH_TOKEN when cookies object is missing", () => {
      mockRequest.cookies = undefined;
      const expectedError = new Error("Invalid refresh token");
      mockedAuthExceptions.INVALID_REFRESH_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireRefreshToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_REFRESH_TOKEN).toHaveBeenCalled();
    });

    it("should throw INVALID_REFRESH_TOKEN when cookies is empty object", () => {
      mockRequest.cookies = {};
      const expectedError = new Error("Invalid refresh token");
      mockedAuthExceptions.INVALID_REFRESH_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireRefreshToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_REFRESH_TOKEN).toHaveBeenCalled();
    });

    it("should throw INVALID_REFRESH_TOKEN when refresh token cookie is not present", () => {
      mockRequest.cookies = {
        other_cookie: "some_value",
      };
      const expectedError = new Error("Invalid refresh token");
      mockedAuthExceptions.INVALID_REFRESH_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireRefreshToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_REFRESH_TOKEN).toHaveBeenCalled();
    });

    it("should handle refresh token with special characters", () => {
      const token = "refresh-token-with-special-chars!@#$%^&*()";
      mockRequest.cookies = {
        [cookieName]: token,
      };

      const result = AuthTokenUtil.requireRefreshToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should handle refresh token with spaces", () => {
      const token = "refresh token with spaces";
      mockRequest.cookies = {
        [cookieName]: token,
      };

      const result = AuthTokenUtil.requireRefreshToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should handle multiple cookies and extract the correct refresh token", () => {
      const token = "refresh.token.456";
      mockRequest.cookies = {
        session_id: "session123",
        [cookieName]: token,
        csrf_token: "csrf456",
      };

      const result = AuthTokenUtil.requireRefreshToken(mockRequest as Request);

      expect(result).toBe(token);
    });

    it("should throw INVALID_REFRESH_TOKEN when token is undefined from getRefreshToken", () => {
      mockRequest.cookies = undefined;
      const expectedError = new Error("Invalid refresh token");
      mockedAuthExceptions.INVALID_REFRESH_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireRefreshToken(mockRequest as Request)).toThrow(expectedError);
      expect(mockedAuthExceptions.INVALID_REFRESH_TOKEN).toHaveBeenCalled();
    });
  });

  describe("extractBearerToken (private method)", () => {
    it("should extract token from valid Bearer header", () => {
      const token = "valid.jwt.token";
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken(`Bearer ${token}`);
      expect(result).toBe(token);
    });

    it("should return undefined when header is undefined", () => {
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken(
        undefined as unknown as string,
      );
      expect(result).toBeUndefined();
    });

    it("should return undefined when header is null", () => {
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken(null as unknown as string);
      expect(result).toBeUndefined();
    });

    it("should return undefined when header is empty string", () => {
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken("");
      expect(result).toBeUndefined();
    });

    it("should return undefined when scheme is not Bearer", () => {
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken("Basic dXNlcjpwYXNz");
      expect(result).toBeUndefined();
    });

    it("should return undefined when token is missing after scheme", () => {
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken("Bearer ");
      expect(result).toBeUndefined();
    });

    it("should return undefined when scheme is Bearer but no token", () => {
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken("Bearer");
      expect(result).toBeUndefined();
    });

    it("should handle header with multiple spaces between scheme and token", () => {
      const token = "valid.jwt.token";
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken(`Bearer    ${token}`);
      expect(result).toBeUndefined();
    });

    it("should handle header with leading and trailing whitespace", () => {
      const token = "valid.jwt.token";
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken(`  Bearer ${token}  `);
      expect(result).toBeUndefined();
    });

    it("should handle header with only whitespace", () => {
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken("   ");
      expect(result).toBeUndefined();
    });

    it("should handle header with multiple spaces in token", () => {
      const token = "token with spaces";
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken(`Bearer ${token}`);
      expect(result).toBe("token");
    });

    it("should return undefined when scheme is Bearer with extra space before it", () => {
      const token = "valid.jwt.token";
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken(` Bearer ${token}`);
      expect(result).toBeUndefined();
    });

    it("should return the first token even if there are multiple parts after scheme", () => {
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken(
        "Bearer token1 token2 token3",
      );
      expect(result).toBe("token1");
    });

    it("should handle header with mixed case Bearer", () => {
      const token = "valid.jwt.token";
      const result = (AuthTokenUtil as unknown as { extractBearerToken: (header: string) => string }).extractBearerToken(`bEaReR ${token}`);
      expect(result).toBeUndefined();
    });
  });

  describe("Integration scenarios", () => {
    it("should work with real JWT tokens", () => {
      const validJWT =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      mockRequest.headers = {
        authorization: `Bearer ${validJWT}`,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);
      expect(result).toBe(validJWT);
    });

    it("should correctly handle request with both access and refresh tokens", () => {
      const accessToken = "access.token.123";
      const refreshToken = "refresh.token.456";

      mockRequest.headers = {
        authorization: `Bearer ${accessToken}`,
      };
      mockRequest.cookies = {
        [AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME]: refreshToken,
      };

      const accessResult = AuthTokenUtil.getAccessToken(mockRequest as Request);
      const refreshResult = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(accessResult).toBe(accessToken);
      expect(refreshResult).toBe(refreshToken);
    });

    it("should correctly handle request with only access token", () => {
      const accessToken = "access.token.123";

      mockRequest.headers = {
        authorization: `Bearer ${accessToken}`,
      };
      mockRequest.cookies = {};

      const accessResult = AuthTokenUtil.getAccessToken(mockRequest as Request);
      const refreshResult = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(accessResult).toBe(accessToken);
      expect(refreshResult).toBeUndefined();
    });

    it("should correctly handle request with only refresh token", () => {
      const refreshToken = "refresh.token.456";

      mockRequest.headers = {};
      mockRequest.cookies = {
        [AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME]: refreshToken,
      };

      const accessResult = AuthTokenUtil.getAccessToken(mockRequest as Request);
      const refreshResult = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(accessResult).toBeUndefined();
      expect(refreshResult).toBe(refreshToken);
    });

    it("should correctly handle request with no tokens", () => {
      mockRequest.headers = {};
      mockRequest.cookies = {};

      const accessResult = AuthTokenUtil.getAccessToken(mockRequest as Request);
      const refreshResult = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(accessResult).toBeUndefined();
      expect(refreshResult).toBeUndefined();
    });

    it("should handle request with malformed authorization header but valid refresh token", () => {
      const refreshToken = "refresh.token.456";

      mockRequest.headers = {
        authorization: "InvalidHeader",
      };
      mockRequest.cookies = {
        [AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME]: refreshToken,
      };

      const accessResult = AuthTokenUtil.getAccessToken(mockRequest as Request);
      const refreshResult = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(accessResult).toBeUndefined();
      expect(refreshResult).toBe(refreshToken);
    });
  });

  describe("Error handling scenarios", () => {
    it("should throw INVALID_ACCESS_TOKEN with correct error message", () => {
      mockRequest.headers = {};
      const expectedError = new Error("Invalid access token");
      mockedAuthExceptions.INVALID_ACCESS_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireAccessToken(mockRequest as Request)).toThrow("Invalid access token");
    });

    it("should throw INVALID_REFRESH_TOKEN with correct error message", () => {
      mockRequest.cookies = undefined;
      const expectedError = new Error("Invalid refresh token");
      mockedAuthExceptions.INVALID_REFRESH_TOKEN.mockReturnValue(expectedError as AppException);

      expect(() => AuthTokenUtil.requireRefreshToken(mockRequest as Request)).toThrow("Invalid refresh token");
    });

    it("should not call INVALID_ACCESS_TOKEN when token is valid", () => {
      mockRequest.headers = {
        authorization: "Bearer valid.token",
      };

      AuthTokenUtil.requireAccessToken(mockRequest as Request);

      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).not.toHaveBeenCalled();
    });

    it("should not call INVALID_REFRESH_TOKEN when token is valid", () => {
      mockRequest.cookies = {
        [AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME]: "valid.token",
      };

      AuthTokenUtil.requireRefreshToken(mockRequest as Request);

      expect(mockedAuthExceptions.INVALID_REFRESH_TOKEN).not.toHaveBeenCalled();
    });

    it("should handle case where AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME is a symbol", () => {
      const token = "refresh.token";
      mockRequest.cookies = {
        [AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME]: token,
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);
      expect(result).toBe(token);
    });
  });

  describe("Edge cases with request object", () => {
    it("should handle request with headers but no cookies", () => {
      mockRequest.headers = {
        authorization: "Bearer valid.token",
      };
      mockRequest.cookies = undefined;

      const accessResult = AuthTokenUtil.getAccessToken(mockRequest as Request);
      const refreshResult = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(accessResult).toBe("valid.token");
      expect(refreshResult).toBeUndefined();
    });

    it("should handle request with cookies but no headers", () => {
      mockRequest.headers = {};
      mockRequest.cookies = {
        [AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME]: "valid.refresh.token",
      };

      const accessResult = AuthTokenUtil.getAccessToken(mockRequest as Request);
      const refreshResult = AuthTokenUtil.getRefreshToken(mockRequest as Request);

      expect(accessResult).toBeUndefined();
      expect(refreshResult).toBe("valid.refresh.token");
    });

    it("should handle request with headers and cookies as undefined", () => {
      mockRequest.headers = undefined;
      mockRequest.cookies = undefined;

      expect(() => AuthTokenUtil.getAccessToken(mockRequest as Request)).toThrow();

      const refreshResult = AuthTokenUtil.getRefreshToken(mockRequest as Request);
      expect(refreshResult).toBeUndefined();
    });

    it("should handle request with cookies as null", () => {
      mockRequest.headers = null as unknown as Record<string, string>;
      mockRequest.cookies = {};

      expect(() => AuthTokenUtil.getAccessToken(mockRequest as Request)).toThrow();

      const refreshResult = AuthTokenUtil.getRefreshToken(mockRequest as Request);
      expect(refreshResult).toBeUndefined();
    });
  });

  describe("Performance and robustness", () => {
    it("should handle very long tokens", () => {
      const longToken = "a".repeat(10000);
      mockRequest.headers = {
        authorization: `Bearer ${longToken}`,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);
      expect(result).toBe(longToken);
    });

    it("should handle very long authorization header", () => {
      const longToken = "a".repeat(10000);
      mockRequest.headers = {
        authorization: `Bearer ${longToken}`,
      };

      const result = AuthTokenUtil.requireAccessToken(mockRequest as Request);
      expect(result).toBe(longToken);
    });

    it("should handle very long refresh token", () => {
      const longToken = "b".repeat(10000);
      mockRequest.cookies = {
        [AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME]: longToken,
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);
      expect(result).toBe(longToken);
    });

    it("should handle multiple calls without side effects", () => {
      const token = "valid.token";
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const result1 = AuthTokenUtil.getAccessToken(mockRequest as Request);
      const result2 = AuthTokenUtil.getAccessToken(mockRequest as Request);

      expect(result1).toBe(result2);
      expect(result1).toBe(token);
    });

    it("should handle multiple calls to require methods without side effects", () => {
      const token = "valid.token";
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const result1 = AuthTokenUtil.requireAccessToken(mockRequest as Request);
      const result2 = AuthTokenUtil.requireAccessToken(mockRequest as Request);

      expect(result1).toBe(result2);
      expect(result1).toBe(token);
      expect(mockedAuthExceptions.INVALID_ACCESS_TOKEN).not.toHaveBeenCalled();
    });
  });

  describe("Type safety and edge cases", () => {
    it("should correctly handle undefined authorization header with optional chaining", () => {
      mockRequest.headers = {
        authorization: undefined,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);
      expect(result).toBeUndefined();
    });

    it("should correctly handle authorization header as null", () => {
      mockRequest.headers = {
        authorization: null as unknown as string,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);
      expect(result).toBeUndefined();
    });

    it("should handle authorization header with numeric token", () => {
      const token = "1234567890";
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);
      expect(result).toBe(token);
    });

    it("should handle authorization header with special characters in token", () => {
      const token = "token-with-!@#$%^&*()_+-=;:'\"<>,.?/\\|`~";
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const result = AuthTokenUtil.getAccessToken(mockRequest as Request);
      expect(result).toBe(token);
    });

    it("should handle cookies with numeric refresh token", () => {
      const token = "1234567890";
      mockRequest.cookies = {
        [AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME]: token,
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);
      expect(result).toBe(token);
    });

    it("should handle cookies with boolean refresh token", () => {
      const token = "true";
      mockRequest.cookies = {
        [AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME]: token,
      };

      const result = AuthTokenUtil.getRefreshToken(mockRequest as Request);
      expect(result).toBe(token);
    });
  });
});
