import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { db } from "../../db/index.js";
import { avatars } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getAgeRangeLabel } from "@faceless/shared";

const avatarInputSchema = z.object({
  avatarId: z.string(),
  userId: z.string(),
  customPrompt: z.string().optional(),
});

const generateCharacterDescriptionStep = createStep({
  id: "generate-character-description",
  description: "Fetch avatar and generate a detailed character description",
  inputSchema: avatarInputSchema,
  outputSchema: z.object({
    avatarId: z.string(),
    userId: z.string(),
    description: z.string(),
    name: z.string(),
    customPrompt: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const [avatar] = await db
      .select()
      .from(avatars)
      .where(eq(avatars.id, inputData.avatarId))
      .limit(1);

    if (!avatar) {
      throw new Error(`Avatar not found: ${inputData.avatarId}`);
    }

    const textProvider = getProviders().text;

    const ageRange = getAgeRangeLabel(avatar.age ?? null);

    const systemPrompt = `You are a character designer. Create a detailed character description optimized for a multi-panel character reference sheet.

Given the avatar's name, age, gender, and speech style, generate a comprehensive character description suitable for consistent AI image generation across multiple views and expressions.

The character sheet should describe:
1. Facial features (face shape, eyes, nose, mouth, skin tone, hair style and color, distinctive facial details)
2. Physical appearance (clothing style, body type, posture, distinguishing features)
3. Body proportions from all angles (front, side, back, 3/4 view)
4. Clothing details (fit, color, texture, how fabric drapes)
5. 6 facial expressions: neutral, happy, sad, angry, surprised, thoughtful
6. Distinguishing features visible from side and back views
7. Color palette and aesthetic
8. Typical environments and settings

IMPORTANT: This is a REALISTIC HUMAN character. Describe their face and expressions in detail. Focus on making them look like an authentic, real person with unique facial characteristics.

Output format: A single paragraph (200-300 words) that can be injected into image generation prompts to maintain character consistency across multiple views and expressions.`;

    let userPrompt = `Create a character sheet for: ${avatar.name}, ${ageRange || "unknown"} years old, ${avatar.gender ?? "unspecified"}, speech style: ${avatar.speechStyle ?? "neutral"}.`;
    if (inputData.customPrompt) {
      userPrompt += `\n\nAdditional instructions: ${inputData.customPrompt}`;
    }

    const generateOptions: { system: string; prompt: string; temperature: number; maxTokens: number; images?: { name: string; url: string }[] } = {
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
      maxTokens: 1024,
    };

    if (avatar.referenceImageUrl) {
      generateOptions.images = [{ name: "reference", url: avatar.referenceImageUrl }];
    }

    const description = await textProvider.generate(generateOptions);

    return {
      avatarId: inputData.avatarId,
      userId: inputData.userId,
      description,
      name: avatar.name,
      customPrompt: inputData.customPrompt,
    };
  },
});

const generateCharacterSheetStep = createStep({
  id: "generate-character-sheet",
  description: "Generate a character sheet image from the description and update the avatar",
  inputSchema: z.object({
    avatarId: z.string(),
    userId: z.string(),
    description: z.string(),
    name: z.string(),
    customPrompt: z.string().optional(),
  }),
  outputSchema: z.object({
    avatarId: z.string(),
    userId: z.string(),
    characterSheetUrl: z.string(),
    description: z.string(),
    name: z.string(),
    customPrompt: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const imageProvider = getProviders().image;

    let imagePrompt = `A character reference sheet showing ${inputData.name} in T-pose from front view (center, large), side view (right), back view (left), and 3/4 view. Below: 6 facial expression portraits in a 2x3 grid — neutral, happy, sad, angry, surprised, thoughtful. Character design: ${inputData.description}. Clean white background, consistent character design across all views, professional character sheet layout, grid lines separating panels, uniform lighting on all views.`;
    if (inputData.customPrompt) {
      imagePrompt += `\n\nAdditional instructions: ${inputData.customPrompt}`;
    }

    const CHARACTER_SHEET_SIZE = "1080*1920";
    const characterSheetUrl = await imageProvider.generate(imagePrompt, CHARACTER_SHEET_SIZE);

    await db
      .update(avatars)
      .set({
        characterSheetUrl,
        updatedAt: new Date(),
      })
      .where(eq(avatars.id, inputData.avatarId));

    return {
      avatarId: inputData.avatarId,
      userId: inputData.userId,
      characterSheetUrl,
      description: inputData.description,
      name: inputData.name,
      customPrompt: inputData.customPrompt,
    };
  },
});

const generatePortraitStep = createStep({
  id: "generate-portrait",
  description: "Generate a clean portrait headshot and update the avatar",
  inputSchema: z.object({
    avatarId: z.string(),
    userId: z.string(),
    characterSheetUrl: z.string(),
    description: z.string(),
    name: z.string(),
    customPrompt: z.string().optional(),
  }),
  outputSchema: z.object({
    avatarId: z.string(),
    characterSheetUrl: z.string(),
    portraitUrl: z.string(),
  }),
  execute: async ({ inputData }) => {
    const imageProvider = getProviders().image;

    let imagePrompt = `A professional headshot portrait of ${inputData.name}: ${inputData.description}. Soft studio lighting, clean background, warm smile, professional photography, 8K quality, soft natural makeup, business casual attire.`;
    if (inputData.customPrompt) {
      imagePrompt += `\n\nAdditional instructions: ${inputData.customPrompt}`;
    }

    const PORTRAIT_SIZE = "1080*1080";
    const portraitUrl = await imageProvider.generate(imagePrompt, PORTRAIT_SIZE);

    const [avatar] = await db
      .select({ characterSheetUrl: avatars.characterSheetUrl })
      .from(avatars)
      .where(eq(avatars.id, inputData.avatarId))
      .limit(1);

    await db
      .update(avatars)
      .set({
        portraitUrl,
        updatedAt: new Date(),
      })
      .where(eq(avatars.id, inputData.avatarId));

    return {
      avatarId: inputData.avatarId,
      characterSheetUrl: avatar?.characterSheetUrl ?? "",
      portraitUrl,
    };
  },
});

export const generateAvatarWorkflow = createWorkflow({
  id: "generate-avatar-workflow",
  inputSchema: avatarInputSchema,
  outputSchema: z.object({
    avatarId: z.string(),
    characterSheetUrl: z.string(),
    portraitUrl: z.string(),
  }),
})
  .then(generateCharacterDescriptionStep)
  .then(generateCharacterSheetStep)
  .then(generatePortraitStep);

generateAvatarWorkflow.commit();