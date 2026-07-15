import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import {
  buildPromptContext,
  assembleFinalPrompt,
  assembleScenePrompt,
} from "../../lib/prompts/prompt-builder.js";
import { getNegativePrompt } from "../../lib/prompts/negative-prompts.js";
import { renderAvatarForText, renderNoAvatarGuidance } from "../../lib/prompts/avatar-injector.js";
import { PLATFORM_STRATEGIES } from "../../lib/prompts/platform-strategies.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type { Platform, ContentType } from "@faceless/shared";
import type { EnhancedPrompt } from "../../lib/prompts/types.js";
import {
  renderChatTemplate,
  renderSplitScreenTemplate,
  renderListicleCardTemplate,
} from "../../lib/compositing/renderer.js";
import { uploadFile, randomFilename } from "../../lib/storage.js";

async function downloadImageAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const videoInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  platform: z.string(),
  aspectRatio: z.string().default("9:16"),
  sceneCount: z.number().default(3),
  language: z.string().default("en"),
  avatarId: z.string().optional(),
  templateSystemPrompt: z.string().optional(),
  templateVisualGuidance: z.string().optional(),
  templateNegativeAdditions: z.array(z.string()).optional(),
  templateScriptStructure: z.string().optional(),
  templateNarrationGuidance: z.string().optional(),
  templateInputs: z.record(z.unknown()).optional(),
  templateId: z.string().optional(),
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
    language: z.string(),
    avatarId: z.string().optional(),
    avatarContext: z.string().optional(),
    isFaceless: z.boolean(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
    templateSystemPrompt: z.string().optional(),
    templateVisualGuidance: z.string().optional(),
    templateNegativeAdditions: z.array(z.string()).optional(),
    templateScriptStructure: z.string().optional(),
    templateNarrationGuidance: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    templateId: z.string().optional(),
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

    const baseSystemPrompt = `You are a visual prompt engineer for video generation. Create a storyboard-level visual prompt for a ${inputData.sceneCount}-scene video.

Platform: ${inputData.platform}
${isFaceless ? "FACELESS MODE: NO human figures, NO faces. Focus on environments, objects, text overlays, and abstract visuals." : `AVATAR MODE: Character: ${context.avatar!.name}, ${context.avatar!.age ?? ""} years old, ${context.avatar!.gender ?? ""}, style: ${context.avatar!.speechStyle ?? "neutral"}.`}

Output format: JSON with {
  "visualPrompt": string (overall storyboard visual description),
  "cameraDirection": { "shotType": string, "movement"?: string, "lighting": string, "composition"?: string, "style"?: string },
  "qualityTags": string[],
  "scenePrompts": string[] (${inputData.sceneCount} individual scene visual descriptions)
}`;

    const systemPrompt = inputData.templateSystemPrompt
      ? `${inputData.templateSystemPrompt}\n\n${inputData.templateVisualGuidance ? `Visual guidance: ${inputData.templateVisualGuidance}` : ""}\n\nPlatform: ${inputData.platform}\n${isFaceless ? "FACELESS MODE: NO human figures, NO faces." : `AVATAR MODE: Character: ${context.avatar!.name}.`}\n\nOutput format: JSON with {\n  "visualPrompt": string (overall storyboard visual description),\n  "cameraDirection": { "shotType": string, "movement"?: string, "lighting": string, "composition"?: string, "style"?: string },\n  "qualityTags": string[],\n  "scenePrompts": string[] (${inputData.sceneCount} individual scene visual descriptions)\n}`
      : baseSystemPrompt;

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
      language: inputData.language,
      avatarId: inputData.avatarId,
      avatarContext: isFaceless ? renderNoAvatarGuidance() : renderAvatarForText(context.avatar!),
      isFaceless,
      enhancedPrompt: enhanced,
      promptContext: contextData,
      templateSystemPrompt: inputData.templateSystemPrompt,
      templateVisualGuidance: inputData.templateVisualGuidance,
      templateNegativeAdditions: inputData.templateNegativeAdditions,
      templateScriptStructure: inputData.templateScriptStructure,
      templateNarrationGuidance: inputData.templateNarrationGuidance,
      templateInputs: inputData.templateInputs,
      templateId: inputData.templateId,
    };
  },
});

const generateVideoScriptStep = createStep({
  id: "generate-video-script",
  description: "Generate script, caption, and narration text for the video",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    aspectRatio: z.string(),
    sceneCount: z.number(),
    platform: z.string(),
    language: z.string(),
    avatarId: z.string().optional(),
    avatarContext: z.string().optional(),
    isFaceless: z.boolean(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
    templateSystemPrompt: z.string().optional(),
    templateVisualGuidance: z.string().optional(),
    templateNegativeAdditions: z.array(z.string()).optional(),
    templateScriptStructure: z.string().optional(),
    templateNarrationGuidance: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    templateId: z.string().optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    aspectRatio: z.string(),
    sceneCount: z.number(),
    platform: z.string(),
    language: z.string(),
    avatarId: z.string().optional(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
    templateInputs: z.record(z.unknown()).optional(),
    templateId: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const textProvider = getProviders().text;
    const strategy = PLATFORM_STRATEGIES[inputData.platform as Platform] ?? PLATFORM_STRATEGIES.generic;

    const isFaceless = inputData.isFaceless;
    const avatarContext = inputData.avatarContext ?? "";

    const baseSystemPrompt = `You are a professional script writer for faceless social media videos.
Generate an engaging script for a ${inputData.sceneCount}-scene video on ${inputData.platform}.
The script should hook the viewer in the first 3 seconds.

Platform: ${inputData.platform}
${strategy.visualStyleGuidance}

${isFaceless ? "FACELESS MODE: No human figures or faces. Focus on environment, objects, typography, and abstract visuals." : `AVATAR MODE: Write in this character's voice:\n${avatarContext}`}

Language: ${inputData.language}

Output format: JSON with "hook", "body", "cta", "caption" (with hashtags), and "narration" (full voiceover text for the entire video).

CRITICAL: Never include fake social media statistics, follower counts, like counts, or social media account handles (@username, @handle) in the caption or script. Never include scene numbering in the visual description.`;

    const systemPrompt = inputData.templateSystemPrompt
      ? `${inputData.templateSystemPrompt}\n\n${inputData.templateScriptStructure ? `Script structure: ${inputData.templateScriptStructure}` : ""}\n\n${inputData.templateNarrationGuidance ? `Narration: ${inputData.templateNarrationGuidance}` : ""}\n\nLanguage: ${inputData.language}\n\nOutput format: JSON with "hook", "body", "cta", "caption" (with hashtags), and "narration" (full voiceover text for the entire video).\n\nCRITICAL: Never include fake social media statistics, follower counts, like counts, or social media account handles (@username, @handle) in the caption or script. Never include scene numbering in the visual description.`
      : baseSystemPrompt;

    const scriptResult = await textProvider.generate({
      system: systemPrompt,
      prompt: `Create a ${inputData.sceneCount}-scene video script for ${inputData.platform} about: ${inputData.prompt}`,
      temperature: 0.8,
    });

    let script = scriptResult;
    let caption = "";
    let narrationText = "";

    try {
      const parsed = JSON.parse(scriptResult);
      script = `${parsed.hook}\n\n${parsed.body}\n\n${parsed.cta}`;
      caption = parsed.caption ?? "";
      narrationText = parsed.narration ?? script;
    } catch {
      script = scriptResult;
      narrationText = scriptResult;
    }

    await db
      .update(contents)
      .set({
        script,
        metadata: {
          enhancedPrompt: inputData.enhancedPrompt,
          hasAvatar: !!inputData.avatarId,
          platform: inputData.platform,
        },
      })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      aspectRatio: inputData.aspectRatio,
      sceneCount: inputData.sceneCount,
      platform: inputData.platform,
      language: inputData.language,
      avatarId: inputData.avatarId,
      enhancedPrompt: inputData.enhancedPrompt,
      promptContext: inputData.promptContext,
      script,
      caption,
      narrationText,
      templateInputs: inputData.templateInputs,
      templateId: inputData.templateId,
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
    language: z.string(),
    avatarId: z.string().optional(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
    templateInputs: z.record(z.unknown()).optional(),
    templateId: z.string().optional(),
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
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
    templateInputs: z.record(z.unknown()).optional(),
    templateId: z.string().optional(),
    aspectRatio: z.string(),
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
      script: inputData.script,
      caption: inputData.caption,
      narrationText: inputData.narrationText,
      templateInputs: inputData.templateInputs,
      templateId: inputData.templateId,
      aspectRatio: inputData.aspectRatio,
    };
  },
});

const compositeVideoSceneStep = createStep({
  id: "composite-video-scene",
  description: "Composite template overlays onto video scene images",
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
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
    templateInputs: z.record(z.unknown()).optional(),
    templateId: z.string().optional(),
    aspectRatio: z.string(),
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
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
    aspectRatio: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { templateId, templateInputs, scenes, aspectRatio } = inputData;

    if (!templateId || !templateInputs || scenes.length === 0) {
return {
          contentId: inputData.contentId,
          userId: inputData.userId,
          prompt: inputData.prompt,
          scenes,
          enhancedPrompt: inputData.enhancedPrompt,
          promptContext: inputData.promptContext,
          script: inputData.script,
          caption: inputData.caption,
          narrationText: inputData.narrationText,
          aspectRatio,
        };
      }

    let compositedScenes: { url: string; description: string; scenePrompt: string }[];

    switch (templateId) {
      case "fake-chat": {
        const buffer = await renderChatTemplate(templateInputs, aspectRatio);
        const url = await uploadFile(buffer, randomFilename("png"), "image/png");
        compositedScenes = scenes.map((s) => ({
          ...s,
          url,
        }));
        break;
      }

      case "split-screen": {
        if (scenes.length < 2) {
          const singleBuffer = await downloadImageAsBuffer(scenes[0].url);
          const buffer = await renderSplitScreenTemplate(templateInputs, aspectRatio, singleBuffer, singleBuffer);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedScenes = scenes.map((s) => ({ ...s, url }));
        } else {
          const leftBuffer = await downloadImageAsBuffer(scenes[0].url);
          const rightBuffer = await downloadImageAsBuffer(scenes[1].url);
          const buffer = await renderSplitScreenTemplate(templateInputs, aspectRatio, leftBuffer, rightBuffer);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedScenes = scenes.map((s) => ({
            ...s,
            url,
          }));
        }
        break;
      }

      case "listicle": {
        const items = (templateInputs.items as string[]) ?? [];
        const itemCount = (templateInputs.itemCount as number) ?? (items.length || scenes.length);
        const topic = (templateInputs.topic as string) ?? "";
        compositedScenes = [];

        for (let i = 0; i < scenes.length; i++) {
          const itemTitle = items[i] ?? `Item ${i + 1}`;
          const itemDescription = `Description for ${itemTitle}`;
          const bgBuffer = await downloadImageAsBuffer(scenes[i].url);
          const buffer = await renderListicleCardTemplate(
            templateInputs,
            aspectRatio,
            i + 1,
            itemTitle,
            itemDescription,
            itemCount,
            bgBuffer,
          );
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedScenes.push({
            url,
            description: scenes[i].description,
            scenePrompt: scenes[i].scenePrompt,
          });
        }
        break;
      }

      default:
        return {
          contentId: inputData.contentId,
          userId: inputData.userId,
          prompt: inputData.prompt,
          scenes,
          enhancedPrompt: inputData.enhancedPrompt,
          promptContext: inputData.promptContext,
          script: inputData.script,
          caption: inputData.caption,
          narrationText: inputData.narrationText,
          aspectRatio,
        };
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      scenes: compositedScenes,
      enhancedPrompt: inputData.enhancedPrompt,
      promptContext: inputData.promptContext,
      script: inputData.script,
      caption: inputData.caption,
      narrationText: inputData.narrationText,
      aspectRatio,
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
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
    aspectRatio: z.string(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
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
      undefined,
      { aspectRatio: inputData.aspectRatio },
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
      script: inputData.script,
      caption: inputData.caption,
      narrationText: inputData.narrationText,
    };
  },
});

const generateVoiceoverStep = createStep({
  id: "generate-voiceover",
  description: "Generate TTS voiceover audio from the video script narration",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData.narrationText) {
      return {
        contentId: inputData.contentId,
        userId: inputData.userId,
        videoUrls: inputData.videoUrls,
        script: inputData.script,
        caption: inputData.caption,
        audioUrl: undefined,
        audioDurationMs: undefined,
      };
    }

    const audioProvider = getProviders().audio;
    const audioResult = await audioProvider.generate(inputData.narrationText);

    await db.insert(mediaAssets).values({
      userId: inputData.userId,
      contentId: inputData.contentId,
      type: "audio",
      url: audioResult.url,
      provider: "dashscope",
      metadata: {
        durationMs: audioResult.durationMs,
        source: "cosyvoice-tts",
      },
    });

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      videoUrls: inputData.videoUrls,
      script: inputData.script,
      caption: inputData.caption,
      audioUrl: audioResult.url,
      audioDurationMs: audioResult.durationMs,
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
    script: z.string(),
    caption: z.string(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    videoUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    audioUrl: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const existingVersions = await db.query.contentVersions.findMany({
      where: eq(contentVersions.contentId, inputData.contentId),
      columns: { versionNumber: true },
    });

    const versionNumber = existingVersions.length > 0
      ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
      : 1;

    const [version] = await db
      .insert(contentVersions)
      .values({
        contentId: inputData.contentId,
        versionNumber,
        outputUrl: inputData.videoUrls[0] ?? null,
        thumbnailUrl: null,
        metadata: {
          type: "video",
          videoUrls: inputData.videoUrls,
          caption: inputData.caption,
          script: inputData.script,
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
      script: inputData.script,
      caption: inputData.caption,
      audioUrl: inputData.audioUrl,
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
    script: z.string(),
    caption: z.string(),
    audioUrl: z.string().optional(),
  }),
})
  .then(enhanceVideoPromptStep)
  .then(generateVideoScriptStep)
  .then(generateVideoImagesStep)
  .then(compositeVideoSceneStep)
  .then(generateVideoClipsStep)
  .then(generateVoiceoverStep)
  .then(saveVideoVersionStep);

generateVideoWorkflow.commit();