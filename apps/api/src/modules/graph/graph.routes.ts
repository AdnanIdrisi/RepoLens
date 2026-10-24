import { Router } from "express";
import { GraphController } from "./graph.controller.js";

export function createGraphRouter(controller: GraphController = new GraphController()): Router {
  const router = Router();

  router.get("/repositories/:id/graph", controller.getGraph);
  router.get("/repositories/:id/symbols", controller.searchSymbols);
  router.get("/repositories/:id/symbols/:symbolId", controller.getSymbol);
  router.post("/repositories/:id/index", controller.triggerIndex);

  return router;
}
