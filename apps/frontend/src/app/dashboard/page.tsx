"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CardSkeleton } from "@/components/Skeleton";
import { useCreateProject, useProjects } from "@/hooks/useProjects";
import { useContent } from "@/hooks/useContents";
import Link from "next/link";
import { useState } from "react";

export default function DashboardPage() {
  const { data: projects, isLoading } = useProjects();
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
    (sum: number, p: { projects?: { contents?: unknown[] } }) => sum + (p as any).contents?.length || 0,
    0,
  ) ?? 0;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Welcome back to your content studio
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 3v10M3 8h10" />
              </svg>
              New Project
            </button>
          </div>

          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              icon="📁"
              label="Total Projects"
              value={projects?.length || 0}
              loading={isLoading}
            />
            <StatsCard
              icon="📝"
              label="Total Content"
              value={totalContents}
              loading={isLoading}
            />
            <StatsCard
              icon="⚡"
              label="Generated Today"
              value="--"
              loading={isLoading}
            />
            <StatsCard
              icon="✅"
              label="Success Rate"
              value="--"
              loading={isLoading}
            />
          </div>

          {/* New project form */}
          {showForm && (
            <div className="card animate-slide-in">
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                Create New Project
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter project name..."
                  className="input flex-1"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <button
                  onClick={handleCreate}
                  disabled={createProject.isPending || !name.trim()}
                  className="btn-primary"
                >
                  {createProject.isPending ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Projects */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Recent Projects
              </h2>
              {projects?.length > 0 && (
                <Link
                  href="/projects"
                  className="text-sm text-[var(--accent)] hover:underline"
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
              <div className="card flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-2xl">
                  📁
                </div>
                <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
                  No projects yet
                </h3>
                <p className="mb-6 text-sm text-[var(--text-muted)]">
                  Create your first project to start generating content
                </p>
                <button onClick={() => setShowForm(true)} className="btn-primary">
                  Create Your First Project
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects?.map(
                  (project: { id: string; name: string; description: string | null; createdAt: string }) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="card-hover group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-lg">
                          📄
                        </div>
                        <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </span>
                      </div>
                      <h3 className="mt-3 font-semibold text-[var(--text-primary)]">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <p className="mt-3 text-xs text-[var(--text-muted)]">
                        {new Date(project.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
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