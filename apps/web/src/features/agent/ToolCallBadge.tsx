import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, CheckCircle2 } from "lucide-react";
import type { AgentToolCall } from "@repolens/shared";

interface ToolCallBadgeProps {
  toolCall: AgentToolCall;
}

export function ToolCallBadge({ toolCall }: ToolCallBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden text-xs my-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex items-center space-x-2 font-mono">
          <Wrench className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-slate-300 font-semibold">{toolCall.name}</span>
          <span className="text-slate-500 text-[11px]">
            ({Object.keys(toolCall.args || {}).join(", ")})
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-mono">
          <CheckCircle2 className="h-3 w-3" />
          <span>Executed</span>
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-3 bg-[#080c14] border-t border-slate-800/80 font-mono text-[11px] space-y-2 overflow-x-auto">
          <div>
            <span className="text-slate-500 block mb-0.5">Arguments:</span>
            <pre className="text-indigo-300">{JSON.stringify(toolCall.args, null, 2)}</pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <span className="text-slate-500 block mb-0.5">Result:</span>
              <pre className="text-slate-300 max-h-48 overflow-y-auto">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
