import mongoose, { Schema, Document } from "mongoose";
import type { CodeFile } from "@repolens/shared";

export interface CodeFileDocument extends Document, Omit<CodeFile, "status"> {
  status: "discovered" | "fetched" | "excluded" | "failed";
  content?: string;
}

const CodeFileSchema = new Schema<CodeFileDocument>(
  {
    repositoryId: { type: String, required: true, index: true },
    commitSha: { type: String, required: true, index: true },
    path: { type: String, required: true },
    language: { type: String, required: true },
    blobSha: { type: String },
    contentHash: { type: String },
    sizeBytes: { type: Number, required: true, default: 0 },
    lineCount: { type: Number },
    status: {
      type: String,
      enum: ["discovered", "fetched", "excluded", "failed"],
      default: "discovered",
      index: true
    },
    exclusionReason: { type: String },
    content: { type: String }
  },
  {
    timestamps: true
  }
);

// Unique file per repository, commit, and file path
CodeFileSchema.index({ repositoryId: 1, commitSha: 1, path: 1 }, { unique: true });
CodeFileSchema.index({ repositoryId: 1, status: 1 });

export const CodeFileModel = mongoose.model<CodeFileDocument>(
  "CodeFile",
  CodeFileSchema
);
