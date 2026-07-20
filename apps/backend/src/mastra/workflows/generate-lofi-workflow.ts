import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import {
  buildPromptContext,
  assembleScenePrompt,
} from "../../lib/prompts/prompt-builder.js";
import { getNegativePrompt } from "../../lib/prompts/negative-prompts.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { insertMediaAsset } from "../../lib/media.js";
import { eq, max } from "drizzle-orm";
import type { Platform, ContentType } from "@faceless/shared";
import type { EnhancedPrompt } from "../../lib/prompts/types.js";
import { loopVideoWithAudio } from "../../lib/compositing/video-composer.js";

const lofiInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  platform: z.string(),
  aspectRatio: z.string().default("9:16"),
  language: z.string().default("en"),
  moodOrGenre: z.string().default("chill lo-fi hip hop beats"),
  visualStyle: z.string().default("anime-room"),
  sceneDescription: z.string().optional(),
  duration: z.number().default(60),
});

const generateLoFiImageStep = createStep({
  id: "generate-lofi-image",
  description: "Generate a single lo-fi scene image",
  inputSchema: lofiInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    platform: z.string(),
    aspectRatio: z.string(),
    language: z.string(),
    moodOrGenre: z.string(),
    visualStyle: z.string(),
    sceneDescription: z.string().optional(),
    duration: z.number(),
    imageUrl: z.string(),
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

    const size = getImageSize(inputData.aspectRatio);

    const systemPrompt = `You are a lo-fi music video scene creator. Generate a single, atmospheric scene image.

Mood/Genre: ${inputData.moodOrGenre}
Visual Style: ${inputData.visualStyle}
${inputData.sceneDescription ? `Custom Scene: ${inputData.sceneDescription}` : ""}
Aspect Ratio: ${inputData.aspectRatio}

FACELESS MODE: NO human figures, NO faces. Focus on atmospheric environments, cozy interiors, or abstract visuals.
The scene should feel warm, calm, and suitable for a looping lo-fi music video.
Leave space for the overall composition — no text or overlays.`;

    const textProvider = getProviders().text;
    const result = await textProvider.generate({
      system: systemPrompt,
      prompt: `Create a visual description for a single lo-fi scene image. Mood: ${inputData.moodOrGenre}. Style: ${inputData.visualStyle}.`,
      temperature: 0.8,
    });

    let enhanced: EnhancedPrompt;
    try {
      const parsed = JSON.parse(result);
      enhanced = {
        visualPrompt: parsed.visualPrompt ?? inputData.prompt,
        cameraDirection: {
          shotType: parsed.cameraDirection?.shotType ?? "wide-shot",
          lighting: parsed.cameraDirection?.lighting ?? "golden-hour",
        },
        qualityTags: parsed.qualityTags ?? [],
        negativePrompt: parsed.negativePrompt ?? "",
      };
    } catch {
      enhanced = {
        visualPrompt: inputData.prompt,
        cameraDirection: { shotType: "wide-shot", lighting: "golden-hour" },
        qualityTags: [],
        negativePrompt: "",
      };
    }

    const negativePrompt = getNegativePrompt(inputData.platform as Platform);

    const scenePrompt = assembleScenePrompt(
      enhanced,
      {
        userPrompt: inputData.prompt,
        contentType: "video" as ContentType,
        platform: inputData.platform as Platform,
        aspectRatio: inputData.aspectRatio,
        language: inputData.language,
        sceneIndex: 0,
        totalScenes: 1,
      },
      0,
      1,
      undefined,
      true,
    );

    const imageUrl = await getProviders().image.generate(
      scenePrompt,
      size,
      undefined,
      { negativePrompt },
    );

    await insertMediaAsset({
      userId: inputData.userId,
      contentId: inputData.contentId,
      type: "image",
      url: imageUrl,
      provider: process.env.AI_IMAGE_PROVIDER ?? "dashscope",
      metadata: {
        prompt: scenePrompt,
        size,
        type: "lofi-scene",
      },
    });

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      platform: inputData.platform,
      aspectRatio: inputData.aspectRatio,
      language: inputData.language,
      moodOrGenre: inputData.moodOrGenre,
      visualStyle: inputData.visualStyle,
      sceneDescription: inputData.sceneDescription,
      duration: inputData.duration,
      imageUrl,
    };
  },
});

const generateLoFiMusicStep = createStep({
  id: "generate-lofi-music",
  description: "Generate lo-fi music via DashScope Fun-Music",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    platform: z.string(),
    aspectRatio: z.string(),
    language: z.string(),
    moodOrGenre: z.string(),
    visualStyle: z.string(),
    sceneDescription: z.string().optional(),
    duration: z.number(),
    imageUrl: z.string(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    platform: z.string(),
    aspectRatio: z.string(),
    language: z.string(),
    moodOrGenre: z.string(),
    visualStyle: z.string(),
    sceneDescription: z.string().optional(),
    duration: z.number(),
    imageUrl: z.string(),
    audioUrl: z.string(),
    audioDurationMs: z.number(),
  }),
  execute: async ({ inputData }) => {
    const musicProvider = getProviders().music;
    const result = await musicProvider.generate(
      inputData.moodOrGenre || inputData.prompt,
      30,
    );

    await insertMediaAsset({
      userId: inputData.userId,
      contentId: inputData.contentId,
      type: "audio",
      url: result.url,
      provider: "dashscope-fun-music",
      metadata: {
        source: "ai-generated",
        moodOrGenre: inputData.moodOrGenre,
        type: "lofi-music",
      },
    });

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      platform: inputData.platform,
      aspectRatio: inputData.aspectRatio,
      language: inputData.language,
      moodOrGenre: inputData.moodOrGenre,
      visualStyle: inputData.visualStyle,
      sceneDescription: inputData.sceneDescription,
      duration: inputData.duration,
      imageUrl: inputData.imageUrl,
      audioUrl: result.url,
      audioDurationMs: result.durationMs,
    };
  },
});

const generateLoFiVideoStep = createStep({
  id: "generate-lofi-video",
  description: "Generate a short looping video from the scene image",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    platform: z.string(),
    aspectRatio: z.string(),
    language: z.string(),
    moodOrGenre: z.string(),
    visualStyle: z.string(),
    sceneDescription: z.string().optional(),
    duration: z.number(),
    imageUrl: z.string(),
    audioUrl: z.string(),
    audioDurationMs: z.number(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrl: z.string(),
    audioUrl: z.string(),
    audioDurationMs: z.number(),
    duration: z.number(),
  }),
  execute: async ({ inputData }) => {
    const sceneImages = [{ url: inputData.imageUrl, description: "Lo-fi scene" }];
    const storyboard = `${inputData.moodOrGenre} lo-fi music video scene, subtle gentle motion, slow atmospheric movement`;

    const videoUrls = await getProviders().video.generate(
      sceneImages,
      storyboard,
      undefined,
      undefined,
    );

    const videoUrl = videoUrls[0];

    if (!videoUrl) {
      throw new Error("Lo-fi video generation failed: no video URL returned");
    }

    await insertMediaAsset({
      userId: inputData.userId,
      contentId: inputData.contentId,
      type: "video",
      url: videoUrl,
      provider: process.env.AI_VIDEO_PROVIDER ?? "dashscope",
      metadata: { source: "lofi-music" },
    });

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      videoUrl,
      audioUrl: inputData.audioUrl,
      audioDurationMs: inputData.audioDurationMs,
      duration: inputData.duration,
    };
  },
});

const loopAndCompositeLofiStep = createStep({
  id: "loop-and-composite-lofi",
  description: "Loop video and audio to fill target duration, then composite",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrl: z.string(),
    audioUrl: z.string(),
    audioDurationMs: z.number(),
    duration: z.number(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    finalVideoUrl: z.string(),
  }),
  execute: async ({ inputData }) => {
    const finalVideoUrl = await loopVideoWithAudio(
      inputData.videoUrl,
      inputData.audioUrl,
      inputData.duration,
    );

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      finalVideoUrl,
    };
  },
});

const saveLoFiVersionStep = createStep({
  id: "save-lofi-version",
  description: "Save the lo-fi music video version",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    finalVideoUrl: z.string(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    finalVideoUrl: z.string(),
  }),
  execute: async ({ inputData }) => {
    const [maxVersion] = await db
      .select({ versionNumber: max(contentVersions.versionNumber) })
      .from(contentVersions)
      .where(eq(contentVersions.contentId, inputData.contentId));

    const nextVersion = (maxVersion?.versionNumber ?? 0) + 1;

    const [version] = await db
      .insert(contentVersions)
      .values({
        contentId: inputData.contentId,
        versionNumber: nextVersion,
        outputUrl: inputData.finalVideoUrl,
        thumbnailUrl: inputData.finalVideoUrl,
        metadata: {
          type: "lofi-music",
          finalVideoUrl: inputData.finalVideoUrl,
        },
      })
      .returning();

    await db
      .update(contents)
      .set({ status: "ready" })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      versionId: version.id,
      finalVideoUrl: inputData.finalVideoUrl,
    };
  },
});

export const generateLoFiWorkflow = createWorkflow({
  id: "generateLoFiWorkflow",
  inputSchema: lofiInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    finalVideoUrl: z.string(),
  }),
})
  .then(generateLoFiImageStep)
  .then(generateLoFiMusicStep)
  .then(generateLoFiVideoStep)
  .then(loopAndCompositeLofiStep)
  .then(saveLoFiVersionStep);

generateLoFiWorkflow.commit();