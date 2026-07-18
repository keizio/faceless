"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TextLayer } from "@faceless/shared";

export function useTextLayers(contentId: string, versionId: string | undefined) {
  return useQuery({
    queryKey: ["text-layers", contentId, versionId],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/contents/${contentId}/text-layers?versionId=${versionId}`,
      );
      return data.textLayers as Record<string, TextLayer[]>;
    },
    enabled: !!contentId && !!versionId,
  });
}

export function useSaveTextLayers(contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      versionId,
      textLayers,
    }: {
      versionId: string;
      textLayers: Record<string, TextLayer[]>;
    }) => {
      const { data } = await api.patch(`/api/contents/${contentId}/text-layers`, {
        versionId,
        textLayers,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        ["text-layers", contentId, variables.versionId],
        variables.textLayers,
      );
    },
  });
}

export function useEditorExport(contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      imageUrls,
      textLayers,
    }: {
      imageUrls: string[];
      textLayers: Record<string, TextLayer[]>;
    }) => {
      const { data } = await api.post(`/api/contents/${contentId}/editor-export`, {
        imageUrls,
        textLayers,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents", contentId] });
    },
  });
}
