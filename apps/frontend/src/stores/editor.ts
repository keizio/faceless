"use client";

import { create } from "zustand";

interface EditorState {
  draftPrompt: string;
  selectedType: "image" | "slide" | "video" | "text" | null;
  selectedPlatform: string;
  selectedAspectRatio: string;
  selectedLanguage: string;
  selectedAvatarId: string | null;
  setPrompt: (prompt: string) => void;
  setType: (type: "image" | "slide" | "video" | "text") => void;
  setPlatform: (platform: string | null) => void;
  setAspectRatio: (ratio: string | null) => void;
  setLanguage: (lang: string | null) => void;
  setAvatarId: (id: string | null) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  draftPrompt: "",
  selectedType: null,
  selectedPlatform: "generic",
  selectedAspectRatio: "16:9",
  selectedLanguage: "en",
  selectedAvatarId: null,
  setPrompt: (prompt) => set({ draftPrompt: prompt }),
  setType: (type) => set({ selectedType: type }),
  setPlatform: (platform) => set({ selectedPlatform: platform ?? "generic", selectedAspectRatio: "16:9" }),
  setAspectRatio: (ratio) => set({ selectedAspectRatio: ratio ?? "16:9" }),
  setLanguage: (lang) => set({ selectedLanguage: lang ?? "en" }),
  setAvatarId: (id) => set({ selectedAvatarId: id }),
  reset: () =>
    set({
      draftPrompt: "",
      selectedType: null,
      selectedPlatform: "generic",
      selectedAspectRatio: "16:9",
      selectedLanguage: "en",
      selectedAvatarId: null,
    }),
}));
