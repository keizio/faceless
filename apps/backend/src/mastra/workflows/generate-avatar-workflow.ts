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

    const systemPrompt = `You are a character designer. Create a detailed character sheet for a realistic human avatar.

Given the avatar's name, age, gender, and speech style, generate a comprehensive character description suitable for consistent AI image generation.

The character sheet should describe:
1. Facial features (face shape, eyes, nose, mouth, skin tone, hair style and color, distinctive facial details)
2. Physical appearance (clothing style, body type, posture, distinguishing features)
3. Typical expressions and demeanor matching their speech style
4. Typical environments and settings
5. Color palette and aesthetic
6. Camera angles and framing that suit this character
7. Visual mood and atmosphere

IMPORTANT: This is a REALISTIC HUMAN character. Describe their face and expressions in detail. Focus on making them look like an authentic, real person with unique facial characteristics.

Output format: A single paragraph (200-300 words) that can be injected into image generation prompts to maintain character consistency.`;

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
    characterSheetUrl: z.string(),
  }),
  execute: async ({ inputData }) => {
    const imageProvider = getProviders().image;

    let imagePrompt = `A realistic character portrait of ${inputData.name}: ${inputData.description}. Photorealistic style, visible face with natural expressions, clean background, professional portrait photography.`;
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
      characterSheetUrl,
    };
  },
});

export const generateAvatarWorkflow = createWorkflow({
  id: "generate-avatar-workflow",
  inputSchema: avatarInputSchema,
  outputSchema: z.object({
    avatarId: z.string(),
    characterSheetUrl: z.string(),
  }),
})
  .then(generateCharacterDescriptionStep)
  .then(generateCharacterSheetStep);

generateAvatarWorkflow.commit();