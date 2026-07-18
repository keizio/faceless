"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GenerationProgress } from "@/components/GenerationProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { useContent, useRegenerateContent, useDuplicateContent, useDeleteContent } from "@/hooks/useContents";
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
import { useState, use, useCallback } from "react";
import {
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
  Trash2,
  Volume2,
  ImageIcon,
  ArrowLeft,
  ArrowRight,
  Download,
  PenTool,
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
  const deleteContent = useDeleteContent();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [duplicateLang, setDuplicateLang] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const images = content?.media?.filter((m: { type: string }) => m.type === "image") ?? [];
  const videos = content?.media?.filter((m: { type: string }) => m.type === "video") ?? [];
  const audios = content?.media?.filter((m: { type: string }) => m.type === "audio") ?? [];

  const goToImage = useCallback((direction: "prev" | "next") => {
    if (selectedImageIndex === null) return;
    const next = direction === "prev" ? selectedImageIndex - 1 : selectedImageIndex + 1;
    if (next >= 0 && next < images.length) {
      setSelectedImageIndex(next);
    }
  }, [selectedImageIndex, images.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (selectedImageIndex === null) return;
    if (e.key === "ArrowLeft") goToImage("prev");
    if (e.key === "ArrowRight") goToImage("next");
    if (e.key === "Escape") setSelectedImageIndex(null);
  }, [selectedImageIndex, goToImage]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in">
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-8 w-64 rounded-lg bg-muted" />
              <div className="skeleton h-4 w-48 rounded-lg bg-muted" />
              <div className="skeleton h-32 w-full rounded-lg bg-muted" />
            </div>
          ) : content ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left column: Media */}
              <div className="lg:col-span-3 space-y-6">
                {/* Header info */}
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {content.title || (content.prompt ? content.prompt.slice(0, 50) + (content.prompt.length > 50 ? "..." : "") : "Untitled Content")}
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

                {/* Image Gallery */}
                {images.length > 0 && (
                  <Card className="glass depth-2 border-border/50">
                    <CardContent className="p-5">
                      <h2 className="mb-3 text-sm font-semibold text-foreground">
                        <ImageIcon className="mr-2 inline h-4 w-4 text-primary" />
                        {content.type === "slide" ? "Slides" : "Images"} ({images.length})
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {images.map((img: { id: string; url: string }, i: number) => {
                          const aspectClass = content.aspectRatio === "16:9" ? "aspect-video" : content.aspectRatio === "1:1" ? "aspect-square" : content.aspectRatio === "4:5" ? "aspect-[4/5]" : "aspect-[9/16]";
                          return (
                            <div key={img.id} className="relative group">
                              <button
                                onClick={() => setSelectedImageIndex(i)}
                                className={`w-full ${aspectClass} rounded-lg overflow-hidden bg-muted cursor-pointer`}
                              >
                                <img
                                  src={img.url}
                                  alt={`${content.type === "slide" ? "Slide" : "Image"} ${i + 1}`}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                {content.type === "slide" && (
                                  <div className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium">
                                    {i + 1}/{images.length}
                                  </div>
                                )}
                              </button>
                              <a
                                href={img.url}
                                download
                                className="absolute top-2 right-2 rounded-md bg-background/80 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                                aria-label="Download image"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Image Lightbox */}
                {selectedImageIndex !== null && images[selectedImageIndex] && (
                  <Dialog open={true} onOpenChange={() => setSelectedImageIndex(null)}>
                    <DialogContent
                      className="sm:max-w-3xl max-h-[90vh]"
                      onKeyDown={handleKeyDown}
                      aria-label="Image lightbox"
                      role="dialog"
                      aria-modal="true"
                      aria-describedby="lightbox-image-description"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={images[selectedImageIndex].url}
                          alt={`Image ${selectedImageIndex + 1}`}
                          id="lightbox-image-description"
                          className="max-h-[70vh] w-auto rounded-lg object-contain"
                        />
                        {images.length > 1 && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => goToImage("prev")}
                              disabled={selectedImageIndex === 0}
                            >
                              <ArrowLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {selectedImageIndex + 1} / {images.length}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => goToImage("next")}
                              disabled={selectedImageIndex === images.length - 1}
                            >
                              Next
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Video Player */}
                {videos.length > 0 && (
                  <Card className="glass depth-2 border-border/50">
                    <CardContent className="p-5">
                      <h2 className="mb-3 text-sm font-semibold text-foreground">
                        <Video className="mr-2 inline h-4 w-4 text-primary" />
                        Videos ({videos.length})
                      </h2>
                      <div className="space-y-3">
                        {videos.map((v: { id: string; url: string }) => (
                          <div key={v.id} className="flex items-center gap-3">
                            <video
                              src={v.url}
                              controls
                              className="w-full max-w-md rounded-lg bg-muted"
                              preload="metadata"
                            >
                              Your browser does not support the video tag.
                            </video>
                            <a
                              href={v.url}
                              download
                              className="shrink-0"
                              aria-label="Download video"
                            >
                              <Button variant="outline" size="icon-sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Audio Player */}
                {audios.length > 0 && (
                  <Card className="glass depth-2 border-border/50">
                    <CardContent className="p-5">
                      <h2 className="mb-3 text-sm font-semibold text-foreground">
                        <Volume2 className="mr-2 inline h-4 w-4 text-primary" />
                        Voiceover Audio
                      </h2>
                      <div className="flex items-center gap-3">
                        <audio
                          controls
                          className="w-full"
                          preload="metadata"
                        >
                          {audios.map((a: { id: string; url: string }) => (
                            <source key={a.id} src={a.url} type="audio/mpeg" />
                          ))}
                          Your browser does not support the audio element.
                        </audio>
                        {audios[0] && (
                          <a
                            href={audios[0].url}
                            download
                            className="shrink-0"
                            aria-label="Download audio"
                          >
                            <Button variant="outline" size="icon-sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right column: Details (sticky) */}
              <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-0 lg:self-start">
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

                {/* Caption */}
                {content.versions?.length > 0 && content.versions[0]?.metadata?.caption && (
                  <Card className="glass depth-2 border-border/50">
                    <CardContent className="p-5">
                      <h2 className="mb-3 text-sm font-semibold text-foreground">
                        <FileText className="mr-2 inline h-4 w-4 text-primary" />
                        Caption
                      </h2>
                      <div className="rounded-lg bg-muted p-4">
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {content.versions[0].metadata.caption}
                        </p>
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

                {/* Sticky actions */}
                <div className="flex flex-col gap-3 lg:sticky lg:bottom-0 lg:bg-background py-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {(content.type === "image" || content.type === "slide") && content.status === "ready" && images.length > 0 && (
                      <Link href={`/contents/${id}/editor`}>
                        <Button variant="outline" className="text-primary w-full">
                          <PenTool className="mr-2 h-4 w-4" />
                          Edit Text
                        </Button>
                      </Link>
                    )}
                    <Button
                      onClick={() => setShowConfirm(true)}
                      disabled={regenerate.isPending}
                      variant="outline"
                      className="text-primary flex-1"
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
                          LANGUAGES.find((l: { code: string }) => l.code !== content.language)?.code || "",
                        );
                        setShowDuplicate(true);
                      }}
                      variant="outline"
                      className="text-primary flex-1"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      variant="outline"
                      className="text-destructive hover:text-destructive flex-1"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
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
                <Button onClick={() => setShowConfirm(false)} variant="outline">Cancel</Button>
                <Button onClick={() => { regenerate.mutate(id); setShowConfirm(false); }}>Confirm</Button>
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
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">New Language</label>
                  <Select value={duplicateLang} onValueChange={(v) => v && setDuplicateLang(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang: { code: string; label: string }) => (
                        <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setShowDuplicate(false)} variant="outline" size="sm">Cancel</Button>
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
                    disabled={!duplicateLang || duplicate.isPending}
                  >
                    {duplicate.isPending ? "Duplicating..." : "Duplicate"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete confirm dialog */}
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Delete Content?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. All versions, media, and associated data will be permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={() => setShowDeleteConfirm(false)} variant="outline">Cancel</Button>
                <Button
                  onClick={() => {
                    deleteContent.mutate(id, {
                      onSuccess: () => {
                        setShowDeleteConfirm(false);
                        router.push("/dashboard");
                      },
                    });
                  }}
                  variant="destructive"
                  disabled={deleteContent.isPending}
                >
                  {deleteContent.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}