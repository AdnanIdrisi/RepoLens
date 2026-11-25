import { useState, useEffect, useRef, FormEvent } from "react";
import {
  Bot,
  User,
  Send,
  Loader2,
  FileCode,
  Sparkles,
  AlertCircle,
  ArrowUpRight
} from "lucide-react";
import { ToolCallBadge } from "./ToolCallBadge";
import { SourceViewerModal } from "../repositories/SourceViewerModal";
import type { AgentMessage, AgentCitation } from "@repolens/shared";

interface AgentChatPageProps {
  repositoryId: string;
}

export function AgentChatPage({ repositoryId }: AgentChatPageProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am RepoLens Agent powered by Google Gemini. I can investigate this codebase, inspect architecture relationships, trace execution flows, and assess change impacts using verified read-only tools.\n\nAsk me anything about how this project is structured or how specific features operate!",
      createdAt: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [selectedFileForModal, setSelectedFileForModal] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusMessage]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    setInputValue("");
    setError(null);
    setLoading(true);
    setStatusMessage("Formulating investigation strategy...");

    const userMsg: AgentMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: query,
      createdAt: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch(`/api/repositories/${repositoryId}/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream"
        },
        body: JSON.stringify({
          message: query,
          conversationId
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error?.message || "Failed to communicate with agent");
      }

      // Check if streaming SSE or JSON response
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const eventMatch = line.match(/^event:\s*(\w+)/);
            const dataMatch = line.match(/data:\s*(.+)$/m);

            if (eventMatch && dataMatch) {
              const eventType = eventMatch[1];
              try {
                const eventData = JSON.parse(dataMatch[1]);

                if (eventType === "status") {
                  setStatusMessage(eventData.message);
                } else if (eventType === "tool_start") {
                  setStatusMessage(`Executing tool: ${eventData.toolName}...`);
                } else if (eventType === "done") {
                  setConversationId(eventData.conversationId);
                  setMessages((prev) => [...prev, eventData.message]);
                  setStatusMessage(null);
                } else if (eventType === "error") {
                  setError(eventData.message);
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      } else {
        // Regular JSON fallback
        const data = await response.json();
        if (data.success && data.data) {
          setConversationId(data.data.conversationId);
          setMessages((prev) => [...prev, data.data.message]);
        } else {
          throw new Error(data.error?.message || "Agent error");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent connection error");
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] rounded-xl border border-[#1e293b] bg-[#0f172a] overflow-hidden shadow-xs">
      {/* Agent Chat Header */}
      <div className="px-6 py-3.5 border-b border-[#1e293b] bg-[#0b0f19] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2 font-display">
              <span>RepoLens Gemini Agent (P1.4)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Read-Only Tools Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Grounded code answers with AST citations &amp; server-side tool execution
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090d16]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-2xs ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-[#111827] text-indigo-400 border border-[#334155]"
              }`}
            >
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-[#0f172a] border border-[#1e293b] text-slate-100 shadow-2xs"
              }`}
            >
              {/* Tool Calls Executed by Assistant */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-3 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                    Tools Executed ({msg.toolCalls.length}):
                  </span>
                  {msg.toolCalls.map((tc, idx) => (
                    <ToolCallBadge key={tc.id || idx} toolCall={tc} />
                  ))}
                </div>
              )}

              {/* Message Content */}
              <div className="whitespace-pre-wrap leading-relaxed text-xs font-sans">
                {msg.content}
              </div>

              {/* Verified Source Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#1e293b] space-y-1.5">
                  <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                    Verified Source Citations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((c: AgentCitation, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedFileForModal(c.filePath)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#111827] hover:bg-[#1e293b] text-slate-200 text-[11px] font-mono border border-[#334155] transition-colors shadow-2xs font-medium"
                      >
                        <FileCode className="h-3 w-3 text-slate-400" />
                        <span>{c.filePath}:L{c.startLine}-{c.endLine}</span>
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Status Banner during Streaming / Tool Execution */}
        {loading && statusMessage && (
          <div className="flex items-center space-x-3 text-xs text-slate-300 font-mono bg-[#111827] border border-[#1e293b] p-3 rounded-xl max-w-md shadow-xs">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 text-indigo-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center space-x-2 font-medium">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-6 py-2.5 bg-[#0b0f19] border-t border-[#1e293b] flex items-center space-x-2 overflow-x-auto text-xs">
        <Sparkles className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
        <span className="text-slate-400 font-medium flex-shrink-0">Suggestions:</span>
        {[
          "Give me an architectural overview of this repository",
          "What Express routes exist and how do they trace to services?",
          "Explain how authentication is handled in this codebase",
          "What is the blast radius if I change the User model?"
        ].map((s) => (
          <button
            key={s}
            onClick={() => handleSendMessage(s)}
            disabled={loading}
            className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#111827] hover:bg-[#1e293b] hover:text-indigo-300 hover:border-indigo-500/40 text-slate-300 text-[11px] border border-[#334155] transition-colors disabled:opacity-50 shadow-2xs font-medium"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Prompt Input Form */}
      <form onSubmit={handleFormSubmit} className="p-4 bg-[#0b0f19] border-t border-[#1e293b]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Gemini Agent to analyze code, trace flows, or estimate impacts..."
            disabled={loading}
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-[#111827] border border-[#334155] text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:bg-[#161f30] focus:border-indigo-500 disabled:opacity-50 shadow-2xs"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="absolute right-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 flex items-center justify-center"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {/* Source Viewer Modal */}
      {selectedFileForModal && (
        <SourceViewerModal
          repositoryId={repositoryId}
          filePath={selectedFileForModal}
          onClose={() => setSelectedFileForModal(null)}
        />
      )}
    </div>
  );
}
