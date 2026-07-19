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
  reset: () => void;
}

const initialState = {
  textLayers: {},
  shapeLayers: {},
  activeSlideIndex: 0,
  selectedLayerId: null,
  isDirty: false,
  isSaving: false,
  isExporting: false,
  activeTool: "select" as ToolMode,
  activeShapeType: "rectangle" as ShapeType,
  brushSize: 20,
  clipboard: null,
};

export const useCanvasEditorStore = create<CanvasEditorState>((set) => ({
  ...initialState,
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
      return {
        textLayers: { ...state.textLayers, [slideKey]: [...slideLayers, layer] },
        isDirty: true,
      };
    }),
  removeTextLayer: (slideKey, layerId) =>
    set((state) => {
      const slideLayers = state.textLayers[slideKey] || [];
      return {
        textLayers: {
          ...state.textLayers,
          [slideKey]: slideLayers.filter((l) => l.id !== layerId),
        },
        isDirty: true,
        selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
      };
    }),
  addShapeLayer: (slideKey, layer) =>
    set((state) => {
      const slideLayers = state.shapeLayers[slideKey] || [];
      return {
        shapeLayers: { ...state.shapeLayers, [slideKey]: [...slideLayers, layer] },
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
      return {
        shapeLayers: {
          ...state.shapeLayers,
          [slideKey]: slideLayers.filter((l) => l.id !== layerId),
        },
        isDirty: true,
        selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
      };
    }),
  loadAllShapeLayers: (layers) => set({ shapeLayers: layers, isDirty: false }),
  setActiveSlide: (index) => set({ activeSlideIndex: index, selectedLayerId: null }),
  setSelectedLayer: (id) => set({ selectedLayerId: id }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsExporting: (exporting) => set({ isExporting: exporting }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveShapeType: (type) => set({ activeShapeType: type }),
  setBrushSize: (size) => set({ brushSize: size }),
  loadAllTextLayers: (layers) => set({ textLayers: layers, isDirty: false }),
  setClipboard: (data) => set({ clipboard: data }),
  reset: () => set(initialState),
}));
