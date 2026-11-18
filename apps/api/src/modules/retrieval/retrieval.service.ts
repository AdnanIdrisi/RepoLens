import { CodeAnalyzer } from "@repolens/code-analyzer";
import {
  StructuralChunker,
  SnippetDeduplicator,
  BM25Engine,
  QueryExpander,
  CandidateRanker,
  GraphTraverser,
  ContextAssembler,
  AssembledContext,
  RankedCodeCandidate
} from "@repolens/retrieval";
import { CodeChunkModel } from "./models/code-chunk.model.js";
import { CodeEntityModel } from "./models/code-entity.model.js";
import { GraphEdgeModel } from "../graph/models/graph-edge.model.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { CodeFileModel } from "../repositories/models/code-file.model.js";
import { MongoSourceStore } from "../files/mongo-source-store.js";
import { ApiError } from "../../middleware/error.middleware.js";
import type {
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  SearchMatchType,
  CodeEntity
} from "@repolens/shared";

export class RetrievalService {
  private analyzer = new CodeAnalyzer();
  private chunker = new StructuralChunker();
  private deduplicator = new SnippetDeduplicator();
  private sourceStore: MongoSourceStore;

  constructor(sourceStore?: MongoSourceStore) {
    this.sourceStore = sourceStore || new MongoSourceStore();
  }

  /**
   * Chunks and indexes all eligible code files into AST entities and structural chunks.
   * Completely embedding-free: no external vector APIs or vector DB dependencies.
   */
  public async indexChunks(repositoryId: string): Promise<{ chunksCount: number; entitiesCount: number }> {
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
      return { chunksCount: 0, entitiesCount: 0 };
    }

    const allChunksToUpsert = [];
    const allEntitiesToUpsert: CodeEntity[] = [];

    for (const fileDoc of eligibleFiles) {
      const content = await this.sourceStore.getFile(repositoryId, commitSha, fileDoc.path);
      if (content === null) continue;

      const analysis = this.analyzer.analyzeFile(fileDoc.path, content, repositoryId, commitSha);
      const chunks = this.chunker.chunkFile(analysis, content, repositoryId, commitSha);

      // Collect AST Code Entities
      for (const ent of analysis.entities) {
        if (!ent.code || !ent.code.trim()) continue;
        allEntitiesToUpsert.push(ent);
      }

      // Map symbol info for structural chunks
      for (const chunk of chunks) {
        if (!chunk.text || !chunk.text.trim()) continue;
        let symbolName: string | undefined;
        let symbolKind: string | undefined;

        if (chunk.symbolId) {
          const matchedSymbol = analysis.symbols.find((s) => s.symbolId === chunk.symbolId);
          if (matchedSymbol) {
            symbolName = matchedSymbol.name;
            symbolKind = matchedSymbol.kind;
          }
        }

        allChunksToUpsert.push({
          ...chunk,
          symbolName,
          symbolKind,
          language: analysis.language
        });
      }
    }

    // Ensure MongoDB text index configuration is safe (no natural language override)
    try {
      await CodeChunkModel.syncIndexes();
      await CodeEntityModel.syncIndexes();
    } catch {
      // Safe fallback if indexes already synced
    }

    // Stale cleanup: purge prior chunks and entities for this repository & commit
    await Promise.all([
      CodeChunkModel.deleteMany({ repositoryId, commitSha }),
      CodeEntityModel.deleteMany({ repositoryId, commitSha })
    ]);

    // Bulk upsert chunks
    if (allChunksToUpsert.length > 0) {
      const chunkOps = allChunksToUpsert.map((c) => ({
        insertOne: { document: c }
      }));
      await CodeChunkModel.bulkWrite(chunkOps as never);
    }

    // Bulk upsert entities
    if (allEntitiesToUpsert.length > 0) {
      const entityOps = allEntitiesToUpsert.map((e) => ({
        insertOne: { document: e }
      }));
      await CodeEntityModel.bulkWrite(entityOps as never);
    }

    console.log(
      `[RetrievalService] Indexed ${allChunksToUpsert.length} structural chunks and ${allEntitiesToUpsert.length} code entities for repo ${repositoryId}.`
    );

    return {
      chunksCount: allChunksToUpsert.length,
      entitiesCount: allEntitiesToUpsert.length
    };
  }

  /**
   * Executes embedding-free, code-aware search combining Okapi BM25,
   * query expansion, exact AST symbol boosting, and bounded graph traversal.
   */
  public async search(
    repositoryId: string,
    params: SearchRequest
  ): Promise<SearchResponse> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repo.commitSha;
    if (!commitSha) {
      throw new ApiError(400, "BAD_REQUEST", "Repository has not completed commit resolution");
    }

    const rawQuery = params.query.trim();
    const limit = params.limit || 10;
    const requestedMatchType = params.matchType || "hybrid";

    // 1. Expand query using domain terminology mapping
    const expanded = QueryExpander.expand(rawQuery);

    // 2. Fetch candidates from MongoDB for this commit
    const filter: Record<string, unknown> = { repositoryId, commitSha };
    if (params.path) {
      filter.filePath = { $regex: `^${escapeRegex(params.path)}`, $options: "i" };
    }
    if (params.symbolKinds && params.symbolKinds.length > 0) {
      filter.symbolKind = { $in: params.symbolKinds };
    }

    const [chunkDocs, entityDocs, graphEdges] = await Promise.all([
      CodeChunkModel.find(filter).lean(),
      CodeEntityModel.find({ repositoryId, commitSha }).lean(),
      GraphEdgeModel.find({ repositoryId, commitSha }).lean()
    ]);

    // Build entity lookup map
    const entitiesMap = new Map<string, CodeEntity>();
    for (const ent of entityDocs) {
      entitiesMap.set(ent.entityId, ent as unknown as CodeEntity);
    }

    // 3. Initialize in-memory BM25 Engine
    const bm25Engine = new BM25Engine(1.5, 0.75);

    // Index structural chunks into BM25
    for (const doc of chunkDocs) {
      bm25Engine.addDocument({
        id: doc.chunkId,
        filePath: doc.filePath,
        entityName: doc.symbolName,
        entityType: doc.symbolKind,
        startLine: doc.startLine,
        endLine: doc.endLine,
        content: doc.text
      });
    }

    // Index code entities into BM25
    for (const ent of entityDocs) {
      bm25Engine.addDocument({
        id: ent.entityId,
        filePath: ent.filePath,
        entityName: ent.entityName,
        entityType: ent.entityType,
        startLine: ent.startLine,
        endLine: ent.endLine,
        content: ent.code
      });
    }

    // 4. Execute BM25 search with query expansion
    const bm25Results = bm25Engine.search(expanded.combinedQueryString, {
      topK: Math.max(limit * 3, 30)
    });

    // 5. Apply deterministic symbol match, path match, and entity kind boosts
    const rankedCandidates: RankedCodeCandidate[] = CandidateRanker.rankCandidates(
      bm25Results,
      expanded,
      entitiesMap
    );

    // 6. Perform bounded graph relationship traversal if hybrid mode requested
    let traversedCandidates = [];
    if (requestedMatchType === "hybrid" || requestedMatchType === "vector") {
      const topSeedEntities = rankedCandidates
        .slice(0, 5)
        .map((c) => c.entity);

      traversedCandidates = GraphTraverser.traverseSupportingEntities(
        topSeedEntities,
        entitiesMap,
        graphEdges.map((e) => ({
          sourceId: e.sourceId,
          targetId: e.targetId,
          kind: e.kind
        })),
        2, // max 2 hops
        6  // max supporting items
      );

      const existingIds = new Set(rankedCandidates.map((c) => c.entity.entityId));
      for (const tc of traversedCandidates) {
        if (!tc.isPrimarySeed && !existingIds.has(tc.entity.entityId)) {
          existingIds.add(tc.entity.entityId);
          rankedCandidates.push({
            entity: tc.entity,
            finalScore: Number((1.5 / tc.hopDistance).toFixed(4)),
            bm25Score: 0.5,
            symbolBonus: 0,
            pathBonus: 0,
            typeBonus: 0,
            matchReasons: [`Graph relation: ${tc.relation || "CONNECTED"} from ${tc.sourceSeedName || "seed"}`]
          });
        }
      }
    }

    // 7. Deduplicate overlapping snippets
    const deduplicationCandidates = rankedCandidates.map((c) => ({
      id: c.entity.entityId,
      filePath: c.entity.filePath,
      startLine: c.entity.startLine,
      endLine: c.entity.endLine,
      candidate: c
    }));

    const deduplicated = this.deduplicator.deduplicate(deduplicationCandidates, 0.6);

    // 8. Format final search results
    const results: SearchResultItem[] = deduplicated.slice(0, limit).map((d) => {
      const c = d.candidate;
      return {
        chunkId: c.entity.entityId,
        filePath: c.entity.filePath,
        symbolId: c.entity.entityId,
        symbolName: c.entity.entityName,
        symbolKind: c.entity.entityType,
        startLine: c.entity.startLine,
        endLine: c.entity.endLine,
        snippet: c.entity.code,
        score: Number(c.finalScore.toFixed(4)),
        matchType: requestedMatchType as SearchMatchType,
        repositoryId,
        commitSha
      };
    });

    return {
      query: rawQuery,
      matchType: requestedMatchType,
      total: results.length,
      results
    };
  }

  /**
   * Assembles evidence-grounded context blocks with exact file and line citations,
   * bounded within the requested token budget for Gemini answer synthesis.
   */
  public async retrieveEvidenceContext(
    repositoryId: string,
    query: string,
    options: { maxCharacters?: number; maxEntities?: number } = {}
  ): Promise<AssembledContext> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo || !repo.commitSha) {
      throw new ApiError(404, "NOT_FOUND", "Repository or commit not found");
    }

    const commitSha = repo.commitSha;
    const expanded = QueryExpander.expand(query);

    const [chunkDocs, entityDocs, graphEdges] = await Promise.all([
      CodeChunkModel.find({ repositoryId, commitSha }).lean(),
      CodeEntityModel.find({ repositoryId, commitSha }).lean(),
      GraphEdgeModel.find({ repositoryId, commitSha }).lean()
    ]);

    const entitiesMap = new Map<string, CodeEntity>();
    for (const ent of entityDocs) {
      entitiesMap.set(ent.entityId, ent as unknown as CodeEntity);
    }

    const bm25Engine = new BM25Engine();
    for (const doc of chunkDocs) {
      bm25Engine.addDocument({
        id: doc.chunkId,
        filePath: doc.filePath,
        entityName: doc.symbolName,
        entityType: doc.symbolKind,
        startLine: doc.startLine,
        endLine: doc.endLine,
        content: doc.text
      });
    }

    for (const ent of entityDocs) {
      bm25Engine.addDocument({
        id: ent.entityId,
        filePath: ent.filePath,
        entityName: ent.entityName,
        entityType: ent.entityType,
        startLine: ent.startLine,
        endLine: ent.endLine,
        content: ent.code
      });
    }

    const bm25Results = bm25Engine.search(expanded.combinedQueryString, { topK: 30 });
    const ranked = CandidateRanker.rankCandidates(bm25Results, expanded, entitiesMap);

    const topSeeds = ranked.slice(0, 5).map((r) => r.entity);
    const traversed = GraphTraverser.traverseSupportingEntities(
      topSeeds,
      entitiesMap,
      graphEdges.map((e) => ({
        sourceId: e.sourceId,
        targetId: e.targetId,
        kind: e.kind
      })),
      2,
      6
    );

    return ContextAssembler.assemble(ranked, traversed, options);
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
