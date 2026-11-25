import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { FileCode, FunctionSquare, Box, Globe, Cpu } from "lucide-react";
import type { GraphNodeKind } from "@repolens/shared";

interface CodeNodeData {
  id: string;
  label: string;
  kind: GraphNodeKind;
  filePath: string;
  startLine?: number;
  endLine?: number;
  isSelected?: boolean;
  isRoot?: boolean;
}

export const CodeNode = memo(({ data }: { data: CodeNodeData }) => {
  const getKindConfig = (kind: GraphNodeKind) => {
    switch (kind) {
      case "file":
        return {
          icon: FileCode,
          border: "border-[#334155] hover:border-slate-400",
          badge: "bg-[#1e293b] text-slate-300 border-[#334155]",
          headerColor: "text-slate-200"
        };
      case "function":
        return {
          icon: FunctionSquare,
          border: "border-emerald-500/40 hover:border-emerald-400",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          headerColor: "text-emerald-400"
        };
      case "class":
        return {
          icon: Box,
          border: "border-blue-500/40 hover:border-blue-400",
          badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          headerColor: "text-blue-400"
        };
      case "method":
        return {
          icon: Cpu,
          border: "border-indigo-500/40 hover:border-indigo-400",
          badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          headerColor: "text-indigo-400"
        };
      case "route":
        return {
          icon: Globe,
          border: "border-purple-500/40 hover:border-purple-400",
          badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          headerColor: "text-purple-400"
        };
      default:
        return {
          icon: FileCode,
          border: "border-[#334155] hover:border-slate-500",
          badge: "bg-[#1e293b] text-slate-400 border-[#334155]",
          headerColor: "text-slate-400"
        };
    }
  };

  const config = getKindConfig(data.kind);
  const Icon = config.icon;

  return (
    <div
      className={`min-w-[210px] max-w-[270px] rounded-lg border transition-colors select-none shadow-2xs ${
        data.isRoot
          ? "border-2 border-amber-500 bg-[#0f172a] ring-2 ring-amber-500/40"
          : data.isSelected
          ? "border-2 border-indigo-500 bg-[#0f172a] ring-2 ring-indigo-500/40"
          : `bg-[#0f172a] ${config.border}`
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-indigo-500 !border-[#0f172a]" />
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-indigo-500 !border-[#0f172a]" />

      {/* Node Header Strip */}
      <div className="bg-[#0b0f19] px-2.5 py-1.5 border-b border-[#1e293b] flex items-center justify-between gap-1">
        <div className="flex items-center space-x-1.5">
          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold ${config.badge}`}>
            {data.kind}
          </span>
          {data.isRoot && (
            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Focus Root
            </span>
          )}
        </div>
        {data.startLine && (
          <span className="text-[10px] font-mono text-slate-400 shrink-0 font-medium">
            L{data.startLine}{data.endLine ? `-${data.endLine}` : ""}
          </span>
        )}
      </div>

      {/* Node Body */}
      <div className="p-2.5 flex items-start space-x-2 bg-[#0f172a]">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${data.isRoot ? "text-amber-400" : config.headerColor}`} />
        <div className="overflow-hidden w-full">
          <div className="text-xs font-bold text-slate-100 truncate font-mono" title={data.label}>
            {data.label}
          </div>
          <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5" title={data.filePath}>
            {data.filePath}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-indigo-500 !border-[#0f172a]" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-indigo-500 !border-[#0f172a]" />
    </div>
  );
});
