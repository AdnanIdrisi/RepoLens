# RepoLens API Reference

The RepoLens REST API is served on `http://localhost:4000/api` (or configured `PORT`).

All responses follow the unified envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-24T12:00:00.000Z"
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
    "timestamp": "2026-10-24T12:00:00.000Z"
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

### 1. Health
- **`GET /api/health`**
  - Returns service status, uptime, and database connection state.

---

### 2. Repositories
- **`POST /api/repositories`**
  - **Body:** `{ "owner": "expressjs", "name": "express", "branch": "master" }`
  - Validates repository on GitHub and registers it for indexing.
- **`GET /api/repositories`**
  - Returns registered repositories.
- **`GET /api/repositories/:id`**
  - Returns metadata for a specific repository.
- **`POST /api/repositories/:id/sync`**
  - Triggers incremental commit differencing and index synchronization.

---

### 3. Source Files
- **`GET /api/repositories/:id/files`**
  - Returns all indexed source files in the active commit tree.
- **`GET /api/repositories/:id/files/:fileId/content`**
  - Returns source code lines, line numbers, and file metadata. Validates safe relative paths.

---

### 4. Code Relationship Graph (P1.1)
- **`GET /api/repositories/:id/graph`**
  - **Query:** `?scope=all|files|symbols&nodeId=...&depth=1..3`
  - Returns nodes (files, functions, classes, routes) and edges (imports, calls, defines).

---

### 5. Semantic & Hybrid Search (P1.2)
- **`GET /api/repositories/:id/search`**
  - **Query:** `?q=authenticate+jwt&mode=hybrid|vector|lexical&limit=10`
  - Returns ranked code chunks with reciprocal rank scores and source line ranges.

---

### 6. Static Execution Flow Tracing (P1.3)
- **`GET /api/repositories/:id/routes`**
  - Returns all statically discovered HTTP routes (`GET /api/users`, `POST /login`, etc.).
- **`GET /api/repositories/:id/trace`**
  - **Query:** `?routeId=...` or `?method=GET&path=/users`
  - Returns execution steps: Route Definition → Middlewares → Controller → Service → Model.

---

### 7. Gemini AI Agent (P1.4)
- **`POST /api/conversations`**
  - **Body:** `{ "repositoryId": "..." }`
  - Initializes a new interactive investigation conversation.
- **`GET /api/conversations/:id`**
  - Retrieves conversation messages, tool executions, and verified citations.
- **`POST /api/conversations/:id/messages`**
  - **Body:** `{ "message": "Where is the authentication middleware implemented?" }`
  - Executes multi-turn tool investigation loop and returns answer with source citations.

---

### 8. Change Impact Analysis (P1.5)
- **`GET /api/repositories/:id/impact`**
  - **Query:** `?filePath=src/auth/jwt.ts&symbolName=verifyToken&maxDepth=3`
  - Returns Layer-1 direct dependents, Layer-2+ transitive callers, and companion test files.
