"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Idea } from "@faceless/shared";

interface GetIdeasResponse {
  ideas: Idea[];
  total: number;
}

export function useIdeas() {
  return useQuery({
    queryKey: ["ideas"],
    queryFn: async () => {
      const { data } = await api.get<GetIdeasResponse>("/api/ideas");
      return data;
    },
    staleTime: 60 * 1000,
  });
}

interface GenerateIdeasInput {
  prompt: string;
  language: string;
}

export function useGenerateIdeas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateIdeasInput) => {
      const { data } = await api.post<Idea>("/api/ideas/generate", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
    },
  });
}