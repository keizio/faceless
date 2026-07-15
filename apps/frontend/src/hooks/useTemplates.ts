"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ContentTemplate } from "@faceless/shared";

export function useTemplates() {
  return useQuery<ContentTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data } = await api.get("/api/templates");
      return data.templates;
    },
  });
}

export function useTemplate(id: string) {
  return useQuery<ContentTemplate>({
    queryKey: ["templates", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/templates/${id}`);
      return data.template;
    },
    enabled: !!id,
  });
}
