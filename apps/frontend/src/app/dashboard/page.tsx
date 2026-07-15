"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { CardSkeleton } from "@/components/Skeleton";
import { useCreateProject, useProjects } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";
import {
  Folder,
  FileText,
  Zap,
  CheckCircle,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import { TemplateCard } from "@/components/templates/TemplateCard";

export default function DashboardPage() {
  const { data: projects, isLoading } = useProjects();
  const { data: templates } = useTemplates();
  const createProject = useCreateProject();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject.mutate(
      { name },
      { onSuccess: () => { setName(""); setShowForm(false); } },
    );
  };

  const totalContents = projects?.reduce(
    (sum: number, p: { contentsCount?: number }) => sum + (p.contentsCount ?? 0),
    0,
  ) ?? 0;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-8 overflow-safe-mobile">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Welcome back to your content studio
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
              label="Generated Today"
              value="--"
              loading={isLoading}
            />
            <StatsCard
              icon={<CheckCircle className="h-5 w-5 text-primary" />}
              label="Success Rate"
              value="--"
              loading={isLoading}
            />
          </div>

          {/* New project form */}
          {showForm && (
            <Card className="animate-slide-in border-border/50">
              <CardContent className="p-4">
                <h3 className="mb-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  New Project
                </h3>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Project name..."
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    onClick={handleCreate}
                    disabled={createProject.isPending || !name.trim()}
                    size="sm"
                  >
                    {createProject.isPending ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    onClick={() => setShowForm(false)}
                    variant="ghost"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Templates */}
          {templates && templates.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Templates
                </h2>
                <Link
                  href="/templates"
                  className="text-sm text-primary hover:underline"
                >
                  Browse all
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {templates.slice(0, 4).map((template) => (
                  <Link
                    key={template.id}
                    href={`/templates/${template.id}`}
                    className="w-72 shrink-0"
                  >
                    <TemplateCard template={template} />
                  </Link>
                ))}
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : projects?.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-12 text-center border-border/50">
                <CardContent>
                  <div className="mb-4 flex h-16 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                    <Folder className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-foreground">
                    No projects yet
                  </h3>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Create your first project to start generating content
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    Create Your First Project
                  </Button>
                </CardContent>
              </Card>
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
      </DashboardLayout>
    </AuthGuard>
  );
}