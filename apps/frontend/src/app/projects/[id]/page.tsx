"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ContentCreator } from "@/components/ContentCreator";
import { StatusBadge } from "@/components/StatusBadge";
import { useProject } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { use } from "react";
import { ChevronLeft, Image, Presentation, Video, FileText } from "lucide-react";

const TYPE_ICONS: Record<string, typeof Image> = {
  image: Image,
  slide: Presentation,
  video: Video,
  text: FileText,
};

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
                  <div className="isometric-grid grid gap-4 sm:grid-cols-2">
                    {project.contents.map(
                      (content: {
                        id: string;
                        title: string | null;
                        type: string;
                        platform: string;
                        status: string;
                        createdAt: string;
                      }) => {
                        const TypeIcon = TYPE_ICONS[content.type] || FileText;
                        return (
                          <Link
                            key={content.id}
                            href={`/contents/${content.id}`}
                            className="isometric-card"
                          >
                            <Card className="h-full border-border/50 depth-2 group cursor-pointer transition-all duration-200 hover:bg-muted/50">
                              <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <TypeIcon className="h-5 w-5 text-primary" />
                                  </div>
                                  <StatusBadge status={content.status} />
                                </div>
                                <h3 className="mt-3 font-medium text-foreground">
                                  {content.title || "Untitled"}
                                </h3>
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground/70 flex-wrap">
                                  <span className="capitalize">{content.type}</span>
                                  <span>·</span>
                                  <span className="capitalize">{content.platform}</span>
                                  <span>·</span>
                                  <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      },
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