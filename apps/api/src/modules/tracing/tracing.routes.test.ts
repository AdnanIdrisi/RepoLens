import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { RouteRecordModel } from "./models/route-record.model.js";
import { GraphNodeModel } from "../graph/models/graph-node.model.js";
import { GraphEdgeModel } from "../graph/models/graph-edge.model.js";

vi.mock("../repositories/models/repository.model.js");
vi.mock("./models/route-record.model.js");
vi.mock("../graph/models/graph-node.model.js");
vi.mock("../graph/models/graph-edge.model.js");
vi.mock("../repositories/models/code-file.model.js");

describe("Tracing API Routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/repositories/:id/routes", () => {
    it("returns 404 if repository does not exist", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce(null);

      const res = await request(app).get("/api/repositories/nonexistent-id/routes");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns discovered routes list", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce({
        _id: "repo-123",
        commitSha: "sha-123"
      } as never);

      const mockRoute = {
        method: "post",
        path: "/api/login",
        filePath: "src/routes/auth.routes.ts",
        startLine: 10,
        handlerSymbolIds: ["loginHandler"],
        middlewareSymbolIds: []
      };

      vi.mocked(RouteRecordModel.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockRoute])
      } as never);

      const res = await request(app).get("/api/repositories/repo-123/routes");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].path).toBe("/api/login");
    });
  });

  describe("POST /api/repositories/:id/trace", () => {
    it("statically traces route execution steps", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce({
        _id: "repo-123",
        commitSha: "sha-123"
      } as never);

      vi.mocked(RouteRecordModel.findOne).mockResolvedValueOnce({
        _id: "route-1",
        method: "post",
        path: "/api/login",
        filePath: "src/auth.ts",
        startLine: 10,
        handlerSymbolIds: ["handlerSym"],
        middlewareSymbolIds: [],
        confidence: 1.0
      } as never);

      vi.mocked(GraphNodeModel.find).mockResolvedValueOnce([
        {
          id: "handlerSym",
          repositoryId: "repo-123",
          commitSha: "sha-123",
          kind: "function",
          label: "loginController",
          filePath: "src/controllers/auth.controller.ts",
          startLine: 12,
          endLine: 30
        }
      ] as never);

      vi.mocked(GraphEdgeModel.find).mockResolvedValueOnce([] as never);

      const res = await request(app)
        .post("/api/repositories/repo-123/trace")
        .send({ method: "post", path: "/api/login", maxDepth: 4 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.steps).toHaveLength(2);
      expect(res.body.data.steps[0].category).toBe("route");
      expect(res.body.data.steps[1].category).toBe("controller");
    });
  });
});
