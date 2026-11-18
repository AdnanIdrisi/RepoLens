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
export * from "./ranking/candidate-ranker.js";

// BM25 & Tokenization (Embedding-free lexical retrieval)
export * from "./bm25/code-tokenizer.js";
export * from "./bm25/bm25.engine.js";

// Query Expansion
export * from "./query/query-expander.js";

// Relationship Traversal
export * from "./traversal/graph-traverser.js";

// Context Assembly & Token Budgeting
export * from "./context/context-assembler.js";
