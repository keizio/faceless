import { z } from "zod";

export const createContentSchema = z.object({
  type: z.enum(["image", "slide", "video", "text"]),
  platform: z.enum(["tiktok", "instagram", "facebook", "twitter", "generic"]),
  aspectRatio: z.string().min(1),
  language: z.string().min(1).max(10),
  prompt: z.string().min(1).max(2000),
  title: z.string().max(200).optional(),
  avatarId: z.string().uuid().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const createAvatarSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(1).max(150).optional(),
  gender: z.string().max(50).optional(),
  speechStyle: z
    .enum([
      "formal",
      "casual",
      "humorous",
      "professional",
      "friendly",
      "persuasive",
      "inspirational",
      "educational",
    ])
    .optional(),
  referenceImageUrl: z.string().url().optional(),
});

export const updateAvatarSchema = createAvatarSchema.partial();

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateAvatarInput = z.infer<typeof createAvatarSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
