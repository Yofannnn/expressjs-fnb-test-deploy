import { Router } from "express";
import { getDIContainer } from "@/di-container";
import { uploadImage } from "../middleware/upload-image.middleware";
import { rateLimitMiddleware } from "../middleware/rate-limit.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { PRODUCT_CATEGORY_RATE_LIMIT_POLICY } from "../rate-limit/policies/product-category-rate-limit.policy";
import { AuthenticatedRequest } from "../types/authenticated-request.type";

const ProductCategoryRouter: Router = Router();

ProductCategoryRouter.get(
  "/browse",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_CATEGORY_RATE_LIMIT_POLICY.BROWSE_PRODUCT_CATEGORIES),
  (req, res) => getDIContainer().productCategoryController.browse(req, res),
);

ProductCategoryRouter.get(
  "/:id",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_CATEGORY_RATE_LIMIT_POLICY.GET_PRODUCT_CATEGORY_DETAIL),
  (req, res) => getDIContainer().productCategoryController.getDetails(req, res),
);

ProductCategoryRouter.post(
  "/",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_CATEGORY_RATE_LIMIT_POLICY.CREATE_PRODUCT_CATEGORY),
  authMiddleware(getDIContainer().authTokenVerifier),
  uploadImage.single("image"),
  (req, res) => getDIContainer().productCategoryController.create(req as AuthenticatedRequest, res),
);

ProductCategoryRouter.patch(
  "/reorder",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_CATEGORY_RATE_LIMIT_POLICY.REORDER_PRODUCT_CATEGORIES),
  authMiddleware(getDIContainer().authTokenVerifier),
  (req, res) => getDIContainer().productCategoryController.reorder(req as AuthenticatedRequest, res),
);

ProductCategoryRouter.patch(
  "/:id",
  rateLimitMiddleware(getDIContainer().apiRateLimit, PRODUCT_CATEGORY_RATE_LIMIT_POLICY.UPDATE_PRODUCT_CATEGORY),
  authMiddleware(getDIContainer().authTokenVerifier),
  uploadImage.single("image"),
  (req, res) => getDIContainer().productCategoryController.update(req as AuthenticatedRequest, res),
);

export default ProductCategoryRouter;
