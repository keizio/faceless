"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GenerationProgress } from "@/components/GenerationProgress";
import { useAvatar, useUpdateAvatar, useDeleteAvatar, useGenerateAvatar, useUploadAvatarImage } from "@/hooks/useAvatars";
import { SPEECH_STYLE_LABELS, GENDER_OPTIONS, AGE_RANGES, getAgeRangeLabel, getAgeRangeValue } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, use, useRef, useEffect } from "react";
import {
  User,
  Sparkles,
  Trash2,
  Loader2,
  Check,
  Upload,
} from "lucide-react";

const SPEECH_STYLES = Object.keys(SPEECH_STYLE_LABELS);

export default function AvatarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: avatar, isLoading } = useAvatar(id);
  const updateAvatar = useUpdateAvatar(id);
  const deleteAvatar = useDeleteAvatar();
  const generateAvatar = useGenerateAvatar();
  const uploadAvatarImage = useUploadAvatarImage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [speechStyle, setSpeechStyle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!avatar) return;
    setName(avatar.name);
    setAge(getAgeRangeValue(avatar.age));
    setGender(avatar.gender || "");
    setSpeechStyle(avatar.speechStyle || "");
    setImageUrl(avatar.referenceImageUrl || "");
  }, [avatar]);

  useEffect(() => {
    if (avatar?.characterSheetUrl) {
      setActiveJobId(null);
    }
  }, [avatar?.characterSheetUrl]);

  const handleSave = () => {
    updateAvatar.mutate(
      {
        name: name || undefined,
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        speechStyle: speechStyle || undefined,
        referenceImageUrl: imageUrl || undefined,
      },
    );
  };

  const handleDelete = () => {
    deleteAvatar.mutate(id, { onSuccess: () => router.push("/avatars") });
  };

  const handleGenerate = () => {
    generateAvatar.mutate(id, {
      onSuccess: (data) => {
        if (data?.job?.id) setActiveJobId(data.job.id);
      },
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatarImage.mutate(
      { id, file },
      {
        onSuccess: (updatedAvatar) => {
          setImageUrl(updatedAvatar.referenceImageUrl || "");
        },
      },
    );
    e.target.value = "";
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in">
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-8 w-64 rounded-lg bg-muted" />
              <div className="skeleton h-4 w-48 rounded-lg bg-muted" />
              <div className="skeleton h-64 w-full rounded-lg bg-muted" />
            </div>
          ) : avatar ? (
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h1 className="text-2xl font-bold text-foreground">
                    {avatar.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleGenerate}
                      disabled={generateAvatar.isPending || (!!activeJobId && !avatar?.characterSheetUrl)}
                    >
                      {generateAvatar.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Generate Character Sheet
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Preview & Character Sheet */}
                <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-0 lg:self-start">
                  {/* Avatar preview */}
                  <Card className="depth-3 border-border/50">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row items-start gap-6">
                        <div className="flex h-16 w-16 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-[hsl(var(--accent-secondary))]/20 float-3d">
                          {avatar.portraitUrl || avatar.referenceImageUrl ? (
                            <img
                              src={avatar.portraitUrl ?? avatar.referenceImageUrl ?? ""}
                              alt={avatar.name}
                              className="h-16 w-16 sm:h-24 sm:w-24 rounded-xl object-cover"
                            />
                          ) : (
                            <User className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2 min-w-0">
                          {avatar.characterSheetUrl && (
                            <div className="flex items-center gap-2 text-sm text-[hsl(var(--success))]">
                              <Check className="h-4 w-4" />
                              Character sheet generated
                            </div>
                          )}
                          {avatar.speechStyle && (
                            <p className="text-sm text-muted-foreground">
                              <span className="text-muted-foreground/70">Speech style:</span>{" "}
                              {SPEECH_STYLE_LABELS[avatar.speechStyle as keyof typeof SPEECH_STYLE_LABELS] || avatar.speechStyle}
                            </p>
                          )}
                          {(avatar.age || avatar.gender) && (
                            <p className="text-sm text-muted-foreground">
                              <span className="text-muted-foreground/70">Profile:</span>{" "}
                              {[getAgeRangeLabel(avatar.age), avatar.gender].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Generation progress */}
                  {activeJobId && (
                    <GenerationProgress jobId={activeJobId} />
                  )}

                  {/* Character sheet */}
                  {avatar.characterSheetUrl && (
                    <Card className="glass depth-2 border-border/50">
                      <CardContent className="p-5">
                        <h2 className="mb-3 text-sm font-semibold text-foreground">
                          <Sparkles className="mr-2 inline h-4 w-4 text-primary" />
                          Character Sheet
                        </h2>
                        <img
                          src={avatar.characterSheetUrl}
                          alt={`${avatar.name} character sheet`}
                          className="w-full max-w-2xl rounded-lg"
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right: Edit form */}
                <div className="lg:col-span-3">
                  <Card className="border-border/50">
                    <CardContent className="p-4 sm:p-5">
                      <h2 className="mb-3 text-sm font-semibold text-foreground">
                        Edit Avatar
                      </h2>
                      <div className="space-y-3.5">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Name
                          </label>
                          <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Avatar name"
                            className="h-9"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Age Range
                            </label>
                            <Select value={age} onValueChange={(v) => v && setAge(v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Age" />
                              </SelectTrigger>
                              <SelectContent>
                                {AGE_RANGES.map((r: { value: number; label: string }) => (
                                  <SelectItem key={String(r.value)} value={String(r.value)}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Gender
                            </label>
                            <Select value={gender} onValueChange={(v) => v && setGender(v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Gender" />
                              </SelectTrigger>
                              <SelectContent>
                                {GENDER_OPTIONS.map((g: string) => (
                                  <SelectItem key={g} value={g}>
                                    {g}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Speech Style
                            </label>
                            <Select value={speechStyle} onValueChange={(v) => v && setSpeechStyle(v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Style" />
                              </SelectTrigger>
                              <SelectContent>
                                {SPEECH_STYLES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {SPEECH_STYLE_LABELS[s as keyof typeof SPEECH_STYLE_LABELS]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Reference Image
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="url"
                              value={imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              placeholder="https://cdn.solutip.com/..."
                              className="flex-1 h-9 text-sm"
                            />
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileSelect}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadAvatarImage.isPending}
                              title="Upload image"
                            >
                              {uploadAvatarImage.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-1">
                          <Button
                            onClick={handleSave}
                            disabled={updateAvatar.isPending || !name.trim() || uploadAvatarImage.isPending}
                            size="sm"
                          >
                            {updateAvatar.isPending ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Delete confirm dialog */}
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Delete Avatar?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. All avatar data will be permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button onClick={() => setShowDeleteConfirm(false)} variant="outline">Cancel</Button>
                    <Button onClick={() => { handleDelete(); setShowDeleteConfirm(false); }} variant="destructive" disabled={deleteAvatar.isPending}>
                      {deleteAvatar.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Card className="flex flex-col items-center py-12 text-center border-border/50">
              <CardContent>
                <p className="text-muted-foreground">Avatar not found.</p>
                <Link href="/avatars">
                  <Button className="mt-4">Go to Avatars</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}