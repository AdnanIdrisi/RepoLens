import { describe, it, expect } from "vitest";
import { ReciprocalRankFusion } from "./rrf.js";
import { SnippetDeduplicator } from "./deduplicator.js";
import { cosineSimilarity } from "./similarity.js";

describe("Ranking Utilities", () => {
  describe("ReciprocalRankFusion", () => {
    it("combines vector and lexical results and prioritizes items appearing in both", () => {
      const rrf = new ReciprocalRankFusion({ k: 60 });

      const vectorItems = [
        { id: "chunk-A" },
        { id: "chunk-B" },
        { id: "chunk-C" }
      ];

      const lexicalItems = [
        { id: "chunk-D" },
        { id: "chunk-A" }, // Appears in both!
        { id: "chunk-E" }
      ];

      const fused = rrf.fuse(vectorItems, lexicalItems);

      expect(fused.length).toBe(5);
      // chunk-A is in both top ranks: rank 1 in vector, rank 2 in lexical
      // Score = 1/(60+1) + 1/(60+2) = 0.01639 + 0.01613 = 0.03252
      expect(fused[0].item.id).toBe("chunk-A");
      expect(fused[0].matchType).toBe("hybrid");
      expect(fused[0].vectorRank).toBe(1);
      expect(fused[0].lexicalRank).toBe(2);
    });

    it("correctly assigns vector-only and lexical-only match types", () => {
      const rrf = new ReciprocalRankFusion();
      const fused = rrf.fuse([{ id: "vec-1" }], [{ id: "lex-1" }]);

      const vec = fused.find((f) => f.item.id === "vec-1");
      const lex = fused.find((f) => f.item.id === "lex-1");

      expect(vec?.matchType).toBe("vector");
      expect(lex?.matchType).toBe("lexical");
    });
  });

  describe("SnippetDeduplicator", () => {
    const dedup = new SnippetDeduplicator();

    it("removes candidates that heavily overlap in the same file", () => {
      const items = [
        { filePath: "src/user.ts", startLine: 10, endLine: 30, id: "parent" },
        { filePath: "src/user.ts", startLine: 12, endLine: 28, id: "child" }, // 100% inside parent -> duplicate
        { filePath: "src/user.ts", startLine: 50, endLine: 70, id: "distinct" },
        { filePath: "src/auth.ts", startLine: 10, endLine: 30, id: "diff-file" }
      ];

      const result = dedup.deduplicate(items, 0.6);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual(["parent", "distinct", "diff-file"]);
    });
  });

  describe("cosineSimilarity", () => {
    it("computes exact 1.0 for identical vectors and 0 for orthogonal vectors", () => {
      expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0, 5);
      expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0, 5);
      expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0, 5);
    });
  });
});
