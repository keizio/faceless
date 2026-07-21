"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { TextLayer, ShapeLayer } from "@faceless/shared";
import { useCanvasEditorStore } from "@/stores/canvas-editor";

const HANDLE_SIZE = 10;
const ROTATION_HANDLE_OFFSET = 30;

interface LayerHandlesProps {
  slideKey: string;
}

type HandlePosition = "tl" | "tr" | "bl" | "br" | "tc" | "rc" | "bc" | "lc";

type DragMode = "resize" | "rotate";

interface DragState {
  mode: DragMode;
  layerId: string;
  layerType: "text" | "shape";
  handlePos?: HandlePosition;
  startX: number;
  startY: number;
  startLayer: { x: number; y: number; width: number; height: number; angle: number };
  startAngle?: number;
}

const HANDLE_CURSORS: Record<HandlePosition, string> = {
  tl: "nw-resize",
  tr: "ne-resize",
  bl: "sw-resize",
  br: "se-resize",
  tc: "n-resize",
  rc: "e-resize",
  bc: "s-resize",
  lc: "w-resize",
};

export function LayerHandles({ slideKey }: LayerHandlesProps) {
  const selectedLayerId = useCanvasEditorStore((s) => s.selectedLayerId);
  const activeTool = useCanvasEditorStore((s) => s.activeTool);
  const allTextLayers = useCanvasEditorStore((s) => s.textLayers);
  const allShapeLayers = useCanvasEditorStore((s) => s.shapeLayers);
  const textLayers = useMemo(() => allTextLayers[slideKey] ?? [], [allTextLayers, slideKey]);
  const shapeLayers = useMemo(() => allShapeLayers[slideKey] ?? [], [allShapeLayers, slideKey]);
  const updateTextLayer = useCanvasEditorStore((s) => s.updateTextLayer);
  const updateShapeLayer = useCanvasEditorStore((s) => s.updateShapeLayer);

  const dragRef = useRef<DragState | null>(null);

  const selectedLayer = useMemo(() => {
    if (!selectedLayerId || activeTool !== "select") return null;
    const t = textLayers.find((l) => l.id === selectedLayerId);
    if (t) {
      return {
        id: t.id,
        type: "text" as const,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.fontSize * (t.lineHeight ?? 1.2) * Math.max(t.text.split('\n').length, 1),
        angle: t.angle,
        locked: t.locked,
      };
    }
    const s = shapeLayers.find((l) => l.id === selectedLayerId);
    if (s) {
      return {
        id: s.id,
        type: "shape" as const,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        angle: s.angle,
        locked: s.locked,
      };
    }
    return null;
  }, [selectedLayerId, activeTool, textLayers, shapeLayers]);

  const updateLayer = useCallback(
    (id: string, type: "text" | "shape", updates: Partial<TextLayer | ShapeLayer>) => {
      if (type === "text") {
        updateTextLayer(slideKey, id, updates as Partial<TextLayer>);
      } else {
        updateShapeLayer(slideKey, id, updates as Partial<ShapeLayer>);
      }
    },
    [slideKey, updateTextLayer, updateShapeLayer],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, pos: HandlePosition) => {
      if (!selectedLayer) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        mode: "resize",
        layerId: selectedLayer.id,
        layerType: selectedLayer.type,
        handlePos: pos,
        startX: e.clientX,
        startY: e.clientY,
        startLayer: {
          x: selectedLayer.x,
          y: selectedLayer.y,
          width: selectedLayer.width,
          height: selectedLayer.height,
          angle: selectedLayer.angle,
        },
      };
    },
    [selectedLayer],
  );

  const handleRotateStart = useCallback(
    (e: React.MouseEvent) => {
      if (!selectedLayer) return;
      e.preventDefault();
      e.stopPropagation();
      const cx = selectedLayer.x + selectedLayer.width / 2;
      const cy = selectedLayer.y + selectedLayer.height / 2;
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      dragRef.current = {
        mode: "rotate",
        layerId: selectedLayer.id,
        layerType: selectedLayer.type,
        startX: e.clientX,
        startY: e.clientY,
        startLayer: {
          x: selectedLayer.x,
          y: selectedLayer.y,
          width: selectedLayer.width,
          height: selectedLayer.height,
          angle: selectedLayer.angle,
        },
        startAngle,
      };
    },
    [selectedLayer],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragRef.current;
      if (!ds) return;

      if (ds.mode === "resize" && ds.handlePos) {
        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        const shift = e.shiftKey;

        let { x, y, width, height } = ds.startLayer;

        const clamp = (v: number) => Math.max(v, 10);

        switch (ds.handlePos) {
          case "tl":
            width = clamp(ds.startLayer.width - dx);
            height = clamp(ds.startLayer.height - dy);
            x = ds.startLayer.x + (ds.startLayer.width - width);
            y = ds.startLayer.y + (ds.startLayer.height - height);
            if (shift) {
              const ratio = ds.startLayer.width / ds.startLayer.height;
              const w = clamp(ds.startLayer.width - dx);
              height = clamp(w / ratio);
              width = w;
              x = ds.startLayer.x + (ds.startLayer.width - width);
              y = ds.startLayer.y + (ds.startLayer.height - height);
            }
            break;
          case "tr":
            width = clamp(ds.startLayer.width + dx);
            height = clamp(ds.startLayer.height - dy);
            y = ds.startLayer.y + (ds.startLayer.height - height);
            if (shift) {
              const ratio = ds.startLayer.width / ds.startLayer.height;
              const h = clamp(ds.startLayer.height - dy);
              width = clamp(h * ratio);
              height = h;
              y = ds.startLayer.y + (ds.startLayer.height - height);
            }
            break;
          case "bl":
            width = clamp(ds.startLayer.width - dx);
            height = clamp(ds.startLayer.height + dy);
            x = ds.startLayer.x + (ds.startLayer.width - width);
            if (shift) {
              const ratio = ds.startLayer.width / ds.startLayer.height;
              const w = clamp(ds.startLayer.width - dx);
              height = clamp(w / ratio);
              width = w;
              x = ds.startLayer.x + (ds.startLayer.width - width);
            }
            break;
          case "br":
            width = clamp(ds.startLayer.width + dx);
            height = clamp(ds.startLayer.height + dy);
            if (shift) {
              const ratio = ds.startLayer.width / ds.startLayer.height;
              width = clamp(ds.startLayer.width + dx);
              height = clamp(width / ratio);
            }
            break;
          case "tc":
            height = clamp(ds.startLayer.height - dy);
            y = ds.startLayer.y + (ds.startLayer.height - height);
            break;
          case "bc":
            height = clamp(ds.startLayer.height + dy);
            break;
          case "lc":
            width = clamp(ds.startLayer.width - dx);
            x = ds.startLayer.x + (ds.startLayer.width - width);
            break;
          case "rc":
            width = clamp(ds.startLayer.width + dx);
            break;
        }

        updateLayer(ds.layerId, ds.layerType, { x, y, width, height });
      }

      if (ds.mode === "rotate") {
        const l = ds.startLayer;
        const cx = l.x + l.width / 2;
        const cy = l.y + l.height / 2;
        const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        const delta = currentAngle - (ds.startAngle ?? 0);
        const newAngle = ((ds.startLayer.angle + delta) % 360 + 360) % 360;
        updateLayer(ds.layerId, ds.layerType, { angle: Math.round(newAngle) });
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [updateLayer]);

  if (!selectedLayer || selectedLayer.locked) return null;
  if (selectedLayer.width < 10 || selectedLayer.height < 10) return null;

  const { x, y, width, height } = selectedLayer;
  const half = HANDLE_SIZE / 2;

  const handles: { pos: HandlePosition; left: number; top: number }[] = [
    { pos: "tl", left: x - half, top: y - half },
    { pos: "tr", left: x + width - half, top: y - half },
    { pos: "bl", left: x - half, top: y + height - half },
    { pos: "br", left: x + width - half, top: y + height - half },
    { pos: "tc", left: x + width / 2 - half, top: y - half },
    { pos: "rc", left: x + width - half, top: y + height / 2 - half },
    { pos: "bc", left: x + width / 2 - half, top: y + height - half },
    { pos: "lc", left: x - half, top: y + height / 2 - half },
  ];

  const rotY = y - ROTATION_HANDLE_OFFSET;

  return (
    <>
      {handles.map(({ pos, left, top }) => (
        <div
          key={pos}
          className="absolute z-50 bg-white border-2 border-blue-500 rounded-sm"
          style={{
            left,
            top,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: HANDLE_CURSORS[pos],
          }}
          onMouseDown={(e) => handleResizeStart(e, pos)}
        />
      ))}
      <div
        className="absolute z-50"
        style={{
          left: x + width / 2 - 1,
          top: rotY,
          width: 2,
          height: ROTATION_HANDLE_OFFSET,
          pointerEvents: "none",
        }}
      >
        <div
          className="absolute bg-blue-500"
          style={{
            width: 2,
            height: ROTATION_HANDLE_OFFSET,
            bottom: 0,
            left: 0,
          }}
        />
      </div>
      <div
        className="absolute z-50 bg-blue-500 border-2 border-white rounded-full"
        style={{
          left: x + width / 2 - 6,
          top: rotY - 6,
          width: 12,
          height: 12,
          cursor: "grab",
        }}
        onMouseDown={handleRotateStart}
      />
    </>
  );
}
