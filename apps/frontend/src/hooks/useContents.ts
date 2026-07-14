"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
      prompt: string;
      title?: string;
    }) => {
      const { data } = await api.post(
        `/api/projects/${projectId}/contents`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
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
