import { describe, it, expect } from "vitest";
import { buildGraph } from "./graph-builder.js";
import { bfs, dfs, findShortestPath, getSubgraph } from "./traversal.js";
import type { GraphNode, GraphEdge } from "@repolens/shared";

describe("Shared Graph Engine & Traversals", () => {
  const nodes: GraphNode[] = [
    { id: "app.ts", repositoryId: "r1", commitSha: "c1", kind: "file", label: "app.ts", filePath: "src/app.ts" },
    { id: "auth.ts", repositoryId: "r1", commitSha: "c1", kind: "file", label: "auth.ts", filePath: "src/auth.ts" },
    { id: "user.ts", repositoryId: "r1", commitSha: "c1", kind: "file", label: "user.ts", filePath: "src/user.ts" },
    { id: "db.ts", repositoryId: "r1", commitSha: "c1", kind: "file", label: "db.ts", filePath: "src/db.ts" },
    { id: "isolated.ts", repositoryId: "r1", commitSha: "c1", kind: "file", label: "isolated.ts", filePath: "src/isolated.ts" }
  ];

  const edges: GraphEdge[] = [
    { id: "e1", repositoryId: "r1", commitSha: "c1", sourceId: "app.ts", targetId: "auth.ts", kind: "imports", confidence: 1.0 },
    { id: "e2", repositoryId: "r1", commitSha: "c1", sourceId: "auth.ts", targetId: "user.ts", kind: "imports", confidence: 1.0 },
    { id: "e3", repositoryId: "r1", commitSha: "c1", sourceId: "user.ts", targetId: "db.ts", kind: "calls", confidence: 0.9 },
    // Cycle: db -> app.ts
    { id: "e4", repositoryId: "r1", commitSha: "c1", sourceId: "db.ts", targetId: "app.ts", kind: "references", confidence: 0.8 },
    // Self-reference: app -> app
    { id: "e5", repositoryId: "r1", commitSha: "c1", sourceId: "app.ts", targetId: "app.ts", kind: "calls", confidence: 1.0 }
  ];

  const graph = buildGraph(nodes, edges);

  it("builds graph with bidirectional adjacency and filters missing nodes", () => {
    expect(graph.nodes.size).toBe(5);
    expect(graph.outgoing.get("app.ts")?.length).toBe(2); // e1, e5
    expect(graph.incoming.get("auth.ts")?.length).toBe(1); // e1
  });

  it("runs BFS forward with cycle protection", () => {
    const steps = bfs(graph, "app.ts", { direction: "forward" });
    // Should visit auth.ts, user.ts, db.ts once without infinite loop
    const visitedIds = steps.map((s) => s.node.id);
    expect(visitedIds).toContain("auth.ts");
    expect(visitedIds).toContain("user.ts");
    expect(visitedIds).toContain("db.ts");
    expect(visitedIds.filter((id) => id === "auth.ts").length).toBe(1);
  });

  it("runs BFS in reverse (reverse dependency traversal for impact analysis)", () => {
    // If user.ts changes, who depends on it? auth.ts and app.ts
    const steps = bfs(graph, "user.ts", { direction: "reverse" });
    const affectedIds = steps.map((s) => s.node.id);
    expect(affectedIds).toContain("auth.ts");
    expect(affectedIds).toContain("app.ts");
  });

  it("filters traversal by edge kind", () => {
    // Only follow 'calls' edges from app.ts -> should only reach self (filtered) and not auth.ts (which is 'imports')
    const steps = bfs(graph, "app.ts", { edgeKinds: ["imports"] });
    const visitedIds = steps.map((s) => s.node.id);
    expect(visitedIds).toContain("auth.ts");
    expect(visitedIds).toContain("user.ts");
    // e3 is 'calls', so traversal should stop before db.ts
    expect(visitedIds).not.toContain("db.ts");
  });

  it("runs DFS forward with cycle protection", () => {
    const steps = dfs(graph, "app.ts", { direction: "forward" });
    const visitedIds = steps.map((s) => s.node.id);
    expect(visitedIds).toContain("auth.ts");
    expect(visitedIds).toContain("user.ts");
    expect(visitedIds).toContain("db.ts");
  });

  it("enforces maxDepth bounding", () => {
    // Depth 1 from app.ts should only reach auth.ts
    const steps = bfs(graph, "app.ts", { maxDepth: 1, direction: "forward" });
    const visitedIds = steps.map((s) => s.node.id);
    expect(visitedIds).toContain("auth.ts");
    expect(visitedIds).not.toContain("user.ts");
  });

  it("finds shortest path between source and target", () => {
    const result = findShortestPath(graph, "app.ts", "db.ts");
    expect(result.found).toBe(true);
    expect(result.distance).toBe(3);
    expect(result.nodes.map((n) => n.id)).toEqual(["app.ts", "auth.ts", "user.ts", "db.ts"]);
    expect(result.edges.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("reports shortest path not found for disconnected components", () => {
    const result = findShortestPath(graph, "isolated.ts", "app.ts");
    expect(result.found).toBe(false);
    expect(result.distance).toBe(-1);
  });

  it("extracts neighborhood subgraph centered around a root node", () => {
    const subgraph = getSubgraph(graph, "auth.ts", 1);
    expect(subgraph.rootId).toBe("auth.ts");
    // Forward depth 1: user.ts. Reverse depth 1: app.ts. Root: auth.ts
    const ids = subgraph.nodes.map((n) => n.id);
    expect(ids).toContain("auth.ts");
    expect(ids).toContain("app.ts");
    expect(ids).toContain("user.ts");
    expect(ids).not.toContain("isolated.ts");
  });
});
