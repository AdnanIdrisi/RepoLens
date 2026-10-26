# RepoLens --- Complete End-to-End Implementation Plan

**Project type:** AI-powered code intelligence platform\
**Primary languages analyzed:** JavaScript, JSX, TypeScript, TSX\
**Repository source for v1:** Public GitHub repositories\
**AI provider:** Google Gemini API\
**Frontend:** React, TypeScript, Vite\
**Backend:** Node.js, Express, TypeScript\
**Database:** MongoDB\
**Parser:** Tree-sitter, supplemented by TypeScript compiler APIs where
appropriate\
**Graph UI:** React Flow\
**Semantic retrieval:** MongoDB Atlas Vector Search plus lexical search\
**Testing:** Vitest, Supertest, Playwright\
**Initial schedule:** Approximately 16 weeks at 8--12 hours per week;
adjust based on results

------------------------------------------------------------------------

## Table of Contents

1.  Product vision and scope
2.  Product principles and success criteria
3.  Technology choices and rationale
4.  System architecture
5.  Monorepo structure
6.  Data model and indexes
7.  API design
8.  Module 0 --- Project foundation
9.  Module 1 --- GitHub ingestion
10. Module 2 --- Source storage and normalization
11. Module 3 --- Parser and symbol extraction
12. Module 4 --- Import and symbol resolution
13. Module 5 --- Shared graph engine
14. Module 6 --- P1.1 Code Relationship Graph
15. Module 7 --- P1.2 Semantic Code Search
16. Module 8 --- P1.3 Static Execution Flow Tracing
17. Module 9 --- P1.4 Gemini AI Agent with Tools
18. Module 10 --- P1.5 Change Impact Analysis
19. Module 11 --- Incremental indexing and reliability
20. Module 12 --- Security, performance, and deployment
21. Testing and evaluation strategy
22. Observability and operational requirements
23. Milestone schedule and exit criteria
24. Master implementation checklist
25. Common failure modes and decisions to avoid
26. Reference documentation

------------------------------------------------------------------------

# 1. Product Vision and Scope

RepoLens is a code intelligence platform that helps developers
understand an unfamiliar codebase, locate relevant implementation
details, trace likely request flows, ask questions grounded in source
code, and estimate the impact of changing files or symbols.

The five product features are:

-   **P1.1 Code Relationship Graph:** Visualize files, symbols, imports,
    calls, routes, middleware, services, and other relationships.
-   **P1.2 Semantic Code Search:** Find relevant code using
    natural-language queries and hybrid semantic/lexical retrieval.
-   **P1.3 Execution Flow Tracing:** Statically trace supported Express
    routes through middleware, handlers, calls, services, and
    recognizable data-access operations.
-   **P1.4 AI Agent with Tools:** Let Gemini investigate a repository by
    calling controlled search, read, reference, graph, trace, and impact
    tools.
-   **P1.5 Change Impact Analysis:** Identify direct and indirect
    dependencies of a changed file or symbol, explain dependency paths,
    and suggest areas to review.

These are not five separate analyzers. They are five interfaces over a
shared, versioned code intelligence index.

## 1.1 Version 1 scope

Support:

-   Public GitHub repositories.
-   JavaScript, JSX, TypeScript, and TSX.
-   ES module imports and exports.
-   CommonJS imports where practical.
-   File-level dependency graphs.
-   Extraction of functions, classes, methods, variables, and routes.
-   Basic cross-file symbol and call resolution.
-   Common Express route and middleware patterns.
-   Semantic and lexical code retrieval.
-   Read-only Gemini tool use.
-   File-level and progressively symbol-level impact analysis.
-   Evidence-backed source navigation.

## 1.2 Explicit non-goals for the first release

Do not promise:

-   Perfect resolution of every dynamic JavaScript call.
-   Exact runtime execution paths from static analysis alone.
-   Complete support for every framework or bundler.
-   Arbitrary execution of repository code.
-   Compiler-grade semantic resolution for every repository.
-   Automatic code modification by the agent.
-   Universal accuracy on monorepos with unusual build systems.

Unresolved relationships must be surfaced as diagnostics rather than
fabricated.

## 1.3 Core product principles

1.  Deterministic analysis first; LLM reasoning second.
2.  Every index is tied to an exact commit SHA and analyzer
    configuration.
3.  Every graph edge has a relationship type and, where possible, source
    evidence.
4.  Every AI claim about implementation behavior should cite source
    locations.
5.  Unknown and inferred relationships are explicitly labeled.
6.  Repository source is untrusted input.
7.  The agent is read-only and bounded.
8.  Correctness is evaluated using fixtures and benchmarks.
9.  Indexing jobs are idempotent and recoverable.
10. A repository is not marked ready until the required index stages
    have succeeded.

------------------------------------------------------------------------

# 2. Product Success Criteria

A feature is not complete merely because its screen exists.

## 2.1 Ingestion

-   Public repository URL is validated.
-   A specific commit SHA is recorded.
-   Files are discovered and filtered predictably.
-   API failures, rate limits, oversized repositories, and malformed
    inputs are handled.
-   Repeating the same job does not create uncontrolled duplicates.
-   Progress and diagnostics are available to the user.

## 2.2 Code analyzer and graph

-   Known fixture imports resolve correctly.
-   External imports are not misclassified as internal files.
-   Unresolved imports produce diagnostics.
-   Graph edges have stable direction semantics.
-   Source navigation opens the correct file and lines.
-   Cycles and large graphs are handled safely.

## 2.3 Semantic search

-   Queries retrieve relevant code even when words differ from source
    identifiers.
-   Exact identifier and route searches also work.
-   Results contain file paths, line ranges, snippets, and index
    revision.
-   A benchmark measures Recall@K and reciprocal rank.
-   Model and embedding costs are measured.

## 2.4 Flow tracing

-   Supported Express route registrations are discovered.
-   Resolvable handlers and calls are connected.
-   Trace steps have source evidence.
-   Cycles and traversal depth are bounded.
-   Dynamic and unresolved calls are visible as limitations.
-   The UI calls this static tracing, not guaranteed runtime execution.

## 2.5 AI agent

-   Tool calls are validated and executed only by the backend.
-   The model cannot access arbitrary files, shell commands, or
    arbitrary network operations.
-   Answers include real source citations.
-   Unsupported claims and prompt-injection behavior are evaluated.
-   Iterations, context, duration, and cost are bounded.

## 2.6 Impact analysis

-   Direct and indirect dependencies are distinguished.
-   Reverse traversal follows the documented edge semantics.
-   Every affected result has an explanation path.
-   Symbol-level results are used only where resolution supports them.
-   Suggested tests are not presented as executed tests.

------------------------------------------------------------------------

# 3. Technology Choices and Rationale

  -----------------------------------------------------------------------
  Layer                   Choice                  Role
  ----------------------- ----------------------- -----------------------
  Frontend                React, TypeScript, Vite Product UI

  Styling                 Tailwind CSS            Layout and styling

  Graph UI                React Flow              Interactive nodes,
                                                  edges, zoom, pan

  Backend                 Node.js, Express,       APIs and orchestration
                          TypeScript              

  Validation              Zod                     Runtime request and
                                                  environment validation

  Parsing                 Tree-sitter JS/TS/TSX   Syntax trees
                          grammars                

  Semantic resolution     Custom resolver;        Imports, exports,
                          TypeScript compiler     symbols, references
                          APIs where useful       

  Code intelligence       SCIP and existing       Potential
  protocol research       indexers                higher-quality
                                                  definition/reference
                                                  indexing

  Database                MongoDB                 Repository metadata and
                                                  derived records

  Vector retrieval        MongoDB Atlas Vector    Embedding search
                          Search                  

  Lexical retrieval       MongoDB text/search     Exact terms and
                          capabilities or an      identifiers
                          appropriate lexical     
                          index                   

  AI                      Google Gemini API       Tool-using agent and
                          through `@google/genai` explanations

  Tests                   Vitest, Supertest,      Unit, API, browser
                          Playwright              tests

  Worker                  Separate Node.js        Expensive indexing
                          process                 

  Queue                   MongoDB-backed initial  Retries, concurrency,
                          jobs; BullMQ/Redis when durable queueing
                          needed                  

  Deployment              React host,             Production operation
                          Node-compatible         
                          API/worker host,        
                          managed MongoDB         
  -----------------------------------------------------------------------

## 3.1 Parser architecture

Tree-sitter identifies syntax structures but does not automatically
resolve every cross-file reference. Keep separate modules for:

-   Parsing.
-   AST extraction.
-   Import resolution.
-   Export resolution.
-   Symbol identity.
-   Call resolution.
-   Graph generation.

Validate the exact Node.js runtime and Tree-sitter binding/grammar
package combination with a small proof of concept before depending on it
throughout the application. TSX should use the appropriate TSX grammar.

Consider TypeScript compiler APIs for repositories with valid TypeScript
configuration. Evaluate existing SCIP indexers for definition/reference
navigation before building a compiler-grade index from scratch.

## 3.2 Gemini architecture

Keep all Gemini calls behind an internal provider interface. Use the
official Google Gen AI SDK (`@google/genai`) and verify the current
recommended API, model availability, tool-calling behavior, and
streaming behavior during implementation.

The model proposes tool calls; the backend validates and executes them.
The model must never directly execute application code or access the
database.

## 3.3 Vector search

Do not generate embeddings until the structural index is working. Choose
a compatible embedding model, verify vector dimensions and token limits,
and store model/version metadata with embeddings. Use the same
compatible embedding configuration for query and document vectors.

Use hybrid retrieval because vector similarity alone is weak for some
exact code queries, identifiers, error codes, and route paths.

------------------------------------------------------------------------

# 4. System Architecture

``` text
Public GitHub repository
          |
          v
Repository registration and commit resolution
          |
          v
Indexing job / worker
          |
          v
File discovery, filtering, source retrieval
          |
          v
Tree-sitter parsing and declaration extraction
          |
          v
Import / export / symbol resolution
          |
          v
Versioned structural index
   |                         |
   v                         v
Graph nodes and edges     Code chunks and embeddings
   |                         |
   +------------+------------+
                |
                v
        Code intelligence service
     |         |        |          |
     v         v        v          v
    Graph    Search   Tracing    Impact
                |
                v
       Gemini tool-using agent
                |
                v
        React user interface
```

Start with one API process and one worker process. Do not prematurely
split every module into a separate network service.

## 4.1 Indexing pipeline stages

Recommended logical stages:

1.  `validate_repository`
2.  `resolve_commit`
3.  `discover_tree`
4.  `filter_files`
5.  `fetch_source`
6.  `normalize_source`
7.  `parse_source`
8.  `extract_symbols`
9.  `extract_imports_exports`
10. `resolve_modules`
11. `resolve_symbols`
12. `build_graph`
13. `build_chunks`
14. `generate_embeddings`
15. `validate_index`
16. `publish_index`

Each stage should record status, duration, counts, diagnostics, and
retryability. The initial implementation may combine some stages, but
keep the contracts logically separate.

## 4.2 Versioning

Every derived record should be scoped to:

-   Repository ID.
-   Commit SHA.
-   Analyzer version.
-   Relevant configuration version.
-   Embedding model/version where applicable.
-   Chunking version where applicable.

Never silently mix records from different commits or index
configurations.

------------------------------------------------------------------------

# 5. Monorepo Structure

``` text
repolens/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       ├── features/
│   │       │   ├── repositories/
│   │       │   ├── architecture/
│   │       │   ├── code-search/
│   │       │   ├── flow-tracing/
│   │       │   ├── ai-assistant/
│   │       │   └── impact-analysis/
│   │       ├── hooks/
│   │       ├── lib/
│   │       └── main.tsx
│   └── api/
│       └── src/
│           ├── config/
│           ├── middleware/
│           ├── database/
│           ├── modules/
│           │   ├── repositories/
│           │   ├── indexing/
│           │   ├── files/
│           │   ├── graph/
│           │   ├── search/
│           │   ├── tracing/
│           │   ├── impact/
│           │   └── agent/
│           ├── jobs/
│           └── server.ts
├── packages/
│   ├── code-analyzer/
│   │   └── src/
│   │       ├── parsers/
│   │       ├── extractors/
│   │       ├── resolvers/
│   │       ├── references/
│   │       ├── diagnostics/
│   │       └── index.ts
│   ├── graph-engine/
│   │   └── src/
│   │       ├── graph-builder.ts
│   │       ├── adjacency.ts
│   │       ├── traversal.ts
│   │       ├── trace/
│   │       └── impact.ts
│   ├── retrieval/
│   │   └── src/
│   │       ├── chunking/
│   │       ├── embeddings/
│   │       ├── search/
│   │       └── ranking/
│   └── shared/
│       └── src/
│           ├── schemas/
│           ├── types/
│           └── constants/
├── workers/
│   └── indexing-worker/
│       └── src/
│           ├── processors/
│           ├── stages/
│           └── worker.ts
├── fixtures/
│   ├── sample-express-app/
│   ├── sample-typescript-app/
│   └── sample-edge-cases/
├── tests/
│   ├── integration/
│   ├── security/
│   └── evaluation/
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   ├── api.md
│   ├── limitations.md
│   └── decisions/
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── .gitignore
├── .env.example
└── README.md
```

Use npm workspaces initially. Add TypeScript project references or a
monorepo build tool only when package dependencies and build
requirements justify it.

The analyzer and graph engine must not depend on React, Express
controllers, MongoDB, or Gemini. They should be independently testable.

------------------------------------------------------------------------

# 6. Data Model and Database Indexes

The following types are logical starting points. Adapt exact MongoDB
schema definitions and references to the implementation.

## 6.1 Repository

``` ts
type Repository = {
  _id: string;
  ownerId: string;
  provider: "github";
  owner: string;
  name: string;
  remoteUrl: string;
  defaultBranch: string;
  selectedRef: string;
  commitSha?: string;
  activeIndexVersion?: string;
  status:
    | "pending"
    | "fetching"
    | "discovered"
    | "indexing"
    | "ready"
    | "failed";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

## 6.2 Indexing job

``` ts
type IndexingJob = {
  _id: string;
  repositoryId: string;
  commitSha?: string;
  indexVersion?: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  stage: string;
  filesDiscovered: number;
  filesProcessed: number;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
};
```

## 6.3 Code file

``` ts
type CodeFile = {
  repositoryId: string;
  commitSha: string;
  path: string;
  language: string;
  blobSha?: string;
  contentHash?: string;
  sizeBytes: number;
  lineCount?: number;
  status: "discovered" | "fetched" | "excluded" | "failed";
  exclusionReason?: string;
};
```

## 6.4 Symbol

``` ts
type SymbolRecord = {
  repositoryId: string;
  commitSha: string;
  symbolId: string;
  filePath: string;
  name: string;
  qualifiedName?: string;
  kind:
    | "function"
    | "class"
    | "method"
    | "variable"
    | "route"
    | "callback";
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  parentSymbolId?: string;
  exported: boolean;
};
```

## 6.5 Import record

``` ts
type ImportRecord = {
  repositoryId: string;
  commitSha: string;
  importerPath: string;
  importedSpecifier: string;
  importedNames: string[];
  resolvedPath?: string;
  resolutionStatus: "resolved" | "external" | "dynamic" | "unresolved";
  startLine: number;
};
```

## 6.6 Graph node and edge

``` ts
type GraphNode = {
  id: string;
  repositoryId: string;
  commitSha: string;
  kind: "file" | "function" | "class" | "method" | "route";
  label: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
};

type GraphEdge = {
  id: string;
  repositoryId: string;
  commitSha: string;
  sourceId: string;
  targetId: string;
  kind:
    | "imports"
    | "defines"
    | "calls"
    | "references"
    | "routes_to"
    | "middleware_to"
    | "uses";
  confidence: number;
  evidence?: {
    filePath: string;
    startLine: number;
    endLine: number;
  };
};
```

Define edge direction once and document it. Recommended convention: an
`imports` edge points from the importing file to the imported file.
Impact analysis traverses reverse dependencies.

## 6.7 Code chunk

``` ts
type CodeChunk = {
  repositoryId: string;
  commitSha: string;
  chunkId: string;
  filePath: string;
  symbolId?: string;
  text: string;
  startLine: number;
  endLine: number;
  contentHash: string;
  chunkerVersion: string;
  embeddingModel?: string;
  embedding?: number[];
};
```

## 6.8 Route and trace records

``` ts
type RouteRecord = {
  repositoryId: string;
  commitSha: string;
  method: string;
  path: string;
  filePath: string;
  startLine: number;
  handlerSymbolIds: string[];
  middlewareSymbolIds: string[];
  confidence: number;
};

type TraceStep = {
  symbolId?: string;
  filePath: string;
  startLine: number;
  endLine: number;
  label: string;
  relationship: string;
  confidence: number;
  evidence?: string;
};
```

## 6.9 Conversations and messages

Store conversation IDs, repository IDs, commit SHA, message roles,
message content, tool-call metadata, source citations, usage data, and
timestamps. Avoid duplicating large source files in every message.

## 6.10 Recommended indexes

-   Unique repository identity appropriate to owner and normalized URL.
-   Unique code file identity on repository ID, commit SHA, and path.
-   Unique symbol ID per repository revision.
-   Graph edge lookup by repository revision and source ID.
-   Graph edge lookup by repository revision and target ID.
-   Symbol lookup by repository revision, name, and file path.
-   Chunk lookup by repository revision, file path, and line range.
-   Indexing job lookup by repository and status.
-   Conversation lookup by owner and update time.
-   Vector index configured for the selected embedding dimensions and
    metadata filters.

Use actual query patterns to refine indexes. Every additional index
increases storage and write costs.

------------------------------------------------------------------------

# 7. API Design

Implement endpoints in dependency order, not all at once.

  -------------------------------------------------------------------------------------------
  Method                  Endpoint                                    Responsibility
  ----------------------- ------------------------------------------- -----------------------
  POST                    `/api/repositories`                         Register repository

  GET                     `/api/repositories`                         List user's
                                                                      repositories

  GET                     `/api/repositories/:id`                     Repository status and
                                                                      metadata

  DELETE                  `/api/repositories/:id`                     Remove repository and
                                                                      derived data

  POST                    `/api/repositories/:id/index`               Start reindexing

  GET                     `/api/jobs/:jobId`                          Job progress and
                                                                      diagnostics

  POST                    `/api/jobs/:jobId/cancel`                   Cancel a job

  GET                     `/api/repositories/:id/files`               Paginated file list

  GET                     `/api/repositories/:id/files/:path`         Source viewer

  GET                     `/api/repositories/:id/symbols`             Symbol search

  GET                     `/api/repositories/:id/symbols/:symbolId`   Symbol details

  GET                     `/api/repositories/:id/graph`               Graph neighborhood

  POST                    `/api/repositories/:id/search`              Semantic/hybrid search

  POST                    `/api/repositories/:id/trace`               Static flow trace

  POST                    `/api/repositories/:id/impact`              Impact analysis

  POST                    `/api/repositories/:id/chat`                Agent interaction

  GET                     `/api/conversations`                        List conversations

  GET                     `/api/conversations/:id`                    Conversation history

  GET                     `/api/health`                               Process health

  GET                     `/api/ready`                                Dependency/readiness
                                                                      checks
  -------------------------------------------------------------------------------------------

API rules:

-   Validate route params, query params, and request bodies with Zod.
-   Scope every request to an authorized owner and repository.
-   Pin analysis results to an index/commit version.
-   Paginate file and symbol results.
-   Enforce graph depth and result limits on the server.
-   Use asynchronous jobs for expensive indexing.
-   Return consistent structured errors.
-   Add SSE only after the non-streaming agent flow works.

------------------------------------------------------------------------

# 8. Module 0 --- Project Foundation

**Schedule:** Week 1\
**Prerequisites:** None\
**Output:** Reproducible monorepo and running frontend/API.

## Step 0.1 --- Initialize repository

``` bash
mkdir repolens
cd repolens
git init
npm init -y
```

Create the folder structure above. Configure npm workspaces for
`apps/*`, `packages/*`, and `workers/*`.

Use a currently supported Node.js LTS release compatible with selected
dependencies.

## Step 0.2 --- Initialize frontend

Use Vite's React + TypeScript template. Add Tailwind using the current
official setup instructions. Install React Flow when the graph module
begins or during initial UI setup.

## Step 0.3 --- Initialize API

Create the Express + TypeScript package. Add:

-   Express.
-   Mongoose.
-   Zod.
-   dotenv or an equivalent environment loader.
-   Vitest.
-   Supertest.
-   ESLint and Prettier.

Keep the initial server small: configuration, middleware, health route,
database startup, and graceful shutdown.

## Step 0.4 --- Configure environment validation

Suggested variables:

``` text
NODE_ENV
PORT
MONGODB_URI
GEMINI_API_KEY
GEMINI_MODEL
GITHUB_TOKEN
WEB_ORIGIN
```

`GITHUB_TOKEN` may be optional for public repositories but can help with
rate limits. Never commit real values.

Validate configuration at startup. Fail early if a required variable is
missing.

## Step 0.5 --- Configure TypeScript and code quality

-   Enable strict TypeScript.
-   Define root scripts for build, test, lint, and formatting.
-   Add `.gitignore`.
-   Add `.env.example`.
-   Configure tests to run in CI.
-   Document local setup and common commands.

## Step 0.6 --- Establish architecture rules

-   Analyzer packages are independent of HTTP and database concerns.
-   Source line conventions are consistent.
-   All derived records carry repository version information.
-   Failures produce diagnostics.
-   No secrets or local repository clones are committed.

### Acceptance criteria

-   Frontend and API start independently.
-   Type checking, linting, and tests run from the root.
-   Environment validation works.
-   README setup instructions work on a clean checkout.

------------------------------------------------------------------------

# 9. Module 1 --- GitHub Repository Ingestion

**Schedule:** Weeks 1--2\
**Prerequisites:** Module 0\
**Output:** Public GitHub URL → job → file list.

## Step 1.1 --- Create repository module

``` text
apps/api/src/modules/repositories/
├── repository.routes.ts
├── repository.controller.ts
├── repository.service.ts
├── repository.schema.ts
└── github.client.ts
```

Responsibilities:

-   Routes: declare endpoints.
-   Controller: validate/translate HTTP requests and responses.
-   Service: repository lifecycle.
-   Schema: request validation.
-   GitHub client: API calls, pagination, retry, and error handling.

## Step 1.2 --- Validate repository URL

Accept only intended public GitHub URLs or an explicit owner/repository
input. Normalize owner and repository names. Reject arbitrary hosts,
malformed paths, unexpected URL schemes, and unsupported URL formats.

Do not fetch arbitrary user-supplied URLs; that creates SSRF risk.

## Step 1.3 --- Resolve commit

-   Retrieve repository metadata.
-   Resolve selected branch/tag/commit.
-   Persist the exact commit SHA.
-   Ensure every subsequent API request and derived record refers to
    that revision.

## Step 1.4 --- Discover repository tree

Use GitHub's Git Trees API to discover paths and blob identifiers.
Handle pagination where applicable and inspect the recursive tree's
truncation indicator. Do not assume one recursive response always
contains every file.

If a tree is truncated, use a safe fallback strategy that traverses
subtrees or reports an explicit bounded-ingestion failure.

## Step 1.5 --- Filter files

Initially include:

-   `.js`, `.jsx`, `.mjs`, `.cjs`
-   `.ts`, `.tsx`, `.mts`, `.cts`
-   Selected JSON and configuration files

Exclude or specially handle:

-   `.git`, `node_modules`, build output, coverage, caches.
-   Binaries.
-   Minified bundles.
-   Generated files.
-   `.env` files and likely secret-bearing files.
-   Files exceeding configured limits.

Record exclusion reasons.

## Step 1.6 --- Fetch source

Use blob IDs or a suitable API strategy. Respect GitHub API limits.
Avoid downloading unnecessary large files. Enforce file and repository
size caps.

## Step 1.7 --- Create job lifecycle

Initial flow:

``` text
pending
  -> fetching
  -> discovered
  -> indexing
  -> ready

Any stage -> failed
```

A job should store stage, counts, timestamps, errors, retry count, and
repository revision.

## Step 1.8 --- Implement endpoints

-   `POST /api/repositories`
-   `GET /api/repositories`
-   `GET /api/repositories/:id`
-   `GET /api/jobs/:jobId`
-   `GET /api/repositories/:id/files`

Return repository ID and job ID immediately when practical. The frontend
polls job status.

## Step 1.9 --- Add initial frontend

Build:

-   Repository URL form.
-   Validation messages.
-   Job progress/status.
-   Repository list.
-   Discovered file list.
-   Failure and retry UI.

## Step 1.10 --- Security and failure cases

Test:

-   Invalid URLs.
-   Missing repositories.
-   Rate limiting.
-   Network timeouts.
-   Oversized repositories.
-   Truncated trees.
-   Duplicate submission.
-   Partial download failure.
-   Cancellation.
-   Cleanup after failure.

Never install dependencies or run repository scripts as part of
ingestion.

### Acceptance criteria

A public repository can be submitted, its commit recorded, its eligible
file list displayed, and its job status inspected. Duplicate jobs and
failures are handled predictably.

------------------------------------------------------------------------

# 10. Module 2 --- Source Storage and Normalization

**Schedule:** Week 2\
**Prerequisites:** Module 1\
**Output:** Consistent source retrieval and content hashes.

## Step 2.1 --- Abstract source storage

``` ts
interface SourceStore {
  getFile(
    repositoryId: string,
    commitSha: string,
    path: string
  ): Promise<string | null>;

  getFileMetadata(
    repositoryId: string,
    commitSha: string,
    path: string
  ): Promise<{
    contentHash: string;
    sizeBytes: number;
  } | null>;
}
```

The initial implementation can use fetched source stored in a controlled
workspace or another appropriate source store. Keep the analyzer
independent of the storage mechanism.

## Step 2.2 --- Normalize paths

-   Use canonical repository-relative paths.
-   Reject absolute paths.
-   Reject traversal segments.
-   Normalize separators.
-   Ensure source reads remain inside the selected repository/version.
-   Avoid treating a URL-encoded path as authorization.

## Step 2.3 --- Hash contents

Compute a stable hash from source bytes. Use hashes for unchanged-file
detection, cache keys, and incremental indexing.

Keep the Git blob SHA and application content hash conceptually
separate.

## Step 2.4 --- Record file metadata

Store path, language, content hash, file size, line count, parse status,
and exclusion diagnostics.

### Acceptance criteria

The analyzer can request source by repository, commit SHA, and path, and
receive the correct file. Content hashes are reproducible.

------------------------------------------------------------------------

# 11. Module 3 --- Parser and Symbol Extraction

**Schedule:** Week 3\
**Prerequisites:** Modules 1--2\
**Output:** Structured syntax and symbol records.

## Step 3.1 --- Build parser adapter

``` text
packages/code-analyzer/src/
├── parsers/
│   ├── parser.interface.ts
│   ├── javascript.parser.ts
│   ├── typescript.parser.ts
│   └── tsx.parser.ts
├── extractors/
│   ├── imports.extractor.ts
│   ├── exports.extractor.ts
│   ├── functions.extractor.ts
│   ├── classes.extractor.ts
│   └── calls.extractor.ts
└── index.ts
```

Choose grammar by extension. Keep parser-specific details behind a
common interface.

## Step 3.2 --- Extract syntax constructs

Support in stages:

1.  Static imports.
2.  Named/default exports.
3.  Function declarations.
4.  Arrow functions and function expressions.
5.  Class declarations.
6.  Methods.
7.  Call expressions.
8.  Variable declarations.
9.  Parent/child symbol scope.
10. Later: route registrations.

Capture start/end line and columns where available.

## Step 3.3 --- Assign stable symbol identities

A symbol ID must distinguish same-named functions in different files and
scopes. Base identity on repository revision, path, symbol kind,
scope/qualified name, and source identity as appropriate.

Do not use a bare function name as a unique identifier.

## Step 3.4 --- Diagnostics

Record syntax errors, unsupported constructs, extraction failures, and
skipped files. One malformed file must not crash the whole repository
index.

## Step 3.5 --- Fixtures and tests

Cover:

-   JavaScript, TypeScript, TSX.
-   ES modules and CommonJS.
-   Named/default exports.
-   Anonymous callbacks.
-   Nested functions.
-   Syntax errors.
-   Empty and very large files.
-   Unicode identifiers/comments.
-   Source position correctness.

### Acceptance criteria

The parser reliably extracts supported declarations and locations and
returns diagnostics for unsupported or malformed source.

------------------------------------------------------------------------

# 12. Module 4 --- Import and Symbol Resolution

**Schedule:** Weeks 3--4\
**Prerequisites:** Module 3\
**Output:** Imports connected to actual repository files and exported
symbols.

## Step 4.1 --- Implement module resolution

``` text
packages/code-analyzer/src/resolvers/
├── resolver.interface.ts
├── relative-import.resolver.ts
├── extension-resolver.ts
├── package-json.resolver.ts
├── typescript-alias.resolver.ts
└── module-resolver.ts
```

Implement progressively:

1.  Relative imports.
2.  Extension resolution.
3.  `index.js` / `index.ts`.
4.  Package entry points where needed.
5.  TypeScript aliases and `baseUrl`.
6.  CommonJS `require`.
7.  Statically identifiable dynamic imports.

Use actual repository configuration when supported.

## Step 4.2 --- Classify imports

Every import should be categorized as:

-   Resolved internal import.
-   External package.
-   Dynamic import.
-   Unresolved import.

Do not create an internal file node for a package such as `express`.

## Step 4.3 --- Resolve exported symbols

Build export tables. Resolve named/default imports and re-exports where
possible. Record unresolved symbols instead of matching by name alone.

## Step 4.4 --- Diagnostics

Example:

``` text
RESOLVED: routes/auth.routes.js -> controllers/auth.controller.js
UNRESOLVED: utils/password.js -> no matching file
EXTERNAL: controllers/auth.controller.js -> express
```

Attach evidence locations.

## Step 4.5 --- Evaluate advanced resolution

Evaluate TypeScript compiler APIs and existing SCIP indexers for
stronger semantic navigation. Keep the first implementation focused on
common JS/TS patterns.

### Acceptance criteria

Known fixture imports resolve correctly, external packages remain
external, and unresolved references are explicit.

------------------------------------------------------------------------

# 13. Module 5 --- Shared Graph Engine

**Schedule:** Week 4\
**Prerequisites:** Module 4\
**Output:** Deterministic graph utilities used by graph UI, tracing, and
impact analysis.

## Step 5.1 --- Define edge semantics

Recommended edge direction:

-   `imports`: importer → imported module.
-   `defines`: file/module → declared symbol, if represented at both
    levels.
-   `calls`: caller → callee.
-   `routes_to`: route → handler.
-   `middleware_to`: route/chain → middleware.
-   `references`: source symbol → referenced symbol.

Document direction and use it consistently.

## Step 5.2 --- Implement graph utilities

-   `buildGraph(nodes, edges)`
-   `getOutgoingNeighbors(graph, nodeId)`
-   `getIncomingNeighbors(graph, nodeId)`
-   `bfs(graph, startId, options)`
-   `dfs(graph, startId, options)`
-   `findShortestPath(graph, sourceId, targetId)`

Support edge filters, node filters, maximum depth, result limits, cycle
detection, and cancellation/time limits where useful.

## Step 5.3 --- Persist and query

Persist typed nodes/edges. Add indexes for source and target lookup.
Retrieve bounded subgraphs rather than loading every node into every
request.

## Step 5.4 --- Test

-   Cycles.
-   Disconnected nodes.
-   Duplicate edges.
-   Self-references.
-   Edge filtering.
-   Reverse traversal.
-   Maximum depth and result count.
-   Deterministic output.
-   Missing endpoints.

### Acceptance criteria

Graph utilities are independent of MongoDB and the UI, deterministic,
bounded, and tested.

------------------------------------------------------------------------

# 14. Module 6 --- P1.1 Code Relationship Graph

**Schedule:** Week 4\
**Prerequisites:** Modules 1--5\
**Output:** Interactive graph with source navigation.

## Step 6.1 --- API

Implement:

-   `GET /api/repositories/:id/graph`
-   `GET /api/repositories/:id/files/:path`
-   `GET /api/repositories/:id/symbols/:symbolId`

Graph query options should include root node, depth, edge types, node
types, and result limit.

Enforce limits on the server.

## Step 6.2 --- Frontend components

``` text
features/architecture/
├── ArchitecturePage.tsx
├── GraphCanvas.tsx
├── GraphToolbar.tsx
├── GraphFilters.tsx
├── CodeNode.tsx
├── FileDetailsPanel.tsx
├── SourceViewer.tsx
└── hooks/
    ├── useGraph.ts
    └── useSource.ts
```

## Step 6.3 --- UI requirements

-   Repository selector.
-   Search for files and symbols.
-   Custom nodes for file/symbol kinds.
-   Typed edges and a legend.
-   Zoom and pan.
-   Minimap.
-   Node selection.
-   Source panel with line numbers.
-   Edge filters.
-   Expand-neighbors interaction.
-   Loading, empty, error, and oversized-graph states.
-   Bounded graph rendering.

## Step 6.4 --- Performance

Start from a selected file and show its neighborhood. Do not render
thousands of nodes by default. Memoize expensive custom nodes and
stabilize callbacks/objects.

## Step 6.5 --- End-to-end tests

Verify expected graph edges, correct direction, source navigation,
filtering, expansion limits, and empty/error states.

### Acceptance criteria

A user can submit a repository, view its real graph, select a node, and
open the corresponding source.

------------------------------------------------------------------------

# 15. Module 7 --- P1.2 Semantic Code Search

**Schedule:** Weeks 5--6\
**Prerequisites:** Modules 1--5\
**Output:** Natural-language search with source citations.

## Step 7.1 --- Structural chunking

Create chunks aligned to functions, methods, route handlers, classes, or
smaller logical blocks. Preserve file path, symbol, line range,
language, content hash, repository version, and chunker version.

Avoid huge whole-file chunks and exclude generated or secret-bearing
content.

## Step 7.2 --- Embedding provider

``` ts
interface EmbeddingProvider {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}
```

Select a compatible embedding model. Verify dimensions, input limits,
batching behavior, and costs. Record model/version metadata.

## Step 7.3 --- Configure MongoDB Vector Search

Create the vector index with correct dimensions and metadata fields for
repository ID, commit SHA, language, path, and symbol kind as
appropriate. Verify query behavior against the deployed database
configuration.

## Step 7.4 --- Lexical search

Support exact identifier and route searches. Use a lexical index
appropriate to your MongoDB setup. Do not rely on embeddings for exact
identifiers alone.

## Step 7.5 --- Hybrid ranking

1.  Validate query and repository.
2.  Run lexical retrieval.
3.  Run vector retrieval.
4.  Merge candidates with Reciprocal Rank Fusion or another evaluated
    approach.
5.  Deduplicate overlapping snippets.
6.  Apply metadata filters.
7.  Return ranked results and source locations.

Do not assume raw scores from different retrieval methods are directly
comparable.

## Step 7.6 --- Search API

`POST /api/repositories/:id/search`

Request fields: query, limit, language filters, symbol-kind filters,
optional path filters.

Response fields: file path, symbol, line range, snippet, score, match
type, repository revision.

## Step 7.7 --- Search UI

-   Query input.
-   Filters.
-   Loading/error/empty states.
-   Ranked result cards.
-   Source snippets and line ranges.
-   Click-to-open source.
-   Clear indication of the indexed revision.

## Step 7.8 --- Evaluation

Create 30--50 benchmark questions across fixture and real repositories.
Record expected relevant files/symbols, Recall@3/5, reciprocal rank,
latency, and embedding cost.

### Acceptance criteria

Natural-language and exact-term queries retrieve relevant source with
verifiable locations.

------------------------------------------------------------------------

# 16. Module 8 --- P1.3 Static Execution Flow Tracing

**Schedule:** Weeks 7--8\
**Prerequisites:** Modules 3--5\
**Output:** Evidence-backed static route traces.

## Step 8.1 --- Discover Express routes

Recognize common patterns:

``` js
app.get("/users", getUsers);
router.post("/login", loginUser);
router.use(authenticate);
app.use("/api/auth", authRouter);
```

Add support progressively for:

-   `app`/`router` methods.
-   Middleware chains.
-   Imported handlers.
-   Mounted routers.
-   Statically identifiable route arrays.
-   Common wrappers only when their structure is understood.

## Step 8.2 --- Build route records

Store method, path, file path, source location, handler IDs, middleware
IDs, and confidence. Compose mounted paths only when statically known.
Report dynamic paths as unresolved.

## Step 8.3 --- Resolve calls

For each route:

1.  Resolve handler.
2.  Resolve handler imports.
3.  Extract call expressions.
4.  Resolve known calls.
5.  Traverse into services.
6.  Recognize model/database calls where evidence exists.
7.  Stop at external or unresolved calls.
8.  Preserve source locations and confidence.

An imported model alone does not prove a route performs a database
query.

## Step 8.4 --- Trace traversal

-   Follow supported edge types.
-   Track visited symbols.
-   Bound depth and node count.
-   Preserve path order.
-   Distinguish direct calls from inferred relationships.
-   Include unresolved steps and alternative paths.
-   Apply deterministic ordering.

## Step 8.5 --- Trace API

`POST /api/repositories/:id/trace`

Input: route method/path or symbol ID, maximum depth, optional
relationship filters.

Output: ordered steps with symbol, file, line range, relationship,
confidence, and evidence.

## Step 8.6 --- Trace UI

-   Route/method selector.
-   Ordered trace list.
-   Node categories for route, middleware, controller, service, model.
-   Source excerpts.
-   Click-to-open source.
-   Graph view.
-   Confidence and unresolved-call indicators.

### Acceptance criteria

Common Express login routes produce useful static traces. The UI
explicitly communicates that the path is inferred from static code, not
guaranteed runtime behavior.

------------------------------------------------------------------------

# 17. Module 9 --- P1.4 Gemini AI Agent with Tools

**Schedule:** Weeks 9--10\
**Prerequisites:** Search, graph, trace, and impact tool foundations\
**Output:** Read-only agent with grounded answers.

## Step 9.1 --- Implement tools before Gemini

Create independently tested functions:

  Tool                     Responsibility
  ------------------------ --------------------------------
  `searchCode`             Search indexed code
  `readFile`               Read a bounded source range
  `findReferences`         Find known references
  `getFileGraph`           Retrieve graph neighborhood
  `traceExecutionFlow`     Trace supported routes/symbols
  `analyzeImpact`          Return impact report
  `getRepositorySummary`   Summarize indexed structure

Every tool must have an input schema, output schema, timeout, result
limit, and repository scope.

## Step 9.2 --- Provider adapter

Create `gemini.provider.ts` and keep all SDK-specific behavior there.
Use `@google/genai`. Verify the currently recommended API and supported
model/tool/streaming capabilities at implementation time.

## Step 9.3 --- Bounded agent loop

1.  Receive question and repository/commit context.
2.  Build prompt and tool descriptions.
3.  Request a model response.
4.  Validate any tool name and arguments.
5.  Execute the authorized tool server-side.
6.  Return structured tool results to the model.
7.  Continue within a strict iteration budget.
8.  Generate final answer.
9.  Validate citations.
10. Persist result and usage data.

## Step 9.4 --- Security constraints

-   Read-only tools.
-   Repository-scoped access.
-   Path validation.
-   No arbitrary shell execution.
-   No arbitrary network requests.
-   No repository code execution.
-   No unrestricted database access.
-   Strict time, iteration, context, and token limits.
-   Safe Markdown rendering.
-   Prompt-injection tests using malicious README/source comments.
-   Logs that avoid credentials and unnecessary source disclosure.

## Step 9.5 --- Evidence-backed response format

Each substantive implementation claim should cite a file and source
range. Distinguish:

-   Direct evidence.
-   Static inference.
-   Unknown/unverified behavior.

Do not manufacture citations or claim certainty when tools could not
resolve the code.

## Step 9.6 --- Conversation persistence

Store conversation ID, owner ID, repository ID, commit SHA, messages,
tool-call metadata, citations, usage data, and timestamps. Avoid copying
full source files into messages.

## Step 9.7 --- Streaming

After the non-streaming loop is correct, implement SSE events such as:

-   `status`
-   `tool_start`
-   `tool_result`
-   `answer_delta`
-   `error`
-   `done`

Handle client disconnects, cancellation, timeouts, and model errors. Do
not treat generated status text as proof that a tool actually ran.

## Step 9.8 --- Evaluation

Create questions with known evidence and expected tool use. Measure
citation correctness, unsupported-claim rate, successful tool execution,
latency, and cost. Test prompt injection and attempts to escape
repository scope.

### Acceptance criteria

The agent investigates actual source using controlled tools and returns
a grounded answer with valid citations and safe failure behavior.

------------------------------------------------------------------------

# 18. Module 10 --- P1.5 Change Impact Analysis

**Schedule:** Weeks 11--12\
**Prerequisites:** Graph engine and symbol/reference index\
**Output:** Explainable affected-file and affected-symbol report.

## Step 10.1 --- Reverse dependency graph

If `A imports B`, a change to B may affect A. Build reverse adjacency
maps from the documented edge semantics.

Implement BFS with:

-   Direct and indirect layers.
-   Maximum depth.
-   Edge-type filters.
-   Cycle detection.
-   Result limits.
-   Source evidence.

## Step 10.2 --- Impact service

``` text
apps/api/src/modules/impact/
├── impact.routes.ts
├── impact.controller.ts
├── impact.service.ts
├── impact-ranker.ts
└── impact-report.ts
```

Workflow:

1.  Validate target file/symbol.
2.  Load relevant graph.
3.  Traverse reverse dependencies.
4.  Group results by distance.
5.  Record paths and relationship evidence.
6.  Rank affected entities.
7.  Return report and diagnostics.

## Step 10.3 --- Improve precision

Add symbol-level analysis:

-   Imported symbol identity.
-   Actual call references.
-   Exported signature changes.
-   Shared types/interfaces.
-   Re-exports.
-   Dynamic/unresolved references.

Do not assume every file importing a module is equally affected by a
change to one symbol.

## Step 10.4 --- Ranking

Use transparent criteria:

-   Direct versus indirect dependency.
-   Graph distance.
-   Relationship confidence.
-   Relationship kind.
-   Export status.
-   Signature/reference evidence.

Explain why each file appears. Avoid presenting a numeric score as a
calibrated probability unless it has been evaluated.

## Step 10.5 --- UI

-   File/symbol selector.
-   Analyze action.
-   Direct/indirect affected groups.
-   Impact graph.
-   Affected file list.
-   Dependency path explanations.
-   Source navigation.
-   Tests to review.

Label suggested tests as suggestions unless they were actually executed
in a controlled environment.

## Step 10.6 --- Tests

Use fixture changes with known dependencies. Verify direct and indirect
results, cycles, unresolved edges, confidence, and report
reproducibility.

### Acceptance criteria

A user selects a file or symbol and gets a traceable impact report
explaining the dependency path for each result.

------------------------------------------------------------------------

# 19. Module 11 --- Incremental Indexing and Reliability

**Schedule:** Weeks 13--14\
**Prerequisites:** Correct full indexing pipeline\
**Output:** Efficient updates and recoverable indexing jobs.

## Step 11.1 --- Compare commits

1.  Fetch new tree.
2.  Compare paths and blob identifiers.
3.  Identify added, changed, deleted, and unchanged files.
4.  Fetch changed source.
5.  Reparse changed files.
6.  Recompute affected symbols and graph edges.
7.  Rechunk and re-embed changed content only where valid.
8.  Remove deleted-file records.
9.  Validate new index.
10. Publish the new index version.

## Step 11.2 --- Invalidation rules

  Change                Data potentially invalidated
  --------------------- ----------------------------------------------------
  Source content        Parse, symbols, imports, calls, chunks, embeddings
  Export table          Dependent import/symbol resolution
  TypeScript config     Alias and module resolution
  Analyzer rules        Affected derived graph records
  Embedding model       Embeddings generated by old model
  Chunking algorithm    Chunks and embeddings
  Repository deletion   All derived records for repository

## Step 11.3 --- Atomic publication

Build a new index version separately. Validate required stages. Publish
it as active only when successful. Preserve the last valid index if a
new run fails.

## Step 11.4 --- Job reliability

Add:

-   Idempotency keys or equivalent duplicate-job prevention.
-   Bounded retries and exponential backoff.
-   Timeouts.
-   Cancellation.
-   Progress.
-   Structured errors.
-   Cleanup of abandoned temporary data.
-   Full reindex capability.
-   Metrics for stage duration and failures.

Introduce BullMQ/Redis when durable distributed queues, concurrency
control, and advanced retry behavior are needed.

### Acceptance criteria

Unchanged files are not needlessly reparsed/re-embedded, retries are
safe, and failed indexing never replaces a valid active index with a
partial one.

------------------------------------------------------------------------

# 20. Module 12 --- Production Security, Performance, and Deployment

**Schedule:** Weeks 15--16\
**Prerequisites:** All core features\
**Output:** Secure and demonstrable deployed release.

## Step 12.1 --- Authentication and authorization

-   Implement user authentication.
-   Check ownership on every repository, job, conversation, source, and
    index endpoint.
-   Do not use repository IDs as authorization.
-   Add a narrow-scope authorization flow before supporting private
    repositories.
-   Avoid unnecessary credential storage.

## Step 12.2 --- API protection

-   Zod validation.
-   Rate limits.
-   Request-size limits.
-   Per-user indexing quotas.
-   Per-user AI budgets.
-   Operation timeouts.
-   Repository-scoped queries.
-   Centralized error handling.
-   Safe error messages.

## Step 12.3 --- Source and agent security

-   Never execute source by default.
-   Do not install repository dependencies.
-   Do not permit arbitrary shell/network/database operations from
    tools.
-   Validate all file paths.
-   Enforce source size limits.
-   Treat source and documentation as untrusted data.
-   Safely render Markdown and snippets.
-   Test malicious README/source instructions.
-   Do not expose Gemini credentials to the browser.

## Step 12.4 --- Performance

Measure:

-   Repository discovery time.
-   Source fetch time.
-   Parse time per file.
-   Resolution time.
-   Graph build time.
-   Embedding generation time and cost.
-   Search latency.
-   Trace/impact latency.
-   Agent latency, tokens, and cost.
-   Memory usage and worker concurrency.

Set limits based on measured behavior. Do not load giant graphs or
unbounded source into the browser/model.

## Step 12.5 --- Deployment

Deploy:

-   React frontend.
-   Express API.
-   Indexing worker.
-   Managed MongoDB.
-   Redis only if required by queue implementation.

Configure HTTPS, CORS, secrets, database restrictions, health/readiness
endpoints, logging, monitoring, backup/retention, and failed-job
recovery.

## Step 12.6 --- Portfolio release

Publish:

-   Live demo.
-   Demo video.
-   Architecture diagram.
-   Data model and API documentation.
-   Supported-patterns/limitations page.
-   Automated test instructions.
-   Benchmark report.
-   Example graph, search, trace, and impact results.
-   Explanation of static analysis versus AI reasoning.

### Acceptance criteria

A reviewer can analyze a supported public repository, use all five
features, inspect source evidence, and understand the system's accuracy
limits.

------------------------------------------------------------------------

# 21. Testing and Evaluation Strategy

Testing must begin with the first module, not the last week.

## 21.1 Test layers

### Unit tests

Test isolated functions:

-   URL normalization.
-   File filtering.
-   Path validation.
-   Parser extraction.
-   Import resolution.
-   Symbol identity.
-   Graph traversal.
-   Chunking.
-   Ranking.
-   Citation validation.

### Integration tests

Test:

-   GitHub client against mocked API responses.
-   MongoDB persistence.
-   Job lifecycle.
-   Index stage orchestration.
-   Search retrieval.
-   Trace construction.
-   Impact analysis.
-   Agent tool execution.

### End-to-end tests

Use Playwright to test:

-   Submit repository.
-   Wait for indexing.
-   Open graph.
-   Select node.
-   Search code.
-   Trace route.
-   Ask agent question.
-   Run impact analysis.

### Security tests

Test:

-   Malformed URLs.
-   SSRF attempts.
-   Path traversal.
-   Cross-owner repository access.
-   Prompt injection in source.
-   Oversized requests.
-   Rate limits.
-   Agent tool argument abuse.
-   Markdown/XSS behavior.
-   Credential/log leakage.

## 21.2 Fixture repositories

Create fixtures for:

-   Basic Express application.
-   TypeScript application with aliases.
-   CommonJS application.
-   TSX/React application.
-   Circular imports.
-   Unresolved imports.
-   Dynamic imports.
-   Anonymous callbacks.
-   Syntax errors.
-   Very large files.
-   Malicious README/source instructions.

Each fixture should have expected nodes, edges, routes, symbols, and
relevant search questions.

## 21.3 Evaluation metrics

  Capability          Metric
  ------------------- ------------------------------------------------------------
  File discovery      Expected-file coverage
  Import resolution   Precision and recall
  Graph               Expected-edge precision and recall
  Search              Recall@3/5, reciprocal rank
  Flow tracing        Correct known trace steps and source locations
  Agent               Citation correctness, unsupported-claim rate, tool success
  Impact              Precision/recall of known affected entities
  Reliability         Retry success, partial-failure handling
  Performance         Indexing duration, latency, memory, cost

Use a small benchmark first, then expand it as edge cases are
discovered. Record results over time so changes to the parser or ranking
can be compared objectively.

------------------------------------------------------------------------

# 22. Observability and Operational Requirements

## 22.1 Structured logs

Log:

-   Request ID.
-   Repository ID.
-   Job ID.
-   Commit SHA.
-   Index version.
-   Pipeline stage.
-   Duration.
-   Count of files/symbols/edges/chunks.
-   Error code and retryability.

Avoid logging credentials and unnecessary raw source content.

## 22.2 Metrics

Track:

-   Jobs started/completed/failed.
-   Duration by stage.
-   Files parsed and skipped.
-   Unresolved import count.
-   Symbol resolution coverage.
-   Graph size.
-   Embedding requests and cost.
-   Search latency.
-   Agent tool calls and duration.
-   AI token usage and estimated cost.
-   Queue depth and worker utilization.

## 22.3 Diagnostics

Make diagnostics actionable:

-   File path.
-   Source location when available.
-   Stage.
-   Error code.
-   Human-readable message.
-   Whether retry is likely to help.
-   Whether the record was excluded or unresolved.

## 22.4 Recovery

Support:

-   Retry failed job.
-   Cancel job.
-   Full reindex.
-   Remove repository and derived records.
-   Preserve last valid index.
-   Clean up stale temporary data.
-   Detect jobs stuck beyond a configured timeout.

------------------------------------------------------------------------

# 23. Milestone Schedule and Exit Criteria

Planning baseline: 16 weeks at 8--12 hours per week. This is an
estimate; adjust based on actual complexity and available time.

  -----------------------------------------------------------------------
  Weeks                   Milestone               Exit criterion
  ----------------------- ----------------------- -----------------------
  1                       Project foundation      Frontend/API run, tests
                                                  and config work

  1--2                    GitHub ingestion        Repository and file
                                                  list are persisted and
                                                  visible

  2                       Source normalization    Correct source reads
                                                  and content hashes

  3                       Parser                  JS/TS/TSX fixture
                                                  declarations extracted

  3--4                    Resolution              Expected imports
                                                  resolve; unresolved
                                                  ones diagnosed

  4                       Graph engine            Traversal and typed
                                                  edges tested

  4                       Relationship graph      Interactive graph and
                                                  source viewer work

  5--6                    Semantic search         Relevant results with
                                                  source locations

  7--8                    Flow tracing            Supported Express route
                                                  traces are reproducible

  9--10                   AI agent                Controlled tool calls
                                                  and grounded answers

  11--12                  Impact analysis         Direct/indirect
                                                  dependency report works

  13--14                  Reliability             Incremental indexing
                                                  and atomic publication

  15--16                  Production release      Security, evaluation,
                                                  deployment and docs
                                                  complete
  -----------------------------------------------------------------------

### Suggested weekly rhythm

For part-time development:

1.  Session 1: read the relevant docs and design the module.
2.  Session 2: implement the smallest unit.
3.  Session 3: integrate and test.
4.  Optional session 4: fix edge cases, document, and plan next week.

Progress should be measured by verified capabilities, not files written
or UI screens completed.

------------------------------------------------------------------------

# 24. Master Implementation Checklist

Use this as the project-level checklist. Keep it in version control or
transfer it into your issue tracker.

## Phase 0 --- Foundation

-   [ ] Initialize Git repository and npm workspaces.
-   [ ] Set up React/Vite frontend.
-   [ ] Set up Express/TypeScript API.
-   [ ] Configure strict TypeScript, linting, formatting, and tests.
-   [ ] Add environment validation and `.env.example`.
-   [ ] Configure MongoDB connection and graceful shutdown.
-   [ ] Add health/readiness endpoints.
-   [ ] Document architecture and setup.

## Phase 1 --- GitHub ingestion

-   [ ] Validate and normalize public GitHub URLs.
-   [ ] Resolve repository commit SHA.
-   [ ] Discover repository tree.
-   [ ] Handle tree truncation.
-   [ ] Filter and classify files.
-   [ ] Create repository and job records.
-   [ ] Fetch source safely.
-   [ ] Add job status and diagnostics.
-   [ ] Build repository submission UI.
-   [ ] Build file-list UI.
-   [ ] Test API failures, rate limits, size limits, retries, and
    duplicates.

## Phase 2 --- Source normalization and analyzer

-   [ ] Implement source storage abstraction.
-   [ ] Normalize repository-relative paths.
-   [ ] Compute content hashes.
-   [ ] Integrate Tree-sitter.
-   [ ] Validate JS/TS/TSX grammar compatibility.
-   [ ] Extract imports and exports.
-   [ ] Extract functions and classes.
-   [ ] Extract methods and callbacks.
-   [ ] Record line ranges and scopes.
-   [ ] Create stable symbol IDs.
-   [ ] Add parser diagnostics.
-   [ ] Test fixtures and malformed files.

## Phase 3 --- Resolution and graph

-   [ ] Resolve relative imports.
-   [ ] Resolve extensions and index files.
-   [ ] Classify external packages.
-   [ ] Resolve supported exports/re-exports.
-   [ ] Record unresolved references.
-   [ ] Define graph nodes and typed edges.
-   [ ] Implement adjacency lists.
-   [ ] Implement BFS and DFS.
-   [ ] Implement reverse traversal and path finding.
-   [ ] Add graph query limits.
-   [ ] Add database indexes.
-   [ ] Build React Flow UI.
-   [ ] Add source navigation and filters.
-   [ ] Validate expected edges.

## Phase 4 --- Semantic search

-   [ ] Implement symbol-aware chunking.
-   [ ] Choose and evaluate embedding model.
-   [ ] Configure vector index.
-   [ ] Implement embedding provider.
-   [ ] Implement lexical retrieval.
-   [ ] Implement vector retrieval.
-   [ ] Implement hybrid ranking.
-   [ ] Add metadata filtering and deduplication.
-   [ ] Build search API.
-   [ ] Build search UI.
-   [ ] Create 30--50 question benchmark.
-   [ ] Measure Recall@K, rank, latency, and cost.

## Phase 5 --- Flow tracing

-   [ ] Discover Express route registrations.
-   [ ] Resolve router mounts.
-   [ ] Resolve handlers.
-   [ ] Identify middleware chains.
-   [ ] Resolve supported function calls.
-   [ ] Identify model/data-access calls.
-   [ ] Implement bounded trace traversal.
-   [ ] Add source evidence and confidence.
-   [ ] Build trace API.
-   [ ] Build ordered trace UI.
-   [ ] Test cycles, dynamic calls, and unresolved steps.
-   [ ] Document static-analysis limitations.

## Phase 6 --- AI agent

-   [ ] Implement search tool.
-   [ ] Implement read-file tool.
-   [ ] Implement find-references tool.
-   [ ] Implement graph tool.
-   [ ] Implement trace tool.
-   [ ] Implement impact tool.
-   [ ] Implement repository-summary tool.
-   [ ] Integrate Gemini provider.
-   [ ] Validate tool arguments and outputs.
-   [ ] Implement bounded agent loop.
-   [ ] Add citation validation.
-   [ ] Persist conversations and tool metadata.
-   [ ] Add SSE streaming and cancellation.
-   [ ] Enforce budgets and timeouts.
-   [ ] Test prompt injection and unsupported claims.

## Phase 7 --- Impact analysis

-   [ ] Build reverse graph.
-   [ ] Implement direct impact.
-   [ ] Implement indirect impact.
-   [ ] Add traversal limits.
-   [ ] Add symbol-level impact where possible.
-   [ ] Rank by transparent criteria.
-   [ ] Explain dependency paths.
-   [ ] Build impact report API.
-   [ ] Build impact UI.
-   [ ] Test against known dependency changes.

## Phase 8 --- Reliability

-   [ ] Compare revisions using Git metadata and hashes.
-   [ ] Identify added, changed, deleted, and unchanged files.
-   [ ] Implement dependency-aware invalidation.
-   [ ] Recompute affected graph records.
-   [ ] Re-embed changed chunks only where valid.
-   [ ] Publish index versions atomically.
-   [ ] Add retry and cancellation.
-   [ ] Add cleanup and recovery.
-   [ ] Measure indexing and query performance.
-   [ ] Add queue infrastructure if needed.

## Phase 9 --- Release

-   [ ] Add authentication and repository ownership.
-   [ ] Add API rate limits and quotas.
-   [ ] Add security controls and prompt-injection tests.
-   [ ] Add structured logs and metrics.
-   [ ] Add health and readiness checks.
-   [ ] Run unit, integration, security, and browser tests.
-   [ ] Deploy frontend, API, worker, and database.
-   [ ] Verify secrets and CORS configuration.
-   [ ] Write architecture/API/limitations documentation.
-   [ ] Publish benchmark results and demo video.

------------------------------------------------------------------------

# 25. Common Failure Modes and Decisions to Avoid

## 25.1 Building the AI agent first

Without a reliable index, the model guesses from incomplete context.
Implement deterministic tools first.

## 25.2 Treating all graph edges equally

Imports, resolved calls, inferred calls, and guessed relationships have
different confidence levels. Preserve relationship type and evidence.

## 25.3 Calling static analysis runtime tracing

Static analysis identifies likely paths. Runtime tracing observes actual
execution. Keep the name and UI honest.

## 25.4 One giant embedding per file

Large chunks lose retrieval precision. Use symbol-aware chunks and
source locations.

## 25.5 Reindexing everything on every change

Start with content hashes and a correct full index. Add incremental
updates and dependency-aware invalidation after correctness is
established.

## 25.6 Allowing unrestricted tools

Never allow the model to execute arbitrary shell commands, access
arbitrary paths, or make uncontrolled network requests.

## 25.7 Publishing partial indexes

Use versioned builds and atomic publication. A failed new index must not
replace the last valid active index.

## 25.8 Overengineering infrastructure too early

Start with one API, one worker, MongoDB, and bounded jobs. Add
Redis/queues, distributed services, and caching when measurable
requirements justify them.

## 25.9 Skipping evaluation

A visually convincing graph or AI answer is not proof of correctness.
Maintain fixtures, expected outputs, retrieval benchmarks, and citation
tests.

## 25.10 Hiding limitations

Explicitly report unresolved imports, dynamic calls, unsupported syntax,
and uncertain trace steps. Honest uncertainty improves trust.

------------------------------------------------------------------------

# 26. Reference Documentation

Use official documentation and revisit it during implementation because
SDKs, API recommendations, and package compatibility can change.

## Parsing and code intelligence

-   Tree-sitter: https://tree-sitter.github.io/
-   Tree-sitter TypeScript/TSX grammars:
    https://github.com/tree-sitter/tree-sitter-typescript
-   TypeScript compiler API:
    https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
-   SCIP protocol: https://github.com/scip-code/scip

## GitHub ingestion

-   Git Trees API: https://docs.github.com/en/rest/git/trees
-   GitHub REST API overview: https://docs.github.com/en/rest
-   GitHub rate limits:
    https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

## Frontend and graph

-   Vite: https://vite.dev/
-   React: https://react.dev/
-   React Flow: https://reactflow.dev/
-   React Flow performance:
    https://reactflow.dev/learn/advanced-use/performance
-   Tailwind CSS: https://tailwindcss.com/docs

## Backend and data

-   Express: https://expressjs.com/
-   TypeScript: https://www.typescriptlang.org/docs/
-   Zod: https://zod.dev/
-   MongoDB: https://www.mongodb.com/docs/
-   MongoDB Vector Search: https://www.mongodb.com/docs/vector-search/
-   MongoDB hybrid search:
    https://www.mongodb.com/docs/vector-search/hybrid-search/hybrid-search-overview/

## Gemini and AI security

-   Gemini function calling:
    https://ai.google.dev/gemini-api/docs/function-calling
-   Gemini Interactions API:
    https://ai.google.dev/gemini-api/docs/interactions-overview
-   Gemini API libraries:
    https://ai.google.dev/gemini-api/docs/libraries
-   OWASP prompt injection:
    https://genai.owasp.org/llmrisk/llm01-prompt-injection/
-   OWASP prompt injection prevention:
    https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html

## Testing and build tooling

-   Vitest: https://vitest.dev/
-   Supertest: https://github.com/ladjs/supertest
-   Playwright: https://playwright.dev/
-   npm workspaces: https://docs.npmjs.com/cli/using-npm/workspaces

------------------------------------------------------------------------

# Final Execution Rule

Build RepoLens in this order:

**Foundation → GitHub ingestion → source normalization → parser →
import/symbol resolution → graph engine → relationship graph → semantic
search → static flow tracing → Gemini agent → impact analysis →
incremental indexing → security and production release.**

At the end of every module:

1.  Run its tests.
2.  Verify its acceptance criteria.
3.  Update the documentation.
4.  Record known limitations.
5.  Commit the working state.
6.  Only then start the next module.

The first end-to-end milestone is:

**Submit a public GitHub URL → resolve a commit → index eligible files →
visualize real file relationships → click a node and inspect its
source.**

Once that workflow is reliable, the remaining four features can be added
on top of a real, versioned code intelligence engine rather than being
disconnected AI demos.
