import express, { Express } from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp(): Express {
  const app = express();

  // Basic middleware
  app.use(
    cors({
      origin: [env.WEB_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(requestLoggerMiddleware);

  // Mount API modules
  app.use("/api", healthRouter);

  // Central error handling
  app.use(errorMiddleware);

  return app;
}
