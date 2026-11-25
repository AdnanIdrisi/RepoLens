import { useState, useEffect, useCallback, FormEvent } from "react";
import {
  GitBranch,
  GitCommit,
  ExternalLink,
  Search,
  Network,
  Workflow,
  Bot,
  ShieldAlert,
  Copy,
  Check,
  Plus,
  ArrowRight,
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
  activeRepo,
  activeRepoId,
  onSelectTab,
  activeJobId,
  isIngesting,
  onIngestionStarted,
  onJobCompleted,
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
    loading: false,
  });

  const fetchMetrics = useCallback(async () => {
    if (!activeRepoId) return;
    setMetrics((prev) => ({ ...prev, loading: true }));

    try {
      const [statsRes, filesRes, graphRes] = await Promise.all([
        fetch(`/api/repositories/${activeRepoId}/search/stats`),
        fetch(`/api/repositories/${activeRepoId}/files?limit=1`),
        fetch(`/api/repositories/${activeRepoId}/graph`),
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
        loading: false,
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
    <div className="h-full overflow-y-auto px-6 py-6 space-y-6 max-w-6xl mx-auto">
      {/* Compact Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight font-display">
              {activeRepo ? activeRepo.fullName : "Repositories"}
            </h1>
            {activeRepo && (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-[#6B7280] dark:text-[#94A3B8]">
                  <GitBranch className="h-3 w-3" />
                  {activeRepo.defaultBranch || "main"}
                </span>
                {activeRepo.commitSha && (
                  <button
                    onClick={copyCommitSha}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] transition-colors"
                    title="Copy commit SHA"
                  >
                    <GitCommit className="h-3 w-3" />
                    <span>{commitShort}</span>
                    {copiedCommit ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-2.5 w-2.5" />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeRepo && (
            <a
              href={`https://github.com/${activeRepo.fullName}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark text-xs font-medium text-[#111827] dark:text-[#F1F5F9] hover:bg-subtle-light dark:hover:bg-[#1A272E] transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8]" />
            </a>
          )}

          <button
            onClick={() => setShowIngestionModal(!showIngestionModal)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showIngestionModal ? "Close" : "Connect Repo"}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Ingestion Form */}
      {(showIngestionModal || !activeRepo) && (
        <RepositoryIngestionForm
          onIngestionStarted={(repoId, jobId) => {
            setShowIngestionModal(false);
            onIngestionStarted(repoId, jobId);
          }}
          isLoading={isIngesting}
        />
      )}

      {/* Active Job Progress */}
      {activeJobId && <JobProgressCard jobId={activeJobId} onJobCompleted={onJobCompleted} />}

      {/* Joined Hairline KPI Strip (Reference 2 style) */}
      {activeRepo && (
        <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-hairline-light dark:bg-hairline-dark overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px">
          <div className="p-5 bg-surface-light dark:bg-surface-dark">
            <span className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] block">
              Files
            </span>
            <span className="mt-1.5 text-2xl font-bold font-mono tabular-nums block">
              {metrics.loading ? "—" : metrics.totalFiles.toLocaleString()}
            </span>
          </div>

          <div className="p-5 bg-surface-light dark:bg-surface-dark">
            <span className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] block">
              Entities
            </span>
            <span className="mt-1.5 text-2xl font-bold font-mono tabular-nums block">
              {metrics.loading ? "—" : (metrics.totalEntities || metrics.totalChunks).toLocaleString()}
            </span>
          </div>

          <div className="p-5 bg-surface-light dark:bg-surface-dark">
            <span className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] block">
              Graph Edges
            </span>
            <span className="mt-1.5 text-2xl font-bold font-mono tabular-nums block">
              {metrics.loading ? "—" : (metrics.graphEdgesCount || metrics.graphNodesCount).toLocaleString()}
            </span>
          </div>

          <div className="p-5 bg-surface-light dark:bg-surface-dark">
            <span className="text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] block">
              Search Index
            </span>
            <span className="mt-1.5 text-2xl font-bold font-mono tabular-nums block text-emerald-600 dark:text-emerald-400">
              {metrics.totalChunks > 0 ? "Ready" : "Pending"}
            </span>
          </div>
        </div>
      )}

      {/* Minimal Quick-Jump Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => onSelectTab("graph")}
          className="text-left group rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-5 hover:border-[#111827] dark:hover:border-[#F59E0B]/60 transition-colors flex flex-col justify-between min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-8 w-8 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark flex items-center justify-center text-[#111827] dark:text-[#F1F5F9]">
              <Network className="h-4 w-4" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Code Graph</h3>
            <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Dependencies & call hierarchy
            </p>
          </div>
        </button>

        <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-5 flex flex-col justify-between space-y-3 min-h-[124px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark flex items-center justify-center text-[#111827] dark:text-[#F1F5F9]">
                <Search className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">Code Search</h3>
            </div>
            <button
              onClick={() => onSelectTab("search")}
              className="text-xs text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9]"
              aria-label="Open Code Search"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <form onSubmit={handleQuickSearch} className="relative">
            <input
              type="text"
              value={quickSearchInput}
              onChange={(e) => setQuickSearchInput(e.target.value)}
              placeholder="Search symbols..."
              className="w-full pl-3 pr-12 py-2 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-xs font-mono text-[#111827] dark:text-[#F1F5F9] placeholder-[#6B7280] dark:placeholder-[#64748B] focus:outline-none focus:border-[#111827] dark:focus:border-[#F59E0B] transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] text-[11px] font-semibold hover:opacity-90 transition-opacity"
            >
              Go
            </button>
          </form>
        </div>

        <button
          onClick={() => onSelectTab("trace")}
          className="text-left group rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-5 hover:border-[#111827] dark:hover:border-[#F59E0B]/60 transition-colors flex flex-col justify-between min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-8 w-8 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark flex items-center justify-center text-[#111827] dark:text-[#F1F5F9]">
              <Workflow className="h-4 w-4" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Flow Tracing</h3>
            <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Endpoint execution chains
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelectTab("agent")}
          className="text-left group rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-5 hover:border-[#111827] dark:hover:border-[#F59E0B]/60 transition-colors flex flex-col justify-between min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-8 w-8 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark flex items-center justify-center text-[#111827] dark:text-[#F1F5F9]">
              <Bot className="h-4 w-4" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Agent</h3>
            <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Cited codebase Q&amp;A
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelectTab("impact")}
          className="text-left group rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-5 hover:border-[#111827] dark:hover:border-[#F59E0B]/60 transition-colors flex flex-col justify-between min-h-[124px]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-8 w-8 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark flex items-center justify-center text-[#111827] dark:text-[#F1F5F9]">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Impact Analysis</h3>
            <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Blast radius &amp; affected tests
            </p>
          </div>
        </button>
      </div>

      {/* Repository Files */}
      {activeRepoId && <FileListTable repositoryId={activeRepoId} />}
    </div>
  );
}
