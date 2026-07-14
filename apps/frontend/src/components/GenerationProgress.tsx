"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

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
    <Card className="glass depth-2">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            <Zap className="mr-2 inline h-4 w-4 text-[hsl(var(--warning))]" />
            Generation Progress
          </h3>
          <span className="text-xs font-medium text-[hsl(var(--accent-secondary))]">
            {job.progress}%
          </span>
        </div>

        <Progress value={job.progress} className="h-2" />

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                job.status === "pending" || job.status === "active"
                  ? "bg-[hsl(var(--warning))] animate-pulse"
                  : job.status === "completed"
                    ? "bg-[hsl(var(--success))]"
                    : "bg-muted-foreground"
              }`}
            />
            <span className="text-xs capitalize text-muted-foreground">
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
          <div className="mt-3 rounded-lg bg-destructive/10 p-3">
            <p className="text-xs text-destructive">{job.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}