import { db } from "../db";
import { avatars, generationJobs } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { enqueueAvatarGeneration } from "../queues/avatar-generation.js";
import { UsageService } from "./usage.js";

export class AvatarService {
  async listAvatars(userId: string) {
    return db
      .select()
      .from(avatars)
      .where(eq(avatars.userId, userId))
      .orderBy(desc(avatars.createdAt));
  }

  async getAvatar(userId: string, id: string) {
    const [avatar] = await db
      .select()
      .from(avatars)
      .where(and(eq(avatars.id, id), eq(avatars.userId, userId)))
      .limit(1);

    if (!avatar) throw new Error("Avatar not found");
    return avatar;
  }

  async createAvatar(
    userId: string,
    data: {
      name: string;
      age?: number;
      gender?: string;
      speechStyle?: string;
      referenceImageUrl?: string;
      customPrompt?: string;
    },
  ) {
    const metadata: Record<string, unknown> = {};
    if (data.customPrompt) {
      metadata.customPrompt = data.customPrompt;
    }

    const [avatar] = await db
      .insert(avatars)
      .values({
        userId,
        name: data.name,
        age: data.age ?? null,
        gender: data.gender ?? null,
        speechStyle: (data.speechStyle ?? null) as any,
        referenceImageUrl: data.referenceImageUrl ?? null,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      })
      .returning();
    return avatar;
  }

  async updateAvatar(
    userId: string,
    id: string,
    data: Partial<{
      name: string;
      age: number;
      gender: string;
      speechStyle: string;
      referenceImageUrl: string;
      customPrompt: string;
    }>,
  ) {
    const existing = await this.getAvatar(userId, id);
    const metadata = { ...(existing.metadata ?? {}) } as Record<string, unknown>;
    if (data.customPrompt !== undefined) {
      if (data.customPrompt) {
        metadata.customPrompt = data.customPrompt;
      } else {
        delete metadata.customPrompt;
      }
    }

    const { customPrompt: _, ...dbData } = data;

    const [avatar] = await db
      .update(avatars)
      .set({
        ...dbData,
        speechStyle: data.speechStyle as any,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(avatars.id, id), eq(avatars.userId, userId)))
      .returning();

    if (!avatar) throw new Error("Avatar not found");
    return avatar;
  }

  async deleteAvatar(userId: string, id: string) {
    const [avatar] = await db
      .delete(avatars)
      .where(and(eq(avatars.id, id), eq(avatars.userId, userId)))
      .returning();

    if (!avatar) throw new Error("Avatar not found");
    return avatar;
  }

  async generateCharacterSheet(userId: string, avatarId: string, customPrompt?: string) {
    const usageService = new UsageService();
    const limit = await usageService.checkGenerationLimit(userId);
    if (!limit.allowed) {
      throw new Error(`Daily generation limit reached. You have used ${limit.limit} out of ${limit.limit} generations. Upgrade to pro for more.`);
    }

    const avatar = await this.getAvatar(userId, avatarId);

    const resolvedCustomPrompt = customPrompt || (avatar.metadata as Record<string, unknown> | null)?.customPrompt as string | undefined;

    const [job] = await db
      .insert(generationJobs)
      .values({
        avatarId,
        userId,
        jobType: "avatar-generation",
        status: "pending",
      })
      .returning();

    await enqueueAvatarGeneration({
      jobId: job.id,
      userId,
      avatarId,
      customPrompt: resolvedCustomPrompt,
    });

    return { job, avatar };
  }
}