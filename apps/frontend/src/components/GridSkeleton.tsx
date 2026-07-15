"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface GridSkeletonProps {
  count?: number;
  columns?: string;
}

export function ContentCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card animate-pulse">
      <Skeleton className="aspect-[9/16] rounded-t-xl" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ProjectGridSkeleton({ count = 6, columns = "sm:grid-cols-2 lg:grid-cols-3" }: GridSkeletonProps) {
  return (
    <div className={`grid gap-4 ${columns}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse space-y-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}