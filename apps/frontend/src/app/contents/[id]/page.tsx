"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GenerationProgress } from "@/components/GenerationProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { useContent, useRegenerateContent, useDuplicateContent } from "@/hooks/useContents";
import { LANGUAGES } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, use } from "react";
import {
  ChevronLeft,
  Image,
  Presentation,
  Video,
  FileText,
  Lightbulb,
  ScrollText,
  Package,
  RefreshCw,
  Copy,
  Loader2,
} from "lucide-react";

const TYPE_ICONS: Record<string, typeof Image> = {
  image: Image,
  slide: Presentation,
  video: Video,
  text: FileText,
};

export default function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: content, isLoading } = useContent(id);
  const regenerate = useRegenerateContent();
  const duplicate = useDuplicateContent();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [duplicateLang, setDuplicateLang] = useState("");

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-6 overflow-safe-mobile">
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-8 w-64 rounded-lg bg-muted" />
              <div className="skeleton h-4 w-48 rounded-lg bg-muted" />
              <div className="skeleton h-32 w-full rounded-lg bg-muted" />
            </div>
          ) : content ? (
            <>
              {/* Header */}
              <div>
                <Link
                  href={`/projects/${content.projectId}`}
                  className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Project
                </Link>
                <h1 className="text-2xl font-bold text-foreground">
                  {content.title || "Untitled Content"}
                </h1>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="gap-1.5">
                    {(() => {
                      const TypeIcon = TYPE_ICONS[content.type] || FileText;
                      return <TypeIcon className="h-3.5 w-3.5" />;
                    })()}
                    <span className="capitalize">{content.type}</span>
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {content.platform}
                  </Badge>
                  {content.aspectRatio && (
                    <Badge variant="outline">
                      {content.aspectRatio}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {LANGUAGES.find((l: { code: string }) => l.code === content.language)?.label || content.language}
                  </Badge>
                  <StatusBadge status={content.status} />
                </div>
              </div>

              {/* Generation Progress */}
              {(content.status === "queued" || content.status === "generating") && content.latestJobId && (
                <GenerationProgress jobId={content.latestJobId} />
              )}

              {/* Prompt */}
              <Card className="glass depth-2 border-border/50">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">
                    <Lightbulb className="mr-2 inline h-4 w-4 text-[hsl(var(--warning))]" />
                    Prompt
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {content.prompt}
                  </p>
                </CardContent>
              </Card>

              {/* Script */}
              {content.script && (
                <Card className="glass depth-2 border-border/50">
                  <CardContent className="p-5">
                    <h2 className="mb-3 text-sm font-semibold text-foreground">
                      <ScrollText className="mr-2 inline h-4 w-4 text-primary" />
                      Script
                    </h2>
                    <div className="rounded-lg bg-muted p-4">
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono leading-relaxed">
                        {content.script}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Versions */}
              {content.versions?.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-foreground">
                    <Package className="mr-2 inline h-4 w-4 text-primary" />
                    Versions ({content.versions.length})
                  </h2>
                  <div className="space-y-3">
                    {content.versions.map(
                      (v: {
                        id: string;
                        versionNumber: number;
                        outputUrl: string | null;
                        thumbnailUrl: string | null;
                        createdAt: string;
                      }, i: number) => (
                        <Card
                          key={v.id}
                          className={`border-border/50 depth-${Math.min(i + 1, 3)}`}
                        >
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                              {v.thumbnailUrl && (
                                <img
                                  src={v.thumbnailUrl}
                                  alt=""
                                  className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover shrink-0"
                                />
                              )}
                              {!v.thumbnailUrl && v.outputUrl?.match(/\.(mp4|webm)$/) && (
                                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-lg bg-muted shrink-0">
                                  <Video className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  Version {v.versionNumber}
                                </p>
                                <p className="text-xs text-muted-foreground/70">
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
                                >
                                  <Button variant="default" size="sm">
                                    Download
                                  </Button>
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ),
                    )}
                  </div>
                </section>
              )}

              {/* Regenerate & Duplicate */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={regenerate.isPending}
                  variant="outline"
                >
                  {regenerate.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Regenerating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Regenerate
                    </span>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setDuplicateLang(
                      LANGUAGES.find((l: { code: string }) => l.code !== content.language)?.code || "en",
                    );
                    setShowDuplicate(true);
                  }}
                  variant="outline"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
              </div>

              {/* Regenerate confirm dialog */}
              <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Regenerate Content?</DialogTitle>
                    <DialogDescription>
                      This will create a new version of this content. The current version will be preserved.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      onClick={() => setShowConfirm(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        regenerate.mutate(id);
                        setShowConfirm(false);
                      }}
                    >
                      Confirm
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Duplicate dialog */}
              <Dialog open={showDuplicate} onOpenChange={setShowDuplicate}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Duplicate Content</DialogTitle>
                    <DialogDescription>
                      Create a new copy of this content with a different language.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        New Language
                      </label>
                      <Select value={duplicateLang} onValueChange={(v) => v && setDuplicateLang(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang: { code: string; label: string }) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setShowDuplicate(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          duplicate.mutate(
                            { contentId: id, language: duplicateLang },
                            {
                              onSuccess: (result: { content: { id: string } }) => {
                                setShowDuplicate(false);
                                router.push(`/contents/${result.content.id}`);
                              },
                            },
                          );
                        }}
                        disabled={duplicate.isPending}
                      >
                        {duplicate.isPending ? "Duplicating..." : "Duplicate"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Card className="flex flex-col items-center py-12 text-center border-border/50">
              <CardContent>
                <p className="text-muted-foreground">Content not found.</p>
                <Link href="/dashboard">
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