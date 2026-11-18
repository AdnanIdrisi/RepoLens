import type { CodeEntity, AgentCitation } from "@repolens/shared";
import { TraversalCandidate } from "../traversal/graph-traverser.js";
import { RankedCodeCandidate } from "../ranking/candidate-ranker.js";

export interface AssembledContext {
  formattedContext: string;
  citations: AgentCitation[];
  totalCharacters: number;
  estimatedTokens: number;
  includedEntitiesCount: number;
}

export interface ContextAssemblerOptions {
  maxCharacters?: number; // e.g. 24000 (~6000 tokens)
  maxEntities?: number;   // e.g. 10
}

export class ContextAssembler {
  /**
   * Assembles, deduplicates, and formats evidence blocks within a strict token budget.
   */
  public static assemble(
    rankedCandidates: RankedCodeCandidate[],
    traversedCandidates: TraversalCandidate[] = [],
    options: ContextAssemblerOptions = {}
  ): AssembledContext {
    const {
      maxCharacters = 24000,
      maxEntities = 12
    } = options;

    const includedEntities: {
      entity: CodeEntity;
      relationNote: string;
      score?: number;
    }[] = [];

    const seenEntityIds = new Set<string>();

    // 1. First add top ranked primary candidates
    for (const cand of rankedCandidates) {
      if (!seenEntityIds.has(cand.entity.entityId)) {
        seenEntityIds.add(cand.entity.entityId);
        includedEntities.push({
          entity: cand.entity,
          relationNote: `Primary Match (Score: ${cand.finalScore.toFixed(2)}${cand.matchReasons.length > 0 ? " | " + cand.matchReasons[0] : ""})`,
          score: cand.finalScore
        });
      }
      if (includedEntities.length >= maxEntities) break;
    }

    // 2. Add supporting candidates from graph traversal
    for (const trav of traversedCandidates) {
      if (!trav.isPrimarySeed && !seenEntityIds.has(trav.entity.entityId)) {
        seenEntityIds.add(trav.entity.entityId);
        const rel = trav.relation ? `${trav.relation} from ${trav.sourceSeedName || "seed"}` : "Supporting Entity";
        includedEntities.push({
          entity: trav.entity,
          relationNote: `Supporting (Hop ${trav.hopDistance}: ${rel})`
        });
      }
      if (includedEntities.length >= maxEntities) break;
    }

    // 3. Deduplicate overlapping line ranges in the same file
    const deduplicated = this.deduplicateEntities(includedEntities);

    // 4. Format blocks within character budget
    const blocks: string[] = [];
    const citations: AgentCitation[] = [];
    let currentLength = 0;

    for (let i = 0; i < deduplicated.length; i++) {
      const item = deduplicated[i];
      const { entity, relationNote } = item;

      const header = `[EVIDENCE ${i + 1}] File: ${entity.filePath} (Lines ${entity.startLine}-${entity.endLine}) | Kind: ${entity.entityType} | Symbol: ${entity.entityName}\nContext: ${relationNote}\n`;
      const codeBlock = `\`\`\`\n${entity.code.trim()}\n\`\`\`\n`;
      const fullBlock = `${header}${codeBlock}\n`;

      if (blocks.length > 0 && currentLength + fullBlock.length > maxCharacters) {
        break; // Exceeded budget
      }

      // If even the first block exceeds maxCharacters, truncate its code cleanly
      let effectiveBlock = fullBlock;
      if (effectiveBlock.length > maxCharacters) {
        const allowedSnippetLen = Math.max(50, maxCharacters - header.length - 20);
        const truncatedCode = entity.code.trim().slice(0, allowedSnippetLen) + "\n// ... [truncated to fit token budget]";
        effectiveBlock = `${header}\`\`\`\n${truncatedCode}\n\`\`\`\n`;
      }

      blocks.push(effectiveBlock);
      currentLength += effectiveBlock.length;

      citations.push({
        filePath: entity.filePath,
        startLine: entity.startLine,
        endLine: entity.endLine,
        snippet: entity.code.slice(0, 200)
      });
    }

    const formattedContext = blocks.join("\n");
    const estimatedTokens = Math.ceil(currentLength / 4);

    return {
      formattedContext,
      citations,
      totalCharacters: currentLength,
      estimatedTokens,
      includedEntitiesCount: blocks.length
    };
  }

  /**
   * Deduplicates entities that share the same file and overlapping line ranges.
   */
  private static deduplicateEntities(
    items: { entity: CodeEntity; relationNote: string; score?: number }[]
  ): { entity: CodeEntity; relationNote: string; score?: number }[] {
    const byFile = new Map<string, { entity: CodeEntity; relationNote: string; score?: number }[]>();

    for (const item of items) {
      if (!byFile.has(item.entity.filePath)) {
        byFile.set(item.entity.filePath, []);
      }
      byFile.get(item.entity.filePath)!.push(item);
    }

    const results: { entity: CodeEntity; relationNote: string; score?: number }[] = [];

    for (const [, fileItems] of byFile.entries()) {
      // Sort by startLine
      fileItems.sort((a, b) => a.entity.startLine - b.entity.startLine);

      for (const item of fileItems) {
        const overlap = results.find(
          (existing) =>
            existing.entity.filePath === item.entity.filePath &&
            !(item.entity.endLine < existing.entity.startLine || item.entity.startLine > existing.entity.endLine)
        );

        if (!overlap) {
          results.push(item);
        } else {
          // If the new one is larger or primary, keep the most comprehensive one
          if (item.entity.code.length > overlap.entity.code.length) {
            const idx = results.indexOf(overlap);
            results[idx] = item;
          }
        }
      }
    }

    return results;
  }
}
