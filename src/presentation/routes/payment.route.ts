import { Router } from "express";
import { getDIContainer } from "@/di-container";
import { rateLimitMiddleware } from "../middleware/rate-limit.middleware";
import { PAYMENT_RATE_LIMIT_POLICY } from "../rate-limit/policies/payment-rate-limit.policy";

const PaymentRouter: Router = Router();

PaymentRouter.post("/", rateLimitMiddleware(getDIContainer().apiRateLimit, PAYMENT_RATE_LIMIT_POLICY.INIT_CHARGE), (req, res) =>
  getDIContainer().paymentController.initCharge(req, res),
);

// TODO: handled by webhook
PaymentRouter.post("/pay", (req, res) => getDIContainer().paymentController.handleSuccessPayment(req, res));

PaymentRouter.get(
  "/:orderId/:paymentId",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PAYMENT_RATE_LIMIT_POLICY.GET_PAYMENT_DETAILS),
  (req, res) => getDIContainer().paymentController.getDetails(req, res),
);

PaymentRouter.get("/:orderId", rateLimitMiddleware(getDIContainer().apiRateLimit, PAYMENT_RATE_LIMIT_POLICY.GET_PAYMENTS_BY_ORDER_ID), (req, res) =>
  getDIContainer().paymentController.getByOrderId(req, res),
);

export default PaymentRouter;
