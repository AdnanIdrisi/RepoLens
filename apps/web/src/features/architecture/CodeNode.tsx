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
}

export const CodeNode = memo(({ data }: { data: CodeNodeData }) => {
  const getKindConfig = (kind: GraphNodeKind) => {
    switch (kind) {
      case "file":
        return {
          icon: FileCode,
          border: "border-indigo-500/40 hover:border-indigo-400",
          bg: "bg-slate-900/90",
          badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
          header: "text-indigo-300"
        };
      case "function":
        return {
          icon: FunctionSquare,
          border: "border-emerald-500/40 hover:border-emerald-400",
          bg: "bg-slate-900/90",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          header: "text-emerald-300"
        };
      case "class":
        return {
          icon: Box,
          border: "border-cyan-500/40 hover:border-cyan-400",
          bg: "bg-slate-900/90",
          badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
          header: "text-cyan-300"
        };
      case "method":
        return {
          icon: Cpu,
          border: "border-blue-500/40 hover:border-blue-400",
          bg: "bg-slate-900/90",
          badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          header: "text-blue-300"
        };
      case "route":
        return {
          icon: Globe,
          border: "border-purple-500/40 hover:border-purple-400",
          bg: "bg-slate-900/90",
          badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
          header: "text-purple-300"
        };
      default:
        return {
          icon: FileCode,
          border: "border-slate-700 hover:border-slate-500",
          bg: "bg-slate-900/90",
          badge: "bg-slate-800 text-slate-400 border-slate-700",
          header: "text-slate-300"
        };
    }
  };

  const config = getKindConfig(data.kind);
  const Icon = config.icon;

  return (
    <div
      className={`min-w-[190px] max-w-[260px] rounded-xl border p-3 shadow-xl backdrop-blur-md transition-all ${config.bg} ${config.border} ${
        data.isSelected ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-105" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-indigo-500 border-slate-950" />
      
      {/* Node Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${config.badge}`}>
          {data.kind}
        </span>
        {data.startLine && (
          <span className="text-[10px] font-mono text-slate-500">
            L{data.startLine}{data.endLine ? `-${data.endLine}` : ""}
          </span>
        )}
      </div>

      {/* Node Title & Icon */}
      <div className="flex items-start space-x-2">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.header}`} />
        <div className="overflow-hidden">
          <div className="text-xs font-bold text-white truncate font-mono" title={data.label}>
            {data.label}
          </div>
          <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5" title={data.filePath}>
            {data.filePath}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-indigo-500 border-slate-950" />
    </div>
  );
});
