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
      typescript: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      tsx: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      javascript: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      jsx: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      json: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    };

    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-mono border font-medium ${
          colors[lang] || "bg-[#1e293b] text-slate-400 border-[#334155]"
        }`}
      >
        {lang}
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] shadow-2xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0b0f19]">
        <div className="flex items-center space-x-2 font-mono">
          <FileCode className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100 font-display">Discovered Files</h2>
          <span className="text-[10px] text-slate-300 bg-[#1e293b] px-2 py-0.5 rounded border border-[#334155] shadow-2xs font-semibold">
            {totalFiles.toLocaleString()} files
          </span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto font-mono">
          {/* Status Tabs */}
          <div className="flex bg-[#111827] p-0.5 rounded-md border border-[#334155] text-xs">
            <button
              onClick={() => { setStatusFilter("all"); setPage(1); }}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                statusFilter === "all" ? "bg-indigo-600 text-white font-semibold shadow-2xs" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setStatusFilter("discovered"); setPage(1); }}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                statusFilter === "discovered" ? "bg-indigo-600 text-white font-semibold shadow-2xs" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Eligible
            </button>
            <button
              onClick={() => { setStatusFilter("excluded"); setPage(1); }}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                statusFilter === "excluded" ? "bg-indigo-600 text-white font-semibold shadow-2xs" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Excluded
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filter file path..."
              className="w-full bg-[#111827] border border-[#334155] rounded-md pl-8 pr-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#111827] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1e293b] text-[10px]">
            <tr>
              <th className="py-2.5 px-4">File Path</th>
              <th className="py-2.5 px-4">Language</th>
              <th className="py-2.5 px-4">Size</th>
              <th className="py-2.5 px-4">Status & Diagnostics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b] text-slate-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  Loading repository files...
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No files match the selected filter.
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file._id} className="hover:bg-[#161f30] transition-colors">
                  <td className="py-2.5 px-4 text-slate-200 font-medium">{file.path}</td>
                  <td className="py-2.5 px-4">{getLanguageBadge(file.language)}</td>
                  <td className="py-2.5 px-4 text-slate-400">{formatSize(file.sizeBytes)}</td>
                  <td className="py-2.5 px-4 flex items-center justify-between">
                    {file.status === "discovered" || file.status === "fetched" ? (
                      <span className="inline-flex items-center text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Eligible
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-slate-400">
                        <XCircle className="h-3.5 w-3.5 mr-1 text-rose-400" />
                        <span className="truncate max-w-xs text-slate-400" title={file.exclusionReason}>
                          {file.exclusionReason || "Excluded"}
                        </span>
                      </span>
                    )}

                    <button
                      onClick={() => setSelectedFileForView(file.path)}
                      className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-[#1e293b] transition-colors"
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
        <div className="p-3 border-t border-[#1e293b] flex items-center justify-between bg-[#0b0f19] text-xs font-mono">
          <span className="text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-[#111827] border border-[#334155] text-slate-300 hover:bg-[#1e293b] disabled:opacity-40 transition-colors shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded bg-[#111827] border border-[#334155] text-slate-300 hover:bg-[#1e293b] disabled:opacity-40 transition-colors shadow-2xs"
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
