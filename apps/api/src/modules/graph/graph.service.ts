import path from "node:path";
import { CodeAnalyzer } from "@repolens/code-analyzer";
import { UnifiedModuleResolver, SymbolResolver } from "@repolens/code-analyzer";
import { buildGraph, getSubgraph } from "@repolens/graph-engine";
import { GraphNodeModel, GraphNodeDocument } from "./models/graph-node.model.js";
import { GraphEdgeModel } from "./models/graph-edge.model.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { CodeFileModel } from "../repositories/models/code-file.model.js";
import { MongoSourceStore } from "../files/mongo-source-store.js";
import { ApiError } from "../../middleware/error.middleware.js";
import type { GraphNode, GraphEdge, GraphEdgeKind, GraphNodeKind } from "@repolens/shared";

export class GraphService {
  private analyzer = new CodeAnalyzer();
  private moduleResolver = new UnifiedModuleResolver();
  private symbolResolver = new SymbolResolver();
  private sourceStore: MongoSourceStore;

  constructor(sourceStore?: MongoSourceStore) {
    this.sourceStore = sourceStore || new MongoSourceStore();
  }

  /**
   * Generates and persists the full structural code relationship graph for a repository revision.
   */
  public async indexRepositoryGraph(repositoryId: string): Promise<{ nodesCount: number; edgesCount: number }> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repo.commitSha;
    if (!commitSha) {
      throw new ApiError(400, "BAD_REQUEST", "Repository has not completed commit resolution");
    }

    // 1. Fetch all eligible code files discovered for this commit
    const eligibleFiles = await CodeFileModel.find({
      repositoryId,
      commitSha,
      status: { $in: ["discovered", "fetched"] }
    });

    if (eligibleFiles.length === 0) {
      return { nodesCount: 0, edgesCount: 0 };
    }

    const knownFilePaths = new Set(eligibleFiles.map((f) => f.path));
    const resolverContext = { knownFilePaths };

    // 2. Parse and analyze each eligible file
    const analyzedFiles = [];
    for (const fileDoc of eligibleFiles) {
      const content = await this.sourceStore.getFile(repositoryId, commitSha, fileDoc.path);
      if (content !== null) {
        const analysis = this.analyzer.analyzeFile(fileDoc.path, content, repositoryId, commitSha);
        analyzedFiles.push(analysis);
      }
    }

    // 3. Build repository export table
    const exportTable = this.symbolResolver.buildExportTable(analyzedFiles);

    // 4. Construct Graph Nodes and Edges
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const edgeIdSet = new Set<string>();

    for (const fileAnalysis of analyzedFiles) {
      const filePath = fileAnalysis.filePath;
      const fileName = path.posix.basename(filePath);

      // A. Create File Node
      nodes.push({
        id: filePath,
        repositoryId,
        commitSha,
        kind: "file",
        label: fileName,
        filePath,
        startLine: 1,
        endLine: fileAnalysis.lineCount
      });

      // B. Create Symbol Nodes and 'defines' edges
      for (const sym of fileAnalysis.symbols) {
        nodes.push({
          id: sym.symbolId,
          repositoryId,
          commitSha,
          kind: sym.kind as GraphNodeKind,
          label: sym.name,
          filePath: sym.filePath,
          startLine: sym.startLine,
          endLine: sym.endLine
        });

        // defines edge: file -> declared symbol
        const definesEdgeId = `def:${filePath}->${sym.symbolId}`;
        if (!edgeIdSet.has(definesEdgeId)) {
          edgeIdSet.add(definesEdgeId);
          edges.push({
            id: definesEdgeId,
            repositoryId,
            commitSha,
            sourceId: filePath,
            targetId: sym.symbolId,
            kind: "defines",
            confidence: 1.0,
            evidence: {
              filePath,
              startLine: sym.startLine,
              endLine: sym.endLine
            }
          });
        }
      }

      // C. Resolve imports and create 'imports' edges
      const resolvedImportsList = [];
      for (const imp of fileAnalysis.imports) {
        const res = this.moduleResolver.resolve(imp.importedSpecifier, filePath, resolverContext);
        resolvedImportsList.push(res);
        if (res.status === "resolved" && res.resolvedPath) {
          const importsEdgeId = `imp:${filePath}->${res.resolvedPath}`;
          if (!edgeIdSet.has(importsEdgeId)) {
            edgeIdSet.add(importsEdgeId);
            edges.push({
              id: importsEdgeId,
              repositoryId,
              commitSha,
              sourceId: filePath,
              targetId: res.resolvedPath,
              kind: "imports",
              confidence: 1.0,
              evidence: {
                filePath,
                startLine: imp.startLine,
                endLine: imp.endLine
              }
            });
          }
        }
      }

      // D. Connect imported symbols to target declared symbols
      const resolvedSymbols = this.symbolResolver.resolveImportSymbols(
        fileAnalysis,
        resolvedImportsList,
        exportTable
      );
      for (const ref of resolvedSymbols) {
        if (ref.isResolved && ref.targetSymbolId) {
          const symImpEdgeId = `sym_imp:${filePath}->${ref.targetSymbolId}`;
          if (!edgeIdSet.has(symImpEdgeId)) {
            edgeIdSet.add(symImpEdgeId);
            edges.push({
              id: symImpEdgeId,
              repositoryId,
              commitSha,
              sourceId: filePath,
              targetId: ref.targetSymbolId,
              kind: "imports",
              confidence: 1.0,
              evidence: {
                filePath,
                startLine: 1,
                endLine: fileAnalysis.lineCount
              }
            });
          }
        }
      }

      // D. Resolve routes and connect route -> handler / middleware
      for (const route of fileAnalysis.routes) {
        for (const handlerName of route.handlers) {
          // Look for matching symbol in target files or local file
          const targetSym = fileAnalysis.symbols.find((s) => s.name === handlerName);
          if (targetSym) {
            const routeEdgeId = `rt:${route.symbolId}->${targetSym.symbolId}`;
            if (!edgeIdSet.has(routeEdgeId)) {
              edgeIdSet.add(routeEdgeId);
              edges.push({
                id: routeEdgeId,
                repositoryId,
                commitSha,
                sourceId: route.symbolId,
                targetId: targetSym.symbolId,
                kind: "routes_to",
                confidence: 1.0,
                evidence: {
                  filePath,
                  startLine: route.startLine,
                  endLine: route.endLine
                }
              });
            }
          }
        }
      }
    }

    // 5. Bulk persist nodes and edges to database
    if (nodes.length > 0) {
      const nodeOps = nodes.map((n) => ({
        updateOne: {
          filter: { repositoryId, commitSha, id: n.id },
          update: { $set: n },
          upsert: true
        }
      }));
      await GraphNodeModel.bulkWrite(nodeOps as never);
    }

    if (edges.length > 0) {
      const edgeOps = edges.map((e) => ({
        updateOne: {
          filter: { repositoryId, commitSha, id: e.id },
          update: { $set: e },
          upsert: true
        }
      }));
      await GraphEdgeModel.bulkWrite(edgeOps as never);
    }

    // 6. Mark repository as ready with activeIndexVersion
    repo.status = "ready";
    repo.activeIndexVersion = commitSha;
    await repo.save();

    console.log(`[GraphService] Indexed repository ${repositoryId}: ${nodes.length} nodes, ${edges.length} edges.`);
    return { nodesCount: nodes.length, edgesCount: edges.length };
  }

  /**
   * Retrieves a bounded neighborhood subgraph for the code relationship visualization.
   */
  public async getGraph(
    repositoryId: string,
    options: {
      rootNodeId?: string;
      depth?: number;
      edgeKinds?: GraphEdgeKind[];
      nodeKinds?: GraphNodeKind[];
      scope?: "all" | "neighborhood";
      limit?: number;
    } = {}
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[]; rootId?: string }> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repo.activeIndexVersion || repo.commitSha;
    if (!commitSha) {
      return { nodes: [], edges: [] };
    }

    const maxDepth = options.depth ? Math.min(Math.max(1, options.depth), 4) : 1;
    const limit = options.limit ? Math.min(options.limit, 300) : 100;
    const scope = options.scope || (options.rootNodeId ? "neighborhood" : "neighborhood");

    // Load nodes and edges for this commit
    const [dbNodes, dbEdges] = await Promise.all([
      GraphNodeModel.find({ repositoryId, commitSha }).limit(limit * 4).lean(),
      GraphEdgeModel.find({ repositoryId, commitSha }).limit(limit * 6).lean()
    ]);

    if (dbNodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = dbNodes.map((n) => ({
      id: n.id,
      repositoryId: n.repositoryId,
      commitSha: n.commitSha,
      kind: n.kind as GraphNodeKind,
      label: n.label,
      filePath: n.filePath,
      startLine: n.startLine,
      endLine: n.endLine
    }));

    const edges = dbEdges.map((e) => ({
      id: e.id,
      repositoryId: e.repositoryId,
      commitSha: e.commitSha,
      sourceId: e.sourceId,
      targetId: e.targetId,
      kind: e.kind as GraphEdgeKind,
      confidence: e.confidence,
      evidence: e.evidence
    }));

    let rootNodeId = options.rootNodeId;

    // In neighborhood mode, center around rootNodeId or auto-discover primary entry point
    if (scope !== "all") {
      if (!rootNodeId) {
        // Look for typical application entry points
        const candidateNames = [
          "server.js", "server.ts", "app.js", "app.ts", "index.js", "index.ts", "main.js", "main.ts"
        ];
        const entryNode = nodes.find(
          (n) => n.kind === "file" && candidateNames.includes(path.posix.basename(n.filePath).toLowerCase())
        );

        if (entryNode) {
          rootNodeId = entryNode.id;
        } else {
          // Fallback: pick node with highest degree
          const degrees = new Map<string, number>();
          for (const e of edges) {
            degrees.set(e.sourceId, (degrees.get(e.sourceId) || 0) + 1);
            degrees.set(e.targetId, (degrees.get(e.targetId) || 0) + 1);
          }
          let highestDegree = -1;
          for (const n of nodes) {
            if (n.kind === "file") {
              const deg = degrees.get(n.id) || 0;
              if (deg > highestDegree) {
                highestDegree = deg;
                rootNodeId = n.id;
              }
            }
          }
          if (!rootNodeId && nodes.length > 0) {
            rootNodeId = nodes[0].id;
          }
        }
      }

      if (rootNodeId) {
        const codeGraph = buildGraph(nodes, edges);
        const subgraph = getSubgraph(codeGraph, rootNodeId, maxDepth, {
          edgeKinds: options.edgeKinds,
          nodeKinds: options.nodeKinds,
          limit
        });

        return {
          nodes: subgraph.nodes,
          edges: subgraph.edges,
          rootId: rootNodeId
        };
      }
    }

    // Default overview (when scope is "all"): prioritize file-to-file import edges
    const fileNodes = nodes.filter((n) => n.kind === "file").slice(0, limit);
    const fileNodeIds = new Set(fileNodes.map((n) => n.id));
    const importEdges = edges.filter(
      (e) => fileNodeIds.has(e.sourceId) && fileNodeIds.has(e.targetId)
    );

    return {
      nodes: fileNodes,
      edges: importEdges,
      rootId: rootNodeId
    };
  }

  /**
   * Searches indexed symbols by name or file path.
   */
  public async searchSymbols(
    repositoryId: string,
    query: string,
    kind?: string,
    limit: number = 20
  ): Promise<GraphNodeDocument[]> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repo.activeIndexVersion || repo.commitSha;
    if (!commitSha) return [];

    const filter: Record<string, unknown> = {
      repositoryId,
      commitSha
    };

    if (kind) {
      filter.kind = kind;
    }

    if (query && query.trim()) {
      filter.$or = [
        { label: { $regex: query.trim(), $options: "i" } },
        { filePath: { $regex: query.trim(), $options: "i" } }
      ];
    }

    return GraphNodeModel.find(filter).limit(Math.min(limit, 100));
  }

  /**
   * Retrieves single symbol details.
   */
  public async getSymbol(repositoryId: string, symbolId: string): Promise<GraphNodeDocument> {
    const symbol = await GraphNodeModel.findOne({ repositoryId, id: symbolId });
    if (!symbol) {
      throw new ApiError(404, "NOT_FOUND", "Symbol not found in graph index");
    }
    return symbol;
  }
}
