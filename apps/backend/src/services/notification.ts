import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc, count } from "drizzle-orm";

export class NotificationService {
  async create(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string,
  ) {
    const [notification] = await db
      .insert(notifications)
      .values({ userId, type, title, message, link: link ?? null })
      .returning();
    return notification;
  }

  async list(userId: string, limit = 20, offset = 0) {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async markAsRead(userId: string, id: string) {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(eq(notifications.id, id), eq(notifications.userId, userId)),
      )
      .returning();
    return notification;
  }

  async markAllAsRead(userId: string) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.read, false)),
      );
  }

  async getUnreadCount(userId: string) {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.read, false)),
      );
    return result?.count ?? 0;
  }
}