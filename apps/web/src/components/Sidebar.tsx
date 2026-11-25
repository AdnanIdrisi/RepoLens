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

  const navGroups: {
    title: string;
    items: {
      id: ActiveTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge: string | null;
    }[];
  }[] = [
    {
      title: "Workspace",
      items: [
        {
          id: "repos",
          label: "Dashboard",
          icon: FolderGit2,
          badge: null
        }
      ]
    },
    {
      title: "Code Intelligence",
      items: [
        {
          id: "graph",
          label: "Code Graph",
          icon: Network,
          badge: "P1.1"
        },
        {
          id: "search",
          label: "Code Search",
          icon: Search,
          badge: "P1.2"
        },
        {
          id: "trace",
          label: "Flow Tracing",
          icon: Workflow,
          badge: "P1.3"
        }
      ]
    },
    {
      title: "AI & Analysis",
      items: [
        {
          id: "agent",
          label: "AI Agent",
          icon: Bot,
          badge: "P1.4"
        },
        {
          id: "impact",
          label: "Impact Analysis",
          icon: ShieldAlert,
          badge: "P1.5"
        }
      ]
    }
  ];

  return (
    <aside className="w-72 h-screen bg-[#0f172a] border-r border-[#1e293b] flex flex-col justify-between shrink-0 select-none z-30">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0b0f19]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center text-white shadow-xs">
              <Network className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base tracking-tight text-slate-100">RepoLens</span>
              <span className="text-[11px] font-mono text-slate-400 -mt-0.5">Code Intelligence</span>
            </div>
          </div>
          <span className="bg-[#1e293b] border border-[#334155] px-2 py-0.5 rounded text-xs font-mono font-medium text-slate-300 shadow-2xs">
            v0.1.0
          </span>
        </div>

        {/* Active Repository Selector Card */}
        <div className="p-3.5 border-b border-[#1e293b] bg-[#0b0f19]">
          <div className="text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center justify-between font-semibold">
            <span>ACTIVE REPOSITORY</span>
            {repositories.length > 1 && (
              <span className="text-[10px] text-slate-300 font-semibold bg-[#1e293b] border border-[#334155] px-1.5 py-0.2 rounded">
                {repositories.length} repos
              </span>
            )}
          </div>

          {repositories.length > 0 ? (
            <div className="relative">
              <select
                value={activeRepoId || activeRepo?.id || ""}
                onChange={(e) => onSelectRepo(e.target.value)}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-md p-2.5 text-xs font-mono text-slate-200 appearance-none cursor-pointer focus:outline-none focus:border-indigo-500 transition-colors pr-8 truncate shadow-2xs"
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id} className="bg-[#111827] text-slate-200">
                    {repo.fullName}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />

              {/* Repo Branch & Commit Pill */}
              {activeRepo && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1e293b] text-xs font-mono text-slate-400">
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold truncate max-w-[130px]">
                    <GitBranch className="h-3.5 w-3.5" />
                    {activeRepo.defaultBranch || "main"}
                  </span>
                  <span className="text-slate-300 bg-[#1e293b] px-2 py-0.5 rounded border border-[#334155] text-[11px] shadow-2xs">
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
              className="w-full text-left p-2.5 rounded-md bg-[#111827] border border-dashed border-[#334155] text-xs font-mono text-slate-400 hover:text-slate-200 hover:border-indigo-500 transition-colors flex items-center justify-between"
            >
              <span>+ Connect a repository</span>
            </button>
          )}
        </div>

        {/* Vertical Navigation Tabs */}
        <nav className="p-2.5 space-y-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
                {group.title}
              </div>

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-mono font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-600 text-white font-semibold shadow-xs"
                        : "text-slate-400 hover:bg-[#1e293b] hover:text-slate-100 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          isActive
                            ? "bg-indigo-700 text-indigo-100 font-semibold"
                            : "bg-[#1e293b] text-slate-400 border border-[#334155]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="p-3.5 border-t border-[#1e293b] bg-[#0b0f19] space-y-2">
        <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
          System Telemetry
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {/* API Status */}
          <div className="flex items-center justify-between text-slate-300 bg-[#111827] px-2.5 py-1.5 rounded-md border border-[#1e293b] shadow-2xs">
            <span className="flex items-center gap-2">
              {health.api === "online" ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ) : health.api === "checking" ? (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              )}
              <span className="text-xs">API Gateway</span>
            </span>
            <span className={health.api === "online" ? "text-emerald-400 font-medium" : "text-amber-400"}>
              {health.api === "online" ? "Ready" : health.api}
            </span>
          </div>

          {/* DB Status */}
          <div className="flex items-center justify-between text-slate-300 bg-[#111827] px-2.5 py-1.5 rounded-md border border-[#1e293b] shadow-2xs">
            <span className="flex items-center gap-2">
              {health.db === "connected" ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              )}
              <span className="text-xs">Database</span>
            </span>
            <span className={health.db === "connected" ? "text-emerald-400 font-medium" : "text-amber-400"}>
              {health.db === "connected" ? "Connected" : "Standby"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
