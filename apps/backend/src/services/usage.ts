import { db } from "../db/index";
import { generationJobs, users } from "../db/schema";
import { eq, and, gte, count, sql } from "drizzle-orm";
import { CONTENT_LIMITS } from "@faceless/shared";

export class UsageService {
  async getDailyGenerationCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ count: count() })
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.userId, userId),
          gte(generationJobs.createdAt, today),
        ),
      );

    return result?.count ?? 0;
  }

  async checkGenerationLimit(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const [user] = await db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const plan = user?.plan ?? "free";
    const dailyLimit = plan === "pro" ? CONTENT_LIMITS.proPlanGenerationsPerDay : CONTENT_LIMITS.freePlanGenerationsPerDay;

    const used = await this.getDailyGenerationCount(userId);
    const remaining = Math.max(0, dailyLimit - used);

    return {
      allowed: remaining > 0,
      remaining,
      limit: dailyLimit,
    };
  }

  async getStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dailyResult] = await db
      .select({ count: count() })
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.userId, userId),
          gte(generationJobs.createdAt, today),
        ),
      );

    const generatedToday = dailyResult?.count ?? 0;

    const [totalResult] = await db
      .select({ count: count() })
      .from(generationJobs)
      .where(eq(generationJobs.userId, userId));

    const totalJobs = totalResult?.count ?? 0;

    const [failedResult] = await db
      .select({ count: count() })
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.userId, userId),
          eq(generationJobs.status, "failed"),
        ),
      );

    const failedJobs = failedResult?.count ?? 0;
    const successRate = totalJobs > 0 ? Math.round(((totalJobs - failedJobs) / totalJobs) * 100) : 100;

    return { generatedToday, successRate, totalJobs, failedJobs };
  }
}