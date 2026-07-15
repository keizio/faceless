import { Context, Next } from "hono";
import { getAuth } from "../lib/firebase";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export async function verifyFirebaseToken(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);
    const userId = decoded.uid;
    const email = decoded.email || "";

    c.set("userId", userId);
    c.set("email", email);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      await db.insert(users).values({ id: userId, email, language: "en" });
    }

    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
