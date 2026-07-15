"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useCreateAvatar } from "@/hooks/useAvatars";
import { SPEECH_STYLE_LABELS, GENDER_OPTIONS, AGE_RANGES } from "@faceless/shared";
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
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User } from "lucide-react";

const SPEECH_STYLES = Object.keys(SPEECH_STYLE_LABELS);

export default function NewAvatarPage() {
  const router = useRouter();
  const createAvatar = useCreateAvatar();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [speechStyle, setSpeechStyle] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createAvatar.mutate(
      {
        name: name.trim(),
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        speechStyle: speechStyle || undefined,
        referenceImageUrl: imageUrl || undefined,
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
                      Reference Image URL <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <Input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://cdn.solutip.com/..."
                      className="h-9 text-sm"
                    />
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