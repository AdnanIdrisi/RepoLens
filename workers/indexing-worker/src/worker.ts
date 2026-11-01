import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * @repolens/indexing-worker
 * Background worker process for asynchronous repository indexing pipelines.
 */
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/repolens";
const POLL_INTERVAL_MS = 5000;

console.log("[Worker] RepoLens Indexing Worker starting up...");

async function startWorker(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[Worker] Connected to MongoDB at ${MONGODB_URI.replace(/\/\/.*@/, "//***:***@")}`);
  } catch (err) {
    console.warn(
      "[Worker] MongoDB connection not immediately available at startup, will retry:",
      err instanceof Error ? err.message : err
    );
  }

  // Active polling loop: maintains process alive and performs periodic health check
  setInterval(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db?.admin().ping();
      } else {
        await mongoose.connect(MONGODB_URI, {
          serverSelectionTimeoutMS: 5000
        });
      }
    } catch {
      // Reconnection or ping transient errors handled silently
    }
  }, POLL_INTERVAL_MS);

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Shutting down worker...`);
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect error
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  console.log("[Worker] RepoLens Indexing Worker initialized and running.");
}

startWorker().catch((err) => {
  console.error("[Worker] Fatal error starting worker:", err);
  // Keep process alive to avoid fast crash-restart loop
  setInterval(() => {}, 60000);
});
