"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Stats {
  credits: number;
  successRate: number;
  totalJobs: number;
  failedJobs: number;
  totalContents: number;
}

export function useStats() {
  return useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data } = await api.get("/api/stats");
      return data;
    },
    staleTime: 30_000,
  });
}