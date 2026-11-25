import React from "react";
import {
  Home,
  Network,
  Search,
  Workflow,
  Bot,
  ShieldAlert,
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
  health: {
    api: "checking" | "online" | "offline";
    db: "checking" | "connected" | "disconnected";
    uptime?: number;
  };
}

export const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "repos", label: "Overview", icon: Home },
  { id: "graph", label: "Graph", icon: Network },
  { id: "search", label: "Search", icon: Search },
  { id: "trace", label: "Trace", icon: Workflow },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "impact", label: "Impact", icon: ShieldAlert },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  health,
}) => {
  const isHealthy = health.api === "online" && health.db === "connected";
  const isChecking = health.api === "checking" || health.db === "checking";

  return (
    <aside className="w-14 h-screen bg-surface-light dark:bg-surface-dark border-r border-hairline-light dark:border-hairline-dark flex flex-col items-center justify-between py-3 shrink-0 select-none z-30 transition-colors duration-150">
      <div className="flex flex-col items-center space-y-5 w-full">
        {/* Minimal Brand Mark */}
        <button
          onClick={() => onSelectTab("repos")}
          title="RepoLens"
          className="w-9 h-9 rounded-lg bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
        >
          <Network className="h-4 w-4" />
        </button>

        {/* Icon Rail */}
        <nav className="flex flex-col items-center space-y-1.5 w-full px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isActive
                    ? "bg-[#111827] text-white dark:bg-[#F1F5F9] dark:text-[#0A1114]"
                    : "text-[#6B7280] dark:text-[#94A3B8] hover:bg-subtle-light dark:hover:bg-[#1A272E] hover:text-[#111827] dark:hover:text-[#F1F5F9]"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Minimal System Health Dot */}
      <div
        className="flex flex-col items-center pb-1"
        title={`API: ${health.api} · DB: ${health.db}`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isHealthy
              ? "bg-emerald-500"
              : isChecking
              ? "bg-amber-400 animate-pulse"
              : "bg-rose-500"
          }`}
        />
      </div>
    </aside>
  );
};
