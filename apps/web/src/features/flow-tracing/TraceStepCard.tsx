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
          bg: "bg-purple-500/15 border-purple-500/30 text-purple-300",
          icon: Workflow,
          label: "Route Entry",
          dot: "bg-purple-500"
        };
      case "middleware":
        return {
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          icon: ShieldCheck,
          label: "Middleware",
          dot: "bg-amber-500"
        };
      case "controller":
        return {
          bg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          icon: Terminal,
          label: "Controller Handler",
          dot: "bg-cyan-500"
        };
      case "service":
        return {
          bg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
          icon: Cpu,
          label: "Business Service",
          dot: "bg-indigo-500"
        };
      case "model":
        return {
          bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          icon: Database,
          label: "Database / Model",
          dot: "bg-emerald-500"
        };
      default:
        return {
          bg: "bg-slate-500/15 border-slate-500/30 text-slate-300",
          icon: HelpCircle,
          label: "Unresolved / External",
          dot: "bg-slate-500"
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
        <div className="absolute left-3.5 top-8 bottom-0 w-0.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900" />
      )}

      {/* Timeline Node Badge */}
      <div className={`absolute left-0 top-1 h-7 w-7 rounded-full border flex items-center justify-center ${config.bg} shadow-md`}>
        <IconComponent className="h-3.5 w-3.5" />
      </div>

      {/* Card Content */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all shadow-md overflow-hidden">
        {/* Step Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <span className="text-[11px] font-mono text-slate-500 font-bold">
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
              <span className="flex items-center space-x-1 text-[11px] text-emerald-400 font-mono">
                <CheckCircle2 className="h-3 w-3" />
                <span>Direct AST</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[11px] text-amber-400 font-mono">
                <AlertTriangle className="h-3 w-3" />
                <span>Inferred</span>
              </span>
            )}

            {step.filePath !== "external" && (
              <button
                onClick={() => onSelectFile(step.filePath)}
                className="flex items-center space-x-1 text-slate-400 hover:text-indigo-400 font-mono text-[11px] transition-colors"
              >
                <FileCode className="h-3 w-3" />
                <span>{step.filePath}:{step.startLine}</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Evidence / Relationship Description */}
        <div className="px-4 py-2 text-xs text-slate-400 bg-slate-900/40 flex items-center justify-between border-b border-slate-800/40">
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <span className="text-slate-500">Relationship:</span>
            <span className="text-indigo-300 font-semibold">{step.relationship}</span>
          </div>
          {step.evidence && (
            <span className="text-[11px] text-slate-500 italic">
              {step.evidence}
            </span>
          )}
        </div>

        {/* Code Excerpt Snippet */}
        {snippetLines.length > 0 && (
          <div className="p-3 bg-[#0a0e17] overflow-x-auto text-xs font-mono text-slate-300">
            <table className="w-full border-collapse">
              <tbody>
                {snippetLines.map((line, idx) => {
                  const lineNumber = step.startLine + idx;
                  return (
                    <tr key={idx} className="hover:bg-slate-800/30 leading-5">
                      <td className="w-8 pr-2 text-right select-none text-slate-600 font-mono text-[11px]">
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
