import { z } from "zod";

export const createContentSchema = z.object({
  type: z.enum(["image", "slide", "video", "text"]),
  platform: z.enum(["tiktok", "instagram", "facebook", "twitter", "generic"]),
  aspectRatio: z.string().min(1),
  language: z.string().min(1).max(10),
  prompt: z.string().min(1).max(2000),
  title: z.string().max(200).optional(),
  avatarId: z.string().uuid().optional(),
  slideCount: z.number().int().min(1).max(10).optional(),
  templateId: z.string().optional(),
  templateInputs: z.record(z.unknown()).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const brandKitColorsSchema = z.object({
  primary: z.string().min(1).default("#1a1a2e"),
  secondary: z.string().min(1).default("#e94560"),
  accent: z.string().min(1).default("#f39c12"),
  text: z.string().optional(),
  background: z.string().optional(),
});

export const brandKitSchema = z.object({
  brandName: z.string().max(100).optional(),
  colors: brandKitColorsSchema.optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  fontFamily: z.string().max(100).optional(),
  brandVoice: z.string().max(2000).optional(),
  defaultHashtags: z.array(z.string().max(100)).max(30).optional(),
  defaultCta: z.string().max(500).optional(),
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
  customPrompt: z.string().max(1000).optional(),
});

export const updateAvatarSchema = createAvatarSchema.partial();

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateAvatarInput = z.infer<typeof createAvatarSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
export type BrandKitInput = z.infer<typeof brandKitSchema>;
export type BrandKitColorsInput = z.infer<typeof brandKitColorsSchema>;
