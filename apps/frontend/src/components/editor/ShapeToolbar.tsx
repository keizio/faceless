"use client";

import { useCanvasEditorStore } from "@/stores/canvas-editor";
import type { ShapeType } from "@faceless/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Square, Circle, Minus, ArrowUpRight } from "lucide-react";
const shapeTypes: { type: ShapeType; icon: typeof Square; label: string }[] = [
  { type: "rectangle", icon: Square, label: "Rectangle" },
  { type: "circle", icon: Circle, label: "Circle" },
  { type: "line", icon: Minus, label: "Line" },
  { type: "arrow", icon: ArrowUpRight, label: "Arrow" },
];

interface ShapeToolbarProps {
  fill: string;
  stroke: string;
  strokeWidth: number;
  shapeWidth: number;
  shapeHeight: number;
  onFillChange: (color: string) => void;
  onStrokeChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onShapeWidthChange: (width: number) => void;
  onShapeHeightChange: (height: number) => void;
}

export function ShapeToolbar({
  fill,
  stroke,
  strokeWidth,
  shapeWidth,
  shapeHeight,
  onFillChange,
  onStrokeChange,
  onStrokeWidthChange,
  onShapeWidthChange,
  onShapeHeightChange,
}: ShapeToolbarProps) {
  const activeShapeType = useCanvasEditorStore((s) => s.activeShapeType);
  const setActiveShapeType = useCanvasEditorStore((s) => s.setActiveShapeType);

  return (
    <div
      className="relative z-10 flex flex-wrap items-center gap-3 p-3 border-b border-border/50 bg-background"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-1">
        {shapeTypes.map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            variant={activeShapeType === type ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setActiveShapeType(type)}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>

      <div className="h-5 w-px bg-border/50" />

      <div className="relative flex items-center gap-2 z-20">
        <Label className="text-xs text-muted-foreground">Fill</Label>
        <input
          type="color"
          value={fill}
          onChange={(e) => onFillChange(e.target.value)}
          className="relative h-8 w-8 cursor-pointer rounded border border-border z-20"
          style={{ zIndex: 20 }}
        />
      </div>

      <div className="relative flex items-center gap-2 z-20">
        <Label className="text-xs text-muted-foreground">Stroke</Label>
        <input
          type="color"
          value={stroke}
          onChange={(e) => onStrokeChange(e.target.value)}
          className="relative h-8 w-8 cursor-pointer rounded border border-border z-20"
          style={{ zIndex: 20 }}
        />
      </div>

<div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Width</Label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          className="w-20"
        />
        <span className="text-xs text-muted-foreground w-6">{strokeWidth}px</span>
      </div>

      <div className="h-5 w-px bg-border/50" />

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">W</Label>
        <Input
          type="number"
          min={10}
          max={2000}
          value={shapeWidth}
          onChange={(e) => onShapeWidthChange(Math.max(10, Number(e.target.value)))}
          className="h-8 w-[60px] text-xs text-primary"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">H</Label>
        <Input
          type="number"
          min={10}
          max={2000}
          value={shapeHeight}
          onChange={(e) => onShapeHeightChange(Math.max(10, Number(e.target.value)))}
          className="h-8 w-[60px] text-xs text-primary"
        />
      </div>
    </div>
  );
}
