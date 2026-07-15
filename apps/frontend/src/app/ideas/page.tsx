"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useIdeas, useGenerateIdeas } from "@/hooks/useIdeas";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LANGUAGES } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreateContentForm } from "@/components/CreateContentForm";
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  Hash,
  Globe,
  ExternalLink,
  Image,
  Video,
  Presentation,
  FileText,
} from "lucide-react";
import type { Idea } from "@faceless/shared";

const CONTENT_TYPE_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  image: { label: "Image", icon: <Image className="h-3 w-3" /> },
  video: { label: "Video", icon: <Video className="h-3 w-3" /> },
  slide: { label: "Slide", icon: <Presentation className="h-3 w-3" /> },
  text: { label: "Text", icon: <FileText className="h-3 w-3" /> },
};

const PLATFORM_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  tiktok: { label: "TikTok", icon: <Globe className="h-3 w-3" /> },
  instagram: { label: "Instagram", icon: <Globe className="h-3 w-3" /> },
  facebook: { label: "Facebook", icon: <Globe className="h-3 w-3" /> },
  twitter: { label: "Twitter/X", icon: <Globe className="h-3 w-3" /> },
  generic: { label: "Generic", icon: <Globe className="h-3 w-3" /> },
};

function todayDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function IdeaCard({ idea, onUse }: { idea: Idea; onUse: () => void }) {
  const contentType = idea.contentType ? CONTENT_TYPE_MAP[idea.contentType] : null;
  const platform = idea.platform ? PLATFORM_MAP[idea.platform] : null;

  return (
    <Card className="glass depth-2 border-border/50 hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-2 mb-2">
          <TrendingUp className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <h3 className="text-sm font-semibold text-foreground leading-snug">
            {idea.topic}
          </h3>
        </div>

        {idea.description && (
          <p className="text-xs text-muted-foreground/80 mb-3 line-clamp-2 leading-relaxed">
            {idea.description}
          </p>
        )}

        {idea.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {idea.hashtags.slice(0, 6).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                <Hash className="h-2.5 w-2.5 mr-0.5" />
                {tag.replace("#", "")}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {contentType && (
            <Badge variant="outline" className="text-[10px] gap-1">
              {contentType.icon}
              {contentType.label}
            </Badge>
          )}
          {platform && (
            <Badge variant="outline" className="text-[10px] gap-1">
              {platform.icon}
              {platform.label}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={onUse}
          >
            <Sparkles className="h-3 w-3" />
            Use this idea
          </Button>
          {idea.sourceUrl && (
            <a
              href={idea.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IdeaSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-10 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function IdeasPage() {
  const { data: userProfile } = useUserProfile();
  const [language, setLanguage] = useState(userProfile?.language ?? "en");
  const [date] = useState(todayDate());
  const { data: ideas, isLoading } = useIdeas(language, date);
  const generateIdeas = useGenerateIdeas(language, date);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Ideas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trending content ideas for today. Pick one and generate content instantly.
          </p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
            <SelectTrigger>
              <SelectValue className={"text-primary"} />
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

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <IdeaSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && ideas && ideas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lightbulb className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No ideas yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Ideas are generated daily at midnight. Check back later or switch to a different language.
          </p>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => generateIdeas.mutate()}
            disabled={generateIdeas.isPending}
          >
            {generateIdeas.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Generate ideas
              </span>
            )}
          </Button>
        </div>
      )}

      {!isLoading && ideas && ideas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onUse={() => setSelectedIdea(idea)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!selectedIdea} onOpenChange={(open) => { if (!open) setSelectedIdea(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Create from idea
            </DialogTitle>
            <DialogDescription>
              {selectedIdea?.topic}
            </DialogDescription>
          </DialogHeader>
          {selectedIdea && (
            <CreateContentForm
              initialValues={{
                prompt: `${selectedIdea.topic}${selectedIdea.description ? ` - ${selectedIdea.description.slice(0, 200)}` : ""}`,
                type: selectedIdea.contentType ?? undefined,
                platform: selectedIdea.platform ?? undefined,
              }}
              onSuccess={() => setSelectedIdea(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function IdeasPageWrapper() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <IdeasPage />
      </DashboardLayout>
    </AuthGuard>
  );
}