# RepoLens

> **AI-Powered Code Intelligence Platform**
> Deterministic static analysis, interactive architecture graphs, static execution flow tracing, zero-embedding hybrid code search, change impact analysis, and grounded AI pair-investigation.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-yellow.svg)](https://vitest.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## Overview

RepoLens is a full-stack code intelligence platform designed to help software engineers rapidly comprehend unfamiliar codebases, locate relevant implementation details, trace request lifecycles, safely investigate architectural questions, and assess the blast radius of proposed code edits.

Built on the principle of **"Deterministic Static Analysis First, AI Reasoning Second"**, RepoLens extracts structural code relationships through Tree-sitter AST parsing and indexes code with an **embedding-free Okapi BM25 + AST graph retrieval engine**, providing concrete evidence and verified source citations for every claim.

```mermaid
flowchart TD
    subgraph Frontend ["Web Client (React 18 + Vite + Light/Dark UI)"]
        DashUI["Repository Overview & File Explorer"]
        GraphUI["Code Relationship Graph"]
        SearchUI["Code Search (Hybrid / AST / BM25)"]
        TraceUI["Static Flow Tracing"]
        AgentUI["Gemini AI Agent"]
        ImpactUI["Change Impact Analysis"]
    end

    subgraph API ["Backend API Server (Express + TypeScript)"]
        Gateway["Rate Limiting & Security Guards"]
        Auth["Auth & Ownership Checks"]
        RepoService["Repository & Ingestion Pipeline"]
        EngineServices["Graph, Tracing & Impact Services"]
        RetrievalService["Okapi BM25 + AST Retrieval"]
        AgentService["Gemini Tool-Calling Agent"]
    end

    subgraph Engines ["Modular Core Packages & Worker"]
        Analyzer["@repolens/code-analyzer\n(Tree-sitter AST & Resolvers)"]
        GraphEngine["@repolens/graph-engine\n(Flow Tracer & Impact Analyzer)"]
        Retrieval["@repolens/retrieval\n(AST Chunking, BM25 & RRF)"]
        Worker["indexing-worker\n(Persistent Job Polling Daemon)"]
    end

    subgraph Storage ["Database & External Services"]
        Mongo[(MongoDB)]
        GitHubAPI["GitHub API"]
        GeminiAPI["Google Gemini"]
    end

    Frontend --> Gateway
    Gateway --> Auth
    Auth --> RepoService
    Auth --> EngineServices
    Auth --> RetrievalService
    Auth --> AgentService

    RepoService --> Analyzer
    Worker --> Analyzer
    EngineServices --> GraphEngine
    RetrievalService --> Retrieval
    AgentService --> GeminiAPI
    RepoService --> GitHubAPI
    Worker --> GitHubAPI

    RepoService --> Mongo
    Worker --> Mongo
    EngineServices --> Mongo
    RetrievalService --> Mongo
```

---

## Core Features

### Minimalist Dual-Theme Workspace (Light & Dark Mode)
- Clean SaaS workspace with a slim icon rail, top navigation bar, joined hairline KPI strip, and a persistent **Light / Dark** theme toggle (`localStorage` backed).
- Typography built with **Plus Jakarta Sans** (headings), **Inter** (UI), and **JetBrains Mono** (code, paths, and tabular metrics).

### P1.1 Code Relationship Graph
- Interactive visual exploration of files, functions, classes, methods, and routes powered by React Flow.
- Scoped neighborhood expansion (`1`, `2`, `3`, or `All` nodes) with a floating source/details inspector drawer.

### P1.2 Zero-Embedding Code Search
- Structural AST-aligned code chunking preserves function, method, and class semantic boundaries.
- Deterministic **Okapi BM25** lexical + AST symbol retrieval with query expansion and Reciprocal Rank Fusion ($k=60$) — zero vector embedding API latency or cost.

### P1.3 Static Execution Flow Tracing
- Automatically discovers Express, Nest, and Fastify HTTP routes.
- Statically traces the end-to-end execution chain: **Route Definition → Middlewares → Controller → Service → Model**.

### P1.4 Gemini AI Agent with Read-Only Tools
- Investigates codebases via SSE streaming using 7 sandboxed read-only tools: `readFile`, `searchCode`, `findReferences`, `getFileGraph`, `traceExecutionFlow`, `analyzeImpact`, `getRepositorySummary`.
- Multi-turn tool execution loop with strict 5-turn budget guardrails and verifiable `[file:line-range]` source citations.

### P1.5 Change Impact Analysis
- Reverse dependency graph traversal identifies the full blast radius of modifying a file or symbol.
- Categorizes Layer-1 direct dependents, Layer-2+ transitive callers, and suggested test suites with explainable dependency paths.

### Incremental Indexing & Persistent Worker
- Multi-stage ingestion pipeline (`validate` → `resolve` → `discover` → `filter` → `discovered`) executed by a persistent background polling worker (`repolens-indexing-worker`) with graceful shutdown.
- Git tree blob SHA differencing updates only modified files, preserving prior index integrity on failure.

---

## Monorepo Layout

```
repolens/
├── apps/
│   ├── api/                    # Express REST API, auth & security middleware, controllers
│   └── web/                    # React 18, Vite, Tailwind CSS (Light/Dark), React Flow UI
├── packages/
│   ├── shared/                 # Central Zod schemas, TypeScript contracts, domain constants
│   ├── code-analyzer/          # Tree-sitter parsers, extractors, import/symbol resolvers
│   ├── graph-engine/           # In-memory graph structure, flow tracer, impact analyzer
│   └── retrieval/              # AST chunking, Okapi BM25 scorer, reciprocal rank fusion
├── workers/
│   └── indexing-worker/        # Persistent background worker for asynchronous ingestion
├── fixtures/                   # Deterministic test repositories covering common patterns
├── docs/                       # Architecture, Security threat model, and API documentation
└── docker-compose.yml          # Multi-container orchestration (MongoDB, API, Web, Worker)
```

---

## Quick Start

### 1. Prerequisites
- **Node.js:** `>= 20.x LTS`
- **npm:** `>= 10.x`
- **Docker:** For running MongoDB or the full production stack

### 2. Configure Environment
Copy the environment template:
```bash
cp .env.example .env
```
Populate your environment variables:
```ini
PORT=4000
MONGODB_URI=mongodb://localhost:27017/repolens
WEB_ORIGIN=http://localhost:5173
GITHUB_TOKEN=ghp_your_github_token_here    # Recommended: increases GitHub API quota from 60 to 5,000 req/hr
GEMINI_API_KEY=your_gemini_api_key_here    # Required for the Gemini AI Agent
```

### 3. Start Local MongoDB & Run Dev Servers
```bash
docker compose up -d mongodb
npm install
npm run build
```
In separate terminals:
```bash
# Terminal 1: Backend API (port 4000)
npm run dev:api

# Terminal 2: Frontend Web UI (port 5173)
npm run dev:web
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Docker Production Deployment

To run the complete stack (`repolens-mongodb`, `repolens-api`, `repolens-indexing-worker`, `repolens-web`) in containers:

```bash
docker compose up --build -d
```
- Web Application: [http://localhost:5173](http://localhost:5173)
- API Gateway & Health: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## Testing & Quality Assurance

```bash
# Run unit & integration test suites across all workspaces
npm test

# Run strict TypeScript typechecks across all workspaces
npm run typecheck
```

---

## Documentation
- [Architecture Overview & Principles](docs/architecture.md)
- [REST API Specification](docs/api.md)
- [Security Threat Model & Defense](docs/security.md)

---

## License
MIT © 2026 RepoLens Team.
