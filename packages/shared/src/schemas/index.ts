import { z } from "zod";
import {
  REPOSITORY_STATUSES,
  JOB_STATUSES,
  FILE_STATUSES,
  SYMBOL_KINDS,
  IMPORT_RESOLUTION_STATUSES,
  GRAPH_NODE_KINDS,
  GRAPH_EDGE_KINDS
} from "../constants/index.js";

// Repository Schema
export const RepositorySchema = z.object({
  _id: z.string(),
  ownerId: z.string().default("anonymous"),
  provider: z.literal("github").default("github"),
  owner: z.string().min(1),
  name: z.string().min(1),
  remoteUrl: z.string().url(),
  defaultBranch: z.string().default("main"),
  selectedRef: z.string().default("main"),
  commitSha: z.string().optional(),
  activeIndexVersion: z.string().optional(),
  status: z.enum(REPOSITORY_STATUSES).default("pending"),
  errorMessage: z.string().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string())
});

export const RegisterRepositoryInputSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  ref: z.string().optional().default("main")
});

// Indexing Job Schema
export const IndexingJobSchema = z.object({
  _id: z.string(),
  repositoryId: z.string(),
  commitSha: z.string().optional(),
  indexVersion: z.string().optional(),
  status: z.enum(JOB_STATUSES).default("queued"),
  stage: z.string().default("validate_repository"),
  filesDiscovered: z.number().int().nonnegative().default(0),
  filesProcessed: z.number().int().nonnegative().default(0),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().int().nonnegative().default(0),
  startedAt: z.date().or(z.string()).optional(),
  completedAt: z.date().or(z.string()).optional(),
  createdAt: z.date().or(z.string())
});

// Code File Schema
export const CodeFileSchema = z.object({
  repositoryId: z.string(),
  commitSha: z.string(),
  path: z.string(),
  language: z.string(),
  blobSha: z.string().optional(),
  contentHash: z.string().optional(),
  sizeBytes: z.number().int().nonnegative(),
  lineCount: z.number().int().nonnegative().optional(),
  status: z.enum(FILE_STATUSES).default("discovered"),
  exclusionReason: z.string().optional()
});

// Symbol Record Schema
export const SymbolRecordSchema = z.object({
  repositoryId: z.string(),
  commitSha: z.string(),
  symbolId: z.string(),
  filePath: z.string(),
  name: z.string(),
  qualifiedName: z.string().optional(),
  kind: z.enum(SYMBOL_KINDS),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  startColumn: z.number().int().nonnegative().optional(),
  endColumn: z.number().int().nonnegative().optional(),
  parentSymbolId: z.string().optional(),
  exported: z.boolean().default(false)
});

// Import Record Schema
export const ImportRecordSchema = z.object({
  repositoryId: z.string(),
  commitSha: z.string(),
  importerPath: z.string(),
  importedSpecifier: z.string(),
  importedNames: z.array(z.string()),
  resolvedPath: z.string().optional(),
  resolutionStatus: z.enum(IMPORT_RESOLUTION_STATUSES),
  startLine: z.number().int().positive()
});

// Graph Node and Edge Schemas
export const GraphNodeSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  commitSha: z.string(),
  kind: z.enum(GRAPH_NODE_KINDS),
  label: z.string(),
  filePath: z.string(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional()
});

export const GraphEdgeEvidenceSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive()
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  commitSha: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  kind: z.enum(GRAPH_EDGE_KINDS),
  confidence: z.number().min(0).max(1).default(1.0),
  evidence: GraphEdgeEvidenceSchema.optional()
});

// Code Chunk Schema
export const CodeChunkSchema = z.object({
  repositoryId: z.string(),
  commitSha: z.string(),
  chunkId: z.string(),
  filePath: z.string(),
  symbolId: z.string().optional(),
  text: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  contentHash: z.string(),
  chunkerVersion: z.string(),
  embeddingModel: z.string().optional(),
  embedding: z.array(z.number()).optional()
});

// Route & Trace Record Schemas
export const RouteRecordSchema = z.object({
  repositoryId: z.string(),
  commitSha: z.string(),
  method: z.string(),
  path: z.string(),
  filePath: z.string(),
  startLine: z.number().int().positive(),
  handlerSymbolIds: z.array(z.string()),
  middlewareSymbolIds: z.array(z.string()),
  confidence: z.number().min(0).max(1).default(1.0)
});

export const TraceStepSchema = z.object({
  symbolId: z.string().optional(),
  filePath: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  label: z.string(),
  relationship: z.string(),
  confidence: z.number().min(0).max(1).default(1.0),
  evidence: z.string().optional()
});
