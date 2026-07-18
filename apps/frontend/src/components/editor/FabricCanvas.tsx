"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";
import type { TextLayer } from "@faceless/shared";
import { useCanvasEditorStore } from "@/stores/canvas-editor";

interface LayerData {
  isTextLayer: boolean;
  layerId: string;
  layerData: TextLayer;
}

interface FabricObjWithData {
  data?: LayerData;
  left?: number;
  top?: number;
  angle?: number;
  width?: number;
  opacity?: number;
  visible?: boolean;
  type?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  fill?: string;
  textAlign?: string;
  set: (props: Record<string, unknown>) => void;
  setCoords: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}

export interface FabricCanvasHandle {
  exportAsBlob: () => Promise<Blob | null>;
  loadLayers: (layers: TextLayer[]) => void;
  addTextLayer: (layer: TextLayer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<TextLayer>) => void;
  selectLayer: (layerId: string | null) => void;
}

interface FabricCanvasProps {
  backgroundImage: string;
  width: number;
  height: number;
  layers: TextLayer[];
  slideKey: string;
}

function getObjData(obj: unknown): LayerData | undefined {
  return (obj as FabricObjWithData).data;
}

function asObj(obj: unknown): FabricObjWithData {
  return obj as FabricObjWithData;
}

export const FabricCanvas = forwardRef<FabricCanvasHandle, FabricCanvasProps>(
  ({ backgroundImage, width, height, layers, slideKey }, ref) => {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const fabricRef = useRef<InstanceType<typeof import("fabric").Canvas> | null>(null);
    const fabricModRef = useRef<typeof import("fabric") | null>(null);
    const isSyncingRef = useRef(false);
    const isReadyRef = useRef(false);
    const isRenderingRef = useRef(false);
    const renderVersionRef = useRef(0);
    const initialRenderRef = useRef(true);
    const propsRef = useRef({ backgroundImage, width, height, layers, slideKey });

    propsRef.current = { backgroundImage, width, height, layers, slideKey };

    const [canvasReady, setCanvasReady] = useState(false);

    const setTextLayers = useCanvasEditorStore((s) => s.setTextLayers);
    const setSelectedLayer = useCanvasEditorStore((s) => s.setSelectedLayer);
    const selectedLayerId = useCanvasEditorStore((s) => s.selectedLayerId);

    const syncLayersToStore = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas || isSyncingRef.current) return;

      isSyncingRef.current = true;
      const updatedLayers: TextLayer[] = [];

      canvas.getObjects().forEach((obj) => {
        const data = getObjData(obj);
        if (data?.isTextLayer && data?.layerData) {
          const o = asObj(obj);
          updatedLayers.push({
            ...data.layerData,
            x: o.left ?? 0,
            y: o.top ?? 0,
            angle: o.angle ?? 0,
            width: o.width ?? 200,
            opacity: o.opacity ?? 1,
            visible: o.visible ?? true,
          });
        }
      });

      setTextLayers(propsRef.current.slideKey, updatedLayers);
      isSyncingRef.current = false;
    }, [setTextLayers]);

    const renderLayersOnCanvas = useCallback(
      (canvas: InstanceType<typeof import("fabric").Canvas>, layerData: TextLayer[], fabricMod: typeof import("fabric")) => {
        for (const layer of layerData) {
          const text = new fabricMod.IText(layer.text, {
            left: layer.x,
            top: layer.y,
            fontFamily: layer.fontFamily,
            fontSize: layer.fontSize,
            fontWeight: layer.fontWeight,
            fontStyle: layer.fontStyle,
            fill: layer.color,
            textAlign: layer.textAlign,
            originX: layer.originX,
            originY: layer.originY,
            angle: layer.angle,
            opacity: layer.opacity,
            visible: layer.visible,
            selectable: !layer.locked,
            evented: !layer.locked,
            width: layer.width,
          } as Record<string, unknown>);
          (text as unknown as FabricObjWithData).data = {
            isTextLayer: true,
            layerId: layer.id,
            layerData: { ...layer },
          };
          canvas.add(text);
        }
        canvas.renderAll();
      },
      [],
    );

    const clearTextObjects = useCallback((canvas: InstanceType<typeof import("fabric").Canvas>) => {
      const toRemove: import("fabric").FabricObject[] = [];
      canvas.getObjects().forEach((obj) => {
        const data = getObjData(obj);
        if (data?.isTextLayer) {
          toRemove.push(obj);
        }
      });
      toRemove.forEach((obj) => canvas.remove(obj));
    }, []);

    useEffect(() => {
      if (!canvasElRef.current) return;

      let disposed = false;

      const initCanvas = async () => {
        const fabricMod = await import("fabric");

        if (disposed || !canvasElRef.current) return;

        fabricModRef.current = fabricMod;

        const canvas = new fabricMod.Canvas(canvasElRef.current, {
          width: propsRef.current.width,
          height: propsRef.current.height,
          selection: true,
        });

        if (disposed) {
          canvas.dispose();
          return;
        }

        fabricRef.current = canvas;

        canvas.on("selection:created", (e: { selected?: unknown[] }) => {
          const obj = e.selected?.[0];
          const data = obj ? getObjData(obj) : undefined;
          if (data?.isTextLayer) {
            setSelectedLayer(data.layerId);
          }
        });

        canvas.on("selection:updated", (e: { selected?: unknown[] }) => {
          const obj = e.selected?.[0];
          const data = obj ? getObjData(obj) : undefined;
          if (data?.isTextLayer) {
            setSelectedLayer(data.layerId);
          }
        });

        canvas.on("selection:cleared", () => {
          setSelectedLayer(null);
        });

        canvas.on("object:modified", () => {
          syncLayersToStore();
        });

        canvas.on("object:added", (e: { target?: unknown }) => {
          const obj = e.target;
          const data = obj ? getObjData(obj) : undefined;
          const o = obj ? asObj(obj) : null;
          if (data?.isTextLayer && o?.type === "i-text") {
            o.on("changed", () => {
              if (data.layerData) {
                data.layerData = {
                  ...data.layerData,
                  text: o.text ?? "",
                };
              }
              syncLayersToStore();
            });
          }
        });

        const bgUrl = propsRef.current.backgroundImage;
        if (bgUrl) {
          try {
            const img = await fabricMod.FabricImage.fromURL(bgUrl, {
              crossOrigin: "anonymous",
            });
            const cw = propsRef.current.width;
            const ch = propsRef.current.height;
            const scaleX = cw / (img.width ?? cw);
            const scaleY = ch / (img.height ?? ch);
            img.set({
              scaleX,
              scaleY,
              left: cw / 2,
              top: ch / 2,
              originX: "center",
              originY: "center",
              selectable: false,
              evented: false,
            });
            canvas.add(img);
            canvas.sendObjectToBack(img);
          } catch {
            // Background image failed to load
          }
        }
        renderLayersOnCanvas(canvas, propsRef.current.layers, fabricMod);
        canvas.renderAll();

        isReadyRef.current = true;
        setCanvasReady(true);
      };

      initCanvas();

      return () => {
        disposed = true;
        isReadyRef.current = false;
        fabricRef.current?.dispose();
        fabricRef.current = null;
        setCanvasReady(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (!canvasReady) return;

      if (initialRenderRef.current) {
        initialRenderRef.current = false;
        return;
      }

      const version = ++renderVersionRef.current;
      isRenderingRef.current = true;

      const renderSlide = async () => {
        const canvas = fabricRef.current!;
        const fabricMod = fabricModRef.current!;

        canvas.clear();

        const bgUrl = propsRef.current.backgroundImage;
        if (bgUrl) {
          try {
            const img = await fabricMod.FabricImage.fromURL(bgUrl, {
              crossOrigin: "anonymous",
            });

            if (version !== renderVersionRef.current) {
              isRenderingRef.current = false;
              return;
            }

            const cw = propsRef.current.width;
            const ch = propsRef.current.height;
            const scaleX = cw / (img.width ?? cw);
            const scaleY = ch / (img.height ?? ch);
            img.set({
              scaleX,
              scaleY,
              left: cw / 2,
              top: ch / 2,
              originX: "center",
              originY: "center",
              selectable: false,
              evented: false,
            });
            canvas.add(img);
            canvas.sendObjectToBack(img);
          } catch {
            // Background image failed to load
          }
        }

        if (version !== renderVersionRef.current) {
          isRenderingRef.current = false;
          return;
        }

        renderLayersOnCanvas(canvas, propsRef.current.layers, fabricMod);
        canvas.renderAll();
        isRenderingRef.current = false;
      };

      renderSlide();
    }, [slideKey, canvasReady, renderLayersOnCanvas]);

    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas || !isReadyRef.current) return;

      canvas.getObjects().forEach((obj) => {
        const data = getObjData(obj);
        if (data?.isTextLayer && data.layerId === selectedLayerId) {
          canvas.setActiveObject(obj);
          canvas.renderAll();
        }
      });
    }, [selectedLayerId]);

    useImperativeHandle(ref, () => ({
      exportAsBlob: () => {
        return new Promise<Blob | null>((resolve) => {
          const tryExport = () => {
            if (!isReadyRef.current || isRenderingRef.current) {
              setTimeout(tryExport, 50);
              return;
            }
            const canvas = fabricRef.current;
            if (!canvas) {
              resolve(null);
              return;
            }
            const htmlCanvas = canvas.getElement() as HTMLCanvasElement;
            htmlCanvas.toBlob((blob) => resolve(blob), "image/png");
          };
          tryExport();
        });
      },
      loadLayers: (newLayers: TextLayer[]) => {
        const canvas = fabricRef.current;
        const fabricMod = fabricModRef.current;
        if (!canvas || !fabricMod) return;
        clearTextObjects(canvas);
        renderLayersOnCanvas(canvas, newLayers, fabricMod);
      },
      addTextLayer: (layer: TextLayer) => {
        const canvas = fabricRef.current;
        const fabricMod = fabricModRef.current;
        if (!canvas || !fabricMod) return;
        const text = new fabricMod.IText(layer.text, {
          left: layer.x,
          top: layer.y,
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize,
          fontWeight: layer.fontWeight,
          fontStyle: layer.fontStyle,
          fill: layer.color,
          textAlign: layer.textAlign,
          originX: layer.originX,
          originY: layer.originY,
          angle: layer.angle,
          opacity: layer.opacity,
          visible: layer.visible,
          selectable: !layer.locked,
          evented: !layer.locked,
          width: layer.width,
        } as Record<string, unknown>);
        (text as unknown as FabricObjWithData).data = {
          isTextLayer: true,
          layerId: layer.id,
          layerData: { ...layer },
        };
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
      },
      removeLayer: (layerId: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        canvas.getObjects().forEach((obj) => {
          const data = getObjData(obj);
          if (data?.layerId === layerId) {
            canvas.remove(obj);
          }
        });
        canvas.renderAll();
      },
      updateLayer: (layerId: string, updates: Partial<TextLayer>) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        canvas.getObjects().forEach((obj) => {
          const data = getObjData(obj);
          const o = asObj(obj);
          if (data?.layerId === layerId && data?.isTextLayer) {
            if (updates.fontFamily !== undefined) o.fontFamily = updates.fontFamily;
            if (updates.fontSize !== undefined) o.fontSize = updates.fontSize;
            if (updates.fontWeight !== undefined) o.fontWeight = updates.fontWeight;
            if (updates.fontStyle !== undefined) o.fontStyle = updates.fontStyle;
            if (updates.color !== undefined) o.fill = updates.color;
            if (updates.textAlign !== undefined) o.textAlign = updates.textAlign;
            if (updates.opacity !== undefined) o.set({ opacity: updates.opacity });
            if (updates.visible !== undefined) o.set({ visible: updates.visible });
            if (updates.locked !== undefined) {
              o.set({ selectable: !updates.locked, evented: !updates.locked });
            }
            if (updates.text !== undefined) {
              o.text = updates.text;
            }
            if (data.layerData) {
              data.layerData = { ...data.layerData, ...updates };
            }
            o.setCoords();
            canvas.renderAll();
          }
        });
      },
      selectLayer: (layerId: string | null) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        if (layerId === null) {
          canvas.discardActiveObject();
          canvas.renderAll();
          return;
        }
        canvas.getObjects().forEach((obj) => {
          const data = getObjData(obj);
          if (data?.layerId === layerId) {
            canvas.setActiveObject(obj);
          }
        });
        canvas.renderAll();
      },
    }));

    return (
      <div
        ref={canvasWrapperRef}
        className="relative inline-block border border-border/50 rounded-lg overflow-hidden bg-muted/30"
        style={{ width, height }}
      >
        <canvas
          ref={canvasElRef}
          width={width}
          height={height}
          style={{ display: canvasReady ? "block" : "none" }}
        />
        {!canvasReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    );
  },
);

FabricCanvas.displayName = "FabricCanvas";