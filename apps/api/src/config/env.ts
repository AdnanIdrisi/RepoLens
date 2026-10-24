import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

// Load .env from project root or current working directory
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/repolens"),
  GITHUB_TOKEN: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash")
});

export type Env = z.infer<typeof EnvSchema>;

let parsedEnv: Env;

try {
  parsedEnv = EnvSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Environment configuration error:", JSON.stringify(error.format(), null, 2));
  } else {
    console.error("Unknown environment parsing error:", error);
  }
  // In test environment, fallback to defaults
  if (process.env.NODE_ENV === "test") {
    parsedEnv = EnvSchema.parse({
      NODE_ENV: "test",
      PORT: 4001,
      MONGODB_URI: "mongodb://localhost:27017/repolens_test"
    });
  } else {
    process.exit(1);
  }
}

export const env = parsedEnv;
