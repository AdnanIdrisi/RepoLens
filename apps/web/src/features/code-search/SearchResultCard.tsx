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
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1a243b] text-[#34d399] border border-[#059669]/40">fn</span>;
      case "class":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1a243b] text-[#22d3ee] border border-[#0891b2]/40">class</span>;
      case "method":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1a243b] text-[#60a5fa] border border-[#2563eb]/40">method</span>;
      case "route":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1a243b] text-[#c084fc] border border-[#9333ea]/40">route</span>;
      default:
        return null;
    }
  };

  const getMatchTypeBadge = (type: string) => {
    switch (type) {
      case "hybrid":
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1a243b] text-[#818cf8] border border-[#4f46e5]/40">
            <Sparkles className="h-3 w-3 text-[#4f46e5]" />
            <span>Hybrid Match</span>
          </span>
        );
      case "vector":
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1a243b] text-[#c084fc] border border-[#9333ea]/40">
            <Binary className="h-3 w-3 text-[#9333ea]" />
            <span>Semantic Vector</span>
          </span>
        );
      case "lexical":
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1a243b] text-[#fbbf24] border border-[#d97706]/40">
            <Type className="h-3 w-3 text-[#d97706]" />
            <span>Lexical Exact</span>
          </span>
        );
      default:
        return null;
    }
  };

  const snippetLines = result.snippet.split("\n");

  return (
    <div className="rounded border border-[#25334d] bg-[#131b2e] hover:border-[#4f46e5] transition-colors shadow-none overflow-hidden font-mono">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0f1523] border-b border-[#25334d]">
        <div className="flex items-center space-x-2 min-w-0">
          <FileCode className="h-4 w-4 text-[#4f46e5] shrink-0" />
          <span className="text-xs font-bold text-[#f8fafc] truncate">{result.filePath}</span>
          <span className="text-[10px] text-[#94a3b8]">
            L{result.startLine}–{result.endLine}
          </span>
          {getSymbolKindBadge(result.symbolKind)}
          {result.symbolName && (
            <span className="text-[11px] font-semibold text-[#0891b2]">{result.symbolName}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {getMatchTypeBadge(result.matchType)}
          <span className="text-[10px] text-[#94a3b8] bg-[#090d16] px-1.5 py-0.5 rounded border border-[#25334d]">
            Score: {(result.score * 100).toFixed(1)}
          </span>
          <button
            onClick={() => onSelect(result.filePath)}
            className="p-1 rounded bg-[#1a243b] hover:bg-[#25334d] text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            title="Inspect source file"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Snippet Code View */}
      <div className="overflow-x-auto p-3 text-xs text-[#f8fafc] bg-[#090d16] leading-5">
        <table className="w-full border-collapse">
          <tbody>
            {snippetLines.map((line, idx) => (
              <tr key={idx} className="hover:bg-[#131b2e]">
                <td className="w-10 pr-3 text-right select-none text-[#475569] border-r border-[#25334d] text-[10px]">
                  {result.startLine + idx}
                </td>
                <td className="pl-3 whitespace-pre text-[11px] text-[#f8fafc]">
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
