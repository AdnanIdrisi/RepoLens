import { buildGraph, ImpactAnalyzer } from "@repolens/graph-engine";
import { GraphNodeModel } from "../graph/models/graph-node.model.js";
import { GraphEdgeModel } from "../graph/models/graph-edge.model.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { ApiError } from "../../middleware/error.middleware.js";
import type { ImpactRequest, ImpactReport } from "@repolens/shared";

export class ImpactService {
  private impactAnalyzer = new ImpactAnalyzer();

  /**
   * Statically computes the reverse dependency impact of changing a file or symbol.
   */
  public async analyzeImpact(
    repositoryId: string,
    params: ImpactRequest
  ): Promise<ImpactReport> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repo.commitSha;
    if (!commitSha) {
      throw new ApiError(400, "BAD_REQUEST", "Repository has not completed commit resolution");
    }

    // Load graph nodes and edges
    const nodes = await GraphNodeModel.find({ repositoryId, commitSha });
    const edges = await GraphEdgeModel.find({ repositoryId, commitSha });

    const graph = buildGraph(
      nodes.map((n) => ({
        id: n.id,
        repositoryId: n.repositoryId,
        commitSha: n.commitSha,
        kind: n.kind,
        label: n.label,
        filePath: n.filePath,
        startLine: n.startLine,
        endLine: n.endLine
      })),
      edges.map((e) => ({
        id: e.id,
        repositoryId: e.repositoryId,
        commitSha: e.commitSha,
        sourceId: e.sourceId,
        targetId: e.targetId,
        kind: e.kind,
        confidence: e.confidence,
        evidence: e.evidence
      }))
    );

    return this.impactAnalyzer.analyze(graph, {
      targetFilePath: params.targetFilePath,
      symbolId: params.symbolId,
      maxDepth: params.maxDepth || 3
    });
  }
}
