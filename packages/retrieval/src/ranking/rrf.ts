import type { SearchMatchType } from "@repolens/shared";

export interface RankedCandidate {
  id: string; // Typically chunkId
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface FusionResult<T extends RankedCandidate = RankedCandidate> {
  item: T;
  rrfScore: number;
  vectorRank?: number;
  lexicalRank?: number;
  matchType: SearchMatchType;
}

export interface RrfOptions {
  k?: number; // Smoothing constant, standard default is 60
  vectorWeight?: number;
  lexicalWeight?: number;
}

export class ReciprocalRankFusion {
  private readonly k: number;
  private readonly vectorWeight: number;
  private readonly lexicalWeight: number;

  constructor(options: RrfOptions = {}) {
    this.k = options.k ?? 60;
    this.vectorWeight = options.vectorWeight ?? 1.0;
    this.lexicalWeight = options.lexicalWeight ?? 1.0;
  }

  /**
   * Merges vector ranked results and lexical ranked results using RRF formula:
   * score(d) = sum( weight / (k + rank) )
   */
  public fuse<T extends RankedCandidate>(
    vectorResults: T[],
    lexicalResults: T[]
  ): FusionResult<T>[] {
    const candidateMap = new Map<
      string,
      {
        item: T;
        vectorRank?: number;
        lexicalRank?: number;
        rrfScore: number;
      }
    >();

    // 1. Process vector results (1-indexed ranks)
    vectorResults.forEach((item, index) => {
      const rank = index + 1;
      const contribution = this.vectorWeight / (this.k + rank);
      candidateMap.set(item.id, {
        item,
        vectorRank: rank,
        rrfScore: contribution
      });
    });

    // 2. Process lexical results (1-indexed ranks)
    lexicalResults.forEach((item, index) => {
      const rank = index + 1;
      const contribution = this.lexicalWeight / (this.k + rank);
      const existing = candidateMap.get(item.id);

      if (existing) {
        existing.lexicalRank = rank;
        existing.rrfScore += contribution;
      } else {
        candidateMap.set(item.id, {
          item,
          lexicalRank: rank,
          rrfScore: contribution
        });
      }
    });

    // 3. Classify matchType and sort by descending rrfScore
    const results: FusionResult<T>[] = [];
    for (const entry of candidateMap.values()) {
      let matchType: SearchMatchType = "hybrid";
      if (entry.vectorRank !== undefined && entry.lexicalRank !== undefined) {
        matchType = "hybrid";
      } else if (entry.vectorRank !== undefined) {
        matchType = "vector";
      } else {
        matchType = "lexical";
      }

      results.push({
        item: entry.item,
        rrfScore: Number(entry.rrfScore.toFixed(6)),
        vectorRank: entry.vectorRank,
        lexicalRank: entry.lexicalRank,
        matchType
      });
    }

    return results.sort((a, b) => b.rrfScore - a.rrfScore);
  }
}
