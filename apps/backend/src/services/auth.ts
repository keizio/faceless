import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export class AuthService {
  async createSession(firebaseUid: string, email: string) {
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, firebaseUid))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ id: firebaseUid, email })
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
}