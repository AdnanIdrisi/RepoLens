import mongoose, { Schema, Document } from "mongoose";
import type { GraphNode } from "@repolens/shared";

export type GraphNodeDocument = Document & GraphNode;

const GraphNodeSchema = new Schema<GraphNodeDocument>(
  {
    id: { type: String, required: true },
    repositoryId: { type: String, required: true, index: true },
    commitSha: { type: String, required: true, index: true },
    kind: {
      type: String,
      enum: ["file", "function", "class", "method", "route"],
      required: true,
      index: true
    },
    label: { type: String, required: true },
    filePath: { type: String, required: true, index: true },
    startLine: { type: Number },
    endLine: { type: Number }
  },
  {
    timestamps: true
  }
);

GraphNodeSchema.index({ repositoryId: 1, commitSha: 1, id: 1 }, { unique: true });
GraphNodeSchema.index({ repositoryId: 1, commitSha: 1, filePath: 1 });

export const GraphNodeModel = mongoose.model<GraphNodeDocument>(
  "GraphNode",
  GraphNodeSchema
);
