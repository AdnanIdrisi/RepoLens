export const REPOSITORY_STATUSES = [
  "pending",
  "fetching",
  "discovered",
  "indexing",
  "ready",
  "failed"
] as const;

export const JOB_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled"
] as const;

export const PIPELINE_STAGES = [
  "validate_repository",
  "resolve_commit",
  "discover_tree",
  "filter_files",
  "fetch_source",
  "normalize_source",
  "parse_source",
  "extract_symbols",
  "extract_imports_exports",
  "resolve_modules",
  "resolve_symbols",
  "build_graph",
  "build_chunks",
  "generate_embeddings",
  "validate_index",
  "publish_index"
] as const;

export const FILE_STATUSES = [
  "discovered",
  "fetched",
  "excluded",
  "failed"
] as const;

export const SYMBOL_KINDS = [
  "function",
  "class",
  "method",
  "variable",
  "route",
  "callback"
] as const;

export const IMPORT_RESOLUTION_STATUSES = [
  "resolved",
  "external",
  "dynamic",
  "unresolved"
] as const;

export const GRAPH_NODE_KINDS = [
  "file",
  "function",
  "class",
  "method",
  "route"
] as const;

export const GRAPH_EDGE_KINDS = [
  "imports",
  "defines",
  "calls",
  "references",
  "routes_to",
  "middleware_to",
  "uses"
] as const;
