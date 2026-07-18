"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useIdeas, useGenerateIdeas } from "@/hooks/useIdeas";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LANGUAGES, CREDIT_COSTS } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Hash,
  Image as ImageIcon,
  Video,
  Presentation,
  FileText,
  Wand2,
  Calendar,
} from "lucide-react";
import type { IdeaItem, Idea } from "@faceless/shared";

const CONTENT_TYPE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  image: { label: "Image", icon: <ImageIcon className="h-3 w-3" />, color: "text-blue-500" },
  video: { label: "Video", icon: <Video className="h-3 w-3" />, color: "text-purple-500" },
  slide: { label: "Slide", icon: <Presentation className="h-3 w-3" />, color: "text-green-500" },
  text: { label: "Text", icon: <FileText className="h-3 w-3" />, color: "text-orange-500" },
};

const PLATFORM_MAP: Record<string, { label: string; color: string }> = {
  tiktok: { label: "TikTok", color: "bg-pink-500/10 text-pink-500 border-pink-500/20" },
  instagram: { label: "Instagram", color: "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-500 border-purple-500/20" },
  facebook: { label: "Facebook", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  twitter: { label: "Twitter/X", color: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  generic: { label: "Generic", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
};

function IdeaItemCard({
  item,
  onUse,
}: {
  item: IdeaItem;
  onUse: () => void;
}) {
  const contentType = CONTENT_TYPE_MAP[item.contentType];
  const platform = PLATFORM_MAP[item.platform];

  return (
    <Card className="group relative overflow-hidden border-border/50 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {item.topic}
            </h3>
          </div>
        </div>

        {item.description && (
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {item.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.hashtags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 h-5 font-normal">
                <Hash className="h-2.5 w-2.5 mr-0.5 opacity-60" />
                {tag.replace("#", "")}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {contentType && (
            <Badge variant="outline" className={`text-[10px] gap-1 ${contentType.color}`}>
              {contentType.icon}
              {contentType.label}
            </Badge>
          )}
          {platform && (
            <Badge variant="outline" className={`text-[10px] ${platform.color}`}>
              {platform.label}
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          className="w-full gap-1.5 text-xs font-medium"
          onClick={onUse}
        >
          <Sparkles className="h-3 w-3" />
          Use this idea
        </Button>
      </CardContent>
    </Card>
  );
}

function IdeaSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-2.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 flex-1" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

function GenerationBatch({
  idea,
  onUseIdea,
}: {
  idea: Idea;
  onUseIdea: (item: IdeaItem) => void;
}) {
  const date = new Date(idea.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Wand2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {idea.prompt}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {idea.ideas.length} ideas
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {idea.ideas.map((item, idx) => (
          <IdeaItemCard
            key={idx}
            item={item}
            onUse={() => onUseIdea(item)}
          />
        ))}
      </div>
    </div>
  );
}

function IdeasPage() {
  const { data: userProfile } = useUserProfile();
  const [language, setLanguage] = useState(userProfile?.language ?? "en");
  const [prompt, setPrompt] = useState("");
  const { data, isLoading } = useIdeas();
  const generateIdeas = useGenerateIdeas();
  const [selectedItem, setSelectedItem] = useState<IdeaItem | null>(null);

  const allIdeas = data?.ideas ?? [];

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generateIdeas.mutate(
      { prompt: prompt.trim(), language },
      { onSuccess: () => setPrompt("") }
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Ideas"
        subtitle="Generate content ideas for your niche"
        icon={<Lightbulb className="h-5 w-5 text-primary" />}
      />

      <Card className="border-border/50 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Generate New Ideas
              </h2>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {CREDIT_COSTS.idea} credits
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="e.g., fitness tips, vegan recipes, tech reviews..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGenerate();
                  }}
                  className="w-full"
                  disabled={generateIdeas.isPending}
                />
              </div>
              <div className="w-full sm:w-44">
                <Select value={language} onValueChange={(v) => v && setLanguage(v)} disabled={generateIdeas.isPending}>
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
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generateIdeas.isPending}
                className="gap-2 min-w-[140px]"
              >
                {generateIdeas.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <IdeaSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {!isLoading && allIdeas.length === 0 && (
        <EmptyState
          icon={<Lightbulb className="h-8 w-8 text-primary" />}
          title="No ideas yet"
          description="Type a niche above and generate your first batch of content ideas!"
        />
      )}

      {!isLoading && allIdeas.length > 0 && (
        <div className="space-y-8">
          {allIdeas.map((idea) => (
            <GenerationBatch
              key={idea.id}
              idea={idea}
              onUseIdea={setSelectedItem}
            />
          ))}
        </div>
      )}

      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Create from idea
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.topic}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <CreateContentForm
              initialValues={{
                prompt: `${selectedItem.topic}${selectedItem.description ? ` - ${selectedItem.description.slice(0, 200)}` : ""}`,
                type: selectedItem.contentType,
                platform: selectedItem.platform,
              }}
              onSuccess={() => setSelectedItem(null)}
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
