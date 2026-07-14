"use client";

interface StatusBadgeProps {
  status: string;
}

const STATUS_CLASSES: Record<string, string> = {
  ready: "badge-ready",
  completed: "badge-ready",
  failed: "badge-failed",
  generating: "badge-generating",
  active: "badge-generating",
  queued: "badge-generating",
  pending: "badge-draft",
  draft: "badge-draft",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge ${STATUS_CLASSES[status] || "badge-draft"}`}>
      {status === "generating" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status}
    </span>
  );
}