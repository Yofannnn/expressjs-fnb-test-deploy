import { Request, Response } from "express";
import { AuthController } from "@/presentation/controllers/auth.controller";
import { RateLimit } from "@/application/ports/driving/rate-limit";
import { RegisterUseCase } from "@/application/ports/driving/register.use-case";
import { LoginUseCase } from "@/application/ports/driving/login.use-case";
import { RefreshSessionUseCase } from "@/application/ports/driving/refresh-session.use-case";
import { LogoutUseCase } from "@/application/ports/driving/logout.use-case";
import { VerifyEmailUseCase } from "@/application/ports/driving/verify-email.use-case";
import { ResendVerificationEmailUseCase } from "@/application/ports/driving/resend-verification-email.use-case";
import { RequestPasswordResetUseCase } from "@/application/ports/driving/request-password-reset.use-case";
import { ResetPasswordUseCase } from "@/application/ports/driving/reset-password.use-case";
import { ValidateResetTokenUseCase } from "@/application/ports/driving/validate-reset-token.use-case";
import { Validation } from "@/application/ports/driving/validation";
import { AuthTokenVerifier } from "@/application/ports/driven/auth-token-verifier";
import { Logger } from "@/application/ports/driven/logger";
import { SessionPolicy } from "@/domain/policies/session.policy";
import { AUTH_CONSTANTS } from "@/presentation/constants/auth.constants";
import { AuthTokenUtil } from "@/presentation/utils/auth-token.utils";
import { AUTH_RATE_LIMIT_POLICY } from "@/infrastructure/rate-limit/policies/auth-rate-limit.policy";
import { AUTH_EXCEPTIONS } from "@/application/exceptions/auth.exceptions";
import { AccessTokenPayload } from "@/application/types/auth-token.type";

jest.mock("@/presentation/utils/auth-token.utils", () => ({
  AuthTokenUtil: {
    requireRefreshToken: jest.fn(),
    getAccessToken: jest.fn(),
    requireAccessToken: jest.fn(),
  },
}));

const mockedAuthTokenUtil = AuthTokenUtil as jest.Mocked<typeof AuthTokenUtil>;

describe("AuthController", () => {
  let controller: AuthController;

  let rateLimit: jest.Mocked<RateLimit>;
  let registerUseCase: jest.Mocked<RegisterUseCase>;
  let loginUseCase: jest.Mocked<LoginUseCase>;
  let refreshSessionUseCase: jest.Mocked<RefreshSessionUseCase>;
  let logoutUseCase: jest.Mocked<LogoutUseCase>;
  let verifyEmailUseCase: jest.Mocked<VerifyEmailUseCase>;
  let resendVerificationEmailUseCase: jest.Mocked<ResendVerificationEmailUseCase>;
  let requestPasswordResetUseCase: jest.Mocked<RequestPasswordResetUseCase>;
  let validateResetTokenUseCase: jest.Mocked<ValidateResetTokenUseCase>;
  let resetPasswordUseCase: jest.Mocked<ResetPasswordUseCase>;
  let validation: jest.Mocked<Validation>;
  let authTokenVerifier: jest.Mocked<AuthTokenVerifier>;
  let logger: jest.Mocked<Logger>;
  let sessionPolicy: jest.Mocked<SessionPolicy>;

  let req: Partial<Request>;
  let res: Partial<Response>;

  const FIXED_NOW = 1_700_000_000_000;
  const REFRESH_TOKEN = "refresh-token-value";
  const ACCESS_TOKEN = "access-token-value";
  const REFRESH_TOKEN_LIFETIME_DAYS = 7;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);

    rateLimit = { check: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RateLimit>;

    registerUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RegisterUseCase>;
    loginUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LoginUseCase>;
    refreshSessionUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RefreshSessionUseCase>;
    logoutUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LogoutUseCase>;
    verifyEmailUseCase = { execute: jest.fn() } as unknown as jest.Mocked<VerifyEmailUseCase>;
    resendVerificationEmailUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ResendVerificationEmailUseCase>;
    requestPasswordResetUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RequestPasswordResetUseCase>;
    validateResetTokenUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ValidateResetTokenUseCase>;
    resetPasswordUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ResetPasswordUseCase>;

    validation = { validate: jest.fn() } as unknown as jest.Mocked<Validation>;
    authTokenVerifier = { verifyAccessToken: jest.fn() } as unknown as jest.Mocked<AuthTokenVerifier>;

    logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    sessionPolicy = {
      refreshTokenLifetimeDays: REFRESH_TOKEN_LIFETIME_DAYS,
      accessTokenLifetimeMinutes: 15,
    } as unknown as jest.Mocked<SessionPolicy>;

    mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
    mockedAuthTokenUtil.getAccessToken.mockReturnValue(ACCESS_TOKEN);
    mockedAuthTokenUtil.requireAccessToken.mockReturnValue(ACCESS_TOKEN);

    controller = new AuthController(
      rateLimit,
      registerUseCase,
      loginUseCase,
      refreshSessionUseCase,
      logoutUseCase,
      verifyEmailUseCase,
      resendVerificationEmailUseCase,
      requestPasswordResetUseCase,
      validateResetTokenUseCase,
      resetPasswordUseCase,
      validation,
      authTokenVerifier,
      sessionPolicy,
      logger,
    );

    req = { body: {}, query: {}, params: {}, cookies: {}, headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("register", () => {
    const registerData = { email: "test@example.com", password: "Password123!", name: "John Doe", address: "123 Main St" };
    const tokens = { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN };

    it("should register a user, set refresh cookie, and return 201 with access token", async () => {
      req.body = registerData;
      validation.validate.mockReturnValue(registerData);
      registerUseCase.execute.mockResolvedValue({ tokens });

      await controller.register(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("auth:register", AUTH_RATE_LIMIT_POLICY.REGISTER);
      expect(validation.validate).toHaveBeenCalledWith(expect.anything(), registerData);
      expect(registerUseCase.execute).toHaveBeenCalledWith(registerData);
      expect(res.cookie).toHaveBeenCalledWith(
        AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME,
        REFRESH_TOKEN,
        expect.objectContaining({
          httpOnly: true,
          sameSite: "strict",
          path: "/",
          maxAge: expect.any(Number),
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Registration successful!",
        data: { accessToken: ACCESS_TOKEN },
      });
    });

    it("should set secure cookie in production environment", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      req.body = registerData;
      validation.validate.mockReturnValue(registerData);
      registerUseCase.execute.mockResolvedValue({ tokens });

      await controller.register(req as Request, res as Response);

      expect(res.cookie).toHaveBeenCalledWith(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN, expect.objectContaining({ secure: true }));

      process.env.NODE_ENV = originalEnv;
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.register(req as Request, res as Response)).rejects.toThrow("rate limited");
      expect(registerUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("invalid body");
      validation.validate.mockImplementation(() => {
        throw err;
      });

      await expect(controller.register(req as Request, res as Response)).rejects.toThrow("invalid body");
      expect(registerUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("registration failed");
      validation.validate.mockReturnValue(registerData);
      registerUseCase.execute.mockRejectedValue(err);

      await expect(controller.register(req as Request, res as Response)).rejects.toThrow("registration failed");
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const loginData = { email: "test@example.com", password: "Password123!" };
    const tokens = { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN };

    it("should log a user in, set refresh cookie, and return access token", async () => {
      req.body = loginData;
      validation.validate.mockReturnValue(loginData);
      loginUseCase.execute.mockResolvedValue({ tokens });

      await controller.login(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("auth:login", AUTH_RATE_LIMIT_POLICY.LOGIN);
      expect(validation.validate).toHaveBeenCalledWith(expect.anything(), loginData);
      expect(loginUseCase.execute).toHaveBeenCalledWith(loginData);
      expect(res.cookie).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Login successful.",
        data: { accessToken: ACCESS_TOKEN },
      });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.login(req as Request, res as Response)).rejects.toThrow("rate limited");
      expect(loginUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("invalid credentials shape");
      validation.validate.mockImplementation(() => {
        throw err;
      });

      await expect(controller.login(req as Request, res as Response)).rejects.toThrow("invalid credentials shape");
      expect(loginUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      const err = new Error("bad credentials");
      validation.validate.mockReturnValue(loginData);
      loginUseCase.execute.mockRejectedValue(err);

      await expect(controller.login(req as Request, res as Response)).rejects.toThrow("bad credentials");
    });
  });

  describe("refresh", () => {
    const tokens = { accessToken: "new-access-token", refreshToken: "new-refresh-token" };

    it("should refresh the session, rotate cookie, and return a new access token", async () => {
      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      refreshSessionUseCase.execute.mockResolvedValue({ tokens });

      await controller.refresh(req as Request, res as Response);

      expect(mockedAuthTokenUtil.requireRefreshToken).toHaveBeenCalledWith(req);
      expect(rateLimit.check).toHaveBeenCalledWith("auth:refresh-session", AUTH_RATE_LIMIT_POLICY.REFRESH_SESSION);
      expect(refreshSessionUseCase.execute).toHaveBeenCalledWith({ refreshToken: REFRESH_TOKEN });
      expect(res.cookie).toHaveBeenCalledWith(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({
        message: "Session refreshed successfully",
        data: { accessToken: tokens.accessToken },
      });
    });

    it("should propagate missing refresh token errors", async () => {
      const err = AUTH_EXCEPTIONS.INVALID_REFRESH_TOKEN();
      mockedAuthTokenUtil.requireRefreshToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.refresh(req as Request, res as Response)).rejects.toThrow(err);
      expect(rateLimit.check).toHaveBeenCalledWith("auth:refresh-session", AUTH_RATE_LIMIT_POLICY.REFRESH_SESSION);
      expect(refreshSessionUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate rate limit errors", async () => {
      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.refresh(req as Request, res as Response)).rejects.toThrow("rate limited");
      expect(refreshSessionUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      const err = new Error("session expired");
      refreshSessionUseCase.execute.mockRejectedValue(err);

      await expect(controller.refresh(req as Request, res as Response)).rejects.toThrow("session expired");
    });
  });

  describe("logout", () => {
    it("should log the user out and clear the refresh cookie", async () => {
      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      mockedAuthTokenUtil.getAccessToken.mockReturnValue(ACCESS_TOKEN);
      logoutUseCase.execute.mockResolvedValue(undefined);

      await controller.logout(req as Request, res as Response);

      expect(mockedAuthTokenUtil.requireRefreshToken).toHaveBeenCalledWith(req);
      expect(mockedAuthTokenUtil.getAccessToken).toHaveBeenCalledWith(req);
      expect(rateLimit.check).toHaveBeenCalledWith("auth:logout", AUTH_RATE_LIMIT_POLICY.LOGOUT);
      expect(logoutUseCase.execute).toHaveBeenCalledWith({ refreshToken: REFRESH_TOKEN, accessToken: ACCESS_TOKEN });
      expect(res.clearCookie).toHaveBeenCalledWith(
        AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME,
        expect.objectContaining({ httpOnly: true, sameSite: "strict", path: "/" }),
      );
      expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
    });

    it("should handle missing access token", async () => {
      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      mockedAuthTokenUtil.getAccessToken.mockReturnValue(undefined);
      logoutUseCase.execute.mockResolvedValue(undefined);

      await controller.logout(req as Request, res as Response);

      expect(logoutUseCase.execute).toHaveBeenCalledWith({ refreshToken: REFRESH_TOKEN, accessToken: undefined });
      expect(res.clearCookie).toHaveBeenCalled();
    });

    it("should propagate missing refresh token errors", async () => {
      const err = AUTH_EXCEPTIONS.INVALID_REFRESH_TOKEN();
      mockedAuthTokenUtil.requireRefreshToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.logout(req as Request, res as Response)).rejects.toThrow(err);
      expect(rateLimit.check).toHaveBeenCalledWith("auth:logout", AUTH_RATE_LIMIT_POLICY.LOGOUT);
      expect(logoutUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate rate limit errors", async () => {
      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      mockedAuthTokenUtil.getAccessToken.mockReturnValue(ACCESS_TOKEN);
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.logout(req as Request, res as Response)).rejects.toThrow("rate limited");
      expect(logoutUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      mockedAuthTokenUtil.getAccessToken.mockReturnValue(ACCESS_TOKEN);
      const err = new Error("logout failed");
      logoutUseCase.execute.mockRejectedValue(err);

      await expect(controller.logout(req as Request, res as Response)).rejects.toThrow("logout failed");
    });

    it("should log errors thrown while clearing the cookie but still succeed", async () => {
      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      mockedAuthTokenUtil.getAccessToken.mockReturnValue(ACCESS_TOKEN);
      logoutUseCase.execute.mockResolvedValue(undefined);
      const clearCookieError = new Error("cookie clearing failed");
      (res.clearCookie as jest.Mock).mockImplementation(() => {
        throw clearCookieError;
      });

      await controller.logout(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith({
        context: "AuthController",
        event: "CLEAR_REFRESH_TOKEN_COOKIE_ERROR",
        message: clearCookieError.message,
        stack: clearCookieError.stack,
        data: { error: clearCookieError },
      });
      expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
    });
  });

  describe("verifyEmail", () => {
    it("should verify the email using the token from query params", async () => {
      req.query = { token: "verify-token" };
      verifyEmailUseCase.execute.mockResolvedValue({ userId: "user-123" });

      await controller.verifyEmail(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("auth:verify-email", AUTH_RATE_LIMIT_POLICY.VERIFY_EMAIL);
      expect(verifyEmailUseCase.execute).toHaveBeenCalledWith({ verificationToken: "verify-token" });
      expect(res.json).toHaveBeenCalledWith({ message: "Email verified" });
    });

    it("should handle missing token in query", async () => {
      req.query = {};
      verifyEmailUseCase.execute.mockResolvedValue({ userId: "user-123" });

      await controller.verifyEmail(req as Request, res as Response);

      expect(verifyEmailUseCase.execute).toHaveBeenCalledWith({ verificationToken: undefined });
    });

    it("should propagate rate limit errors", async () => {
      req.query = { token: "verify-token" };
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.verifyEmail(req as Request, res as Response)).rejects.toThrow("rate limited");
      expect(verifyEmailUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      req.query = { token: "verify-token" };
      const err = new Error("invalid or expired token");
      verifyEmailUseCase.execute.mockRejectedValue(err);

      await expect(controller.verifyEmail(req as Request, res as Response)).rejects.toThrow("invalid or expired token");
    });
  });

  describe("resendVerificationEmail", () => {
    it("should resend the verification email for the authenticated user", async () => {
      mockedAuthTokenUtil.requireAccessToken.mockReturnValue(ACCESS_TOKEN);
      authTokenVerifier.verifyAccessToken.mockReturnValue({ sub: "user-123" } as AccessTokenPayload);
      resendVerificationEmailUseCase.execute.mockResolvedValue(undefined);

      await controller.resendVerificationEmail(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("auth:resend-verification-email", AUTH_RATE_LIMIT_POLICY.RESEND_VERIFICATION_EMAIL);
      expect(mockedAuthTokenUtil.requireAccessToken).toHaveBeenCalledWith(req);
      expect(authTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);
      expect(resendVerificationEmailUseCase.execute).toHaveBeenCalledWith({ userId: "user-123" });
      expect(res.json).toHaveBeenCalledWith({ message: "Verification email sent" });
    });

    it("should propagate rate limit errors", async () => {
      mockedAuthTokenUtil.requireAccessToken.mockReturnValue(ACCESS_TOKEN);
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.resendVerificationEmail(req as Request, res as Response)).rejects.toThrow("rate limited");
      expect(resendVerificationEmailUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate missing access token errors", async () => {
      const err = AUTH_EXCEPTIONS.INVALID_ACCESS_TOKEN();
      mockedAuthTokenUtil.requireAccessToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.resendVerificationEmail(req as Request, res as Response)).rejects.toThrow(err);
      expect(rateLimit.check).toHaveBeenCalledWith("auth:resend-verification-email", AUTH_RATE_LIMIT_POLICY.RESEND_VERIFICATION_EMAIL);
      expect(resendVerificationEmailUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate access token verification errors", async () => {
      mockedAuthTokenUtil.requireAccessToken.mockReturnValue(ACCESS_TOKEN);
      const err = new Error("invalid signature");
      authTokenVerifier.verifyAccessToken.mockImplementation(() => {
        throw err;
      });

      await expect(controller.resendVerificationEmail(req as Request, res as Response)).rejects.toThrow("invalid signature");
      expect(resendVerificationEmailUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      mockedAuthTokenUtil.requireAccessToken.mockReturnValue(ACCESS_TOKEN);
      authTokenVerifier.verifyAccessToken.mockReturnValue({ sub: "user-123" } as AccessTokenPayload);
      const err = new Error("already verified");
      resendVerificationEmailUseCase.execute.mockRejectedValue(err);

      await expect(controller.resendVerificationEmail(req as Request, res as Response)).rejects.toThrow("already verified");
    });
  });

  describe("requestPasswordReset", () => {
    const forgotPasswordData = { email: "test@example.com" };

    it("should request a password reset for the given email", async () => {
      req.body = { email: "test@example.com" };
      validation.validate.mockReturnValue(forgotPasswordData);
      requestPasswordResetUseCase.execute.mockResolvedValue(undefined);

      await controller.requestPasswordReset(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("auth:password-reset-request", AUTH_RATE_LIMIT_POLICY.PASSWORD_RESET_REQUEST);
      expect(validation.validate).toHaveBeenCalledWith(expect.anything(), { email: "test@example.com" });
      expect(requestPasswordResetUseCase.execute).toHaveBeenCalledWith(forgotPasswordData);
      expect(res.json).toHaveBeenCalledWith({ message: "Password reset request sent" });
    });

    it("should propagate rate limit errors", async () => {
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.requestPasswordReset(req as Request, res as Response)).rejects.toThrow("rate limited");
      expect(requestPasswordResetUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      const err = new Error("invalid email");
      validation.validate.mockImplementation(() => {
        throw err;
      });

      await expect(controller.requestPasswordReset(req as Request, res as Response)).rejects.toThrow("invalid email");
      expect(requestPasswordResetUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      validation.validate.mockReturnValue(forgotPasswordData);
      const err = new Error("could not send email");
      requestPasswordResetUseCase.execute.mockRejectedValue(err);

      await expect(controller.requestPasswordReset(req as Request, res as Response)).rejects.toThrow("could not send email");
    });
  });

  describe("validatePasswordResetRequest", () => {
    it("should validate a reset token and return expiry data", async () => {
      req.query = { token: "reset-token" };
      const result = { expiresAt: new Date(FIXED_NOW + 3600000), remainingTimeMs: 3600000 };
      validateResetTokenUseCase.execute.mockResolvedValue(result);

      await controller.validatePasswordResetRequest(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("auth:validate-reset-token", AUTH_RATE_LIMIT_POLICY.VALIDATE_RESET_TOKEN);
      expect(validateResetTokenUseCase.execute).toHaveBeenCalledWith({ resetPasswordToken: "reset-token" });
      expect(res.json).toHaveBeenCalledWith({ message: "Token is valid.", data: result });
    });

    it("should handle missing token in query", async () => {
      req.query = {};
      validateResetTokenUseCase.execute.mockResolvedValue({ expiresAt: new Date(), remainingTimeMs: 3600000 });

      await controller.validatePasswordResetRequest(req as Request, res as Response);

      expect(validateResetTokenUseCase.execute).toHaveBeenCalledWith({ resetPasswordToken: undefined });
    });

    it("should propagate rate limit errors", async () => {
      req.query = { token: "reset-token" };
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.validatePasswordResetRequest(req as Request, res as Response)).rejects.toThrow("rate limited");
      expect(validateResetTokenUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      req.query = { token: "reset-token" };
      const err = new Error("token expired");
      validateResetTokenUseCase.execute.mockRejectedValue(err);

      await expect(controller.validatePasswordResetRequest(req as Request, res as Response)).rejects.toThrow("token expired");
    });
  });

  describe("resetPassword", () => {
    const resetPasswordData = { password: "NewPassword123!", token: "reset-token" };

    it("should reset the password using the validated token and new password", async () => {
      req.body = { password: "NewPassword123!", token: "reset-token" };
      validation.validate.mockReturnValue(resetPasswordData);
      resetPasswordUseCase.execute.mockResolvedValue(undefined);

      await controller.resetPassword(req as Request, res as Response);

      expect(rateLimit.check).toHaveBeenCalledWith("auth:reset-password", AUTH_RATE_LIMIT_POLICY.RESET_PASSWORD);
      expect(validation.validate).toHaveBeenCalledWith(expect.anything(), {
        password: "NewPassword123!",
        token: "reset-token",
      });
      expect(resetPasswordUseCase.execute).toHaveBeenCalledWith({
        resetToken: "reset-token",
        newPassword: "NewPassword123!",
      });
      expect(res.json).toHaveBeenCalledWith({ message: "Password reset successfully" });
    });

    it("should propagate rate limit errors", async () => {
      req.body = { password: "NewPassword123!", token: "reset-token" };
      const err = new Error("rate limited");
      rateLimit.check.mockRejectedValue(err);

      await expect(controller.resetPassword(req as Request, res as Response)).rejects.toThrow("rate limited");
      expect(resetPasswordUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      req.body = { password: "weak", token: "reset-token" };
      const err = new Error("password too weak");
      validation.validate.mockImplementation(() => {
        throw err;
      });

      await expect(controller.resetPassword(req as Request, res as Response)).rejects.toThrow("password too weak");
      expect(resetPasswordUseCase.execute).not.toHaveBeenCalled();
    });

    it("should propagate use case errors", async () => {
      req.body = { password: "NewPassword123!", token: "reset-token" };
      validation.validate.mockReturnValue(resetPasswordData);
      const err = new Error("token already used");
      resetPasswordUseCase.execute.mockRejectedValue(err);

      await expect(controller.resetPassword(req as Request, res as Response)).rejects.toThrow("token already used");
    });
  });

  describe("Refresh token cookie security attributes", () => {
    const registerData = { email: "test@example.com", password: "Password123!", name: "John Doe", address: "123 Main St" };
    const tokens = { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN };

    it.each([
      ["production", true],
      ["development", false],
      ["test", false],
    ])("should set 'secure: %s' as %s based on NODE_ENV", async (nodeEnv, expectedSecure) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = nodeEnv;

      try {
        req.body = registerData;
        validation.validate.mockReturnValue(registerData);
        registerUseCase.execute.mockResolvedValue({ tokens });

        await controller.register(req as Request, res as Response);

        expect(res.cookie).toHaveBeenCalledWith(
          AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME,
          REFRESH_TOKEN,
          expect.objectContaining({ secure: expectedSecure }),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it("should use sessionPolicy.refreshTokenLifetimeDays for maxAge", async () => {
      req.body = registerData;
      validation.validate.mockReturnValue(registerData);
      registerUseCase.execute.mockResolvedValue({ tokens });

      await controller.register(req as Request, res as Response);

      const expectedMaxAge = REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
      expect(res.cookie).toHaveBeenCalledWith(
        AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME,
        REFRESH_TOKEN,
        expect.objectContaining({ maxAge: expectedMaxAge }),
      );
    });

    it("should clear cookie with correct options in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      mockedAuthTokenUtil.getAccessToken.mockReturnValue(ACCESS_TOKEN);
      logoutUseCase.execute.mockResolvedValue(undefined);

      await controller.logout(req as Request, res as Response);

      expect(res.clearCookie).toHaveBeenCalledWith(
        AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          path: "/",
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should clear cookie with secure option in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      mockedAuthTokenUtil.requireRefreshToken.mockReturnValue(REFRESH_TOKEN);
      mockedAuthTokenUtil.getAccessToken.mockReturnValue(ACCESS_TOKEN);
      logoutUseCase.execute.mockResolvedValue(undefined);

      await controller.logout(req as Request, res as Response);

      expect(res.clearCookie).toHaveBeenCalledWith(
        AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME,
        expect.objectContaining({
          secure: true,
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});
