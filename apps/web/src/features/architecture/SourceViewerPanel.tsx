import { useState, useEffect } from "react";
import { X, Crosshair } from "lucide-react";

interface SelectedNodeInfo {
  id: string;
  label: string;
  kind: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
}

interface SourceViewerPanelProps {
  repositoryId: string;
  node: SelectedNodeInfo | null;
  onClose: () => void;
  onFocusNode?: (nodeId: string) => void;
}

export function SourceViewerPanel({
  repositoryId,
  node,
  onClose,
  onFocusNode,
}: SourceViewerPanelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"source" | "details">("source");

  useEffect(() => {
    if (!node) {
      setContent(null);
      return;
    }

    async function loadSource() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/repositories/${repositoryId}/file/${node!.filePath}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setContent(data.data.content);
        } else {
          setError(data.error?.message || "Failed to load source");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    }

    loadSource();
  }, [repositoryId, node]);

  if (!node) return null;

  const lines = content ? content.split("\n") : [];

  return (
    <div className="absolute top-4 right-4 bottom-4 w-[calc(100%-2rem)] sm:w-[440px] rounded-xl bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark z-20 flex flex-col shadow-xl overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold truncate">{node.label}</h3>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-[#6B7280] dark:text-[#94A3B8]">
              {node.kind}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-subtle-light dark:hover:bg-subtle-dark text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Underline Tabs (Reference 1 style) */}
      <div className="px-4 border-b border-hairline-light dark:border-hairline-dark flex items-center space-x-5 text-xs font-medium">
        <button
          onClick={() => setTab("source")}
          className={`pb-2 border-b-2 transition-colors ${
            tab === "source"
              ? "border-[#111827] dark:border-[#F59E0B] text-[#111827] dark:text-[#F1F5F9]"
              : "border-transparent text-[#6B7280] dark:text-[#94A3B8]"
          }`}
        >
          Source
        </button>
        <button
          onClick={() => setTab("details")}
          className={`pb-2 border-b-2 transition-colors ${
            tab === "details"
              ? "border-[#111827] dark:border-[#F59E0B] text-[#111827] dark:text-[#F1F5F9]"
              : "border-transparent text-[#6B7280] dark:text-[#94A3B8]"
          }`}
        >
          Details
        </button>
      </div>

      {/* Body */}
      {tab === "details" ? (
        <div className="flex-1 p-4 space-y-4 text-xs font-mono">
          <div>
            <span className="text-[#6B7280] dark:text-[#94A3B8] block text-[11px] font-sans mb-1">
              File Path
            </span>
            <div className="p-2.5 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark break-all">
              {node.filePath}
            </div>
          </div>
          {node.startLine && (
            <div>
              <span className="text-[#6B7280] dark:text-[#94A3B8] block text-[11px] font-sans mb-1">
                Line Range
              </span>
              <div className="p-2.5 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark">
                L{node.startLine} – L{node.endLine || node.startLine}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto font-mono text-xs bg-canvas-light dark:bg-canvas-dark">
          {loading ? (
            <div className="py-16 text-center text-[#6B7280] dark:text-[#94A3B8]">Loading...</div>
          ) : error ? (
            <div className="py-16 text-center text-rose-500">{error}</div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((lineText, idx) => {
                  const lineNum = idx + 1;
                  const isTargetLine =
                    node.startLine &&
                    node.endLine &&
                    lineNum >= node.startLine &&
                    lineNum <= node.endLine;

                  return (
                    <tr
                      key={lineNum}
                      className={
                        isTargetLine
                          ? "bg-amber-500/15 border-l-2 border-amber-500"
                          : "hover:bg-subtle-light dark:hover:bg-[#162329]"
                      }
                    >
                      <td className="w-10 pr-3 text-right select-none text-[#9CA3AF] dark:text-[#475569] border-r border-hairline-light dark:border-hairline-dark text-[10px]">
                        {lineNum}
                      </td>
                      <td className="pl-3 whitespace-pre text-[11px] leading-5">
                        {lineText || " "}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Footer Action */}
      {onFocusNode && (
        <div className="px-4 py-3 border-t border-hairline-light dark:border-hairline-dark flex items-center justify-end">
          <button
            onClick={() => onFocusNode(node.id)}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Crosshair className="h-3.5 w-3.5 mr-1.5" />
            <span>Focus Node</span>
          </button>
        </div>
      )}
    </div>
  );
}
