import { CookieOptions, Request, Response } from "express";
import { AuthenticatedRequest } from "../types/authenticated-request.type";
import { RegisterUseCasePort } from "@/application/ports/driving/register.use-case.port";
import { LoginUseCasePort } from "@/application/ports/driving/login.use-case.port";
import { RefreshSessionUseCasePort } from "@/application/ports/driving/refresh-session.use-case.port";
import { LogoutUseCasePort } from "@/application/ports/driving/logout.use-case.port";
import { VerifyEmailUseCasePort } from "@/application/ports/driving/verify-email.use-case.port";
import { ResendVerificationEmailUseCasePort } from "@/application/ports/driving/resend-verification-email.use-case.port";
import { RequestPasswordResetUseCasePort } from "@/application/ports/driving/request-password-reset.use-case.port";
import { ResetPasswordUseCasePort } from "@/application/ports/driving/reset-password.use-case.port";
import { ValidateResetTokenUseCasePort } from "@/application/ports/driving/validate-reset-token.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { AuthTokenUtil } from "@/presentation/utils/auth-token.util";
import { AUTH_CONSTANTS } from "../constants/auth.constants";
import { SessionPolicy } from "@/domain/policies/session.policy";
import { TimeUtil } from "@/utils/time.util";
import { ZodRequestValidation } from "../validation/zod-request-validation";
import { UnauthenticatedException } from "@/application/exceptions/auth.exceptions";
import {
  ForgotPasswordSchema,
  ForgotPasswordSchemaType,
  LoginSchema,
  LoginSchemaType,
  RegisterSchema,
  RegisterSchemaType,
  ResetPasswordSchema,
  ResetPasswordSchemaType,
  ValidateResetTokenSchema,
  ValidateResetTokenSchemaType,
  VerifyEmailSchema,
  VerifyEmailSchemaType,
} from "@/presentation/validation/schemas/auth.schemas";

export class AuthController {
  constructor(
    private readonly validation: ZodRequestValidation,
    private readonly registerUseCase: RegisterUseCasePort,
    private readonly loginUseCase: LoginUseCasePort,
    private readonly refreshSessionUseCase: RefreshSessionUseCasePort,
    private readonly logoutUseCase: LogoutUseCasePort,
    private readonly verifyEmailUseCase: VerifyEmailUseCasePort,
    private readonly resendVerificationEmailUseCase: ResendVerificationEmailUseCasePort,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCasePort,
    private readonly validateResetTokenUseCase: ValidateResetTokenUseCasePort,
    private readonly resetPasswordUseCase: ResetPasswordUseCasePort,
    private readonly sessionPolicy: SessionPolicy,
    private readonly logger: LoggerPort,
  ) {}

  async register(req: Request, res: Response): Promise<Response> {
    const body = req.body;
    const registerDto = this.validation.validate<RegisterSchemaType>(RegisterSchema, body);

    const { tokens } = await this.registerUseCase.execute(registerDto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return res.status(201).json({
      message: "Registration successful!",
      data: { accessToken: tokens.accessToken },
    });
  }

  async login(req: Request, res: Response): Promise<Response> {
    const body = req.body;
    const validation = this.validation.validate<LoginSchemaType>(LoginSchema, body);

    const { tokens } = await this.loginUseCase.execute(validation);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return res.json({
      message: "Login successful.",
      data: { accessToken: tokens.accessToken },
    });
  }

  async refresh(req: Request, res: Response): Promise<Response> {
    const refreshToken = AuthTokenUtil.getRefreshToken(req);
    if (!refreshToken) throw new UnauthenticatedException();

    const { tokens } = await this.refreshSessionUseCase.execute({ refreshToken });
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return res.json({
      message: "Session refreshed successfully",
      data: { accessToken: tokens.accessToken },
    });
  }

  async logout(req: Request, res: Response): Promise<Response> {
    const refreshToken = AuthTokenUtil.getRefreshToken(req);
    const accessToken = AuthTokenUtil.getAccessToken(req);

    if (!refreshToken) throw new UnauthenticatedException();

    await this.logoutUseCase.execute({ refreshToken, accessToken });
    this.clearRefreshTokenCookie(res);

    return res.json({ message: "Logged out successfully" });
  }

  async verifyEmail(req: Request, res: Response): Promise<Response> {
    const verifyEmailDto = this.validation.validate<VerifyEmailSchemaType>(VerifyEmailSchema, req.body);
    await this.verifyEmailUseCase.execute(verifyEmailDto);

    return res.json({ message: "Email verified" });
  }

  async resendVerificationEmail(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const accessTokenPayload = req.auth;

    await this.resendVerificationEmailUseCase.execute({ userId: accessTokenPayload.sub });

    return res.json({ message: "Verification email sent" });
  }

  async requestPasswordReset(req: Request, res: Response): Promise<Response> {
    const { email } = req.body;
    const forgotPasswordDto = this.validation.validate<ForgotPasswordSchemaType>(ForgotPasswordSchema, { email });

    await this.requestPasswordResetUseCase.execute(forgotPasswordDto);
    return res.json({ message: "Password reset request sent" });
  }

  async validatePasswordResetRequest(req: Request, res: Response): Promise<Response> {
    const validatePasswordResetDto = this.validation.validate<ValidateResetTokenSchemaType>(ValidateResetTokenSchema, req.body);
    const result = await this.validateResetTokenUseCase.execute(validatePasswordResetDto);

    return res.json({ message: `Token is valid.`, data: result });
  }

  async resetPassword(req: Request, res: Response): Promise<Response> {
    const resetPasswordDto = this.validation.validate<ResetPasswordSchemaType>(ResetPasswordSchema, req.body);
    await this.resetPasswordUseCase.execute(resetPasswordDto);

    return res.json({ message: "Password reset successfully" });
  }

  private getRefreshTokenCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...this.getRefreshTokenCookieOptions(),
      maxAge: TimeUtil.daysToMs(this.sessionPolicy.refreshTokenLifetimeDays),
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    try {
      res.clearCookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, this.getRefreshTokenCookieOptions());
    } catch (error) {
      this.logger.error({
        context: "AuthController",
        event: "CLEAR_REFRESH_TOKEN_COOKIE_ERROR",
        message: error instanceof Error ? error.message : "Failed to clear refresh token cookie",
        stack: error instanceof Error ? error.stack : undefined,
        data: { error },
      });
    }
  }
}
