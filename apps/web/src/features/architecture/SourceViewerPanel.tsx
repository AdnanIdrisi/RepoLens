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
    <div className="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-slate-950/95 border-l border-slate-800 shadow-2xl backdrop-blur-xl z-20 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 gap-3">
        <div className="flex items-center space-x-2 overflow-hidden">
          <FileCode className="h-5 w-5 text-indigo-400 shrink-0" />
          <div className="overflow-hidden">
            <h3 className="text-sm font-bold text-white font-mono truncate">{node.label}</h3>
            <p className="text-[11px] text-slate-400 font-mono truncate">{node.filePath}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onFocusNode && (
            <button
              onClick={() => onFocusNode(node.id)}
              className="inline-flex items-center px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors"
              title="Center and isolate graph neighborhood on this node"
            >
              <Crosshair className="h-3.5 w-3.5 mr-1" />
              <span>Focus Graph</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Node Metadata Bar */}
      <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <span className="text-indigo-300 capitalize">{node.kind} declaration</span>
        {node.startLine && (
          <span className="text-slate-400 flex items-center">
            <Hash className="h-3 w-3 mr-0.5 text-slate-500" />
            Lines {node.startLine} - {node.endLine || node.startLine}
          </span>
        )}
      </div>

      {/* Code Viewer */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 bg-[#0b0f19]">
        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading source file...</div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400">{error}</div>
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
                    className={`${isTargetLine ? "bg-indigo-500/15 border-l-2 border-indigo-400" : "hover:bg-slate-800/30"}`}
                  >
                    <td className="w-10 pr-3 text-right select-none text-slate-600 border-r border-slate-800/60">
                      {lineNum}
                    </td>
                    <td className="pl-3 whitespace-pre font-mono text-[11px]">
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
