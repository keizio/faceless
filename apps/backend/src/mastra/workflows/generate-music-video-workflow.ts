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
import { composeVideoWithAudio } from "../../lib/compositing/video-composer.js";

const musicVideoInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  platform: z.string(),
  aspectRatio: z.string().default("9:16"),
  sceneCount: z.number().default(3),
  language: z.string().default("en"),
  moodOrGenre: z.string().default("cinematic"),
  visualStyle: z.string().default("cinematic"),
  audioSource: z.enum(["ai-generated", "upload"]).default("ai-generated"),
  audioFileUrl: z.string().optional(),
  audioDurationMs: z.number().optional(),
});

const generateOrUseAudioStep = createStep({
  id: "generate-or-use-audio",
  description: "Generate music via AI or use uploaded audio file",
  inputSchema: musicVideoInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    platform: z.string(),
    aspectRatio: z.string(),
    sceneCount: z.number(),
    language: z.string(),
    moodOrGenre: z.string(),
    visualStyle: z.string(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  execute: async ({ inputData }) => {
    let audioUrl: string | undefined;
    let audioDurationMs: number | undefined;

    if (inputData.audioSource === "upload" && inputData.audioFileUrl) {
      audioUrl = inputData.audioFileUrl;
      audioDurationMs = inputData.audioDurationMs ?? 30000;
    } else {
      try {
        const musicProvider = getProviders().music;
        const result = await musicProvider.generate(
          inputData.moodOrGenre || inputData.prompt,
          30,
        );
        audioUrl = result.url;
        audioDurationMs = result.durationMs;
      } catch (error) {
        console.warn(`[generateOrUseAudioStep] Music generation failed, continuing without audio: ${(error as Error).message}`);
      }
    }

    if (audioUrl) {
      await insertMediaAsset({
        userId: inputData.userId,
        contentId: inputData.contentId,
        type: "audio",
        url: audioUrl,
        provider: "dashscope-fun-music",
        metadata: {
          source: inputData.audioSource,
          moodOrGenre: inputData.moodOrGenre,
        },
      });
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      platform: inputData.platform,
      aspectRatio: inputData.aspectRatio,
      sceneCount: inputData.sceneCount,
      language: inputData.language,
      moodOrGenre: inputData.moodOrGenre,
      visualStyle: inputData.visualStyle,
      audioUrl,
      audioDurationMs,
    };
  },
});

const generateMusicStoryboardStep = createStep({
  id: "generate-music-storyboard",
  description: "Generate visual storyboard from mood/genre and music context",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    platform: z.string(),
    aspectRatio: z.string(),
    sceneCount: z.number(),
    language: z.string(),
    moodOrGenre: z.string(),
    visualStyle: z.string(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    platform: z.string(),
    aspectRatio: z.string(),
    sceneCount: z.number(),
    language: z.string(),
    moodOrGenre: z.string(),
    visualStyle: z.string(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
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

    const styleGuidance: Record<string, string> = {
      abstract: "Abstract geometric shapes, flowing colors, particle effects, surreal transformations",
      cinematic: "Cinematic wide shots, dramatic lighting, film grain, epic landscapes",
      anime: "Anime art style, vibrant colors, dynamic action, cel-shaded aesthetics",
      psychedelic: "Psychedelic patterns, kaleidoscope effects, neon colors, trippy visuals",
      nature: "Natural landscapes, organic textures, time-lapse elements, earth tones",
    };

    const systemPrompt = `You are a visual prompt engineer for music video generation. Create a storyboard for a ${inputData.sceneCount}-scene music video.

Mood/Genre: ${inputData.moodOrGenre}
Visual Style: ${inputData.visualStyle}
Style guidance: ${styleGuidance[inputData.visualStyle] ?? styleGuidance.cinematic}
Platform: ${inputData.platform}
Aspect Ratio: ${inputData.aspectRatio}

FACELESS MODE: NO human figures, NO faces. Focus on environments, abstract visuals, typography, and atmospheric scenes.

Output format: JSON with {
  "visualPrompt": string (overall visual theme and mood),
  "cameraDirection": { "shotType": string, "movement"?: string, "lighting": string, "composition"?: string, "style"?: string },
  "qualityTags": string[],
  "scenePrompts": string[] (${inputData.sceneCount} individual scene visual descriptions that match the music mood)
}`;

    const result = await textProvider.generate({
      system: systemPrompt,
      prompt: `Create a visual storyboard for a ${inputData.sceneCount}-scene music video with mood: ${inputData.moodOrGenre}. Visual style: ${inputData.visualStyle}.`,
      temperature: 0.8,
    });

    let enhanced: EnhancedPrompt & { scenePrompts: string[] };
    try {
      const parsed = JSON.parse(result);
      enhanced = {
        visualPrompt: parsed.visualPrompt ?? inputData.prompt,
        cameraDirection: {
          shotType: parsed.cameraDirection?.shotType ?? "wide-shot",
          lighting: parsed.cameraDirection?.lighting ?? "cinematic",
        },
        qualityTags: parsed.qualityTags ?? [],
        negativePrompt: "",
        scenePrompts: parsed.scenePrompts ?? [],
      };
    } catch {
      enhanced = {
        visualPrompt: inputData.prompt,
        cameraDirection: { shotType: "wide-shot", lighting: "cinematic" },
        qualityTags: [],
        negativePrompt: "",
        scenePrompts: [],
      };
    }

    const contextData = {
      platform: context.platform,
      hasAvatar: false,
    };

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      platform: inputData.platform,
      aspectRatio: inputData.aspectRatio,
      sceneCount: inputData.sceneCount,
      language: inputData.language,
      moodOrGenre: inputData.moodOrGenre,
      visualStyle: inputData.visualStyle,
      audioUrl: inputData.audioUrl,
      audioDurationMs: inputData.audioDurationMs,
      enhancedPrompt: enhanced,
      promptContext: contextData,
    };
  },
});

const generateMusicImagesStep = createStep({
  id: "generate-music-images",
  description: "Generate key frame images for music video scenes",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    platform: z.string(),
    aspectRatio: z.string(),
    sceneCount: z.number(),
    language: z.string(),
    moodOrGenre: z.string(),
    visualStyle: z.string(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    scenes: z.array(
      z.object({
        url: z.string(),
        description: z.string(),
      }),
    ),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
  }),
  execute: async ({ inputData }) => {
    const size = getImageSize(inputData.aspectRatio);
    const enhanced = inputData.enhancedPrompt as EnhancedPrompt & { scenePrompts: string[] };
    const contextData = inputData.promptContext as { platform: string };
    const scenes: { url: string; description: string }[] = [];

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
        language: inputData.language,
        sceneIndex: i,
        totalScenes: inputData.sceneCount,
      };

      const scenePrompt = assembleScenePrompt(
        sceneEnhanced,
        contextForScene,
        i,
        inputData.sceneCount,
        previousScenePrompt,
        true,
      );

      const negativePrompt = getNegativePrompt(contextData.platform as Platform);
      const imageUrl = await getProviders().image.generate(scenePrompt, size, undefined, { negativePrompt, qualityTags: enhanced.qualityTags });

      await insertMediaAsset({
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
        },
      });

      previousScenePrompt = scenePrompt;
      scenes.push({ url: imageUrl, description: `Scene ${i + 1}` });
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      scenes,
      audioUrl: inputData.audioUrl,
      audioDurationMs: inputData.audioDurationMs,
      enhancedPrompt: inputData.enhancedPrompt,
      promptContext: inputData.promptContext,
    };
  },
});

const generateMusicVideoClipsStep = createStep({
  id: "generate-music-video-clips",
  description: "Generate video clips from scene images",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    scenes: z.array(
      z.object({
        url: z.string(),
        description: z.string(),
      }),
    ),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  execute: async ({ inputData }) => {
    const storyboard = (inputData.enhancedPrompt as EnhancedPrompt).visualPrompt ?? "";
    const sceneImages = inputData.scenes.map((s) => ({
      url: s.url,
      description: s.description,
    }));

    const videoUrls = await getProviders().video.generate(
      sceneImages,
      storyboard,
      undefined,
      undefined,
    );

    for (const videoUrl of videoUrls) {
      await insertMediaAsset({
        userId: inputData.userId,
        contentId: inputData.contentId,
        type: "video",
        url: videoUrl,
        provider: process.env.AI_VIDEO_PROVIDER ?? "dashscope",
        metadata: { source: "music-video" },
      });
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      videoUrls,
      audioUrl: inputData.audioUrl,
      audioDurationMs: inputData.audioDurationMs,
    };
  },
});

const composeMusicVideoAudioStep = createStep({
  id: "compose-music-video-audio",
  description: "Merge video clips and overlay audio for music video",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData.audioUrl) {
      if (inputData.videoUrls.length <= 1) {
        return inputData;
      }
      const compositedUrl = await composeVideoWithAudio(
        inputData.videoUrls,
        undefined,
      );
      return {
        contentId: inputData.contentId,
        userId: inputData.userId,
        videoUrls: [compositedUrl],
        audioUrl: undefined,
        audioDurationMs: undefined,
      };
    }

    const compositedUrl = await composeVideoWithAudio(
      inputData.videoUrls,
      inputData.audioUrl,
    );

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      videoUrls: [compositedUrl],
      audioUrl: inputData.audioUrl,
      audioDurationMs: inputData.audioDurationMs,
    };
  },
});

const saveMusicVideoVersionStep = createStep({
  id: "save-music-video-version",
  description: "Save the music video version",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    videoUrls: z.array(z.string()),
    audioUrl: z.string().optional(),
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
        outputUrl: inputData.videoUrls[0] ?? null,
        thumbnailUrl: inputData.videoUrls[0] ?? null,
        metadata: {
          type: "music-video",
          videoUrls: inputData.videoUrls,
          audioUrl: inputData.audioUrl,
          audioDurationMs: inputData.audioDurationMs,
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
      videoUrls: inputData.videoUrls,
      audioUrl: inputData.audioUrl,
    };
  },
});

export const generateMusicVideoWorkflow = createWorkflow({
  id: "generate-music-video-workflow",
  inputSchema: musicVideoInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    videoUrls: z.array(z.string()),
    audioUrl: z.string().optional(),
  }),
})
  .then(generateOrUseAudioStep)
  .then(generateMusicStoryboardStep)
  .then(generateMusicImagesStep)
  .then(generateMusicVideoClipsStep)
  .then(composeMusicVideoAudioStep)
  .then(saveMusicVideoVersionStep);

generateMusicVideoWorkflow.commit();
