import { z } from "zod";

export const createContentSchema = z.object({
  type: z.enum(["image", "slide", "video", "text"]),
  platform: z.enum(["tiktok", "instagram", "facebook", "twitter", "generic"]),
  prompt: z.string().min(1).max(2000),
  title: z.string().max(200).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
