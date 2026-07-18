"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ContentCard } from "@/components/ContentCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ContentCardSkeleton } from "@/components/GridSkeleton";
import { useAllContents } from "@/hooks/useContents";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search, ListFilter, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";

const CONTENT_TYPE_OPTIONS = ["all", "image", "slide", "video", "text"] as const;
const STATUS_OPTIONS = ["all", "completed", "failed", "generating", "queued"] as const;
const SORT_OPTIONS = ["newest", "oldest"] as const;

export default function ContentsPage() {
  const { data: contentsData, isLoading } = useAllContents(undefined, undefined, null);
  const contents = contentsData?.contents;
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");

  const filtered = useMemo(() => {
    if (!contents) return [];
    let result = [...contents];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c: { title?: string | null; prompt?: string | null }) =>
          c.title?.toLowerCase().includes(q) || c.prompt?.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((c: { type: string }) => c.type === typeFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((c: { status: string }) => c.status === statusFilter);
    }
    result.sort((a: { createdAt: string }, b: { createdAt: string }) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === "newest" ? diff : -diff;
    });
    return result;
  }, [contents, search, typeFilter, statusFilter, sort]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-6">
          <PageHeader
            title="Contents"
            subtitle={`${filtered.length} content items without a project`}
          />

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or prompt..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <ListFilter className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
                  <SelectTrigger className="h-9 w-[110px] text-xs text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs capitalize">
                        {t === "all" ? "All Types" : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                <SelectTrigger className="h-9 w-[120px] text-xs text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">
                      {s === "all" ? "All Status" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => v && setSort(v)}>
                <SelectTrigger className="h-9 w-[120px] text-xs text-primary">
                  <ArrowUpDown className="mr-1.5 h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8 text-primary" />}
              title="No content found"
              description={search || typeFilter !== "all" || statusFilter !== "all" ? "Try adjusting your filters or search query" : "Create content without assigning it to a project to see it here"}
              action={
                !search && typeFilter === "all" && statusFilter === "all" ? (
                  <a href="/dashboard" className="text-sm text-primary hover:underline">
                    Go to Dashboard
                  </a>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(
                (content: {
                  id: string;
                  title: string | null;
                  prompt: string | null;
                  type: string;
                  platform: string;
                  status: string;
                  createdAt: string;
                  thumbnailUrl: string | null;
                }) => (
                  <ContentCard
                    key={content.id}
                    id={content.id}
                    title={content.title}
                    prompt={content.prompt}
                    type={content.type}
                    platform={content.platform}
                    status={content.status}
                    createdAt={content.createdAt}
                    thumbnailUrl={content.thumbnailUrl}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}