import { useState, useEffect, useCallback, FormEvent } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  Layers
} from "lucide-react";
import { SearchResultCard } from "./SearchResultCard";
import { SourceViewerModal } from "../repositories/SourceViewerModal";
import type { SearchResultItem, SearchMatchType } from "@repolens/shared";

interface CodeSearchPageProps {
  repositoryId: string;
  initialQuery?: string;
}

interface SearchStats {
  totalChunks: number;
  totalEntities?: number;
  isSearchReady: boolean;
}

export function CodeSearchPage({ repositoryId, initialQuery }: CodeSearchPageProps) {
  const [query, setQuery] = useState(initialQuery || "");
  const [matchType, setMatchType] = useState<SearchMatchType>("hybrid");
  const [selectedKind, setSelectedKind] = useState<string>("all");
  const [pathFilter, setPathFilter] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [selectedFileForModal, setSelectedFileForModal] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/search/stats`);
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.data);
      }
    } catch {
      // Ignore background stats error
    }
  }, [repositoryId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleIndexChunks = async () => {
    setIndexing(true);
    setError(null);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/search/index`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchStats();
      } else {
        setError(data.error?.message || "Failed to index repository chunks");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger indexing");
    } finally {
      setIndexing(false);
    }
  };

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const payload = {
        query: query.trim(),
        matchType,
        limit: 20,
        path: pathFilter.trim() || undefined,
        symbolKinds: selectedKind !== "all" ? [selectedKind] : undefined
      };

      const res = await fetch(`/api/repositories/${repositoryId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResults(data.data.results || []);
      } else {
        setError(data.error?.message || "Code search failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error during search");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 select-none">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <h1 className="text-lg font-bold font-display">Code Search</h1>
          {stats?.isSearchReady && (
            <span className="text-xs font-mono text-[#6B7280] dark:text-[#94A3B8]">
              {stats.totalChunks} chunks · {stats.totalEntities ?? 0} entities
            </span>
          )}
        </div>

        <button
          onClick={handleIndexChunks}
          disabled={indexing}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark hover:bg-subtle-light dark:hover:bg-[#1A272E] text-xs font-medium transition-colors disabled:opacity-50"
        >
          {indexing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Layers className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8]" />
          )}
          <span>{indexing ? "Indexing..." : "Re-Index"}</span>
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#6B7280] dark:text-[#94A3B8]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code or symbols..."
            className="w-full pl-10 pr-24 py-3 rounded-xl bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark text-xs font-mono placeholder-[#6B7280] dark:placeholder-[#64748B] focus:outline-none focus:border-[#111827] dark:focus:border-[#F59E0B] transition-colors"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 py-1.5 rounded-lg bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
            </button>
          </div>
        </div>

        {/* Minimal Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-0.5 bg-subtle-light dark:bg-subtle-dark p-0.5 rounded-lg border border-hairline-light dark:border-hairline-dark">
            {(
              [
                { id: "hybrid", label: "Hybrid" },
                { id: "vector", label: "AST" },
                { id: "lexical", label: "BM25" },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setMatchType(mode.id)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${matchType === mode.id
                  ? "bg-surface-light dark:bg-[#1A272E] text-[#111827] dark:text-[#F1F5F9] font-medium shadow-2xs"
                  : "text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9]"
                  }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5">
            {["all", "function", "class", "method", "route"].map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setSelectedKind(kind)}
                className={`px-2.5 py-1 rounded-lg capitalize text-xs transition-colors border ${selectedKind === kind
                  ? "bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] border-transparent font-medium"
                  : "bg-surface-light dark:bg-surface-dark border-hairline-light dark:border-hairline-dark text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9]"
                  }`}
              >
                {kind}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            placeholder="Path filter..."
            className="px-2.5 py-1 rounded-lg bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark text-xs font-mono placeholder-[#6B7280] dark:placeholder-[#64748B] focus:outline-none focus:border-[#111827] dark:focus:border-[#F59E0B] w-36"
          />
        </div>
      </form>

      {error && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center text-[#6B7280] dark:text-[#94A3B8]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="text-center py-14 rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark text-xs text-[#6B7280] dark:text-[#94A3B8]">
          No matches found
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">
            {results.length} results
          </div>
          {results.map((res) => (
            <SearchResultCard
              key={res.chunkId}
              result={res}
              onSelect={(path) => setSelectedFileForModal(path)}
            />
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark flex flex-wrap gap-2 justify-center">
          {[
            "authenticate user jwt",
            "database connection",
            "express router",
            "error middleware",
          ].map((suggest) => (
            <button
              key={suggest}
              onClick={() => setQuery(suggest)}
              className="px-3 py-1.5 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-xs font-mono text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] transition-colors"
            >
              {suggest}
            </button>
          ))}
        </div>
      )}

      {selectedFileForModal && (
        <SourceViewerModal
          repositoryId={repositoryId}
          filePath={selectedFileForModal}
          onClose={() => setSelectedFileForModal(null)}
        />
      )}
    </div>
  );
}
