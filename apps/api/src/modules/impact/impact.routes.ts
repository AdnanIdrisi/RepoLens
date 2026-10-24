import { Router } from "express";
import { ImpactController } from "./impact.controller.js";

export function createImpactRouter(controller?: ImpactController): Router {
  const router = Router();
  const impactController = controller || new ImpactController();

  // POST /api/repositories/:id/impact
  router.post("/repositories/:id/impact", impactController.analyzeImpact);

  return router;
}
