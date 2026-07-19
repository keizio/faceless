"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GenerationProgress } from "@/components/GenerationProgress";
import { useAvatar, useUpdateAvatar, useDeleteAvatar, useGenerateAvatar, useUploadAvatarImage } from "@/hooks/useAvatars";
import { SPEECH_STYLE_LABELS, GENDER_OPTIONS, AGE_RANGES, getAgeRangeLabel, getAgeRangeValue } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  ChevronLeft,
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
  const [portraitUrl, setPortraitUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!avatar) return;
    setName(avatar.name);
    setAge(getAgeRangeValue(avatar.age));
    setGender(avatar.gender || "");
    setSpeechStyle(avatar.speechStyle || "");
    setImageUrl(avatar.referenceImageUrl || "");
    setPortraitUrl(avatar.portraitUrl || "");
    setCustomPrompt((avatar.metadata as Record<string, unknown> | null)?.customPrompt as string || "");
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
        portraitUrl: portraitUrl || undefined,
        customPrompt: customPrompt.trim() || undefined,
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
            <div className="space-y-3">
              <div className="skeleton h-6 w-48 rounded-lg bg-muted" />
              <div className="skeleton h-48 w-full rounded-lg bg-muted" />
            </div>
          ) : avatar ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push("/avatars")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg font-bold text-foreground truncate">
                  {avatar.name}
                </h1>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    onClick={handleGenerate}
                    disabled={generateAvatar.isPending || (!!activeJobId && !avatar?.characterSheetUrl)}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    {generateAvatar.isPending ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    Generate
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <Card className="border-border/50 overflow-hidden">
                    <div className="flex items-start gap-3 p-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-[hsl(var(--accent-secondary))]/10 overflow-hidden">
                        {avatar.portraitUrl || avatar.referenceImageUrl ? (
                          <img
                            src={avatar.portraitUrl ?? avatar.referenceImageUrl ?? ""}
                            alt={avatar.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-foreground truncate">{avatar.name}</p>
                        {(avatar.age || avatar.gender) && (
                          <p className="text-xs text-muted-foreground/70">
                            {[getAgeRangeLabel(avatar.age), avatar.gender].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {avatar.speechStyle && (
                          <p className="text-xs text-muted-foreground/70">
                            {SPEECH_STYLE_LABELS[avatar.speechStyle as keyof typeof SPEECH_STYLE_LABELS] || avatar.speechStyle}
                          </p>
                        )}
                        {avatar.characterSheetUrl && (
                          <p className="flex items-center gap-1 text-xs text-[hsl(var(--success))]">
                            <Check className="h-3 w-3" />
                            Character sheet ready
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>

                  {activeJobId && (
                    <GenerationProgress jobId={activeJobId} />
                  )}

                  {avatar.characterSheetUrl && (
                    <Card className="border-border/50">
                      <CardContent className="p-3">
                        <p className="mb-2 text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-primary" />
                          Character Sheet
                        </p>
                        <img
                          src={avatar.characterSheetUrl}
                          alt={`${avatar.name} character sheet`}
                          className="w-full rounded-md"
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="lg:col-span-3">
                  <Card className="border-border/50">
                    <CardContent className="p-3.5">
                      <h2 className="mb-3 text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground/70">
                        Edit Avatar
                      </h2>
                      <div className="space-y-2.5">
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-muted-foreground">
                            Name
                          </label>
                          <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Avatar name"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="mb-0.5 block text-xs font-medium text-muted-foreground">
                              Age Range
                            </label>
                            <Select value={age} onValueChange={(v) => v && setAge(v)}>
                              <SelectTrigger className="h-8 text-sm">
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
                            <label className="mb-0.5 block text-xs font-medium text-muted-foreground">
                              Gender
                            </label>
                            <Select value={gender} onValueChange={(v) => v && setGender(v)}>
                              <SelectTrigger className="h-8 text-sm">
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
                            <label className="mb-0.5 block text-xs font-medium text-muted-foreground">
                              Speech Style
                            </label>
                            <Select value={speechStyle} onValueChange={(v) => v && setSpeechStyle(v)}>
                              <SelectTrigger className="h-8 text-sm">
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
                          <label className="mb-0.5 block text-xs font-medium text-muted-foreground">
                            Reference Image
                          </label>
                          <div className="flex gap-1.5">
                            <Input
                              type="url"
                              value={imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              placeholder="https://cdn.solutip.com/..."
                              className="flex-1 h-8 text-sm"
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
                              className="h-8 w-8 shrink-0"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadAvatarImage.isPending}
                              title="Upload image"
                            >
                              {uploadAvatarImage.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-muted-foreground">
                            Portrait Image URL <span className="text-muted-foreground/50">(optional)</span>
                          </label>
                          <Input
                            type="url"
                            value={portraitUrl}
                            onChange={(e) => setPortraitUrl(e.target.value)}
                            placeholder="https://cdn.solutip.com/..."
                            className="h-8 text-sm"
                          />
                          {avatar.portraitUrl && portraitUrl !== avatar.portraitUrl && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground/50">
                              Set to override the AI-generated portrait
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-muted-foreground">
                            Custom Prompt <span className="text-muted-foreground/50">(optional)</span>
                          </label>
                          <Textarea
                            value={customPrompt}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
                            placeholder="Describe the character's personality, background, voice, or any special traits..."
                            className="min-h-[70px] resize-y text-sm"
                          />
                          <p className="mt-0.5 text-[11px] text-muted-foreground/50">
                            Used when generating the avatar's character sheet. Max 1000 characters.
                          </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            onClick={handleSave}
                            disabled={updateAvatar.isPending || !name.trim() || uploadAvatarImage.isPending}
                            size="sm"
                            className="h-8 text-xs"
                          >
                            {updateAvatar.isPending ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Delete Avatar?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. All avatar data will be permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" size="sm">Cancel</Button>
                    <Button onClick={() => { handleDelete(); setShowDeleteConfirm(false); }} variant="destructive" size="sm" disabled={deleteAvatar.isPending}>
                      {deleteAvatar.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Card className="flex flex-col items-center py-8 text-center border-border/50">
              <CardContent>
                <p className="text-sm text-muted-foreground">Avatar not found.</p>
                <Link href="/avatars">
                  <Button className="mt-3" size="sm">Go to Avatars</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}