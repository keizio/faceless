"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ContentCreator } from "@/components/ContentCreator";
import { ContentCard } from "@/components/ContentCard";
import { BrandKitPanel } from "@/components/BrandKitPanel";
import { useProject } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { use, useState } from "react";
import { ChevronLeft, Palette } from "lucide-react";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);
  const [showBrandKit, setShowBrandKit] = useState(false);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in">
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-8 w-64 rounded-lg bg-muted" />
              <div className="skeleton h-4 w-48 rounded-lg bg-muted" />
            </div>
          ) : project ? (
            <>
              {/* Project header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    className={"text-white border-white"}
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBrandKit(true)}
                  >
                    <Palette className="mr-1.5 h-3.5 w-3.5" />
                    Brand Kit
                  </Button>
                </div>
              </div>

              {/* Two-column layout: Creator + Content list */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Content Creator (left column, sticky) */}
                <div className="lg:col-span-2 lg:sticky lg:top-0 lg:self-start">
                  <ContentCreator projectId={id} />
                </div>

                {/* Content list (right column) */}
                <div className="lg:col-span-3">
                  {project.contents?.length > 0 ? (
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
                  ) : (
                    <Card className="flex flex-col items-center py-12 text-center border-border/50">
                      <CardContent>
                        <p className="text-muted-foreground">No content yet. Use the creator panel to generate your first piece of content.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Brand Kit Dialog */}
              <Dialog open={showBrandKit} onOpenChange={setShowBrandKit}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Brand Kit</DialogTitle>
                  </DialogHeader>
                  <BrandKitPanel projectId={id} />
                </DialogContent>
              </Dialog>
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