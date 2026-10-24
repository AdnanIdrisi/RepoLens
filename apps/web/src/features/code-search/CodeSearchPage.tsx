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
}

interface SearchStats {
  totalChunks: number;
  embeddedChunks: number;
  isSearchReady: boolean;
}

export function CodeSearchPage({ repositoryId }: CodeSearchPageProps) {
  const [query, setQuery] = useState("");
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
        setError(data.error?.message || "Failed to index code chunks");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Indexing network error");
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
      const symbolKinds = selectedKind !== "all" ? [selectedKind] : undefined;
      const body = {
        query: query.trim(),
        matchType,
        symbolKinds,
        path: pathFilter.trim() || undefined,
        limit: 20
      };

      const res = await fetch(`/api/repositories/${repositoryId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResults(data.data.results || []);
      } else {
        setError(data.error?.message || "Search query failed");
        setResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search network error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Indexing Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Semantic & Hybrid Code Search (P1.2)</h2>
            <p className="text-xs text-slate-400">
              {stats?.isSearchReady
                ? `${stats.totalChunks} structural chunks indexed (${stats.embeddedChunks} embedded)`
                : "No embeddings indexed yet. Click to build vector embeddings for this revision."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleIndexChunks}
            disabled={indexing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all disabled:opacity-50"
          >
            {indexing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
            ) : (
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
            )}
            <span>{indexing ? "Indexing Chunks..." : "Build / Re-Index Embeddings"}</span>
          </button>
        </div>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code using natural language or identifiers (e.g., 'authenticate user token', 'database connection', 'express route handlers')..."
            className="w-full pl-11 pr-28 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Filters and Retrieval Modes */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Match Mode Selector */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setMatchType("hybrid")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1.5 ${
                matchType === "hybrid"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Hybrid RRF</span>
            </button>
            <button
              type="button"
              onClick={() => setMatchType("vector")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1.5 ${
                matchType === "vector"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Binary className="h-3 w-3" />
              <span>Semantic Vector</span>
            </button>
            <button
              type="button"
              onClick={() => setMatchType("lexical")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1.5 ${
                matchType === "lexical"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Type className="h-3 w-3" />
              <span>Lexical Exact</span>
            </button>
          </div>

          {/* Symbol Kind Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 flex items-center">
              <Filter className="h-3 w-3 mr-1" /> Kind:
            </span>
            {["all", "function", "class", "method", "route"].map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setSelectedKind(kind)}
                className={`px-2 py-0.5 rounded capitalize font-medium transition-all ${
                  selectedKind === kind
                    ? "bg-slate-700 text-white border border-slate-600"
                    : "text-slate-400 hover:text-slate-200 bg-slate-800/40 border border-transparent"
                }`}
              >
                {kind}
              </button>
            ))}
          </div>

          {/* Path Prefix Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Path:</span>
            <input
              type="text"
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              placeholder="e.g. src/modules"
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 placeholder-slate-600 text-xs focus:outline-none focus:border-slate-700 w-32"
            />
          </div>
        </div>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-sm">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
          <span>Executing hybrid reciprocal rank fusion...</span>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800/80 p-8">
          <Code2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No Matching Code Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Try adjusting your search query, choosing a different retrieval mode (e.g. Hybrid or Lexical), or rebuilding embeddings.
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Found {results.length} relevant code snippets</span>
            <span className="font-mono">Ranked by Reciprocal Rank Fusion</span>
          </div>

          <div className="space-y-4">
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
        <div className="p-8 rounded-2xl border border-slate-800/80 bg-slate-950/40 text-center">
          <Sparkles className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">Search Codebase with AI Intelligence</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1">
            RepoLens combines Gemini text embeddings with lexical symbol ranking to find both conceptual implementations and exact identifier definitions.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
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
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 hover:border-slate-700 transition-all font-mono"
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
