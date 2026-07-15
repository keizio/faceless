"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProjects(limit?: number, offset?: number) {
  return useQuery({
    queryKey: ["projects", { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.set("limit", String(limit));
      if (offset) params.set("offset", String(offset));
      const { data } = await api.get(`/api/projects?${params.toString()}`);
      return { projects: data.projects, total: data.total };
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string; description?: string }) => {
      const { data } = await api.patch(`/api/projects/${id}`, body);
      return data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/projects/${id}`);
      return data.project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const { data } = await api.post("/api/projects", body);
      return data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
