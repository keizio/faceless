"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BrandKit } from "@faceless/shared";

export function useBrandKit(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "brand-kit"],
    queryFn: async () => {
      const { data } = await api.get(`/api/projects/${projectId}/brand-kit`);
      return data.brandKit as BrandKit;
    },
    enabled: !!projectId,
  });
}

export function useUpdateBrandKit(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<BrandKit>) => {
      const { data } = await api.put(`/api/projects/${projectId}/brand-kit`, body);
      return data.brandKit as BrandKit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "brand-kit"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}