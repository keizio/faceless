"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ProjectGridSkeleton } from "@/components/GridSkeleton";
import { useCreateProject, useProjects } from "@/hooks/useProjects";
import { useStats } from "@/hooks/useStats";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useState } from "react";
import {
  Folder,
  FileText,
  Zap,
  CheckCircle,
  Plus,
  ChevronRight,
  Sparkles,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { CreateContentForm } from "@/components/CreateContentForm";
import { useRef } from "react";

export default function DashboardPage() {
const { data: projectsData, isLoading } = useProjects();
  const projects = projectsData?.projects;
  const { data: templates } = useTemplates();
  const { data: stats } = useStats();
  const createProject = useCreateProject();
  const [showNewProject, setShowNewProject] = useState(false);
  const [showCreateContent, setShowCreateContent] = useState(false);
  const [name, setName] = useState("");
  const templateScrollRef = useRef<HTMLDivElement>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject.mutate(
      { name },
      { onSuccess: () => { setName(""); setShowNewProject(false); } },
    );
  };

  const totalContents = stats?.totalContents ?? 0;

  const scrollTemplates = (direction: "left" | "right") => {
    if (!templateScrollRef.current) return;
    const scrollAmount = 300;
    templateScrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-8">
          <PageHeader
            title="Dashboard"
            subtitle="Welcome back to your content studio"
            actions={
              <>
                <Button
                  onClick={() => {
                    setShowCreateContent(true);
                  }}
                  variant="ghost"
                  className="text-primary"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Create Content</span>
                  <span className="sm:hidden">Content</span>
                </Button>
                <Button
                  onClick={() => setShowNewProject(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Project</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </>
            }
          />

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
            <StatsCard
              icon={<Folder className="h-5 w-5 text-primary" />}
              label="Total Projects"
              value={projects?.length || 0}
              loading={isLoading}
            />
            <StatsCard
              icon={<FileText className="h-5 w-5 text-primary" />}
              label="Total Content"
              value={totalContents}
              loading={isLoading}
            />
            <StatsCard
              icon={<Zap className="h-5 w-5 text-primary" />}
              label="Credits Remaining"
              value={stats?.credits ?? "--"}
              loading={isLoading}
            />
            <StatsCard
              icon={<CheckCircle className="h-5 w-5 text-primary" />}
              label="Success Rate"
              value={stats ? `${stats.successRate}%` : "--"}
              loading={isLoading}
            />
          </div>

          {/* Templates */}
          {templates && templates.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Templates
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => scrollTemplates("left")}
                    aria-label="Scroll templates left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => scrollTemplates("right")}
                    aria-label="Scroll templates right"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                  <Link
                    href="/templates"
                    className="text-sm text-primary hover:underline"
                  >
                    Browse all
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div
                  ref={templateScrollRef}
                  className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
                  style={{ scrollbarWidth: "none" }}
                >
                  {templates.slice(0, 4).map((template) => (
                    <Link
                      key={template.id}
                      href={`/templates/${template.id}`}
                      className="w-72 shrink-0 snap-start"
                    >
                      <TemplateCard template={template} />
                    </Link>
                  ))}
                </div>
                <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-background to-transparent" />
              </div>
            </section>
          )}

          {/* Projects */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Recent Projects
              </h2>
              {projects?.length > 0 && (
                <Link
                  href="/projects"
                  className="text-sm text-primary hover:underline"
                >
                  View all
                </Link>
              )}
            </div>

            {isLoading ? (
              <ProjectGridSkeleton count={3} />
            ) : projects?.length === 0 ? (
              <EmptyState
                icon={<Folder className="h-8 w-8 text-primary" />}
                title="No projects yet"
                description="Create your first project to start generating content"
                action={<Button onClick={() => setShowNewProject(true)}>Create Your First Project</Button>}
              />
            ) : (
              <div className="isometric-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects?.map(
                  (project: {
                    id: string;
                    name: string;
                    description: string | null;
                    createdAt: string;
                    contentThumbnails?: string[];
                  }) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="isometric-card"
                    >
                      <Card className="h-full border-border/50 depth-2 group cursor-pointer transition-all duration-200 hover:bg-muted/50">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                          <h3 className="mt-3 font-semibold text-foreground">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {project.description}
                            </p>
                          )}
                          {project.contentThumbnails && project.contentThumbnails.length > 0 && (
                            <div className="mt-3 flex gap-1.5">
                              {project.contentThumbnails.map((url: string, i: number) => (
                                <div
                                  key={i}
                                  className="h-10 w-10 rounded-md overflow-hidden bg-muted shrink-0"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="mt-3 text-xs text-muted-foreground/70">
                            {new Date(project.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        {/* New Project Dialog */}
        <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your content generation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name..."
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShowNewProject(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createProject.isPending || !name.trim()}
                >
                  {createProject.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Content Dialog */}
        <Dialog open={showCreateContent} onOpenChange={setShowCreateContent}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Content</DialogTitle>
              <DialogDescription>
                Generate new AI-powered content for your projects.
              </DialogDescription>
            </DialogHeader>
            <CreateContentForm onSuccess={() => setShowCreateContent(false)} />
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AuthGuard>
  );
}