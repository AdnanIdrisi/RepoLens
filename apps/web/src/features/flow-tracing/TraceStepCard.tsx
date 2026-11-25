import {
  Workflow,
  ShieldCheck,
  Terminal,
  Cpu,
  Database,
  HelpCircle,
  ArrowUpRight,
} from "lucide-react";
import type { TraceStep } from "@repolens/shared";

interface TraceStepCardProps {
  step: TraceStep;
  index: number;
  isLast: boolean;
  onSelectFile: (filePath: string) => void;
}

export function TraceStepCard({ step, isLast, onSelectFile }: TraceStepCardProps) {
  const getCategoryConfig = (category?: string) => {
    switch (category) {
      case "route":
        return { icon: Workflow, color: "bg-purple-500 text-white", label: "Route" };
      case "middleware":
        return { icon: ShieldCheck, color: "bg-amber-500 text-white", label: "Middleware" };
      case "controller":
        return { icon: Terminal, color: "bg-sky-500 text-white", label: "Controller" };
      case "service":
        return { icon: Cpu, color: "bg-indigo-500 text-white", label: "Service" };
      case "model":
        return { icon: Database, color: "bg-emerald-500 text-white", label: "Model" };
      default:
        return { icon: HelpCircle, color: "bg-[#6B7280] text-white", label: "External" };
    }
  };

  const config = getCategoryConfig(step.category);
  const Icon = config.icon;
  const snippetLines = step.snippet ? step.snippet.split("\n") : [];

  return (
    <div className="relative pl-9 pb-5 last:pb-0">
      {/* Vertical Connector */}
      {!isLast && (
        <div className="absolute left-3.5 top-8 bottom-0 w-px bg-hairline-light dark:bg-hairline-dark" />
      )}

      {/* Node Icon */}
      <div
        className={`absolute left-0 top-1.5 h-7 w-7 rounded-lg flex items-center justify-center shadow-2xs ${config.color}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Minimal Card */}
      <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-canvas-light dark:bg-canvas-dark overflow-hidden">
        <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#94A3B8]">
              {config.label}
            </span>
            <span className="text-xs font-semibold font-mono truncate">{step.label}</span>
          </div>

          {step.filePath !== "external" && (
            <button
              onClick={() => onSelectFile(step.filePath)}
              className="flex items-center space-x-1 text-[11px] font-mono text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] transition-colors"
            >
              <span>
                {step.filePath.split("/").pop()}:{step.startLine}
              </span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {snippetLines.length > 0 && (
          <div className="p-2.5 overflow-x-auto text-[11px] font-mono leading-5">
            <table className="w-full border-collapse">
              <tbody>
                {snippetLines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="w-8 pr-2 text-right select-none text-[#9CA3AF] dark:text-[#475569]">
                      {step.startLine + idx}
                    </td>
                    <td className="whitespace-pre pl-2">{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
