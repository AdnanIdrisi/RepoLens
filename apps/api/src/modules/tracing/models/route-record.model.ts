import mongoose, { Document, Schema } from "mongoose";
import type { RouteRecord } from "@repolens/shared";

export interface RouteRecordDocument extends Document, RouteRecord {}

const RouteRecordSchema = new Schema<RouteRecordDocument>(
  {
    repositoryId: { type: String, required: true, index: true },
    commitSha: { type: String, required: true, index: true },
    method: { type: String, required: true, lowercase: true },
    path: { type: String, required: true },
    filePath: { type: String, required: true },
    startLine: { type: Number, required: true },
    handlerSymbolIds: { type: [String], default: [] },
    middlewareSymbolIds: { type: [String], default: [] },
    confidence: { type: Number, default: 1.0 }
  },
  {
    timestamps: true,
    collection: "route_records"
  }
);

RouteRecordSchema.index(
  { repositoryId: 1, commitSha: 1, method: 1, path: 1 },
  { unique: true }
);

export const RouteRecordModel = mongoose.model<RouteRecordDocument>(
  "RouteRecord",
  RouteRecordSchema
);
