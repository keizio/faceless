import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ContentService } from "../services/content";
import { createContentSchema } from "@faceless/shared";
import type { CreateContentInput } from "@faceless/shared";
import type { AppEnv } from "../app";

export const contentRoutes = new Hono<AppEnv>();

contentRoutes.use("*", verifyFirebaseToken);

contentRoutes.post("/:projectId/contents", validate(createContentSchema), async (c) => {
  const userId = c.get("userId");
  const projectId = c.req.param("projectId")!;
  const data = c.get("validated") as CreateContentInput;
  const service = new ContentService();
  const result = await service.createContent(userId, projectId, data);
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

contentRoutes.post("/:id/regenerate", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new ContentService();
  const result = await service.regenerateContent(userId, id);
  return c.json(result);
});