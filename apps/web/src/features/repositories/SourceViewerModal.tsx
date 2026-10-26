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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded border border-[#25334d] bg-[#131b2e] shadow-none overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-[#25334d] bg-[#0f1523]">
          <div className="flex items-center space-x-2.5">
            <FileCode className="h-4 w-4 text-[#4f46e5]" />
            <div>
              <h3 className="text-xs font-bold font-mono text-[#f8fafc]">{filePath}</h3>
              {data && (
                <div className="flex items-center space-x-3 text-[10px] font-mono text-[#94a3b8] mt-0.5">
                  <span className="flex items-center">
                    <Hash className="h-3 w-3 mr-0.5 text-[#475569]" />
                    {data.totalLines} lines
                  </span>
                  <span className="flex items-center">
                    <HardDrive className="h-3 w-3 mr-0.5 text-[#475569]" />
                    {(data.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                  <span className="truncate max-w-[200px]" title={data.contentHash}>
                    sha256: {data.contentHash.substring(0, 10)}...
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {data && (
              <button
                onClick={handleCopy}
                className="p-1 rounded bg-[#1a243b] border border-[#25334d] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#25334d] transition-colors"
                title="Copy source code"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#059669]" /> : <Copy className="h-3.5 w-3.5 text-[#94a3b8]" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded bg-[#1a243b] border border-[#25334d] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#25334d] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Code Content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs text-[#f8fafc] leading-relaxed bg-[#090d16]">
          {loading ? (
            <div className="py-20 text-center text-[#94a3b8] text-xs">
              Retrieving and normalizing source code...
            </div>
          ) : error ? (
            <div className="py-20 text-center text-[#dc2626] text-xs">
              {error}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-[#131b2e]">
                    <td className="w-12 pr-4 text-right select-none text-[#475569] border-r border-[#25334d] text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="pl-4 whitespace-pre font-mono text-[11px] text-[#f8fafc]">
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
