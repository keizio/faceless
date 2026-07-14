"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/useNotifications";

const TYPE_ICONS: Record<string, string> = {
  content_generated: "✅",
  content_failed: "❌",
  avatar_generated: "🖼️",
  avatar_failed: "❌",
  system: "🔔",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleNotificationClick(notification: { id: string; read: boolean; link: string | null }) {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setOpen(false);
  }

  function handleMarkAllAsRead() {
    markAllAsRead.mutate();
  }

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        onClick={() => setOpen(!open)}
        variant="ghost"
        size="icon"
        className="relative touch-target text-primary"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <Card className="absolute right-0 top-full z-50 mt-2 w-80 border-border shadow-xl sm:right-0 sm:w-80 max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:w-auto">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No notifications
                </p>
              </div>
            ) : (
              notifications.map((n: {
                id: string;
                type: string;
                title: string;
                message: string;
                link: string | null;
                read: boolean;
                createdAt: string;
              }) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="mt-0.5 shrink-0 text-base">
                    {TYPE_ICONS[n.type] || "🔔"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-muted-foreground/70">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}