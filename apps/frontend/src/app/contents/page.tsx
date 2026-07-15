"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ContentCard } from "@/components/ContentCard";
import { CardSkeleton } from "@/components/Skeleton";
import { useAllContents } from "@/hooks/useContents";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";

export default function ContentsPage() {
  const { data: contents, isLoading } = useAllContents();

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-6 overflow-safe-mobile">
          {/* Header */}
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              All Content
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {contents?.length ?? 0} content items across all projects
            </p>
          </div>

          {/* Content list */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : contents?.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12 text-center border-border/50">
              <CardContent>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-1 text-lg font-semibold text-foreground">
                  No content yet
                </h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Create content from any project to see it here
                </p>
                <Link href="/dashboard">
                  <span className="text-sm text-primary hover:underline">
                    Go to Dashboard
                  </span>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="isometric-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {contents?.map(
                (content: {
                  id: string;
                  title: string | null;
                  type: string;
                  platform: string;
                  status: string;
                  createdAt: string;
                  thumbnailUrl: string | null;
                }) => (
                  <ContentCard
                    key={content.id}
                    id={content.id}
                    title={content.title}
                    type={content.type}
                    platform={content.platform}
                    status={content.status}
                    createdAt={content.createdAt}
                    thumbnailUrl={content.thumbnailUrl}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}