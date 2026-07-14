"use client";

import { create } from "zustand";

interface EditorState {
  draftPrompt: string;
  selectedType: "image" | "slide" | "video" | "text" | null;
  selectedPlatform: string;
  setPrompt: (prompt: string) => void;
  setType: (type: "image" | "slide" | "video" | "text") => void;
  setPlatform: (platform: string) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  draftPrompt: "",
  selectedType: null,
  selectedPlatform: "generic",
  setPrompt: (prompt) => set({ draftPrompt: prompt }),
  setType: (type) => set({ selectedType: type }),
  setPlatform: (platform) => set({ selectedPlatform: platform }),
  reset: () =>
    set({ draftPrompt: "", selectedType: null, selectedPlatform: "generic" }),
}));
