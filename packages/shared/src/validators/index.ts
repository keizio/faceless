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
  portraitUrl: z.string().url().optional(),
  customPrompt: z.string().max(1000).optional(),
});

export const updateAvatarSchema = createAvatarSchema.partial();

export const textLayerSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  fontFamily: z.string().default("Inter"),
  fontSize: z.number().min(8).max(200),
  fontWeight: z.enum(["normal", "bold"]).default("normal"),
  fontStyle: z.enum(["normal", "italic"]).default("normal"),
  color: z.string().default("#ffffff"),
  textAlign: z.enum(["left", "center", "right"]).default("center"),
  x: z.number(),
  y: z.number(),
  width: z.number().min(50),
  originX: z.enum(["left", "center", "right"]).default("center"),
  originY: z.enum(["top", "center", "bottom"]).default("center"),
  angle: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  source: z.enum(["ai", "user"]).default("user"),
  underline: z.boolean().default(false),
  linethrough: z.boolean().default(false),
  charSpacing: z.number().default(0),
  lineHeight: z.number().default(1.2),
  textStroke: z.string().default("transparent"),
  textStrokeWidth: z.number().min(0).max(10).default(0),
  textBackgroundColor: z.string().default("transparent"),
});

export const shapeLayerSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["rectangle", "circle", "line", "arrow"]),
  x: z.number(),
  y: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
  fill: z.string().default("transparent"),
  stroke: z.string().default("#ffffff"),
  strokeWidth: z.number().min(0).max(20).default(2),
  opacity: z.number().min(0).max(1).default(1),
  angle: z.number().default(0),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  rx: z.number().min(0).optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
});

export const saveTextLayersSchema = z.object({
  versionId: z.string().uuid(),
  textLayers: z.record(z.array(textLayerSchema)),
  shapeLayers: z.record(z.array(shapeLayerSchema)).optional(),
});

export const editorExportSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1),
  textLayers: z.record(z.array(textLayerSchema)),
  shapeLayers: z.record(z.array(shapeLayerSchema)).optional(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateAvatarInput = z.infer<typeof createAvatarSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
export type BrandKitInput = z.infer<typeof brandKitSchema>;
export type BrandKitColorsInput = z.infer<typeof brandKitColorsSchema>;
export type TextLayerInput = z.infer<typeof textLayerSchema>;
export type SaveTextLayersInput = z.infer<typeof saveTextLayersSchema>;
export type EditorExportInput = z.infer<typeof editorExportSchema>;
export type ShapeLayerInput = z.infer<typeof shapeLayerSchema>;
