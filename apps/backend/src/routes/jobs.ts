import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { JobService } from "../services/job";
import type { AppEnv } from "../app";

export const jobRoutes = new Hono<AppEnv>();

jobRoutes.use("*", verifyFirebaseToken);

jobRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new JobService();
  const job = await service.getJobStatus(userId, id);
  return c.json({ job });
});
