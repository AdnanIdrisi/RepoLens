import mongoose, { Schema, Document } from "mongoose";
import type { GraphEdge } from "@repolens/shared";

export type GraphEdgeDocument = Document & GraphEdge;

const GraphEdgeSchema = new Schema<GraphEdgeDocument>(
  {
    id: { type: String, required: true },
    repositoryId: { type: String, required: true, index: true },
    commitSha: { type: String, required: true, index: true },
    sourceId: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    kind: {
      type: String,
      enum: [
        "imports",
        "defines",
        "calls",
        "references",
        "routes_to",
        "middleware_to",
        "uses"
      ],
      required: true,
      index: true
    },
    confidence: { type: Number, required: true, default: 1.0 },
    evidence: {
      filePath: { type: String },
      startLine: { type: Number },
      endLine: { type: Number }
    }
  },
  {
    timestamps: true
  }
);

GraphEdgeSchema.index({ repositoryId: 1, commitSha: 1, id: 1 }, { unique: true });
GraphEdgeSchema.index({ repositoryId: 1, commitSha: 1, sourceId: 1 });
GraphEdgeSchema.index({ repositoryId: 1, commitSha: 1, targetId: 1 });

export const GraphEdgeModel = mongoose.model<GraphEdgeDocument>(
  "GraphEdge",
  GraphEdgeSchema
);
