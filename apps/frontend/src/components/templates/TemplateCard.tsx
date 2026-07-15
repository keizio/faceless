"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  ShoppingBag,
  Columns,
  Music,
  Lightbulb,
  BookOpen,
  ListOrdered,
  Quote,
} from "lucide-react";
import type { ContentTemplate } from "@faceless/shared";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  ShoppingBag,
  Columns,
  Music,
  Lightbulb,
  BookOpen,
  ListOrdered,
  Quote,
};

const CATEGORY_COLORS: Record<string, string> = {
  conversation: "bg-blue-500/10 text-blue-500",
  marketing: "bg-green-500/10 text-green-500",
  comparison: "bg-purple-500/10 text-purple-500",
  music: "bg-pink-500/10 text-pink-500",
  education: "bg-amber-500/10 text-amber-500",
  narrative: "bg-red-500/10 text-red-500",
  typography: "bg-cyan-500/10 text-cyan-500",
};

export function TemplateCard({ template }: { template: ContentTemplate }) {
  const Icon = ICON_MAP[template.icon] ?? MessageSquare;
  const colorClass = CATEGORY_COLORS[template.category] ?? "bg-muted text-muted-foreground";

  return (
    <Link href={`/templates/${template.id}`}>
      <Card className="group hover:border-primary/50 transition-all cursor-pointer h-full">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colorClass}`}
            >
              {template.category}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
            {template.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
            {template.description}
          </p>

          <div className="mt-3 flex gap-1 flex-wrap">
            {template.supportedContentTypes.map((type) => (
              <span
                key={type}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {type}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
