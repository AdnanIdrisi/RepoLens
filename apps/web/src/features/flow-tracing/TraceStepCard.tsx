import { 
  Workflow, 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Database, 
  HelpCircle,
  FileCode,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import type { TraceStep } from "@repolens/shared";

interface TraceStepCardProps {
  step: TraceStep;
  index: number;
  isLast: boolean;
  onSelectFile: (filePath: string) => void;
}

export function TraceStepCard({ step, index, isLast, onSelectFile }: TraceStepCardProps) {
  const getCategoryConfig = (category?: string) => {
    switch (category) {
      case "route":
        return {
          bg: "bg-[#9333ea] border-[#9333ea] text-white",
          icon: Workflow,
          label: "Route Entry",
          dot: "bg-[#9333ea]"
        };
      case "middleware":
        return {
          bg: "bg-[#d97706] border-[#d97706] text-white",
          icon: ShieldCheck,
          label: "Middleware",
          dot: "bg-[#d97706]"
        };
      case "controller":
        return {
          bg: "bg-[#0891b2] border-[#0891b2] text-white",
          icon: Terminal,
          label: "Controller Handler",
          dot: "bg-[#0891b2]"
        };
      case "service":
        return {
          bg: "bg-[#4f46e5] border-[#4f46e5] text-white",
          icon: Cpu,
          label: "Business Service",
          dot: "bg-[#4f46e5]"
        };
      case "model":
        return {
          bg: "bg-[#059669] border-[#059669] text-white",
          icon: Database,
          label: "Database / Model",
          dot: "bg-[#059669]"
        };
      default:
        return {
          bg: "bg-[#25334d] border-[#25334d] text-slate-200",
          icon: HelpCircle,
          label: "Unresolved / External",
          dot: "bg-[#25334d]"
        };
    }
  };

  const config = getCategoryConfig(step.category);
  const IconComponent = config.icon;
  const snippetLines = step.snippet ? step.snippet.split("\n") : [];

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Connecting Vertical Timeline Line */}
      {!isLast && (
        <div className="absolute left-3.5 top-8 bottom-0 w-0.5 bg-[#25334d]" />
      )}

      {/* Timeline Node Badge */}
      <div className={`absolute left-0 top-1 h-7 w-7 rounded-full border flex items-center justify-center ${config.bg} shadow-md`}>
        <IconComponent className="h-3.5 w-3.5" />
      </div>

      {/* Card Content */}
      <div className="rounded-xl border border-[#25334d] bg-[#131b2e] hover:border-[#4f46e5] transition-all shadow-md overflow-hidden">
        {/* Step Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#1a243b] border-b border-[#25334d]">
          <div className="flex items-center space-x-2.5">
            <span className="text-[11px] font-mono text-slate-400 font-bold">
              #{index + 1}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${config.bg}`}>
              {config.label}
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {step.label}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {step.confidence === 1.0 ? (
              <span className="flex items-center space-x-1 text-[11px] text-[#059669] font-mono font-medium">
                <CheckCircle2 className="h-3 w-3" />
                <span>Direct AST</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[11px] text-[#d97706] font-mono font-medium">
                <AlertTriangle className="h-3 w-3" />
                <span>Inferred</span>
              </span>
            )}

            {step.filePath !== "external" && (
              <button
                onClick={() => onSelectFile(step.filePath)}
                className="flex items-center space-x-1 text-slate-300 hover:text-[#0891b2] font-mono text-[11px] transition-colors"
              >
                <FileCode className="h-3 w-3" />
                <span>{step.filePath}:{step.startLine}</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Evidence / Relationship Description */}
        <div className="px-4 py-2 text-xs text-slate-300 bg-[#131b2e] flex items-center justify-between border-b border-[#25334d]">
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <span className="text-slate-400">Relationship:</span>
            <span className="text-[#0891b2] font-semibold">{step.relationship}</span>
          </div>
          {step.evidence && (
            <span className="text-[11px] text-slate-400 italic">
              {step.evidence}
            </span>
          )}
        </div>

        {/* Code Excerpt Snippet */}
        {snippetLines.length > 0 && (
          <div className="p-3 bg-[#090d16] overflow-x-auto text-xs font-mono text-slate-300">
            <table className="w-full border-collapse">
              <tbody>
                {snippetLines.map((line, idx) => {
                  const lineNumber = step.startLine + idx;
                  return (
                    <tr key={idx} className="hover:bg-[#1a243b] leading-5">
                      <td className="w-8 pr-2 text-right select-none text-slate-500 font-mono text-[11px]">
                        {lineNumber}
                      </td>
                      <td className="whitespace-pre pl-2 font-mono text-slate-200">
                        {line}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
