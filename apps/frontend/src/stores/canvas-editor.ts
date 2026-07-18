"use client";

import { create } from "zustand";
import type { TextLayer } from "@faceless/shared";

interface CanvasEditorState {
  textLayers: Record<string, TextLayer[]>;
  activeSlideIndex: number;
  selectedLayerId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isExporting: boolean;
  setTextLayers: (slideKey: string, layers: TextLayer[]) => void;
  updateTextLayer: (slideKey: string, layerId: string, updates: Partial<TextLayer>) => void;
  addTextLayer: (slideKey: string, layer: TextLayer) => void;
  removeTextLayer: (slideKey: string, layerId: string) => void;
  setActiveSlide: (index: number) => void;
  setSelectedLayer: (id: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setIsExporting: (exporting: boolean) => void;
  loadAllTextLayers: (layers: Record<string, TextLayer[]>) => void;
  reset: () => void;
}

const initialState = {
  textLayers: {},
  activeSlideIndex: 0,
  selectedLayerId: null,
  isDirty: false,
  isSaving: false,
  isExporting: false,
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
  setActiveSlide: (index) => set({ activeSlideIndex: index, selectedLayerId: null }),
  setSelectedLayer: (id) => set({ selectedLayerId: id }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsExporting: (exporting) => set({ isExporting: exporting }),
  loadAllTextLayers: (layers) => set({ textLayers: layers, isDirty: false }),
  reset: () => set(initialState),
}));
