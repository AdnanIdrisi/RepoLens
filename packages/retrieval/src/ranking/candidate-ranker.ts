import type { CodeEntity } from "@repolens/shared";
import { ExpandedQuery } from "../query/query-expander.js";
import { BM25SearchResult } from "../bm25/bm25.engine.js";

export interface RankedCodeCandidate {
  entity: CodeEntity;
  finalScore: number;
  bm25Score: number;
  symbolBonus: number;
  pathBonus: number;
  typeBonus: number;
  matchReasons: string[];
}

export class CandidateRanker {
  /**
   * Reranks BM25 retrieval candidates with deterministic, code-aware heuristic bonuses.
   */
  public static rankCandidates(
    bm25Results: BM25SearchResult[],
    expandedQuery: ExpandedQuery,
    entitiesMap: Map<string, CodeEntity>
  ): RankedCodeCandidate[] {
    const rawTokens = expandedQuery.originalQuery.toLowerCase().split(/\s+/);
    const expandedTokens = expandedQuery.expandedTerms.map((t) => t.toLowerCase());
    const preferredTypes = new Set(expandedQuery.preferredEntityTypes);

    const candidates: RankedCodeCandidate[] = [];

    for (const res of bm25Results) {
      const entity = entitiesMap.get(res.document.id) || {
        repositoryId: "default",
        commitSha: "head",
        entityId: res.document.id,
        filePath: res.document.filePath,
        entityType: res.document.entityType || "function",
        entityName: res.document.entityName || "",
        startLine: res.document.startLine || 1,
        endLine: res.document.endLine || 1,
        imports: [],
        calls: [],
        code: res.document.content,
        contentHash: ""
      };

      const entityNameLower = entity.entityName.toLowerCase();
      const filePathLower = entity.filePath.toLowerCase();
      const reasons: string[] = [];

      let symbolBonus = 0;
      let pathBonus = 0;
      let typeBonus = 0;

      // 1. Exact symbol name matching
      for (const token of rawTokens) {
        if (!token || token.length < 2) continue;
        if (entityNameLower === token) {
          symbolBonus += 3.0;
          reasons.push(`Exact symbol match: "${entity.entityName}"`);
        } else if (entityNameLower.includes(token)) {
          symbolBonus += 1.0;
          reasons.push(`Partial symbol match: "${token}" in "${entity.entityName}"`);
        }
      }

      // Check expanded tokens against symbol name
      for (const expToken of expandedTokens) {
        if (entityNameLower === expToken) {
          symbolBonus += 1.5;
          reasons.push(`Domain symbol match: "${expToken}"`);
        }
      }

      // 2. File path match
      for (const token of rawTokens) {
        if (!token || token.length < 2) continue;
        if (filePathLower.includes(token)) {
          pathBonus += 0.5;
          reasons.push(`Path matches query: "${token}"`);
        }
      }

      // 3. Preferred entity type bonus
      if (preferredTypes.has(entity.entityType)) {
        typeBonus += 1.2;
        reasons.push(`Entity kind matches intent: ${entity.entityType}`);
      }

      const finalScore = res.score + symbolBonus + pathBonus + typeBonus;

      candidates.push({
        entity,
        finalScore,
        bm25Score: res.score,
        symbolBonus,
        pathBonus,
        typeBonus,
        matchReasons: reasons
      });
    }

    candidates.sort((a, b) => b.finalScore - a.finalScore);
    return candidates;
  }
}
