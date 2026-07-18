"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateContent } from "@/hooks/useContents";
import { useProjects } from "@/hooks/useProjects";
import { useAvatars } from "@/hooks/useAvatars";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PLATFORM_SPECS, LANGUAGES } from "@faceless/shared";
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
import { Image, Presentation, Video, FileText, Sparkles, ChevronDown, User } from "lucide-react";

const CONTENT_TYPES = [
  { value: "image", label: "Image", icon: Image },
  { value: "slide", label: "Slide", icon: Presentation },
  { value: "video", label: "Video", icon: Video },
  { value: "text", label: "Text", icon: FileText },
] as const;

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter/X" },
  { value: "generic", label: "Generic" },
] as const;

const ASPECT_RATIO_ICONS: Record<string, React.ReactNode> = {
  "9:16": (
    <svg viewBox="0 0 9 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="7" height="14" rx="1" />
    </svg>
  ),
  "1:1": (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="14" height="14" rx="1" />
    </svg>
  ),
  "4:5": (
    <svg viewBox="0 0 8 10" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="8" rx="1" />
    </svg>
  ),
  "16:9": (
    <svg viewBox="0 0 16 9" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="14" height="7" rx="1" />
    </svg>
  ),
};

interface CreateContentFormProps {
  onSuccess?: () => void;
  initialValues?: {
    prompt?: string;
    type?: "image" | "slide" | "video" | "text";
    platform?: string;
  };
}

export function CreateContentForm({ onSuccess, initialValues }: CreateContentFormProps) {
  const router = useRouter();
  const { data: projectsData } = useProjects();
  const projects = projectsData?.projects;
  const { data: avatars } = useAvatars();
  const { data: userProfile } = useUserProfile();
  
  const [projectId, setProjectId] = useState<string>("");
  const [type, setType] = useState<"image" | "slide" | "video" | "text" | null>(initialValues?.type ?? null);
  const [prompt, setPrompt] = useState(initialValues?.prompt ?? "");
  const [platform, setPlatform] = useState(initialValues?.platform ?? "generic");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [language, setLanguage] = useState("en");
  const [title, setTitle] = useState("");
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState(3);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createContent = useCreateContent(projectId || null);

  useEffect(() => {
    if (userProfile?.language) {
      setLanguage(userProfile.language);
    }
  }, [userProfile?.language]);

  useEffect(() => {
    if (initialValues?.type) setType(initialValues.type);
    if (initialValues?.prompt) setPrompt(initialValues.prompt);
    if (initialValues?.platform) {
      setPlatform(initialValues.platform);
      const specs = PLATFORM_SPECS[initialValues.platform as keyof typeof PLATFORM_SPECS];
      if (specs) setAspectRatio(specs.aspectRatios[0]);
    }
  }, [initialValues?.type, initialValues?.prompt, initialValues?.platform]);

  const platformSpecs = PLATFORM_SPECS[platform as keyof typeof PLATFORM_SPECS];
  const aspectRatios = platformSpecs?.aspectRatios ?? ["16:9"];

  const handlePlatformChange = (newPlatform: string | null) => {
    if (!newPlatform) return;
    setPlatform(newPlatform);
    const specs = PLATFORM_SPECS[newPlatform as keyof typeof PLATFORM_SPECS];
    setAspectRatio(specs?.aspectRatios[0] ?? "16:9");
  };

  const handleCreate = () => {
    if (!prompt || !type) return;
    createContent.mutate(
      {
        type,
        platform,
        aspectRatio,
        language,
        prompt,
        title: title || undefined,
        avatarId: avatarId || undefined,
        slideCount: type === "slide" ? slideCount : undefined,
      },
      {
        onSuccess: (result) => {
          setProjectId("");
          setType(null);
          setPrompt("");
          setPlatform("generic");
          setAspectRatio("16:9");
          setLanguage(userProfile?.language ?? "en");
          setTitle("");
          setAvatarId(null);
          setSlideCount(3);
          setShowAdvanced(false);
          onSuccess?.();
          router.push(`/contents/${result.content.id}`);
        },
      },
    );
  };

  return (
    <Card className="glass depth-2 border-border/50">
      <CardContent className="p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Create Content
        </h2>

        <div className="space-y-3.5">
          {/* Project Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Project
            </label>
            <Select 
              value={projectId} 
              onValueChange={(v) => setProjectId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {projects?.map((project: { id: string; name: string }) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Content Type
            </label>
            <div className="flex gap-1.5">
              {CONTENT_TYPES.map((ct) => {
                const Icon = ct.icon;
                return (
                  <Button
                    key={ct.value}
                    onClick={() => setType(ct.value)}
                    variant={type === ct.value ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1.5 px-2 text-xs sm:text-sm"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{ct.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Prompt
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              rows={3}
              className="min-h-[72px]"
            />
            <p className="mt-1 text-[11px] text-muted-foreground/70 text-right">
              {prompt.length}/2000
            </p>
          </div>

          {/* Platform + Aspect Ratio + Language */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Platform
              </label>
              <Select value={platform} onValueChange={handlePlatformChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
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
                    onClick={() => setAspectRatio(ratio)}
                    variant={aspectRatio === ratio ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                  >
                    {ASPECT_RATIO_ICONS[ratio]}
                    {ratio}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Language
              </label>
              <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
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

          {/* Advanced toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              Advanced options
            </button>
          </div>

          {/* Advanced fields */}
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Title <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My awesome content"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Avatar <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <Select value={avatarId ?? ""} onValueChange={(v) => setAvatarId(v || null)}>
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
              {type === "slide" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Number of Slides
                  </label>
                  <div className="flex gap-1.5">
                    {[3, 5, 10].map((n) => (
                      <Button
                        key={n}
                        onClick={() => setSlideCount(n)}
                        variant={slideCount === n ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleCreate}
            disabled={!prompt || !type || createContent.isPending}
            className="w-full mt-1"
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
        </div>
      </CardContent>
    </Card>
  );
}
