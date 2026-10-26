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
      <div className="rounded border border-[#25334d] bg-[#131b2e] p-4 text-xs font-mono text-[#94a3b8] animate-pulse">
        Initializing ingestion job...
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex((s) => s.key === job.stage);

  return (
    <div className="rounded border border-[#25334d] bg-[#131b2e] p-5 shadow-none space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#25334d] pb-3">
        <div>
          <span className="text-[10px] font-mono uppercase font-semibold text-[#94a3b8]">
            Ingestion Pipeline Status
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm font-bold text-[#f8fafc] font-mono capitalize">{job.stage.replace(/_/g, " ")}</span>
            {job.commitSha && (
              <span className="inline-flex items-center text-xs font-mono bg-[#1a243b] text-[#818cf8] border border-[#25334d] px-2 py-0.5 rounded">
                <GitCommit className="h-3 w-3 mr-1" />
                {job.commitSha.substring(0, 7)}
              </span>
            )}
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center space-x-2 font-mono">
          {job.status === "running" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#1a243b] text-[#d97706] border border-[#d97706]/40">
              <Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running
            </span>
          )}
          {job.status === "completed" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#1a243b] text-[#059669] border border-[#059669]/40">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Ready
            </span>
          )}
          {job.status === "failed" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#1a243b] text-[#dc2626] border border-[#dc2626]/40">
              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Failed
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
              className={`p-2 rounded border text-xs font-medium transition-colors ${
                isCompleted
                  ? "border-[#059669]/40 bg-[#1a243b] text-[#34d399]"
                  : isCurrent
                  ? "border-[#4f46e5] bg-[#4f46e5] text-white"
                  : "border-[#25334d] bg-[#090d16] text-[#475569]"
              }`}
            >
              {s.label}
            </div>
          );
        })}
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 font-mono">
        <div className="bg-[#090d16] p-3 rounded border border-[#25334d]">
          <span className="text-[10px] text-[#94a3b8] block uppercase">Blobs Discovered</span>
          <span className="text-lg font-bold text-[#f8fafc] flex items-center mt-0.5">
            <FileCode2 className="h-4 w-4 mr-1.5 text-[#4f46e5]" />
            {job.filesDiscovered.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#090d16] p-3 rounded border border-[#25334d]">
          <span className="text-[10px] text-[#94a3b8] block uppercase">Eligible Code Files</span>
          <span className="text-lg font-bold text-[#059669] flex items-center mt-0.5">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {job.filesProcessed.toLocaleString()}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#090d16] p-3 rounded border border-[#25334d]">
          <span className="text-[10px] text-[#94a3b8] block uppercase">Excluded Files</span>
          <span className="text-lg font-bold text-[#94a3b8] flex items-center mt-0.5">
            <AlertTriangle className="h-4 w-4 mr-1.5 text-[#d97706]" />
            {Math.max(0, job.filesDiscovered - job.filesProcessed).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Error Message and Retry Action */}
      {job.status === "failed" && (
        <div className="rounded border border-[#dc2626] bg-[#090d16] p-3 space-y-2 font-mono">
          <div className="flex items-start space-x-2 text-[#dc2626] text-xs">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Ingestion Diagnostic:</span>
              <p className="mt-0.5 text-xs text-[#f8fafc]">{job.errorMessage || "Unknown ingestion error occurred."}</p>
            </div>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-colors"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" /> Retry Ingestion
            </button>
          )}
        </div>
      )}
    </div>
  );
}
