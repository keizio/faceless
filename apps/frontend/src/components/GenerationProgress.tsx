"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function GenerationProgress({ jobId }: { jobId: string }) {
  const { data: job } = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: async () => {
      const { data } = await api.get(`/api/jobs/${jobId}`);
      return data.job;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 2000;
    },
  });

  if (!job) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          <span className="mr-2">⚡</span>Generation Progress
        </h3>
        <span className="text-xs font-medium text-[var(--accent-secondary)]">
          {job.progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] transition-all duration-500 ease-out"
          style={{ width: `${job.progress}%` }}
        />
      </div>

      {/* Steps indicator */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              job.status === "pending" || job.status === "active"
                ? "bg-[var(--warning)] animate-pulse"
                : job.status === "completed"
                  ? "bg-[var(--success)]"
                  : "bg-[var(--text-muted)]"
            }`}
          />
          <span className="text-xs capitalize text-[var(--text-secondary)]">
            {job.status === "pending"
              ? "Queued"
              : job.status === "active"
                ? "Generating..."
                : job.status === "completed"
                  ? "Completed"
                  : "Failed"}
          </span>
        </div>
      </div>

      {job.error && (
        <div className="mt-3 rounded-lg bg-[var(--error)]/10 p-3">
          <p className="text-xs text-[var(--error)]">{job.error}</p>
        </div>
      )}
    </div>
  );
}