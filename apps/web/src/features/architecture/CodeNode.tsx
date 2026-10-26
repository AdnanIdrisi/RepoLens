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
          border: "border-[#4f46e5]/40 hover:border-[#4f46e5]",
          badge: "bg-[#1a243b] text-[#818cf8] border-[#4f46e5]/40",
          headerColor: "text-[#818cf8]"
        };
      case "function":
        return {
          icon: FunctionSquare,
          border: "border-[#059669]/40 hover:border-[#059669]",
          badge: "bg-[#1a243b] text-[#34d399] border-[#059669]/40",
          headerColor: "text-[#34d399]"
        };
      case "class":
        return {
          icon: Box,
          border: "border-[#0891b2]/40 hover:border-[#0891b2]",
          badge: "bg-[#1a243b] text-[#22d3ee] border-[#0891b2]/40",
          headerColor: "text-[#22d3ee]"
        };
      case "method":
        return {
          icon: Cpu,
          border: "border-[#2563eb]/40 hover:border-[#2563eb]",
          badge: "bg-[#1a243b] text-[#60a5fa] border-[#2563eb]/40",
          headerColor: "text-[#60a5fa]"
        };
      case "route":
        return {
          icon: Globe,
          border: "border-[#9333ea]/40 hover:border-[#9333ea]",
          badge: "bg-[#1a243b] text-[#c084fc] border-[#9333ea]/40",
          headerColor: "text-[#c084fc]"
        };
      default:
        return {
          icon: FileCode,
          border: "border-[#25334d] hover:border-[#94a3b8]",
          badge: "bg-[#1a243b] text-[#94a3b8] border-[#25334d]",
          headerColor: "text-[#94a3b8]"
        };
    }
  };

  const config = getKindConfig(data.kind);
  const Icon = config.icon;

  return (
    <div
      className={`min-w-[210px] max-w-[270px] rounded border transition-colors select-none ${
        data.isRoot
          ? "border-2 border-[#d97706] bg-[#131b2e] ring-1 ring-[#d97706]"
          : data.isSelected
          ? "border-2 border-[#4f46e5] bg-[#131b2e] ring-1 ring-[#4f46e5]"
          : `bg-[#131b2e] ${config.border}`
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-[#4f46e5] !border-[#090d16]" />
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-[#4f46e5] !border-[#090d16]" />

      {/* Node Header Strip */}
      <div className="bg-[#090d16] px-2.5 py-1.5 border-b border-[#25334d] flex items-center justify-between gap-1">
        <div className="flex items-center space-x-1.5">
          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${config.badge}`}>
            {data.kind}
          </span>
          {data.isRoot && (
            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-[#1a243b] text-[#d97706] border border-[#d97706]">
              Focus Root
            </span>
          )}
        </div>
        {data.startLine && (
          <span className="text-[10px] font-mono text-[#94a3b8] shrink-0">
            L{data.startLine}{data.endLine ? `-${data.endLine}` : ""}
          </span>
        )}
      </div>

      {/* Node Body */}
      <div className="p-2.5 flex items-start space-x-2">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${data.isRoot ? "text-[#d97706]" : config.headerColor}`} />
        <div className="overflow-hidden w-full">
          <div className="text-xs font-bold text-[#f8fafc] truncate font-mono" title={data.label}>
            {data.label}
          </div>
          <div className="text-[10px] text-[#94a3b8] truncate font-mono mt-0.5" title={data.filePath}>
            {data.filePath}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-[#4f46e5] !border-[#090d16]" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-[#4f46e5] !border-[#090d16]" />
    </div>
  );
});
