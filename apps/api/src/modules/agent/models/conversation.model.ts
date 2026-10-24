import mongoose, { Document, Schema } from "mongoose";
import type { AgentMessage } from "@repolens/shared";

export interface ConversationDocument extends Document {
  repositoryId: string;
  commitSha: string;
  title: string;
  messages: AgentMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    repositoryId: { type: String, required: true, index: true },
    commitSha: { type: String, required: true, index: true },
    title: { type: String, default: "Code Investigation" },
    messages: [
      {
        id: { type: String, required: true },
        role: { type: String, required: true, enum: ["user", "assistant", "system"] },
        content: { type: String, required: true },
        toolCalls: { type: Schema.Types.Mixed, default: undefined },
        citations: { type: Schema.Types.Mixed, default: undefined },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true,
    collection: "agent_conversations"
  }
);

ConversationSchema.index({ repositoryId: 1, updatedAt: -1 });

export const ConversationModel = mongoose.model<ConversationDocument>(
  "Conversation",
  ConversationSchema
);
