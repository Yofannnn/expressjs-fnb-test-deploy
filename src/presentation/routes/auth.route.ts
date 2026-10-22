import { Router } from "express";
import { getDIContainer } from "@/di-container";
import { rateLimitMiddleware } from "../middleware/rate-limit.middleware";
import { AUTH_RATE_LIMIT_POLICY } from "../rate-limit/policies/auth-rate-limit.policy";
import { AuthenticatedRequest } from "../types/authenticated-request.type";
import { authMiddleware } from "../middleware/auth.middleware";

const AuthRouter: Router = Router();

AuthRouter.post("/register", rateLimitMiddleware(getDIContainer().apiRateLimit, AUTH_RATE_LIMIT_POLICY.REGISTER), (req, res) =>
  getDIContainer().authController.register(req, res),
);

AuthRouter.post("/login", rateLimitMiddleware(getDIContainer().apiRateLimit, AUTH_RATE_LIMIT_POLICY.LOGIN), (req, res) =>
  getDIContainer().authController.login(req, res),
);

AuthRouter.post("/refresh-session", rateLimitMiddleware(getDIContainer().apiRateLimit, AUTH_RATE_LIMIT_POLICY.REFRESH_SESSION), (req, res) =>
  getDIContainer().authController.refresh(req, res),
);

AuthRouter.post("/logout", rateLimitMiddleware(getDIContainer().apiRateLimit, AUTH_RATE_LIMIT_POLICY.LOGOUT), (req, res) =>
  getDIContainer().authController.logout(req, res),
);

AuthRouter.post("/verify-email", rateLimitMiddleware(getDIContainer().apiRateLimit, AUTH_RATE_LIMIT_POLICY.VERIFY_EMAIL), (req, res) =>
  getDIContainer().authController.verifyEmail(req, res),
);

AuthRouter.post(
  "/resend-verification-email",
  rateLimitMiddleware(getDIContainer().apiRateLimit, AUTH_RATE_LIMIT_POLICY.RESEND_VERIFICATION_EMAIL),
  authMiddleware(getDIContainer().authTokenVerifier),
  (req, res) => getDIContainer().authController.resendVerificationEmail(req as AuthenticatedRequest, res),
);

AuthRouter.post("/forgot-password", rateLimitMiddleware(getDIContainer().apiRateLimit, AUTH_RATE_LIMIT_POLICY.PASSWORD_RESET_REQUEST), (req, res) =>
  getDIContainer().authController.requestPasswordReset(req, res),
);

AuthRouter.post(
  "/validate-reset-password",
  rateLimitMiddleware(getDIContainer().apiRateLimit, AUTH_RATE_LIMIT_POLICY.VALIDATE_RESET_TOKEN),
  (req, res) => getDIContainer().authController.validatePasswordResetRequest(req, res),
);

AuthRouter.post("/reset-password", rateLimitMiddleware(getDIContainer().apiRateLimit, AUTH_RATE_LIMIT_POLICY.RESET_PASSWORD), (req, res) =>
  getDIContainer().authController.resetPassword(req, res),
);

export default AuthRouter;
