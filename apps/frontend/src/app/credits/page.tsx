"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreditSummary,
  useCreditTransactions,
  type CreditTransaction,
} from "@/hooks/useCredits";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  List,
  ChevronLeft,
  ChevronRight,
  Zap,
  RotateCcw,
  Gift,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Zap; color: string }
> = {
  deduction: { label: "Deduction", icon: TrendingDown, color: "text-red-500" },
  refund: { label: "Refund", icon: RotateCcw, color: "text-green-500" },
  bonus: { label: "Bonus", icon: Gift, color: "text-blue-500" },
  adjustment: {
    label: "Adjustment",
    icon: SlidersHorizontal,
    color: "text-muted-foreground",
  },
};

const REASON_LABELS: Record<string, string> = {
  content_generation: "Content Generation",
  avatar_creation: "Avatar Creation",
  idea_generation: "Idea Generation",
  job_refund: "Job Refund",
};

function formatAmount(amount: number): string {
  const prefix = amount >= 0 ? "+" : "";
  return `${prefix}${amount.toLocaleString()}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TransactionRow({
  transaction,
}: {
  transaction: CreditTransaction;
}) {
  const config = TYPE_CONFIG[transaction.type] ?? TYPE_CONFIG.adjustment;
  const Icon = config.icon;
  const isPositive = transaction.amount > 0;

  return (
    <div className="flex items-center gap-4 border-b border-border/50 py-3 last:border-0">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted ${config.color}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {REASON_LABELS[transaction.reason] ?? transaction.reason}
          </span>
          <Badge
            variant={
              transaction.type === "deduction"
                ? "destructive"
                : transaction.type === "refund"
                  ? "outline"
                  : "secondary"
            }
            className="text-[10px] capitalize"
          >
            {config.label}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(transaction.createdAt)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-semibold tabular-nums ${
            isPositive ? "text-green-500" : "text-red-500"
          }`}
        >
          {formatAmount(transaction.amount)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Balance: {transaction.balanceAfter.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function CreditsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const limit = 20;

  const { data: summary, isLoading: summaryLoading } = useCreditSummary();
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
  } = useCreditTransactions({
    page,
    limit,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });

  const transactions = transactionsData?.transactions ?? [];
  const total = transactionsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-8">
          <PageHeader
            title="Credits"
            subtitle="Track your credit usage and history"
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatsCard
              icon={<Wallet className="h-5 w-5 text-primary" />}
              label="Current Balance"
              value={summary?.balance.toLocaleString() ?? "--"}
              loading={summaryLoading}
            />
            <StatsCard
              icon={<TrendingDown className="h-5 w-5 text-red-500" />}
              label="Total Spent"
              value={summary?.totalSpent.toLocaleString() ?? "--"}
              loading={summaryLoading}
            />
            <StatsCard
              icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              label="Total Refunded"
              value={summary?.totalRefunded.toLocaleString() ?? "--"}
              loading={summaryLoading}
            />
            <StatsCard
              icon={<List className="h-5 w-5 text-primary" />}
              label="Transactions"
              value={summary?.transactionCount.toLocaleString() ?? "--"}
              loading={summaryLoading}
            />
          </div>

          {/* Transactions Card */}
          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Transaction History
                </h3>

                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <Select
                    value={typeFilter}
                    onValueChange={(v) => {
                      setTypeFilter(v ?? "all");
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="deduction">Deduction</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Transaction List */}
              {transactionsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 border-b border-border/50 py-3 last:border-0"
                    >
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="space-y-1.5 text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                        <Skeleton className="h-3 w-16 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <Zap className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No transactions yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Transactions will appear here when you generate content
                  </p>
                </div>
              ) : (
                <div>
                  {transactions.map((tx) => (
                    <TransactionRow key={tx.id} transaction={tx} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} ({total} transactions)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}