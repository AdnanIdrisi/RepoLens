import { useState, useEffect, useCallback, FormEvent } from "react";
import {
  FolderGit2,
  GitBranch,
  GitCommit,
  ExternalLink,
  Search,
  Network,
  Workflow,
  Bot,
  ShieldAlert,
  FileCode,
  Copy,
  Check,
  Plus,
  Sparkles,
  Zap,
  ArrowRight
} from "lucide-react";
import { RepositorySummary, ActiveTab } from "../../components/Sidebar";
import { RepositoryIngestionForm } from "../repositories/RepositoryIngestionForm";
import { JobProgressCard } from "../repositories/JobProgressCard";
import { FileListTable } from "../repositories/FileListTable";

interface DashboardOverviewProps {
  repositories: RepositorySummary[];
  activeRepo: RepositorySummary | undefined;
  activeRepoId: string | null;
  onSelectRepo: (id: string) => void;
  onSelectTab: (tab: ActiveTab, initialQuery?: string) => void;
  activeJobId: string | null;
  isIngesting: boolean;
  onIngestionStarted: (repositoryId: string, jobId: string) => void;
  onJobCompleted: () => void;
}

interface RepoMetrics {
  totalFiles: number;
  totalChunks: number;
  totalEntities: number;
  graphNodesCount: number;
  graphEdgesCount: number;
  loading: boolean;
}

export function DashboardOverview({
  repositories,
  activeRepo,
  activeRepoId,
  onSelectRepo,
  onSelectTab,
  activeJobId,
  isIngesting,
  onIngestionStarted,
  onJobCompleted
}: DashboardOverviewProps) {
  const [copiedCommit, setCopiedCommit] = useState(false);
  const [showIngestionModal, setShowIngestionModal] = useState(false);
  const [quickSearchInput, setQuickSearchInput] = useState("");
  const [metrics, setMetrics] = useState<RepoMetrics>({
    totalFiles: 0,
    totalChunks: 0,
    totalEntities: 0,
    graphNodesCount: 0,
    graphEdgesCount: 0,
    loading: false
  });

  // Fetch metrics for the active repository
  const fetchMetrics = useCallback(async () => {
    if (!activeRepoId) return;
    setMetrics((prev) => ({ ...prev, loading: true }));

    try {
      const [statsRes, filesRes, graphRes] = await Promise.all([
        fetch(`/api/repositories/${activeRepoId}/search/stats`),
        fetch(`/api/repositories/${activeRepoId}/files?limit=1`),
        fetch(`/api/repositories/${activeRepoId}/graph`)
      ]);

      let totalChunks = 0;
      let totalEntities = 0;
      let totalFiles = 0;
      let graphNodesCount = 0;
      let graphEdgesCount = 0;

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.data) {
          totalChunks = statsData.data.totalChunks || 0;
          totalEntities = statsData.data.totalEntities || 0;
        }
      }

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        if (filesData.success && filesData.data?.pagination) {
          totalFiles = filesData.data.pagination.total || 0;
        }
      }

      if (graphRes.ok) {
        const graphData = await graphRes.json();
        if (graphData.success && graphData.data) {
          graphNodesCount = graphData.data.nodes?.length || 0;
          graphEdgesCount = graphData.data.edges?.length || 0;
        }
      }

      setMetrics({
        totalFiles,
        totalChunks,
        totalEntities,
        graphNodesCount,
        graphEdgesCount,
        loading: false
      });
    } catch (err) {
      console.error("Failed to load repo metrics:", err);
      setMetrics((prev) => ({ ...prev, loading: false }));
    }
  }, [activeRepoId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const copyCommitSha = () => {
    if (!activeRepo?.commitSha) return;
    navigator.clipboard.writeText(activeRepo.commitSha);
    setCopiedCommit(true);
    setTimeout(() => setCopiedCommit(false), 2000);
  };

  const handleQuickSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!quickSearchInput.trim()) return;
    onSelectTab("search", quickSearchInput.trim());
  };

  const commitShort = activeRepo?.commitSha ? activeRepo.commitSha.slice(0, 7) : "HEAD";

  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-6 max-w-7xl mx-auto bg-[#090d16]">
      {/* TOP HEADER: Repository Hero & Action Bar */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start space-x-3.5">
            <div className="h-12 w-12 rounded-lg bg-indigo-600 border border-indigo-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
              <FolderGit2 className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-display">
                  {activeRepo ? activeRepo.fullName : "No Repository Selected"}
                </h1>

                {activeRepo && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Ready
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-[#1e293b] text-slate-300 border border-[#334155]">
                      <GitBranch className="h-3 w-3 text-slate-300" />
                      {activeRepo.defaultBranch || "main"}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                {activeRepo?.commitSha && (
                  <button
                    onClick={copyCommitSha}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-300 hover:text-slate-100 transition-colors bg-[#1e293b] hover:bg-[#25334d] px-2 py-0.5 rounded border border-[#334155] shadow-2xs"
                    title="Click to copy full commit SHA"
                  >
                    <GitCommit className="h-3 w-3 text-slate-400" />
                    <span>{commitShort}</span>
                    {copiedCommit ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                  </button>
                )}

                <span className="text-slate-600">&bull;</span>
                <span className="text-xs font-medium text-slate-400">AST-Parsed & Embedding-Free Architecture</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-[11px] text-slate-300 font-mono font-semibold bg-[#1e293b] px-2 py-0.5 rounded border border-[#334155]">
                  Okapi BM25 Lexical + Graph
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            {activeRepo && (
              <a
                href={`https://github.com/${activeRepo.fullName}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#25334d] text-xs font-semibold text-slate-200 border border-[#334155] shadow-2xs transition-colors"
              >
                <span>View on GitHub</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
            )}

            <button
              onClick={() => setShowIngestionModal(!showIngestionModal)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-xs transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showIngestionModal ? "Close Form" : "Connect Repository"}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Repository Ingestion Form */}
        {showIngestionModal && (
          <div className="mt-5 pt-5 border-t border-[#1e293b]">
            <RepositoryIngestionForm
              onIngestionStarted={(repoId, jobId) => {
                setShowIngestionModal(false);
                onIngestionStarted(repoId, jobId);
              }}
              isLoading={isIngesting}
            />
          </div>
        )}
      </div>

      {/* Active Job Progress (if any) */}
      {activeJobId && (
        <JobProgressCard jobId={activeJobId} onJobCompleted={onJobCompleted} />
      )}

      {/* 4 LIVE KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Source Files */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4.5 shadow-2xs transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Discovered Files</span>
            <div className="h-8 w-8 rounded-lg bg-[#1e293b] text-slate-300 flex items-center justify-center border border-[#334155]">
              <FileCode className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {metrics.totalFiles || "—"}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">Eligible</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Classified source files analyzed</p>
        </div>

        {/* Metric 2: AST Code Entities */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4.5 shadow-2xs transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">AST Code Entities</span>
            <div className="h-8 w-8 rounded-lg bg-[#1e293b] text-slate-300 flex items-center justify-center border border-[#334155]">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {metrics.totalEntities || metrics.totalChunks || "—"}
            </span>
            <span className="text-[11px] text-indigo-400 font-semibold font-mono bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">AST Extracted</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Functions, classes, routes & handlers</p>
        </div>

        {/* Metric 3: Graph Nodes & Edges */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4.5 shadow-2xs transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Relationship Graph</span>
            <div className="h-8 w-8 rounded-lg bg-[#1e293b] text-slate-300 flex items-center justify-center border border-[#334155]">
              <Network className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {metrics.graphEdgesCount || metrics.graphNodesCount || "Active"}
            </span>
            <span className="text-[11px] text-purple-400 font-semibold bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">Multi-Hop</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Calls, defines & middleware links</p>
        </div>

        {/* Metric 4: Retrieval Engine */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4.5 shadow-2xs transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Search Intelligence</span>
            <div className="h-8 w-8 rounded-lg bg-[#1e293b] text-slate-300 flex items-center justify-center border border-[#334155]">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">BM25</span>
            <span className="text-[11px] text-amber-400 font-semibold font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">Zero Embeddings</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Deterministic ~2ms code retrieval</p>
        </div>
      </div>

      {/* BENTO CAPABILITY SHOWCASE (P1.1 - P1.5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <span>Explore Code Intelligence Modules</span>
          </h2>
          <span className="text-xs text-slate-500">Select a module to deep dive into code structure</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Module 1: Code Relationship Graph (P1.1) */}
          <div
            onClick={() => onSelectTab("graph")}
            className="group rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 cursor-pointer transition-all hover:border-indigo-500/60 hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[#1e293b] text-indigo-400 border border-[#334155] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Network className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-slate-300 border border-[#334155] font-semibold">
                  P1.1 Graph
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors">
                Code Relationship Graph
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Interactive node-link visualization mapping files, functions, classes, and call hierarchies with depth neighborhood filtering.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-300 group-hover:text-indigo-400 font-semibold font-mono">
              <span>Inspect Call Trees</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 2: Semantic & Hybrid Search (P1.2) - WITH QUICK INPUT */}
          <div className="group rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 transition-all hover:border-indigo-500/60 hover:shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[#1e293b] text-indigo-400 border border-[#334155] flex items-center justify-center">
                  <Search className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-slate-300 border border-[#334155] font-semibold">
                  P1.2 Search
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Code Search & Intelligence
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed mb-3">
                Ask architectural questions or search identifiers with Okapi BM25 and query expansion.
              </p>

              {/* Quick Inline Search Form */}
              <form onSubmit={handleQuickSearch} className="relative">
                <input
                  type="text"
                  value={quickSearchInput}
                  onChange={(e) => setQuickSearchInput(e.target.value)}
                  placeholder="e.g. 'how are tokens verified?'"
                  className="w-full pl-8 pr-16 py-1.5 rounded-lg bg-[#111827] border border-[#334155] text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-[#161f30] focus:border-indigo-500 transition-colors"
                />
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
                <button
                  type="submit"
                  className="absolute right-1 top-1 px-2.5 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-500 transition-colors shadow-2xs"
                >
                  Go
                </button>
              </form>
            </div>

            <div
              onClick={() => onSelectTab("search")}
              className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-300 group-hover:text-indigo-400 font-semibold font-mono cursor-pointer"
            >
              <span>Open Search Explorer</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 3: Flow Tracing (P1.3) */}
          <div
            onClick={() => onSelectTab("trace")}
            className="group rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 cursor-pointer transition-all hover:border-indigo-500/60 hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[#1e293b] text-indigo-400 border border-[#334155] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Workflow className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-slate-300 border border-[#334155] font-semibold">
                  P1.3 Tracing
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors">
                Static Flow Tracing
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Traces end-to-end HTTP routes across middlewares, controllers, service functions, and database queries.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-300 group-hover:text-indigo-400 font-semibold font-mono">
              <span>Trace Endpoints</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 4: Gemini AI Code Agent (P1.4) */}
          <div
            onClick={() => onSelectTab("agent")}
            className="group rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 cursor-pointer transition-all hover:border-indigo-500/60 hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[#1e293b] text-indigo-400 border border-[#334155] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-slate-300 border border-[#334155] font-semibold">
                  P1.4 Agent
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors">
                Gemini AI Code Agent
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Autonomous code understanding agent providing evidence-backed answers with verified line range citations.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-300 group-hover:text-indigo-400 font-semibold font-mono">
              <span>Chat with Codebase</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 5: Impact Analysis (P1.5) */}
          <div
            onClick={() => onSelectTab("impact")}
            className="group rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 cursor-pointer transition-all hover:border-indigo-500/60 hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[#1e293b] text-indigo-400 border border-[#334155] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-slate-300 border border-[#334155] font-semibold">
                  P1.5 Impact
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors">
                Change Impact Analysis
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Predicts blast radius for code modifications, identifying impacted callers and recommending regression tests.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-300 group-hover:text-indigo-400 font-semibold font-mono">
              <span>Simulate Blast Radius</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Quick Info & Presets Card */}
          <div className="rounded-xl border border-dashed border-[#334155] bg-[#0b0f19] p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider block mb-2 font-bold">
                Quick Connect Presets
              </span>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Need sample repositories to test and explore RepoLens? Try these pre-verified public projects:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "AdnanIdrisi/Creator-Support-Platform",
                  "expressjs/express"
                ].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => {
                      const matched = repositories.find((r) => r.fullName === sample);
                      if (matched) {
                        onSelectRepo(matched.id);
                      } else {
                        setShowIngestionModal(true);
                      }
                    }}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#111827] hover:bg-[#1e293b] text-slate-300 hover:text-slate-100 border border-[#334155] transition-colors shadow-2xs font-medium"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 text-[11px] text-slate-500 font-mono flex items-center justify-between pt-3 border-t border-[#1e293b]">
              <span>v0.1.0 &bull; Local Docker</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Services Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DISCOVERED SOURCE FILES TABLE */}
      {activeRepoId && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
              <FileCode className="h-4 w-4 text-slate-400" />
              <span>Repository Source Explorer</span>
            </h2>
            <span className="text-xs text-slate-500">Filterable file classification tree</span>
          </div>

          <FileListTable repositoryId={activeRepoId} />
        </div>
      )}
    </div>
  );
}
