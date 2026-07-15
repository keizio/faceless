"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ContentCreator } from "@/components/ContentCreator";
import { ContentCard } from "@/components/ContentCard";
import { useProject } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { use } from "react";
import { ChevronLeft } from "lucide-react";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-8 overflow-safe-mobile">
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-8 w-64 rounded-lg bg-muted" />
              <div className="skeleton h-4 w-48 rounded-lg bg-muted" />
            </div>
          ) : project ? (
            <>
              {/* Project header */}
              <div>
                <Link
                  href="/dashboard"
                  className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-foreground">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Content Creator */}
              <ContentCreator projectId={id} />

              {/* Content list */}
              {project.contents?.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-foreground">
                    Content ({project.contents.length})
                  </h2>
                  <div className="isometric-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {project.contents.map(
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
                </section>
              )}
            </>
          ) : (
            <Card className="flex flex-col items-center py-12 text-center border-border/50">
              <CardContent>
                <p className="text-muted-foreground">Project not found.</p>
                <Link href="/dashboard" className="btn-primary mt-4 inline-block">
                  <Button className="mt-4">Go to Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}