"use client";

import { useCanvasEditorStore } from "@/stores/canvas-editor";
import type { ToolMode } from "@/stores/canvas-editor";
import { Button } from "@/components/ui/button";
import { MousePointer2, Type, Square, Eraser, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tools: { mode: ToolMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: "select", icon: MousePointer2, label: "Select" },
  { mode: "text", icon: Type, label: "Text" },
  { mode: "shape", icon: Square, label: "Shapes" },
  { mode: "eraser", icon: Eraser, label: "Eraser" },
  { mode: "ai-remove", icon: Wand2, label: "AI Remove" },
];

export function ToolModeBar() {
  const activeTool = useCanvasEditorStore((s) => s.activeTool);
  const setActiveTool = useCanvasEditorStore((s) => s.setActiveTool);

  return (
    <div className="flex flex-col gap-1 p-2 border-r border-border/50 bg-background">
      {tools.map(({ mode, icon: Icon, label }) => (
        <Button
          key={mode}
          variant={activeTool === mode ? "default" : "ghost"}
          size="icon"
          className={cn(
            "h-9 w-9",
            activeTool === mode ? "shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTool(mode)}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
