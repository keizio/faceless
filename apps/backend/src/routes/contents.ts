import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { ContentService } from "../services/content";
import type { AppEnv } from "../app";

export const contentRoutes = new Hono<AppEnv>();

contentRoutes.use("*", verifyFirebaseToken);

contentRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new ContentService();
  const content = await service.getContent(userId, id);
  return c.json({ content });
});

contentRoutes.get("/:id/versions", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new ContentService();
  const versions = await service.listVersions(userId, id);
  return c.json({ versions });
});

contentRoutes.post("/:id/regenerate", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new ContentService();
  const result = await service.regenerateContent(userId, id);
  return c.json(result);
});

contentRoutes.post("/:id/duplicate", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id")!;
  const { language } = await c.req.json();
  if (!language || typeof language !== "string") {
    return c.json({ error: "language is required" }, 400);
  }
  const service = new ContentService();
  const result = await service.duplicateContent(userId, id, language);
  return c.json(result, 201);
});