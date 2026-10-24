import type { CodeGraph } from "./graph.types.js";
import type { ImpactReport, AffectedEntity } from "@repolens/shared";

export interface ImpactOptions {
  targetFilePath: string;
  symbolId?: string;
  maxDepth?: number;
}

export class ImpactAnalyzer {
  /**
   * Analyzes the blast radius / impact of modifying a file or symbol
   * by traversing reverse dependencies (incoming imports, calls, references).
   */
  public analyze(graph: CodeGraph, options: ImpactOptions): ImpactReport {
    const targetId = options.symbolId || options.targetFilePath;
    const maxDepth = options.maxDepth ?? 3;

    const directAffected: AffectedEntity[] = [];
    const indirectAffected: AffectedEntity[] = [];
    const visited = new Set<string>([targetId]);

    // Queue: [nodeId, distance, pathSoFar]
    const queue: Array<{ id: string; distance: number; path: string[] }> = [
      { id: targetId, distance: 0, path: [targetId] }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.distance >= maxDepth) continue;

      // Reverse dependency: who depends on `current.id`?
      // An 'imports' edge is A -> B (A imports B).
      // So incoming edges to B are sources that depend on B!
      const incoming = graph.incoming.get(current.id) || [];

      for (const edge of incoming) {
        const dependentId = edge.sourceId;
        if (visited.has(dependentId)) continue;
        visited.add(dependentId);

        const dependentNode = graph.nodes.get(dependentId);
        const distance = current.distance + 1;
        const newPath = [...current.path, dependentId];

        const entity: AffectedEntity = {
          id: dependentId,
          label: dependentNode?.label || dependentId.split("#").pop()?.split(":").pop() || dependentId,
          filePath: dependentNode?.filePath || dependentId,
          kind: dependentNode?.kind || "file",
          distance,
          dependencyPath: newPath,
          relationship: edge.kind
        };

        if (distance === 1) {
          directAffected.push(entity);
        } else {
          indirectAffected.push(entity);
        }

        queue.push({
          id: dependentId,
          distance,
          path: newPath
        });
      }
    }

    // Identify affected file paths
    const affectedFilesSet = new Set<string>();
    affectedFilesSet.add(options.targetFilePath);
    for (const a of [...directAffected, ...indirectAffected]) {
      affectedFilesSet.add(a.filePath);
    }

    // Suggest tests to review based on test file patterns or direct test dependencies
    const suggestedTests: Array<{ testFilePath: string; reason: string }> = [];
    for (const node of graph.nodes.values()) {
      const p = node.filePath.toLowerCase();
      const isTestFile =
        p.includes(".test.") ||
        p.includes(".spec.") ||
        p.includes("/__tests__/") ||
        p.includes("/tests/");

      if (isTestFile) {
        // If the test file itself is in the affected set
        if (affectedFilesSet.has(node.filePath)) {
          suggestedTests.push({
            testFilePath: node.filePath,
            reason: `Directly imports or tests affected module (${node.label})`
          });
        }
      }
    }

    // Also check standard test naming conventions: e.g. path.test.ts
    const targetTestGuess = options.targetFilePath.replace(/\.(ts|js|tsx|jsx)$/, ".test.$1");
    if (graph.nodes.has(targetTestGuess) && !suggestedTests.some((t) => t.testFilePath === targetTestGuess)) {
      suggestedTests.push({
        testFilePath: targetTestGuess,
        reason: "Direct companion unit test file"
      });
    }

    return {
      target: {
        filePath: options.targetFilePath,
        symbolId: options.symbolId
      },
      directAffected,
      indirectAffected,
      totalAffectedFiles: affectedFilesSet.size,
      totalAffectedSymbols: directAffected.length + indirectAffected.length,
      suggestedTests
    };
  }
}
