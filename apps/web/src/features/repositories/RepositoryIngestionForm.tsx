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
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-950/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative max-w-3xl">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-2">
          <Sparkles className="h-4 w-4" />
          <span>Module 1 &bull; GitHub Repository Ingestion</span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Ingest & Explore Any Public GitHub Repository
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter a public repository URL. RepoLens will resolve the commit revision, discover the source tree, and classify files eligible for structural code intelligence.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <GitFork className="h-5 w-5" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                required
                disabled={isLoading}
                className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/90 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner disabled:opacity-50"
              />
            </div>

            <div className="w-full sm:w-36">
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Branch / Ref"
                disabled={isLoading}
                className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : (
                <span>Ingest Repository</span>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
