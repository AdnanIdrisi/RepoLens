import { useState, useEffect } from "react";
import { Search, FileCode, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { SourceViewerModal } from "./SourceViewerModal";

interface CodeFileItem {
  _id: string;
  path: string;
  language: string;
  sizeBytes: number;
  status: "discovered" | "fetched" | "excluded" | "failed";
  exclusionReason?: string;
}

interface FileListTableProps {
  repositoryId: string;
}

export function FileListTable({ repositoryId }: FileListTableProps) {
  const [files, setFiles] = useState<CodeFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [selectedFileForView, setSelectedFileForView] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "25"
        });
        if (statusFilter !== "all") {
          params.append("status", statusFilter);
        }
        if (search.trim()) {
          params.append("search", search.trim());
        }

        const res = await fetch(`/api/repositories/${repositoryId}/files?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setFiles(data.data.files);
            setTotalPages(data.data.pagination.totalPages || 1);
            setTotalFiles(data.data.pagination.total || 0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch repository files:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, [repositoryId, page, statusFilter, search]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getLanguageBadge = (lang: string) => {
    const colors: Record<string, string> = {
      typescript: "bg-[#1a243b] text-[#60a5fa] border-[#2563eb]/40",
      tsx: "bg-[#1a243b] text-[#22d3ee] border-[#0891b2]/40",
      javascript: "bg-[#1a243b] text-[#fbbf24] border-[#d97706]/40",
      jsx: "bg-[#1a243b] text-[#fbbf24] border-[#d97706]/40",
      json: "bg-[#1a243b] text-[#34d399] border-[#059669]/40"
    };

    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
          colors[lang] || "bg-[#1a243b] text-[#94a3b8] border-[#25334d]"
        }`}
      >
        {lang}
      </span>
    );
  };

  return (
    <div className="rounded border border-[#25334d] bg-[#131b2e] shadow-none overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-[#25334d] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0f1523]">
        <div className="flex items-center space-x-2 font-mono">
          <FileCode className="h-4 w-4 text-[#4f46e5]" />
          <h2 className="text-sm font-bold text-[#f8fafc]">Discovered Files</h2>
          <span className="text-[10px] text-[#94a3b8] bg-[#1a243b] px-2 py-0.5 rounded border border-[#25334d]">
            {totalFiles.toLocaleString()} files
          </span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto font-mono">
          {/* Status Tabs */}
          <div className="flex bg-[#090d16] p-0.5 rounded border border-[#25334d] text-xs">
            <button
              onClick={() => { setStatusFilter("all"); setPage(1); }}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                statusFilter === "all" ? "bg-[#4f46e5] text-white font-semibold" : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setStatusFilter("discovered"); setPage(1); }}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                statusFilter === "discovered" ? "bg-[#059669] text-white font-semibold" : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              Eligible
            </button>
            <button
              onClick={() => { setStatusFilter("excluded"); setPage(1); }}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                statusFilter === "excluded" ? "bg-[#1a243b] text-white font-semibold" : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              Excluded
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-[#475569] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filter file path..."
              className="w-full bg-[#090d16] border border-[#25334d] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-[#f8fafc] placeholder-[#475569] focus:outline-none focus:border-[#4f46e5]"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#090d16] text-[#94a3b8] uppercase tracking-wider font-semibold border-b border-[#25334d] text-[10px]">
            <tr>
              <th className="py-2.5 px-4">File Path</th>
              <th className="py-2.5 px-4">Language</th>
              <th className="py-2.5 px-4">Size</th>
              <th className="py-2.5 px-4">Status & Diagnostics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#25334d] text-[#f8fafc]">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#94a3b8]">
                  Loading repository files...
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#94a3b8]">
                  No files match the selected filter.
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file._id} className="hover:bg-[#1a243b] transition-colors">
                  <td className="py-2.5 px-4 text-[#f8fafc]">{file.path}</td>
                  <td className="py-2.5 px-4">{getLanguageBadge(file.language)}</td>
                  <td className="py-2.5 px-4 text-[#94a3b8]">{formatSize(file.sizeBytes)}</td>
                  <td className="py-2.5 px-4 flex items-center justify-between">
                    {file.status === "discovered" || file.status === "fetched" ? (
                      <span className="inline-flex items-center text-[#059669] font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Eligible
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[#94a3b8]">
                        <XCircle className="h-3.5 w-3.5 mr-1 text-[#dc2626]" />
                        <span className="truncate max-w-xs text-[#94a3b8]" title={file.exclusionReason}>
                          {file.exclusionReason || "Excluded"}
                        </span>
                      </span>
                    )}

                    <button
                      onClick={() => setSelectedFileForView(file.path)}
                      className="text-[#818cf8] hover:text-white p-1 rounded hover:bg-[#25334d] transition-colors"
                      title="Inspect source code"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-[#25334d] flex items-center justify-between bg-[#0f1523] text-xs font-mono">
          <span className="text-[#94a3b8]">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-[#1a243b] border border-[#25334d] text-[#f8fafc] hover:bg-[#25334d] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded bg-[#1a243b] border border-[#25334d] text-[#f8fafc] hover:bg-[#25334d] disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Source Viewer Modal */}
      {selectedFileForView && (
        <SourceViewerModal
          repositoryId={repositoryId}
          filePath={selectedFileForView}
          onClose={() => setSelectedFileForView(null)}
        />
      )}
    </div>
  );
}
