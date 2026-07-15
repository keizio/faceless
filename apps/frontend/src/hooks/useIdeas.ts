"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Idea } from "@faceless/shared";

export function useIdeas(language: string, date?: string) {
  return useQuery({
    queryKey: ["ideas", language, date],
    queryFn: async () => {
      const params = new URLSearchParams({ language });
      if (date) params.set("date", date);
      const { data } = await api.get(`/api/ideas?${params.toString()}`);
      return data.ideas as Idea[];
    },
    staleTime: 60 * 60 * 1000,
    enabled: !!language,
  });
}

export function useGenerateIdeas(language: string, date?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({ language });
      const { data } = await api.post(`/api/ideas/refresh?${params.toString()}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas", language, date] });
    },
  });
}