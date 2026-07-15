import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { UsageService } from "../services/usage";
import type { AppEnv } from "../app";

export const statsRoutes = new Hono<AppEnv>();

statsRoutes.use("*", verifyFirebaseToken);

statsRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const service = new UsageService();
  const stats = await service.getStats(userId);
  return c.json(stats);
});