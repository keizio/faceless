"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState, memo } from "react";
import type { TextLayer, ShapeLayer, ShapeType } from "@faceless/shared";
import { useCanvasEditorStore } from "@/stores/canvas-editor";
import type { ToolMode } from "@/stores/canvas-editor";

interface LayerData {
  isTextLayer?: boolean;
  isShapeLayer?: boolean;
  isMaskObject?: boolean;
  isBackground?: boolean;
  layerId: string;
  layerData: TextLayer | ShapeLayer;
}

interface FabricObjWithData {
  data?: LayerData;
  left?: number;
  top?: number;
  angle?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  visible?: boolean;
  type?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  textAlign?: string;
  originX?: string;
  originY?: string;
  selectable?: boolean;
  evented?: boolean;
  underline?: boolean;
  linethrough?: boolean;
  charSpacing?: number;
  lineHeight?: number;
  textBackgroundColor?: string;
  set: (props: Record<string, unknown>) => void;
  setCoords: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  getBoundingRect?: () => { left: number; top: number; width: number; height: number };
  clone?: () => Promise<unknown>;
}

export interface FabricCanvasHandle {
  exportAsBlob: () => Promise<Blob | null>;
  loadLayers: (layers: TextLayer[]) => void;
  addTextLayer: (layer: TextLayer) => void;
  addShapeLayer: (layer: ShapeLayer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<TextLayer>) => void;
  updateShapeLayerOnCanvas: (layerId: string, updates: Partial<ShapeLayer>) => void;
  selectLayer: (layerId: string | null) => void;
  getMaskDataUrl: () => string | null;
  clearMask: () => void;
  undoLastStroke: () => void;
  setBackgroundImage: (url: string) => void;
  undo: () => void;
  redo: () => void;
  duplicateLayer: (layerId: string) => ShapeLayer | TextLayer | null;
  bringToFront: (layerId: string) => void;
  sendToBack: (layerId: string) => void;
  serializeObject: (layerId: string) => { type: "text" | "shape"; layer: TextLayer | ShapeLayer } | null;
}

export interface ContextMenuData {
  x: number;
  y: number;
  layerId: string;
  layerType: "text" | "shape";
}

interface FabricCanvasProps {
  backgroundImage: string;
  width: number;
  height: number;
  layers: TextLayer[];
  shapeLayers: ShapeLayer[];
  slideKey: string;
  activeTool: ToolMode;
  activeShapeType: ShapeType;
  brushSize: number;
  shapeFill: string;
  shapeStroke: string;
  shapeStrokeWidth: number;
  onShapeCreated: (layer: ShapeLayer) => void;
  onObjectErased: (layerId: string) => void;
  onContextMenu: (data: ContextMenuData) => void;
}

function getObjData(obj: unknown): LayerData | undefined {
  return (obj as FabricObjWithData).data;
}

function asObj(obj: unknown): FabricObjWithData {
  return obj as FabricObjWithData;
}

const arePropsEqual = (
  prev: FabricCanvasProps,
  next: FabricCanvasProps,
): boolean => {
  if (prev.slideKey !== next.slideKey) return false;
  if (prev.backgroundImage !== next.backgroundImage) return false;
  if (prev.width !== next.width || prev.height !== next.height) return false;
  if (prev.activeTool !== next.activeTool) return false;
  if (prev.activeShapeType !== next.activeShapeType) return false;
  if (prev.brushSize !== next.brushSize) return false;
  if (prev.shapeFill !== next.shapeFill) return false;
  if (prev.shapeStroke !== next.shapeStroke) return false;
  if (prev.shapeStrokeWidth !== next.shapeStrokeWidth) return false;
  return true;
};

export const FabricCanvas = memo(
  forwardRef<FabricCanvasHandle, FabricCanvasProps>(
  (
    {
      backgroundImage,
      width,
      height,
      layers,
      shapeLayers,
      slideKey,
      activeTool,
      activeShapeType,
      brushSize,
      shapeFill,
      shapeStroke,
      shapeStrokeWidth,
      onShapeCreated,
      onObjectErased,
      onContextMenu,
    },
    ref,
  ) => {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const fabricRef = useRef<InstanceType<typeof import("fabric").Canvas> | null>(null);
    const fabricModRef = useRef<typeof import("fabric") | null>(null);
    const isSyncingRef = useRef(false);
    const isReadyRef = useRef(false);
    const isRenderingRef = useRef(false);
    const renderVersionRef = useRef(0);
    const initialRenderRef = useRef(true);
    const maskObjectsRef = useRef<unknown[]>([]);
    const undoStackRef = useRef<string[]>([]);
    const redoStackRef = useRef<string[]>([]);
    const isUndoRedoRef = useRef(false);
    const objectMapRef = useRef<Map<string, import("fabric").FabricObject>>(new Map());
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastToolRef = useRef<ToolMode | null>(null);
    const isInitializingRef = useRef(false);
    const bgImageUrlRef = useRef("");
    const exportResolveRef = useRef<(() => void) | null>(null);
    const propsRef = useRef({
      backgroundImage,
      width,
      height,
      layers,
      shapeLayers,
      slideKey,
      activeTool,
      activeShapeType,
      brushSize,
      shapeFill,
      shapeStroke,
      shapeStrokeWidth,
    });

    propsRef.current = {
      backgroundImage,
      width,
      height,
      layers,
      shapeLayers,
      slideKey,
      activeTool,
      activeShapeType,
      brushSize,
      shapeFill,
      shapeStroke,
      shapeStrokeWidth,
    };

    const [canvasReady, setCanvasReady] = useState(false);

    const setTextLayers = useCanvasEditorStore((s) => s.setTextLayers);
    const setSelectedLayer = useCanvasEditorStore((s) => s.setSelectedLayer);
    const selectedLayerId = useCanvasEditorStore((s) => s.selectedLayerId);
    const addShapeLayerToStore = useCanvasEditorStore((s) => s.addShapeLayer);
    const updateShapeLayerInStore = useCanvasEditorStore((s) => s.updateShapeLayer);

    const syncLayersToStore = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas || isSyncingRef.current) return;

      isSyncingRef.current = true;
      const updatedTextLayers: TextLayer[] = [];
      const updatedShapeLayers: ShapeLayer[] = [];
      const sk = propsRef.current.slideKey;

      canvas.getObjects().forEach((obj) => {
        const data = getObjData(obj);
        const o = asObj(obj);
        if (data?.isTextLayer && data?.layerData) {
          updatedTextLayers.push({
            ...(data.layerData as TextLayer),
            x: o.left ?? 0,
            y: o.top ?? 0,
            angle: o.angle ?? 0,
            width: (o.width ?? 200) * (o.scaleX ?? 1),
            opacity: o.opacity ?? 1,
            visible: o.visible ?? true,
            originX: (o.originX ?? "center") as "center" | "left" | "right",
            originY: (o.originY ?? "center") as "center" | "top" | "bottom",
          });
        }
        if (data?.isShapeLayer && data?.layerData) {
          updatedShapeLayers.push({
            ...(data.layerData as ShapeLayer),
            x: o.left ?? 0,
            y: o.top ?? 0,
            width: (o.width ?? 200) * (o.scaleX ?? 1),
            height: (o.height ?? 200) * (o.scaleY ?? 1),
            angle: o.angle ?? 0,
            opacity: o.opacity ?? 1,
            visible: o.visible ?? true,
            fill: (o.fill as string) ?? "transparent",
            stroke: (o.stroke as string) ?? "#ffffff",
            strokeWidth: (o.strokeWidth as number) ?? 2,
          });
        }
      });

      setTextLayers(sk, updatedTextLayers);
      const currentShapeLayers = useCanvasEditorStore.getState().shapeLayers[sk] || [];
      const existingIds = new Set(updatedShapeLayers.map((l) => l.id));
      const newIds = new Set(currentShapeLayers.map((l) => l.id));
      for (const sl of updatedShapeLayers) {
        if (newIds.has(sl.id)) {
          updateShapeLayerInStore(sk, sl.id, sl);
        } else {
          addShapeLayerToStore(sk, sl);
        }
      }
      for (const sl of currentShapeLayers) {
        if (!existingIds.has(sl.id)) {
          useCanvasEditorStore.getState().removeShapeLayer(sk, sl.id);
        }
      }

      isSyncingRef.current = false;
    }, [setTextLayers, addShapeLayerToStore, updateShapeLayerInStore]);

    const debouncedSync = useCallback(() => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        syncLayersToStore();
        syncTimerRef.current = null;
      }, 300);
    }, [syncLayersToStore]);

    const saveUndoState = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas || isUndoRedoRef.current || isInitializingRef.current) return;
      const json = JSON.stringify(canvas.toDatalessJSON());
      undoStackRef.current.push(json);
      if (undoStackRef.current.length > 20) undoStackRef.current.shift();
      redoStackRef.current = [];
    }, []);

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
            underline: layer.underline ?? false,
            linethrough: layer.linethrough ?? false,
            charSpacing: layer.charSpacing ?? 0,
            lineHeight: layer.lineHeight ?? 1.2,
            stroke: layer.textStroke ?? "transparent",
            strokeWidth: layer.textStrokeWidth ?? 0,
            textBackgroundColor: layer.textBackgroundColor ?? "transparent",
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

    const renderShapeLayersOnCanvas = useCallback(
      (canvas: InstanceType<typeof import("fabric").Canvas>, shapeData: ShapeLayer[], fabricMod: typeof import("fabric")) => {
        for (const layer of shapeData) {
          let fabricObj: unknown;
          if (layer.type === "rectangle") {
            fabricObj = new fabricMod.Rect({
              left: layer.x,
              top: layer.y,
              width: layer.width,
              height: layer.height,
              fill: layer.fill,
              stroke: layer.stroke,
              strokeWidth: layer.strokeWidth,
              rx: layer.rx ?? 0,
              ry: layer.rx ?? 0,
              opacity: layer.opacity,
              angle: layer.angle,
            });
          } else if (layer.type === "circle") {
            fabricObj = new fabricMod.Ellipse({
              left: layer.x,
              top: layer.y,
              rx: layer.width / 2,
              ry: layer.height / 2,
              fill: layer.fill,
              stroke: layer.stroke,
              strokeWidth: layer.strokeWidth,
              opacity: layer.opacity,
              angle: layer.angle,
            });
          } else if (layer.type === "line") {
            fabricObj = new fabricMod.Line(
              [layer.x, layer.y, layer.x2 ?? layer.x + layer.width, layer.y2 ?? layer.y],
              { stroke: layer.stroke, strokeWidth: Math.max(layer.strokeWidth, 2) },
            );
          } else if (layer.type === "arrow") {
            const x1 = layer.x;
            const y1 = layer.y;
            const x2 = layer.x2 ?? layer.x + layer.width;
            const headSize = 12;
            const line = new fabricMod.Line([x1, y1, x2, y1], {
              stroke: layer.stroke,
              strokeWidth: Math.max(layer.strokeWidth, 2),
            });
            const triangle = new fabricMod.Triangle({
              left: x2,
              top: y1,
              width: headSize,
              height: headSize,
              fill: layer.stroke,
              angle: 90,
              originX: "center",
              originY: "center",
            });
            fabricObj = new fabricMod.Group([line, triangle], {
              left: x1,
              top: y1 - headSize / 2,
            });
          }
          if (fabricObj) {
            const fObj = fabricObj as FabricObjWithData;
            fObj.data = {
              isShapeLayer: true,
              layerId: layer.id,
              layerData: { ...layer },
            };
            canvas.add(fabricObj as import("fabric").FabricObject);
          }
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

    const applyToolMode = useCallback(
      (canvas: InstanceType<typeof import("fabric").Canvas>, tool: ToolMode) => {
        if (tool === lastToolRef.current) return;
        lastToolRef.current = tool;

        const fabricMod = fabricModRef.current;
        if (!fabricMod) return;

        canvas.isDrawingMode = tool === "ai-remove";

        if (tool === "ai-remove") {
          canvas.selection = false;
          canvas.defaultCursor = "crosshair";
          canvas.hoverCursor = "crosshair";
          const brush = new fabricMod.PencilBrush(canvas);
          brush.color = "rgba(255, 0, 0, 0.5)";
          brush.width = propsRef.current.brushSize;
          canvas.freeDrawingBrush = brush;

          canvas.off("path:created", (() => {}) as never);
          canvas.on("path:created", ((e: { path?: unknown }) => {
            const path = e.path as FabricObjWithData;
            if (path) {
              const maskId = `__mask__${Date.now()}`;
              path.data = { isMaskObject: true, layerId: maskId, layerData: {} as ShapeLayer };
              maskObjectsRef.current.push(path);
              objectMapRef.current.set(maskId, path as import("fabric").FabricObject);
            }
          }) as never);

          canvas.getObjects().forEach((obj) => {
            const data = getObjData(obj);
            if (!data?.isMaskObject && !data?.isBackground) {
              obj.set({ selectable: false, evented: false } as Record<string, unknown>);
            }
          });
        } else if (tool === "eraser") {
          canvas.selection = false;
          canvas.defaultCursor = "pointer";
          canvas.hoverCursor = "pointer";

          canvas.getObjects().forEach((obj) => {
            const data = getObjData(obj);
            if (data?.isTextLayer || data?.isShapeLayer) {
              obj.set({ selectable: false, evented: true } as Record<string, unknown>);
            }
          });
        } else if (tool === "shape") {
          canvas.selection = false;
          canvas.defaultCursor = "crosshair";
          canvas.hoverCursor = "crosshair";

          canvas.getObjects().forEach((obj) => {
            const data = getObjData(obj);
            if (data?.isTextLayer || data?.isShapeLayer) {
              obj.set({ selectable: true, evented: true } as Record<string, unknown>);
            }
          });
        } else {
          canvas.selection = true;
          canvas.defaultCursor = "default";
          canvas.hoverCursor = "move";

          canvas.getObjects().forEach((obj) => {
            const data = getObjData(obj);
            if (data?.isTextLayer || data?.isShapeLayer) {
              const layerData = data.layerData as TextLayer | ShapeLayer;
              const locked = "locked" in layerData ? layerData.locked : false;
              obj.set({ selectable: !locked, evented: !locked } as Record<string, unknown>);
            }
          });
        }

        canvas.renderAll();
      },
      [],
    );

    const loadBackgroundImage = useCallback(async (canvas: InstanceType<typeof import("fabric").Canvas>, fabricMod: typeof import("fabric"), url: string) => {
      if (url === bgImageUrlRef.current) return;
      bgImageUrlRef.current = url;
      try {
        const img = await fabricMod.FabricImage.fromURL(url);
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
        (img as unknown as FabricObjWithData).data = {
          isBackground: true,
          layerId: "__bg__",
          layerData: {} as ShapeLayer,
        };
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
      } catch {
        console.error("Failed to load background image:", url);
      }
    }, []);

    useEffect(() => {
      if (!canvasElRef.current) return;

      let disposed = false;

      const initCanvas = async () => {
        isInitializingRef.current = true;
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
          if (data?.isTextLayer || data?.isShapeLayer) {
            setSelectedLayer(data.layerId);
          }
        });

        canvas.on("selection:updated", (e: { selected?: unknown[] }) => {
          const obj = e.selected?.[0];
          const data = obj ? getObjData(obj) : undefined;
          if (data?.isTextLayer || data?.isShapeLayer) {
            setSelectedLayer(data.layerId);
          }
        });

        canvas.on("selection:cleared", () => {
          setSelectedLayer(null);
        });

        canvas.on("object:modified", () => {
          saveUndoState();
          debouncedSync();
        });

        canvas.on("object:added", (e: { target?: unknown }) => {
          saveUndoState();
          const obj = e.target;
          const data = obj ? getObjData(obj) : undefined;
          if (data?.layerId && data?.layerId !== "__bg__" && !data?.isMaskObject) {
            objectMapRef.current.set(data.layerId, obj as import("fabric").FabricObject);
          }
          const o = obj ? asObj(obj) : null;
          if (data?.isTextLayer && o?.type === "i-text") {
            o.on("changed", () => {
              if (data.layerData) {
                (data.layerData as TextLayer).text = o.text ?? "";
              }
              debouncedSync();
            });
          }
        });

        canvas.on("object:removed", (e: { target?: unknown }) => {
          saveUndoState();
          const data = e.target ? getObjData(e.target) : undefined;
          if (data?.layerId && data.layerId !== "__bg__") {
            objectMapRef.current.delete(data.layerId);
          }
        });

        canvas.on("mouse:down", ((e: { target?: unknown; pointer?: { x: number; y: number }; e?: MouseEvent }) => {
          const tool = propsRef.current.activeTool;

          if (tool === "eraser" && e.target) {
            const data = getObjData(e.target);
            if (data?.isTextLayer || data?.isShapeLayer) {
              canvas.remove(e.target as import("fabric").FabricObject);
              canvas.renderAll();
              onObjectErased(data.layerId);
            }
          }

          if (tool === "shape" && !e.target) {
            const pointer = e.pointer;
            if (!pointer) return;
            const shapeType = propsRef.current.activeShapeType;
            const fill = propsRef.current.shapeFill;
            const stroke = propsRef.current.shapeStroke;
            const sw = propsRef.current.shapeStrokeWidth;

            const id = crypto.randomUUID();
            const defaultW = 200;
            const defaultH = 200;

            let fabricObj: unknown;

            if (shapeType === "rectangle") {
              fabricObj = new fabricMod.Rect({
                left: pointer.x - defaultW / 2,
                top: pointer.y - defaultH / 2,
                width: defaultW,
                height: defaultH,
                fill,
                stroke,
                strokeWidth: sw,
                rx: 0,
                ry: 0,
              });
            } else if (shapeType === "circle") {
              fabricObj = new fabricMod.Ellipse({
                left: pointer.x - defaultW / 2,
                top: pointer.y - defaultH / 2,
                rx: defaultW / 2,
                ry: defaultH / 2,
                fill,
                stroke,
                strokeWidth: sw,
              });
            } else if (shapeType === "line") {
              fabricObj = new fabricMod.Line(
                [pointer.x - 100, pointer.y, pointer.x + 100, pointer.y],
                { stroke, strokeWidth: Math.max(sw, 2) },
              );
            } else if (shapeType === "arrow") {
              const x1 = pointer.x - 100;
              const y1 = pointer.y;
              const x2 = pointer.x + 100;
              const line = new fabricMod.Line([x1, y1, x2, y1], {
                stroke,
                strokeWidth: Math.max(sw, 2),
              });
              const headSize = 12;
              const triangle = new fabricMod.Triangle({
                left: x2,
                top: y1,
                width: headSize,
                height: headSize,
                fill: stroke,
                angle: 90,
                originX: "center",
                originY: "center",
              });
              fabricObj = new fabricMod.Group([line, triangle], {
                left: x1,
                top: y1 - headSize / 2,
              });
            }

            if (fabricObj) {
              const fObj = fabricObj as FabricObjWithData;
              const shapeLayer: ShapeLayer = {
                id,
                type: shapeType,
                x: (fObj.left ?? pointer.x) as number,
                y: (fObj.top ?? pointer.y) as number,
                width: defaultW,
                height: defaultH,
                fill,
                stroke,
                strokeWidth: sw,
                opacity: 1,
                angle: 0,
                visible: true,
                locked: false,
              };
              fObj.data = {
                isShapeLayer: true,
                layerId: id,
                layerData: shapeLayer,
              };
              canvas.add(fabricObj as import("fabric").FabricObject);
              canvas.setActiveObject(fabricObj as import("fabric").FabricObject);
              canvas.renderAll();
              onShapeCreated(shapeLayer);
            }
          }
        }) as never);

        canvas.on("contextmenu", ((e: { target?: unknown; e?: MouseEvent }) => {
          e.e?.preventDefault();
          const obj = e.target;
          if (!obj) return;
          const data = getObjData(obj);
          if (!data?.isTextLayer && !data?.isShapeLayer) return;
          const pointer = e.e ? { x: e.e.clientX, y: e.e.clientY } : { x: 0, y: 0 };
          onContextMenu({
            x: pointer.x,
            y: pointer.y,
            layerId: data.layerId,
            layerType: data.isTextLayer ? "text" : "shape",
          });
        }) as never);

        const bgUrl = propsRef.current.backgroundImage;
        if (bgUrl) {
          await loadBackgroundImage(canvas, fabricMod, bgUrl);
        }
        renderLayersOnCanvas(canvas, propsRef.current.layers, fabricMod);
        renderShapeLayersOnCanvas(canvas, propsRef.current.shapeLayers, fabricMod);
        canvas.renderAll();

        isReadyRef.current = true;
        isInitializingRef.current = false;
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
      isInitializingRef.current = true;

      const renderSlide = async () => {
        const canvas = fabricRef.current!;
        const fabricMod = fabricModRef.current!;

        canvas.clear();
        maskObjectsRef.current = [];
        objectMapRef.current.clear();

        const bgUrl = propsRef.current.backgroundImage;
        if (bgUrl) {
          await loadBackgroundImage(canvas, fabricMod, bgUrl);

          if (version !== renderVersionRef.current) {
            isRenderingRef.current = false;
            isInitializingRef.current = false;
            return;
          }
        }

        if (version !== renderVersionRef.current) {
          isRenderingRef.current = false;
          isInitializingRef.current = false;
          return;
        }

        renderLayersOnCanvas(canvas, propsRef.current.layers, fabricMod);
        renderShapeLayersOnCanvas(canvas, propsRef.current.shapeLayers, fabricMod);
        canvas.renderAll();
        isRenderingRef.current = false;
        isInitializingRef.current = false;
        if (exportResolveRef.current) {
          exportResolveRef.current();
          exportResolveRef.current = null;
        }
      };

      renderSlide();
    }, [slideKey, canvasReady, renderLayersOnCanvas, renderShapeLayersOnCanvas, loadBackgroundImage]);

    useEffect(() => {
      if (!canvasReady || !isReadyRef.current) return;
      const canvas = fabricRef.current;
      if (!canvas) return;
      applyToolMode(canvas, activeTool);
    }, [activeTool, canvasReady, applyToolMode]);

    useEffect(() => {
      if (!canvasReady || !isReadyRef.current || activeTool !== "ai-remove") return;
      const canvas = fabricRef.current;
      if (!canvas || !canvas.freeDrawingBrush) return;
      (canvas.freeDrawingBrush as { width: number }).width = brushSize;
    }, [brushSize, canvasReady, activeTool]);

    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas || !isReadyRef.current) return;
      if (selectedLayerId === null) {
        canvas.discardActiveObject();
        canvas.renderAll();
        return;
      }
      const obj = objectMapRef.current.get(selectedLayerId);
      if (obj) {
        canvas.setActiveObject(obj);
        canvas.renderAll();
      }
    }, [selectedLayerId]);

    useImperativeHandle(ref, () => ({
      exportAsBlob: () => {
        return new Promise<Blob | null>((resolve) => {
          const tryExport = () => {
            if (!isReadyRef.current) {
              setTimeout(tryExport, 50);
              return;
            }
            if (isRenderingRef.current) {
              exportResolveRef.current = () => {
                const canvas = fabricRef.current;
                if (!canvas) { resolve(null); return; }
                const htmlCanvas = canvas.getElement() as HTMLCanvasElement;
                htmlCanvas.toBlob((blob) => {
                  if (blob) { resolve(blob); return; }
                  resolve(null);
                }, "image/png");
              };
              return;
            }
            const canvas = fabricRef.current;
            if (!canvas) { resolve(null); return; }
            const htmlCanvas = canvas.getElement() as HTMLCanvasElement;
            htmlCanvas.toBlob((blob) => {
              if (blob) { resolve(blob); return; }
              resolve(null);
            }, "image/png");
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
          underline: layer.underline ?? false,
          linethrough: layer.linethrough ?? false,
          charSpacing: layer.charSpacing ?? 0,
          lineHeight: layer.lineHeight ?? 1.2,
          stroke: layer.textStroke ?? "transparent",
          strokeWidth: layer.textStrokeWidth ?? 0,
          textBackgroundColor: layer.textBackgroundColor ?? "transparent",
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
      addShapeLayer: (layer: ShapeLayer) => {
        const canvas = fabricRef.current;
        const fabricMod = fabricModRef.current;
        if (!canvas || !fabricMod) return;

        let fabricObj: unknown;
        if (layer.type === "rectangle") {
          fabricObj = new fabricMod.Rect({
            left: layer.x,
            top: layer.y,
            width: layer.width,
            height: layer.height,
            fill: layer.fill,
            stroke: layer.stroke,
            strokeWidth: layer.strokeWidth,
            rx: layer.rx ?? 0,
            ry: layer.rx ?? 0,
            opacity: layer.opacity,
            angle: layer.angle,
          });
        } else if (layer.type === "circle") {
          fabricObj = new fabricMod.Ellipse({
            left: layer.x,
            top: layer.y,
            rx: layer.width / 2,
            ry: layer.height / 2,
            fill: layer.fill,
            stroke: layer.stroke,
            strokeWidth: layer.strokeWidth,
            opacity: layer.opacity,
            angle: layer.angle,
          });
        } else if (layer.type === "line") {
          fabricObj = new fabricMod.Line(
            [layer.x, layer.y, layer.x2 ?? layer.x + layer.width, layer.y2 ?? layer.y],
            { stroke: layer.stroke, strokeWidth: Math.max(layer.strokeWidth, 2) },
          );
        } else if (layer.type === "arrow") {
          const x1 = layer.x;
          const y1 = layer.y;
          const x2 = layer.x2 ?? layer.x + layer.width;
          const headSize = 12;
          const line = new fabricMod.Line([x1, y1, x2, y1], {
            stroke: layer.stroke,
            strokeWidth: Math.max(layer.strokeWidth, 2),
          });
          const triangle = new fabricMod.Triangle({
            left: x2,
            top: y1,
            width: headSize,
            height: headSize,
            fill: layer.stroke,
            angle: 90,
            originX: "center",
            originY: "center",
          });
          fabricObj = new fabricMod.Group([line, triangle], {
            left: x1,
            top: y1 - headSize / 2,
          });
        }

        if (fabricObj) {
          const fObj = fabricObj as FabricObjWithData;
          fObj.data = {
            isShapeLayer: true,
            layerId: layer.id,
            layerData: { ...layer },
          };
          canvas.add(fabricObj as import("fabric").FabricObject);
          canvas.renderAll();
        }
      },
      removeLayer: (layerId: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const obj = objectMapRef.current.get(layerId);
        if (obj) {
          canvas.remove(obj);
          canvas.renderAll();
        }
      },
      updateLayer: (layerId: string, updates: Partial<TextLayer>) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const obj = objectMapRef.current.get(layerId);
        if (!obj) return;
        const data = getObjData(obj);
        const o = asObj(obj);
        if (!data?.isTextLayer) return;
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
        if (updates.underline !== undefined) o.underline = updates.underline;
        if (updates.linethrough !== undefined) o.linethrough = updates.linethrough;
        if (updates.charSpacing !== undefined) o.charSpacing = updates.charSpacing;
        if (updates.lineHeight !== undefined) o.lineHeight = updates.lineHeight;
        if (updates.textStroke !== undefined) o.stroke = updates.textStroke;
        if (updates.textStrokeWidth !== undefined) o.strokeWidth = updates.textStrokeWidth;
        if (updates.textBackgroundColor !== undefined) o.textBackgroundColor = updates.textBackgroundColor;
        if (data.layerData) {
          data.layerData = { ...data.layerData, ...updates };
        }
        o.setCoords();
        canvas.renderAll();
      },
      updateShapeLayerOnCanvas: (layerId: string, updates: Partial<ShapeLayer>) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const obj = objectMapRef.current.get(layerId);
        if (!obj) return;
        const data = getObjData(obj);
        const o = asObj(obj);
        if (!data?.isShapeLayer) return;
        if (updates.fill !== undefined) o.fill = updates.fill;
        if (updates.stroke !== undefined) o.stroke = updates.stroke;
        if (updates.strokeWidth !== undefined) o.strokeWidth = updates.strokeWidth;
        if (updates.opacity !== undefined) o.set({ opacity: updates.opacity });
        if (updates.visible !== undefined) o.set({ visible: updates.visible });
        if (updates.locked !== undefined) {
          o.set({ selectable: !updates.locked, evented: !updates.locked });
        }
        if (data.layerData) {
          data.layerData = { ...data.layerData, ...updates };
        }
        o.setCoords();
        canvas.renderAll();
      },
      selectLayer: (layerId: string | null) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        if (layerId === null) {
          canvas.discardActiveObject();
          canvas.renderAll();
          return;
        }
        const obj = objectMapRef.current.get(layerId);
        if (obj) {
          canvas.setActiveObject(obj);
          canvas.renderAll();
        }
      },
      getMaskDataUrl: () => {
        const canvas = fabricRef.current;
        const fabricMod = fabricModRef.current;
        if (!canvas || !fabricMod || maskObjectsRef.current.length === 0) return null;

        const w = propsRef.current.width;
        const h = propsRef.current.height;
        const maskCanvas = new fabricMod.StaticCanvas(document.createElement("canvas"), {
          width: w,
          height: h,
        });

        maskCanvas.add(
          new fabricMod.Rect({
            left: 0,
            top: 0,
            width: w,
            height: h,
            fill: "black",
            selectable: false,
            evented: false,
          }),
        );

        for (const maskObj of maskObjectsRef.current) {
          const path = maskObj as FabricObjWithData;
          path.set({ fill: "white", stroke: "white", strokeWidth: propsRef.current.brushSize } as Record<string, unknown>);
          maskCanvas.add(maskObj as import("fabric").FabricObject);
        }

        maskCanvas.renderAll();
        const dataUrl = maskCanvas.toDataURL({ format: "png" as const, multiplier: 1 });
        maskCanvas.dispose();
        return dataUrl;
      },
      clearMask: () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const toRemove: import("fabric").FabricObject[] = [];
        objectMapRef.current.forEach((obj, id) => {
          if (id.startsWith("__mask__")) {
            toRemove.push(obj);
          }
        });
        toRemove.forEach((obj) => {
          const data = getObjData(obj);
          if (data?.layerId) objectMapRef.current.delete(data.layerId);
          canvas.remove(obj);
        });
        maskObjectsRef.current = [];
        canvas.renderAll();
      },
      undoLastStroke: () => {
        const canvas = fabricRef.current;
        if (!canvas || maskObjectsRef.current.length === 0) return;
        isUndoRedoRef.current = true;
        const last = maskObjectsRef.current.pop();
        if (last) {
          const data = getObjData(last);
          if (data?.layerId) objectMapRef.current.delete(data.layerId);
          canvas.remove(last as import("fabric").FabricObject);
          canvas.renderAll();
        }
        isUndoRedoRef.current = false;
      },
      setBackgroundImage: async (url: string) => {
        const canvas = fabricRef.current;
        const fabricMod = fabricModRef.current;
        if (!canvas || !fabricMod) return;

        const toRemove: import("fabric").FabricObject[] = [];
        canvas.getObjects().forEach((obj) => {
          const data = getObjData(obj);
          if (!data?.isTextLayer && !data?.isShapeLayer && !data?.isMaskObject) {
            toRemove.push(obj);
          }
        });
        toRemove.forEach((obj) => canvas.remove(obj));

        await loadBackgroundImage(canvas, fabricMod, url);
      },
      undo: () => {
        const canvas = fabricRef.current;
        if (!canvas || undoStackRef.current.length === 0) return;
        isUndoRedoRef.current = true;
        const currentState = JSON.stringify(canvas.toDatalessJSON());
        redoStackRef.current.push(currentState);
        const prevState = undoStackRef.current.pop()!;
        canvas.loadFromJSON(JSON.parse(prevState), () => {
          canvas.renderAll();
          objectMapRef.current.clear();
          canvas.getObjects().forEach((obj) => {
            const data = getObjData(obj);
            if (data?.layerId && data.layerId !== "__bg__") {
              objectMapRef.current.set(data.layerId, obj);
            }
          });
          syncLayersToStore();
          isUndoRedoRef.current = false;
        });
      },
      redo: () => {
        const canvas = fabricRef.current;
        if (!canvas || redoStackRef.current.length === 0) return;
        isUndoRedoRef.current = true;
        const currentState = JSON.stringify(canvas.toDatalessJSON());
        undoStackRef.current.push(currentState);
        const nextState = redoStackRef.current.pop()!;
        canvas.loadFromJSON(JSON.parse(nextState), () => {
          canvas.renderAll();
          objectMapRef.current.clear();
          canvas.getObjects().forEach((obj) => {
            const data = getObjData(obj);
            if (data?.layerId && data.layerId !== "__bg__") {
              objectMapRef.current.set(data.layerId, obj);
            }
          });
          syncLayersToStore();
          isUndoRedoRef.current = false;
        });
      },
      duplicateLayer: (layerId: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        const obj = objectMapRef.current.get(layerId);
        if (!obj) return null;
        const data = getObjData(obj);
        const o = asObj(obj);
        const newId = crypto.randomUUID();
        const offset = 20;
        if (data?.isTextLayer) {
          const layerData = { ...(data.layerData as TextLayer) };
          layerData.id = newId;
          layerData.x = (o.left ?? 0) + offset;
          layerData.y = (o.top ?? 0) + offset;
          return layerData;
        }
        if (data?.isShapeLayer) {
          const layerData = { ...(data.layerData as ShapeLayer) };
          layerData.id = newId;
          layerData.x = (o.left ?? 0) + offset;
          layerData.y = (o.top ?? 0) + offset;
          return layerData;
        }
        return null;
      },
      bringToFront: (layerId: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const obj = objectMapRef.current.get(layerId);
        if (obj) {
          canvas.bringObjectToFront(obj);
          canvas.renderAll();
        }
      },
      sendToBack: (layerId: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const obj = objectMapRef.current.get(layerId);
        if (!obj) return;
        const objects = canvas.getObjects();
        const bgObj = objects[0];
        if (bgObj && !getObjData(bgObj)?.isTextLayer && !getObjData(bgObj)?.isShapeLayer) {
          canvas.insertAt(1, obj);
        } else {
          canvas.sendObjectToBack(obj);
        }
        canvas.renderAll();
      },
      serializeObject: (layerId: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        const obj = objectMapRef.current.get(layerId);
        if (!obj) return null;
        const data = getObjData(obj);
        const o = asObj(obj);
        if (data?.isTextLayer) {
          const layerData = { ...(data.layerData as TextLayer) };
          layerData.x = o.left ?? 0;
          layerData.y = o.top ?? 0;
          layerData.angle = o.angle ?? 0;
          layerData.opacity = o.opacity ?? 1;
          return { type: "text" as const, layer: layerData };
        }
        if (data?.isShapeLayer) {
          const layerData = { ...(data.layerData as ShapeLayer) };
          layerData.x = o.left ?? 0;
          layerData.y = o.top ?? 0;
          layerData.angle = o.angle ?? 0;
          layerData.opacity = o.opacity ?? 1;
          return { type: "shape" as const, layer: layerData };
        }
        return null;
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
  }),
  arePropsEqual,
);

FabricCanvas.displayName = "FabricCanvas";