import mongoose, { Document, Schema } from "mongoose";
import type { CodeEntity } from "@repolens/shared";

export interface CodeEntityDocument extends Document, Omit<CodeEntity, "entityId"> {
  entityId: string;
}

const CodeEntitySchema = new Schema<CodeEntityDocument>(
  {
    repositoryId: { type: String, required: true, index: true },
    commitSha: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    filePath: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityName: { type: String, required: true, index: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    parentEntity: { type: String },
    imports: { type: [String], default: [] },
    calls: { type: [String], default: [] },
    code: { type: String, required: true },
    contentHash: { type: String, required: true },
    docstring: { type: String }
  },
  {
    timestamps: true,
    collection: "code_entities"
  }
);

CodeEntitySchema.index({ repositoryId: 1, commitSha: 1, entityId: 1 }, { unique: true });
CodeEntitySchema.index({ repositoryId: 1, commitSha: 1, filePath: 1 });
CodeEntitySchema.index({ repositoryId: 1, commitSha: 1, entityType: 1 });
CodeEntitySchema.index({ repositoryId: 1, commitSha: 1, entityName: 1 });

export const CodeEntityModel = mongoose.model<CodeEntityDocument>("CodeEntity", CodeEntitySchema);

