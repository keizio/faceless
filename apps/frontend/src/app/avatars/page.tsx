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
import { User, Plus, Sparkles, ChevronRight, Search } from "lucide-react";

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
        <div className="animate-fade-in space-y-6">
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

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search avatars..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Avatar grid */}
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
            <div className="isometric-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((avatar: {
                id: string;
                name: string;
                age: number | null;
                gender: string | null;
                speechStyle: string | null;
                referenceImageUrl: string | null;
                characterSheetUrl: string | null;
                createdAt: string;
              }) => (
                <Link
                  key={avatar.id}
                  href={`/avatars/${avatar.id}`}
                  className="isometric-card"
                >
                  <Card className="h-full border-border/50 depth-2 group cursor-pointer transition-all duration-200 hover:bg-muted/50">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-[hsl(var(--accent-secondary))]/20">
                          {avatar.referenceImageUrl ? (
                            <img
                              src={avatar.referenceImageUrl}
                              alt={avatar.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <h3 className="mt-3 font-semibold text-foreground">
                        {avatar.name}
                      </h3>
                      <div className="mt-1 space-y-1">
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
                            <Sparkles className="h-3 w-3" />
                            Character sheet generated
                          </p>
                        )}
                      </div>
                    </CardContent>
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