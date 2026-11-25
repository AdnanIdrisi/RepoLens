import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, CheckCircle2 } from "lucide-react";
import type { AgentToolCall } from "@repolens/shared";

interface ToolCallBadgeProps {
  toolCall: AgentToolCall;
}

export function ToolCallBadge({ toolCall }: ToolCallBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-[#1e293b] bg-[#111827] overflow-hidden text-xs my-2 shadow-2xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#161f30] transition-colors"
      >
        <div className="flex items-center space-x-2 font-mono">
          <Wrench className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-slate-100 font-semibold">{toolCall.name}</span>
          <span className="text-slate-400 text-[11px]">
            ({Object.keys(toolCall.args || {}).join(", ")})
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-mono font-semibold">
          <CheckCircle2 className="h-3 w-3" />
          <span>Executed</span>
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-3 bg-[#090d16] border-t border-[#1e293b] font-mono text-[11px] space-y-2 overflow-x-auto">
          <div>
            <span className="text-slate-400 block mb-0.5 font-bold">Arguments:</span>
            <pre className="text-slate-200 bg-[#0f172a] p-2 rounded border border-[#1e293b]">{JSON.stringify(toolCall.args, null, 2)}</pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <span className="text-slate-400 block mb-0.5 font-bold">Result:</span>
              <pre className="text-slate-200 bg-[#0f172a] p-2 rounded border border-[#1e293b] max-h-48 overflow-y-auto">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
