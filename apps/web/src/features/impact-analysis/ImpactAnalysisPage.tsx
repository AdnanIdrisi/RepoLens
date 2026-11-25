import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ArrowRight,
  FileCode,
  CheckCircle2,
  Loader2,
  AlertCircle,
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
        const rawList: CodeFile[] = data.data?.items || data.data?.files || [];
        const fileList = rawList.filter(
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
          maxDepth,
        }),
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
    <div className="space-y-5">
      {/* Compact Header & Controls */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold font-display">Impact Analysis</h1>
      </div>

      <div className="p-5 rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          {loadingFiles ? (
            <div className="h-9 bg-subtle-light dark:bg-subtle-dark rounded-lg border border-hairline-light dark:border-hairline-dark flex items-center px-3 text-xs text-[#6B7280] dark:text-[#94A3B8]">
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              Loading files...
            </div>
          ) : (
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-xs font-mono focus:outline-none focus:border-[#111827] dark:focus:border-[#F59E0B]"
            >
              {files.map((f) => (
                <option key={f.path} value={f.path}>
                  {f.path}
                </option>
              ))}
            </select>
          )}
        </div>

        <select
          value={maxDepth}
          onChange={(e) => setMaxDepth(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark text-xs font-mono focus:outline-none focus:border-[#111827] dark:focus:border-[#F59E0B]"
        >
          {[1, 2, 3, 4, 5, 6].map((d) => (
            <option key={d} value={d}>
              {d} {d === 1 ? "layer" : "layers"}
            </option>
          ))}
        </select>

        <button
          onClick={handleAnalyze}
          disabled={analyzing || !selectedFile}
          className="px-4 py-2 rounded-lg bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center space-x-1.5 disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          <span>{analyzing ? "Analyzing..." : "Analyze"}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className="space-y-5">
          {/* Joined 3-Stat Hairline Strip */}
          <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-hairline-light dark:bg-hairline-dark overflow-hidden grid grid-cols-3 gap-px">
            <div className="p-5 bg-surface-light dark:bg-surface-dark">
              <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] block">Direct</span>
              <span className="mt-1 text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 block">
                {report.directAffected.length}
              </span>
            </div>
            <div className="p-5 bg-surface-light dark:bg-surface-dark">
              <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] block">Indirect</span>
              <span className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 block">
                {report.indirectAffected.length}
              </span>
            </div>
            <div className="p-5 bg-surface-light dark:bg-surface-dark">
              <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] block">Tests</span>
              <span className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 block">
                {report.suggestedTests.length}
              </span>
            </div>
          </div>

          {/* Direct Affected */}
          <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-5 space-y-3">
            <h3 className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8]">
              Direct Dependencies
            </h3>
            {report.directAffected.length === 0 ? (
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] py-2">None</p>
            ) : (
              <div className="divide-y divide-hairline-light dark:divide-hairline-dark">
                {report.directAffected.map((a) => (
                  <div key={a.id} className="py-2 flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => setSelectedFileForModal(a.filePath)}
                      className="flex items-center space-x-2 hover:underline text-left"
                    >
                      <FileCode className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8]" />
                      <span>{a.filePath}</span>
                    </button>
                    <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                      {a.relationship || "imports"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Indirect Affected */}
          {report.indirectAffected.length > 0 && (
            <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8]">
                Indirect Ripple
              </h3>
              <div className="divide-y divide-hairline-light dark:divide-hairline-dark">
                {report.indirectAffected.map((a) => (
                  <div key={a.id} className="py-2.5 space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedFileForModal(a.filePath)}
                        className="hover:underline text-left"
                      >
                        {a.filePath}
                      </button>
                      <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                        L{a.distance}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-[11px] text-[#6B7280] dark:text-[#94A3B8] overflow-x-auto">
                      {a.dependencyPath.map((step, idx) => (
                        <span key={idx} className="flex items-center space-x-1">
                          {idx > 0 && <ArrowRight className="h-2.5 w-2.5" />}
                          <span>{step.split("/").pop()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Tests */}
          {report.suggestedTests.length > 0 && (
            <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8]">
                Suggested Tests
              </h3>
              <div className="divide-y divide-hairline-light dark:divide-hairline-dark">
                {report.suggestedTests.map((t, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => setSelectedFileForModal(t.testFilePath)}
                      className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{t.testFilePath}</span>
                    </button>
                    <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-sans">
                      {t.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
