# RepoLens

> AI-Powered Code Intelligence Platform

RepoLens helps developers understand unfamiliar codebases, locate relevant implementation details, trace likely request flows, ask grounded questions, and estimate the impact of changing files or symbols.

## Core Features
- **P1.1 Code Relationship Graph:** Visualizes files, symbols, imports, calls, routes, and services with source navigation.
- **P1.2 Semantic Code Search:** Natural-language and exact-identifier hybrid code retrieval.
- **P1.3 Static Execution Flow Tracing:** Statically traces Express routes across middlewares, handlers, and services.
- **P1.4 Gemini AI Agent:** Read-only, bounded assistant investigating repositories via structured code tools.
- **P1.5 Change Impact Analysis:** Computes direct and indirect dependencies with explainable traversal paths.

## Monorepo Structure
```
repolens/
├── apps/
│   ├── web/               # React, Vite, Tailwind, React Flow
│   └── api/               # Express, TypeScript, Zod, Mongoose
├── packages/
│   ├── shared/            # Zod schemas, types, constants
│   ├── code-analyzer/     # Tree-sitter parsers, extractors, resolvers
│   ├── graph-engine/      # In-memory graph traversals & tracing
│   └── retrieval/         # Chunking, vector & lexical search
├── workers/
│   └── indexing-worker/   # Async background indexing pipeline
├── fixtures/              # Sample test repositories
├── tests/                 # Integration, security, and benchmark tests
└── docs/                  # Architecture, data model, and API documentation
```

## Quick Start

### 1. Prerequisites
- Node.js >= 20 (LTS recommended)
- npm >= 10
- Docker (optional for local MongoDB) or MongoDB Atlas

### 2. Environment Setup
Copy the environment template:
```bash
cp .env.example .env
```
Fill in your credentials:
- `MONGODB_URI`: Local MongoDB (`mongodb://localhost:27017/repolens`) or Atlas connection string.
- `GITHUB_TOKEN`: Optional (raises GitHub rate limit from 60/hr to 5,000/hr).
- `GEMINI_API_KEY`: Required for semantic search and AI agent modules.

### 3. Local MongoDB (via Docker)
To start a local MongoDB instance:
```bash
docker compose up -d
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Running the Application
Run API server (default port 4000):
```bash
npm run dev:api
```
Run Web frontend (default port 5173):
```bash
npm run dev:web
```

### 6. Running Tests & Typechecks
```bash
npm run test
npm run typecheck
```
