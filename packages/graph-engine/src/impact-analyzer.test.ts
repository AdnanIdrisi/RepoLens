import { describe, it, expect } from "vitest";
import { buildGraph } from "./graph-builder.js";
import { ImpactAnalyzer } from "./impact-analyzer.js";
import type { GraphNode, GraphEdge } from "@repolens/shared";

describe("ImpactAnalyzer", () => {
  const analyzer = new ImpactAnalyzer();

  it("traverses reverse dependencies into direct and indirect affected layers", () => {
    // Dependency structure:
    // UserRoutes -> UserService -> UserModel
    // UserTests -> UserService
    const nodes: GraphNode[] = [
      {
        id: "src/models/user.model.ts",
        repositoryId: "r1",
        commitSha: "c1",
        kind: "file",
        label: "user.model.ts",
        filePath: "src/models/user.model.ts"
      },
      {
        id: "src/services/user.service.ts",
        repositoryId: "r1",
        commitSha: "c1",
        kind: "file",
        label: "user.service.ts",
        filePath: "src/services/user.service.ts"
      },
      {
        id: "src/routes/user.routes.ts",
        repositoryId: "r1",
        commitSha: "c1",
        kind: "file",
        label: "user.routes.ts",
        filePath: "src/routes/user.routes.ts"
      },
      {
        id: "src/services/user.service.test.ts",
        repositoryId: "r1",
        commitSha: "c1",
        kind: "file",
        label: "user.service.test.ts",
        filePath: "src/services/user.service.test.ts"
      }
    ];

    const edges: GraphEdge[] = [
      {
        id: "e1",
        repositoryId: "r1",
        commitSha: "c1",
        sourceId: "src/services/user.service.ts", // UserService imports UserModel
        targetId: "src/models/user.model.ts",
        kind: "imports",
        confidence: 1.0
      },
      {
        id: "e2",
        repositoryId: "r1",
        commitSha: "c1",
        sourceId: "src/routes/user.routes.ts", // UserRoutes imports UserService
        targetId: "src/services/user.service.ts",
        kind: "imports",
        confidence: 1.0
      },
      {
        id: "e3",
        repositoryId: "r1",
        commitSha: "c1",
        sourceId: "src/services/user.service.test.ts", // Test imports UserService
        targetId: "src/services/user.service.ts",
        kind: "imports",
        confidence: 1.0
      }
    ];

    const graph = buildGraph(nodes, edges);

    // If UserModel changes:
    const report = analyzer.analyze(graph, {
      targetFilePath: "src/models/user.model.ts",
      maxDepth: 3
    });

    // Direct affected (distance 1): UserService
    expect(report.directAffected).toHaveLength(1);
    expect(report.directAffected[0].id).toBe("src/services/user.service.ts");
    expect(report.directAffected[0].distance).toBe(1);

    // Indirect affected (distance 2): UserRoutes and UserServiceTest
    expect(report.indirectAffected).toHaveLength(2);
    expect(report.indirectAffected.some((a) => a.id === "src/routes/user.routes.ts")).toBe(true);
    expect(report.indirectAffected.some((a) => a.id === "src/services/user.service.test.ts")).toBe(true);

    // Suggested tests
    expect(report.suggestedTests.length).toBeGreaterThanOrEqual(1);
    expect(report.suggestedTests[0].testFilePath).toContain("user.service.test.ts");
  });

  it("handles cyclical imports gracefully without infinite loops", () => {
    const nodes: GraphNode[] = [
      { id: "A", repositoryId: "r", commitSha: "c", kind: "file", label: "A", filePath: "A" },
      { id: "B", repositoryId: "r", commitSha: "c", kind: "file", label: "B", filePath: "B" }
    ];
    const edges: GraphEdge[] = [
      { id: "e1", repositoryId: "r", commitSha: "c", sourceId: "A", targetId: "B", kind: "imports", confidence: 1.0 },
      { id: "e2", repositoryId: "r", commitSha: "c", sourceId: "B", targetId: "A", kind: "imports", confidence: 1.0 }
    ];

    const graph = buildGraph(nodes, edges);
    const report = analyzer.analyze(graph, { targetFilePath: "B" });

    expect(report.directAffected).toHaveLength(1);
    expect(report.directAffected[0].id).toBe("A");
  });
});
