import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import { createGraphRouter } from "./graph.routes.js";
import { GraphController } from "./graph.controller.js";
import { GraphService } from "./graph.service.js";
import { errorMiddleware } from "../../middleware/error.middleware.js";

describe("Graph API Endpoints", () => {
  const mockNodes = [
    { id: "src/app.ts", kind: "file", label: "app.ts", filePath: "src/app.ts" },
    { id: "src/auth.ts", kind: "file", label: "auth.ts", filePath: "src/auth.ts" }
  ];

  const mockEdges = [
    { id: "e1", sourceId: "src/app.ts", targetId: "src/auth.ts", kind: "imports", confidence: 1.0 }
  ];

  const mockService = {
    getGraph: vi.fn().mockResolvedValue({
      nodes: mockNodes,
      edges: mockEdges,
      rootId: "src/app.ts"
    }),
    searchSymbols: vi.fn().mockResolvedValue([
      { id: "sym-1", label: "loginUser", kind: "function", filePath: "src/auth.ts" }
    ]),
    getSymbol: vi.fn().mockResolvedValue({
      id: "sym-1",
      label: "loginUser",
      kind: "function",
      filePath: "src/auth.ts",
      startLine: 10,
      endLine: 25
    }),
    indexRepositoryGraph: vi.fn().mockResolvedValue({
      nodesCount: 15,
      edgesCount: 18
    })
  } as unknown as GraphService;

  const controller = new GraphController(mockService);
  const app = express();
  app.use(express.json());
  app.use("/api", createGraphRouter(controller));
  app.use(errorMiddleware);

  it("GET /api/repositories/:id/graph returns graph nodes and edges", async () => {
    const res = await request(app).get("/api/repositories/repo-123/graph?depth=2&limit=50");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nodes.length).toBe(2);
    expect(res.body.data.edges.length).toBe(1);
    expect(res.body.data.rootId).toBe("src/app.ts");
  });

  it("GET /api/repositories/:id/symbols searches symbols by query", async () => {
    const res = await request(app).get("/api/repositories/repo-123/symbols?query=login&limit=10");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].label).toBe("loginUser");
  });

  it("GET /api/repositories/:id/symbols/:symbolId returns symbol detail", async () => {
    const res = await request(app).get("/api/repositories/repo-123/symbols/sym-1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("sym-1");
  });

  it("POST /api/repositories/:id/index triggers graph reindexing", async () => {
    const res = await request(app).post("/api/repositories/repo-123/index");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nodesCount).toBe(15);
  });
});
