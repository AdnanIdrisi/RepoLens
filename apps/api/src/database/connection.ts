import mongoose from "mongoose";
import { env } from "../config/env.js";

let isConnected = false;

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<void> {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[Database] Connected to MongoDB at ${uri.replace(/\/\/.*@/, "//***:***@")}`);
  } catch (error) {
    isConnected = false;
    console.error("[Database] MongoDB connection error:", error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("[Database] Disconnected from MongoDB.");
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
