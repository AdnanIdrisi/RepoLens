import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { GraphNodeModel } from "../graph/models/graph-node.model.js";
import { GraphEdgeModel } from "../graph/models/graph-edge.model.js";

vi.mock("../repositories/models/repository.model.js");
vi.mock("../graph/models/graph-node.model.js");
vi.mock("../graph/models/graph-edge.model.js");

describe("Impact API Routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/repositories/:id/impact", () => {
    it("returns 404 if repository does not exist", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/repositories/nonexistent-id/impact")
        .send({ targetFilePath: "src/utils.ts" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns direct and indirect affected reports with reverse traversal", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce({
        _id: "repo-123",
        commitSha: "sha-123"
      } as never);

      vi.mocked(GraphNodeModel.find).mockResolvedValueOnce([
        {
          id: "src/utils.ts",
          repositoryId: "repo-123",
          commitSha: "sha-123",
          kind: "file",
          label: "utils.ts",
          filePath: "src/utils.ts"
        },
        {
          id: "src/service.ts",
          repositoryId: "repo-123",
          commitSha: "sha-123",
          kind: "file",
          label: "service.ts",
          filePath: "src/service.ts"
        }
      ] as never);

      vi.mocked(GraphEdgeModel.find).mockResolvedValueOnce([
        {
          id: "e1",
          repositoryId: "repo-123",
          commitSha: "sha-123",
          sourceId: "src/service.ts", // service imports utils
          targetId: "src/utils.ts",
          kind: "imports",
          confidence: 1.0
        }
      ] as never);

      const res = await request(app)
        .post("/api/repositories/repo-123/impact")
        .send({ targetFilePath: "src/utils.ts", maxDepth: 2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.target.filePath).toBe("src/utils.ts");
      expect(res.body.data.directAffected).toHaveLength(1);
      expect(res.body.data.directAffected[0].id).toBe("src/service.ts");
    });
  });
});
