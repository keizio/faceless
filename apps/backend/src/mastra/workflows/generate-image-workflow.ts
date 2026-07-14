import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import { buildPromptContext, assembleFinalPrompt } from "../../lib/prompts/prompt-builder.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type { Platform, ContentType } from "@faceless/shared";
import type { EnhancedPrompt } from "../../lib/prompts/types.js";

const imageInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  platform: z.string(),
  aspectRatio: z.string().default("9:16"),
  language: z.string().default("en"),
  avatarId: z.string().optional(),
});

const enhanceImagePromptStep = createStep({
  id: "enhance-image-prompt",
  description: "Build prompt context and enhance prompt for image generation",
  inputSchema: imageInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    enhancedPrompt: z.string(),
    aspectRatio: z.string(),
    promptMetadata: z.any(),
  }),
  execute: async ({ inputData }) => {
    const context = await buildPromptContext(
      inputData.contentId,
      inputData.prompt,
      inputData.platform as Platform,
      "image" as ContentType,
      inputData.language,
      inputData.aspectRatio,
    );

    const textProvider = getProviders().text;

    const isFaceless = !context.avatar;

    const systemPrompt = `You are a visual prompt engineer. Transform a user's content idea into a detailed image generation prompt.

Platform: ${inputData.platform}
${isFaceless ? "FACELESS MODE: Generate content with NO human figures, NO faces. Focus on environment, objects, typography, and abstract visuals." : `AVATAR MODE: Include the character in the visual description. Avatar: ${context.avatar!.name}, ${context.avatar!.age ?? ""} years old, ${context.avatar!.gender ?? ""}, speech style: ${context.avatar!.speechStyle ?? "neutral"}.`}

Output format: JSON with {
  "visualPrompt": string (rich visual description under 200 words),
  "cameraDirection": {
    "shotType": "close-up" | "medium-shot" | "wide-shot" | "establishing-shot" | "pov" | "over-the-shoulder" | "dutch-angle" | "aerial",
    "movement"?: "static" | "pan" | "tilt" | "zoom" | "tracking" | "dolly" | "handheld" | "drone",
    "lighting": "natural" | "golden-hour" | "studio" | "neon" | "low-key" | "high-key" | "backlit" | "rim-light" | "cinematic" | "soft-diffused",
    "composition"?: "rule-of-thirds" | "center-frame" | "leading-lines" | "symmetry" | "negative-space" | "depth-of-field-shallow",
    "style"?: "cinematic" | "documentary" | "social-media-native" | "stop-motion" | "timelapse" | "macro"
  },
  "qualityTags": string[]
}`;

    const result = await textProvider.generate({
      system: systemPrompt,
      prompt: `Create a visual image generation prompt for ${inputData.platform}, aspect ratio ${inputData.aspectRatio}, about: ${inputData.prompt}`,
      temperature: 0.7,
    });

    let enhanced: EnhancedPrompt;
    try {
      const parsed = JSON.parse(result);
      enhanced = {
        visualPrompt: parsed.visualPrompt ?? inputData.prompt,
        cameraDirection: parsed.cameraDirection ?? {
          shotType: "medium-shot",
          lighting: "cinematic",
        },
        qualityTags: parsed.qualityTags ?? [],
        negativePrompt: "",
      };
    } catch {
      enhanced = {
        visualPrompt: inputData.prompt,
        cameraDirection: {
          shotType: "medium-shot",
          lighting: "cinematic",
        },
        qualityTags: [],
        negativePrompt: "",
      };
    }

    const finalPrompt = assembleFinalPrompt(enhanced, context);

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      enhancedPrompt: finalPrompt,
      aspectRatio: inputData.aspectRatio,
      promptMetadata: {
        enhanced,
        context: {
          platform: context.platform,
          hasAvatar: !!context.avatar,
          avatarName: context.avatar?.name,
        },
      },
    };
  },
});

const generateImageStep = createStep({
  id: "generate-image",
  description: "Generate a single AI image from enhanced prompt",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    enhancedPrompt: z.string(),
    aspectRatio: z.string(),
    promptMetadata: z.any(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    imageUrl: z.string(),
  }),
  execute: async ({ inputData }) => {
    const size = getImageSize(inputData.aspectRatio);
    const imageUrl = await getProviders().image.generate(inputData.enhancedPrompt, size);

    await db.insert(mediaAssets).values({
      userId: inputData.userId,
      contentId: inputData.contentId,
      type: "image",
      url: imageUrl,
      provider: process.env.AI_IMAGE_PROVIDER ?? "dashscope",
      metadata: {
        prompt: inputData.enhancedPrompt,
        size,
        ...inputData.promptMetadata,
      },
    });

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      imageUrl,
    };
  },
});

const saveImageVersionStep = createStep({
  id: "save-image-version",
  description: "Save generated image as a content version",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    imageUrl: z.string(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    imageUrl: z.string(),
  }),
  execute: async ({ inputData }) => {
    const existingVersions = await db.query.contentVersions.findMany({
      where: eq(contentVersions.contentId, inputData.contentId),
    });

    const versionNumber = existingVersions.length + 1;

    const [version] = await db
      .insert(contentVersions)
      .values({
        contentId: inputData.contentId,
        versionNumber,
        outputUrl: inputData.imageUrl,
        thumbnailUrl: inputData.imageUrl,
        metadata: { type: "image" },
      })
      .returning();

    await db
      .update(contents)
      .set({ status: "ready" })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      versionId: version.id,
      imageUrl: inputData.imageUrl,
    };
  },
});

export const generateImageWorkflow = createWorkflow({
  id: "generate-image-workflow",
  inputSchema: imageInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    imageUrl: z.string(),
  }),
})
  .then(enhanceImagePromptStep)
  .then(generateImageStep)
  .then(saveImageVersionStep);

generateImageWorkflow.commit();