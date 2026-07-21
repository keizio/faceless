"use client";

import { create } from "zustand";
import type { TextLayer, ShapeLayer, ShapeType } from "@faceless/shared";

export type ToolMode = "select" | "text" | "shape" | "eraser" | "ai-remove";

export interface ClipboardData {
  type: "text" | "shape";
  layer: TextLayer | ShapeLayer;
}

interface CanvasEditorState {
  textLayers: Record<string, TextLayer[]>;
  shapeLayers: Record<string, ShapeLayer[]>;
  layerOrder: Record<string, string[]>;
  activeSlideIndex: number;
  selectedLayerId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isExporting: boolean;
  activeTool: ToolMode;
  activeShapeType: ShapeType;
  brushSize: number;
  clipboard: ClipboardData | null;
  setTextLayers: (slideKey: string, layers: TextLayer[]) => void;
  updateTextLayer: (slideKey: string, layerId: string, updates: Partial<TextLayer>) => void;
  addTextLayer: (slideKey: string, layer: TextLayer) => void;
  removeTextLayer: (slideKey: string, layerId: string) => void;
  addShapeLayer: (slideKey: string, layer: ShapeLayer) => void;
  updateShapeLayer: (slideKey: string, layerId: string, updates: Partial<ShapeLayer>) => void;
  removeShapeLayer: (slideKey: string, layerId: string) => void;
  loadAllShapeLayers: (layers: Record<string, ShapeLayer[]>) => void;
  setActiveSlide: (index: number) => void;
  setSelectedLayer: (id: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setIsExporting: (exporting: boolean) => void;
  setActiveTool: (tool: ToolMode) => void;
  setActiveShapeType: (type: ShapeType) => void;
  setBrushSize: (size: number) => void;
  loadAllTextLayers: (layers: Record<string, TextLayer[]>) => void;
  setClipboard: (data: ClipboardData | null) => void;
  reorderLayers: (slideKey: string, fromIndex: number, toIndex: number) => void;
  appendToLayerOrder: (slideKey: string, layerId: string) => void;
  removeFromLayerOrder: (slideKey: string, layerId: string) => void;
  bringToFront: (slideKey: string, layerId: string) => void;
  sendToBack: (slideKey: string, layerId: string) => void;
  reset: () => void;
}

const getInitialState = () => ({
  textLayers: {} as Record<string, TextLayer[]>,
  shapeLayers: {} as Record<string, ShapeLayer[]>,
  layerOrder: {} as Record<string, string[]>,
  activeSlideIndex: 0,
  selectedLayerId: null,
  isDirty: false,
  isSaving: false,
  isExporting: false,
  activeTool: "select" as ToolMode,
  activeShapeType: "rectangle" as ShapeType,
  brushSize: 20,
  clipboard: null,
});

export const useCanvasEditorStore = create<CanvasEditorState>((set) => ({
  textLayers: {},
  shapeLayers: {},
  layerOrder: {},
  activeSlideIndex: 0,
  selectedLayerId: null,
  isDirty: false,
  isSaving: false,
  isExporting: false,
  activeTool: "select" as ToolMode,
  activeShapeType: "rectangle" as ShapeType,
  brushSize: 20,
  clipboard: null,
  setTextLayers: (slideKey, layers) =>
    set((state) => ({
      textLayers: { ...state.textLayers, [slideKey]: layers },
      isDirty: true,
    })),
  updateTextLayer: (slideKey, layerId, updates) =>
    set((state) => {
      const slideLayers = state.textLayers[slideKey] || [];
      const updated = slideLayers.map((l) =>
        l.id === layerId ? { ...l, ...updates } : l,
      );
      return {
        textLayers: { ...state.textLayers, [slideKey]: updated },
        isDirty: true,
      };
    }),
  addTextLayer: (slideKey, layer) =>
    set((state) => {
      const slideLayers = state.textLayers[slideKey] || [];
      const order = state.layerOrder[slideKey] || [];
      return {
        textLayers: { ...state.textLayers, [slideKey]: [...slideLayers, layer] },
        layerOrder: { ...state.layerOrder, [slideKey]: [...order, layer.id] },
        isDirty: true,
      };
    }),
  removeTextLayer: (slideKey, layerId) =>
    set((state) => {
      const slideLayers = state.textLayers[slideKey] || [];
      const order = state.layerOrder[slideKey] || [];
      return {
        textLayers: {
          ...state.textLayers,
          [slideKey]: slideLayers.filter((l) => l.id !== layerId),
        },
        layerOrder: {
          ...state.layerOrder,
          [slideKey]: order.filter((id) => id !== layerId),
        },
        isDirty: true,
        selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
      };
    }),
  addShapeLayer: (slideKey, layer) =>
    set((state) => {
      const slideLayers = state.shapeLayers[slideKey] || [];
      const order = state.layerOrder[slideKey] || [];
      return {
        shapeLayers: { ...state.shapeLayers, [slideKey]: [...slideLayers, layer] },
        layerOrder: { ...state.layerOrder, [slideKey]: [...order, layer.id] },
        isDirty: true,
      };
    }),
  updateShapeLayer: (slideKey, layerId, updates) =>
    set((state) => {
      const slideLayers = state.shapeLayers[slideKey] || [];
      const updated = slideLayers.map((l) =>
        l.id === layerId ? { ...l, ...updates } : l,
      );
      return {
        shapeLayers: { ...state.shapeLayers, [slideKey]: updated },
        isDirty: true,
      };
    }),
  removeShapeLayer: (slideKey, layerId) =>
    set((state) => {
      const slideLayers = state.shapeLayers[slideKey] || [];
      const order = state.layerOrder[slideKey] || [];
      return {
        shapeLayers: {
          ...state.shapeLayers,
          [slideKey]: slideLayers.filter((l) => l.id !== layerId),
        },
        layerOrder: {
          ...state.layerOrder,
          [slideKey]: order.filter((id) => id !== layerId),
        },
        isDirty: true,
        selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
      };
    }),
  loadAllShapeLayers: (layers) =>
    set((state) => {
      const order = { ...state.layerOrder };
      for (const key of Object.keys(layers)) {
        const existingOrder = order[key] || [];
        const existingIds = new Set(existingOrder);
        const newIds = layers[key].map((l) => l.id);
        const combined = [...existingOrder.filter((id) => existingIds.has(id)), ...newIds.filter((id) => !existingIds.has(id))];
        order[key] = combined;
      }
      return { shapeLayers: layers, layerOrder: order, isDirty: false };
    }),
  setActiveSlide: (index) => set({ activeSlideIndex: index, selectedLayerId: null }),
  setSelectedLayer: (id) => set({ selectedLayerId: id }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsExporting: (exporting) => set({ isExporting: exporting }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveShapeType: (type) => set({ activeShapeType: type }),
  setBrushSize: (size) => set({ brushSize: size }),
  loadAllTextLayers: (layers) =>
    set((state) => {
      const order = { ...state.layerOrder };
      for (const key of Object.keys(layers)) {
        const existingOrder = order[key] || [];
        const existingIds = new Set(existingOrder);
        const newIds = layers[key].map((l) => l.id);
        const combined = [...existingOrder.filter((id) => existingIds.has(id)), ...newIds.filter((id) => !existingIds.has(id))];
        order[key] = combined;
      }
      return { textLayers: layers, layerOrder: order, isDirty: false };
    }),
  setClipboard: (data) => set({ clipboard: data }),
  reorderLayers: (slideKey, fromIndex, toIndex) =>
    set((state) => {
      const order = [...(state.layerOrder[slideKey] || [])];
      if (fromIndex < 0 || fromIndex >= order.length || toIndex < 0 || toIndex >= order.length) return state;
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);
      return {
        layerOrder: { ...state.layerOrder, [slideKey]: order },
        isDirty: true,
      };
    }),
  appendToLayerOrder: (slideKey, layerId) =>
    set((state) => {
      const order = state.layerOrder[slideKey] || [];
      return {
        layerOrder: { ...state.layerOrder, [slideKey]: [...order, layerId] },
      };
    }),
  removeFromLayerOrder: (slideKey, layerId) =>
    set((state) => {
      const order = state.layerOrder[slideKey] || [];
      return {
        layerOrder: {
          ...state.layerOrder,
          [slideKey]: order.filter((id) => id !== layerId),
        },
      };
    }),
  bringToFront: (slideKey, layerId) =>
    set((state) => {
      const order = state.layerOrder[slideKey] || [];
      const idx = order.indexOf(layerId);
      if (idx === -1 || idx === order.length - 1) return state;
      const updated = [...order];
      updated.splice(idx, 1);
      updated.push(layerId);
      return {
        layerOrder: { ...state.layerOrder, [slideKey]: updated },
        isDirty: true,
      };
    }),
  sendToBack: (slideKey, layerId) =>
    set((state) => {
      const order = state.layerOrder[slideKey] || [];
      const idx = order.indexOf(layerId);
      if (idx <= 0) return state;
      const updated = [...order];
      updated.splice(idx, 1);
      updated.unshift(layerId);
      return {
        layerOrder: { ...state.layerOrder, [slideKey]: updated },
        isDirty: true,
      };
    }),
  reset: () => set(getInitialState()),
}));
