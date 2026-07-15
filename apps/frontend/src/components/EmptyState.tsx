"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center border-border/50">
      <CardContent>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
          {icon}
        </div>
        <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}