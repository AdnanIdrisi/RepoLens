import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { ConversationModel } from "./models/conversation.model.js";
import { CodeFileModel } from "../repositories/models/code-file.model.js";

vi.mock("../repositories/models/repository.model.js");
vi.mock("./models/conversation.model.js");
vi.mock("../repositories/models/code-file.model.js");
vi.mock("../graph/models/graph-node.model.js");
vi.mock("../graph/models/graph-edge.model.js");
vi.mock("../retrieval/models/code-chunk.model.js");
vi.mock("../tracing/models/route-record.model.js");

describe("Agent API Routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/repositories/:id/agent/chat", () => {
    it("returns 404 if repository does not exist", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/repositories/nonexistent-id/agent/chat")
        .send({ message: "What does this repo do?" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("executes agent loop and returns assistant response with citations", async () => {
      vi.mocked(RepositoryModel.findById).mockResolvedValueOnce({
        _id: "repo-123",
        commitSha: "sha-123"
      } as never);

      const mockSavedConv = {
        _id: "conv-1",
        repositoryId: "repo-123",
        commitSha: "sha-123",
        title: "Repository Overview",
        messages: [],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(ConversationModel).mockImplementationOnce(() => mockSavedConv as never);
      vi.mocked(CodeFileModel.countDocuments).mockResolvedValue(10 as never);

      const res = await request(app)
        .post("/api/repositories/repo-123/agent/chat")
        .send({ message: "Give me an overview of this repository" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.role).toBe("assistant");
      expect(res.body.data.message.content).toContain("Repository Structure Summary");
    });
  });

  describe("GET /api/repositories/:id/agent/conversations", () => {
    it("returns conversation history list", async () => {
      vi.mocked(ConversationModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { _id: "conv-1", title: "Test Conversation" }
          ])
        })
      } as never);

      const res = await request(app).get("/api/repositories/repo-123/agent/conversations");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
