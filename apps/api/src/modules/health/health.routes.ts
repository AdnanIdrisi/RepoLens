import { Router } from "express";
import { HealthController } from "./health.controller.js";

export const healthRouter = Router();

healthRouter.get("/health", HealthController.getHealth);
healthRouter.get("/ready", HealthController.getReady);
