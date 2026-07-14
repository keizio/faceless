"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GenerationProgress } from "@/components/GenerationProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { useContent, useRegenerateContent } from "@/hooks/useContents";
import Link from "next/link";
import { useState, use } from "react";

export default function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: content, isLoading } = useContent(id);
  const regenerate = useRegenerateContent();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-8 w-64" />
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-32 w-full" />
            </div>
          ) : content ? (
            <>
              {/* Header */}
              <div>
                <Link
                  href={`/projects/${content.projectId}`}
                  className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 12L6 8l4-4" />
                  </svg>
                  Back to Project
                </Link>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {content.title || "Untitled Content"}
                </h1>
                <div className="mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-md bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                    {content.type === "image" ? "🖼️" : content.type === "video" ? "🎬" : content.type === "slide" ? "📑" : "📝"}
                    <span className="capitalize">{content.type}</span>
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md bg-[var(--accent-secondary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--accent-secondary)]">
                    <span className="capitalize">{content.platform}</span>
                  </span>
                  <StatusBadge status={content.status} />
                </div>
              </div>

              {/* Generation Progress */}
              {(content.status === "queued" || content.status === "generating") && (
                <GenerationProgress jobId={content.latestJobId} />
              )}

              {/* Prompt */}
              <div className="card">
                <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                  <span className="mr-2">💡</span>Prompt
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {content.prompt}
                </p>
              </div>

              {/* Script */}
              {content.script && (
                <div className="card">
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                    <span className="mr-2">📜</span>Script
                  </h2>
                  <div className="rounded-lg bg-[var(--bg-elevated)] p-4">
                    <pre className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] font-mono leading-relaxed">
                      {content.script}
                    </pre>
                  </div>
                </div>
              )}

              {/* Versions */}
              {content.versions?.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                    <span className="mr-2">📦</span>Versions ({content.versions.length})
                  </h2>
                  <div className="space-y-3">
                    {content.versions.map(
                      (v: {
                        id: string;
                        versionNumber: number;
                        outputUrl: string | null;
                        thumbnailUrl: string | null;
                        createdAt: string;
                      }) => (
                        <div
                          key={v.id}
                          className="card flex items-center gap-4"
                        >
                          {v.thumbnailUrl && (
                            <img
                              src={v.thumbnailUrl}
                              alt=""
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          )}
                          {!v.thumbnailUrl && v.outputUrl?.match(/\.(mp4|webm)$/) && (
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-2xl">
                              🎬
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              Version {v.versionNumber}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {new Date(v.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          {v.outputUrl && (
                            <a
                              href={v.outputUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary text-xs"
                            >
                              Download
                            </a>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </section>
              )}

              {/* Regenerate */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={regenerate.isPending}
                  className="btn-ghost border border-[var(--border-color)]"
                >
                  {regenerate.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Regenerating...
                    </span>
                  ) : (
                    <span>🔄 Regenerate</span>
                  )}
                </button>
              </div>

              {/* Confirm dialog */}
              {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="card mx-4 w-full max-w-sm animate-fade-in">
                    <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                      Regenerate Content?
                    </h3>
                    <p className="mb-6 text-sm text-[var(--text-muted)]">
                      This will create a new version of this content. The current version will be preserved.
                    </p>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowConfirm(false)}
                        className="btn-ghost"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
regenerate.mutate(id);
                    setShowConfirm(false);
                        }}
                        className="btn-primary"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card flex flex-col items-center py-12 text-center">
              <p className="text-[var(--text-muted)]">Content not found.</p>
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