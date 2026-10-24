import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ArrowRight,
  FileCode,
  CheckCircle2,
  TestTube2,
  Loader2,
  AlertCircle,
  GitBranch
} from "lucide-react";
import { SourceViewerModal } from "../repositories/SourceViewerModal";
import type { ImpactReport, CodeFile } from "@repolens/shared";

interface ImpactAnalysisPageProps {
  repositoryId: string;
}

export function ImpactAnalysisPage({ repositoryId }: ImpactAnalysisPageProps) {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileForModal, setSelectedFileForModal] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/files?limit=200`);
      const data = await res.json();
      if (res.ok && data.success) {
        const fileList: CodeFile[] = (data.data?.files || []).filter(
          (f: CodeFile) => f.status === "discovered" || f.status === "fetched"
        );
        setFiles(fileList);
        if (fileList.length > 0 && !selectedFile) {
          setSelectedFile(fileList[0].path);
        }
      }
    } catch {
      // Ignore background file list error
    } finally {
      setLoadingFiles(false);
    }
  }, [repositoryId, selectedFile]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetFilePath: selectedFile,
          maxDepth
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReport(data.data);
      } else {
        setError(data.error?.message || "Failed to analyze impact");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impact network error");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Target Selector Form */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Change Impact Analysis (P1.5)</h2>
            <p className="text-xs text-slate-400">
              Estimate the blast radius of modifying a file or symbol by traversing the reverse dependency graph.
            </p>
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Select Target File to Modify:
            </label>
            {loadingFiles ? (
              <div className="h-10 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center px-3 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2 text-indigo-400" />
                Loading repository files...
              </div>
            ) : (
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              >
                {files.map((f) => (
                  <option key={f.path} value={f.path}>
                    {f.path}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="w-28">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Max Depth:
            </label>
            <select
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            >
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "layer" : "layers"}
                </option>
              ))}
            </select>
          </div>

          <div className="self-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !selectedFile}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/25 transition-all flex items-center space-x-1.5 disabled:opacity-50 h-10"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              <span>{analyzing ? "Analyzing Blast Radius..." : "Analyze Impact"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Results Display */}
      {report && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <span className="text-xs font-medium text-rose-400 uppercase tracking-wider block mb-1">
                Direct Dependencies
              </span>
              <span className="text-2xl font-bold font-mono text-white">
                {report.directAffected.length}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Modules directly importing or calling target
              </span>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wider block mb-1">
                Indirect Ripple Effects
              </span>
              <span className="text-2xl font-bold font-mono text-white">
                {report.indirectAffected.length}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Transitive callers and downstream consumers
              </span>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider block mb-1">
                Suggested Test Suites
              </span>
              <span className="text-2xl font-bold font-mono text-white">
                {report.suggestedTests.length}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Test files with direct/indirect blast exposure
              </span>
            </div>
          </div>

          {/* Direct Affected Group */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center space-x-2 text-rose-300 font-semibold text-xs uppercase tracking-wider">
              <AlertCircle className="h-4 w-4 text-rose-400" />
              <span>Directly Affected Files (Layer 1 - Distance 1)</span>
            </div>

            {report.directAffected.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No direct reverse dependencies detected in indexed codebase.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {report.directAffected.map((a) => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <FileCode className="h-4 w-4 text-slate-400" />
                      <button
                        onClick={() => setSelectedFileForModal(a.filePath)}
                        className="font-mono text-slate-200 hover:text-indigo-400 transition-colors font-medium hover:underline"
                      >
                        {a.filePath}
                      </button>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700/50">
                        {a.kind}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {a.relationship || "imports"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Indirect Affected Group */}
          {report.indirectAffected.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center space-x-2 text-amber-300 font-semibold text-xs uppercase tracking-wider">
                <GitBranch className="h-4 w-4 text-amber-400" />
                <span>Indirectly Affected Downstream Modules (Layers 2+)</span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {report.indirectAffected.map((a) => (
                  <div key={a.id} className="py-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <FileCode className="h-4 w-4 text-slate-400" />
                        <button
                          onClick={() => setSelectedFileForModal(a.filePath)}
                          className="font-mono text-slate-200 hover:text-indigo-400 transition-colors font-medium hover:underline"
                        >
                          {a.filePath}
                        </button>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        Distance: {a.distance}
                      </span>
                    </div>

                    {/* Dependency Path Explanation */}
                    <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-500 pl-6 overflow-x-auto">
                      <span>Path:</span>
                      {a.dependencyPath.map((step, idx) => (
                        <span key={idx} className="flex items-center space-x-1">
                          {idx > 0 && <ArrowRight className="h-3 w-3 text-slate-600" />}
                          <span className={idx === a.dependencyPath.length - 1 ? "text-amber-300 font-semibold" : "text-slate-400"}>
                            {step.split("/").pop()}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Tests Section */}
          {report.suggestedTests.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-xs uppercase tracking-wider">
                <TestTube2 className="h-4 w-4 text-emerald-400" />
                <span>Suggested Test Suites to Run</span>
              </div>

              <div className="space-y-2">
                {report.suggestedTests.map((t, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <button
                        onClick={() => setSelectedFileForModal(t.testFilePath)}
                        className="font-mono text-slate-200 hover:text-emerald-400 transition-colors font-semibold hover:underline"
                      >
                        {t.testFilePath}
                      </button>
                    </div>
                    <span className="text-slate-400 text-[11px] italic">
                      {t.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
