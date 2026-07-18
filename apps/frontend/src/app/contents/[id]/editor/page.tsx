"use client";

import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TextToolbar } from "@/components/editor/TextToolbar";
import { LayerPanel } from "@/components/editor/LayerPanel";
import { SlideSwitcher } from "@/components/editor/SlideSwitcher";
import { useContent } from "@/hooks/useContents";
import { useTextLayers, useSaveTextLayers, useEditorExport } from "@/hooks/useTextLayers";
import { useTextLayerAutoSave } from "@/hooks/useTextLayerAutoSave";
import { useCanvasEditorStore } from "@/stores/canvas-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import type { TextLayer } from "@faceless/shared";
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
  };
}

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: content, isLoading } = useContent(id);
  const canvasRef = useRef<FabricCanvasHandle>(null);

  const textLayers = useCanvasEditorStore((s) => s.textLayers);
  const activeSlideIndex = useCanvasEditorStore((s) => s.activeSlideIndex);
  const isDirty = useCanvasEditorStore((s) => s.isDirty);
  const isSaving = useCanvasEditorStore((s) => s.isSaving);
  const isExporting = useCanvasEditorStore((s) => s.isExporting);
  const loadAllTextLayers = useCanvasEditorStore((s) => s.loadAllTextLayers);
  const addTextLayer = useCanvasEditorStore((s) => s.addTextLayer);
  const removeTextLayer = useCanvasEditorStore((s) => s.removeTextLayer);
  const updateTextLayer = useCanvasEditorStore((s) => s.updateTextLayer);
  const setActiveSlide = useCanvasEditorStore((s) => s.setActiveSlide);
  const setIsExporting = useCanvasEditorStore((s) => s.setIsExporting);

  const latestVersion = content?.versions?.[0];
  const versionId = latestVersion?.id;

  const { data: savedTextLayers, isLoading: isLoadingLayers } = useTextLayers(id, versionId);
  const saveMutation = useSaveTextLayers(id);
  const exportMutation = useEditorExport(id);

  const [initialized, setInitialized] = useState(false);

  useTextLayerAutoSave(id, versionId, saveMutation.mutateAsync);

  const images = content?.media?.filter((m: { type: string }) => m.type === "image") ?? [];
  const slideImages = images.map((m: { url: string }) => m.url);
  const slideCount = content?.type === "slide" ? Math.max(images.length, 1) : 1;
  const { width, height } = getCanvasDimensions(content?.aspectRatio ?? null);

  const slideKey = `slide-${activeSlideIndex}`;
  const currentLayers = textLayers[slideKey] || [];
  const backgroundImage = slideImages[activeSlideIndex] || slideImages[0] || "";

  useEffect(() => {
    if (savedTextLayers && !initialized && versionId) {
      const hasLayers = Object.values(savedTextLayers).some((layers) => layers.length > 0);
      if (hasLayers) {
        loadAllTextLayers(savedTextLayers);
      } else if (content?.script) {
        const aiLayer = createDefaultTextLayer(content.script.slice(0, 100), "ai");
        aiLayer.visible = false;
        loadAllTextLayers({ "slide-0": [aiLayer] });
      }
      setInitialized(true);
    }
  }, [savedTextLayers, initialized, versionId, content, loadAllTextLayers]);

  useEffect(() => {
    return () => {
      useCanvasEditorStore.getState().reset();
    };
  }, []);

  const handleUpdateLayer = useCallback(
    (layerId: string, updates: Partial<TextLayer>) => {
      updateTextLayer(slideKey, layerId, updates);
      canvasRef.current?.updateLayer(layerId, updates);
    },
    [slideKey, updateTextLayer],
  );

  const handleRemoveLayer = useCallback(
    (layerId: string) => {
      removeTextLayer(slideKey, layerId);
      canvasRef.current?.removeLayer(layerId);
    },
    [slideKey, removeTextLayer],
  );

  const handleAddText = useCallback(() => {
    const newLayer = createDefaultTextLayer("New text");
    addTextLayer(slideKey, newLayer);
    canvasRef.current?.addTextLayer(newLayer);
  }, [slideKey, addTextLayer]);

  const handleToggleVisibility = useCallback(
    (layerId: string, visible: boolean) => {
      updateTextLayer(slideKey, layerId, { visible });
      canvasRef.current?.updateLayer(layerId, { visible });
    },
    [slideKey, updateTextLayer],
  );

  const handleToggleLock = useCallback(
    (layerId: string, locked: boolean) => {
      updateTextLayer(slideKey, layerId, { locked });
      canvasRef.current?.updateLayer(layerId, { locked });
    },
    [slideKey, updateTextLayer],
  );

  const handleSelectLayer = useCallback(
    (layerId: string) => {
      useCanvasEditorStore.getState().setSelectedLayer(layerId);
      canvasRef.current?.selectLayer(layerId);
    },
    [],
  );

  const handleExport = useCallback(async () => {
    if (!canvasRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const currentTextLayers = useCanvasEditorStore.getState().textLayers;
      const currentIsDirty = useCanvasEditorStore.getState().isDirty;

      if (currentIsDirty && versionId) {
        await saveMutation.mutateAsync({ versionId, textLayers: currentTextLayers });
      }

      const imageUrls: string[] = [];

      for (let i = 0; i < slideCount; i++) {
        setActiveSlide(i);

        const blob = await canvasRef.current.exportAsBlob();
        if (!blob) {
          throw new Error(`Failed to render slide ${i + 1}`);
        }

        const formData = new FormData();
        formData.append("file", blob, `slide-${i + 1}.png`);

        const { data } = await (
          await import("@/lib/api")
        ).api.post("/api/upload/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        imageUrls.push(data.url);
      }

      setActiveSlide(0);

      const finalTextLayers = useCanvasEditorStore.getState().textLayers;
      await exportMutation.mutateAsync({ imageUrls, textLayers: finalTextLayers });

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

          <TextToolbar
            onUpdateLayer={handleUpdateLayer}
            onRemoveLayer={handleRemoveLayer}
          />

          <div className="flex">
            <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
              {backgroundImage ? (
                <FabricCanvas
                  key={slideKey}
                  ref={canvasRef}
                  backgroundImage={backgroundImage}
                  width={width}
                  height={height}
                  layers={currentLayers}
                  slideKey={slideKey}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-96 bg-muted rounded-lg">
                  <p className="text-muted-foreground">No background image available</p>
                </div>
              )}
            </div>

            <div className="w-64 border-l border-border/50 flex flex-col">
              <LayerPanel
                onAddText={handleAddText}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onRemoveLayer={handleRemoveLayer}
                onSelectLayer={handleSelectLayer}
              />

              <div className="flex-1" />

              <SlideSwitcher
                slideCount={slideCount}
                slideImages={slideImages}
              />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}