import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { AuthService } from "../services/auth";
import type { AppEnv } from "../app";

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/verify", verifyFirebaseToken, async (c) => {
  const userId = c.get("userId");
  const email = c.get("email");
  const service = new AuthService();
  const session = await service.createSession(userId, email);
  return c.json(session);
});

authRoutes.get("/me", verifyFirebaseToken, async (c) => {
  const userId = c.get("userId");
  const service = new AuthService();
  const user = await service.getUser(userId);
  return c.json({ user });
});
