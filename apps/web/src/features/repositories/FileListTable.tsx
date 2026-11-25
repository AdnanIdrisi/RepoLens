import { useState, useEffect } from "react";
import { Search, Eye, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import type { CodeFile } from "@repolens/shared";
import { SourceViewerModal } from "./SourceViewerModal";

interface FileListTableProps {
  repositoryId: string;
}

export function FileListTable({ repositoryId }: FileListTableProps) {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "discovered" | "excluded">("all");
  const [search, setSearch] = useState("");
  const [selectedFileForView, setSelectedFileForView] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page: page.toString(),
          limit: "25",
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        });

        const res = await fetch(`/api/repositories/${repositoryId}/files?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setFiles(data.data.items || data.data.files || []);
            setTotalPages(data.data.pagination?.totalPages ?? 1);
            setTotalFiles(data.data.pagination?.total ?? 0);
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

  return (
    <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-3.5 border-b border-hairline-light dark:border-hairline-dark flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-semibold">Files</h2>
          <span className="text-xs font-mono text-[#6B7280] dark:text-[#94A3B8]">
            {totalFiles.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <div className="flex bg-subtle-light dark:bg-subtle-dark p-1 rounded-lg border border-hairline-light dark:border-hairline-dark text-xs">
            {(
              [
                { id: "all", label: "All" },
                { id: "discovered", label: "Eligible" },
                { id: "excluded", label: "Excluded" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${statusFilter === tab.id
                  ? "bg-surface-light dark:bg-[#1A272E] text-[#111827] dark:text-[#F1F5F9] font-medium shadow-sm"
                  : "text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9]"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#94A3B8] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter path..."
              className="w-full bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-[#111827] dark:text-[#F1F5F9] placeholder-[#6B7280] dark:placeholder-[#64748B] focus:outline-none focus:border-[#111827] dark:focus:border-[#F59E0B]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-hairline-light dark:border-hairline-dark text-[#6B7280] dark:text-[#94A3B8] text-[11px] font-sans font-medium">
            <tr>
              <th className="py-2.5 px-4">Path</th>
              <th className="py-2.5 px-4">Language</th>
              <th className="py-2.5 px-4">Size</th>
              <th className="py-2.5 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-light dark:divide-hairline-dark">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#6B7280] dark:text-[#94A3B8]">
                  Loading...
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#6B7280] dark:text-[#94A3B8]">
                  No files found
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr
                  key={file.path}
                  onClick={() => setSelectedFileForView(file.path)}
                  className="hover:bg-subtle-light dark:hover:bg-[#162329] transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-4 font-medium">{file.path}</td>
                  <td className="py-2.5 px-4 text-[#6B7280] dark:text-[#94A3B8]">
                    {file.language}
                  </td>
                  <td className="py-2.5 px-4 text-[#6B7280] dark:text-[#94A3B8] tabular-nums">
                    {formatSize(file.sizeBytes)}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end space-x-2">
                      {file.status === "discovered" || file.status === "fetched" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <span title={file.exclusionReason || "Excluded"}>
                          <XCircle className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#64748B]" />
                        </span>
                      )}
                      <Eye className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8]" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-hairline-light dark:border-hairline-dark flex items-center justify-between text-xs font-mono text-[#6B7280] dark:text-[#94A3B8]">
          <span>
            {page} / {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded-md border border-hairline-light dark:border-hairline-dark hover:bg-subtle-light dark:hover:bg-subtle-dark disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded-md border border-hairline-light dark:border-hairline-dark hover:bg-subtle-light dark:hover:bg-subtle-dark disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

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
