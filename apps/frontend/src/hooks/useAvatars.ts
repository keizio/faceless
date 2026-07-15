"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAvatars() {
  return useQuery({
    queryKey: ["avatars"],
    queryFn: async () => {
      const { data } = await api.get("/api/avatars");
      return data.avatars;
    },
  });
}

export function useAvatar(id: string) {
  return useQuery({
    queryKey: ["avatars", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/avatars/${id}`);
      return data.avatar;
    },
    enabled: !!id,
  });
}

export function useCreateAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      age?: number;
      gender?: string;
      speechStyle?: string;
      referenceImageUrl?: string;
      portraitUrl?: string;
    }) => {
      const { data } = await api.post("/api/avatars", body);
      return data.avatar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avatars"] });
    },
  });
}

export function useUpdateAvatar(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<{
      name: string;
      age: number;
      gender: string;
      speechStyle: string;
      referenceImageUrl: string;
      portraitUrl: string;
    }>) => {
      const { data } = await api.put(`/api/avatars/${id}`, body);
      return data.avatar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avatars"] });
      queryClient.invalidateQueries({ queryKey: ["avatars", id] });
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/avatars/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avatars"] });
    },
  });
}

export function useUploadAvatarImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post(`/api/avatars/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.avatar;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["avatars"] });
      queryClient.invalidateQueries({ queryKey: ["avatars", id] });
    },
  });
}

export function useGenerateAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/avatars/${id}/generate`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["avatars", id] });
    },
  });
}