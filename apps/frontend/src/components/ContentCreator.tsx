"use client";

import { useState } from "react";
import { useCreateContent } from "@/hooks/useContents";
import { useEditorStore } from "@/stores/editor";

const CONTENT_TYPES = [
  { value: "image", label: "Image", icon: "🖼️" },
  { value: "slide", label: "Slide", icon: "📑" },
  { value: "video", label: "Video", icon: "🎬" },
  { value: "text", label: "Text", icon: "📝" },
] as const;

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter/X" },
  { value: "generic", label: "Generic" },
] as const;

export function ContentCreator({ projectId }: { projectId: string }) {
  const { draftPrompt, selectedType, selectedPlatform, setPrompt, setType, setPlatform, reset } =
    useEditorStore();
  const createContent = useCreateContent(projectId);
  const [title, setTitle] = useState("");

  const handleCreate = () => {
    if (!draftPrompt || !selectedType) return;
    createContent.mutate(
      {
        type: selectedType,
        platform: selectedPlatform,
        prompt: draftPrompt,
        title: title || undefined,
      },
      {
        onSuccess: () => {
          reset();
          setTitle("");
        },
      },
    );
  };

  return (
    <div className="card">
      <h2 className="mb-5 text-lg font-semibold text-[var(--text-primary)]">
        ✨ Create Content
      </h2>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            Title <span className="text-[var(--text-muted)]">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome content"
            className="input"
          />
        </div>

        {/* Content Type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            Content Type
          </label>
          <div className="flex gap-2">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setType(ct.value)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  selectedType === ct.value
                    ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
                    : "bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{ct.icon}</span>
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            Platform
          </label>
          <select
            value={selectedPlatform}
            onChange={(e) => setPlatform(e.target.value)}
            className="input"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Prompt */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            Prompt
          </label>
          <textarea
            value={draftPrompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to create..."
            rows={4}
            className="input resize-none"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {draftPrompt.length}/2000 characters
          </p>
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={!draftPrompt || !selectedType || createContent.isPending}
          className="btn-primary w-full"
        >
          {createContent.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 1v14M1 8h14" />
              </svg>
              Generate Content
            </span>
          )}
        </button>
      </div>
    </div>
  );
}