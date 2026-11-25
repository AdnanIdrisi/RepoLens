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
          iconBg: "bg-[#111827] dark:bg-[#F1F5F9] text-white dark:text-[#0A1114]",
        };
      case "function":
        return {
          icon: FunctionSquare,
          iconBg: "bg-emerald-500 text-white",
        };
      case "class":
        return {
          icon: Box,
          iconBg: "bg-sky-500 text-white",
        };
      case "method":
        return {
          icon: Cpu,
          iconBg: "bg-indigo-500 text-white",
        };
      case "route":
        return {
          icon: Globe,
          iconBg: "bg-purple-500 text-white",
        };
      default:
        return {
          icon: FileCode,
          iconBg: "bg-[#6B7280] text-white",
        };
    }
  };

  const config = getKindConfig(data.kind);
  const Icon = config.icon;

  return (
    <div
      className={`min-w-[200px] max-w-[250px] rounded-xl border bg-surface-light dark:bg-surface-dark px-4 py-3 transition-all select-none shadow-sm ${
        data.isRoot
          ? "border-amber-500 ring-2 ring-amber-500/25"
          : data.isSelected
          ? "border-[#111827] dark:border-[#F59E0B] ring-2 ring-[#111827]/15 dark:ring-[#F59E0B]/25"
          : "border-hairline-light dark:border-hairline-dark hover:border-[#9CA3AF] dark:hover:border-[#334B57]"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 !bg-[#9CA3AF] dark:!bg-[#475569] !border-surface-light dark:!border-surface-dark"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-[#9CA3AF] dark:!bg-[#475569] !border-surface-light dark:!border-surface-dark"
      />

      <div className="flex items-center space-x-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${config.iconBg}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate text-[#111827] dark:text-[#F1F5F9]" title={data.label}>
            {data.label}
          </div>
          <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] truncate font-mono" title={data.filePath}>
            {data.filePath.split("/").pop()}
            {data.startLine ? `:${data.startLine}` : ""}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 !bg-[#9CA3AF] dark:!bg-[#475569] !border-surface-light dark:!border-surface-dark"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-[#9CA3AF] dark:!bg-[#475569] !border-surface-light dark:!border-surface-dark"
      />
    </div>
  );
});
