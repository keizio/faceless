import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ContentService } from "../services/content";
import { createContentSchema } from "@faceless/shared";
import type { CreateContentInput } from "@faceless/shared";
import { z } from "zod";
import type { AppEnv } from "../app";

export const contentRoutes = new Hono<AppEnv>();

contentRoutes.use("*", verifyFirebaseToken);

contentRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
  const offset = Number(c.req.query("offset")) || 0;
  const projectIdParam = c.req.query("projectId");
  let projectIdFilter: string | null | undefined;
  if (projectIdParam === "null") {
    projectIdFilter = null;
  } else if (projectIdParam) {
    projectIdFilter = projectIdParam;
  }
  const service = new ContentService();
  const { contents, total } = await service.listAllContents(userId, limit, offset, projectIdFilter);
  return c.json({ contents, total, limit, offset });
});

const createContentWithProjectSchema = createContentSchema.extend({
  projectId: z.string().uuid().optional(),
});

contentRoutes.post("/", validate(createContentWithProjectSchema), async (c) => {
  const userId = c.get("userId");
  const data = c.get("validated") as CreateContentInput & { projectId?: string };
  const service = new ContentService();
  const result = await service.createContent(userId, data.projectId ?? null, {
    ...data,
    slideCount: data.slideCount,
  });
  return c.json(result, 201);
});

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

contentRoutes.get("/:id/versions/:versionId/download", async (c) => {
  const userId = c.get("userId");
  const contentId = c.req.param("id");
  const versionId = c.req.param("versionId");
  const service = new ContentService();
  const url = await service.getVersionDownloadUrl(userId, contentId, versionId);
  if (!url) {
    return c.json({ error: "No output file for this version" }, 404);
  }
  return c.redirect(url);
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

contentRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new ContentService();
  await service.deleteContent(userId, id);
  return c.json({ success: true });
});