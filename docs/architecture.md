# RepoLens Architecture Overview

RepoLens is an AI-powered code intelligence platform designed for deterministic codebase analysis, interactive architecture visualization, execution flow tracing, semantic code search, and grounded AI pair-investigation.

```mermaid
flowchart TD
    subgraph Client ["Client (React 18 + Vite)"]
        UI[Web Interface]
        GraphUI[Interactive Graph View]
        SearchUI[Hybrid Search View]
        TraceUI[Execution Flow View]
        AgentUI[Gemini Chat View]
        ImpactUI[Change Impact View]
    end

    subgraph API ["API Server (Express + TypeScript)"]
        Router[API Gateway & Rate Limiter]
        Auth[Auth & Ownership Guard]
        RepoModule[Repository & Ingestion]
        GraphModule[Graph Service]
        RetrievalModule[Hybrid Retrieval Engine]
        TracingModule[Flow Tracing Service]
        ImpactModule[Impact Analysis Engine]
        AgentModule[Gemini Agent Service]
    end

    subgraph Engine ["Core Engine Packages"]
        CodeAnalyzer["@repolens/code-analyzer\n(Tree-sitter AST & Resolvers)"]
        GraphEngine["@repolens/graph-engine\n(Graph Traversal, Tracing & Impact)"]
        RetrievalPkg["@repolens/retrieval\n(Chunking, Embeddings, RRF)"]
    end

    subgraph Data ["Persistence Layer"]
        MongoDB[(MongoDB Database)]
        VectorIndex[(Vector Search / Atlas)]
    end

    subgraph External ["External Services"]
        GitHub[GitHub REST / GraphQL API]
        Gemini[Google Gemini API]
    end

    UI --> Router
    Router --> Auth
    Auth --> RepoModule
    Auth --> GraphModule
    Auth --> RetrievalModule
    Auth --> TracingModule
    Auth --> ImpactModule
    Auth --> AgentModule

    RepoModule --> CodeAnalyzer
    GraphModule --> GraphEngine
    TracingModule --> GraphEngine
    ImpactModule --> GraphEngine
    RetrievalModule --> RetrievalPkg

    RepoModule --> GitHub
    RetrievalPkg --> Gemini
    AgentModule --> Gemini

    RepoModule --> MongoDB
    GraphModule --> MongoDB
    RetrievalModule --> VectorIndex
    AgentModule --> MongoDB
```

---

## 1. Monorepo Structure

```
repolens/
├── apps/
│   ├── api/                      # Express REST API, auth guards, controllers
│   └── web/                      # React 18, Vite, Tailwind, React Flow UI
├── packages/
│   ├── shared/                   # Domain schemas (Zod), shared types, constants
│   ├── code-analyzer/            # Tree-sitter AST parsing, declaration extractors, resolvers
│   ├── graph-engine/             # In-memory graph builder, BFS/DFS traversal, flow tracer, impact analyzer
│   └── retrieval/                # Structural chunking, embeddings, RRF ranking
├── workers/
│   └── indexing-worker/          # Background worker for async repository ingestion
├── docs/                         # Architecture, security, and API documentation
└── fixtures/                     # Deterministic test repositories
```

---

## 2. Core Architectural Principles

1. **Deterministic Static Analysis First, AI Second:** All relations (imports, calls, inheritance, route definitions) are resolved via tree-sitter AST parsing and symbol resolution prior to invoking AI models.
2. **Strict Citation Grounding:** The Gemini AI agent is equipped with read-only investigation tools (`readFile`, `searchCode`, `traceExecutionFlow`, `analyzeImpact`, etc.) and must cite exact file ranges (`[file:line-range]`).
3. **Multi-Stage Ingestion Pipeline:** Ingestion executes in discrete stages (`validate` → `resolve` → `discover` → `filter` → `graph` → `chunks` → `routes` → `publish`) with atomic version updates to prevent dirty state.
4. **Incremental Commit Differencing:** Ingestion compares Git tree blob SHAs between revisions, only re-parsing and re-indexing modified or newly added files.
5. **Untrusted Code Security:** Repositories are analyzed purely statically without executing code, installing dependencies, or running build scripts.

---

## 3. Data Flow & Subsystems

### P1.1 Code Relationship Graph
- Parses AST import statements and exports.
- Builds file-to-file and symbol-to-symbol directed edges.
- Supports scoped neighborhood retrieval with clamped BFS depth.

### P1.2 Semantic & Hybrid Code Search
- Chunks source code aligned to AST structural boundaries (functions, classes, methods, routes).
- Computes 768-dimensional embeddings via Google Gemini with deterministic offline fallback.
- Merges lexical keyword matches and cosine vector similarities using Reciprocal Rank Fusion ($k=60$).

### P1.3 Static Execution Flow Tracing
- Discovers HTTP routes (`GET`, `POST`, `PUT`, `DELETE`, etc.).
- Traces execution chain: Route Definition → Middlewares → Controller → Service → Database Model.
- Bounded traversal with cycle detection.

### P1.4 Gemini AI Agent with Read-Only Tools
- Investigates codebases using 7 structured read-only tools.
- Multi-turn function calling with budget enforcement (max 5 iterations per turn).
- Cites verifiable source locations.

### P1.5 Change Impact Analysis
- Reverse dependency graph traversal.
- Computes Layer-1 directly affected symbols, Layer-2+ transitive callers, and companion test suites.
- Emits explainable traversal paths.
