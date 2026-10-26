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
    <div className="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-[#131b2e] border-l border-[#25334d] z-20 flex flex-col shadow-none select-none">
      {/* Header */}
      <div className="h-12 px-4 border-b border-[#25334d] flex items-center justify-between bg-[#0f1523] shrink-0 gap-3">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <FileCode className="h-4 w-4 text-[#4f46e5] shrink-0" />
          <div className="overflow-hidden">
            <h3 className="text-xs font-bold text-[#f8fafc] font-mono truncate">{node.label}</h3>
            <p className="text-[10px] text-[#94a3b8] font-mono truncate">{node.filePath}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onFocusNode && (
            <button
              onClick={() => onFocusNode(node.id)}
              className="inline-flex items-center px-2 py-1 rounded bg-[#1a243b] hover:bg-[#25334d] text-[#818cf8] border border-[#25334d] text-[11px] font-mono font-medium transition-colors"
              title="Center and isolate graph neighborhood on this node"
            >
              <Crosshair className="h-3 w-3 mr-1 text-[#4f46e5]" />
              <span>Focus Graph</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1a243b] text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Node Metadata Bar */}
      <div className="px-4 py-2 bg-[#090d16] border-b border-[#25334d] flex items-center justify-between text-xs font-mono">
        <span className="text-[#0891b2] uppercase text-[10px] font-bold">{node.kind} declaration</span>
        {node.startLine && (
          <span className="text-[#94a3b8] flex items-center text-[11px]">
            <Hash className="h-3 w-3 mr-0.5 text-[#475569]" />
            Lines {node.startLine} - {node.endLine || node.startLine}
          </span>
        )}
      </div>

      {/* Code Viewer */}
      <div className="flex-1 overflow-auto font-mono text-xs text-[#f8fafc] bg-[#090d16]">
        {loading ? (
          <div className="py-20 text-center text-[#94a3b8] text-xs">Loading source file...</div>
        ) : error ? (
          <div className="py-20 text-center text-[#dc2626] text-xs">{error}</div>
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
                    className={`${isTargetLine ? "bg-[#1a243b] border-l-2 border-[#4f46e5]" : "hover:bg-[#131b2e]"}`}
                  >
                    <td className="w-10 pr-3 text-right select-none text-[#475569] border-r border-[#25334d] text-[10px] bg-[#090d16]/70">
                      {lineNum}
                    </td>
                    <td className="pl-3 whitespace-pre font-mono text-[11px] text-[#f8fafc]">
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
