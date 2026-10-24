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
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">fn</span>;
      case "class":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">class</span>;
      case "method":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">method</span>;
      case "route":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">route</span>;
      default:
        return null;
    }
  };

  const getMatchTypeBadge = (type: string) => {
    switch (type) {
      case "hybrid":
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Hybrid Match</span>
          </span>
        );
      case "vector":
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Binary className="h-3 w-3 text-purple-400" />
            <span>Semantic Vector</span>
          </span>
        );
      case "lexical":
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
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
    <div className="group rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700 transition-all shadow-md overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-950/40 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5 min-w-0">
          <FileCode className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <button
            onClick={() => onSelect(result.filePath)}
            className="text-xs font-mono font-medium text-slate-200 hover:text-indigo-400 transition-colors truncate flex items-center group-hover:underline"
          >
            <span>{result.filePath}</span>
            <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <span className="text-slate-500 text-xs font-mono">
            L{result.startLine}-{result.endLine}
          </span>
          {result.symbolName && (
            <div className="flex items-center space-x-1 ml-2">
              {getSymbolKindBadge(result.symbolKind)}
              <span className="text-xs font-mono font-semibold text-white">
                {result.symbolName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {getMatchTypeBadge(result.matchType)}
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
            RRF: {result.score.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Code Snippet Box */}
      <div className="p-3 bg-[#0a0e17] overflow-x-auto text-xs font-mono text-slate-300">
        <table className="w-full border-collapse">
          <tbody>
            {snippetLines.map((line, idx) => {
              const lineNumber = result.startLine + idx;
              return (
                <tr key={idx} className="hover:bg-slate-800/30 leading-5">
                  <td className="w-10 pr-3 text-right select-none text-slate-600 font-mono text-[11px]">
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
    </div>
  );
}
