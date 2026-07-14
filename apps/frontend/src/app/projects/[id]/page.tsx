"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ContentCreator } from "@/components/ContentCreator";
import { StatusBadge } from "@/components/StatusBadge";
import { useProject } from "@/hooks/useProjects";
import Link from "next/link";
import { use } from "react";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-8">
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-8 w-64" />
              <div className="skeleton h-4 w-48" />
            </div>
          ) : project ? (
            <>
              {/* Project header */}
              <div>
                <Link
                  href="/dashboard"
                  className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 12L6 8l4-4" />
                  </svg>
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Content Creator */}
              <ContentCreator projectId={id} />

              {/* Content list */}
              {project.contents?.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                    Content ({project.contents.length})
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {project.contents.map(
                      (content: {
                        id: string;
                        title: string | null;
                        type: string;
                        platform: string;
                        status: string;
                        createdAt: string;
                      }) => (
                        <Link
                          key={content.id}
                          href={`/contents/${content.id}`}
                          className="card-hover group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-lg">
                              {content.type === "image" ? "🖼️" : content.type === "video" ? "🎬" : content.type === "slide" ? "📑" : "📝"}
                            </div>
                            <StatusBadge status={content.status} />
                          </div>
                          <h3 className="mt-3 font-medium text-[var(--text-primary)]">
                            {content.title || "Untitled"}
                          </h3>
                          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span className="capitalize">{content.type}</span>
                            <span>·</span>
                            <span className="capitalize">{content.platform}</span>
                            <span>·</span>
                            <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                          </div>
                        </Link>
                      ),
                    )}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="card flex flex-col items-center py-12 text-center">
              <p className="text-[var(--text-muted)]">Project not found.</p>
              <Link href="/dashboard" className="btn-primary mt-4">
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}