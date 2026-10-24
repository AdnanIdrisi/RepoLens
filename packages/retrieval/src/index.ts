/**
 * @repolens/retrieval
 * AST-aware chunking, embeddings, lexical & vector search, hybrid RRF ranking.
 */
export const RETRIEVAL_VERSION = "0.1.0";

// Chunking
export * from "./chunking/chunker.interface.js";
export * from "./chunking/structural-chunker.js";

// Embeddings
export * from "./embeddings/embedding-provider.interface.js";
export * from "./embeddings/mock-embedding.provider.js";
export * from "./embeddings/gemini-embedding.provider.js";

// Ranking
export * from "./ranking/rrf.js";
export * from "./ranking/deduplicator.js";
export * from "./ranking/similarity.js";
