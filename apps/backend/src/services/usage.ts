import { db } from "../db/index";
import { generationJobs, users } from "../db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export class UsageService {
  async getCredits(userId: string): Promise<number> {
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user?.credits ?? 0;
  }

  async checkGenerationLimit(userId: string, cost: number): Promise<{ allowed: boolean; credits: number; cost: number }> {
    const credits = await this.getCredits(userId);

    return {
      allowed: credits >= cost,
      credits,
      cost,
    };
  }

  async deductCredits(userId: string, cost: number): Promise<void> {
    const [result] = await db
      .update(users)
      .set({ credits: sql`${users.credits} - ${cost}` })
      .where(and(eq(users.id, userId), sql`${users.credits} >= ${cost}`))
      .returning({ credits: users.credits });

    if (!result) {
      throw new Error("Insufficient credits");
    }
  }

  async getStats(userId: string) {
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const credits = user?.credits ?? 0;

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

    return { credits, successRate, totalJobs, failedJobs };
  }
}