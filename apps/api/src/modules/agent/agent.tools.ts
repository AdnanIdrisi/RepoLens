import { RetrievalService } from "../retrieval/retrieval.service.js";
import { GraphService } from "../graph/graph.service.js";
import { TracingService } from "../tracing/tracing.service.js";
import { ImpactService } from "../impact/impact.service.js";
import { MongoSourceStore } from "../files/mongo-source-store.js";
import { CodeFileModel } from "../repositories/models/code-file.model.js";
import { GraphNodeModel } from "../graph/models/graph-node.model.js";
import { GraphEdgeModel } from "../graph/models/graph-edge.model.js";
import { RouteRecordModel } from "../tracing/models/route-record.model.js";
import { CodeChunkModel } from "../retrieval/models/code-chunk.model.js";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (repositoryId: string, commitSha: string, args: Record<string, unknown>) => Promise<unknown>;
}

export class AgentToolbox {
  private retrievalService = new RetrievalService();
  private graphService = new GraphService();
  private tracingService = new TracingService();
  private impactService = new ImpactService();
  private sourceStore = new MongoSourceStore();

  public getTools(): Record<string, ToolDefinition> {
    return {
      searchCode: {
        name: "searchCode",
        description: "Search the indexed repository using semantic vector similarity and lexical ranking to find implementations, definitions, and code snippets.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query or identifier name" },
            limit: { type: "number", description: "Max results to return (default 5, max 10)" }
          },
          required: ["query"]
        },
        execute: async (repositoryId, _commitSha, args) => {
          const query = String(args.query || "");
          const limit = Math.min(Number(args.limit || 5), 10);
          const response = await this.retrievalService.search(repositoryId, {
            query,
            limit,
            matchType: "hybrid"
          });
          return response.results.map((r) => ({
            filePath: r.filePath,
            symbolName: r.symbolName,
            symbolKind: r.symbolKind,
            startLine: r.startLine,
            endLine: r.endLine,
            snippet: r.snippet.slice(0, 500)
          }));
        }
      },

      readFile: {
        name: "readFile",
        description: "Read a bounded line range of source code from a verified repository file.",
        parameters: {
          type: "object",
          properties: {
            filePath: { type: "string", description: "Canonical POSIX path of file" },
            startLine: { type: "number", description: "1-indexed starting line (default 1)" },
            endLine: { type: "number", description: "1-indexed ending line (max 100 lines at once)" }
          },
          required: ["filePath"]
        },
        execute: async (repositoryId, commitSha, args) => {
          const filePath = String(args.filePath || "");
          const content = await this.sourceStore.getFile(repositoryId, commitSha, filePath);
          if (content === null) {
            return { error: `File not found in repository: ${filePath}` };
          }
          const lines = content.split(/\r?\n/);
          const start = Math.max(1, Number(args.startLine || 1));
          const maxAllowedEnd = Math.min(lines.length, start + 100);
          const end = Math.min(maxAllowedEnd, Number(args.endLine || maxAllowedEnd));

          return {
            filePath,
            totalLines: lines.length,
            startLine: start,
            endLine: end,
            content: lines.slice(start - 1, end).join("\n")
          };
        }
      },

      findReferences: {
        name: "findReferences",
        description: "Find incoming and outgoing call/import references for a specified symbol ID or file path.",
        parameters: {
          type: "object",
          properties: {
            targetId: { type: "string", description: "Symbol ID or file path to check references for" }
          },
          required: ["targetId"]
        },
        execute: async (repositoryId, commitSha, args) => {
          const targetId = String(args.targetId || "");
          const incoming = await GraphEdgeModel.find({ repositoryId, commitSha, targetId }).limit(20);
          const outgoing = await GraphEdgeModel.find({ repositoryId, commitSha, sourceId: targetId }).limit(20);

          return {
            targetId,
            incomingReferences: incoming.map((e) => ({
              from: e.sourceId,
              relationship: e.kind,
              evidence: e.evidence
            })),
            outgoingReferences: outgoing.map((e) => ({
              to: e.targetId,
              relationship: e.kind,
              evidence: e.evidence
            }))
          };
        }
      },

      getFileGraph: {
        name: "getFileGraph",
        description: "Retrieve the bounded neighborhood graph around a specific file or symbol.",
        parameters: {
          type: "object",
          properties: {
            rootNodeId: { type: "string", description: "Root file path or symbol ID" },
            depth: { type: "number", description: "Neighborhood radius depth (1-2)" }
          },
          required: ["rootNodeId"]
        },
        execute: async (repositoryId, _commitSha, args) => {
          const rootNodeId = String(args.rootNodeId || "");
          const depth = Math.min(Number(args.depth || 1), 2);
          const graph = await this.graphService.getGraph(repositoryId, { rootNodeId, depth, limit: 30 });
          return {
            rootId: graph.rootId,
            nodesCount: graph.nodes.length,
            edgesCount: graph.edges.length,
            nodes: graph.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind, filePath: n.filePath })),
            edges: graph.edges.map((e) => ({ source: e.sourceId, target: e.targetId, kind: e.kind }))
          };
        }
      },

      traceExecutionFlow: {
        name: "traceExecutionFlow",
        description: "Statically trace an Express route through middlewares, handlers, and downstream service calls.",
        parameters: {
          type: "object",
          properties: {
            method: { type: "string", description: "HTTP method (e.g. GET, POST)" },
            path: { type: "string", description: "Route path pattern (e.g. /api/users)" }
          },
          required: ["method", "path"]
        },
        execute: async (repositoryId, _commitSha, args) => {
          const method = String(args.method || "");
          const path = String(args.path || "");
          const trace = await this.tracingService.traceFlow(repositoryId, { method, path, maxDepth: 5 });
          return {
            route: trace.route ? `${trace.route.method.toUpperCase()} ${trace.route.path}` : "unresolved",
            totalSteps: trace.steps.length,
            steps: trace.steps.map((s) => ({
              label: s.label,
              category: s.category,
              relationship: s.relationship,
              filePath: s.filePath,
              lineRange: `L${s.startLine}-${s.endLine}`
            }))
          };
        }
      },

      analyzeImpact: {
        name: "analyzeImpact",
        description: "Estimate the blast radius and affected downstream components if a file or symbol is modified.",
        parameters: {
          type: "object",
          properties: {
            targetFilePath: { type: "string", description: "File path that would be modified" },
            maxDepth: { type: "number", description: "Blast radius traversal depth (1-4)" }
          },
          required: ["targetFilePath"]
        },
        execute: async (repositoryId, _commitSha, args) => {
          const targetFilePath = String(args.targetFilePath || "");
          const maxDepth = Math.min(Number(args.maxDepth || 2), 4);
          const report = await this.impactService.analyzeImpact(repositoryId, { targetFilePath, maxDepth });
          return {
            targetFile: report.target.filePath,
            totalAffectedFiles: report.totalAffectedFiles,
            directAffected: report.directAffected.map((d) => d.filePath),
            indirectAffected: report.indirectAffected.map((i) => ({ filePath: i.filePath, distance: i.distance })),
            suggestedTests: report.suggestedTests.map((t) => t.testFilePath)
          };
        }
      },

      getRepositorySummary: {
        name: "getRepositorySummary",
        description: "Retrieve high-level metrics of the indexed repository including file counts, symbol totals, routes, and chunks.",
        parameters: {
          type: "object",
          properties: {}
        },
        execute: async (repositoryId, commitSha) => {
          const totalFiles = await CodeFileModel.countDocuments({ repositoryId, commitSha });
          const totalSymbols = await GraphNodeModel.countDocuments({ repositoryId, commitSha, kind: { $ne: "file" } });
          const totalRoutes = await RouteRecordModel.countDocuments({ repositoryId, commitSha });
          const totalChunks = await CodeChunkModel.countDocuments({ repositoryId, commitSha });

          return {
            repositoryId,
            commitSha,
            totalFiles,
            totalSymbols,
            totalRoutes,
            totalChunks
          };
        }
      }
    };
  }
}
