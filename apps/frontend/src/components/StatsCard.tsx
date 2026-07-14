"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  loading?: boolean;
}

export function StatsCard({ icon, label, value, trend, trendUp, loading }: StatsCardProps) {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-5">
          <div className="skeleton h-10 w-10 rounded-lg mb-3 bg-muted" />
          <div className="skeleton h-5 w-24 mb-2 bg-muted" />
          <div className="skeleton h-3 w-16 bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="isometric-card depth-2 border-border/50">
      <CardContent className="p-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 float-3d">
          {icon}
        </div>
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
          {trend && (
            <span
              className={`hidden sm:flex items-center gap-1 text-xs font-medium ${
                trendUp ? "text-[hsl(var(--success))]" : "text-destructive"
              }`}
            >
              {trend}
              <span>{trendUp ? "↑" : "↓"}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}