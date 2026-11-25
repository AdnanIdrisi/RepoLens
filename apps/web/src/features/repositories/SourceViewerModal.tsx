import { useState, useEffect } from "react";
import { X, FileCode, Copy, Check } from "lucide-react";

interface SourceViewerModalProps {
  repositoryId: string;
  filePath: string;
  onClose: () => void;
}

interface FileData {
  content: string;
  totalLines: number;
  sizeBytes: number;
  contentHash: string;
}

export function SourceViewerModal({ repositoryId, filePath, onClose }: SourceViewerModalProps) {
  const [data, setData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadFile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/repositories/${repositoryId}/file/${filePath}`);
        const result = await res.json();
        if (res.ok && result.success) {
          setData(result.data);
        } else {
          setError(result.error?.message || "Failed to load source code");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    }

    loadFile();
  }, [repositoryId, filePath]);

  const handleCopy = () => {
    if (data?.content) {
      navigator.clipboard.writeText(data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = data?.content ? data.content.split("\n") : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline-light dark:border-hairline-dark">
          <div className="flex items-center space-x-2.5 min-w-0">
            <FileCode className="h-4 w-4 text-[#6B7280] dark:text-[#94A3B8] shrink-0" />
            <span className="text-xs font-semibold font-mono truncate">{filePath}</span>
            {data && (
              <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#94A3B8] shrink-0">
                {data.totalLines}L · {(data.sizeBytes / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            {data && (
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg border border-hairline-light dark:border-hairline-dark hover:bg-subtle-light dark:hover:bg-subtle-dark text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] transition-colors"
                title="Copy"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-hairline-light dark:border-hairline-dark hover:bg-subtle-light dark:hover:bg-subtle-dark text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs bg-canvas-light dark:bg-canvas-dark leading-5">
          {loading ? (
            <div className="py-16 text-center text-[#6B7280] dark:text-[#94A3B8]">Loading...</div>
          ) : error ? (
            <div className="py-16 text-center text-rose-500">{error}</div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-subtle-light dark:hover:bg-[#162329]"
                  >
                    <td className="w-10 pr-4 text-right select-none text-[#9CA3AF] dark:text-[#475569] border-r border-hairline-light dark:border-hairline-dark text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="pl-4 whitespace-pre text-[11px]">{line || " "}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
