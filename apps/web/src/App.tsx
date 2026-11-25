import { useState, useEffect, useCallback } from "react";
import { 
  FolderGit2,
  ExternalLink
} from "lucide-react";
import { Sidebar, ActiveTab, RepositorySummary } from "./components/Sidebar";
import { DashboardOverview } from "./features/dashboard/DashboardOverview";
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("repos");
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState<string | undefined>();
  const [health, setHealth] = useState<HealthStatus>({
    api: "checking",
    db: "checking"
  });

  const handleSelectTab = (tab: ActiveTab, initialQuery?: string) => {
    if (initialQuery !== undefined) {
      setSearchInitialQuery(initialQuery);
    }
    setActiveTab(tab);
  };

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
        onSelectTab={handleSelectTab}
        repositories={repositories}
        activeRepoId={activeRepoId}
        onSelectRepo={setActiveRepoId}
        health={health}
      />

      {/* MAIN WORKSTATION AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#090d16] relative">
        {/* Top Control / Breadcrumb Bar */}
        <header className="h-12 px-6 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-400 font-medium">RepoLens</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-100 font-bold">{getTabTitle(activeTab)}</span>

            {activeRepo && (
              <>
                <span className="text-slate-600">/</span>
                <span className="bg-[#1e293b] text-slate-200 px-2 py-0.5 rounded border border-[#334155] text-[11px] font-semibold">
                  {activeRepo.fullName}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            {activeRepo && activeTab !== "repos" && (
              <button
                onClick={() => setActiveTab("repos")}
                className="text-slate-400 hover:text-slate-100 flex items-center gap-1.5 transition-colors font-medium"
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
            <DashboardOverview
              repositories={repositories}
              activeRepo={activeRepo}
              activeRepoId={activeRepoId}
              onSelectRepo={setActiveRepoId}
              onSelectTab={handleSelectTab}
              activeJobId={activeJobId}
              isIngesting={isIngesting}
              onIngestionStarted={handleIngestionStarted}
              onJobCompleted={handleJobCompleted}
            />
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
                <CodeSearchPage repositoryId={activeRepoId} initialQuery={searchInitialQuery} />
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
      <div className="max-w-md p-8 bg-[#0f172a] border border-[#1e293b] rounded-lg shadow-sm space-y-4">
        <FolderGit2 className="h-10 w-10 text-indigo-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-100 font-mono">No Repository Active</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          Please select or ingest a repository to use <span className="text-slate-200 font-semibold">{feature}</span>.
        </p>
        <button
          onClick={onGoToRepos}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold font-mono transition-colors shadow-sm"
        >
          Go to Repositories
        </button>
      </div>
    </div>
  );
}
