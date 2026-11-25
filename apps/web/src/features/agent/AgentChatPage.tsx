import { useState, useEffect, useRef, FormEvent } from "react";
import {
  Bot,
  User,
  Send,
  Loader2,
  FileCode,
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
      content: "Ask a question about the repository architecture, routes, or symbol dependencies.",
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
    <div className="flex flex-col h-[calc(100vh-6rem)] rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
      {/* Minimal Header */}
      <div className="px-5 py-3 border-b border-hairline-light dark:border-hairline-dark flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Bot className="h-4 w-4 text-[#6B7280] dark:text-[#94A3B8]" />
          <h2 className="text-sm font-semibold font-display">AI Agent</h2>
        </div>
        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
          Read-only
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-canvas-light dark:bg-canvas-dark">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${msg.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"
              }`}
          >
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${msg.role === "user"
                ? "bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114]"
                : "bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark text-[#6B7280] dark:text-[#94A3B8]"
                }`}
            >
              {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>

            <div
              className={`max-w-2xl rounded-xl px-4 py-3 text-xs ${msg.role === "user"
                ? "bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114]"
                : "bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark"
                }`}
            >
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-2.5">
                  {msg.toolCalls.map((tc, idx) => (
                    <ToolCallBadge key={tc.id || idx} toolCall={tc} />
                  ))}
                </div>
              )}

              <div className="whitespace-pre-wrap leading-relaxed font-sans">{msg.content}</div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-hairline-light dark:border-hairline-dark flex flex-wrap gap-1.5">
                  {msg.citations.map((c: AgentCitation, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFileForModal(c.filePath)}
                      className="flex items-center space-x-1 px-2 py-1 rounded-md bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-[11px] font-mono hover:border-[#111827] dark:hover:border-[#F59E0B] transition-colors"
                    >
                      <FileCode className="h-3 w-3 text-[#6B7280] dark:text-[#94A3B8]" />
                      <span>
                        {c.filePath.split("/").pop()}:L{c.startLine}-{c.endLine}
                      </span>
                      <ArrowUpRight className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && statusMessage && (
          <div className="flex items-center space-x-2.5 text-xs font-mono text-[#6B7280] dark:text-[#94A3B8] bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark px-3.5 py-2.5 rounded-xl w-fit">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Minimal Prompt Chips */}
      <div className="px-4 py-2 border-t border-hairline-light dark:border-hairline-dark flex items-center space-x-2 overflow-x-auto">
        {[
          "Architecture overview",
          "Express routes & services",
          "Authentication flow",
        ].map((s) => (
          <button
            key={s}
            onClick={() => handleSendMessage(s)}
            disabled={loading}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-[11px] text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleFormSubmit} className="p-4 border-t border-hairline-light dark:border-hairline-dark">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about the codebase..."
            disabled={loading}
            className="w-full pl-4 pr-14 py-3 rounded-xl bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-xs placeholder-[#6B7280] dark:placeholder-[#64748B] focus:outline-none focus:border-[#111827] dark:focus:border-[#F59E0B] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </form>

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
