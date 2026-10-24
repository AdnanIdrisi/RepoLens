# RepoLens Security Architecture & Threat Model

RepoLens is designed with a defense-in-depth security model to ensure that arbitrary, untrusted source code repositories from the public web can be analyzed safely without endangering the host system, worker infrastructure, or client browsers.

---

## 1. Untrusted Code Containment

1. **Zero Execution of Analyzed Code:**
   RepoLens parses source files purely via Tree-sitter Abstract Syntax Trees (AST). Analyzed code is **never executed**, compiled with untrusted tools, evaluated with `eval()`, or run under Node.js runtime environments.
2. **Zero Dependency Installation:**
   `npm install`, `yarn`, `pip`, or similar package manager commands are **never invoked** against analyzed repositories.
3. **No Shell or File System Escape:**
   No shell executions (`exec`, `spawn`, `fork`) or file-writing operations are available to the indexing engine or AI agent tools.

---

## 2. API Security & Input Validation

1. **Path Traversal Defense:**
   All file paths requested by users or AI tools are validated against a strict regex and directory traversal guard (`validateSafeFilePath`):
   - Relative POSIX paths only.
   - Any `..`, `./`, or `.\` traversal sequences are rejected with HTTP 400 `INVALID_PATH`.
   - Windows drive letters (`C:`) and absolute Unix root `/` paths are rejected.
   - ASCII control characters and null bytes (`\0`) are rejected.
2. **Strict Schema Validation:**
   Every API endpoint validates incoming bodies and query parameters with Zod schemas. Malformed payloads are rejected immediately.
3. **Rate Limiting & Denial of Service Protection:**
   - In-memory sliding-window rate limiters prevent API flooding.
   - Standard RFC rate limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) inform clients of their quota.
   - Request body sizes are capped at 10MB.
4. **Security Headers:**
   All HTTP responses include standard defensive headers:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 3. Gemini AI Agent Security & Tool Boundaries

1. **Read-Only Authorized Toolset:**
   The AI agent is restricted to an explicit whitelist of 7 read-only investigation tools (`readFile`, `searchCode`, `findReferences`, `getFileGraph`, `traceExecutionFlow`, `analyzeImpact`, `getRepositorySummary`).
   No write, mutate, or external network tools exist in the agent tool registry.
2. **Bounded Iteration Budgets:**
   The agent's multi-turn tool call loop is strictly capped at a maximum of 5 iterations per user turn. This prevents infinite loops or excessive API token consumption.
3. **Prompt Injection & Indirect Injection Defense:**
   - Source code and repository README files are treated as untrusted text.
   - The agent system prompt instructs the model to ignore any instructions found inside source code comments or documentation that attempt to override system rules.
4. **Citation Verification:**
   All citations returned by the agent (`[filename:lines]`) are parsed and verified against actual indexed files and line counts. Hallucinated or non-existent file links are rejected.
5. **Credential Isolation:**
   Gemini API keys and GitHub personal access tokens are stored securely in backend server environment variables. They are never exposed to the client or embedded in browser bundles.
