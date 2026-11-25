import { useState, useEffect, useCallback } from "react";
import {
  Workflow,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileCode,
  ChevronRight,
  Search,
} from "lucide-react";
import { TraceStepCard } from "./TraceStepCard";
import { SourceViewerModal } from "../repositories/SourceViewerModal";
import type { RouteRecord, TraceStep } from "@repolens/shared";

interface FlowTracingPageProps {
  repositoryId: string;
}

export function FlowTracingPage({ repositoryId }: FlowTracingPageProps) {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [tracing, setTracing] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileForModal, setSelectedFileForModal] = useState<string | null>(null);
  const [routeSearch, setRouteSearch] = useState("");

  const fetchRoutes = useCallback(async () => {
    setLoadingRoutes(true);
    setError(null);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/routes`);
      const data = await res.json();
      if (res.ok && data.success) {
        const routeList: RouteRecord[] = data.data || [];
        setRoutes(routeList);
        if (routeList.length > 0 && !selectedRoute) {
          setSelectedRoute(routeList[0]);
        }
      } else {
        setError(data.error?.message || "Failed to load routes");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoadingRoutes(false);
    }
  }, [repositoryId, selectedRoute]);

  const runTrace = useCallback(
    async (route: RouteRecord) => {
      setTracing(true);
      setError(null);
      try {
        const res = await fetch(`/api/repositories/${repositoryId}/trace`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: route.method,
            path: route.path,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSteps(data.data?.steps || []);
        } else {
          setError(data.error?.message || "Failed to trace route");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Trace error");
      } finally {
        setTracing(false);
      }
    },
    [repositoryId]
  );

  useEffect(() => {
    fetchRoutes();
  }, [repositoryId]);

  useEffect(() => {
    if (selectedRoute) {
      runTrace(selectedRoute);
    }
  }, [selectedRoute, runTrace]);

  const handleIndexRoutes = async () => {
    setIndexing(true);
    setError(null);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/routes/index`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchRoutes();
      } else {
        const data = await res.json();
        setError(data.error?.message || "Failed to index routes");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Indexing error");
    } finally {
      setIndexing(false);
    }
  };

  const filteredRoutes = routes.filter(
    (r) =>
      r.path.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.method.toLowerCase().includes(routeSearch.toLowerCase())
  );

  const getMethodBadge = (method: string) => {
    const upper = method.toUpperCase();
    switch (upper) {
      case "GET":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">GET</span>;
      case "POST":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono">POST</span>;
      case "PUT":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">PUT</span>;
      case "DELETE":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono">DEL</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-subtle-light dark:bg-subtle-dark text-[#6B7280] dark:text-[#94A3B8] font-mono">{upper}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <h1 className="text-lg font-bold font-display">Flow Tracing</h1>
          <span className="text-xs font-mono text-[#6B7280] dark:text-[#94A3B8]">
            {routes.length} routes
          </span>
        </div>

        <button
          onClick={handleIndexRoutes}
          disabled={indexing}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark hover:bg-subtle-light dark:hover:bg-[#1A272E] text-xs font-medium transition-colors disabled:opacity-50"
        >
          {indexing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8]" />
          )}
          <span>{indexing ? "Scanning..." : "Re-Index"}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Routes List */}
        <div className="lg:col-span-4 rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-4 space-y-3 h-fit">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              placeholder="Filter routes..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-xs font-mono focus:outline-none focus:border-[#111827] dark:focus:border-[#F59E0B]"
            />
          </div>

          {loadingRoutes ? (
            <div className="py-10 flex justify-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="py-10 text-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
              No routes found
            </div>
          ) : (
            <div className="space-y-1 max-h-[540px] overflow-y-auto">
              {filteredRoutes.map((r) => {
                const isSelected =
                  selectedRoute?.method === r.method && selectedRoute?.path === r.path;
                return (
                  <button
                    key={`${r.method}-${r.path}`}
                    onClick={() => setSelectedRoute(r)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-center justify-between text-xs ${
                      isSelected
                        ? "bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114]"
                        : "hover:bg-subtle-light dark:hover:bg-[#162329]"
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {getMethodBadge(r.method)}
                      <span className="font-mono truncate">{r.path}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Execution Timeline */}
        <div className="lg:col-span-8 rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-6">
          {selectedRoute ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-hairline-light dark:border-hairline-dark">
                <div className="flex items-center space-x-2.5">
                  {getMethodBadge(selectedRoute.method)}
                  <span className="text-sm font-mono font-bold">{selectedRoute.path}</span>
                </div>

                <button
                  onClick={() => setSelectedFileForModal(selectedRoute.filePath)}
                  className="flex items-center space-x-1 text-xs font-mono text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] transition-colors"
                >
                  <FileCode className="h-3.5 w-3.5" />
                  <span>
                    {selectedRoute.filePath}:{selectedRoute.startLine}
                  </span>
                </button>
              </div>

              {tracing ? (
                <div className="py-20 flex justify-center text-[#6B7280] dark:text-[#94A3B8]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : steps.length === 0 ? (
                <div className="py-16 text-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
                  No static steps resolved
                </div>
              ) : (
                <div>
                  {steps.map((step, idx) => (
                    <TraceStepCard
                      key={`${step.symbolId}-${idx}`}
                      step={step}
                      index={idx}
                      isLast={idx === steps.length - 1}
                      onSelectFile={(path) => setSelectedFileForModal(path)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
              <Workflow className="h-7 w-7 mx-auto mb-2 opacity-40" />
              <span>Select a route to inspect its trace</span>
            </div>
          )}
        </div>
      </div>

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
