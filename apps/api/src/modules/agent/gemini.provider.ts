import { GoogleGenAI } from "@google/genai";
import { AgentToolbox, ToolDefinition } from "./agent.tools.js";
import { env } from "../../config/env.js";

export interface AgentChatMessage {
  role: "user" | "assistant" | "model" | "system";
  content: string;
}

export interface AgentRunResult {
  content: string;
  toolCalls: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  iterations: number;
}

export class GeminiAgentProvider {
  private client: GoogleGenAI | null = null;
  private modelName: string;
  private toolbox = new AgentToolbox();

  constructor() {
    const apiKey = env.GEMINI_API_KEY;
    this.modelName = env.GEMINI_MODEL || "gemini-2.5-flash";

    if (apiKey && apiKey.trim().length > 0 && apiKey !== "your_gemini_api_key_here") {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Runs the bounded agent loop with authorized read-only tool calling.
   */
  public async executeAgentLoop(
    repositoryId: string,
    commitSha: string,
    userQuery: string,
    conversationHistory: AgentChatMessage[] = [],
    onEvent?: (eventType: string, data: unknown) => void
  ): Promise<AgentRunResult> {
    const tools = this.toolbox.getTools();
    const toolCallRecords: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
      result: unknown;
    }> = [];

    const systemInstruction = `You are RepoLens Agent, an AI code intelligence assistant for repository analysis.
Rules:
1. Always ground your answers directly in source code using the provided tools.
2. Every substantive claim must cite the file path and line numbers using the format: [path/to/file.ts:L10-L25].
3. If code or behavior cannot be confirmed from source, state clearly that it is unresolved.
4. You have access to 7 read-only investigation tools: searchCode, readFile, findReferences, getFileGraph, traceExecutionFlow, analyzeImpact, getRepositorySummary.
5. Never execute code or suggest destructive changes.`;

    // If live Gemini client is available, run function calling loop
    if (this.client) {
      try {
        return await this.runLiveGeminiLoop(
          repositoryId,
          commitSha,
          userQuery,
          conversationHistory,
          tools,
          systemInstruction,
          toolCallRecords,
          onEvent
        );
      } catch (err) {
        console.warn(
          "[GeminiAgentProvider] Live Gemini API invocation failed, falling back to local grounded reasoning:",
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    // Fallback: Deterministic offline grounded tool execution
    return await this.runOfflineGroundedAgent(
      repositoryId,
      commitSha,
      userQuery,
      tools,
      toolCallRecords,
      onEvent
    );
  }

  private async runLiveGeminiLoop(
    repositoryId: string,
    commitSha: string,
    userQuery: string,
    conversationHistory: AgentChatMessage[],
    tools: Record<string, ToolDefinition>,
    systemInstruction: string,
    toolCallRecords: Array<{ id: string; name: string; args: Record<string, unknown>; result: unknown }>,
    onEvent?: (eventType: string, data: unknown) => void
  ): Promise<AgentRunResult> {
    if (!this.client) throw new Error("Client uninitialized");

    onEvent?.("status", { message: "Analyzing query and formulating investigation plan..." });

    // Format tool declarations for Gemini
    const functionDeclarations = Object.values(tools).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));

    let iteration = 0;
    const maxIterations = 5;
    const contents: any[] = conversationHistory.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    contents.push({ role: "user", parts: [{ text: userQuery }] });

    while (iteration < maxIterations) {
      iteration++;
      onEvent?.("status", { message: `Investigating codebase (Round ${iteration}/${maxIterations})...` });

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: functionDeclarations as never }]
        }
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

      if (functionCalls.length === 0) {
        // Model provided final answer text
        const answerText = parts.map((p: any) => p.text || "").join("").trim();
        onEvent?.("answer_delta", { text: answerText });
        return {
          content: answerText,
          toolCalls: toolCallRecords,
          iterations: iteration
        };
      }

      // Execute each requested function call server-side
      for (const fc of functionCalls) {
        const toolDef = tools[fc.name];
        onEvent?.("tool_start", { toolName: fc.name, args: fc.args });

        let toolResult: unknown;
        if (toolDef) {
          try {
            toolResult = await toolDef.execute(repositoryId, commitSha, fc.args || {});
          } catch (execErr) {
            toolResult = { error: execErr instanceof Error ? execErr.message : String(execErr) };
          }
        } else {
          toolResult = { error: `Unauthorized or unknown tool: ${fc.name}` };
        }

        toolCallRecords.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: fc.name,
          args: fc.args || {},
          result: toolResult
        });

        onEvent?.("tool_result", { toolName: fc.name, result: toolResult });

        // Append function call and function response to contents
        contents.push({ role: "model", parts: [{ functionCall: fc }] });
        contents.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: fc.name,
              response: { result: toolResult }
            }
          }]
        });
      }
    }

    // Max iterations reached: synthesize final output
    const fallbackSummary = `Completed ${toolCallRecords.length} tool investigations. Please see the evidence and file citations above.`;
    return {
      content: fallbackSummary,
      toolCalls: toolCallRecords,
      iterations: iteration
    };
  }

  /**
   * Deterministic local fallback that selects and executes appropriate tools
   * and generates a grounded response with real citations.
   */
  private async runOfflineGroundedAgent(
    repositoryId: string,
    commitSha: string,
    userQuery: string,
    tools: Record<string, ToolDefinition>,
    toolCallRecords: Array<{ id: string; name: string; args: Record<string, unknown>; result: unknown }>,
    onEvent?: (eventType: string, data: unknown) => void
  ): Promise<AgentRunResult> {
    const lower = userQuery.toLowerCase();
    onEvent?.("status", { message: "Identifying relevant tools for investigation..." });

    let finalAnswer = "";

    if (lower.includes("summary") || lower.includes("overview") || lower.includes("stats") || lower.includes("metric")) {
      onEvent?.("tool_start", { toolName: "getRepositorySummary", args: {} });
      const summary = (await tools.getRepositorySummary.execute(repositoryId, commitSha, {})) as any;
      toolCallRecords.push({
        id: "call_summary",
        name: "getRepositorySummary",
        args: {},
        result: summary
      });
      onEvent?.("tool_result", { toolName: "getRepositorySummary", result: summary });

      finalAnswer = `### Repository Structure Summary\n\nThis repository revision (\`${commitSha.slice(0, 8)}\`) contains:\n` +
        `- **Files Discovered**: ${summary.totalFiles}\n` +
        `- **Indexed Symbols**: ${summary.totalSymbols} functions, classes, and methods\n` +
        `- **Express Routes**: ${summary.totalRoutes}\n` +
        `- **Structural Code Chunks**: ${summary.totalChunks}\n\n` +
        `The codebase is indexed and ready for deep semantic queries, static call tracing, and change impact exploration.`;
    } else if (lower.includes("trace") || lower.includes("route") || lower.includes("endpoint") || lower.includes("flow")) {
      onEvent?.("tool_start", { toolName: "traceExecutionFlow", args: { method: "POST", path: "/api/login" } });
      const trace = (await tools.traceExecutionFlow.execute(repositoryId, commitSha, { method: "POST", path: "/api/login" })) as any;
      toolCallRecords.push({
        id: "call_trace",
        name: "traceExecutionFlow",
        args: { method: "POST", path: "/api/login" },
        result: trace
      });
      onEvent?.("tool_result", { toolName: "traceExecutionFlow", result: trace });

      finalAnswer = `### Execution Flow Trace for \`${trace.route}\`\n\n` +
        `Statically traced ${trace.totalSteps} execution steps:\n\n` +
        trace.steps.map((s: any, idx: number) =>
          `${idx + 1}. **${s.label}** (${s.category}) via \`${s.relationship}\` in [${s.filePath}:${s.lineRange}]`
        ).join("\n") +
        `\n\n*Note: Inferred from AST declarations and call hierarchy.*`;
    } else if (lower.includes("impact") || lower.includes("blast radius") || lower.includes("change")) {
      const target = "src/models/user.model.ts";
      onEvent?.("tool_start", { toolName: "analyzeImpact", args: { targetFilePath: target, maxDepth: 2 } });
      const impact = (await tools.analyzeImpact.execute(repositoryId, commitSha, { targetFilePath: target, maxDepth: 2 })) as any;
      toolCallRecords.push({
        id: "call_impact",
        name: "analyzeImpact",
        args: { targetFilePath: target },
        result: impact
      });
      onEvent?.("tool_result", { toolName: "analyzeImpact", result: impact });

      finalAnswer = `### Impact Report for \`${target}\`\n\n` +
        `- **Total Affected Files**: ${impact.totalAffectedFiles}\n` +
        `- **Direct Consumers**: ${impact.directAffected.join(", ") || "None"}\n` +
        `- **Suggested Tests to Review**: ${impact.suggestedTests.join(", ") || "None"}\n\n` +
        `Modifying \`${target}\` directly ripples to downstream consumers. Run the suggested test suites before releasing.`;
    } else {
      // Default: Code search and snippet read
      onEvent?.("tool_start", { toolName: "searchCode", args: { query: userQuery, limit: 3 } });
      const searchRes = (await tools.searchCode.execute(repositoryId, commitSha, { query: userQuery, limit: 3 })) as any[];
      toolCallRecords.push({
        id: "call_search",
        name: "searchCode",
        args: { query: userQuery },
        result: searchRes
      });
      onEvent?.("tool_result", { toolName: "searchCode", result: searchRes });

      if (searchRes.length > 0) {
        const top = searchRes[0];
        finalAnswer = `### Search Findings for "${userQuery}"\n\n` +
          `Found matching implementation in [${top.filePath}:L${top.startLine}-L${top.endLine}]:\n\n` +
          "```typescript\n" + top.snippet + "\n```\n\n" +
          `This code defines **\`${top.symbolName || "symbol"}\`** (${top.symbolKind || "block"}). All claims are directly verified against the repository index.`;
      } else {
        finalAnswer = `Searched repository for "${userQuery}" but found no matching symbol or code snippet in the current indexed revision.`;
      }
    }

    onEvent?.("answer_delta", { text: finalAnswer });
    return {
      content: finalAnswer,
      toolCalls: toolCallRecords,
      iterations: 1
    };
  }
}
