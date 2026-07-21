"use client";

import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TextToolbar } from "@/components/editor/TextToolbar";
import { ShapeToolbar } from "@/components/editor/ShapeToolbar";
import { EraserToolbar } from "@/components/editor/EraserToolbar";
import { AIRemoveToolbar } from "@/components/editor/AIRemoveToolbar";
import { ToolModeBar } from "@/components/editor/ToolModeBar";
import { LayerPanel } from "@/components/editor/LayerPanel";
import { SlideSwitcher } from "@/components/editor/SlideSwitcher";
import { CanvasContextMenu } from "@/components/editor/CanvasContextMenu";
import { HtmlLayerRenderer } from "@/components/editor/HtmlLayerRenderer";
import type { ContextMenuData } from "@/components/editor/HtmlLayerRenderer";
import { LayerHandles } from "@/components/editor/LayerHandles";
import { MaskCanvas } from "@/components/editor/MaskCanvas";
import type { MaskCanvasHandle } from "@/components/editor/MaskCanvas";
import { useContent } from "@/hooks/useContents";
import { useTextLayers, useSaveTextLayers, useEditorExport } from "@/hooks/useTextLayers";
import { useTextLayerAutoSave } from "@/hooks/useTextLayerAutoSave";
import { useCanvasEditorStore } from "@/stores/canvas-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Save, Loader2, Undo2, Redo2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import type { TextLayer, ShapeLayer } from "@faceless/shared";
import { toast } from "sonner";
import type { FabricCanvasHandle } from "@/components/editor/FabricCanvas";

const FabricCanvas = dynamic(
  () => import("@/components/editor/FabricCanvas").then((mod) => ({ default: mod.FabricCanvas })),
  { ssr: false },
);

function getCanvasDimensions(aspectRatio: string | null): { width: number; height: number } {
  switch (aspectRatio) {
    case "9:16":
      return { width: 540, height: 960 };
    case "1:1":
      return { width: 720, height: 720 };
    case "4:5":
      return { width: 720, height: 900 };
    default:
      return { width: 960, height: 540 };
  }
}

function getProductionDimensions(aspectRatio: string | null): { width: number; height: number } {
  switch (aspectRatio) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "16:9":
      return { width: 1920, height: 1080 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "4:5":
      return { width: 1080, height: 1350 };
    default:
      return { width: 1080, height: 1080 };
  }
}

function scaleTextLayer(layer: TextLayer, scaleX: number, scaleY: number): TextLayer {
  const scale = Math.min(scaleX, scaleY);
  const scaledWidth = Math.round(layer.width * scaleX);
  const scaledFontSize = Math.round(layer.fontSize * scale);

  // Server uses originX/originY positioning (center by default),
  // but HtmlLayerRenderer always uses top-left. Convert here.
  let x = Math.round(layer.x * scaleX);
  if (layer.originX === "center") {
    x = Math.round(x - scaledWidth / 2);
  } else if (layer.originX === "right") {
    x = Math.round(x - scaledWidth);
  }

  const numLines = Math.max(layer.text.split("\n").length, 1);
  const estimatedHeight = scaledFontSize * (layer.lineHeight ?? 1.2) * numLines;
  let y = Math.round(layer.y * scaleY);
  if (layer.originY === "center") {
    y = Math.round(y - estimatedHeight / 2);
  } else if (layer.originY === "bottom") {
    y = Math.round(y - estimatedHeight);
  }

  return {
    ...layer,
    x,
    y,
    width: scaledWidth,
    fontSize: scaledFontSize,
    charSpacing: layer.charSpacing ? Math.round(layer.charSpacing * scale) : undefined,
    textStrokeWidth: layer.textStrokeWidth ? layer.textStrokeWidth * scale : undefined,
  };
}

function scaleShapeLayer(layer: ShapeLayer, scaleX: number, scaleY: number): ShapeLayer {
  return {
    ...layer,
    x: Math.round(layer.x * scaleX),
    y: Math.round(layer.y * scaleY),
    width: Math.round(layer.width * scaleX),
    height: Math.round(layer.height * scaleY),
    ...(layer.x2 !== undefined ? { x2: Math.round(layer.x2 * scaleX) } : {}),
    ...(layer.y2 !== undefined ? { y2: Math.round(layer.y2 * scaleY) } : {}),
    ...(layer.rx !== undefined ? { rx: Math.round(layer.rx * Math.min(scaleX, scaleY)) } : {}),
  };
}

function createDefaultTextLayer(text: string, source: "ai" | "user" = "user"): TextLayer {
  return {
    id: crypto.randomUUID(),
    text,
    fontFamily: "Inter",
    fontSize: 32,
    fontWeight: "normal",
    fontStyle: "normal",
    color: "#ffffff",
    textAlign: "center",
    x: 200,
    y: 200,
    width: 400,
    originX: "center",
    originY: "center",
    angle: 0,
    opacity: 1,
    visible: true,
    locked: false,
    source,
    underline: false,
    linethrough: false,
    charSpacing: 0,
    lineHeight: 1.2,
    textStroke: "transparent",
    textStrokeWidth: 0,
    textBackgroundColor: "transparent",
  };
}

function createDefaultShapeLayer(type: ShapeLayer["type"], x: number, y: number, fill: string, stroke: string, strokeWidth: number, w: number, h: number): ShapeLayer {
  return {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    width: w,
    height: h,
    fill,
    stroke,
    strokeWidth,
    opacity: 1,
    angle: 0,
    visible: true,
    locked: false,
  };
}

async function compositeExportToBlob(
  backgroundUrl: string,
  layers: { textLayers: TextLayer[]; shapeLayers: ShapeLayer[]; layerOrder: string[] },
  width: number,
  height: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Load background via the backend proxy to get CORS-safe image
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const proxyUrl = `${apiBase}/api/proxy/image?url=${encodeURIComponent(backgroundUrl)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error("Failed to load background image for export");
  const bgBlob = await response.blob();
  const bgImg = await createImageBitmap(bgBlob);
  ctx.drawImage(bgImg, 0, 0, width, height);
  bgImg.close();

  // Build layer map
  const layerMap = new Map<string, { type: "text" | "shape"; layer: TextLayer | ShapeLayer }>();
  for (const l of layers.textLayers) layerMap.set(l.id, { type: "text", layer: l });
  for (const l of layers.shapeLayers) layerMap.set(l.id, { type: "shape", layer: l });

  // Draw layers in order (lowest z first)
  for (const id of layers.layerOrder) {
    const entry = layerMap.get(id);
    if (!entry || !entry.layer.visible) continue;

    ctx.save();

    if (entry.type === "text") {
      const t = entry.layer as TextLayer;
      ctx.globalAlpha = t.opacity;

      const rawLines = t.text.split("\n");
      const lineHeight = t.fontSize * (t.lineHeight ?? 1.2);
      const padding = 4;

      ctx.font = `${t.fontStyle} ${t.fontWeight} ${t.fontSize}px ${t.fontFamily}`;
      if (t.charSpacing) {
        ctx.letterSpacing = `${t.charSpacing}px`;
      }

      // Word-wrap each raw line (Fix 3)
      // Max width matches the div's content width (no padding on outer div)
      const maxWidth = t.width;
      const allLines: string[] = [];
      for (const rawLine of rawLines) {
        const words = rawLine.split(" ");
        let current = "";
        for (const word of words) {
          const test = current ? current + " " + word : word;
          if (ctx.measureText(test).width > maxWidth && current) {
            allLines.push(current);
            current = word;
          } else {
            current = test;
          }
        }
        allLines.push(current);
      }

      const totalTextHeight = allLines.length * lineHeight;

      // Rotation pivot at center (Fix 1)
      const cx = t.width / 2;
      const cy = totalTextHeight / 2;
      ctx.translate(t.x + cx, t.y + cy);
      ctx.rotate((t.angle * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      // Match DOM text alignment and baseline (Fix 4)
      ctx.textAlign = t.textAlign;
      ctx.textBaseline = "top";

      const bgColor = t.textBackgroundColor;
      const hasBg = !!bgColor && bgColor !== "transparent";
      const strokeColor = t.textStroke;
      const strokeW = t.textStrokeWidth ?? 0;
      const hasStroke = !!strokeColor && strokeColor !== "transparent" && strokeW > 0;

      for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];
        const lineY = i * lineHeight;

        // Alignment point matching CSS text-align behavior
        let alignX = 0;
        if (t.textAlign === "left") {
          alignX = 0;
        } else if (t.textAlign === "right") {
          alignX = t.width;
        } else {
          alignX = t.width / 2;
        }

        if (hasBg) {
          const m = ctx.measureText(line);
          const bgX = t.textAlign === "left"
            ? 0 - padding
            : t.textAlign === "right"
              ? t.width - m.width - padding
              : t.width / 2 - m.width / 2 - padding;
          ctx.fillStyle = bgColor;
          const r = 4;
          const bw = m.width + padding * 2;
          const bh = lineHeight;
          ctx.beginPath();
          ctx.moveTo(bgX + r, lineY);
          ctx.lineTo(bgX + bw - r, lineY);
          ctx.quadraticCurveTo(bgX + bw, lineY, bgX + bw, lineY + r);
          ctx.lineTo(bgX + bw, lineY + bh - r);
          ctx.quadraticCurveTo(bgX + bw, lineY + bh, bgX + bw - r, lineY + bh);
          ctx.lineTo(bgX + r, lineY + bh);
          ctx.quadraticCurveTo(bgX, lineY + bh, bgX, lineY + bh - r);
          ctx.lineTo(bgX, lineY + r);
          ctx.quadraticCurveTo(bgX, lineY, bgX + r, lineY);
          ctx.closePath();
          ctx.fill();
        }

        if (hasStroke) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeW;
          ctx.strokeText(line, alignX, lineY);
        }

        ctx.fillStyle = t.color;
        ctx.fillText(line, alignX, lineY);

        // Underline / linethrough (Fix 2)
        const lineWidth = ctx.measureText(line).width;
        let decoStart = alignX;
        if (t.textAlign === "center") decoStart = alignX - lineWidth / 2;
        else if (t.textAlign === "right") decoStart = alignX - lineWidth;
        if (t.underline) {
          const decoY = lineY + lineHeight * 0.15;
          ctx.strokeStyle = t.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(decoStart, decoY);
          ctx.lineTo(decoStart + lineWidth, decoY);
          ctx.stroke();
        }
        if (t.linethrough) {
          const decoY = lineY + lineHeight * 0.5;
          ctx.strokeStyle = t.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(decoStart, decoY);
          ctx.lineTo(decoStart + lineWidth, decoY);
          ctx.stroke();
        }
      }
    } else {
      const s = entry.layer as ShapeLayer;
      ctx.globalAlpha = s.opacity;
      ctx.translate(s.x + s.width / 2, s.y + s.height / 2);
      ctx.rotate((s.angle * Math.PI) / 180);
      ctx.translate(-(s.x + s.width / 2), -(s.y + s.height / 2));

      if (s.type === "rectangle") {
        if (s.rx) {
          const r = s.rx;
          ctx.beginPath();
          ctx.moveTo(s.x + r, s.y);
          ctx.lineTo(s.x + s.width - r, s.y);
          ctx.quadraticCurveTo(s.x + s.width, s.y, s.x + s.width, s.y + r);
          ctx.lineTo(s.x + s.width, s.y + s.height - r);
          ctx.quadraticCurveTo(s.x + s.width, s.y + s.height, s.x + s.width - r, s.y + s.height);
          ctx.lineTo(s.x + r, s.y + s.height);
          ctx.quadraticCurveTo(s.x, s.y + s.height, s.x, s.y + s.height - r);
          ctx.lineTo(s.x, s.y + r);
          ctx.quadraticCurveTo(s.x, s.y, s.x + r, s.y);
          ctx.closePath();
          if (s.fill && s.fill !== "transparent") {
            ctx.fillStyle = s.fill;
            ctx.fill();
          }
          if (s.stroke && s.strokeWidth > 0) {
            ctx.strokeStyle = s.stroke;
            ctx.lineWidth = s.strokeWidth;
            ctx.stroke();
          }
        } else {
          if (s.fill && s.fill !== "transparent") {
            ctx.fillStyle = s.fill;
            ctx.fillRect(s.x, s.y, s.width, s.height);
          }
          if (s.stroke && s.strokeWidth > 0) {
            ctx.strokeStyle = s.stroke;
            ctx.lineWidth = s.strokeWidth;
            ctx.strokeRect(s.x, s.y, s.width, s.height);
          }
        }
      } else if (s.type === "circle") {
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        const rx = s.width / 2;
        const ry = s.height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (s.fill && s.fill !== "transparent") {
          ctx.fillStyle = s.fill;
          ctx.fill();
        }
        if (s.stroke && s.strokeWidth > 0) {
          ctx.strokeStyle = s.stroke;
          ctx.lineWidth = s.strokeWidth;
          ctx.stroke();
        }
      } else if (s.type === "line") {
        const x1 = s.x;
        const y1 = s.y;
        const x2 = s.x2 ?? s.x + s.width;
        const y2 = s.y2 ?? s.y;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = s.stroke;
        ctx.lineWidth = Math.max(s.strokeWidth, 2);
        ctx.stroke();
      } else if (s.type === "arrow") {
        const x1 = s.x;
        const y1 = s.y;
        const x2 = s.x2 ?? s.x + s.width;
        const y2 = s.y2 ?? s.y;
        const headSize = 12;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = s.stroke;
        ctx.lineWidth = Math.max(s.strokeWidth, 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = s.stroke;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create export blob"));
    }, "image/png");
  });
}

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: content, isLoading } = useContent(id);
  const canvasRef = useRef<FabricCanvasHandle>(null);
  const maskCanvasRef = useRef<MaskCanvasHandle>(null);

  const activeSlideIndex = useCanvasEditorStore((s) => s.activeSlideIndex);
  const isDirty = useCanvasEditorStore((s) => s.isDirty);
  const isSaving = useCanvasEditorStore((s) => s.isSaving);
  const isExporting = useCanvasEditorStore((s) => s.isExporting);
  const loadAllTextLayers = useCanvasEditorStore((s) => s.loadAllTextLayers);
  const loadAllShapeLayers = useCanvasEditorStore((s) => s.loadAllShapeLayers);
  const addTextLayer = useCanvasEditorStore((s) => s.addTextLayer);
  const removeTextLayer = useCanvasEditorStore((s) => s.removeTextLayer);
  const updateTextLayer = useCanvasEditorStore((s) => s.updateTextLayer);
  const addShapeLayer = useCanvasEditorStore((s) => s.addShapeLayer);
  const removeShapeLayer = useCanvasEditorStore((s) => s.removeShapeLayer);
  const updateShapeLayer = useCanvasEditorStore((s) => s.updateShapeLayer);
  const setActiveSlide = useCanvasEditorStore((s) => s.setActiveSlide);
  const setIsExporting = useCanvasEditorStore((s) => s.setIsExporting);
  const setIsDirty = useCanvasEditorStore((s) => s.setIsDirty);
  const setIsSaving = useCanvasEditorStore((s) => s.setIsSaving);
  const activeTool = useCanvasEditorStore((s) => s.activeTool);
  const activeShapeType = useCanvasEditorStore((s) => s.activeShapeType);
  const brushSize = useCanvasEditorStore((s) => s.brushSize);
  const clipboard = useCanvasEditorStore((s) => s.clipboard);
  const setClipboard = useCanvasEditorStore((s) => s.setClipboard);
  const bringToFront = useCanvasEditorStore((s) => s.bringToFront);
  const sendToBack = useCanvasEditorStore((s) => s.sendToBack);

  const latestVersion = content?.versions?.[0];
  const versionId = latestVersion?.id;

  const { data: savedTextLayers, isLoading: isLoadingLayers } = useTextLayers(id, versionId);
  const saveMutation = useSaveTextLayers(id);
  const exportMutation = useEditorExport(id);

  const [initialized, setInitialized] = useState(false);
  const [shapeFill, setShapeFill] = useState("#ffffff");
  const [shapeStroke, setShapeStroke] = useState("#ffffff");
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);
  const [shapeWidth, setShapeWidth] = useState(200);
  const [shapeHeight, setShapeHeight] = useState(200);
  const [isInpainting, setIsInpainting] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuData | null>(null);
  const [showAddLayerDropdown, setShowAddLayerDropdown] = useState(false);
  const addLayerDropdownRef = useRef<HTMLDivElement>(null);

  useTextLayerAutoSave(id, versionId, saveMutation.mutateAsync);

  const images = content?.media?.filter((m: { type: string }) => m.type === "image") ?? [];
  const slideImages = images.map((m: { url: string }) => m.url);
  const slideCount = content?.type === "slide" ? Math.max(images.length, 1) : 1;
  const { width, height } = getCanvasDimensions(content?.aspectRatio ?? null);

  const slideKey = `slide-${activeSlideIndex}`;
  const backgroundImage = slideImages[activeSlideIndex] || slideImages[0] || "";

  useEffect(() => {
    if (savedTextLayers && !initialized && versionId) {
      const hasTextLayers = savedTextLayers.textLayers ? Object.values(savedTextLayers.textLayers).some((layers) => layers.length > 0) : false;
      const hasShapeLayers = savedTextLayers.shapeLayers ? Object.values(savedTextLayers.shapeLayers).some((layers) => layers.length > 0) : false;

      // Detect if layers are at production resolution and need scaling
      const prodDims = getProductionDimensions(content?.aspectRatio ?? null);
      const scaleX = width / prodDims.width;
      const scaleY = height / prodDims.height;
      const needsScaling = hasTextLayers
        ? Object.values(savedTextLayers.textLayers).some((layers) =>
            layers.some((l) => l.width > width * 1.2),
          )
        : false;

      if (hasTextLayers) {
        const layersToLoad = needsScaling
          ? Object.fromEntries(
              Object.entries(savedTextLayers.textLayers).map(([key, layers]) => [
                key,
                layers.map((l) => scaleTextLayer(l, scaleX, scaleY)),
              ]),
            )
          : savedTextLayers.textLayers;
        loadAllTextLayers(layersToLoad);
      } else if (content?.script) {
        const aiLayer = createDefaultTextLayer(content.script.slice(0, 100), "ai");
        aiLayer.visible = false;
        loadAllTextLayers({ "slide-0": [aiLayer] });
      }
      if (hasShapeLayers) {
        const shapeLayersToLoad = needsScaling
          ? Object.fromEntries(
              Object.entries(savedTextLayers.shapeLayers!).map(([key, layers]) => [
                key,
                layers.map((l) => scaleShapeLayer(l, scaleX, scaleY)),
              ]),
            )
          : savedTextLayers.shapeLayers;
        loadAllShapeLayers(shapeLayersToLoad);
      }
      setInitialized(true);
    }
  }, [savedTextLayers, initialized, versionId, content, loadAllTextLayers, loadAllShapeLayers, width, height]);

  useEffect(() => {
    return () => {
      useCanvasEditorStore.getState().reset();
    };
  }, []);

  useEffect(() => {
    if (content) {
      const slideParam = searchParams.get("slide");
      if (slideParam !== null) {
        const slideIndex = parseInt(slideParam, 10);
        if (!isNaN(slideIndex) && slideIndex >= 0) {
          setActiveSlide(slideIndex);
        }
      } else {
        setActiveSlide(0);
      }
    }
  }, [content, searchParams, setActiveSlide]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addLayerDropdownRef.current && !addLayerDropdownRef.current.contains(e.target as Node)) {
        setShowAddLayerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLayerType = useCallback(
    (layerId: string): "text" | "shape" => {
      const state = useCanvasEditorStore.getState();
      const tLayers = (state.textLayers[slideKey] || []) as TextLayer[];
      if (tLayers.some((l) => l.id === layerId)) return "text";
      return "shape";
    },
    [slideKey],
  );

  const handleUpdateLayer = useCallback(
    (layerId: string, updates: Partial<TextLayer>) => {
      const layerType = getLayerType(layerId);
      if (layerType === "text") {
        updateTextLayer(slideKey, layerId, updates);
      } else {
        const shapeUpdates: Partial<ShapeLayer> = {};
        if (updates.opacity !== undefined) shapeUpdates.opacity = updates.opacity;
        if (updates.visible !== undefined) shapeUpdates.visible = updates.visible;
        if (updates.locked !== undefined) shapeUpdates.locked = updates.locked;
        updateShapeLayer(slideKey, layerId, shapeUpdates);
      }
    },
    [slideKey, updateTextLayer, updateShapeLayer, getLayerType],
  );

  const handleRemoveLayer = useCallback(
    (layerId: string) => {
      const layerType = getLayerType(layerId);
      if (layerType === "text") {
        removeTextLayer(slideKey, layerId);
      } else {
        removeShapeLayer(slideKey, layerId);
      }
    },
    [slideKey, removeTextLayer, removeShapeLayer, getLayerType],
  );

  const handleAddTextLayer = useCallback(() => {
    const newLayer = createDefaultTextLayer("New text");
    addTextLayer(slideKey, newLayer);
  }, [slideKey, addTextLayer]);

  const handleAddShapeLayer = useCallback(() => {
    const newLayer = createDefaultShapeLayer(activeShapeType, 200, 200, shapeFill, shapeStroke, shapeStrokeWidth, shapeWidth, shapeHeight);
    addShapeLayer(slideKey, newLayer);
  }, [slideKey, addShapeLayer, activeShapeType, shapeFill, shapeStroke, shapeStrokeWidth, shapeWidth, shapeHeight]);

  const handleAddLayer = useCallback(() => {
    if (activeTool === "text") {
      handleAddTextLayer();
    } else if (activeTool === "shape") {
      handleAddShapeLayer();
    } else {
      setShowAddLayerDropdown((prev) => !prev);
    }
  }, [activeTool, handleAddTextLayer, handleAddShapeLayer]);

  const handleToggleVisibility = useCallback(
    (layerId: string, visible: boolean) => {
      const layerType = getLayerType(layerId);
      if (layerType === "text") {
        updateTextLayer(slideKey, layerId, { visible });
      } else {
        updateShapeLayer(slideKey, layerId, { visible });
      }
    },
    [slideKey, updateTextLayer, updateShapeLayer, getLayerType],
  );

  const handleToggleLock = useCallback(
    (layerId: string, locked: boolean) => {
      const layerType = getLayerType(layerId);
      if (layerType === "text") {
        updateTextLayer(slideKey, layerId, { locked });
      } else {
        updateShapeLayer(slideKey, layerId, { locked });
      }
    },
    [slideKey, updateTextLayer, updateShapeLayer, getLayerType],
  );

  const handleSelectLayer = useCallback(
    (layerId: string) => {
      useCanvasEditorStore.getState().setSelectedLayer(layerId);
    },
    [],
  );

  const handleObjectErased = useCallback(
    (layerId: string) => {
      handleRemoveLayer(layerId);
    },
    [handleRemoveLayer],
  );

  const handleContextMenu = useCallback((data: ContextMenuData) => {
    setContextMenuState(data);
  }, []);

  const handleContextMenuAction = useCallback(
    (action: string) => {
      if (!contextMenuState) return;
      const { layerId } = contextMenuState;
      const state = useCanvasEditorStore.getState();

      switch (action) {
        case "delete":
          handleRemoveLayer(layerId);
          break;
        case "duplicate": {
          const tLayers = (state.textLayers[slideKey] || []) as TextLayer[];
          const sLayers = (state.shapeLayers[slideKey] || []) as ShapeLayer[];
          const tLayer = tLayers.find((l) => l.id === layerId);
          const sLayer = sLayers.find((l) => l.id === layerId);
          if (tLayer) {
            const newLayer = { ...tLayer, id: crypto.randomUUID(), x: tLayer.x + 20, y: tLayer.y + 20 };
            addTextLayer(slideKey, newLayer);
          } else if (sLayer) {
            const newLayer = { ...sLayer, id: crypto.randomUUID(), x: sLayer.x + 20, y: sLayer.y + 20 };
            addShapeLayer(slideKey, newLayer);
          }
          break;
        }
        case "bringToFront":
          bringToFront(slideKey, layerId);
          break;
        case "sendToBack":
          sendToBack(slideKey, layerId);
          break;
        case "toggleLock": {
          const tLayers2 = (state.textLayers[slideKey] || []) as TextLayer[];
          const sLayers2 = (state.shapeLayers[slideKey] || []) as ShapeLayer[];
          const tLayer2 = tLayers2.find((l) => l.id === layerId);
          const sLayer2 = sLayers2.find((l) => l.id === layerId);
          const currentLocked = tLayer2?.locked ?? sLayer2?.locked ?? false;
          handleToggleLock(layerId, !currentLocked);
          break;
        }
        case "copy": {
          const tLayers3 = (state.textLayers[slideKey] || []) as TextLayer[];
          const sLayers3 = (state.shapeLayers[slideKey] || []) as ShapeLayer[];
          const tLayer3 = tLayers3.find((l) => l.id === layerId);
          const sLayer3 = sLayers3.find((l) => l.id === layerId);
          if (tLayer3) {
            setClipboard({ type: "text", layer: { ...tLayer3 } });
          } else if (sLayer3) {
            setClipboard({ type: "shape", layer: { ...sLayer3 } });
          }
          break;
        }
        case "paste": {
          if (clipboard) {
            const newId = crypto.randomUUID();
            if (clipboard.type === "text") {
              const newLayer = { ...(clipboard.layer as TextLayer), id: newId, x: (clipboard.layer as TextLayer).x + 20, y: (clipboard.layer as TextLayer).y + 20 };
              addTextLayer(slideKey, newLayer);
            } else {
              const newLayer = { ...(clipboard.layer as ShapeLayer), id: newId, x: (clipboard.layer as ShapeLayer).x + 20, y: (clipboard.layer as ShapeLayer).y + 20 };
              addShapeLayer(slideKey, newLayer);
            }
          }
          break;
        }
      }
    },
    [contextMenuState, slideKey, addTextLayer, addShapeLayer, clipboard, setClipboard, handleRemoveLayer, handleToggleLock, bringToFront, sendToBack],
  );

  const handleSave = useCallback(async () => {
    const state = useCanvasEditorStore.getState();
    const currentSlideKey = `slide-${state.activeSlideIndex}`;
    const currentTextLayers = state.textLayers[currentSlideKey] || [];
    const currentShapeLayers = state.shapeLayers[currentSlideKey] || [];

    if (!versionId) {
      toast.error("No version found. Save the content first.");
      return;
    }

    setIsSaving(true);
    try {
      const hasShapeLayers = currentShapeLayers.length > 0;
      await saveMutation.mutateAsync({
        versionId,
        textLayers: { [currentSlideKey]: currentTextLayers },
        ...(hasShapeLayers ? { shapeLayers: { [currentSlideKey]: currentShapeLayers } } : {}),
      });
      setIsDirty(false);
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [versionId, saveMutation, setIsDirty, setIsSaving]);

  const handleUndo = useCallback(() => {
    // Undo for HTML layers: we use the store's reorderLayers. For now, no-op.
    // Could implement a history stack if needed.
  }, []);

  const handleRedo = useCallback(() => {
    // No-op for now
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const selId = useCanvasEditorStore.getState().selectedLayerId;
        if (selId) {
          e.preventDefault();
          handleRemoveLayer(selId);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const selId = useCanvasEditorStore.getState().selectedLayerId;
        if (selId) {
          e.preventDefault();
          const state = useCanvasEditorStore.getState();
          const tLayers = (state.textLayers[slideKey] || []) as TextLayer[];
          const sLayers = (state.shapeLayers[slideKey] || []) as ShapeLayer[];
          const tLayer = tLayers.find((l) => l.id === selId);
          const sLayer = sLayers.find((l) => l.id === selId);
          if (tLayer) {
            setClipboard({ type: "text", layer: { ...tLayer } });
          } else if (sLayer) {
            setClipboard({ type: "shape", layer: { ...sLayer } });
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (clipboard) {
          e.preventDefault();
          const newId = crypto.randomUUID();
          if (clipboard.type === "text") {
            const newLayer = { ...(clipboard.layer as TextLayer), id: newId, x: (clipboard.layer as TextLayer).x + 20, y: (clipboard.layer as TextLayer).y + 20 };
            addTextLayer(slideKey, newLayer);
          } else {
            const newLayer = { ...(clipboard.layer as ShapeLayer), id: newId, x: (clipboard.layer as ShapeLayer).x + 20, y: (clipboard.layer as ShapeLayer).y + 20 };
            addShapeLayer(slideKey, newLayer);
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        const selId = useCanvasEditorStore.getState().selectedLayerId;
        if (selId) {
          e.preventDefault();
          const state = useCanvasEditorStore.getState();
          const tLayers = (state.textLayers[slideKey] || []) as TextLayer[];
          const sLayers = (state.shapeLayers[slideKey] || []) as ShapeLayer[];
          const tLayer = tLayers.find((l) => l.id === selId);
          const sLayer = sLayers.find((l) => l.id === selId);
          if (tLayer) {
            const newLayer = { ...tLayer, id: crypto.randomUUID(), x: tLayer.x + 20, y: tLayer.y + 20 };
            addTextLayer(slideKey, newLayer);
          } else if (sLayer) {
            const newLayer = { ...sLayer, id: crypto.randomUUID(), x: sLayer.x + 20, y: sLayer.y + 20 };
            addShapeLayer(slideKey, newLayer);
          }
        }
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleRemoveLayer, clipboard, setClipboard, addTextLayer, addShapeLayer, slideKey, handleSave]);

  const handleInpaint = useCallback(async () => {
    if (!canvasRef.current || !backgroundImage || isInpainting) return;

    const maskDataUrl = maskCanvasRef.current?.getMaskDataUrl();
    if (!maskDataUrl) {
      toast.error("Paint on the area you want to remove first");
      return;
    }

    setIsInpainting(true);
    try {
      const { api } = await import("@/lib/api");
      const { data } = await api.post(`/api/contents/${id}/inpaint`, {
        imageUrl: backgroundImage,
        maskDataUrl,
      });

      if (data.url) {
        canvasRef.current?.setBackgroundImage(data.url);
        maskCanvasRef.current?.clearMask();
        toast.success("Object removed successfully");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI remove failed");
    } finally {
      setIsInpainting(false);
    }
  }, [backgroundImage, isInpainting, id]);

  const handleUndoStroke = useCallback(() => {
    maskCanvasRef.current?.undoLastStroke();
  }, []);

  const handleClearMask = useCallback(() => {
    maskCanvasRef.current?.clearMask();
  }, []);

  const handleExport = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const state = useCanvasEditorStore.getState();
      const allSlideKeys = Array.from({ length: slideCount }, (_, i) => `slide-${i}`);
      const slidesData = allSlideKeys.map((key) => ({
        textLayers: state.textLayers[key] ?? [],
        shapeLayers: state.shapeLayers[key] ?? [],
        layerOrder: state.layerOrder[key] ?? [],
      }));

      const imageUrls: string[] = [];

      for (let i = 0; i < slideCount; i++) {
        const bgUrl = slideImages[i] || slideImages[0] || "";

        const compositedBlob = await compositeExportToBlob(
          bgUrl,
          slidesData[i],
          width,
          height,
        );

        const formData = new FormData();
        formData.append("file", compositedBlob, `slide-${i + 1}.png`);

        const { data } = await (
          await import("@/lib/api")
        ).api.post("/api/upload/image", formData);

        imageUrls.push(data.url);
      }

      await exportMutation.mutateAsync({
        imageUrls,
        textLayers: state.textLayers,
        shapeLayers: state.shapeLayers,
      });

      setIsDirty(false);
      toast.success("Export complete! New version created.");
      router.push(`/contents/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [
    isExporting,
    slideCount,
    slideImages,
    exportMutation,
    router,
    id,
    width,
    height,
    setIsExporting,
    setIsDirty,
  ]);

  if (isLoading || isLoadingLayers) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  if (!content) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Content not found.</p>
            <Link href="/dashboard">
              <Button className="mt-4">Go to Dashboard</Button>
            </Link>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  const contextMenuLayerId = contextMenuState?.layerId;
  const contextMenuIsLocked = contextMenuLayerId
    ? (() => {
        const state = useCanvasEditorStore.getState();
        return (
          (state.textLayers[slideKey] as TextLayer[] | undefined)?.find((l) => l.id === contextMenuLayerId)?.locked ??
          (state.shapeLayers[slideKey] as ShapeLayer[] | undefined)?.find((l) => l.id === contextMenuLayerId)?.locked ??
          false
        );
      })()
    : false;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-0">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <Link
              href={`/contents/${id}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Content
            </Link>
            <div className="flex items-center gap-3">
              {isSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {isDirty && !isSaving && (
                <span className="text-xs text-amber-500">Unsaved changes</span>
              )}
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleUndo}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleRedo}
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving || !backgroundImage || !isDirty}
                variant="default"
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || !backgroundImage}
                variant="outline"
                size="icon-sm"
                title="Export & create version"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {activeTool === "text" && (
            <TextToolbar
              onUpdateLayer={handleUpdateLayer}
              onRemoveLayer={handleRemoveLayer}
            />
          )}
          {activeTool === "select" && (
            <TextToolbar
              onUpdateLayer={handleUpdateLayer}
              onRemoveLayer={handleRemoveLayer}
            />
          )}
          {activeTool === "shape" && (
            <ShapeToolbar
              fill={shapeFill}
              stroke={shapeStroke}
              strokeWidth={shapeStrokeWidth}
              shapeWidth={shapeWidth}
              shapeHeight={shapeHeight}
              onFillChange={setShapeFill}
              onStrokeChange={setShapeStroke}
              onStrokeWidthChange={setShapeStrokeWidth}
              onShapeWidthChange={setShapeWidth}
              onShapeHeightChange={setShapeHeight}
            />
          )}
          {activeTool === "eraser" && <EraserToolbar />}
          {activeTool === "ai-remove" && (
            <AIRemoveToolbar
              isProcessing={isInpainting}
              onRemove={handleInpaint}
              onUndoStroke={handleUndoStroke}
              onClearMask={handleClearMask}
            />
          )}

          <div className="flex">
            <ToolModeBar />

            <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
              {backgroundImage ? (
                <div className="relative" style={{ width, height }}>
                  <FabricCanvas
                    ref={canvasRef}
                    backgroundImage={backgroundImage}
                    width={width}
                    height={height}
                  />
                  <HtmlLayerRenderer
                    width={width}
                    height={height}
                    slideKey={slideKey}
                    activeTool={activeTool}
                    onContextMenu={handleContextMenu}
                    onObjectErased={handleObjectErased}
                  />
                  <LayerHandles slideKey={slideKey} />
                  {activeTool === "ai-remove" && (
                    <MaskCanvas
                      ref={maskCanvasRef}
                      width={width}
                      height={height}
                      brushSize={brushSize}
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-96 bg-muted rounded-lg">
                  <p className="text-muted-foreground">No background image available</p>
                </div>
              )}
            </div>

            <div className="w-64 border-l border-border/50 flex flex-col">
              <div className="relative">
                <LayerPanel
                  onAddLayer={handleAddLayer}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleLock={handleToggleLock}
                  onRemoveLayer={handleRemoveLayer}
                  onSelectLayer={handleSelectLayer}
                />
                {showAddLayerDropdown && (
                  <div
                    ref={addLayerDropdownRef}
                    className="absolute right-3 top-10 z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md"
                  >
                    <button
                      onClick={() => {
                        handleAddTextLayer();
                        setShowAddLayerDropdown(false);
                      }}
                      className="flex w-full text-primary items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      Add Text Layer
                    </button>
                    <button
                      onClick={() => {
                        handleAddShapeLayer();
                        setShowAddLayerDropdown(false);
                      }}
                      className="flex w-full text-primary items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      Add Shape Layer
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1" />

              <SlideSwitcher
                slideCount={slideCount}
                slideImages={slideImages}
              />
            </div>
          </div>
        </div>

        {contextMenuState && (
          <CanvasContextMenu
            x={contextMenuState.x}
            y={contextMenuState.y}
            layerId={contextMenuState.layerId}
            layerType={contextMenuState.layerType}
            isLocked={contextMenuIsLocked}
            hasClipboard={clipboard !== null}
            onClose={() => setContextMenuState(null)}
            onAction={handleContextMenuAction}
          />
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
