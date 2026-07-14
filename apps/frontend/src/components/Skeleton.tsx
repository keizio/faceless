"use client";

import { Skeleton as UiSkeleton } from "@/components/ui/skeleton";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <UiSkeleton className={className} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-pulse space-y-3">
      <UiSkeleton className="h-10 w-10 rounded-lg" />
      <UiSkeleton className="h-5 w-24" />
      <UiSkeleton className="h-3 w-16" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse flex items-center gap-4">
          <UiSkeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <UiSkeleton className="h-4 w-3/4" />
            <UiSkeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}