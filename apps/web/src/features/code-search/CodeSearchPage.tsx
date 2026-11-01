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
      <div className="rounded border border-[#25334d] bg-[#131b2e] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded bg-[#1a243b] text-[#818cf8] border border-[#25334d] flex items-center justify-center">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f8fafc]">Semantic & Hybrid Code Search (P1.2)</h2>
            <p className="text-xs text-[#94a3b8]">
              {stats?.isSearchReady
                ? `${stats.totalChunks} structural chunks indexed (${stats.embeddedChunks} embedded)`
                : "No embeddings indexed yet. Click to build vector embeddings for this revision."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleIndexChunks}
            disabled={indexing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#1a243b] hover:bg-[#25334d] text-[#f8fafc] text-xs font-medium border border-[#25334d] transition-colors disabled:opacity-50"
          >
            {indexing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4f46e5]" />
            ) : (
              <Layers className="h-3.5 w-3.5 text-[#4f46e5]" />
            )}
            <span>{indexing ? "Indexing..." : "Build Embeddings"}</span>
          </button>
        </div>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#475569]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code using natural language or identifiers (e.g., 'authenticate user token', 'database connection')..."
            className="w-full pl-10 pr-24 py-2.5 rounded bg-[#090d16] border border-[#25334d] text-[#f8fafc] placeholder-[#475569] text-xs focus:outline-none focus:border-[#4f46e5] transition-colors"
          />
          <div className="absolute inset-y-0 right-1 flex items-center">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-3.5 py-1.5 rounded bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center space-x-1"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Filters and Retrieval Modes */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Match Mode Selector */}
          <div className="flex items-center space-x-1 bg-[#131b2e] p-1 rounded border border-[#25334d]">
            <button
              type="button"
              onClick={() => setMatchType("hybrid")}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1.5 ${
                matchType === "hybrid"
                  ? "bg-[#4f46e5] text-white font-bold"
                  : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Hybrid RRF</span>
            </button>
            <button
              type="button"
              onClick={() => setMatchType("vector")}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1.5 ${
                matchType === "vector"
                  ? "bg-[#4f46e5] text-white font-bold"
                  : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              <Binary className="h-3 w-3" />
              <span>Semantic Vector</span>
            </button>
            <button
              type="button"
              onClick={() => setMatchType("lexical")}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1.5 ${
                matchType === "lexical"
                  ? "bg-[#4f46e5] text-white font-bold"
                  : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              <Type className="h-3 w-3" />
              <span>Lexical Exact</span>
            </button>
          </div>

          {/* Symbol Kind Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[#94a3b8] flex items-center">
              <Filter className="h-3 w-3 mr-1" /> Kind:
            </span>
            {["all", "function", "class", "method", "route"].map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setSelectedKind(kind)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  selectedKind === kind
                    ? "bg-[#1a243b] text-[#f8fafc] border border-[#4f46e5]"
                    : "text-[#94a3b8] hover:text-[#f8fafc] bg-[#131b2e] border border-[#25334d]"
                }`}
              >
                {kind}
              </button>
            ))}
          </div>

          {/* Path Prefix Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[#94a3b8]">Path:</span>
            <input
              type="text"
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              placeholder="e.g. src/auth"
              className="px-2 py-1 rounded bg-[#090d16] border border-[#25334d] text-[#f8fafc] placeholder-[#475569] text-xs focus:outline-none focus:border-[#4f46e5] w-32"
            />
          </div>
        </div>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded border border-[#dc2626] bg-[#090d16] text-[#dc2626] text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#94a3b8] text-xs">
          <Loader2 className="h-6 w-6 animate-spin text-[#4f46e5] mb-2" />
          <span>Executing hybrid reciprocal rank fusion...</span>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="text-center py-16 bg-[#131b2e] rounded border border-[#25334d] p-8">
          <Code2 className="h-8 w-8 text-[#475569] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#f8fafc]">No Matching Code Found</h3>
          <p className="text-xs text-[#94a3b8] max-w-md mx-auto mt-1">
            Try adjusting your search query, choosing a different retrieval mode (e.g. Hybrid or Lexical), or rebuilding embeddings.
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#94a3b8] px-1">
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
        <div className="p-8 rounded border border-[#25334d] bg-[#131b2e] text-center space-y-3">
          <Sparkles className="h-8 w-8 text-[#4f46e5] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#f8fafc]">Search Codebase with AI Intelligence</h3>
          <p className="text-xs text-[#94a3b8] max-w-lg mx-auto">
            RepoLens combines Gemini text embeddings with lexical symbol ranking to find both conceptual implementations and exact identifier definitions.
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
                className="px-2.5 py-1 rounded bg-[#090d16] hover:bg-[#1a243b] text-[#f8fafc] text-xs border border-[#25334d] hover:border-[#4f46e5] transition-colors"
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
