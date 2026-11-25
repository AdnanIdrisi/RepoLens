import { useState, useEffect, useCallback, FormEvent } from "react";
import {
  Search,
  Sparkles,
  Binary,
  Type,
  Filter,
  Loader2,
  AlertCircle,
  Database,
  Layers,
  Code2
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
    <div className="space-y-5 select-none font-mono">
      {/* Search Header and Stats Bar */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-[#1e293b] text-indigo-400 border border-[#334155] flex items-center justify-center">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-display">Code-Aware Intelligence & Search (P1.2)</h2>
            <p className="text-xs text-slate-400">
              {stats?.isSearchReady
                ? `${stats.totalChunks} structural chunks, ${stats.totalEntities ?? 0} AST code entities indexed`
                : "No code index built yet. Click to index repository entities."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleIndexChunks}
            disabled={indexing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#111827] hover:bg-[#1e293b] text-slate-300 text-xs font-semibold border border-[#334155] transition-colors disabled:opacity-50 shadow-2xs"
          >
            {indexing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
            ) : (
              <Layers className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>{indexing ? "Indexing..." : "Index Repository"}</span>
          </button>
        </div>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code using natural language or identifiers (e.g., 'authenticate user token', 'database connection')..."
            className="w-full pl-10 pr-24 py-2.5 rounded-lg bg-[#111827] border border-[#334155] text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:bg-[#161f30] transition-colors shadow-2xs"
          />
          <div className="absolute inset-y-0 right-1 flex items-center">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center space-x-1 shadow-xs"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Filters and Retrieval Modes */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Match Mode Selector */}
          <div className="flex items-center space-x-1 bg-[#111827] p-1 rounded-md border border-[#334155]">
            <button
              type="button"
              onClick={() => setMatchType("hybrid")}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1.5 ${
                matchType === "hybrid"
                  ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Code-Aware Hybrid</span>
            </button>
            <button
              type="button"
              onClick={() => setMatchType("vector")}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1.5 ${
                matchType === "vector"
                  ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Binary className="h-3 w-3" />
              <span>AST Traversal</span>
            </button>
            <button
              type="button"
              onClick={() => setMatchType("lexical")}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1.5 ${
                matchType === "lexical"
                  ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Type className="h-3 w-3" />
              <span>BM25 Lexical</span>
            </button>
          </div>

          {/* Symbol Kind Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 flex items-center font-medium">
              <Filter className="h-3 w-3 mr-1" /> Kind:
            </span>
            {["all", "function", "class", "method", "route"].map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setSelectedKind(kind)}
                className={`px-2 py-0.5 rounded capitalize transition-colors font-medium text-xs ${
                  selectedKind === kind
                    ? "bg-indigo-600 text-white border border-indigo-600 shadow-2xs"
                    : "text-slate-400 hover:text-slate-200 bg-[#111827] border border-[#334155] shadow-2xs"
                }`}
              >
                {kind}
              </button>
            ))}
          </div>

          {/* Path Prefix Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Path:</span>
            <input
              type="text"
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              placeholder="e.g. src/auth"
              className="px-2 py-1 rounded-md bg-[#111827] border border-[#334155] text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 w-32 shadow-2xs"
            />
          </div>
        </div>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center space-x-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-xs">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
          <span>Executing hybrid reciprocal rank fusion...</span>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="text-center py-16 bg-[#0f172a] rounded-xl border border-[#1e293b] p-8 shadow-xs">
          <Code2 className="h-8 w-8 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-100">No Matching Code Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Try adjusting your search query, choosing a different retrieval mode (e.g. Hybrid or Lexical), or rebuilding embeddings.
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
            <span>Found {results.length} relevant code snippets</span>
            <span>Ranked by Reciprocal Rank Fusion</span>
          </div>

          <div className="space-y-3">
            {results.map((res) => (
              <SearchResultCard
                key={res.chunkId}
                result={res}
                onSelect={(path) => setSelectedFileForModal(path)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Empty Prompt State */
        <div className="p-8 rounded-xl border border-[#1e293b] bg-[#0f172a] text-center space-y-3 shadow-xs">
          <Sparkles className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-100 font-display">Search Codebase with AI Intelligence</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            RepoLens combines AST structural code parsing with lexical BM25 symbol ranking to find both conceptual implementations and exact identifier definitions.
          </p>

          <div className="pt-3 flex flex-wrap justify-center gap-2">
            {[
              "authenticate user jwt",
              "database connection pool",
              "express router endpoints",
              "error handling middleware",
              "crypto hash sha256"
            ].map((suggest) => (
              <button
                key={suggest}
                onClick={() => {
                  setQuery(suggest);
                }}
                className="px-2.5 py-1 rounded-md bg-[#111827] hover:bg-[#1e293b] text-slate-300 text-xs border border-[#334155] hover:border-indigo-500 transition-colors shadow-2xs font-medium"
              >
                &ldquo;{suggest}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Source Viewer Modal */}
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
