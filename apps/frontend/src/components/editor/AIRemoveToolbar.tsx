"use client";

import { useCanvasEditorStore } from "@/stores/canvas-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Undo2, Trash2, Wand2 } from "lucide-react";

interface AIRemoveToolbarProps {
  isProcessing: boolean;
  onRemove: () => void;
  onUndoStroke: () => void;
  onClearMask: () => void;
}

export function AIRemoveToolbar({
  isProcessing,
  onRemove,
  onUndoStroke,
  onClearMask,
}: AIRemoveToolbarProps) {
  const brushSize = useCanvasEditorStore((s) => s.brushSize);
  const setBrushSize = useCanvasEditorStore((s) => s.setBrushSize);

  return (
    <div
      className="relative z-10 flex flex-wrap items-center gap-3 p-3 border-b border-border/50 bg-background"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Brush</Label>
        <input
          type="range"
          min={5}
          max={50}
          step={1}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-24"
        />
        <span className="text-xs text-muted-foreground w-6">{brushSize}px</span>
      </div>

      <div className="h-5 w-px bg-border/50" />

      <Button
        variant="default"
        size="sm"
        onClick={onRemove}
        disabled={isProcessing}
        className="h-8 text-xs"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Wand2 className="h-3.5 w-3.5 mr-1" />
            Remove
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onUndoStroke}
        disabled={isProcessing}
        className="h-8 text-xs"
      >
        <Undo2 className="h-3.5 w-3.5 mr-1" />
        Undo Stroke
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onClearMask}
        disabled={isProcessing}
        className="h-8 text-xs"
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Clear Mask
      </Button>
    </div>
  );
}
