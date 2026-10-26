import { useState, useEffect, useCallback } from "react";
import {
  Workflow,
  Layers,
  Loader2,
  AlertCircle,
  FileCode,
  Info,
  ChevronRight,
  GitBranch,
  Search
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
            maxDepth: 6
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setSteps(data.data.steps || []);
        } else {
          setError(data.error?.message || "Failed to trace execution flow");
          setSteps([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Trace network error");
        setSteps([]);
      } finally {
        setTracing(false);
      }
    },
    [repositoryId]
  );

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

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
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchRoutes();
      } else {
        setError(data.error?.message || "Failed to index routes");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Route indexing error");
    } finally {
      setIndexing(false);
    }
  };

  const filteredRoutes = routes.filter((r) =>
    r.path.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.method.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.filePath.toLowerCase().includes(routeSearch.toLowerCase())
  );

  const getMethodBadge = (method: string) => {
    const upper = method.toUpperCase();
    switch (upper) {
      case "GET":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#059669] text-white border border-[#059669] font-mono">GET</span>;
      case "POST":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#4f46e5] text-white border border-[#4f46e5] font-mono">POST</span>;
      case "PUT":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d97706] text-white border border-[#d97706] font-mono">PUT</span>;
      case "DELETE":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dc2626] text-white border border-[#dc2626] font-mono">DEL</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#25334d] text-slate-200 border border-[#25334d] font-mono">{upper}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Route Indexing Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#25334d] bg-[#131b2e]">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-[#1a243b] text-[#0891b2] border border-[#25334d] flex items-center justify-center">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Static Execution Flow Tracing (P1.3)</h2>
            <p className="text-xs text-slate-400">
              {routes.length > 0
                ? `${routes.length} Express routes discovered across codebase`
                : "No routes indexed yet. Click to discover and map route handler chains."}
            </p>
          </div>
        </div>

        <button
          onClick={handleIndexRoutes}
          disabled={indexing}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1a243b] hover:bg-[#25334d] text-slate-200 text-xs font-medium border border-[#25334d] transition-all disabled:opacity-50"
        >
          {indexing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0891b2]" />
          ) : (
            <Layers className="h-3.5 w-3.5 text-[#0891b2]" />
          )}
          <span>{indexing ? "Discovering Routes..." : "Discover / Re-Index Routes"}</span>
        </button>
      </div>

      {/* Disclaimer Alert */}
      <div className="p-3 rounded-xl border border-[#25334d] bg-[#131b2e] text-slate-300 text-xs flex items-center space-x-2.5">
        <Info className="h-4 w-4 text-[#0891b2] flex-shrink-0" />
        <span>
          <strong>Static Analysis Notice:</strong> Execution paths are inferred statically from AST declarations, middlewares, and call references. They represent static architectural flows rather than runtime telemetry.
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-[#dc2626] bg-[#131b2e] text-rose-300 text-sm flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#dc2626]" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Route List Sidebar + Trace Flow Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Discovered Routes List (4 columns) */}
        <div className="lg:col-span-4 rounded-xl border border-[#25334d] bg-[#131b2e] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Discovered Routes ({routes.length})
            </h3>
          </div>

          {/* Route Search Filter */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              placeholder="Filter routes..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#090d16] border border-[#25334d] text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-[#4f46e5]"
            />
          </div>

          {loadingRoutes ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Loader2 className="h-5 w-5 animate-spin text-[#4f46e5] mb-2" />
              <span>Scanning routes...</span>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <span>No Express routes found matching filter.</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredRoutes.map((r) => {
                const isSelected = selectedRoute?.method === r.method && selectedRoute?.path === r.path;
                return (
                  <button
                    key={`${r.method}-${r.path}`}
                    onClick={() => setSelectedRoute(r)}
                    className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between text-xs border ${
                      isSelected
                        ? "bg-[#1a243b] border-[#4f46e5] text-white shadow-sm"
                        : "bg-[#090d16] border-[#25334d] text-slate-300 hover:bg-[#1a243b] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {getMethodBadge(r.method)}
                      <span className="font-mono font-medium truncate">{r.path}</span>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${isSelected ? "text-[#0891b2] translate-x-0.5" : "text-slate-600"}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Ordered Execution Flow Timeline (8 columns) */}
        <div className="lg:col-span-8 rounded-xl border border-[#25334d] bg-[#131b2e] p-6">
          {selectedRoute ? (
            <div className="space-y-6">
              {/* Active Route Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#25334d]">
                <div className="flex items-center space-x-3">
                  {getMethodBadge(selectedRoute.method)}
                  <span className="text-base font-mono font-bold text-white tracking-tight">
                    {selectedRoute.path}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                  <button
                    onClick={() => setSelectedFileForModal(selectedRoute.filePath)}
                    className="flex items-center space-x-1 hover:text-indigo-400 transition-colors"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    <span>{selectedRoute.filePath}:{selectedRoute.startLine}</span>
                  </button>
                </div>
              </div>

              {/* Execution Steps Timeline */}
              {tracing ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-500 text-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
                  <span>Traversing static call hierarchy and dependency graph...</span>
                </div>
              ) : steps.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-xs">
                  <GitBranch className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  <span>No static call steps resolved for this route.</span>
                </div>
              ) : (
                <div className="space-y-0">
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
            <div className="py-32 text-center text-slate-500 text-sm">
              <Workflow className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <span>Select an Express route from the left to inspect its static execution trace.</span>
            </div>
          )}
        </div>
      </div>

      {/* Source Viewer Modal */}
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
