import { CodeAnalyzer } from "@repolens/code-analyzer";
import {
  StructuralChunker,
  GeminiEmbeddingProvider,
  ReciprocalRankFusion,
  SnippetDeduplicator,
  cosineSimilarity,
  EmbeddingProvider
} from "@repolens/retrieval";
import { CodeChunkModel, CodeChunkDocument } from "./models/code-chunk.model.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { CodeFileModel } from "../repositories/models/code-file.model.js";
import { MongoSourceStore } from "../files/mongo-source-store.js";
import { ApiError } from "../../middleware/error.middleware.js";
import type {
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  SearchMatchType
} from "@repolens/shared";

interface RankedInternalItem {
  id: string;
  doc: CodeChunkDocument;
  score: number;
}

export class RetrievalService {
  private analyzer = new CodeAnalyzer();
  private chunker = new StructuralChunker();
  private embeddingProvider: EmbeddingProvider;
  private rrf = new ReciprocalRankFusion({ k: 60 });
  private deduplicator = new SnippetDeduplicator();
  private sourceStore: MongoSourceStore;

  constructor(embeddingProvider?: EmbeddingProvider, sourceStore?: MongoSourceStore) {
    this.embeddingProvider = embeddingProvider || new GeminiEmbeddingProvider();
    this.sourceStore = sourceStore || new MongoSourceStore();
  }

  /**
   * Chunks, embeds, and indexes all eligible code files in a repository commit.
   */
  public async indexChunks(repositoryId: string): Promise<{ chunksCount: number }> {
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
      return { chunksCount: 0 };
    }

    const allChunksToUpsert = [];

    for (const fileDoc of eligibleFiles) {
      const content = await this.sourceStore.getFile(repositoryId, commitSha, fileDoc.path);
      if (content === null) continue;

      const analysis = this.analyzer.analyzeFile(fileDoc.path, content, repositoryId, commitSha);
      const chunks = this.chunker.chunkFile(analysis, content, repositoryId, commitSha);

      // Map symbol info
      for (const chunk of chunks) {
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

    if (allChunksToUpsert.length === 0) {
      return { chunksCount: 0 };
    }

    // Compute embeddings in batches
    const textsToEmbed = allChunksToUpsert.map((c) => `${c.filePath}\n${c.text}`);
    const embeddings = await this.embeddingProvider.embedDocuments(textsToEmbed);

    for (let i = 0; i < allChunksToUpsert.length; i++) {
      allChunksToUpsert[i].embedding = embeddings[i];
      allChunksToUpsert[i].embeddingModel = this.embeddingProvider.modelName;
    }

    // Ensure text index does not treat code languages (e.g. jsx, tsx) as natural language overrides
    try {
      await CodeChunkModel.syncIndexes();
    } catch {
      try {
        await CodeChunkModel.collection.dropIndex("code_chunks_text_index");
        await CodeChunkModel.createIndexes();
      } catch {
        // Ignore if collection or index does not exist yet
      }
    }

    // Bulk upsert to MongoDB
    const ops = allChunksToUpsert.map((c) => ({
      updateOne: {
        filter: { repositoryId, commitSha, chunkId: c.chunkId },
        update: { $set: c },
        upsert: true
      }
    }));

    await CodeChunkModel.bulkWrite(ops as never);

    console.log(
      `[RetrievalService] Indexed ${allChunksToUpsert.length} code chunks for repo ${repositoryId}.`
    );
    return { chunksCount: allChunksToUpsert.length };
  }

  /**
   * Executes hybrid lexical + semantic search with Reciprocal Rank Fusion.
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

    const query = params.query.trim();
    const limit = params.limit || 10;
    const requestedMatchType = params.matchType || "hybrid";

    // 1. Perform Lexical Search
    const lexicalCandidates: RankedInternalItem[] = [];
    if (requestedMatchType === "hybrid" || requestedMatchType === "lexical") {
      const lexicalMatches = await this.executeLexicalSearch(repositoryId, commitSha, query, params);
      lexicalCandidates.push(...lexicalMatches);
    }

    // 2. Perform Vector Search
    const vectorCandidates: RankedInternalItem[] = [];
    if (requestedMatchType === "hybrid" || requestedMatchType === "vector") {
      const vectorMatches = await this.executeVectorSearch(repositoryId, commitSha, query, params);
      vectorCandidates.push(...vectorMatches);
    }

    // 3. Rank Fusion
    let fusedRankedItems: Array<{
      item: RankedInternalItem;
      rrfScore: number;
      matchType: SearchMatchType;
    }> = [];

    if (requestedMatchType === "lexical") {
      fusedRankedItems = lexicalCandidates.map((c) => ({
        item: c,
        rrfScore: c.score,
        matchType: "lexical" as SearchMatchType
      }));
    } else if (requestedMatchType === "vector") {
      fusedRankedItems = vectorCandidates.map((c) => ({
        item: c,
        rrfScore: c.score,
        matchType: "vector" as SearchMatchType
      }));
    } else {
      // Hybrid RRF
      const fused = this.rrf.fuse(vectorCandidates, lexicalCandidates);
      fusedRankedItems = fused.map((f) => ({
        item: f.item,
        rrfScore: f.rrfScore,
        matchType: f.matchType
      }));
    }

    // 4. Extract docs and deduplicate overlapping snippets in the same file
    const deduplicationCandidates = fusedRankedItems.map((f) => ({
      id: f.item.id,
      filePath: f.item.doc.filePath,
      startLine: f.item.doc.startLine,
      endLine: f.item.doc.endLine,
      fused: f
    }));

    const deduplicated = this.deduplicator.deduplicate(deduplicationCandidates, 0.6);

    // 5. Build final SearchResultItem list
    const results: SearchResultItem[] = deduplicated.slice(0, limit).map((d) => {
      const doc = d.fused.item.doc;
      return {
        chunkId: doc.chunkId,
        filePath: doc.filePath,
        symbolId: doc.symbolId,
        symbolName: doc.symbolName,
        symbolKind: doc.symbolKind,
        startLine: doc.startLine,
        endLine: doc.endLine,
        snippet: doc.text,
        score: d.fused.rrfScore,
        matchType: d.fused.matchType,
        repositoryId,
        commitSha
      };
    });

    return {
      query,
      matchType: requestedMatchType,
      total: results.length,
      results
    };
  }

  /**
   * Executes lexical search with exact identifier and regex/substring boosting.
   */
  private async executeLexicalSearch(
    repositoryId: string,
    commitSha: string,
    query: string,
    params: SearchRequest
  ): Promise<RankedInternalItem[]> {
    const filter: Record<string, unknown> = {
      repositoryId,
      commitSha
    };

    if (params.path) {
      filter.filePath = { $regex: `^${escapeRegex(params.path)}`, $options: "i" };
    }

    if (params.symbolKinds && params.symbolKinds.length > 0) {
      filter.symbolKind = { $in: params.symbolKinds };
    }

    // Exact identifier or text match
    const regexPattern = escapeRegex(query);
    const searchFilter = {
      ...filter,
      $or: [
        { symbolName: { $regex: regexPattern, $options: "i" } },
        { filePath: { $regex: regexPattern, $options: "i" } },
        { text: { $regex: regexPattern, $options: "i" } }
      ]
    };

    const docs = await CodeChunkModel.find(searchFilter).limit(50);

    return docs.map((doc) => {
      let score = 0.1;
      const lowerQuery = query.toLowerCase();

      // Symbol exact name boost
      if (doc.symbolName && doc.symbolName.toLowerCase() === lowerQuery) {
        score += 1.0;
      } else if (doc.symbolName && doc.symbolName.toLowerCase().includes(lowerQuery)) {
        score += 0.5;
      }

      // File path match boost
      if (doc.filePath.toLowerCase().includes(lowerQuery)) {
        score += 0.3;
      }

      // Text occurrence boost
      if (doc.text.toLowerCase().includes(lowerQuery)) {
        score += 0.2;
      }

      return {
        id: doc.chunkId,
        doc,
        score: Number(score.toFixed(4))
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Executes vector search using query embedding and cosine similarity or Atlas vector index.
   */
  private async executeVectorSearch(
    repositoryId: string,
    commitSha: string,
    query: string,
    params: SearchRequest
  ): Promise<RankedInternalItem[]> {
    const queryVector = await this.embeddingProvider.embedQuery(query);

    const filter: Record<string, unknown> = {
      repositoryId,
      commitSha
    };

    if (params.path) {
      filter.filePath = { $regex: `^${escapeRegex(params.path)}`, $options: "i" };
    }

    if (params.symbolKinds && params.symbolKinds.length > 0) {
      filter.symbolKind = { $in: params.symbolKinds };
    }

    // Fetch candidate chunks that possess an embedding
    const docs = await CodeChunkModel.find({
      ...filter,
      embedding: { $exists: true, $ne: [] }
    }).limit(150);

    const scoredDocs = docs.map((doc) => {
      const docVector = doc.embedding || [];
      const score = cosineSimilarity(queryVector, docVector);
      return {
        id: doc.chunkId,
        doc,
        score: Number(score.toFixed(4))
      };
    });

    return scoredDocs.sort((a, b) => b.score - a.score).slice(0, 50);
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
