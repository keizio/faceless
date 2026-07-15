"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Image, Presentation, Video, FileText } from "lucide-react";

const TYPE_ICONS: Record<string, typeof Image> = {
  image: Image,
  slide: Presentation,
  video: Video,
  text: FileText,
};

interface ContentCardProps {
  id: string;
  title: string | null;
  type: string;
  platform: string;
  status: string;
  createdAt: string;
  thumbnailUrl: string | null;
}

export function ContentCard({
  id,
  title,
  type,
  platform,
  status,
  createdAt,
  thumbnailUrl,
}: ContentCardProps) {
  const TypeIcon = TYPE_ICONS[type] || FileText;

  return (
    <Link
      href={`/contents/${id}`}
      className="isometric-card"
    >
      <Card className="h-full border-border/50 depth-2 group cursor-pointer transition-all duration-200 hover:bg-muted/50">
        <CardContent className="p-0">
          {thumbnailUrl ? (
            <div className="relative aspect-[9/16] overflow-hidden rounded-t-lg bg-muted">
              <img
                src={thumbnailUrl}
                alt={title || "Untitled"}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <StatusBadge status={status} />
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <TypeIcon className="h-5 w-5 text-primary" />
                </div>
                <StatusBadge status={status} />
              </div>
            </div>
          )}
          <div className="p-4 pt-3">
            <h3 className="font-medium text-foreground truncate">
              {title || "Untitled"}
            </h3>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground/70 flex-wrap">
              <span className="capitalize">{type}</span>
              <span>·</span>
              <span className="capitalize">{platform}</span>
              <span>·</span>
              <span>{new Date(createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}