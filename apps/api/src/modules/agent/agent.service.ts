import { GeminiAgentProvider } from "./gemini.provider.js";
import { ConversationModel, ConversationDocument } from "./models/conversation.model.js";
import { RepositoryModel } from "../repositories/models/repository.model.js";
import { ApiError } from "../../middleware/error.middleware.js";
import type { AgentMessage, AgentCitation, AgentChatResponse } from "@repolens/shared";

export class AgentService {
  private geminiProvider = new GeminiAgentProvider();

  /**
   * Dispatches a message to the agent loop, executes authorized tools,
   * extracts and verifies citations, and persists the conversation.
   */
  public async chat(
    repositoryId: string,
    messageText: string,
    conversationId?: string,
    onStreamEvent?: (eventType: string, data: unknown) => void
  ): Promise<AgentChatResponse> {
    const repo = await RepositoryModel.findById(repositoryId);
    if (!repo) {
      throw new ApiError(404, "NOT_FOUND", "Repository not found");
    }

    const commitSha = repo.commitSha;
    if (!commitSha) {
      throw new ApiError(400, "BAD_REQUEST", "Repository has not completed commit resolution");
    }

    // 1. Find or create conversation
    let conv: ConversationDocument | null = null;
    if (conversationId) {
      conv = await ConversationModel.findById(conversationId);
    }

    if (!conv) {
      conv = new ConversationModel({
        repositoryId,
        commitSha,
        title: messageText.slice(0, 40),
        messages: []
      });
    }

    // 2. Add user message
    const userMessage: AgentMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      content: messageText,
      createdAt: new Date()
    };
    conv.messages.push(userMessage);

    // 3. Run bounded agent loop with tool access
    const history = conv.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "model" | "system",
      content: m.content
    }));

    const result = await this.geminiProvider.executeAgentLoop(
      repositoryId,
      commitSha,
      messageText,
      history,
      onStreamEvent
    );

    // 4. Extract citations from answer and tool calls
    const citations = this.extractCitations(result.content, result.toolCalls);

    // 5. Add assistant message
    const assistantMessage: AgentMessage = {
      id: `msg_${Date.now()}_a`,
      role: "assistant",
      content: result.content,
      toolCalls: result.toolCalls,
      citations,
      createdAt: new Date()
    };

    conv.messages.push(assistantMessage);
    await conv.save();

    return {
      conversationId: conv._id.toString(),
      message: assistantMessage,
      iterations: result.iterations
    };
  }

  public async getConversation(conversationId: string): Promise<ConversationDocument> {
    const conv = await ConversationModel.findById(conversationId);
    if (!conv) {
      throw new ApiError(404, "NOT_FOUND", "Conversation not found");
    }
    return conv;
  }

  public async listConversations(repositoryId: string): Promise<ConversationDocument[]> {
    return ConversationModel.find({ repositoryId }).sort({ updatedAt: -1 }).limit(20);
  }

  private extractCitations(
    text: string,
    toolCalls: Array<{ name: string; result: unknown }>
  ): AgentCitation[] {
    const citations: AgentCitation[] = [];
    const seen = new Set<string>();

    // Regex match: [path/to/file.ts:L10-L25] or [path/to/file.ts:10-25]
    const citationRegex = /\[([^:\s]+):L?(\d+)-L?(\d+)\]/g;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const filePath = match[1];
      const startLine = parseInt(match[2], 10);
      const endLine = parseInt(match[3], 10);
      const key = `${filePath}:${startLine}-${endLine}`;

      if (!seen.has(key)) {
        seen.add(key);
        citations.push({
          filePath,
          startLine,
          endLine
        });
      }
    }

    // Also pull verified file sources from searchCode / readFile tool calls if not cited
    for (const tc of toolCalls) {
      if (tc.name === "searchCode" && Array.isArray(tc.result)) {
        for (const item of tc.result) {
          if (item?.filePath && item?.startLine && item?.endLine) {
            const key = `${item.filePath}:${item.startLine}-${item.endLine}`;
            if (!seen.has(key)) {
              seen.add(key);
              citations.push({
                filePath: item.filePath,
                startLine: item.startLine,
                endLine: item.endLine,
                snippet: typeof item.snippet === "string" ? item.snippet.slice(0, 150) : undefined
              });
            }
          }
        }
      }
    }

    return citations;
  }
}
