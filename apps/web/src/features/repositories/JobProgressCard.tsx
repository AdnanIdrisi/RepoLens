import { useState, useEffect } from "react";
import { CheckCircle2, Clock, XCircle, GitCommit, RefreshCw } from "lucide-react";
import type { IndexingJob } from "@repolens/shared";

interface JobProgressCardProps {
  jobId: string;
  onJobCompleted?: (job: IndexingJob) => void;
  onRetry?: () => void;
}

const STAGES = [
  { key: "validate_repository", label: "Validate" },
  { key: "resolve_commit", label: "Commit" },
  { key: "discover_tree", label: "Tree" },
  { key: "filter_files", label: "Filter" },
  { key: "discovered", label: "Done" },
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
            if (
              data.data.status === "completed" ||
              data.data.status === "failed" ||
              data.data.status === "cancelled"
            ) {
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
      <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-4 text-xs font-mono text-[#6B7280] dark:text-[#94A3B8] animate-pulse">
        Initializing job...
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex((s) => s.key === job.stage);

  return (
    <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold capitalize">
            {job.stage.replace(/_/g, " ")}
          </span>
          {job.commitSha && (
            <span className="inline-flex items-center text-[11px] font-mono bg-subtle-light dark:bg-subtle-dark border border-hairline-light dark:border-hairline-dark px-1.5 py-0.5 rounded text-[#6B7280] dark:text-[#94A3B8]">
              <GitCommit className="h-3 w-3 mr-1" />
              {job.commitSha.substring(0, 7)}
            </span>
          )}
        </div>

        <div className="font-mono text-xs">
          {job.status === "running" && (
            <span className="inline-flex items-center text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5 mr-1 animate-spin" /> Running
            </span>
          )}
          {job.status === "completed" && (
            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Ready
            </span>
          )}
          {job.status === "failed" && (
            <span className="inline-flex items-center text-rose-600 dark:text-rose-400">
              <XCircle className="h-3.5 w-3.5 mr-1" /> Failed
            </span>
          )}
        </div>
      </div>

      {/* Stage Bar */}
      <div className="grid grid-cols-5 gap-1.5 text-center text-[11px] font-mono">
        {STAGES.map((s, idx) => {
          const isCompleted = currentStageIndex > idx || job.status === "completed";
          const isCurrent = currentStageIndex === idx && job.status === "running";
          return (
            <div
              key={s.key}
              className={`py-1.5 rounded-lg border transition-colors ${
                isCompleted
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : isCurrent
                  ? "border-[#111827] dark:border-[#F59E0B] bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] font-semibold"
                  : "border-hairline-light dark:border-hairline-dark bg-subtle-light dark:bg-subtle-dark text-[#6B7280] dark:text-[#64748B]"
              }`}
            >
              {s.label}
            </div>
          );
        })}
      </div>

      {/* Joined Counters */}
      <div className="grid grid-cols-3 divide-x divide-hairline-light dark:divide-hairline-dark border border-hairline-light dark:border-hairline-dark rounded-lg text-xs font-mono">
        <div className="p-2.5">
          <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block">Discovered</span>
          <span className="font-bold tabular-nums">{job.filesDiscovered.toLocaleString()}</span>
        </div>
        <div className="p-2.5">
          <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block">Eligible</span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {job.filesProcessed.toLocaleString()}
          </span>
        </div>
        <div className="p-2.5">
          <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block">Excluded</span>
          <span className="font-bold tabular-nums text-[#6B7280] dark:text-[#94A3B8]">
            {Math.max(0, job.filesDiscovered - job.filesProcessed).toLocaleString()}
          </span>
        </div>
      </div>

      {job.status === "failed" && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 flex items-center justify-between gap-3 text-xs font-mono">
          <span className="text-rose-600 dark:text-rose-300 truncate">
            {job.errorMessage || "Ingestion error"}
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-2.5 py-1 rounded bg-rose-600 text-white hover:bg-rose-500 shrink-0"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
