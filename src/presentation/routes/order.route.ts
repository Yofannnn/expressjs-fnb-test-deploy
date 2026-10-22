import { Router } from "express";
import { getDIContainer } from "@/di-container";
import { rateLimitMiddleware } from "../middleware/rate-limit.middleware";
import { ORDER_RATE_LIMIT_POLICY } from "../rate-limit/policies/order-rate-limit.policy";
import { authMiddleware } from "../middleware/auth.middleware";
import { AuthenticatedRequest } from "../types/authenticated-request.type";

const OrderRouter: Router = Router();

OrderRouter.post(
  "/online-orders/quotes",
  rateLimitMiddleware(getDIContainer().apiRateLimit, ORDER_RATE_LIMIT_POLICY.GET_ONLINE_ORDER_QUOTE),
  (req, res) => getDIContainer().orderController.getOnlineOrderQuote(req, res),
);

OrderRouter.post("/online-orders", rateLimitMiddleware(getDIContainer().apiRateLimit, ORDER_RATE_LIMIT_POLICY.CREATE_ONLINE_ORDER), (req, res) =>
  getDIContainer().orderController.createOnlineOrder(req, res),
);

OrderRouter.post("/guest-token", rateLimitMiddleware(getDIContainer().apiRateLimit, ORDER_RATE_LIMIT_POLICY.RENEW_GUEST_ORDER_TOKEN), (req, res) =>
  getDIContainer().orderController.renewGuestOrderToken(req, res),
);

OrderRouter.get(
  "/browse",
  rateLimitMiddleware(getDIContainer().apiRateLimit, ORDER_RATE_LIMIT_POLICY.BROWSE_ORDERS),
  authMiddleware(getDIContainer().authTokenVerifier),
  (req, res) => getDIContainer().orderController.browse(req as AuthenticatedRequest, res),
);

OrderRouter.get("/:id", rateLimitMiddleware(getDIContainer().apiRateLimit, ORDER_RATE_LIMIT_POLICY.GET_ORDER_DETAILS), (req, res) =>
  getDIContainer().orderController.getDetails(req, res),
);

export default OrderRouter;
