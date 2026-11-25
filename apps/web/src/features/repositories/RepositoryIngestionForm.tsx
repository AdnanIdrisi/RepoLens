import { useState, FormEvent } from "react";
import { GitFork, Loader2 } from "lucide-react";

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
      setError("Enter a GitHub repository URL");
      return;
    }

    try {
      const response = await fetch("/api/repositories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim(), ref: ref.trim() || "main" }),
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
    <div className="rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark p-5">
      <h2 className="text-sm font-semibold mb-3">Connect GitHub Repository</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280] dark:text-[#94A3B8]">
              <GitFork className="h-3.5 w-3.5" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              required
              disabled={isLoading}
              className="block w-full rounded-lg border border-hairline-light dark:border-hairline-dark bg-subtle-light dark:bg-subtle-dark pl-9 pr-3 py-2 text-xs font-mono text-[#111827] dark:text-[#F1F5F9] placeholder-[#6B7280] dark:placeholder-[#64748B] focus:border-[#111827] dark:focus:border-[#F59E0B] focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <div className="w-full sm:w-32">
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Branch"
              disabled={isLoading}
              className="block w-full rounded-lg border border-hairline-light dark:border-hairline-dark bg-subtle-light dark:bg-subtle-dark px-3 py-2 text-xs font-mono text-[#111827] dark:text-[#F1F5F9] placeholder-[#6B7280] dark:placeholder-[#64748B] focus:border-[#111827] dark:focus:border-[#F59E0B] focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-[#111827] dark:bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-white dark:text-[#0A1114] hover:opacity-90 focus:outline-none disabled:opacity-50 shrink-0 transition-opacity"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                <span>Ingesting...</span>
              </>
            ) : (
              <span>Ingest</span>
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{error}</p>
        )}
      </form>
    </div>
  );
}
