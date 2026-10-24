import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./database/connection.js";

const app = createApp();

async function startServer(): Promise<void> {
  try {
    // Attempt database connection (does not crash API server if local DB is not started yet)
    try {
      await connectDatabase();
    } catch (dbErr) {
      console.warn("[Warning] MongoDB connection not available at startup. API running in degraded mode.", dbErr instanceof Error ? dbErr.message : dbErr);
    }

    const server = app.listen(env.PORT, () => {
      console.log(`[RepoLens API] Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`[RepoLens API] Health: http://localhost:${env.PORT}/api/health`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[RepoLens API] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log("[RepoLens API] HTTP server closed.");
        try {
          await disconnectDatabase();
        } catch (err) {
          console.error("[RepoLens API] Error during DB disconnect:", err);
        }
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        console.error("[RepoLens API] Forced shutdown due to timeout.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (err) {
    console.error("[RepoLens API] Failed to start server:", err);
    process.exit(1);
  }
}

// Only start listening if executed directly
if (process.env.NODE_ENV !== "test") {
  startServer();
}
