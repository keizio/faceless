"use client";

import { useCallback, useRef, useEffect, useMemo } from "react";
import type { TextLayer, ShapeLayer } from "@faceless/shared";
import { useCanvasEditorStore } from "@/stores/canvas-editor";
import type { ToolMode } from "@/stores/canvas-editor";

export interface ContextMenuData {
  x: number;
  y: number;
  layerId: string;
  layerType: "text" | "shape";
}

interface HtmlLayerRendererProps {
  width: number;
  height: number;
  slideKey: string;
  activeTool: ToolMode;
  onContextMenu: (data: ContextMenuData) => void;
  onObjectErased: (layerId: string) => void;
}

export function HtmlLayerRenderer({
  width,
  height,
  slideKey,
  activeTool,
  onContextMenu,
  onObjectErased,
}: HtmlLayerRendererProps) {
  const allTextLayers = useCanvasEditorStore((s) => s.textLayers);
  const allShapeLayers = useCanvasEditorStore((s) => s.shapeLayers);
  const allLayerOrder = useCanvasEditorStore((s) => s.layerOrder);
  const textLayers = useMemo(() => allTextLayers[slideKey] ?? [], [allTextLayers, slideKey]);
  const shapeLayers = useMemo(() => allShapeLayers[slideKey] ?? [], [allShapeLayers, slideKey]);
  const layerOrder = useMemo(() => allLayerOrder[slideKey] ?? [], [allLayerOrder, slideKey]);
  const selectedLayerId = useCanvasEditorStore((s) => s.selectedLayerId);
  const setSelectedLayer = useCanvasEditorStore((s) => s.setSelectedLayer);
  const updateTextLayer = useCanvasEditorStore((s) => s.updateTextLayer);
  const updateShapeLayer = useCanvasEditorStore((s) => s.updateShapeLayer);
  const removeTextLayer = useCanvasEditorStore((s) => s.removeTextLayer);
  const removeShapeLayer = useCanvasEditorStore((s) => s.removeShapeLayer);

  const dragStateRef = useRef<{
    layerId: string;
    type: "text" | "shape";
    startX: number;
    startY: number;
    layerStartX: number;
    layerStartY: number;
  } | null>(null);

  const editingLayerIdRef = useRef<string | null>(null);

  const allLayers = useCallback(() => {
    const layerMap = new Map<string, { type: "text" | "shape"; layer: TextLayer | ShapeLayer }>();
    for (const l of textLayers) layerMap.set(l.id, { type: "text", layer: l });
    for (const l of shapeLayers) layerMap.set(l.id, { type: "shape", layer: l });

    const sorted: { id: string; type: "text" | "shape"; layer: TextLayer | ShapeLayer; order: number }[] = [];
    layerOrder.forEach((id, index) => {
      const entry = layerMap.get(id);
      if (entry) {
        sorted.push({ id, ...entry, order: index });
      }
    });

    for (const [id, entry] of layerMap) {
      if (!layerOrder.includes(id)) {
        sorted.push({ id, ...entry, order: layerOrder.length });
      }
    }

    return sorted;
  }, [textLayers, shapeLayers, layerOrder]);

  const enterEditMode = useCallback((e: React.MouseEvent, layerId: string) => {
    const el = e.currentTarget as HTMLElement;
    el.contentEditable = "true";
    el.focus();
    editingLayerIdRef.current = layerId;

    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);

  const handleSelect = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      if (editingLayerIdRef.current === layerId) return;
      if (activeTool === "text") {
        const layer = textLayers.find((l) => l.id === layerId);
        if (layer && !layer.locked) {
          e.stopPropagation();
          setSelectedLayer(layerId);
          enterEditMode(e, layerId);
          return;
        }
      }
      if (activeTool === "eraser") {
        const layer = textLayers.find((l) => l.id === layerId) ?? shapeLayers.find((l) => l.id === layerId);
        if (layer) {
          if ("text" in layer || "fontFamily" in layer) {
            removeTextLayer(slideKey, layerId);
          } else {
            removeShapeLayer(slideKey, layerId);
          }
          onObjectErased(layerId);
        }
        return;
      }
      if (activeTool === "ai-remove") return;
      e.stopPropagation();
      setSelectedLayer(layerId);
    },
    [activeTool, textLayers, shapeLayers, slideKey, removeTextLayer, removeShapeLayer, setSelectedLayer, onObjectErased, enterEditMode],
  );

  const handleContainerClick = useCallback(() => {
    if (activeTool !== "ai-remove" && activeTool !== "eraser") {
      setSelectedLayer(null);
    }
  }, [activeTool, setSelectedLayer]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent, layerId: string, type: "text" | "shape") => {
      if (activeTool !== "select") return;
      if (editingLayerIdRef.current === layerId) return;
      e.stopPropagation();

      const layer =
        type === "text"
          ? textLayers.find((l) => l.id === layerId)
          : shapeLayers.find((l) => l.id === layerId);
      if (!layer || layer.locked) return;

      dragStateRef.current = {
        layerId,
        type,
        startX: e.clientX,
        startY: e.clientY,
        layerStartX: layer.x,
        layerStartY: layer.y,
      };
    },
    [activeTool, textLayers, shapeLayers],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      document.body.style.userSelect = "none";
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      const newX = ds.layerStartX + dx;
      const newY = ds.layerStartY + dy;
      if (ds.type === "text") {
        updateTextLayer(slideKey, ds.layerId, { x: newX, y: newY });
      } else {
        updateShapeLayer(slideKey, ds.layerId, { x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [slideKey, updateTextLayer, updateShapeLayer]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      if (activeTool !== "select") return;
      e.preventDefault();
      e.stopPropagation();
      enterEditMode(e, layerId);
    },
    [activeTool, enterEditMode],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent, id: string) => {
      const text = (e.currentTarget as HTMLElement).innerText ?? "";
      updateTextLayer(slideKey, id, { text });
      (e.currentTarget as HTMLElement).contentEditable = "false";
      editingLayerIdRef.current = null;
    },
    [slideKey, updateTextLayer],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
      }
      if (e.key === "Escape") {
        (e.currentTarget as HTMLElement).blur();
      }
    },
    [],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, layerId: string, layerType: "text" | "shape") => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu({ x: e.clientX, y: e.clientY, layerId, layerType });
    },
    [onContextMenu],
  );

  const isEraser = activeTool === "eraser";
  const isAIRemove = activeTool === "ai-remove";

  return (
    <div
      className="absolute inset-0"
      style={{ width, height, pointerEvents: isAIRemove ? "none" : "auto" }}
      onClick={handleContainerClick}
    >
      {allLayers().map(({ id, type, layer, order }) => {
        const isSelected = selectedLayerId === id;
        const isLocked = layer.locked;

        if (type === "text") {
          const t = layer as TextLayer;

          const textStyle: Record<string, string | number | undefined> = {
            left: t.x,
            top: t.y,
            width: t.width,
            fontFamily: t.fontFamily,
            fontSize: t.fontSize,
            fontWeight: t.fontWeight,
            fontStyle: t.fontStyle,
            color: t.color,
            textAlign: t.textAlign,
            opacity: t.opacity,
            display: t.visible ? "block" : "none",
            zIndex: order + 1,
            outline: isSelected ? "2px solid #3b82f6" : "none",
            cursor: isEraser ? "pointer" : isLocked ? "default" : "move",
            textDecoration: t.underline ? "underline" : t.linethrough ? "line-through" : undefined,
            letterSpacing: t.charSpacing ? `${t.charSpacing}px` : undefined,
            lineHeight: t.lineHeight ?? 1.2,
            whiteSpace: "pre-wrap",
            transform: `rotate(${t.angle}deg)`,
          };

          const hasBg = t.textBackgroundColor && t.textBackgroundColor !== "transparent";
          const hasStroke = t.textStroke && t.textStroke !== "transparent";

          return (
            <div
              key={id}
              data-layer-id={id}
              className={`absolute ${editingLayerIdRef.current === id ? "" : "select-none"}`}
              style={textStyle as React.CSSProperties}
              onClick={(e) => handleSelect(e, id)}
              onMouseDown={(e) => handleDragStart(e, id, "text")}
              onDoubleClick={(e) => handleDoubleClick(e, id)}
              onBlur={(e) => handleBlur(e, id)}
              onKeyDown={handleKeyDown}
              onContextMenu={(e) => handleContextMenu(e, id, "text")}
              role="textbox"
              aria-multiline="true"
              tabIndex={-1}
              suppressContentEditableWarning
            >
              {hasBg || hasStroke ? (
                <span
                  style={{
                    background: hasBg ? t.textBackgroundColor : undefined,
                    WebkitTextStroke: hasStroke ? `${t.textStrokeWidth ?? 0}px ${t.textStroke}` : undefined,
                    borderRadius: "4px",
                    padding: "2px 4px",
                    boxDecorationBreak: "clone" as React.CSSProperties["boxDecorationBreak"],
                    WebkitBoxDecorationBreak: "clone" as React.CSSProperties["boxDecorationBreak"],
                  }}
                >
                  {t.text}
                </span>
              ) : (
                t.text
              )}
            </div>
          );
        }

        const s = layer as ShapeLayer;
        let borderRadius = "0";
        if (s.type === "circle") {
          borderRadius = "50%";
        } else if (s.rx) {
          borderRadius = `${s.rx}px`;
        }

        let shapeStyle: React.CSSProperties = {
          left: s.x,
          top: s.y,
          width: s.width,
          height: s.type === "line" || s.type === "arrow" ? Math.max(s.strokeWidth, 2) : s.height,
          background: s.type === "line" || s.type === "arrow" ? "transparent" : s.fill,
          border: s.type === "line" || s.type === "arrow" ? "none" : `${s.strokeWidth}px solid ${s.stroke}`,
          borderRadius,
          opacity: s.opacity,
          display: s.visible ? "block" : "none",
          zIndex: order + 1,
          outline: isSelected ? "2px solid #3b82f6" : "none",
          cursor: isEraser ? "pointer" : isLocked ? "default" : "move",
          transform: `rotate(${s.angle}deg)`,
          position: "absolute" as const,
          userSelect: "none" as const,
        };

        if (s.type === "line") {
          shapeStyle = {
            ...shapeStyle,
            background: s.stroke,
            height: Math.max(s.strokeWidth, 2),
            borderRadius: "0",
          };
        }

        return (
          <div
            key={id}
            data-layer-id={id}
            className="absolute select-none"
            style={shapeStyle}
            onClick={(e) => handleSelect(e, id)}
            onMouseDown={(e) => handleDragStart(e, id, "shape")}
            onContextMenu={(e) => handleContextMenu(e, id, "shape")}
          />
        );
      })}
    </div>
  );
}
