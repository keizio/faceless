import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export class AuthService {
  async createSession(firebaseUid: string, email: string, language?: string) {
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, firebaseUid))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ id: firebaseUid, email, language: language ?? "en" })
        .returning();
    }

    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return { token, user };
  }

  async getUser(firebaseUid: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, firebaseUid))
      .limit(1);
    return user || null;
  }

  async updateLanguage(firebaseUid: string, language: string) {
    const [user] = await db
      .update(users)
      .set({ language, updatedAt: new Date() })
      .where(eq(users.id, firebaseUid))
      .returning();
    return user;
  }
}