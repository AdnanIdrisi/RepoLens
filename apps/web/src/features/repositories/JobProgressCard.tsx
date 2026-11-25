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
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 text-xs font-mono text-slate-400 animate-pulse shadow-2xs">
        Initializing ingestion job...
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex((s) => s.key === job.stage);

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
            Ingestion Pipeline Status
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm font-bold text-slate-100 font-mono capitalize">{job.stage.replace(/_/g, " ")}</span>
            {job.commitSha && (
              <span className="inline-flex items-center text-xs font-mono bg-[#1e293b] text-slate-300 border border-[#334155] px-2 py-0.5 rounded shadow-2xs">
                <GitCommit className="h-3 w-3 mr-1 text-slate-400" />
                {job.commitSha.substring(0, 7)}
              </span>
            )}
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center space-x-2 font-mono">
          {job.status === "running" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="h-3.5 w-3.5 mr-1.5 animate-spin text-amber-400" /> Running
            </span>
          )}
          {job.status === "completed" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> Ready
            </span>
          )}
          {job.status === "failed" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="h-3.5 w-3.5 mr-1.5 text-rose-400" /> Failed
            </span>
          )}
        </div>
      </div>

      {/* Stage Progression Bar */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
        {STAGES.map((s, idx) => {
          const isCompleted = currentStageIndex > idx || job.status === "completed";
          const isCurrent = currentStageIndex === idx && job.status === "running";
          return (
            <div
              key={s.key}
              className={`p-2 rounded-md border text-xs font-semibold transition-colors ${
                isCompleted
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : isCurrent
                  ? "border-indigo-500 bg-indigo-600 text-white shadow-2xs"
                  : "border-[#334155] bg-[#111827] text-slate-500"
              }`}
            >
              {s.label}
            </div>
          );
        })}
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 font-mono">
        <div className="bg-[#111827] p-3 rounded-md border border-[#1e293b]">
          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Blobs Discovered</span>
          <span className="text-lg font-bold text-slate-100 flex items-center mt-0.5">
            <FileCode2 className="h-4 w-4 mr-1.5 text-slate-400" />
            {job.filesDiscovered.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#111827] p-3 rounded-md border border-[#1e293b]">
          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Eligible Code Files</span>
          <span className="text-lg font-bold text-emerald-400 flex items-center mt-0.5">
            <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-400" />
            {job.filesProcessed.toLocaleString()}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#111827] p-3 rounded-md border border-[#1e293b]">
          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Excluded Files</span>
          <span className="text-lg font-bold text-slate-300 flex items-center mt-0.5">
            <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-400" />
            {Math.max(0, job.filesDiscovered - job.filesProcessed).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Error Message and Retry Action */}
      {job.status === "failed" && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 space-y-2 font-mono">
          <div className="flex items-start space-x-2 text-rose-400 text-xs">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-rose-300">Ingestion Diagnostic:</span>
              <p className="mt-0.5 text-xs text-rose-200">{job.errorMessage || "Unknown ingestion error occurred."}</p>
            </div>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-2xs"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" /> Retry Ingestion
            </button>
          )}
        </div>
      )}
    </div>
  );
}
