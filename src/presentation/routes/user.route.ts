import { Router } from "express";
import { getDIContainer } from "@/di-container";
import { rateLimitMiddleware } from "../middleware/rate-limit.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { USER_RATE_LIMIT_POLICY } from "../rate-limit/policies/user-rate-limit.policy";
import { AuthenticatedRequest } from "../types/authenticated-request.type";

const UserRouter: Router = Router();

UserRouter.get(
  "/me",
  rateLimitMiddleware(getDIContainer().apiRateLimit, USER_RATE_LIMIT_POLICY.GET_PROFILE),
  authMiddleware(getDIContainer().authTokenVerifier),
  (req, res) => getDIContainer().userController.getCurrentProfile(req as AuthenticatedRequest, res),
);

export default UserRouter;
