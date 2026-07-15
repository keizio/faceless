import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ProjectService } from "../services/project";
import { ContentService } from "../services/content";
import { createProjectSchema, createContentSchema, brandKitSchema } from "@faceless/shared";
import type { CreateProjectInput, CreateContentInput, BrandKitInput } from "@faceless/shared";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});
import type { AppEnv } from "../app";

export const projectRoutes = new Hono<AppEnv>();

projectRoutes.use("*", verifyFirebaseToken);

projectRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
  const offset = Number(c.req.query("offset")) || 0;
  const service = new ProjectService();
  const { projects, total } = await service.listProjects(userId, limit, offset);
  return c.json({ projects, total, limit, offset });
});

projectRoutes.post("/", validate(createProjectSchema), async (c) => {
  const userId = c.get("userId");
  const data = c.get("validated") as CreateProjectInput;
  const service = new ProjectService();
  const project = await service.createProject(userId, data);
  return c.json({ project }, 201);
});

projectRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new ProjectService();
  const project = await service.getProject(userId, id);
  return c.json({ project });
});

projectRoutes.post("/:projectId/contents", validate(createContentSchema), async (c) => {
  const userId = c.get("userId");
  const projectId = c.req.param("projectId")!;
  const data = c.get("validated") as CreateContentInput;
  const service = new ContentService();
  const result = await service.createContent(userId, projectId, {
    ...data,
    slideCount: data.slideCount,
  });
  return c.json(result, 201);
});

projectRoutes.get("/:id/brand-kit", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id")!;
  const service = new ProjectService();
  const brandKit = await service.getBrandKit(userId, id);
  return c.json({ brandKit });
});

projectRoutes.put("/:id/brand-kit", validate(brandKitSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id")!;
  const data = c.get("validated") as BrandKitInput;
  const service = new ProjectService();
  const brandKit = await service.updateBrandKit(userId, id, data);
  return c.json({ brandKit });
});

projectRoutes.patch("/:id", validate(updateProjectSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id")!;
  const data = c.get("validated") as { name?: string; description?: string };
  const service = new ProjectService();
  const project = await service.updateProject(userId, id, data);
  return c.json({ project });
});

projectRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new ProjectService();
  await service.deleteProject(userId, id);
  return c.json({ success: true });
});