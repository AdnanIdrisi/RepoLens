import { useState, useEffect } from "react";
import { X, FileCode, Hash, Crosshair } from "lucide-react";

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

export function SourceViewerPanel({ repositoryId, node, onClose, onFocusNode }: SourceViewerPanelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-[#0f172a] border-l border-[#1e293b] z-20 flex flex-col shadow-2xl select-none">
      {/* Header */}
      <div className="h-12 px-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0b0f19] shrink-0 gap-3">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <FileCode className="h-4 w-4 text-indigo-400 shrink-0" />
          <div className="overflow-hidden">
            <h3 className="text-xs font-bold text-slate-100 font-mono truncate">{node.label}</h3>
            <p className="text-[10px] text-slate-400 font-mono truncate">{node.filePath}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onFocusNode && (
            <button
              onClick={() => onFocusNode(node.id)}
              className="inline-flex items-center px-2 py-1 rounded bg-[#111827] hover:bg-[#1e293b] text-slate-200 border border-[#334155] text-[11px] font-mono font-medium transition-colors shadow-2xs"
              title="Center and isolate graph neighborhood on this node"
            >
              <Crosshair className="h-3 w-3 mr-1 text-slate-400" />
              <span>Focus Graph</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1e293b] text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Node Metadata Bar */}
      <div className="px-4 py-2 bg-[#111827] border-b border-[#1e293b] flex items-center justify-between text-xs font-mono">
        <span className="text-slate-300 uppercase text-[10px] font-bold">{node.kind} declaration</span>
        {node.startLine && (
          <span className="text-slate-400 flex items-center text-[11px]">
            <Hash className="h-3 w-3 mr-0.5 text-slate-500" />
            Lines {node.startLine} - {node.endLine || node.startLine}
          </span>
        )}
      </div>

      {/* Code Viewer */}
      <div className="flex-1 overflow-auto font-mono text-xs text-slate-200 bg-[#090d16]">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs">Loading source file...</div>
        ) : error ? (
          <div className="py-20 text-center text-rose-400 text-xs">{error}</div>
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
                    className={`${isTargetLine ? "bg-amber-500/10 border-l-2 border-amber-500" : "hover:bg-[#161f30]"}`}
                  >
                    <td className="w-10 pr-3 text-right select-none text-slate-600 border-r border-[#1e293b] text-[10px] bg-[#0b0f19]">
                      {lineNum}
                    </td>
                    <td className="pl-3 whitespace-pre font-mono text-[11px] text-slate-200">
                      {lineText || " "}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
