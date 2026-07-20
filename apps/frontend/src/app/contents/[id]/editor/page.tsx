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
import type { ContextMenuData } from "@/components/editor/FabricCanvas";
import { useContent } from "@/hooks/useContents";
import { useTextLayers, useSaveTextLayers, useEditorExport } from "@/hooks/useTextLayers";
import { useTextLayerAutoSave } from "@/hooks/useTextLayerAutoSave";
import { useCanvasEditorStore } from "@/stores/canvas-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, Undo2, Redo2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: content, isLoading } = useContent(id);
  const canvasRef = useRef<FabricCanvasHandle>(null);

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
  const activeTool = useCanvasEditorStore((s) => s.activeTool);
  const activeShapeType = useCanvasEditorStore((s) => s.activeShapeType);
  const brushSize = useCanvasEditorStore((s) => s.brushSize);
  const clipboard = useCanvasEditorStore((s) => s.clipboard);
  const setClipboard = useCanvasEditorStore((s) => s.setClipboard);

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
  const canvasLayers = useMemo(
    () => (savedTextLayers?.textLayers?.[slideKey] ?? []) as TextLayer[],
    [savedTextLayers, slideKey],
  );
  const canvasShapeLayers = useMemo(
    () => (savedTextLayers?.shapeLayers?.[slideKey] ?? []) as ShapeLayer[],
    [savedTextLayers, slideKey],
  );
  const backgroundImage = slideImages[activeSlideIndex] || slideImages[0] || "";

  useEffect(() => {
    if (savedTextLayers && !initialized && versionId) {
      const hasTextLayers = Object.values(savedTextLayers.textLayers).some((layers) => layers.length > 0);
      const hasShapeLayers = Object.values(savedTextLayers.shapeLayers).some((layers) => layers.length > 0);
      if (hasTextLayers) {
        loadAllTextLayers(savedTextLayers.textLayers);
      } else if (content?.script) {
        const aiLayer = createDefaultTextLayer(content.script.slice(0, 100), "ai");
        aiLayer.visible = false;
        loadAllTextLayers({ "slide-0": [aiLayer] });
      }
      if (hasShapeLayers) {
        loadAllShapeLayers(savedTextLayers.shapeLayers);
      }
      setInitialized(true);
    }
  }, [savedTextLayers, initialized, versionId, content, loadAllTextLayers, loadAllShapeLayers]);

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
        canvasRef.current?.updateLayer(layerId, updates);
      } else {
        const shapeUpdates: Partial<ShapeLayer> = {};
        if (updates.opacity !== undefined) shapeUpdates.opacity = updates.opacity;
        if (updates.visible !== undefined) shapeUpdates.visible = updates.visible;
        if (updates.locked !== undefined) shapeUpdates.locked = updates.locked;
        updateShapeLayer(slideKey, layerId, shapeUpdates);
        canvasRef.current?.updateShapeLayerOnCanvas(layerId, shapeUpdates);
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
      canvasRef.current?.removeLayer(layerId);
    },
    [slideKey, removeTextLayer, removeShapeLayer, getLayerType],
  );

  const handleAddTextLayer = useCallback(() => {
    const newLayer = createDefaultTextLayer("New text");
    addTextLayer(slideKey, newLayer);
    canvasRef.current?.addTextLayer(newLayer);
  }, [slideKey, addTextLayer]);

  const handleAddShapeLayer = useCallback(() => {
    const newLayer = createDefaultShapeLayer(activeShapeType, 200, 200, shapeFill, shapeStroke, shapeStrokeWidth, shapeWidth, shapeHeight);
    addShapeLayer(slideKey, newLayer);
    canvasRef.current?.addShapeLayer(newLayer);
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
        canvasRef.current?.updateLayer(layerId, { visible });
      } else {
        updateShapeLayer(slideKey, layerId, { visible });
        canvasRef.current?.updateShapeLayerOnCanvas(layerId, { visible });
      }
    },
    [slideKey, updateTextLayer, updateShapeLayer, getLayerType],
  );

  const handleToggleLock = useCallback(
    (layerId: string, locked: boolean) => {
      const layerType = getLayerType(layerId);
      if (layerType === "text") {
        updateTextLayer(slideKey, layerId, { locked });
        canvasRef.current?.updateLayer(layerId, { locked });
      } else {
        updateShapeLayer(slideKey, layerId, { locked });
        canvasRef.current?.updateShapeLayerOnCanvas(layerId, { locked });
      }
    },
    [slideKey, updateTextLayer, updateShapeLayer, getLayerType],
  );

  const handleSelectLayer = useCallback(
    (layerId: string) => {
      useCanvasEditorStore.getState().setSelectedLayer(layerId);
      canvasRef.current?.selectLayer(layerId);
    },
    [],
  );

  const handleShapeCreated = useCallback(
    (layer: ShapeLayer) => {
      addShapeLayer(slideKey, layer);
    },
    [slideKey, addShapeLayer],
  );

  const handleObjectErased = useCallback(
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

  const handleContextMenu = useCallback((data: ContextMenuData) => {
    setContextMenuState(data);
  }, []);

  const handleContextMenuAction = useCallback(
    (action: string) => {
      if (!contextMenuState) return;
      const { layerId, layerType } = contextMenuState;

      switch (action) {
        case "delete":
          handleRemoveLayer(layerId);
          break;
        case "duplicate": {
          const result = canvasRef.current?.duplicateLayer(layerId);
          if (result) {
            if (layerType === "text") {
              addTextLayer(slideKey, result as TextLayer);
              canvasRef.current?.addTextLayer(result as TextLayer);
            } else {
              addShapeLayer(slideKey, result as ShapeLayer);
              canvasRef.current?.addShapeLayer(result as ShapeLayer);
            }
          }
          break;
        }
        case "bringToFront":
          canvasRef.current?.bringToFront(layerId);
          break;
        case "sendToBack":
          canvasRef.current?.sendToBack(layerId);
          break;
        case "toggleLock": {
          const state = useCanvasEditorStore.getState();
          const tLayers = (state.textLayers[slideKey] || []) as TextLayer[];
          const sLayers = (state.shapeLayers[slideKey] || []) as ShapeLayer[];
          const tLayer = tLayers.find((l) => l.id === layerId);
          const sLayer = sLayers.find((l) => l.id === layerId);
          const currentLocked = tLayer?.locked ?? sLayer?.locked ?? false;
          handleToggleLock(layerId, !currentLocked);
          break;
        }
        case "copy": {
          const serialized = canvasRef.current?.serializeObject(layerId);
          if (serialized) {
            setClipboard(serialized);
          }
          break;
        }
        case "paste": {
          if (clipboard) {
            const newId = crypto.randomUUID();
            if (clipboard.type === "text") {
              const newLayer = { ...(clipboard.layer as TextLayer), id: newId, x: (clipboard.layer as TextLayer).x + 20, y: (clipboard.layer as TextLayer).y + 20 };
              addTextLayer(slideKey, newLayer);
              canvasRef.current?.addTextLayer(newLayer);
            } else {
              const newLayer = { ...(clipboard.layer as ShapeLayer), id: newId, x: (clipboard.layer as ShapeLayer).x + 20, y: (clipboard.layer as ShapeLayer).y + 20 };
              addShapeLayer(slideKey, newLayer);
              canvasRef.current?.addShapeLayer(newLayer);
            }
          }
          break;
        }
      }
    },
    [contextMenuState, slideKey, addTextLayer, addShapeLayer, clipboard, setClipboard, handleRemoveLayer, handleToggleLock],
  );

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    canvasRef.current?.redo();
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
          const serialized = canvasRef.current?.serializeObject(selId);
          if (serialized) {
            setClipboard(serialized);
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
            canvasRef.current?.addTextLayer(newLayer);
          } else {
            const newLayer = { ...(clipboard.layer as ShapeLayer), id: newId, x: (clipboard.layer as ShapeLayer).x + 20, y: (clipboard.layer as ShapeLayer).y + 20 };
            addShapeLayer(slideKey, newLayer);
            canvasRef.current?.addShapeLayer(newLayer);
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        const selId = useCanvasEditorStore.getState().selectedLayerId;
        if (selId) {
          e.preventDefault();
          const layerType = getLayerType(selId);
          const result = canvasRef.current?.duplicateLayer(selId);
          if (result) {
            if (layerType === "text") {
              addTextLayer(slideKey, result as TextLayer);
              canvasRef.current?.addTextLayer(result as TextLayer);
            } else {
              addShapeLayer(slideKey, result as ShapeLayer);
              canvasRef.current?.addShapeLayer(result as ShapeLayer);
            }
          }
        }
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleRemoveLayer, clipboard, setClipboard, addTextLayer, addShapeLayer, slideKey, getLayerType]);

  const handleInpaint = useCallback(async () => {
    if (!canvasRef.current || !backgroundImage || isInpainting) return;

    const maskDataUrl = canvasRef.current.getMaskDataUrl();
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
        canvasRef.current?.clearMask();
        toast.success("Object removed successfully");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI remove failed");
    } finally {
      setIsInpainting(false);
    }
  }, [backgroundImage, isInpainting, id]);

  const handleUndoStroke = useCallback(() => {
    canvasRef.current?.undoLastStroke();
  }, []);

  const handleClearMask = useCallback(() => {
    canvasRef.current?.clearMask();
  }, []);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current || isExporting) return;

    setIsExporting(true);
    try {
      // Get current state from canvas
      const { textLayers: currentTextLayers, shapeLayers: currentShapeLayers } = 
        canvasRef.current.getLayersFromCanvas();
      
      const currentIsDirty = useCanvasEditorStore.getState().isDirty;

      if (currentIsDirty && versionId) {
        const hasShapeLayers = currentShapeLayers.length > 0;
        await saveMutation.mutateAsync({
          versionId,
          textLayers: { [slideKey]: currentTextLayers },
          ...(hasShapeLayers ? { shapeLayers: { [slideKey]: currentShapeLayers } } : {}),
        });
      }

      const imageUrls: string[] = [];

      for (let i = 0; i < slideCount; i++) {
        if (i > 0) setActiveSlide(i);

        const blob = await canvasRef.current.exportAsBlob();
        if (!blob) {
          throw new Error(`Failed to render slide ${i + 1}`);
        }

        const formData = new FormData();
        formData.append("file", blob, `slide-${i + 1}.png`);

        const { data } = await (
          await import("@/lib/api")
        ).api.post("/api/upload/image", formData);

        imageUrls.push(data.url);
      }

      setActiveSlide(0);

      // Get final state from canvas for export
      const { textLayers: finalTextLayers, shapeLayers: finalShapeLayers } = 
        canvasRef.current.getLayersFromCanvas();
      
      const hasFinalShapeLayers = finalShapeLayers.length > 0;
      await exportMutation.mutateAsync({
        imageUrls,
        textLayers: { [slideKey]: finalTextLayers },
        ...(hasFinalShapeLayers ? { shapeLayers: { [slideKey]: finalShapeLayers } } : {}),
      });

      toast.success("Export complete! New version created.");
      router.push(`/contents/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [
    isExporting,
    versionId,
    slideCount,
    slideKey,
    saveMutation,
    exportMutation,
    router,
    id,
    setActiveSlide,
    setIsExporting,
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
                onClick={handleExport}
                disabled={isExporting || !backgroundImage}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save &amp; Export
                  </>
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
                <FabricCanvas
                  key={slideKey}
                  ref={canvasRef}
                  backgroundImage={backgroundImage}
                  width={width}
                  height={height}
                  layers={canvasLayers}
                  shapeLayers={canvasShapeLayers}
                  slideKey={slideKey}
                  activeTool={activeTool}
                  activeShapeType={activeShapeType}
                  brushSize={brushSize}
                  shapeFill={shapeFill}
                  shapeStroke={shapeStroke}
                  shapeStrokeWidth={shapeStrokeWidth}
                  onShapeCreated={handleShapeCreated}
                  onObjectErased={handleObjectErased}
                  onContextMenu={handleContextMenu}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-96 bg-muted rounded-lg">
                  <p className="text-muted-foreground">No background image available</p>
                </div>
              )}
            </div>

            <div className="w-64 border-l border-border/50 flex flex-col">
              <div className="relative">
                <LayerPanel
                  canvasRef={canvasRef}
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
