import { Router } from "express";
import { RetrievalController } from "./retrieval.controller.js";

export function createRetrievalRouter(controller?: RetrievalController): Router {
  const router = Router();
  const retrievalController = controller || new RetrievalController();

  // POST & GET /api/repositories/:id/search
  router.post("/repositories/:id/search", retrievalController.search);
  router.get("/repositories/:id/search", retrievalController.search);

  // POST /api/repositories/:id/search/index
  router.post("/repositories/:id/search/index", retrievalController.indexChunks);

  // GET /api/repositories/:id/search/stats
  router.get("/repositories/:id/search/stats", retrievalController.getStats);

  return router;
}
