import { Router } from "express";
import { RepositoryController } from "./repository.controller.js";

export function createRepositoryRouter(controller: RepositoryController = new RepositoryController()): Router {
  const router = Router();

  // Repository endpoints
  router.post("/repositories", controller.registerRepository);
  router.get("/repositories", controller.listRepositories);
  router.get("/repositories/:id", controller.getRepository);
  router.get("/repositories/:id/files", controller.listFiles);
  router.post("/repositories/:id/sync", controller.syncRepository);

  // Job endpoints
  router.get("/jobs/:jobId", controller.getJob);
  router.post("/jobs/:jobId/cancel", controller.cancelJob);

  return router;
}
