import { FileCode, ArrowUpRight } from "lucide-react";
import type { SearchResultItem } from "@repolens/shared";

interface SearchResultCardProps {
  result: SearchResultItem;
  onSelect: (filePath: string) => void;
}

export function SearchResultCard({ result, onSelect }: SearchResultCardProps) {
  const snippetLines = result.snippet.split("\n");

  return (
    <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark overflow-hidden font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-hairline-light dark:border-hairline-dark">
        <div className="flex items-center space-x-2 min-w-0">
          <FileCode className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8] shrink-0" />
          <span className="text-xs font-semibold truncate">{result.filePath}</span>
          <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
            L{result.startLine}–{result.endLine}
          </span>
          {result.symbolName && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-[#6B7280] dark:text-[#94A3B8]">
              {result.symbolName}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] tabular-nums">
            {(result.score * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => onSelect(result.filePath)}
            className="p-1 rounded-md border border-hairline-light dark:border-hairline-dark hover:bg-subtle-light dark:hover:bg-subtle-dark text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] transition-colors"
            title="Open file"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Snippet */}
      <div className="overflow-x-auto p-3 text-xs bg-canvas-light dark:bg-canvas-dark leading-5">
        <table className="w-full border-collapse">
          <tbody>
            {snippetLines.map((line, idx) => (
              <tr key={idx} className="hover:bg-subtle-light dark:hover:bg-[#162329]">
                <td className="w-9 pr-3 text-right select-none text-[#9CA3AF] dark:text-[#475569] border-r border-hairline-light dark:border-hairline-dark text-[10px]">
                  {result.startLine + idx}
                </td>
                <td className="pl-3 whitespace-pre text-[11px]">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
