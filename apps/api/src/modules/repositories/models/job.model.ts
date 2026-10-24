import mongoose, { Schema, Document } from "mongoose";
import type { IndexingJob } from "@repolens/shared";

export type IndexingJobDocument = Document & IndexingJob;

const IndexingJobSchema = new Schema<IndexingJobDocument>(
  {
    repositoryId: { type: String, required: true, index: true },
    commitSha: { type: String },
    indexVersion: { type: String },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "cancelled"],
      default: "queued",
      index: true
    },
    stage: { type: String, default: "validate_repository" },
    filesDiscovered: { type: Number, default: 0 },
    filesProcessed: { type: Number, default: 0 },
    errorCode: { type: String },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

IndexingJobSchema.index({ repositoryId: 1, createdAt: -1 });

export const IndexingJobModel = mongoose.model<IndexingJobDocument>(
  "IndexingJob",
  IndexingJobSchema
);
