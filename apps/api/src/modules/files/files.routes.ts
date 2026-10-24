import { Router } from "express";
import { FilesController } from "./files.controller.js";

export function createFilesRouter(controller: FilesController = new FilesController()): Router {
  const router = Router();

  // Route matches /repositories/:id/file/* (wildcard repository-relative path)
  router.get("/repositories/:id/file/*", controller.getFile);

  return router;
}
