import { Hono } from "hono";
import { z } from "zod";
import { getUserIdeas, generateIdeas } from "../services/ideas";
import { verifyFirebaseToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import type { AppEnv } from "../app";

const ideasRoutes = new Hono<AppEnv>();

ideasRoutes.use("*", verifyFirebaseToken);

ideasRoutes.get("/", async (c) => {
  const userId = c.var.userId;
  const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
  const offset = Number(c.req.query("offset")) || 0;

  const result = await getUserIdeas(userId, limit, offset);
  return c.json(result);
});

const generateIdeasSchema = z.object({
  prompt: z.string().min(1).max(500),
  language: z.string().min(1).max(10),
});

ideasRoutes.post("/generate", validate(generateIdeasSchema), async (c) => {
  const userId = c.var.userId;
  const { prompt, language } = c.get("validated") as z.infer<typeof generateIdeasSchema>;
  const idea = await generateIdeas(userId, prompt.trim(), language);
  return c.json(idea, 201);
});

export { ideasRoutes };