"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAllContents(limit?: number, offset?: number) {
  return useQuery({
    queryKey: ["contents", { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.set("limit", String(limit));
      if (offset) params.set("offset", String(offset));
      const { data } = await api.get(`/api/contents?${params.toString()}`);
      return { contents: data.contents, total: data.total };
    },
  });
}

export function useContent(id: string) {
  return useQuery({
    queryKey: ["contents", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/contents/${id}`);
      return data.content;
    },
    enabled: !!id,
  });
}

export function useCreateContent(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      type: string;
      platform: string;
      aspectRatio: string;
      language: string;
      prompt: string;
      title?: string;
      avatarId?: string;
      slideCount?: number;
      templateId?: string;
      templateInputs?: Record<string, unknown>;
    }) => {
      const { data } = await api.post(
        `/api/projects/${projectId}/contents`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRegenerateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contentId: string) => {
      const { data } = await api.post(`/api/contents/${contentId}/regenerate`);
      return data;
    },
    onSuccess: (_, contentId) => {
      queryClient.invalidateQueries({ queryKey: ["contents", contentId] });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contentId: string) => {
      const { data } = await api.delete(`/api/contents/${contentId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDuplicateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contentId,
      language,
    }: {
      contentId: string;
      language: string;
    }) => {
      const { data } = await api.post(
        `/api/contents/${contentId}/duplicate`,
        { language },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
