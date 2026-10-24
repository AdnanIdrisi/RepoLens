import express, { Express } from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { createRepositoryRouter } from "./modules/repositories/repository.routes.js";
import { createFilesRouter } from "./modules/files/files.routes.js";
import { createGraphRouter } from "./modules/graph/graph.routes.js";
import { createRetrievalRouter } from "./modules/retrieval/retrieval.routes.js";
import { createTracingRouter } from "./modules/tracing/tracing.routes.js";
import { createImpactRouter } from "./modules/impact/impact.routes.js";
import { createAgentRouter } from "./modules/agent/agent.routes.js";

import { performanceMiddleware } from "./middleware/performance.middleware.js";
import { securityHeadersMiddleware, pathTraversalGuardMiddleware } from "./middleware/security.middleware.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { globalRateLimiter } from "./middleware/rate-limiter.middleware.js";

export function createApp(): Express {
  const app = express();

  // Performance & Security foundation
  app.use(performanceMiddleware);
  app.use(securityHeadersMiddleware);

  // Cross-Origin & Body parsing
  app.use(
    cors({
      origin: [env.WEB_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Identity extraction & Observability
  app.use(authMiddleware);
  app.use(requestLoggerMiddleware);

  // Rate Limiting & Input Sanity Guards
  app.use(globalRateLimiter);
  app.use(pathTraversalGuardMiddleware);

  // Mount API modules
  app.use("/api", healthRouter);
  app.use("/api", createRepositoryRouter());
  app.use("/api", createFilesRouter());
  app.use("/api", createGraphRouter());
  app.use("/api", createRetrievalRouter());
  app.use("/api", createTracingRouter());
  app.use("/api", createImpactRouter());
  app.use("/api", createAgentRouter());

  // Central error handling
  app.use(errorMiddleware);

  return app;
}
