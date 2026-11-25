import { useState, FormEvent } from "react";
import { GitFork, Loader2, Sparkles } from "lucide-react";

interface RepositoryIngestionFormProps {
  onIngestionStarted: (repositoryId: string, jobId: string) => void;
  isLoading: boolean;
}

export function RepositoryIngestionForm({ onIngestionStarted, isLoading }: RepositoryIngestionFormProps) {
  const [url, setUrl] = useState("https://github.com/expressjs/express");
  const [ref, setRef] = useState("master");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Please enter a GitHub repository URL");
      return;
    }

    try {
      const response = await fetch("/api/repositories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: url.trim(), ref: ref.trim() || "main" })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to register repository");
      }

      onIngestionStarted(data.data.repository._id, data.data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register repository");
    }
  };

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6 shadow-xs">
      <div className="max-w-3xl">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono font-bold tracking-wider uppercase mb-2">
          <Sparkles className="h-4 w-4" />
          <span>Module 1 &bull; GitHub Repository Ingestion</span>
        </div>
        
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-display">
          Ingest & Explore Any Public GitHub Repository
        </h1>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed font-mono">
          Enter a public repository URL. RepoLens will resolve the commit revision, discover the source tree, and classify files eligible for structural code intelligence.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <GitFork className="h-4 w-4" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                required
                disabled={isLoading}
                className="block w-full rounded-md border border-[#334155] bg-[#111827] pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:bg-[#161f30] focus:outline-none transition-colors disabled:opacity-50 shadow-2xs"
              />
            </div>

            <div className="w-full sm:w-36">
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Branch / Ref"
                disabled={isLoading}
                className="block w-full rounded-md border border-[#334155] bg-[#111827] px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:bg-[#161f30] focus:outline-none transition-colors disabled:opacity-50 shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2 text-xs font-semibold font-mono text-white transition-colors hover:bg-indigo-500 focus:outline-none disabled:opacity-50 shrink-0 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : (
                <span>Ingest Repository</span>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-300 text-xs font-mono text-rose-700 font-medium">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
