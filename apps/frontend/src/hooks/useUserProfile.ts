"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data } = await api.get("/api/auth/me");
      return data.user as {
        id: string;
        email: string;
        name: string | null;
        plan: string;
        language: string;
      } | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (language: string) => {
      const { data } = await api.patch("/api/settings", { language });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}