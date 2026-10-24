# RepoLens Architecture Overview

## Monorepo Layout
- `apps/web`: React 18, Vite, Tailwind CSS, React Flow client.
- `apps/api`: Node.js, Express, TypeScript, Zod, Mongoose API server.
- `packages/shared`: Centralized Zod schemas, TypeScript types, and domain constants.
- `packages/code-analyzer`: Tree-sitter AST parsing, declaration extractors, import/symbol resolvers.
- `packages/graph-engine`: In-memory graph builder, adjacency structures, BFS/DFS traversal, static flow tracing, impact analysis.
- `packages/retrieval`: Code chunking, embeddings provider, lexical & vector search, hybrid RRF ranking.
- `workers/indexing-worker`: Asynchronous background worker for large repo indexing jobs.
- `fixtures/`: Deterministic test repositories covering Express, TypeScript, CommonJS, and syntax edge cases.
- `tests/`: Integration, security (prompt injection, path traversal), and retrieval benchmarks.

## Product Principles
1. Deterministic analysis first; LLM reasoning second.
2. Every index is tied to an exact commit SHA and analyzer configuration.
3. Every graph edge has a relationship type and source evidence.
4. Every AI claim about implementation behavior should cite source locations.
5. Repository source is untrusted input.
6. The agent is read-only and bounded.
