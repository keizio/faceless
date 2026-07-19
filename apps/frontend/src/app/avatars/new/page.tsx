"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useCreateAvatar } from "@/hooks/useAvatars";
import { SPEECH_STYLE_LABELS, GENDER_OPTIONS, AGE_RANGES } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User, Upload, Loader2 } from "lucide-react";

const SPEECH_STYLES = Object.keys(SPEECH_STYLE_LABELS);

export default function NewAvatarPage() {
  const router = useRouter();
  const createAvatar = useCreateAvatar();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [speechStyle, setSpeechStyle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createAvatar.mutate(
      {
        name: name.trim(),
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        speechStyle: speechStyle || undefined,
        referenceImageUrl: imageUrl || undefined,
        customPrompt: customPrompt.trim() || undefined,
      },
      {
        onSuccess: (avatar) => {
          router.push(`/avatars/${avatar.id}`);
        },
      },
    );
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in max-w-2xl">
          <PageHeader
            title="Create Avatar"
            subtitle="Define a persona or character for your content"
            icon={<User className="h-5 w-5 text-primary" />}
          />

          <div className="mt-6">
            <Card className="glass depth-2 border-border/50">
              <CardContent className="p-4 sm:p-5">
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex, Maya, Dr. Smith"
                      autoFocus
                      className="h-9"
                    />
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Age, Gender, Speech Style */}
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

                  <Separator className="bg-border/50" />

                  {/* Reference Image */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Reference Image <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <Label
                        htmlFor="avatar-image-upload"
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        {imageFile ? imageFile.name : "Upload an image"}
                      </Label>
                      <Input
                        id="avatar-image-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setImageFile(file);
                          setImageUploading(true);
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            const { data } = await api.post("/api/upload/image", formData, {
                              headers: { "Content-Type": "multipart/form-data" },
                            });
                            setImageUrl(data.url);
                          } catch {
                            setImageFile(null);
                          } finally {
                            setImageUploading(false);
                          }
                        }}
                      />
                      {imageUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {imageUrl && !imageUploading && (
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg border">
                          <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Custom Prompt */}
                  <Separator className="bg-border/50" />

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Custom Prompt <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
                      placeholder="Describe the character's personality, background, voice, or any special traits..."
                      className="min-h-[80px] resize-y text-sm"
                    />
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      This prompt will be used when generating the avatar's character sheet. Max 1000 characters.
                    </p>
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleCreate}
                    disabled={createAvatar.isPending || !name.trim()}
                    className="w-full"
                  >
                    {createAvatar.isPending ? "Creating..." : "Create Avatar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}