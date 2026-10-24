import mongoose, { Schema, Document } from "mongoose";
import type { Repository } from "@repolens/shared";

export type RepositoryDocument = Document & Repository;

const RepositorySchema = new Schema<RepositoryDocument>(
  {
    ownerId: { type: String, required: true, default: "anonymous", index: true },
    provider: { type: String, required: true, default: "github" },
    owner: { type: String, required: true },
    name: { type: String, required: true },
    remoteUrl: { type: String, required: true },
    defaultBranch: { type: String, required: true, default: "main" },
    selectedRef: { type: String, required: true, default: "main" },
    commitSha: { type: String },
    activeIndexVersion: { type: String },
    status: {
      type: String,
      enum: ["pending", "fetching", "discovered", "indexing", "ready", "failed"],
      default: "pending",
      index: true
    },
    errorMessage: { type: String }
  },
  {
    timestamps: true
  }
);

// Compound unique index per ownerId, owner, and repository name
RepositorySchema.index({ ownerId: 1, owner: 1, name: 1 }, { unique: true });

export const RepositoryModel = mongoose.model<RepositoryDocument>(
  "Repository",
  RepositorySchema
);
