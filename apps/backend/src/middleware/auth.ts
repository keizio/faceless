import { Context, Next } from "hono";
import { getAuth } from "../lib/firebase";

export async function verifyFirebaseToken(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);
    c.set("userId", decoded.uid);
    c.set("email", decoded.email || "");
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
