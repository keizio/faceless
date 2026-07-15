"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useTemplates } from "@/hooks/useTemplates";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { TemplateCategory } from "@faceless/shared";

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  conversation: "Conversation",
  marketing: "Marketing",
  comparison: "Comparison",
  music: "Music",
  education: "Education",
  narrative: "Narrative",
  typography: "Typography",
};

const CATEGORIES: (TemplateCategory | "all")[] = [
  "all",
  "conversation",
  "marketing",
  "comparison",
  "music",
  "education",
  "narrative",
  "typography",
];

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");

  const filtered = templates?.filter(
    (t) => activeCategory === "all" || t.category === activeCategory,
  );

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-6">
          <PageHeader
            title="Content Templates"
            subtitle="Choose a viral template to create engaging content fast"
            icon={<Sparkles className="h-5 w-5 text-primary" />}
          />

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scroll-smooth sticky top-0 bg-background z-10 pt-1 -mt-1 snap-x snap-mandatory">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`snap-start shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat as TemplateCategory]}
                {cat !== "all" && templates && (
                  <span className="ml-1.5 opacity-60">
                    ({templates.filter((t) => t.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card animate-pulse">
                  <div className="p-5 space-y-3">
                    <div className="skeleton h-5 w-3/4 bg-muted rounded" />
                    <div className="skeleton h-3 w-full bg-muted rounded" />
                    <div className="skeleton h-3 w-2/3 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered?.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8 text-primary" />}
              title="No templates in this category"
              description="Try selecting a different category"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered?.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}