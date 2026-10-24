import { useState, useEffect } from "react";
import { Search, FileCode, CheckCircle2, XCircle, Info, ChevronLeft, ChevronRight, Eye } from "lucide-react";
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
      javascript: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      jsx: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      json: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    };

    return (
      <span
        className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
          colors[lang] || "bg-slate-800 text-slate-400 border-slate-700"
        }`}
      >
        {lang}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <FileCode className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Discovered Repository Files</h2>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {totalFiles.toLocaleString()} files
          </span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Status Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => { setStatusFilter("all"); setPage(1); }}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setStatusFilter("discovered"); setPage(1); }}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === "discovered" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Eligible
            </button>
            <button
              onClick={() => { setStatusFilter("excluded"); setPage(1); }}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === "excluded" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Excluded
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filter file path..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">File Path</th>
              <th className="py-3 px-4">Language</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Status & Diagnostics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
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
                <tr key={file._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-200">{file.path}</td>
                  <td className="py-2.5 px-4">{getLanguageBadge(file.language)}</td>
                  <td className="py-2.5 px-4 text-slate-400 font-mono">{formatSize(file.sizeBytes)}</td>
                  <td className="py-2.5 px-4 flex items-center justify-between">
                    {file.status === "discovered" || file.status === "fetched" ? (
                      <span className="inline-flex items-center text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Eligible
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-slate-400">
                        <XCircle className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        <span className="truncate max-w-xs text-slate-400" title={file.exclusionReason}>
                          {file.exclusionReason || "Excluded"}
                        </span>
                        {file.exclusionReason && (
                          <Info className="h-3 w-3 ml-1 text-slate-500 shrink-0" />
                        )}
                      </span>
                    )}

                    {(file.status === "discovered" || file.status === "fetched") && (
                      <button
                        onClick={() => setSelectedFileForView(file.path)}
                        className="inline-flex items-center px-2 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-colors text-[11px]"
                      >
                        <Eye className="h-3 w-3 mr-1" /> View Source
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40 hover:bg-slate-800 transition-colors"
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
