import { db } from "../db";
import { avatars, generationJobs } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

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
    },
  ) {
    const [avatar] = await db
      .insert(avatars)
      .values({
        userId,
        name: data.name,
        age: data.age ?? null,
        gender: data.gender ?? null,
        speechStyle: (data.speechStyle ?? null) as any,
        referenceImageUrl: data.referenceImageUrl ?? null,
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
    }>,
  ) {
    const [avatar] = await db
      .update(avatars)
      .set({
        ...data,
        speechStyle: data.speechStyle as any,
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

  async generateCharacterSheet(userId: string, avatarId: string) {
    const avatar = await this.getAvatar(userId, avatarId);

    const [job] = await db
      .insert(generationJobs)
      .values({
        avatarId,
        userId,
        jobType: "avatar-generation",
        status: "pending",
      })
      .returning();

    return { job, avatar };
  }
}