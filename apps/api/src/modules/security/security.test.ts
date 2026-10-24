import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../app.js";
import { validateSafeFilePath, pathTraversalGuardMiddleware } from "../../middleware/security.middleware.js";
import { authMiddleware, requireAuth, verifyOwnership } from "../../middleware/auth.middleware.js";
import { createRateLimiter } from "../../middleware/rate-limiter.middleware.js";
import { errorMiddleware } from "../../middleware/error.middleware.js";

describe("Module 12: Production Security & API Protection", () => {
  describe("Path Traversal Validation", () => {
    it("accepts valid POSIX relative code paths", () => {
      expect(validateSafeFilePath("src/index.ts")).toBe(true);
      expect(validateSafeFilePath("packages/shared/src/types.ts")).toBe(true);
      expect(validateSafeFilePath("README.md")).toBe(true);
      expect(validateSafeFilePath("deep/nested/directory/file.tsx")).toBe(true);
    });

    it("rejects path traversal sequences", () => {
      expect(validateSafeFilePath("../../etc/passwd")).toBe(false);
      expect(validateSafeFilePath("src/../../../root")).toBe(false);
      expect(validateSafeFilePath("./relative/path")).toBe(false);
      expect(validateSafeFilePath("..\\windows\\win.ini")).toBe(false);
    });

    it("rejects absolute paths and drive letters", () => {
      expect(validateSafeFilePath("/etc/shadow")).toBe(false);
      expect(validateSafeFilePath("\\Windows\\System32")).toBe(false);
      expect(validateSafeFilePath("C:\\boot.ini")).toBe(false);
      expect(validateSafeFilePath("D:/secrets.env")).toBe(false);
    });

    it("rejects null bytes and control characters", () => {
      expect(validateSafeFilePath("src/file.ts\0.exe")).toBe(false);
      expect(validateSafeFilePath("src/test\x1f.ts")).toBe(false);
    });
  });

  describe("Security Headers", () => {
    it("sets standard HTTP security protection headers on requests", async () => {
      const app = createApp();
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["x-xss-protection"]).toBe("1; mode=block");
      expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(res.headers["ratelimit-limit"]).toBeDefined();
    });
  });

  describe("Authentication & Authorization Middleware", () => {
    it("identifies user from x-user-id header", async () => {
      const app = express();
      app.use(authMiddleware);
      app.get("/test-auth", (req, res) => {
        res.json({ user: req.user });
      });

      const res = await request(app).get("/test-auth").set("x-user-id", "engineer-42");
      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: "engineer-42", role: "user" });
    });

    it("identifies user from Bearer authorization header", async () => {
      const app = express();
      app.use(authMiddleware);
      app.get("/test-auth", (req, res) => {
        res.json({ user: req.user });
      });

      const res = await request(app).get("/test-auth").set("Authorization", "Bearer user-token-99");
      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: "user-token-99", role: "user" });
    });

    it("falls back to anonymous-user when no identity is passed", async () => {
      const app = express();
      app.use(authMiddleware);
      app.get("/test-auth", (req, res) => {
        res.json({ user: req.user });
      });

      const res = await request(app).get("/test-auth");
      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: "anonymous-user", role: "anonymous" });
    });

    it("blocks anonymous caller when requireAuth is enforced", async () => {
      const app = express();
      app.use(authMiddleware);
      app.get("/protected", requireAuth, (_req, res) => res.json({ ok: true }));
      app.use(errorMiddleware);

      const res = await request(app).get("/protected");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("verifies resource ownership correctly", () => {
      expect(verifyOwnership("user-1", "user-1")).toBe(true);
      expect(verifyOwnership("user-1", "user-2")).toBe(false);
      expect(verifyOwnership("anonymous-user", "user-2")).toBe(true);
      expect(verifyOwnership(undefined, "user-2")).toBe(true);
    });
  });

  describe("API Rate Limiting", () => {
    it("throttles requests when limit is exceeded", async () => {
      const app = express();
      const limiter = createRateLimiter({
        windowMs: 5000,
        max: 3,
        message: "Rate limit reached"
      });

      app.use(limiter);
      app.get("/limited", (_req, res) => res.json({ count: 1 }));
      app.use(errorMiddleware);

      // Hit 1
      const res1 = await request(app).get("/limited");
      expect(res1.status).toBe(200);
      expect(res1.headers["ratelimit-remaining"]).toBe("2");

      // Hit 2
      const res2 = await request(app).get("/limited");
      expect(res2.status).toBe(200);

      // Hit 3
      const res3 = await request(app).get("/limited");
      expect(res3.status).toBe(200);
      expect(res3.headers["ratelimit-remaining"]).toBe("0");

      // Hit 4 - Should be blocked
      const res4 = await request(app).get("/limited");
      expect(res4.status).toBe(429);
      expect(res4.body.error.code).toBe("TOO_MANY_REQUESTS");
      expect(res4.headers["retry-after"]).toBeDefined();
    });
  });

  describe("Path Traversal Guard Middleware", () => {
    it("blocks malicious directory traversal query parameters with 400", async () => {
      const app = express();
      app.use(pathTraversalGuardMiddleware);
      app.get("/files", (_req, res) => res.json({ success: true }));
      app.use(errorMiddleware);

      const res = await request(app).get("/files?filePath=../../etc/passwd");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_PATH");
    });
  });
});
