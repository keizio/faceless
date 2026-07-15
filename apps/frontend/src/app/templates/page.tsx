"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { useTemplates } from "@/hooks/useTemplates";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");

  const categories: (TemplateCategory | "all")[] = [
    "all",
    "conversation",
    "marketing",
    "comparison",
    "music",
    "education",
    "narrative",
    "typography",
  ];

  const filtered = templates?.filter(
    (t) => activeCategory === "all" || t.category === activeCategory,
  );

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-6 overflow-safe-mobile">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Content Templates
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a viral template to create engaging content fast
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat as TemplateCategory]}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered?.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12 text-center border-border/50">
              <CardContent>
                <p className="text-muted-foreground">No templates in this category yet.</p>
              </CardContent>
            </Card>
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
