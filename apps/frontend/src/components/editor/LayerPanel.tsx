"use client";

import { useCanvasEditorStore } from "@/stores/canvas-editor";
import { Button } from "@/components/ui/button";
import { Plus, Eye, EyeOff, Lock, Unlock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayerPanelProps {
  onAddText: () => void;
  onToggleVisibility: (layerId: string, visible: boolean) => void;
  onToggleLock: (layerId: string, locked: boolean) => void;
  onRemoveLayer: (layerId: string) => void;
  onSelectLayer: (layerId: string) => void;
}

export function LayerPanel({
  onAddText,
  onToggleVisibility,
  onToggleLock,
  onRemoveLayer,
  onSelectLayer,
}: LayerPanelProps) {
  const textLayers = useCanvasEditorStore((s) => s.textLayers);
  const activeSlideIndex = useCanvasEditorStore((s) => s.activeSlideIndex);
  const selectedLayerId = useCanvasEditorStore((s) => s.selectedLayerId);

  const slideKey = `slide-${activeSlideIndex}`;
  const layers = textLayers[slideKey] || [];

  return (
    <div className="flex flex-col gap-1 p-3 border-b border-border/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Layers ({layers.length})
        </h3>
        <Button variant="outline" size="sm" onClick={onAddText} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add Text
        </Button>
      </div>

      <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
        {layers.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No text layers. Click &quot;Add Text&quot; to create one.
          </p>
        )}
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
              selectedLayerId === layer.id
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-muted/50 border border-transparent",
            )}
            onClick={() => onSelectLayer(layer.id)}
          >
            <span className="flex-1 text-xs truncate text-foreground">
              {layer.text || "Empty text"}
            </span>
            {layer.source === "ai" && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                AI
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(layer.id, !layer.visible);
              }}
              className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
              aria-label={layer.visible ? "Hide layer" : "Show layer"}
            >
              {layer.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock(layer.id, !layer.locked);
              }}
              className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
              aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
            >
              {layer.locked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveLayer(layer.id);
              }}
              className="p-0.5 hover:text-destructive text-muted-foreground transition-colors"
              aria-label="Delete layer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
