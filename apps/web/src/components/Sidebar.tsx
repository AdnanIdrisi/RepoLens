import React from "react";
import {
  FolderGit2,
  Network,
  Search,
  Workflow,
  Bot,
  ShieldAlert,
  GitBranch,
  ChevronDown
} from "lucide-react";

export type ActiveTab = "repos" | "graph" | "search" | "trace" | "agent" | "impact";

export interface RepositorySummary {
  id: string;
  fullName: string;
  defaultBranch?: string;
  status: string;
  commitSha?: string;
  activeIndexVersion?: string;
}

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  repositories: RepositorySummary[];
  activeRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  health: {
    api: "checking" | "online" | "offline";
    db: "checking" | "connected" | "disconnected";
    uptime?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  repositories,
  activeRepoId,
  onSelectRepo,
  health
}) => {
  const activeRepo = repositories.find((r) => r.id === activeRepoId) || repositories[0];

  const navItems = [
    {
      id: "repos" as ActiveTab,
      label: "Repositories",
      icon: FolderGit2,
      badge: null
    },
    {
      id: "graph" as ActiveTab,
      label: "Code Graph",
      icon: Network,
      badge: "P1.1"
    },
    {
      id: "search" as ActiveTab,
      label: "Code Search",
      icon: Search,
      badge: "P1.2"
    },
    {
      id: "trace" as ActiveTab,
      label: "Flow Tracing",
      icon: Workflow,
      badge: "P1.3"
    },
    {
      id: "agent" as ActiveTab,
      label: "AI Agent",
      icon: Bot,
      badge: "P1.4"
    },
    {
      id: "impact" as ActiveTab,
      label: "Impact Analysis",
      icon: ShieldAlert,
      badge: "P1.5"
    }
  ];

  return (
    <aside className="w-64 h-screen bg-[#131b2e] border-r border-[#25334d] flex flex-col justify-between shrink-0 select-none z-30">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-[#25334d] flex items-center justify-between bg-[#0f1523]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 bg-[#4f46e5] rounded flex items-center justify-center text-white shadow-none">
              <Network className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#f8fafc]">RepoLens</span>
              <span className="text-[10px] font-mono text-[#94a3b8] -mt-0.5">Code Intelligence</span>
            </div>
          </div>
          <span className="bg-[#1a243b] border border-[#25334d] px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-[#0891b2]">
            v0.1.0
          </span>
        </div>

        {/* Active Repository Selector Card */}
        <div className="p-3 border-b border-[#25334d] bg-[#090d16]">
          <div className="text-[10px] font-mono uppercase text-[#94a3b8] mb-1.5 flex items-center justify-between">
            <span>ACTIVE REPOSITORY</span>
            {repositories.length > 1 && (
              <span className="text-[9px] text-[#4f46e5] font-semibold">
                {repositories.length} repos
              </span>
            )}
          </div>

          {repositories.length > 0 ? (
            <div className="relative">
              <select
                value={activeRepoId || activeRepo?.id || ""}
                onChange={(e) => onSelectRepo(e.target.value)}
                className="w-full bg-[#131b2e] border border-[#25334d] rounded p-2 text-xs font-mono text-[#f8fafc] appearance-none cursor-pointer focus:outline-none focus:border-[#4f46e5] transition-colors pr-7 truncate"
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id} className="bg-[#131b2e] text-[#f8fafc]">
                    {repo.fullName}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-[#94a3b8] absolute right-2.5 top-2.5 pointer-events-none" />

              {/* Repo Branch & Commit Pill */}
              {activeRepo && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#25334d] text-[11px] font-mono text-[#94a3b8]">
                  <span className="text-[#059669] flex items-center gap-1 font-semibold truncate max-w-[120px]">
                    <GitBranch className="h-3 w-3" />
                    {activeRepo.defaultBranch || "main"}
                  </span>
                  <span className="text-[#94a3b8] bg-[#1a243b] px-1.5 py-0.5 rounded border border-[#25334d] text-[10px]">
                    {activeRepo.activeIndexVersion
                      ? activeRepo.activeIndexVersion.slice(0, 7)
                      : activeRepo.commitSha
                      ? activeRepo.commitSha.slice(0, 7)
                      : "ready"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onSelectTab("repos")}
              className="w-full text-left p-2 rounded bg-[#131b2e] border border-dashed border-[#25334d] text-xs font-mono text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#4f46e5] transition-colors flex items-center justify-between"
            >
              <span>+ Connect a repository</span>
            </button>
          )}
        </div>

        {/* Vertical Navigation Tabs */}
        <nav className="p-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase text-[#475569] tracking-wider">
            Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#4f46e5] text-white font-semibold shadow-none border border-[#4f46e5]"
                    : "text-[#94a3b8] hover:bg-[#1a243b] hover:text-[#f8fafc] border border-transparent"
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-[#94a3b8]"}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                      isActive
                        ? "bg-[#3730a3] text-white"
                        : "bg-[#1a243b] text-[#94a3b8] border border-[#25334d]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="p-3 border-t border-[#25334d] bg-[#0f1523] space-y-2">
        <div className="text-[10px] font-mono uppercase text-[#475569] font-semibold">
          System Telemetry
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {/* API Status */}
          <div className="flex items-center justify-between text-[#94a3b8] bg-[#090d16] px-2 py-1 rounded border border-[#25334d]">
            <span className="flex items-center gap-1.5">
              {health.api === "online" ? (
                <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
              ) : health.api === "checking" ? (
                <span className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span>
              )}
              <span>API Gateway</span>
            </span>
            <span className={health.api === "online" ? "text-[#059669]" : "text-[#d97706]"}>
              {health.api === "online" ? "Ready" : health.api}
            </span>
          </div>

          {/* DB Status */}
          <div className="flex items-center justify-between text-[#94a3b8] bg-[#090d16] px-2 py-1 rounded border border-[#25334d]">
            <span className="flex items-center gap-1.5">
              {health.db === "connected" ? (
                <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#d97706]"></span>
              )}
              <span>Database</span>
            </span>
            <span className={health.db === "connected" ? "text-[#059669]" : "text-[#d97706]"}>
              {health.db === "connected" ? "Connected" : "Standby"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
