import { describe, it, expect } from "vitest";
import { buildGraph } from "./graph-builder.js";
import { FlowTracer } from "./flow-tracer.js";
import type { GraphNode, GraphEdge, RouteRecord } from "@repolens/shared";

describe("FlowTracer", () => {
  const tracer = new FlowTracer();

  it("statically traces an Express route through middleware, handler, service, and database", () => {
    const nodes: GraphNode[] = [
      {
        id: "src/auth/auth.middleware.ts#authMiddleware",
        repositoryId: "repo-1",
        commitSha: "sha-1",
        kind: "function",
        label: "authenticateToken",
        filePath: "src/middleware/auth.middleware.ts",
        startLine: 10,
        endLine: 25
      },
      {
        id: "src/users/user.controller.ts#loginUser",
        repositoryId: "repo-1",
        commitSha: "sha-1",
        kind: "function",
        label: "loginUserController",
        filePath: "src/controllers/user.controller.ts",
        startLine: 15,
        endLine: 40
      },
      {
        id: "src/users/user.service.ts#verifyCredentials",
        repositoryId: "repo-1",
        commitSha: "sha-1",
        kind: "function",
        label: "verifyCredentials",
        filePath: "src/services/user.service.ts",
        startLine: 50,
        endLine: 80
      },
      {
        id: "src/models/user.model.ts#findByEmail",
        repositoryId: "repo-1",
        commitSha: "sha-1",
        kind: "method",
        label: "findByEmail",
        filePath: "src/models/user.model.ts",
        startLine: 10,
        endLine: 20
      }
    ];

    const edges: GraphEdge[] = [
      {
        id: "edge-1",
        repositoryId: "repo-1",
        commitSha: "sha-1",
        sourceId: "src/users/user.controller.ts#loginUser",
        targetId: "src/users/user.service.ts#verifyCredentials",
        kind: "calls",
        confidence: 1.0
      },
      {
        id: "edge-2",
        repositoryId: "repo-1",
        commitSha: "sha-1",
        sourceId: "src/users/user.service.ts#verifyCredentials",
        targetId: "src/models/user.model.ts#findByEmail",
        kind: "calls",
        confidence: 1.0
      }
    ];

    const graph = buildGraph(nodes, edges);

    const route: RouteRecord = {
      repositoryId: "repo-1",
      commitSha: "sha-1",
      method: "post",
      path: "/api/users/login",
      filePath: "src/routes/user.routes.ts",
      startLine: 12,
      middlewareSymbolIds: ["src/auth/auth.middleware.ts#authMiddleware"],
      handlerSymbolIds: ["src/users/user.controller.ts#loginUser"],
      confidence: 1.0
    };

    const result = tracer.trace(graph, { route });

    expect(result.steps.length).toBe(5);
    expect(result.steps[0].category).toBe("route");
    expect(result.steps[0].label).toBe("POST /api/users/login");

    expect(result.steps[1].category).toBe("middleware");
    expect(result.steps[1].label).toBe("authenticateToken");

    expect(result.steps[2].category).toBe("controller");
    expect(result.steps[2].label).toBe("loginUserController");

    expect(result.steps[3].category).toBe("service");
    expect(result.steps[3].label).toBe("verifyCredentials");

    expect(result.steps[4].category).toBe("model");
    expect(result.steps[4].label).toBe("findByEmail");
  });

  it("handles cyclical calls and terminates cleanly", () => {
    const nodes: GraphNode[] = [
      {
        id: "symA",
        repositoryId: "r",
        commitSha: "c",
        kind: "function",
        label: "functionA",
        filePath: "src/a.ts",
        startLine: 1,
        endLine: 10
      },
      {
        id: "symB",
        repositoryId: "r",
        commitSha: "c",
        kind: "function",
        label: "functionB",
        filePath: "src/b.ts",
        startLine: 1,
        endLine: 10
      }
    ];

    const edges: GraphEdge[] = [
      {
        id: "e1",
        repositoryId: "r",
        commitSha: "c",
        sourceId: "symA",
        targetId: "symB",
        kind: "calls",
        confidence: 1.0
      },
      {
        id: "e2",
        repositoryId: "r",
        commitSha: "c",
        sourceId: "symB",
        targetId: "symA", // Cycle!
        kind: "calls",
        confidence: 1.0
      }
    ];

    const graph = buildGraph(nodes, edges);
    const result = tracer.trace(graph, { symbolId: "symA", maxDepth: 5 });

    expect(result.steps.length).toBe(2);
    expect(result.steps.map((s) => s.label)).toEqual(["functionA", "functionB"]);
  });
});
