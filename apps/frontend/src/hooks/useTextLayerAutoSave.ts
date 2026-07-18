"use client";

import { useEffect, useRef } from "react";
import { useCanvasEditorStore } from "@/stores/canvas-editor";
import type { UseMutateAsyncFunction } from "@tanstack/react-query";
import type { TextLayer } from "@faceless/shared";

type SaveTextLayersFn = UseMutateAsyncFunction<
  unknown,
  Error,
  { versionId: string; textLayers: Record<string, TextLayer[]> },
  unknown
>;

export function useTextLayerAutoSave(
  contentId: string,
  versionId: string | undefined,
  saveTextLayers: SaveTextLayersFn,
) {
  const isDirty = useCanvasEditorStore((s) => s.isDirty);
  const textLayers = useCanvasEditorStore((s) => s.textLayers);
  const setIsDirty = useCanvasEditorStore((s) => s.setIsDirty);
  const setIsSaving = useCanvasEditorStore((s) => s.setIsSaving);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty || !versionId) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveTextLayers({ versionId, textLayers });
        setIsDirty(false);
      } catch {
        // Retry on next change
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, textLayers, versionId]);
}