"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { useTemplate } from "@/hooks/useTemplates";
import { useProjects } from "@/hooks/useProjects";
import { useAvatars } from "@/hooks/useAvatars";
import { PLATFORM_SPECS, LANGUAGES } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, ChevronLeft, User } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateContent } from "@/hooks/useContents";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: template, isLoading } = useTemplate(id);
  const { data: projects } = useProjects();
  const { data: userProfile } = useUserProfile();
  const router = useRouter();

  const { data: avatars } = useAvatars();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    "generic",
  );
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>(
    "16:9",
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    "en",
  );
  const [selectedContentType, setSelectedContentType] = useState<string>("image");
  const [templateInputs, setTemplateInputs] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (template?.defaultContentType) setSelectedContentType(template.defaultContentType);
    if (template?.defaultPlatform) setSelectedPlatform(template.defaultPlatform);
    if (template?.defaultAspectRatio) setSelectedAspectRatio(template.defaultAspectRatio);
  }, [template]);

  useEffect(() => {
    if (userProfile?.language) setSelectedLanguage(userProfile.language);
  }, [userProfile]);

  const createContent = useCreateContent(selectedProjectId);

  if (isLoading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  if (!template) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <Card className="flex flex-col items-center py-12 text-center border-border/50">
            <CardContent>
              <p className="text-muted-foreground">Template not found.</p>
              <Link href="/templates">
                <Button className="mt-4">Browse Templates</Button>
              </Link>
            </CardContent>
          </Card>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  const platformSpecs = PLATFORM_SPECS[selectedPlatform as keyof typeof PLATFORM_SPECS];
  const aspectRatios = platformSpecs?.aspectRatios ?? ["16:9"];

  const OUTPUT_TYPE_LABELS: Record<string, string> = {
    image: "Image",
    slide: "Slide",
    video: "Video",
    text: "Text",
  };

  const buildPrompt = (): string => {
    const parts: string[] = [];
    for (const field of template.inputFields) {
      const value = templateInputs[field.id];
      if (value && typeof value === "string" && value.trim()) {
        parts.push(`${field.label}: ${value}`);
      } else if (value && (Array.isArray(value) || typeof value === "object")) {
        const jsonStr = JSON.stringify(value);
        if (jsonStr && jsonStr !== "{}" && jsonStr !== "[]") {
          parts.push(`${field.label}: ${jsonStr}`);
        }
      }
    }
    return parts.join("\n") || template.description;
  };

  const handleCreate = () => {
    if (!selectedProjectId) return;

    const prompt = buildPrompt();
    createContent.mutate(
      {
        type: selectedContentType,
        platform: selectedPlatform,
        aspectRatio: selectedAspectRatio,
        language: selectedLanguage,
        prompt,
        title: `${template.name} - ${prompt.slice(0, 50)}`,
        avatarId: selectedAvatarId || undefined,
        templateId: template.id,
        templateInputs,
      },
      {
        onSuccess: (result) => {
          router.push(`/contents/${result.content.id}`);
        },
      },
    );
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-6 overflow-safe-mobile">
          <div>
            <Link
              href="/templates"
              className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Templates
            </Link>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {template.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {template.description}
            </p>
          </div>

          <Card className="glass depth-2 border-border/50">
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Project
                </label>
                <Select
                  value={selectedProjectId}
                  onValueChange={(v) => v && setSelectedProjectId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map(
                      (project: { id: string; name: string }) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Avatar <span className="text-muted-foreground/50">(recommended for POV)</span>
                </label>
                <Select value={selectedAvatarId} onValueChange={(v) => v && setSelectedAvatarId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No avatar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No avatar</SelectItem>
                    {avatars?.map((avatar: { id: string; name: string }) => (
                      <SelectItem key={avatar.id} value={avatar.id}>
                        <span className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {avatar.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {template.supportedContentTypes.length > 1 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Content Type
                  </label>
                  <Select
                    value={selectedContentType}
                    onValueChange={(v) => v && setSelectedContentType(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {template.supportedContentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {OUTPUT_TYPE_LABELS[type] ?? type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Platform
                  </label>
                  <Select
                    value={selectedPlatform}
                    onValueChange={(v) => {
                      if (!v) return;
                      setSelectedPlatform(v);
                      const specs = PLATFORM_SPECS[v as keyof typeof PLATFORM_SPECS];
                      setSelectedAspectRatio(specs?.aspectRatios[0] ?? "16:9");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {template.supportedPlatforms.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Aspect Ratio
                  </label>
                  <div className="flex gap-1.5">
                    {aspectRatios.map((ratio) => (
                      <Button
                        key={ratio}
                        onClick={() => setSelectedAspectRatio(ratio)}
                        variant={
                          selectedAspectRatio === ratio ? "default" : "outline"
                        }
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        {ratio}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Language
                  </label>
                  <Select
                    value={selectedLanguage}
                    onValueChange={(v) => v && setSelectedLanguage(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TemplateForm
                template={template}
                inputs={templateInputs}
                onChange={setTemplateInputs}
              />

              <Button
                onClick={handleCreate}
                disabled={
                  !selectedProjectId || createContent.isPending
                }
                className="w-full"
              >
                {createContent.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Content
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
