"use client";

import { useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TextLayer, ShapeLayer, ShapeType } from "@faceless/shared";
import { useCanvasEditorStore } from "@/stores/canvas-editor";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Type,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayerPanelProps {
  onAddLayer: () => void;
  onToggleVisibility: (layerId: string, visible: boolean) => void;
  onToggleLock: (layerId: string, locked: boolean) => void;
  onRemoveLayer: (layerId: string) => void;
  onSelectLayer: (layerId: string) => void;
}

const shapeIcons: Record<ShapeType, typeof Square> = {
  rectangle: Square,
  circle: Circle,
  line: Minus,
  arrow: ArrowUpRight,
};

const shapeLabels: Record<ShapeType, string> = {
  rectangle: "Rectangle",
  circle: "Circle",
  line: "Line",
  arrow: "Arrow",
};

interface LayerEntry {
  id: string;
  type: "text" | "shape";
  layer: TextLayer | ShapeLayer;
}

interface SortableLayerItemProps {
  entry: LayerEntry;
  isSelected: boolean;
  isEraser: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
}

function SortableLayerItem({
  entry,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRemove,
}: SortableLayerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const layer = entry.layer;

  if (entry.type === "text") {
    const t = layer as TextLayer;
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
          isSelected
            ? "bg-primary/10 border border-primary/30"
            : "hover:bg-muted/50 border border-transparent",
        )}
        onClick={onSelect}
      >
        <button
          className="p-0.5 hover:text-foreground text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <Type className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="flex-1 text-xs truncate text-foreground">
          {t.text || "Empty text"}
        </span>
        {t.source === "ai" && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
            AI
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
          aria-label={t.visible ? "Hide layer" : "Show layer"}
        >
          {t.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
          aria-label={t.locked ? "Unlock layer" : "Lock layer"}
        >
          {t.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 hover:text-destructive text-muted-foreground transition-colors"
          aria-label="Delete layer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const s = layer as ShapeLayer;
  const ShapeIcon = shapeIcons[s.type] ?? Square;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted/50 border border-transparent",
      )}
      onClick={onSelect}
    >
      <button
        className="p-0.5 hover:text-foreground text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <ShapeIcon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="flex-1 text-xs truncate text-foreground">
        {shapeLabels[s.type] ?? "Shape"}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility();
        }}
        className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
        aria-label={s.visible ? "Hide layer" : "Show layer"}
      >
        {s.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock();
        }}
        className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
        aria-label={s.locked ? "Unlock layer" : "Lock layer"}
      >
        {s.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-0.5 hover:text-destructive text-muted-foreground transition-colors"
        aria-label="Delete layer"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

export function LayerPanel({
  onAddLayer,
  onToggleVisibility,
  onToggleLock,
  onRemoveLayer,
  onSelectLayer,
}: LayerPanelProps) {
  const activeSlideIndex = useCanvasEditorStore((s) => s.activeSlideIndex);
  const selectedLayerId = useCanvasEditorStore((s) => s.selectedLayerId);
  const textLayers = useCanvasEditorStore((s) => s.textLayers);
  const shapeLayers = useCanvasEditorStore((s) => s.shapeLayers);
  const layerOrder = useCanvasEditorStore((s) => s.layerOrder);
  const reorderLayers = useCanvasEditorStore((s) => s.reorderLayers);

  const slideKey = `slide-${activeSlideIndex}`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const entries = useMemo(() => {
    const order = layerOrder[slideKey] ?? [];
    const tLayers = textLayers[slideKey] ?? [];
    const sLayers = shapeLayers[slideKey] ?? [];
    const layerMap = new Map<string, LayerEntry>();
    for (const l of tLayers) {
      layerMap.set(l.id, { id: l.id, type: "text", layer: l });
    }
    for (const l of sLayers) {
      layerMap.set(l.id, { id: l.id, type: "shape", layer: l });
    }

    const sorted: LayerEntry[] = [];
    for (let i = order.length - 1; i >= 0; i--) {
      const entry = layerMap.get(order[i]);
      if (entry) sorted.push(entry);
    }
    for (const [, entry] of layerMap) {
      if (!sorted.some((s) => s.id === entry.id)) {
        sorted.push(entry);
      }
    }
    return sorted;
  }, [layerOrder, textLayers, shapeLayers, slideKey]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = entries.findIndex((e) => e.id === active.id);
      const newIndex = entries.findIndex((e) => e.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const order = layerOrder[slideKey] ?? [];
      const orderLen = order.length;
      const fromIndex = orderLen - 1 - oldIndex;
      const toIndex = orderLen - 1 - newIndex;
      reorderLayers(slideKey, fromIndex, toIndex);
    },
    [entries, layerOrder, slideKey, reorderLayers],
  );

  const totalCount = entries.length;

  return (
    <div className="flex flex-col gap-1 p-3 border-b border-border/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Layers ({totalCount})
        </h3>
        <Button variant="outline" size="sm" onClick={onAddLayer} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add Layer
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
            {totalCount === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No layers. Click &quot;Add Layer&quot; or use the shape tool.
              </p>
            )}
            {entries.map((entry) => (
              <SortableLayerItem
                key={entry.id}
                entry={entry}
                isSelected={selectedLayerId === entry.id}
                isEraser={false}
                onSelect={() => onSelectLayer(entry.id)}
                onToggleVisibility={() => onToggleVisibility(entry.id, !entry.layer.visible)}
                onToggleLock={() => onToggleLock(entry.id, !entry.layer.locked)}
                onRemove={() => onRemoveLayer(entry.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
