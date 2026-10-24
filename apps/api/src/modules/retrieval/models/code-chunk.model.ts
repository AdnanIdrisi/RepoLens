import mongoose, { Document, Schema } from "mongoose";
import type { CodeChunk } from "@repolens/shared";

export interface CodeChunkDocument extends Document, Omit<CodeChunk, "chunkId"> {
  chunkId: string;
  symbolName?: string;
  symbolKind?: string;
  language: string;
}

const CodeChunkSchema = new Schema<CodeChunkDocument>(
  {
    repositoryId: { type: String, required: true, index: true },
    commitSha: { type: String, required: true, index: true },
    chunkId: { type: String, required: true },
    filePath: { type: String, required: true, index: true },
    symbolId: { type: String, index: true },
    symbolName: { type: String, index: true },
    symbolKind: { type: String, index: true },
    language: { type: String, default: "typescript" },
    text: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    contentHash: { type: String, required: true },
    chunkerVersion: { type: String, default: "1.0.0" },
    embeddingModel: { type: String },
    embedding: { type: [Number], default: undefined }
  },
  {
    timestamps: true,
    collection: "code_chunks"
  }
);

// Unique chunk per repo revision
CodeChunkSchema.index({ repositoryId: 1, commitSha: 1, chunkId: 1 }, { unique: true });

// Compound query indexes
CodeChunkSchema.index({ repositoryId: 1, commitSha: 1, filePath: 1 });
CodeChunkSchema.index({ repositoryId: 1, commitSha: 1, symbolKind: 1 });

// Lexical text search index
CodeChunkSchema.index(
  { text: "text", filePath: "text", symbolName: "text" },
  { weights: { symbolName: 10, filePath: 5, text: 1 }, name: "code_chunks_text_index" }
);

export const CodeChunkModel = mongoose.model<CodeChunkDocument>("CodeChunk", CodeChunkSchema);
