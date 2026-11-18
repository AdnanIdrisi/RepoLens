import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { CodeChunkModel } from "./models/code-chunk.model.js";
import { CodeEntityModel } from "./models/code-entity.model.js";
import { GraphEdgeModel } from "../graph/models/graph-edge.model.js";

vi.mock("../repositories/models/repository.model.js");
vi.mock("./models/code-chunk.model.js");
vi.mock("./models/code-entity.model.js");
vi.mock("../graph/models/graph-edge.model.js");
vi.mock("../repositories/models/code-file.model.js");

describe("Retrieval API Routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST & GET /api/repositories/:id/search", () => {
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

    it("successfully returns ranked search results via POST", async () => {
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
        endLine: 10
      };

      vi.mocked(CodeChunkModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockChunk])
      } as never);

      vi.mocked(CodeEntityModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as never);

      vi.mocked(GraphEdgeModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
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

    it("successfully returns ranked search results via GET", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce({
        _id: "repo-123",
        commitSha: "sha-123"
      } as never);

      const mockEntity = {
        repositoryId: "repo-123",
        commitSha: "sha-123",
        entityId: "ent-1",
        filePath: "src/routes/auth.ts",
        entityType: "route",
        entityName: "POST /login",
        startLine: 5,
        endLine: 12,
        imports: [],
        calls: ["loginHandler"],
        code: "router.post('/login', loginHandler);",
        contentHash: "h1"
      };

      vi.mocked(CodeChunkModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as never);

      vi.mocked(CodeEntityModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockEntity])
      } as never);

      vi.mocked(GraphEdgeModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as never);

      const res = await request(app)
        .get("/api/repositories/repo-123/search?query=POST%20/login&matchType=hybrid");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results.length).toBeGreaterThan(0);
      expect(res.body.data.results[0].symbolName).toBe("POST /login");
    });
  });

  describe("GET /api/repositories/:id/search/stats", () => {
    it("returns stats on indexed chunks and entities", async () => {
      vi.mocked(CodeChunkModel.countDocuments).mockResolvedValueOnce(42 as never);
      vi.mocked(CodeEntityModel.countDocuments).mockResolvedValueOnce(18 as never);

      const res = await request(app).get("/api/repositories/repo-123/search/stats");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalChunks).toBe(42);
      expect(res.body.data.totalEntities).toBe(18);
      expect(res.body.data.isSearchReady).toBe(true);
    });
  });
});
