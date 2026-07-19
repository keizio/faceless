"use client";

import { useEffect, useRef } from "react";
import {
  Trash2,
  Copy,
  ClipboardPaste,
  ArrowUpToLine,
  ArrowDownToLine,
  Lock,
  Unlock,
  CopyPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextMenuItem {
  label: string;
  icon: typeof Trash2;
  action: string;
  disabled?: boolean;
  destructive?: boolean;
}

interface CanvasContextMenuProps {
  x: number;
  y: number;
  layerId: string;
  layerType: "text" | "shape";
  isLocked: boolean;
  hasClipboard: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

export function CanvasContextMenu({
  x,
  y,
  isLocked,
  hasClipboard,
  onClose,
  onAction,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const items: ContextMenuItem[] = [
    { label: "Copy", icon: Copy, action: "copy" },
    { label: "Paste", icon: ClipboardPaste, action: "paste", disabled: !hasClipboard },
    { label: "Duplicate", icon: CopyPlus, action: "duplicate" },
    { label: "Bring to Front", icon: ArrowUpToLine, action: "bringToFront" },
    { label: "Send to Back", icon: ArrowDownToLine, action: "sendToBack" },
    { label: isLocked ? "Unlock" : "Lock", icon: isLocked ? Unlock : Lock, action: "toggleLock" },
    { label: "Delete", icon: Trash2, action: "delete", destructive: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.action}
          disabled={item.disabled}
          onClick={() => {
            onAction(item.action);
            onClose();
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "disabled:pointer-events-none disabled:opacity-50",
            item.destructive && "text-destructive hover:text-destructive",
          )}
        >
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
