import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth.js";
import { ALL_TEMPLATES, getTemplateById } from "@faceless/shared";
import type { AppEnv } from "../app.js";

export const templateRoutes = new Hono<AppEnv>();

templateRoutes.use("*", verifyFirebaseToken);

templateRoutes.get("/", async (c) => {
  return c.json({ templates: ALL_TEMPLATES });
});

templateRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const template = getTemplateById(id);
  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }
  return c.json({ template });
});
