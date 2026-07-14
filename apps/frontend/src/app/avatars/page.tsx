"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CardSkeleton } from "@/components/Skeleton";
import { useAvatars } from "@/hooks/useAvatars";
import { SPEECH_STYLE_LABELS, getAgeRangeLabel } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { User, Plus, Sparkles, ChevronRight } from "lucide-react";

export default function AvatarsPage() {
  const { data: avatars, isLoading } = useAvatars();

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-8 overflow-safe-mobile">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">Avatars</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Personas and character profiles for your content
              </p>
            </div>
            <Link href="/avatars/new">
              <Button className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Create Avatar</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </Link>
          </div>

          {/* Avatar grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : avatars?.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center border-border/50">
              <CardContent>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-1 text-lg font-semibold text-foreground">
                  No avatars yet
                </h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Create an avatar to use as a consistent character in your generated content
                </p>
                <Link href="/avatars/new">
                  <Button>Create Your First Avatar</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="isometric-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {avatars?.map((avatar: {
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