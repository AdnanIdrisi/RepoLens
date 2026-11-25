# RepoLens API Reference

The RepoLens REST API is served on `http://localhost:4000/api` (or configured `PORT`).

All responses follow the unified envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-25T12:00:00.000Z"
  }
}
```

Error responses return:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-11-25T12:00:00.000Z"
  }
}
```

---

## Headers

| Header | Description |
|---|---|
| `x-user-id` | Optional identity string for user-scoped ownership and tracking. |
| `Authorization` | Optional `Bearer <token>` identity header. |
| `RateLimit-Limit` | Maximum allowed requests within the active rate window. |
| `RateLimit-Remaining` | Remaining requests before throttling. |
| `RateLimit-Reset` | Seconds until window expiration. |
| `X-Response-Time` | Request execution time in milliseconds. |

---

## Endpoints

### 1. Health & Readiness
- **`GET /api/health`**
  - Returns service status and uptime.
- **`GET /api/ready`**
  - Returns database connection readiness (`checks.database`).

---

### 2. Repositories & Jobs
- **`POST /api/repositories`**
  - **Body:** `{ "url": "https://github.com/owner/repo", "ref": "main" }`
  - Validates the repository on GitHub and queues an asynchronous ingestion job.
- **`GET /api/repositories`**
  - Returns registered repositories.
- **`GET /api/repositories/:id`**
  - Returns metadata for a specific repository.
- **`GET /api/repositories/:id/files`**
  - **Query:** `?page=1&limit=25&status=all|discovered|excluded&search=...`
  - Returns paginated source files (`items` + `pagination`) in the active commit tree.
- **`POST /api/repositories/:id/sync`**
  - Triggers incremental commit differencing and index synchronization.
- **`GET /api/jobs/:jobId`**
  - Returns live ingestion job stage, file counters, and error diagnostics.
- **`POST /api/jobs/:jobId/cancel`**
  - Cancels a running ingestion job.

---

### 3. Source Files
- **`GET /api/repositories/:id/file/*`**
  - Returns source code content, line count, byte size, and SHA-256 content hash for a validated relative POSIX file path.

---

### 4. Code Relationship Graph (P1.1)
- **`GET /api/repositories/:id/graph`**
  - **Query:** `?scope=neighborhood|all&depth=1..3&limit=150&rootNodeId=...`
  - Returns nodes (files, functions, classes, methods, routes) and directed edges (`imports`, `defines`, `routes_to`, `calls`).
- **`GET /api/repositories/:id/symbols`**
  - Searches indexed AST symbols in the repository.
- **`GET /api/repositories/:id/symbols/:symbolId`**
  - Returns details for a specific indexed symbol.
- **`POST /api/repositories/:id/index`**
  - Triggers AST parsing and relationship graph indexing for the repository.

---

### 5. Code Search (P1.2)
- **`POST /api/repositories/:id/search`** and **`GET /api/repositories/:id/search`**
  - **Body / Query:** `{ "query": "authenticate jwt", "matchType": "hybrid|vector|lexical", "limit": 20, "path": "...", "symbolKinds": ["function"] }`
  - Returns ranked code chunks scored with zero-embedding Okapi BM25 + AST symbol matching and Reciprocal Rank Fusion.
- **`POST /api/repositories/:id/search/index`**
  - Builds or refreshes structural AST chunks for the repository.
- **`GET /api/repositories/:id/search/stats`**
  - Returns indexed chunk count, AST entity count, and search readiness status.

---

### 6. Static Execution Flow Tracing (P1.3)
- **`GET /api/repositories/:id/routes`**
  - Returns all statically discovered HTTP routes (`GET`, `POST`, `PUT`, `DELETE`, etc.).
- **`POST /api/repositories/:id/trace`**
  - **Body:** `{ "method": "GET", "path": "/api/users" }`
  - Returns ordered execution steps: Route Definition → Middlewares → Controller → Service → Model.
- **`POST /api/repositories/:id/routes/index`**
  - Discovers and indexes HTTP routes across the repository.

---

### 7. Gemini AI Agent (P1.4)
- **`POST /api/repositories/:id/agent/chat`**
  - **Body:** `{ "message": "Where is authentication handled?", "conversationId": "..." }`
  - Supports SSE (`Accept: text/event-stream`) streaming of status updates, tool executions, and final grounded response with `[file:line-range]` citations.
- **`GET /api/repositories/:id/agent/conversations`**
  - Lists agent conversations for the repository.
- **`GET /api/repositories/:id/agent/conversations/:conversationId`**
  - Retrieves messages, tool executions, and verified citations for a conversation.

---

### 8. Change Impact Analysis (P1.5)
- **`POST /api/repositories/:id/impact`**
  - **Body:** `{ "targetFilePath": "src/auth/jwt.ts", "maxDepth": 3 }`
  - Returns Layer-1 direct dependents (`directAffected`), Layer-2+ transitive callers (`indirectAffected`) with dependency paths, and suggested test suites (`suggestedTests`).
