import { useState, useEffect, useCallback } from "react";
import { FolderGit2, ChevronDown, Sun, Moon } from "lucide-react";
import { Sidebar, ActiveTab, RepositorySummary, NAV_ITEMS } from "./components/Sidebar";
import { DashboardOverview } from "./features/dashboard/DashboardOverview";
import { ArchitecturePage } from "./features/architecture/ArchitecturePage";
import { CodeSearchPage } from "./features/code-search/CodeSearchPage";
import { FlowTracingPage } from "./features/flow-tracing/FlowTracingPage";
import { ImpactAnalysisPage } from "./features/impact-analysis/ImpactAnalysisPage";
import { AgentChatPage } from "./features/agent/AgentChatPage";
import { useTheme } from "./hooks/useTheme";

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
    db: "checking",
  });
  const { theme, toggleTheme } = useTheme();

  const handleSelectTab = (tab: ActiveTab, initialQuery?: string) => {
    if (initialQuery !== undefined) {
      setSearchInitialQuery(initialQuery);
    }
    setActiveTab(tab);
  };

  const fetchRepositories = useCallback(async () => {
    try {
      const res = await fetch("/api/repositories");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const repos: RepositorySummary[] = json.data.map(
            (r: {
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
              activeIndexVersion: r.activeIndexVersion,
            })
          );
          setRepositories(repos);

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

  useEffect(() => {
    fetchRepositories();

    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setHealth((prev) => ({
            ...prev,
            api: "online",
            uptime: data.data?.uptimeSeconds,
          }));
        } else {
          setHealth((prev) => ({ ...prev, api: "offline" }));
        }
      } catch {
        setHealth((prev) => ({ ...prev, api: "offline" }));
      }

      try {
        const readyRes = await fetch("/api/ready");
        const readyData = await readyRes.json();
        setHealth((prev) => ({
          ...prev,
          db: readyData.data?.checks?.database === "connected" ? "connected" : "disconnected",
        }));
      } catch {
        setHealth((prev) => ({ ...prev, db: "disconnected" }));
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas-light dark:bg-canvas-dark text-[#111827] dark:text-[#F1F5F9] transition-colors duration-150">
      {/* Slim Left Icon Rail */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        health={health}
      />

      {/* Main Workstation */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Clean Minimal Top Bar */}
        <header className="h-14 px-6 bg-surface-light dark:bg-surface-dark border-b border-hairline-light dark:border-hairline-dark flex items-center justify-between gap-4 shrink-0 z-20 transition-colors duration-150">
          {/* Left: Repo Selector */}
          <div className="flex items-center space-x-3 min-w-0">
            <span className="font-display font-bold text-sm tracking-tight hidden sm:inline">
              RepoLens
            </span>

            {repositories.length > 0 && (
              <div className="relative flex items-center">
                <select
                  value={activeRepoId || activeRepo?.id || ""}
                  onChange={(e) => setActiveRepoId(e.target.value)}
                  className="appearance-none bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark rounded-lg pl-3 pr-8 py-1.5 text-xs font-mono text-[#111827] dark:text-[#F1F5F9] cursor-pointer focus:outline-none focus:border-[#111827] dark:focus:border-[#F59E0B] transition-colors max-w-[240px] truncate"
                >
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Center: Minimal Underline Tabs */}
          <nav className="hidden md:flex items-center h-full space-x-6">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`h-full flex items-center text-xs font-medium border-b-2 transition-colors px-0.5 ${
                    isActive
                      ? "border-[#111827] dark:border-[#F59E0B] text-[#111827] dark:text-[#F1F5F9] font-semibold"
                      : "border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Theme Switcher Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-hairline-light dark:border-hairline-dark bg-subtle-light dark:bg-subtle-dark hover:bg-[#E5E7EB] dark:hover:bg-[#1A272E] text-xs font-medium text-[#111827] dark:text-[#F1F5F9] transition-colors"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-[#111827]" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
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

          {activeTab === "graph" &&
            (activeRepoId ? (
              <ArchitecturePage repositoryId={activeRepoId} />
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} />
            ))}

          {activeTab === "search" &&
            (activeRepoId ? (
              <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
                <CodeSearchPage repositoryId={activeRepoId} initialQuery={searchInitialQuery} />
              </div>
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} />
            ))}

          {activeTab === "trace" &&
            (activeRepoId ? (
              <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
                <FlowTracingPage repositoryId={activeRepoId} />
              </div>
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} />
            ))}

          {activeTab === "impact" &&
            (activeRepoId ? (
              <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
                <ImpactAnalysisPage repositoryId={activeRepoId} />
              </div>
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} />
            ))}

          {activeTab === "agent" &&
            (activeRepoId ? (
              <div className="h-full overflow-hidden p-6 max-w-5xl mx-auto flex flex-col">
                <AgentChatPage repositoryId={activeRepoId} />
              </div>
            ) : (
              <NoRepoSelected onGoToRepos={() => setActiveTab("repos")} />
            ))}
        </main>
      </div>
    </div>
  );
}

function NoRepoSelected({ onGoToRepos }: { onGoToRepos: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-6 text-center">
      <div className="max-w-sm p-8 bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark rounded-xl space-y-4">
        <FolderGit2 className="h-8 w-8 text-[#6B7280] dark:text-[#94A3B8] mx-auto" />
        <h3 className="text-sm font-semibold">No repository selected</h3>
        <button
          onClick={onGoToRepos}
          className="px-4 py-2 rounded-lg bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          Connect Repository
        </button>
      </div>
    </div>
  );
}
