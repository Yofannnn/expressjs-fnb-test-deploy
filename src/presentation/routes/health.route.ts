import { Router } from "express";
import { getDIContainer } from "@/di-container";

const HealthRouter: Router = Router();

HealthRouter.get("/", (req, res) => getDIContainer().healthController.check(req, res));

export default HealthRouter;
