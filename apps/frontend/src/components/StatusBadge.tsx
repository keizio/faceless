"use client";

import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ready: "default",
  completed: "default",
  failed: "destructive",
  generating: "secondary",
  active: "secondary",
  queued: "secondary",
  pending: "outline",
  draft: "outline",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status] || "outline"}>
      {status === "generating" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status}
    </Badge>
  );
}