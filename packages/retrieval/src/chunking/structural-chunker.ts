import crypto from "node:crypto";
import type { CodeChunk } from "@repolens/shared";
import type { FileAnalysisResult } from "@repolens/code-analyzer";
import type { Chunker, ChunkOptions } from "./chunker.interface.js";

const DEFAULT_MAX_CHUNK_LINES = 100;
const DEFAULT_MIN_CHUNK_LINES = 3;
const DEFAULT_CHUNKER_VERSION = "1.0.0";

export class StructuralChunker implements Chunker {
  /**
   * Generates structural code chunks aligned to AST symbols (functions, classes, routes)
   * or bounded logical windows.
   */
  public chunkFile(
    fileAnalysis: FileAnalysisResult,
    fileContent: string,
    repositoryId: string,
    commitSha: string,
    options: ChunkOptions = {}
  ): CodeChunk[] {
    const maxLines = options.maxChunkLines ?? DEFAULT_MAX_CHUNK_LINES;
    const minLines = options.minChunkLines ?? DEFAULT_MIN_CHUNK_LINES;
    const version = options.chunkerVersion ?? DEFAULT_CHUNKER_VERSION;

    const lines = fileContent.split(/\r?\n/);
    const totalLines = lines.length;
    const chunks: CodeChunk[] = [];
    const coveredLineRanges: Array<[number, number]> = [];

    // 1. Chunk AST-extracted symbols (functions, methods, classes, routes)
    // Sort symbols by startLine ascending, then larger span first
    const sortedSymbols = [...fileAnalysis.symbols].sort((a, b) => {
      if (a.startLine !== b.startLine) return a.startLine - b.startLine;
      return (b.endLine - b.startLine) - (a.endLine - a.startLine);
    });

    for (const sym of sortedSymbols) {
      const start = Math.max(1, sym.startLine);
      const end = Math.min(totalLines, sym.endLine);
      if (end < start) continue;

      const symbolLineSpan = end - start + 1;

      if (symbolLineSpan <= maxLines) {
        // Fits in a single structural chunk
        const chunkText = lines.slice(start - 1, end).join("\n");
        if (chunkText.trim().length > 0) {
          chunks.push(
            this.createChunk({
              repositoryId,
              commitSha,
              filePath: fileAnalysis.filePath,
              symbolId: sym.symbolId,
              startLine: start,
              endLine: end,
              text: chunkText,
              version
            })
          );
          coveredLineRanges.push([start, end]);
        }
      } else {
        // Exceeds max lines: split into overlapping sub-chunks
        const windowSize = maxLines;
        const overlap = Math.floor(maxLines * 0.2); // 20% overlap
        const step = Math.max(1, windowSize - overlap);

        for (let windowStart = start; windowStart <= end; windowStart += step) {
          const windowEnd = Math.min(end, windowStart + windowSize - 1);
          const chunkText = lines.slice(windowStart - 1, windowEnd).join("\n");
          if (chunkText.trim().length > 0) {
            chunks.push(
              this.createChunk({
                repositoryId,
                commitSha,
                filePath: fileAnalysis.filePath,
                symbolId: sym.symbolId,
                startLine: windowStart,
                endLine: windowEnd,
                text: chunkText,
                version
              })
            );
          }
          if (windowEnd >= end) break;
        }
        coveredLineRanges.push([start, end]);
      }
    }

    // 2. Fallback / Uncovered sections (e.g. top-level logic, file preamble, or files with no symbols)
    // If the file has no symbols, or has uncovered sections >= minLines
    if (chunks.length === 0) {
      // Chunk whole file into bounded windows
      for (let start = 1; start <= totalLines; start += maxLines) {
        const end = Math.min(totalLines, start + maxLines - 1);
        const chunkText = lines.slice(start - 1, end).join("\n");
        if (chunkText.trim().length >= minLines || totalLines <= minLines) {
          chunks.push(
            this.createChunk({
              repositoryId,
              commitSha,
              filePath: fileAnalysis.filePath,
              startLine: start,
              endLine: end,
              text: chunkText,
              version
            })
          );
        }
      }
    } else {
      // Check for leading uncovered preamble (lines 1 to first symbol start)
      const firstSymbolStart = sortedSymbols[0]?.startLine ?? 1;
      if (firstSymbolStart > minLines + 1) {
        const preambleEnd = firstSymbolStart - 1;
        const preambleText = lines.slice(0, preambleEnd).join("\n");
        if (preambleText.trim().length > 0) {
          chunks.push(
            this.createChunk({
              repositoryId,
              commitSha,
              filePath: fileAnalysis.filePath,
              startLine: 1,
              endLine: preambleEnd,
              text: preambleText,
              version
            })
          );
        }
      }
    }

    return chunks;
  }

  private createChunk(params: {
    repositoryId: string;
    commitSha: string;
    filePath: string;
    symbolId?: string;
    startLine: number;
    endLine: number;
    text: string;
    version: string;
  }): CodeChunk {
    const contentHash = crypto.createHash("sha256").update(params.text).digest("hex");
    const idSuffix = params.symbolId
      ? `${params.symbolId}:L${params.startLine}-${params.endLine}`
      : `L${params.startLine}-${params.endLine}`;
    const chunkId = `${params.filePath}#${idSuffix}`;

    return {
      repositoryId: params.repositoryId,
      commitSha: params.commitSha,
      chunkId,
      filePath: params.filePath,
      symbolId: params.symbolId,
      text: params.text,
      startLine: params.startLine,
      endLine: params.endLine,
      contentHash,
      chunkerVersion: params.version
    };
  }
}
