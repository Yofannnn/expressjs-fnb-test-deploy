import { Application, Router } from "express";
import HealthRouter from "./health.route";
import AuthRouter from "./auth.route";
import UserRouter from "./user.route";
import ProductRouter from "./product.route";
import ProductCategoryRouter from "./product-category.route";
import OrderRouter from "./order.route";
import PaymentRouter from "./payment.route";

const _routes: Array<[string, Router]> = [
  ["/health", HealthRouter],
  ["/auth", AuthRouter],
  ["/users", UserRouter],
  ["/products", ProductRouter],
  ["/product-categories", ProductCategoryRouter],
  ["/orders", OrderRouter],
  ["/payments", PaymentRouter],
];

const routes = (app: Application) => {
  _routes.forEach((route) => {
    const [url, router] = route;
    app.use(url, router);
  });
};

export default routes;
