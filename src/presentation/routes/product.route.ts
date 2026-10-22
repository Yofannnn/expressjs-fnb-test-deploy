import { Router } from "express";
import { getDIContainer } from "@/di-container";
import { PRODUCT_RATE_LIMIT_POLICY } from "../rate-limit/policies/product-rate-limit.policy";
import { rateLimitMiddleware } from "../middleware/rate-limit.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { uploadImage } from "../middleware/upload-image.middleware";
import { AuthenticatedRequest } from "../types/authenticated-request.type";

const ProductRouter: Router = Router();

ProductRouter.post(
  "/",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_RATE_LIMIT_POLICY.CREATE_PRODUCT),
  authMiddleware(getDIContainer().authTokenVerifier),
  uploadImage.array("images", 10),
  (req, res) => getDIContainer().productController.create(req as AuthenticatedRequest, res),
);

ProductRouter.patch(
  "/:id",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT),
  authMiddleware(getDIContainer().authTokenVerifier),
  (req, res) => getDIContainer().productController.update(req as AuthenticatedRequest, res),
);

ProductRouter.patch(
  "/:id/stock",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT_STOCK),
  authMiddleware(getDIContainer().authTokenVerifier),
  (req, res) => getDIContainer().productController.updateStock(req as AuthenticatedRequest, res),
);

ProductRouter.patch(
  "/:id/status",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT_STATUS),
  authMiddleware(getDIContainer().authTokenVerifier),
  (req, res) => getDIContainer().productController.updateStatus(req as AuthenticatedRequest, res),
);

ProductRouter.patch(
  "/:id/images",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_RATE_LIMIT_POLICY.UPDATE_PRODUCT_IMAGE),
  authMiddleware(getDIContainer().authTokenVerifier),
  uploadImage.single("image"),
  (req, res) => getDIContainer().productController.updateImage(req as AuthenticatedRequest, res),
);

ProductRouter.get("/by-ids", rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_RATE_LIMIT_POLICY.GET_PRODUCTS_BY_IDS), (req, res) =>
  getDIContainer().productController.getByIds(req, res),
);

ProductRouter.get("/browse", rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_RATE_LIMIT_POLICY.BROWSE_PRODUCTS), (req, res) =>
  getDIContainer().productController.browse(req, res),
);

ProductRouter.get("/search", rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_RATE_LIMIT_POLICY.SEARCH_PRODUCTS), (req, res) =>
  getDIContainer().productController.search(req, res),
);

ProductRouter.get("/:id", rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_RATE_LIMIT_POLICY.GET_PRODUCT_DETAILS), (req, res) =>
  getDIContainer().productController.getDetails(req, res),
);

export default ProductRouter;
