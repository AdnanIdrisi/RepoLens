import { useState, useEffect } from "react";
import { X, FileCode, Copy, Check, Hash, HardDrive } from "lucide-react";

interface SourceViewerModalProps {
  repositoryId: string;
  filePath: string;
  onClose: () => void;
}

interface FileContentResponse {
  path: string;
  content: string;
  contentHash: string;
  sizeBytes: number;
  totalLines: number;
  startLine: number;
  endLine: number;
}

export function SourceViewerModal({ repositoryId, filePath, onClose }: SourceViewerModalProps) {
  const [data, setData] = useState<FileContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/repositories/${repositoryId}/file/${filePath}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Failed to load file source");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    }

    loadContent();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <FileCode className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold font-mono text-white">{filePath}</h3>
              {data && (
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                  <span className="flex items-center">
                    <Hash className="h-3 w-3 mr-0.5 text-slate-500" />
                    {data.totalLines} lines
                  </span>
                  <span className="flex items-center">
                    <HardDrive className="h-3 w-3 mr-0.5 text-slate-500" />
                    {(data.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                  <span className="font-mono text-slate-500 truncate max-w-[200px]" title={data.contentHash}>
                    sha256: {data.contentHash.substring(0, 10)}...
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {data && (
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copy source"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Code Content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed bg-[#0b0f19]">
          {loading ? (
            <div className="py-20 text-center text-slate-500">
              Retrieving and normalizing source code...
            </div>
          ) : error ? (
            <div className="py-20 text-center text-rose-400">
              {error}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="w-12 pr-4 text-right select-none text-slate-600 border-r border-slate-800/80">
                      {idx + 1}
                    </td>
                    <td className="pl-4 whitespace-pre font-mono">
                      {line || " "}
                    </td>
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
