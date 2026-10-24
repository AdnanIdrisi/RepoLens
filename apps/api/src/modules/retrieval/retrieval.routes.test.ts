import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { CodeChunkModel } from "./models/code-chunk.model.js";

vi.mock("../repositories/models/repository.model.js");
vi.mock("./models/code-chunk.model.js");
vi.mock("../repositories/models/code-file.model.js");

describe("Retrieval API Routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/repositories/:id/search", () => {
    it("returns 404 if repository does not exist", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/repositories/nonexistent-id/search")
        .send({ query: "authenticateUser" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 if validation fails on empty query", async () => {
      const res = await request(app)
        .post("/api/repositories/repo-123/search")
        .send({ query: "" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("successfully returns ranked search results", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce({
        _id: "repo-123",
        commitSha: "sha-123"
      } as never);

      const mockChunk = {
        chunkId: "src/auth.ts#L1-L10",
        filePath: "src/auth.ts",
        symbolName: "authenticateUser",
        symbolKind: "function",
        text: "export function authenticateUser() { return true; }",
        startLine: 1,
        endLine: 10,
        embedding: [0.1, 0.2, 0.3]
      };

      vi.mocked(CodeChunkModel.find).mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockChunk])
      } as never);

      const res = await request(app)
        .post("/api/repositories/repo-123/search")
        .send({
          query: "authenticateUser",
          matchType: "hybrid",
          limit: 10
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.query).toBe("authenticateUser");
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].symbolName).toBe("authenticateUser");
    });
  });

  describe("GET /api/repositories/:id/search/stats", () => {
    it("returns stats on indexed chunks and embeddings", async () => {
      vi.mocked(CodeChunkModel.countDocuments)
        .mockResolvedValueOnce(42 as never)
        .mockResolvedValueOnce(42 as never);

      const res = await request(app).get("/api/repositories/repo-123/search/stats");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalChunks).toBe(42);
      expect(res.body.data.embeddedChunks).toBe(42);
      expect(res.body.data.isSearchReady).toBe(true);
    });
  });
});
