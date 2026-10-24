import { CodeAnalyzer } from "@repolens/code-analyzer";
import { buildGraph, FlowTracer } from "@repolens/graph-engine";
import { RouteRecordModel, RouteRecordDocument } from "./models/route-record.model.js";
import { GraphNodeModel } from "../graph/models/graph-node.model.js";
import { GraphEdgeModel } from "../graph/models/graph-edge.model.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { CodeFileModel } from "../repositories/models/code-file.model.js";
import { MongoSourceStore } from "../files/mongo-source-store.js";
import { ApiError } from "../../middleware/error.middleware.js";
import type { RouteRecord, TraceRequest, TraceResponse } from "@repolens/shared";

export class TracingService {
  private analyzer = new CodeAnalyzer();
  private tracer = new FlowTracer();
  private sourceStore: MongoSourceStore;

  constructor(sourceStore?: MongoSourceStore) {
    this.sourceStore = sourceStore || new MongoSourceStore();
  }

  /**
   * Scans eligible files for Express routes and builds route records.
   */
  public async discoverAndIndexRoutes(repositoryId: string): Promise<{ routesCount: number }> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repo.commitSha;
    if (!commitSha) {
      throw new ApiError(400, "BAD_REQUEST", "Repository has not completed commit resolution");
    }

    const eligibleFiles = await CodeFileModel.find({
      repositoryId,
      commitSha,
      status: { $in: ["discovered", "fetched"] }
    });

    if (eligibleFiles.length === 0) {
      return { routesCount: 0 };
    }

    const routeRecords: RouteRecord[] = [];

    for (const fileDoc of eligibleFiles) {
      const content = await this.sourceStore.getFile(repositoryId, commitSha, fileDoc.path);
      if (content === null) continue;

      const analysis = this.analyzer.analyzeFile(fileDoc.path, content, repositoryId, commitSha);

      for (const route of analysis.routes) {
        // Find matching symbol IDs in the same file or by handler name
        const handlerSymbolIds: string[] = [];
        const middlewareSymbolIds: string[] = [];

        for (const h of route.handlers) {
          const sym = analysis.symbols.find((s) => s.name === h);
          if (sym) {
            handlerSymbolIds.push(sym.symbolId);
          } else {
            handlerSymbolIds.push(`${fileDoc.path}#${h}`);
          }
        }

        for (const m of route.middlewares) {
          const sym = analysis.symbols.find((s) => s.name === m);
          if (sym) {
            middlewareSymbolIds.push(sym.symbolId);
          } else {
            middlewareSymbolIds.push(`${fileDoc.path}#${m}`);
          }
        }

        routeRecords.push({
          repositoryId,
          commitSha,
          method: route.httpMethod.toLowerCase(),
          path: route.routePath,
          filePath: fileDoc.path,
          startLine: route.startLine,
          handlerSymbolIds,
          middlewareSymbolIds,
          confidence: 1.0
        });
      }
    }

    if (routeRecords.length > 0) {
      const ops = routeRecords.map((r) => ({
        updateOne: {
          filter: {
            repositoryId,
            commitSha,
            method: r.method,
            path: r.path
          },
          update: { $set: r },
          upsert: true
        }
      }));
      await RouteRecordModel.bulkWrite(ops as never);
    }

    console.log(
      `[TracingService] Discovered and indexed ${routeRecords.length} routes for repo ${repositoryId}.`
    );
    return { routesCount: routeRecords.length };
  }

  /**
   * Lists all discovered routes for a repository revision.
   */
  public async listRoutes(repositoryId: string): Promise<RouteRecordDocument[]> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repo.commitSha;
    if (!commitSha) {
      return [];
    }

    return RouteRecordModel.find({ repositoryId, commitSha }).sort({ path: 1, method: 1 });
  }

  /**
   * Executes static execution flow tracing for a given route or symbol.
   */
  public async traceFlow(
    repositoryId: string,
    params: TraceRequest
  ): Promise<TraceResponse> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repo.commitSha;
    if (!commitSha) {
      throw new ApiError(400, "BAD_REQUEST", "Repository has not completed commit resolution");
    }

    // 1. Fetch graph nodes and edges
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

    // 2. Identify start route or symbol
    let matchedRoute: RouteRecord | undefined;

    if (params.routeId) {
      const found = await RouteRecordModel.findById(params.routeId);
      if (found) matchedRoute = found;
    } else if (params.method && params.path) {
      const found = await RouteRecordModel.findOne({
        repositoryId,
        commitSha,
        method: params.method.toLowerCase(),
        path: params.path
      });
      if (found) matchedRoute = found;
    }

    // If no explicit route was selected, take the first available route as default
    if (!matchedRoute && !params.symbolId) {
      const firstRoute = await RouteRecordModel.findOne({ repositoryId, commitSha });
      if (firstRoute) matchedRoute = firstRoute;
    }

    const traceResult = this.tracer.trace(graph, {
      route: matchedRoute,
      symbolId: params.symbolId,
      maxDepth: params.maxDepth || 6
    });

    // 3. Attach code excerpts to steps
    for (const step of traceResult.steps) {
      if (step.filePath && step.filePath !== "external") {
        try {
          const content = await this.sourceStore.getFile(repositoryId, commitSha, step.filePath);
          if (content) {
            const lines = content.split(/\r?\n/);
            const start = Math.max(1, step.startLine);
            const end = Math.min(lines.length, Math.max(step.endLine, start + 5));
            step.snippet = lines.slice(start - 1, end).join("\n");
          }
        } catch {
          // Ignore snippet fetch error
        }
      }
    }

    return {
      route: matchedRoute,
      steps: traceResult.steps,
      totalSteps: traceResult.totalSteps,
      isComplete: traceResult.isComplete
    };
  }
}
