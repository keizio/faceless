"use client";

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  loading?: boolean;
}

export function StatsCard({ icon, label, value, trend, trendUp, loading }: StatsCardProps) {
  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="skeleton h-10 w-10 mb-3" />
        <div className="skeleton h-5 w-24 mb-2" />
        <div className="skeleton h-3 w-16" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-lg">
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              trendUp ? "text-[var(--success)]" : "text-[var(--error)]"
            }`}
          >
            {trend}
            <span>{trendUp ? "↑" : "↓"}</span>
          </span>
        )}
      </div>
    </div>
  );
}