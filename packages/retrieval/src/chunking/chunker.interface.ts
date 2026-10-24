import type { CodeChunk } from "@repolens/shared";
import type { FileAnalysisResult } from "@repolens/code-analyzer";

export interface ChunkOptions {
  maxChunkLines?: number;
  minChunkLines?: number;
  chunkerVersion?: string;
}

export interface Chunker {
  chunkFile(
    fileAnalysis: FileAnalysisResult,
    fileContent: string,
    repositoryId: string,
    commitSha: string,
    options?: ChunkOptions
  ): CodeChunk[];
}
