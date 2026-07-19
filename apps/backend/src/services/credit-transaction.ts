import { db } from "../db/index";
import { creditTransactions, users } from "../db/schema";
import { eq, and, desc, count, sql, gte, lte } from "drizzle-orm";

export interface LogTransactionParams {
  type: "deduction" | "refund" | "bonus" | "adjustment";
  amount: number;
  reason: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

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

export class CreditTransactionService {
  async logTransaction(
    userId: string,
    params: LogTransactionParams,
  ): Promise<number> {
    const [result] = await db
      .update(users)
      .set({ credits: sql`${users.credits} + ${params.amount}` })
      .where(eq(users.id, userId))
      .returning({ credits: users.credits });

    const balanceAfter = result?.credits ?? 0;

    await db.insert(creditTransactions).values({
      userId,
      type: params.type,
      amount: params.amount,
      balanceAfter,
      reason: params.reason,
      referenceId: params.referenceId,
      metadata: (params.metadata ?? {}) as Record<string, unknown>,
    });

    return balanceAfter;
  }

  async getTransactions(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      type?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(creditTransactions.userId, userId)];

    if (params.type) {
      conditions.push(eq(creditTransactions.type, params.type as typeof creditTransactions.$inferSelect.type));
    }

    if (params.startDate) {
      conditions.push(gte(creditTransactions.createdAt, new Date(params.startDate)));
    }

    if (params.endDate) {
      conditions.push(lte(creditTransactions.createdAt, new Date(params.endDate)));
    }

    const where = and(...conditions);

    const [totalResult] = await db
      .select({ count: count() })
      .from(creditTransactions)
      .where(where);

    const total = totalResult?.count ?? 0;

    const rows = await db
      .select()
      .from(creditTransactions)
      .where(where)
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const transactions: CreditTransaction[] = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      amount: row.amount,
      balanceAfter: row.balanceAfter,
      reason: row.reason,
      referenceId: row.referenceId,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  async getUserSummary(userId: string): Promise<CreditSummary> {
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const balance = user?.credits ?? 0;

    const [spentResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.userId, userId),
          eq(creditTransactions.type, "deduction"),
        ),
      );

    const [refundedResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.userId, userId),
          eq(creditTransactions.type, "refund"),
        ),
      );

    const [countResult] = await db
      .select({ count: count() })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId));

    return {
      balance,
      totalSpent: spentResult?.total ?? 0,
      totalRefunded: refundedResult?.total ?? 0,
      transactionCount: countResult?.count ?? 0,
    };
  }
}