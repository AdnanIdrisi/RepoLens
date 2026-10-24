import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import { createRepositoryRouter } from "./repository.routes.js";
import { RepositoryController } from "./repository.controller.js";
import { RepositoryService } from "./repository.service.js";
import { errorMiddleware } from "../../middleware/error.middleware.js";

describe("Repository API Endpoints", () => {
  const mockRepo = {
    _id: "repo-999",
    ownerId: "anonymous",
    provider: "github",
    owner: "expressjs",
    name: "express",
    remoteUrl: "https://github.com/expressjs/express",
    defaultBranch: "master",
    selectedRef: "master",
    status: "discovered",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockJob = {
    _id: "job-111",
    repositoryId: "repo-999",
    commitSha: "a1b2c3d4e5f6",
    status: "completed",
    stage: "discovered",
    filesDiscovered: 42,
    filesProcessed: 38,
    retryCount: 0,
    createdAt: new Date().toISOString()
  };

  const mockService = {
    registerRepository: vi.fn().mockResolvedValue({
      repository: mockRepo,
      job: mockJob
    }),
    listRepositories: vi.fn().mockResolvedValue([mockRepo]),
    getRepository: vi.fn().mockResolvedValue(mockRepo),
    getJob: vi.fn().mockResolvedValue(mockJob),
    cancelJob: vi.fn().mockResolvedValue({ ...mockJob, status: "cancelled" }),
    getFiles: vi.fn().mockResolvedValue({
      files: [
        {
          _id: "file-1",
          repositoryId: "repo-999",
          path: "lib/express.js",
          language: "javascript",
          sizeBytes: 2500,
          status: "discovered"
        }
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
    })
  } as unknown as RepositoryService;

  const controller = new RepositoryController(mockService);
  const app = express();
  app.use(express.json());
  app.use("/api", createRepositoryRouter(controller));
  app.use(errorMiddleware);

  it("POST /api/repositories validates and accepts a public GitHub URL", async () => {
    const res = await request(app)
      .post("/api/repositories")
      .send({ url: "https://github.com/expressjs/express", ref: "master" });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.repository.name).toBe("express");
    expect(res.body.data.jobId).toBe("job-111");
  });

  it("POST /api/repositories rejects invalid URLs with 400 validation error", async () => {
    const res = await request(app)
      .post("/api/repositories")
      .send({ url: "not-a-valid-url" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/repositories returns repository list", async () => {
    const res = await request(app).get("/api/repositories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].name).toBe("express");
  });

  it("GET /api/repositories/:id returns repository details", async () => {
    const res = await request(app).get("/api/repositories/repo-999");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe("repo-999");
  });

  it("GET /api/jobs/:jobId returns job details and counts", async () => {
    const res = await request(app).get("/api/jobs/job-111");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.filesDiscovered).toBe(42);
    expect(res.body.data.filesProcessed).toBe(38);
  });

  it("GET /api/repositories/:id/files returns paginated files", async () => {
    const res = await request(app).get("/api/repositories/repo-999/files?page=1&limit=50");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.files.length).toBe(1);
    expect(res.body.data.pagination.total).toBe(1);
  });
});
