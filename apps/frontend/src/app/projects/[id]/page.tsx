"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ContentCreator } from "@/components/ContentCreator";
import { ContentCard } from "@/components/ContentCard";
import { BrandKitPanel } from "@/components/BrandKitPanel";
import { useProject, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { ChevronLeft, Palette, Settings2, Trash2, Save, X, Pencil } from "lucide-react";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: project, isLoading } = useProject(id);
  const updateProject = useUpdateProject(id);
  const deleteProject = useDeleteProject();
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const startEditing = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    updateProject.mutate(
      { name: editName.trim(), description: editDescription.trim() || undefined },
      { onSuccess: () => setEditing(false) },
    );
  };

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
                {editing ? (
                  <div className="space-y-3">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Project name"
                      className="text-2xl font-bold h-10"
                      autoFocus
                    />
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="text-sm"
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={saveEdit} disabled={updateProject.isPending || !editName.trim()}>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        {updateProject.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h1 className="text-2xl font-bold text-foreground">
                        {project.name}
                      </h1>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={startEditing} title="Edit project">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setShowDeleteConfirm(true)} className="text-destructive" title="Delete project">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {project.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBrandKit(true)}
                      >
                        <Palette className="mr-1.5 h-3.5 w-3.5" />
                        Brand Kit
                      </Button>
                    </div>
                  </>
                )}
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

              {/* Delete confirm dialog */}
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Delete Project?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete this project and all its content. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button onClick={() => setShowDeleteConfirm(false)} variant="outline">Cancel</Button>
                    <Button
                      onClick={() => {
                        deleteProject.mutate(id, {
                          onSuccess: () => router.push("/projects"),
                        });
                        setShowDeleteConfirm(false);
                      }}
                      variant="destructive"
                      disabled={deleteProject.isPending}
                    >
                      {deleteProject.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
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