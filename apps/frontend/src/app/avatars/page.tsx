"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ProjectGridSkeleton } from "@/components/GridSkeleton";
import { useAvatars } from "@/hooks/useAvatars";
import { SPEECH_STYLE_LABELS, getAgeRangeLabel } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useMemo } from "react";
import { User, Plus, Sparkles, Search } from "lucide-react";

export default function AvatarsPage() {
  const { data: avatars, isLoading } = useAvatars();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!avatars) return [];
    if (!search.trim()) return avatars;
    const q = search.toLowerCase();
    return avatars.filter(
      (a: { name: string; speechStyle?: string | null }) =>
        a.name.toLowerCase().includes(q) ||
        (a.speechStyle && a.speechStyle.toLowerCase().includes(q)),
    );
  }, [avatars, search]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-4">
          <PageHeader
            title="Avatars"
            subtitle="Personas and character profiles for your content"
            icon={<User className="h-5 w-5 text-primary" />}
            actions={
              <Link href="/avatars/new">
                <Button className="shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Create Avatar</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </Link>
            }
          />

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search avatars..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          {isLoading ? (
            <ProjectGridSkeleton count={3} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<User className="h-8 w-8 text-primary" />}
              title={search ? "No avatars match your search" : "No avatars yet"}
              description={search ? "Try a different search term" : "Create an avatar to use as a consistent character in your generated content"}
              action={
                !search ? (
                  <Link href="/avatars/new">
                    <Button>Create Your First Avatar</Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((avatar: {
                id: string;
                name: string;
                age: number | null;
                gender: string | null;
                speechStyle: string | null;
                referenceImageUrl: string | null;
                characterSheetUrl: string | null;
                portraitUrl: string | null;
                createdAt: string;
              }) => (
                <Link
                  key={avatar.id}
                  href={`/avatars/${avatar.id}`}
                >
                  <Card className="h-full border-border/50 cursor-pointer transition-all duration-200 hover:bg-muted/50 overflow-hidden">
                    <div className="relative aspect-[3/4] bg-gradient-to-br from-primary/5 to-[hsl(var(--accent-secondary))]/5">
                      {avatar.portraitUrl || avatar.referenceImageUrl ? (
                        <img
                          src={avatar.portraitUrl ?? avatar.referenceImageUrl ?? ""}
                          alt={avatar.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                      {avatar.characterSheetUrl && (
                        <div className="absolute top-2 right-2 rounded-full bg-[hsl(var(--success))]/90 px-2 py-0.5 text-[10px] font-medium text-white">
                          <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
                          Sheet
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-medium text-foreground truncate">
                        {avatar.name}
                      </p>
                      {(avatar.age || avatar.gender || avatar.speechStyle) && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70 truncate">
                          {[getAgeRangeLabel(avatar.age), avatar.gender].filter(Boolean).join(" · ")}
                          {avatar.speechStyle && (
                            <> · {SPEECH_STYLE_LABELS[avatar.speechStyle as keyof typeof SPEECH_STYLE_LABELS] || avatar.speechStyle}</>
                          )}
                        </p>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}