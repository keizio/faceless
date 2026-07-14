import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import {
  buildPromptContext,
  assembleFinalPrompt,
  assembleScenePrompt,
} from "../../lib/prompts/prompt-builder.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type { Platform, ContentType } from "@faceless/shared";
import type { EnhancedPrompt } from "../../lib/prompts/types.js";

const videoInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  platform: z.string(),
  aspectRatio: z.string().default("9:16"),
  sceneCount: z.number().default(3),
  language: z.string().default("en"),
  avatarId: z.string().optional(),
});

const enhanceVideoPromptStep = createStep({
  id: "enhance-video-prompt",
  description: "Build prompt context and enhance overall storyboard prompt",
  inputSchema: videoInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    aspectRatio: z.string(),
    sceneCount: z.number(),
    platform: z.string(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
  }),
  execute: async ({ inputData }) => {
    const context = await buildPromptContext(
      inputData.contentId,
      inputData.prompt,
      inputData.platform as Platform,
      "video" as ContentType,
      inputData.language,
      inputData.aspectRatio,
    );

    const textProvider = getProviders().text;

    const isFaceless = !context.avatar;

    const systemPrompt = `You are a visual prompt engineer for video generation. Create a storyboard-level visual prompt for a ${inputData.sceneCount}-scene video.

Platform: ${inputData.platform}
${isFaceless ? "FACELESS MODE: NO human figures, NO faces. Focus on environments, objects, text overlays, and abstract visuals." : `AVATAR MODE: Character: ${context.avatar!.name}, ${context.avatar!.age ?? ""} years old, ${context.avatar!.gender ?? ""}, style: ${context.avatar!.speechStyle ?? "neutral"}.`}

Output format: JSON with {
  "visualPrompt": string (overall storyboard visual description),
  "cameraDirection": { "shotType": string, "movement"?: string, "lighting": string, "composition"?: string, "style"?: string },
  "qualityTags": string[],
  "scenePrompts": string[] (${inputData.sceneCount} individual scene visual descriptions)
}`;

    const result = await textProvider.generate({
      system: systemPrompt,
      prompt: `Create a visual storyboard for a ${inputData.sceneCount}-scene ${inputData.platform} video about: ${inputData.prompt}. Aspect ratio: ${inputData.aspectRatio}.`,
      temperature: 0.7,
    });

    let enhanced: EnhancedPrompt & { scenePrompts: string[] };
    try {
      const parsed = JSON.parse(result);
      enhanced = {
        visualPrompt: parsed.visualPrompt ?? inputData.prompt,
        cameraDirection: parsed.cameraDirection ?? {
          shotType: "establishing-shot",
          lighting: "cinematic",
        },
        qualityTags: parsed.qualityTags ?? [],
        negativePrompt: "",
        scenePrompts: parsed.scenePrompts ?? [],
      };
    } catch {
      enhanced = {
        visualPrompt: inputData.prompt,
        cameraDirection: {
          shotType: "establishing-shot",
          lighting: "cinematic",
        },
        qualityTags: [],
        negativePrompt: "",
        scenePrompts: [],
      };
    }

    const contextData = {
      platform: context.platform,
      hasAvatar: !!context.avatar,
      avatarName: context.avatar?.name,
      avatarReferenceImageUrl: context.avatar?.referenceImageUrl,
    };

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      aspectRatio: inputData.aspectRatio,
      sceneCount: inputData.sceneCount,
      platform: inputData.platform,
      enhancedPrompt: enhanced,
      promptContext: contextData,
    };
  },
});

const generateVideoImagesStep = createStep({
  id: "generate-video-images",
  description: "Generate key frame images for video scenes with enhanced prompts",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    aspectRatio: z.string(),
    sceneCount: z.number(),
    platform: z.string(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    scenes: z.array(
      z.object({
        url: z.string(),
        description: z.string(),
        scenePrompt: z.string(),
      }),
    ),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
  }),
  execute: async ({ inputData }) => {
    const size = getImageSize(inputData.aspectRatio);
    const enhanced = inputData.enhancedPrompt as EnhancedPrompt & { scenePrompts: string[] };
    const contextData = inputData.promptContext as {
      platform: string;
      hasAvatar: boolean;
      avatarName?: string;
      avatarReferenceImageUrl?: string;
    };
    const scenes: { url: string; description: string; scenePrompt: string }[] = [];

    let previousScenePrompt: string | undefined;

    for (let i = 0; i < inputData.sceneCount; i++) {
      const sceneEnhanced: EnhancedPrompt = {
        visualPrompt: enhanced.scenePrompts?.[i] ?? enhanced.visualPrompt,
        cameraDirection: enhanced.cameraDirection,
        qualityTags: enhanced.qualityTags,
        negativePrompt: enhanced.negativePrompt,
      };

      const contextForScene = {
        userPrompt: inputData.prompt,
        contentType: "video" as ContentType,
        platform: contextData.platform as Platform,
        aspectRatio: inputData.aspectRatio,
        language: "en",
        sceneIndex: i,
        totalScenes: inputData.sceneCount,
      };

      const scenePrompt = assembleScenePrompt(
        sceneEnhanced,
        contextForScene,
        i,
        inputData.sceneCount,
        previousScenePrompt,
      );

      const imageUrl = await getProviders().image.generate(scenePrompt, size);

      await db.insert(mediaAssets).values({
        userId: inputData.userId,
        contentId: inputData.contentId,
        type: "image",
        url: imageUrl,
        provider: process.env.AI_IMAGE_PROVIDER ?? "dashscope",
        metadata: {
          prompt: scenePrompt,
          size,
          scene: i + 1,
          totalScenes: inputData.sceneCount,
          hasAvatar: contextData.hasAvatar,
        },
      });

      previousScenePrompt = scenePrompt;

      scenes.push({
        url: imageUrl,
        description: `Scene ${i + 1}`,
        scenePrompt,
      });
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      scenes,
      enhancedPrompt: inputData.enhancedPrompt,
      promptContext: inputData.promptContext,
    };
  },
});

const generateVideoClipsStep = createStep({
  id: "generate-video-clips",
  description: "Generate video clips from scene images with avatar reference",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    scenes: z.array(
      z.object({
        url: z.string(),
        description: z.string(),
        scenePrompt: z.string(),
      }),
    ),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const contextData = inputData.promptContext as {
      platform: string;
      avatarReferenceImageUrl?: string;
    };

    const videoUrls = await getProviders().video.generate(
      inputData.scenes.map((s) => ({ url: s.url, description: s.description })),
      inputData.prompt,
      contextData.avatarReferenceImageUrl,
    );

    for (const videoUrl of videoUrls) {
      await db.insert(mediaAssets).values({
        userId: inputData.userId,
        contentId: inputData.contentId,
        type: "video",
        url: videoUrl,
        provider: process.env.AI_VIDEO_PROVIDER ?? "dashscope",
        metadata: {
          prompt: inputData.prompt,
          hasAvatar: !!contextData.avatarReferenceImageUrl,
        },
      });
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      videoUrls,
    };
  },
});

const saveVideoVersionStep = createStep({
  id: "save-video-version",
  description: "Save generated video as a content version",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    videoUrls: z.array(z.string()),
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
        outputUrl: inputData.videoUrls[0] ?? null,
        metadata: { type: "video", videoUrls: inputData.videoUrls },
      })
      .returning();

    await db
      .update(contents)
      .set({ status: "ready" })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      versionId: version.id,
      videoUrls: inputData.videoUrls,
    };
  },
});

export const generateVideoWorkflow = createWorkflow({
  id: "generate-video-workflow",
  inputSchema: videoInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    videoUrls: z.array(z.string()),
  }),
})
  .then(enhanceVideoPromptStep)
  .then(generateVideoImagesStep)
  .then(generateVideoClipsStep)
  .then(saveVideoVersionStep);

generateVideoWorkflow.commit();