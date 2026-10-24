import { z } from "zod";
import {
  RepositorySchema,
  RegisterRepositoryInputSchema,
  IndexingJobSchema,
  CodeFileSchema,
  SymbolRecordSchema,
  ImportRecordSchema,
  GraphNodeSchema,
  GraphEdgeSchema,
  GraphEdgeEvidenceSchema,
  CodeChunkSchema,
  RouteRecordSchema,
  TraceStepSchema
} from "../schemas/index.js";
import {
  REPOSITORY_STATUSES,
  JOB_STATUSES,
  PIPELINE_STAGES,
  FILE_STATUSES,
  SYMBOL_KINDS,
  IMPORT_RESOLUTION_STATUSES,
  GRAPH_NODE_KINDS,
  GRAPH_EDGE_KINDS
} from "../constants/index.js";

export type RepositoryStatus = (typeof REPOSITORY_STATUSES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type FileStatus = (typeof FILE_STATUSES)[number];
export type SymbolKind = (typeof SYMBOL_KINDS)[number];
export type ImportResolutionStatus = (typeof IMPORT_RESOLUTION_STATUSES)[number];
export type GraphNodeKind = (typeof GRAPH_NODE_KINDS)[number];
export type GraphEdgeKind = (typeof GRAPH_EDGE_KINDS)[number];

export type Repository = z.infer<typeof RepositorySchema>;
export type RegisterRepositoryInput = z.infer<typeof RegisterRepositoryInputSchema>;
export type IndexingJob = z.infer<typeof IndexingJobSchema>;
export type CodeFile = z.infer<typeof CodeFileSchema>;
export type SymbolRecord = z.infer<typeof SymbolRecordSchema>;
export type ImportRecord = z.infer<typeof ImportRecordSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type GraphEdgeEvidence = z.infer<typeof GraphEdgeEvidenceSchema>;
export type CodeChunk = z.infer<typeof CodeChunkSchema>;
export type RouteRecord = z.infer<typeof RouteRecordSchema>;
export type TraceStep = z.infer<typeof TraceStepSchema>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}
