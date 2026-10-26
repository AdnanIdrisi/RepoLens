import { useState, useEffect, useCallback } from "react";
import { 
  Network, 
  Search, 
  Workflow, 
  FolderGit2,
  Terminal,
  ExternalLink
} from "lucide-react";
import { Sidebar, ActiveTab, RepositorySummary } from "./components/Sidebar";
import { RepositoryIngestionForm } from "./features/repositories/RepositoryIngestionForm";
import { JobProgressCard } from "./features/repositories/JobProgressCard";
import { FileListTable } from "./features/repositories/FileListTable";
import { ArchitecturePage } from "./features/architecture/ArchitecturePage";
import { CodeSearchPage } from "./features/code-search/CodeSearchPage";
import { FlowTracingPage } from "./features/flow-tracing/FlowTracingPage";
import { ImpactAnalysisPage } from "./features/impact-analysis/ImpactAnalysisPage";
import { AgentChatPage } from "./features/agent/AgentChatPage";

interface HealthStatus {
  api: "checking" | "online" | "offline";
  db: "checking" | "connected" | "disconnected";
  uptime?: number;
}

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("graph");
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [health, setHealth] = useState<HealthStatus>({
    api: "checking",
    db: "checking"
  });

  // Fetch analyzed repositories
  const fetchRepositories = useCallback(async () => {
    try {
      const res = await fetch("/api/repositories");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const repos: RepositorySummary[] = json.data.map((r: {
            id?: string;
            _id?: string;
            fullName?: string;
            owner?: string;
            name?: string;
            defaultBranch?: string;
            status?: string;
            commitSha?: string;
            activeIndexVersion?: string;
          }) => ({
            id: r.id || r._id || "",
            fullName: r.fullName || `${r.owner}/${r.name}`,
            defaultBranch: r.defaultBranch || "main",
            status: r.status || "ready",
            commitSha: r.commitSha,
            activeIndexVersion: r.activeIndexVersion
          }));
          setRepositories(repos);

          // Auto-select first repo if none selected yet
          if (repos.length > 0) {
            setActiveRepoId((prev) => prev || repos[0].id);
          } else {
            setActiveTab("repos");
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
    }
  }, []);

  // System Health Polling
  useEffect(() => {
    fetchRepositories();

    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setHealth(prev => ({ ...prev, api: "online", uptime: data.data?.uptimeSeconds }));
        } else {
          setHealth(prev => ({ ...prev, api: "offline" }));
        }
      } catch {
        setHealth(prev => ({ ...prev, api: "offline" }));
      }

      try {
        const readyRes = await fetch("/api/ready");
        const readyData = await readyRes.json();
        setHealth(prev => ({
          ...prev,
          db: readyData.data?.checks?.database === "connected" ? "connected" : "disconnected"
        }));
      } catch {
        setHealth(prev => ({ ...prev, db: "disconnected" }));
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchRepositories]);

  const handleIngestionStarted = (repositoryId: string, jobId: string) => {
    setActiveRepoId(repositoryId);
    setActiveJobId(jobId);
    setIsIngesting(true);
    fetchRepositories();
  };

  const handleJobCompleted = () => {
    setIsIngesting(false);
    fetchRepositories();
  };

  const activeRepo = repositories.find((r) => r.id === activeRepoId) || repositories[0];

  const getTabTitle = (tab: ActiveTab) => {
    switch (tab) {
      case "repos":
        return "Repository Management & Ingestion";
      case "graph":
        return "P1.1 Code Relationship Graph";
      case "search":
        return "P1.2 Semantic & Hybrid Code Search";
      case "trace":
        return "P1.3 Static Execution Flow Tracing";
      case "agent":
        return "P1.4 Gemini AI Code Agent";
      case "impact":
        return "P1.5 Change Impact Analysis";
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-[#f8fafc]">
      {/* LEFT SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        repositories={repositories}
        activeRepoId={activeRepoId}
        onSelectRepo={setActiveRepoId}
        health={health}
      />

      {/* MAIN WORKSTATION AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#090d16] relative">
        {/* Top Control / Breadcrumb Bar */}
        <header className="h-12 px-6 bg-[#131b2e] border-b border-[#25334d] flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-[#94a3b8]">RepoLens</span>
            <span className="text-[#475569]">/</span>
            <span className="text-[#f8fafc] font-semibold">{getTabTitle(activeTab)}</span>

            {activeRepo && (
              <>
                <span className="text-[#475569]">/</span>
                <span className="bg-[#1a243b] text-[#0891b2] px-2 py-0.5 rounded border border-[#25334d] text-[11px] font-semibold">
                  {activeRepo.fullName}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            {activeRepo && activeTab !== "repos" && (
              <button
                onClick={() => setActiveTab("repos")}
                className="text-[#94a3b8] hover:text-[#f8fafc] flex items-center gap-1 transition-colors"
                title="Manage or switch repositories"
              >
                <span>Switch Repo</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Feature Workstation */}
        <main className="flex-1 w-full h-[calc(100vh-48px)] overflow-hidden relative">
          {activeTab === "repos" && (
            <div className="h-full overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto">
              {/* Repository Ingestion Hero Form */}
              <RepositoryIngestionForm
                onIngestionStarted={handleIngestionStarted}
                isLoading={isIngesting}
              />

              {/* Active Job Progress */}
              {activeJobId && (
                <JobProgressCard
                  jobId={activeJobId}
                  onJobCompleted={handleJobCompleted}
                />
              )}

              {/* Discovered Files Table */}
              {activeRepoId && (
                <FileListTable repositoryId={activeRepoId} />
              )}

              {/* Architecture Capabilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => setActiveTab("graph")}
                  className="rounded border border-[#25334d] bg-[#131b2e] p-5 hover:border-[#4f46e5] cursor-pointer transition-colors"
                >
                  <div className="h-9 w-9 rounded bg-[#1a243b] text-[#818cf8] border border-[#25334d] flex items-center justify-center mb-3">
                    <Network className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#f8fafc] font-mono">P1.1 Code Graph</h3>
                  <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed">
                    Interactive node-link graph visualizing files, functions, classes, and calls with bounded neighborhood depth.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab("search")}
                  className="rounded border border-[#25334d] bg-[#131b2e] p-5 hover:border-[#4f46e5] cursor-pointer transition-colors"
                >
                  <div className="h-9 w-9 rounded bg-[#1a243b] text-[#22d3ee] border border-[#25334d] flex items-center justify-center mb-3">
                    <Search className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#f8fafc] font-mono">P1.2 Semantic Search</h3>
                  <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed">
                    Reciprocal Rank Fusion uniting vector embeddings with exact lexical matching for deep implementation retrieval.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab("trace")}
                  className="rounded border border-[#25334d] bg-[#131b2e] p-5 hover:border-[#4f46e5] cursor-pointer transition-colors"
                >
                  <div className="h-9 w-9 rounded bg-[#1a243b] text-[#34d399] border border-[#25334d] flex items-center justify-center mb-3">
                    <Workflow className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#f8fafc] font-mono">P1.3 Flow Tracing</h3>
                  <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed">
                    Statically traces HTTP route handlers across middlewares, controllers, services, and database queries.
                  </p>
                </div>
              </div>

              {/* Pipeline Telemetry Card */}
              <div className="rounded border border-[#25334d] bg-[#0f1523] p-4 text-xs font-mono">
                <div className="flex items-center space-x-2 text-[#94a3b8] font-semibold mb-3">
                  <Terminal className="h-4 w-4 text-[#4f46e5]" />
                  <span>RepoLens Multi-Stage Analysis Pipeline</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#131b2e] p-2.5 rounded border border-[#25334d]">
                    <span className="text-[#475569] block text-[10px]">PARSER</span>
                    <span className="text-[#818cf8] font-semibold">Tree-sitter AST</span>
                  </div>
                  <div className="bg-[#131b2e] p-2.5 rounded border border-[#25334d]">
                    <span className="text-[#475569] block text-[10px]">INGESTION</span>
                    <span className="text-[#34d399] font-semibold">GitHub Trees API</span>
                  </div>
                  <div className="bg-[#131b2e] p-2.5 rounded border border-[#25334d]">
                    <span className="text-[#475569] block text-[10px]">EMBEDDINGS</span>
                    <span className="text-[#22d3ee] font-semibold">Gemini 768-dim</span>
                  </div>
                  <div className="bg-[#131b2e] p-2.5 rounded border border-[#25334d]">
                    <span className="text-[#475569] block text-[10px]">INDEXING</span>
                    <span className="text-[#c084fc] font-semibold">Blob Differencing</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "graph" && (
            activeRepoId ? (
              <ArchitecturePage repositoryId={activeRepoId} />
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} feature="Code Relationship Graph" />
            )
          )}

          {activeTab === "search" && (
            activeRepoId ? (
              <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
                <CodeSearchPage repositoryId={activeRepoId} />
              </div>
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} feature="Semantic Code Search" />
            )
          )}

          {activeTab === "trace" && (
            activeRepoId ? (
              <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
                <FlowTracingPage repositoryId={activeRepoId} />
              </div>
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} feature="Execution Flow Tracing" />
            )
          )}

          {activeTab === "impact" && (
            activeRepoId ? (
              <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
                <ImpactAnalysisPage repositoryId={activeRepoId} />
              </div>
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} feature="Change Impact Analysis" />
            )
          )}

          {activeTab === "agent" && (
            activeRepoId ? (
              <div className="h-full overflow-hidden p-6 max-w-6xl mx-auto flex flex-col">
                <AgentChatPage repositoryId={activeRepoId} />
              </div>
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} feature="Gemini AI Agent" />
            )
          )}
        </main>
      </div>
    </div>
  );
}

function NoRepoSelected({ onGoToRepos, feature }: { onGoToRepos: () => void; feature: string }) {
  return (
    <div className="h-full flex items-center justify-center p-6 text-center">
      <div className="max-w-md p-8 bg-[#131b2e] border border-[#25334d] rounded space-y-4">
        <FolderGit2 className="h-10 w-10 text-[#4f46e5] mx-auto" />
        <h3 className="text-base font-bold text-[#f8fafc] font-mono">No Repository Active</h3>
        <p className="text-xs text-[#94a3b8] leading-relaxed">
          Please select or ingest a repository to use <span className="text-[#f8fafc] font-semibold">{feature}</span>.
        </p>
        <button
          onClick={onGoToRepos}
          className="px-4 py-2 rounded bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold font-mono transition-colors"
        >
          Go to Repositories
        </button>
      </div>
    </div>
  );
}
