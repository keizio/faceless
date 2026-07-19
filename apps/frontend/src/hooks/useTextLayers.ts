"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TextLayer, ShapeLayer } from "@faceless/shared";

export function useTextLayers(contentId: string, versionId: string | undefined) {
  return useQuery({
    queryKey: ["text-layers", contentId, versionId],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/contents/${contentId}/text-layers?versionId=${versionId}`,
      );
      return {
        textLayers: data.textLayers as Record<string, TextLayer[]>,
        shapeLayers: data.shapeLayers as Record<string, ShapeLayer[]>,
      };
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
      shapeLayers,
    }: {
      versionId: string;
      textLayers: Record<string, TextLayer[]>;
      shapeLayers?: Record<string, ShapeLayer[]>;
    }) => {
      const { data } = await api.patch(`/api/contents/${contentId}/text-layers`, {
        versionId,
        textLayers,
        shapeLayers,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        ["text-layers", contentId, variables.versionId],
        { textLayers: variables.textLayers, shapeLayers: variables.shapeLayers },
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
      shapeLayers,
    }: {
      imageUrls: string[];
      textLayers: Record<string, TextLayer[]>;
      shapeLayers?: Record<string, ShapeLayer[]>;
    }) => {
      const { data } = await api.post(`/api/contents/${contentId}/editor-export`, {
        imageUrls,
        textLayers,
        shapeLayers,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents", contentId] });
    },
  });
}
