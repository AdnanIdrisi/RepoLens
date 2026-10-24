import { useState, useEffect } from "react";
import { 
  GitFork, 
  Network, 
  Search, 
  Workflow, 
  Bot, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  FolderGit2,
  Terminal,
  Activity
} from "lucide-react";
import { RepositoryIngestionForm } from "./features/repositories/RepositoryIngestionForm";
import { JobProgressCard } from "./features/repositories/JobProgressCard";
import { FileListTable } from "./features/repositories/FileListTable";
import { ArchitecturePage } from "./features/architecture/ArchitecturePage";

type ActiveTab = "repos" | "graph" | "search" | "trace" | "agent" | "impact";

interface HealthStatus {
  api: "checking" | "online" | "offline";
  db: "checking" | "connected" | "disconnected";
  uptime?: number;
}

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("repos");
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [health, setHealth] = useState<HealthStatus>({
    api: "checking",
    db: "checking"
  });

  useEffect(() => {
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
  }, []);

  const handleIngestionStarted = (repositoryId: string, jobId: string) => {
    setActiveRepoId(repositoryId);
    setActiveJobId(jobId);
    setIsIngesting(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <FolderGit2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                RepoLens
              </span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v0.1.0-alpha
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab("repos")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === "repos"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <GitFork className="h-4 w-4" />
              <span>Repositories</span>
            </button>
            <button
              onClick={() => setActiveTab("graph")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === "graph"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Network className="h-4 w-4" />
              <span>Graph (P1.1)</span>
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === "search"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Search (P1.2)</span>
            </button>
            <button
              onClick={() => setActiveTab("trace")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === "trace"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Workflow className="h-4 w-4" />
              <span>Tracing (P1.3)</span>
            </button>
            <button
              onClick={() => setActiveTab("agent")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === "agent"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>Agent (P1.4)</span>
            </button>
            <button
              onClick={() => setActiveTab("impact")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === "impact"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Impact (P1.5)</span>
            </button>
          </nav>

          {/* Status indicators */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
              <span className="text-slate-400">API:</span>
              {health.api === "online" ? (
                <span className="text-emerald-400 flex items-center font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Ready
                </span>
              ) : health.api === "checking" ? (
                <span className="text-amber-400 flex items-center font-medium">
                  <Activity className="h-3.5 w-3.5 mr-1 animate-spin" /> Checking
                </span>
              ) : (
                <span className="text-rose-400 flex items-center font-medium">
                  <AlertCircle className="h-3.5 w-3.5 mr-1" /> Offline
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
              <span className="text-slate-400">DB:</span>
              {health.db === "connected" ? (
                <span className="text-emerald-400 flex items-center font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Connected
                </span>
              ) : (
                <span className="text-amber-400 flex items-center font-medium">
                  <AlertCircle className="h-3.5 w-3.5 mr-1" /> Standby
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "repos" && (
          <div className="space-y-8">
            {/* Repository Ingestion Hero Form */}
            <RepositoryIngestionForm
              onIngestionStarted={handleIngestionStarted}
              isLoading={isIngesting}
            />

            {/* Active Job Progress */}
            {activeJobId && (
              <JobProgressCard
                jobId={activeJobId}
                onJobCompleted={() => {
                  setIsIngesting(false);
                }}
              />
            )}

            {/* Discovered Files Table */}
            {activeRepoId && (
              <FileListTable repositoryId={activeRepoId} />
            )}

            {/* Architecture Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <Network className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">P1.1 Code Relationship Graph</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Interactive node-link graph visualizing files, functions, classes, imports, and calls with source-anchored navigation.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                  <Search className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">P1.2 Semantic & Hybrid Search</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Vector similarity combined with lexical ranking to locate implementations, identifier occurrences, and route definitions.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <Workflow className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">P1.3 Static Flow Tracing</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Statically traces Express routes through middlewares, controllers, service functions, and data-access layers.
                </p>
              </div>
            </div>

            {/* System Status / Foundation Info */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-6">
              <div className="flex items-center space-x-2 text-slate-400 text-sm font-semibold mb-3">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>RepoLens Code Intelligence Pipeline</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Workspace</span>
                  <span className="text-indigo-300 font-semibold">@repolens/monorepo</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Ingestion Pipeline</span>
                  <span className="text-emerald-400 font-semibold">GitHub Trees API</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">File Filtering</span>
                  <span className="text-cyan-400 font-semibold">Whitelist + Exclusions</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Commit Resolution</span>
                  <span className="text-purple-400 font-semibold">Deterministic SHA</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "graph" && (
          activeRepoId ? (
            <ArchitecturePage repositoryId={activeRepoId} />
          ) : (
            <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800/80">
              <Network className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-200">No Repository Selected</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
                Please ingest or select a GitHub repository from the Repositories tab first to explore its code relationship graph.
              </p>
              <button
                onClick={() => setActiveTab("repos")}
                className="mt-6 inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Go to Repositories
              </button>
            </div>
          )
        )}

        {activeTab !== "repos" && activeTab !== "graph" && (
          <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800/80">
            <h3 className="text-xl font-bold text-slate-200">Feature Module Under Construction</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
              This module will be connected as we implement the plan step by step according to the execution rules.
            </p>
            <button
              onClick={() => setActiveTab("repos")}
              className="mt-6 inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              Return to Ingestion Overview
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <p>RepoLens - AI Code Intelligence Platform &bull; Module 1 GitHub Ingestion Active</p>
      </footer>
    </div>
  );
}
