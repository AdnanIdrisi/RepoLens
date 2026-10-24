import { useState, useEffect } from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle, FileCode2, GitCommit, RefreshCw } from "lucide-react";
import type { IndexingJob } from "@repolens/shared";

interface JobProgressCardProps {
  jobId: string;
  onJobCompleted?: (job: IndexingJob) => void;
  onRetry?: () => void;
}

const STAGES = [
  { key: "validate_repository", label: "Validate Repo" },
  { key: "resolve_commit", label: "Resolve Commit" },
  { key: "discover_tree", label: "Discover Tree" },
  { key: "filter_files", label: "Filter Files" },
  { key: "discovered", label: "Discovered" }
];

export function JobProgressCard({ jobId, onJobCompleted, onRetry }: JobProgressCardProps) {
  const [job, setJob] = useState<IndexingJob | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    async function pollJob() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setJob(data.data);
            if (data.data.status === "completed" || data.data.status === "failed" || data.data.status === "cancelled") {
              setPolling(false);
              if (data.data.status === "completed" && onJobCompleted) {
                onJobCompleted(data.data);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to poll job:", err);
      }
    }

    if (polling) {
      pollJob();
      timer = setInterval(pollJob, 2000);
    }

    return () => clearInterval(timer);
  }, [jobId, polling, onJobCompleted]);

  if (!job) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400 animate-pulse">
        Initializing ingestion job...
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex((s) => s.key === job.stage);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Ingestion Pipeline Status
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-base font-bold text-white capitalize">{job.stage.replace(/_/g, " ")}</span>
            {job.commitSha && (
              <span className="inline-flex items-center text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                <GitCommit className="h-3 w-3 mr-1" />
                {job.commitSha.substring(0, 7)}
              </span>
            )}
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center space-x-2">
          {job.status === "running" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running
            </span>
          )}
          {job.status === "completed" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Discovered
            </span>
          )}
          {job.status === "failed" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Failed
            </span>
          )}
        </div>
      </div>

      {/* Stage Progression Bar */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {STAGES.map((s, idx) => {
            const isCompleted = currentStageIndex > idx || job.status === "completed";
            const isCurrent = currentStageIndex === idx && job.status === "running";
            return (
              <div
                key={s.key}
                className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                  isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : isCurrent
                    ? "border-indigo-500/40 bg-indigo-500/20 text-indigo-200 shadow-sm shadow-indigo-500/20"
                    : "border-slate-800 bg-slate-900/40 text-slate-500"
                }`}
              >
                {s.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-400 block">Total Blobs Discovered</span>
          <span className="text-xl font-bold text-white flex items-center mt-1">
            <FileCode2 className="h-4 w-4 mr-1.5 text-indigo-400" />
            {job.filesDiscovered.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-400 block">Eligible Code Files</span>
          <span className="text-xl font-bold text-emerald-400 flex items-center mt-1">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {job.filesProcessed.toLocaleString()}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-400 block">Excluded / Skipped</span>
          <span className="text-xl font-bold text-slate-400 flex items-center mt-1">
            <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-400" />
            {Math.max(0, job.filesDiscovered - job.filesProcessed).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Error Message and Retry Action */}
      {job.status === "failed" && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
          <div className="flex items-start space-x-2 text-rose-300 text-xs">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <span className="font-semibold block">Ingestion Failure Diagnostic:</span>
              <p className="mt-0.5">{job.errorMessage || "Unknown ingestion error occurred."}</p>
            </div>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" /> Retry Ingestion
            </button>
          )}
        </div>
      )}
    </div>
  );
}
