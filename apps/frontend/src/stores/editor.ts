"use client";

import { create } from "zustand";

interface EditorState {
  draftPrompt: string;
  selectedType: "image" | "slide" | "video" | "text" | null;
  selectedPlatform: string;
  selectedAspectRatio: string;
  selectedLanguage: string;
  selectedAvatarId: string | null;
  selectedTemplateId: string | null;
  templateInputs: Record<string, unknown>;
  setPrompt: (prompt: string) => void;
  setType: (type: "image" | "slide" | "video" | "text") => void;
  setPlatform: (platform: string | null) => void;
  setAspectRatio: (ratio: string | null) => void;
  setLanguage: (lang: string | null) => void;
  setAvatarId: (id: string | null) => void;
  setTemplateId: (id: string | null) => void;
  setTemplateInputs: (inputs: Record<string, unknown>) => void;
  reset: (language?: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  draftPrompt: "",
  selectedType: null,
  selectedPlatform: "generic",
  selectedAspectRatio: "16:9",
  selectedLanguage: "en",
  selectedAvatarId: null,
  selectedTemplateId: null,
  templateInputs: {},
  setPrompt: (prompt) => set({ draftPrompt: prompt }),
  setType: (type) => set({ selectedType: type }),
  setPlatform: (platform) => set({ selectedPlatform: platform ?? "generic", selectedAspectRatio: "16:9" }),
  setAspectRatio: (ratio) => set({ selectedAspectRatio: ratio ?? "16:9" }),
  setLanguage: (lang) => set({ selectedLanguage: lang ?? "en" }),
  setAvatarId: (id) => set({ selectedAvatarId: id }),
  setTemplateId: (id) => set({ selectedTemplateId: id }),
  setTemplateInputs: (inputs) => set({ templateInputs: inputs }),
  reset: (language?: string) =>
    set({
      draftPrompt: "",
      selectedType: null,
      selectedPlatform: "generic",
      selectedAspectRatio: "16:9",
      selectedLanguage: language ?? "en",
      selectedAvatarId: null,
      selectedTemplateId: null,
      templateInputs: {},
    }),
}));
