"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CreditTransaction {
  id: string;
  userId: string;
  type: "deduction" | "refund" | "bonus" | "adjustment";
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreditSummary {
  balance: number;
  totalSpent: number;
  totalRefunded: number;
  transactionCount: number;
}

export interface TransactionsResponse {
  transactions: CreditTransaction[];
  total: number;
  page: number;
  limit: number;
}

export function useCreditSummary() {
  return useQuery<CreditSummary>({
    queryKey: ["credits", "summary"],
    queryFn: async () => {
      const { data } = await api.get("/api/credits/summary");
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCreditTransactions(params?: {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery<TransactionsResponse>({
    queryKey: ["credits", "transactions", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.type) searchParams.set("type", params.type);
      if (params?.startDate) searchParams.set("startDate", params.startDate);
      if (params?.endDate) searchParams.set("endDate", params.endDate);
      const { data } = await api.get(
        `/api/credits/transactions?${searchParams.toString()}`,
      );
      return data;
    },
    staleTime: 15_000,
  });
}