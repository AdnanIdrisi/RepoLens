import { FileCode, Sparkles, Binary, Type, ArrowUpRight } from "lucide-react";
import type { SearchResultItem } from "@repolens/shared";

interface SearchResultCardProps {
  result: SearchResultItem;
  onSelect: (filePath: string) => void;
}

export function SearchResultCard({ result, onSelect }: SearchResultCardProps) {
  const getSymbolKindBadge = (kind?: string) => {
    switch (kind) {
      case "function":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">fn</span>;
      case "class":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">class</span>;
      case "method":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">method</span>;
      case "route":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">route</span>;
      default:
        return null;
    }
  };

  const getMatchTypeBadge = (type: string) => {
    switch (type) {
      case "hybrid":
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Hybrid Match</span>
          </span>
        );
      case "vector":
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Binary className="h-3 w-3 text-blue-400" />
            <span>Semantic AST</span>
          </span>
        );
      case "lexical":
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Type className="h-3 w-3 text-amber-400" />
            <span>Lexical Exact</span>
          </span>
        );
      default:
        return null;
    }
  };

  const snippetLines = result.snippet.split("\n");

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] hover:border-slate-700 transition-colors shadow-2xs overflow-hidden font-mono">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0b0f19] border-b border-[#1e293b]">
        <div className="flex items-center space-x-2 min-w-0">
          <FileCode className="h-4 w-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-bold text-slate-100 truncate">{result.filePath}</span>
          <span className="text-[10px] text-slate-400 font-medium">
            L{result.startLine}–{result.endLine}
          </span>
          {getSymbolKindBadge(result.symbolKind)}
          {result.symbolName && (
            <span className="text-[11px] font-semibold text-slate-300 bg-[#1e293b] px-1 rounded border border-[#334155]">{result.symbolName}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {getMatchTypeBadge(result.matchType)}
          <span className="text-[10px] text-slate-300 bg-[#1e293b] px-1.5 py-0.5 rounded border border-[#334155] shadow-2xs font-semibold">
            Score: {(result.score * 100).toFixed(1)}
          </span>
          <button
            onClick={() => onSelect(result.filePath)}
            className="p-1 rounded bg-[#111827] hover:bg-[#1e293b] text-slate-400 hover:text-slate-100 border border-[#334155] transition-colors shadow-2xs"
            title="Inspect source file"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Snippet Code View */}
      <div className="overflow-x-auto p-3 text-xs text-slate-200 bg-[#090d16] leading-5">
        <table className="w-full border-collapse">
          <tbody>
            {snippetLines.map((line, idx) => (
              <tr key={idx} className="hover:bg-[#161f30] transition-colors">
                <td className="w-10 pr-3 text-right select-none text-slate-600 border-r border-[#1e293b] text-[10px]">
                  {result.startLine + idx}
                </td>
                <td className="pl-3 whitespace-pre text-[11px] text-slate-200">
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
