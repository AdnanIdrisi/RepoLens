import { Router } from "express";
import { TracingController } from "./tracing.controller.js";

export function createTracingRouter(controller?: TracingController): Router {
  const router = Router();
  const tracingController = controller || new TracingController();

  // GET /api/repositories/:id/routes
  router.get("/repositories/:id/routes", tracingController.listRoutes);

  // POST /api/repositories/:id/trace
  router.post("/repositories/:id/trace", tracingController.traceFlow);

  // POST /api/repositories/:id/routes/index
  router.post("/repositories/:id/routes/index", tracingController.indexRoutes);

  return router;
}
