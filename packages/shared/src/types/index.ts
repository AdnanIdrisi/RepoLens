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
  CodeEntitySchema,
  RouteRecordSchema,
  TraceStepSchema,
  TraceRequestSchema,
  TraceResponseSchema,
  SearchRequestSchema,
  SearchResultItemSchema,
  SearchResponseSchema,
  ImpactRequestSchema,
  AffectedEntitySchema,
  ImpactReportSchema,
  AgentCitationSchema,
  AgentToolCallSchema,
  AgentMessageSchema,
  AgentChatRequestSchema,
  AgentChatResponseSchema
} from "../schemas/index.js";
import {
  REPOSITORY_STATUSES,
  JOB_STATUSES,
  PIPELINE_STAGES,
  FILE_STATUSES,
  SYMBOL_KINDS,
  IMPORT_RESOLUTION_STATUSES,
  GRAPH_NODE_KINDS,
  GRAPH_EDGE_KINDS,
  SEARCH_MATCH_TYPES
} from "../constants/index.js";

export type RepositoryStatus = (typeof REPOSITORY_STATUSES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type FileStatus = (typeof FILE_STATUSES)[number];
export type SymbolKind = (typeof SYMBOL_KINDS)[number];
export type ImportResolutionStatus = (typeof IMPORT_RESOLUTION_STATUSES)[number];
export type GraphNodeKind = (typeof GRAPH_NODE_KINDS)[number];
export type GraphEdgeKind = (typeof GRAPH_EDGE_KINDS)[number];
export type SearchMatchType = (typeof SEARCH_MATCH_TYPES)[number];

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
export type CodeEntity = z.infer<typeof CodeEntitySchema>;
export type RouteRecord = z.infer<typeof RouteRecordSchema>;
export type TraceStep = z.infer<typeof TraceStepSchema>;
export type TraceRequest = z.infer<typeof TraceRequestSchema>;
export type TraceResponse = z.infer<typeof TraceResponseSchema>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type ImpactRequest = z.infer<typeof ImpactRequestSchema>;
export type AffectedEntity = z.infer<typeof AffectedEntitySchema>;
export type ImpactReport = z.infer<typeof ImpactReportSchema>;
export type AgentCitation = z.infer<typeof AgentCitationSchema>;
export type AgentToolCall = z.infer<typeof AgentToolCallSchema>;
export type AgentMessage = z.infer<typeof AgentMessageSchema>;
export type AgentChatRequest = z.infer<typeof AgentChatRequestSchema>;
export type AgentChatResponse = z.infer<typeof AgentChatResponseSchema>;

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
