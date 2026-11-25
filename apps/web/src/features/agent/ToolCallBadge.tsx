import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, CheckCircle2 } from "lucide-react";
import type { AgentToolCall } from "@repolens/shared";

interface ToolCallBadgeProps {
  toolCall: AgentToolCall;
}

export function ToolCallBadge({ toolCall }: ToolCallBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-hairline-light dark:border-hairline-dark bg-subtle-light dark:bg-subtle-dark overflow-hidden text-xs my-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center space-x-2 font-mono">
          <Wrench className="h-3 w-3 text-[#6B7280] dark:text-[#94A3B8]" />
          <span className="font-semibold">{toolCall.name}</span>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
          <CheckCircle2 className="h-3 w-3" />
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-2.5 bg-canvas-light dark:bg-canvas-dark border-t border-hairline-light dark:border-hairline-dark font-mono text-[11px] space-y-2 overflow-x-auto">
          <pre className="p-2 rounded border border-hairline-light dark:border-hairline-dark">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
          {toolCall.result !== undefined && (
            <pre className="p-2 rounded border border-hairline-light dark:border-hairline-dark max-h-40 overflow-y-auto">
              {JSON.stringify(toolCall.result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
