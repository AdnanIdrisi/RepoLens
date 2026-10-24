import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import { createFilesRouter } from "./files.routes.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";
import { errorMiddleware } from "../../middleware/error.middleware.js";

describe("File Viewer API Endpoints", () => {
  const mockFileResult = {
    repositoryId: "repo-123",
    commitSha: "c0ffee123456",
    path: "src/server.ts",
    content: "import express from 'express';\nconst app = express();",
    contentHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    sizeBytes: 54,
    totalLines: 2,
    startLine: 1,
    endLine: 2
  };

  const mockService = {
    getFileContent: vi.fn().mockImplementation((_repoId, path, options) => {
      if (path === "src/server.ts") {
        return Promise.resolve({
          ...mockFileResult,
          startLine: options?.startLine || 1,
          endLine: options?.endLine || 2
        });
      }
      return Promise.reject(new Error("File not found"));
    })
  } as unknown as FilesService;

  const controller = new FilesController(mockService);
  const app = express();
  app.use(express.json());
  app.use("/api", createFilesRouter(controller));
  app.use(errorMiddleware);

  it("GET /api/repositories/:id/file/* retrieves file source content and metadata", async () => {
    const res = await request(app).get("/api/repositories/repo-123/file/src/server.ts");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.path).toBe("src/server.ts");
    expect(res.body.data.content).toContain("import express");
    expect(res.body.data.contentHash).toBe(mockFileResult.contentHash);
  });

  it("GET /api/repositories/:id/file/* passes bounded line range query params", async () => {
    const res = await request(app).get(
      "/api/repositories/repo-123/file/src/server.ts?startLine=1&endLine=1"
    );
    expect(res.status).toBe(200);
    expect(mockService.getFileContent).toHaveBeenCalledWith("repo-123", "src/server.ts", {
      startLine: 1,
      endLine: 1
    });
  });
});
