"use client";

import { useCanvasEditorStore } from "@/stores/canvas-editor";
import type { TextLayer } from "@faceless/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Underline,
  Strikethrough,
} from "lucide-react";

const FONT_FAMILIES = [
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
];

interface TextToolbarProps {
  onUpdateLayer: (layerId: string, updates: Partial<TextLayer>) => void;
  onRemoveLayer: (layerId: string) => void;
}

export function TextToolbar({ onUpdateLayer, onRemoveLayer }: TextToolbarProps) {
  const selectedLayerId = useCanvasEditorStore((s) => s.selectedLayerId);
  const textLayers = useCanvasEditorStore((s) => s.textLayers);
  const shapeLayers = useCanvasEditorStore((s) => s.shapeLayers);
  const activeSlideIndex = useCanvasEditorStore((s) => s.activeSlideIndex);

  const slideKey = `slide-${activeSlideIndex}`;
  const layers = textLayers[slideKey] || [];
  const sLayers = shapeLayers[slideKey] || [];
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  if (sLayers.some((l) => l.id === selectedLayerId)) {
    return (
      <div className="flex items-center gap-2 p-3 border-b border-border/50 text-sm text-muted-foreground">
        Shape layer selected — use the Shape Toolbar or canvas to edit
      </div>
    );
  }

  if (!selectedLayer) {
    return (
      <div className="flex items-center gap-2 p-3 border-b border-border/50 text-sm text-muted-foreground">
        Select a text layer to edit
      </div>
    );
  }

  return (
    <div
      className="relative z-10 flex flex-wrap items-center gap-3 p-3 border-b border-border/50 bg-background"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
      }}
    >
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Font</Label>
        <Select
          value={selectedLayer.fontFamily}
          onValueChange={(v) => {
            if (v) onUpdateLayer(selectedLayer.id, { fontFamily: v });
          }}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs text-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Size</Label>
        <Input
          type="number"
          min={8}
          max={200}
          value={selectedLayer.fontSize}
          onChange={(e) =>
            onUpdateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })
          }
          className="h-8 w-[70px] text-xs  text-primary"
        />
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant={selectedLayer.fontWeight === "bold" ? "default" : "outline"}
          size="icon-sm"
          onClick={() =>
            onUpdateLayer(selectedLayer.id, {
              fontWeight: selectedLayer.fontWeight === "bold" ? "normal" : "bold",
            })
          }
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={selectedLayer.fontStyle === "italic" ? "default" : "outline"}
          size="icon-sm"
          onClick={() =>
            onUpdateLayer(selectedLayer.id, {
              fontStyle: selectedLayer.fontStyle === "italic" ? "normal" : "italic",
            })
          }
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={selectedLayer.underline ? "default" : "outline"}
          size="icon-sm"
          onClick={() =>
            onUpdateLayer(selectedLayer.id, {
              underline: !selectedLayer.underline,
            })
          }
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={selectedLayer.linethrough ? "default" : "outline"}
          size="icon-sm"
          onClick={() =>
            onUpdateLayer(selectedLayer.id, {
              linethrough: !selectedLayer.linethrough,
            })
          }
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant={selectedLayer.textAlign === "left" ? "default" : "outline"}
          size="icon-sm"
          onClick={() => onUpdateLayer(selectedLayer.id, { textAlign: "left" })}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={selectedLayer.textAlign === "center" ? "default" : "outline"}
          size="icon-sm"
          onClick={() => onUpdateLayer(selectedLayer.id, { textAlign: "center" })}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={selectedLayer.textAlign === "right" ? "default" : "outline"}
          size="icon-sm"
          onClick={() => onUpdateLayer(selectedLayer.id, { textAlign: "right" })}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="relative flex items-center gap-2 z-20">
        <Label className="text-xs text-muted-foreground">Color</Label>
        <input
          type="color"
          value={selectedLayer.color}
          onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
          className="relative h-8 w-8 cursor-pointer rounded border border-border z-20"
          style={{ zIndex: 20 }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Opacity</Label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={selectedLayer.opacity}
          onChange={(e) =>
            onUpdateLayer(selectedLayer.id, { opacity: Number(e.target.value) })
          }
          className="w-20"
        />
        <span className="text-xs text-muted-foreground w-8">
          {Math.round(selectedLayer.opacity * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Spacing</Label>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={selectedLayer.charSpacing ?? 0}
          onChange={(e) =>
            onUpdateLayer(selectedLayer.id, { charSpacing: Number(e.target.value) })
          }
          className="w-20"
        />
        <span className="text-xs text-muted-foreground w-6">
          {selectedLayer.charSpacing ?? 0}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Line H</Label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={selectedLayer.lineHeight ?? 1.2}
          onChange={(e) =>
            onUpdateLayer(selectedLayer.id, { lineHeight: Number(e.target.value) })
          }
          className="w-20"
        />
        <span className="text-xs text-muted-foreground w-8">
          {(selectedLayer.lineHeight ?? 1.2).toFixed(1)}
        </span>
      </div>

      <div className="relative flex items-center gap-2 z-20">
        <Label className="text-xs text-muted-foreground">Stroke</Label>
        <input
          type="color"
          value={selectedLayer.textStroke ?? "#000000"}
          onChange={(e) => {
            const updates: Partial<TextLayer> = { textStroke: e.target.value };
            if (!selectedLayer.textStrokeWidth) updates.textStrokeWidth = 1;
            onUpdateLayer(selectedLayer.id, updates);
          }}
          className="relative h-8 w-8 cursor-pointer rounded border border-border z-20"
          style={{ zIndex: 20 }}
        />
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={selectedLayer.textStrokeWidth ?? 0}
          onChange={(e) =>
            onUpdateLayer(selectedLayer.id, { textStrokeWidth: Number(e.target.value) })
          }
          className="w-16"
        />
        <span className="text-xs text-muted-foreground w-4">
          {selectedLayer.textStrokeWidth ?? 0}
        </span>
      </div>

      <div className="relative flex items-center gap-2 z-20">
        <Label className="text-xs text-muted-foreground">BG</Label>
        <input
          type="color"
          value={selectedLayer.textBackgroundColor ?? "#000000"}
          onChange={(e) => onUpdateLayer(selectedLayer.id, { textBackgroundColor: e.target.value })}
          className="relative h-8 w-8 cursor-pointer rounded border border-border z-20"
          style={{ zIndex: 20 }}
        />
      </div>

      <div className="ml-auto">
        <Button
          variant="outline"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onRemoveLayer(selectedLayer.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
