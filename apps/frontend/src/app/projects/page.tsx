"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ProjectGridSkeleton } from "@/components/GridSkeleton";
import { useCreateProject, useProjects } from "@/hooks/useProjects";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Folder,
  FileText,
  Plus,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
} from "lucide-react";

const SORT_OPTIONS = ["newest", "oldest", "most-content"] as const;

export default function ProjectsPage() {
  const { data: projectsData, isLoading } = useProjects();
  const projects = projectsData?.projects;
  const createProject = useCreateProject();
  const [showNewProject, setShowNewProject] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject.mutate(
      { name },
      { onSuccess: () => { setName(""); setShowNewProject(false); } },
    );
  };

  const filtered = useMemo(() => {
    if (!projects) return [];
    let result = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p: { name: string; description?: string | null }) =>
          p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
      );
    }
    result.sort((a: { createdAt: string; contentsCount?: number }, b: { createdAt: string; contentsCount?: number }) => {
      if (sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sort === "most-content") {
        return (b.contentsCount ?? 0) - (a.contentsCount ?? 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [projects, search, sort]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-6">
          <PageHeader
            title="Projects"
            subtitle={`${filtered.length} total projects`}
            actions={
              <Button onClick={() => setShowNewProject(true)} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Button>
            }
          />

          {/* Search + sort + view toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sort} onValueChange={(v) => v && setSort(v)}>
                <SelectTrigger className="h-9 w-[130px] text-xs text-primary">
                  <ArrowUpDown className="mr-1.5 h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">
                      {s === "most-content" ? "Most Content" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex border border-border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="h-9 w-9 rounded-none px-0"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="h-9 w-9 rounded-none px-0"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
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

          {/* Projects */}
          {isLoading ? (
            <ProjectGridSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Folder className="h-8 w-8 text-primary" />}
              title={search ? "No projects match your search" : "No projects yet"}
              description={search ? "Try a different search term" : "Create your first project to start generating content"}
              action={
                !search ? (
                  <Button onClick={() => setShowNewProject(true)}>
                    Create Your First Project
                  </Button>
                ) : undefined
              }
            />
          ) : viewMode === "grid" ? (
            <div className="isometric-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(
                (project: { id: string; name: string; description: string | null; createdAt: string; contentsCount?: number }) => (
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
                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground/70">
                          <span>{project.contentsCount ?? 0} content items</span>
                          <span>·</span>
                          <span>
                            {new Date(project.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              )}
            </div>
          ) : (
            /* List view */
            <div className="space-y-2">
              {filtered.map(
                (project: { id: string; name: string; description: string | null; createdAt: string; contentsCount?: number }) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block"
                  >
                    <Card className="border-border/50 group cursor-pointer transition-all duration-200 hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                            {project.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground/70 shrink-0">
                            <span>{project.contentsCount ?? 0} items</span>
                            <span>
                              {new Date(project.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}