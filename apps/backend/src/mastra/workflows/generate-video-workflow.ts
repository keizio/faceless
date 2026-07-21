import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import {
  buildPromptContext,
  assembleFinalPrompt,
  assembleScenePrompt,
  renderBrandKitGuidance,
} from "../../lib/prompts/prompt-builder.js";
import { getNegativePrompt } from "../../lib/prompts/negative-prompts.js";
import { renderAvatarForText, renderNoAvatarGuidance, renderAvatarForVisual } from "../../lib/prompts/avatar-injector.js";
import { PLATFORM_STRATEGIES } from "../../lib/prompts/platform-strategies.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { insertMediaAsset } from "../../lib/media.js";
import { eq, max } from "drizzle-orm";
import type { Platform, ContentType, BrandKit } from "@faceless/shared";
import type { EnhancedPrompt, ArtStyle } from "../../lib/prompts/types.js";
import {
  renderChatTemplate,
  renderSplitScreenTemplate,
  renderListicleCardTemplate,
  renderPovOverlay,
} from "../../lib/compositing/renderer.js";
import { uploadFile, randomFilename } from "../../lib/storage.js";
import { applyWatermarkToBuffer } from "../../lib/compositing/watermark.js";
import { composeVideoWithAudio } from "../../lib/compositing/video-composer.js";
import { mastra } from "../../mastra/index.js";
import { parseJsonResponse } from "../../lib/prompts/parse-json.js";
import {
  renderAidaFramework,
  renderPasFramework,
  renderHeadlineFormula,
  renderCtaPattern,
  renderPersuasionPrinciple,
  renderToneByChannel,
} from "../../lib/prompts/copywriting-frameworks.js";
import type { CopywritingFramework, HeadlineFormula, CtaPattern } from "../../lib/prompts/types.js";
import { buildStoryBibleUserMessage, parseStoryBibleResponse } from "../../lib/prompts/story-bible.js";
import { buildContinuityCheckUserMessage, parseContinuityCheckResponse } from "../../lib/prompts/continuity-checker.js";
import { assembleContinuityPrompt } from "../../lib/prompts/continuity-prompt-builder.js";

const imageBufferCache = new Map<string, Buffer>();

async function downloadImageAsBuffer(url: string): Promise<Buffer> {
  const cached = imageBufferCache.get(url);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  imageBufferCache.set(url, buffer);
  return buffer;
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
    templateFramework: z.string().optional(),
    templateCtaPattern: z.string().optional(),
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
    avatarVisual: z.string().optional(),
    brandKitGuidance: z.string().optional(),
    brandKitJson: z.string().optional(),
    isFaceless: z.boolean(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
    templateSystemPrompt: z.string().optional(),
    templateVisualGuidance: z.string().optional(),
    templateNegativeAdditions: z.array(z.string()).optional(),
    templateScriptStructure: z.string().optional(),
    templateNarrationGuidance: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    templateFramework: z.string().optional(),
    templateCtaPattern: z.string().optional(),
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

    const isFaceless = !context.avatar;

    const agent = mastra.getAgent("promptEnhancer");

    const userMessage = `Create a visual storyboard for a ${inputData.sceneCount}-scene ${inputData.platform} video about: ${inputData.prompt}. Aspect ratio: ${inputData.aspectRatio}.

Include ${inputData.sceneCount} individual scene visual descriptions in a "scenePrompts" array.

Return ONLY valid JSON — no markdown, no code fences, no explanation.`;

    const response = await agent.generate(userMessage);
    const result = (response as { text: string }).text;

    let enhanced: EnhancedPrompt & { scenePrompts: string[] };
    try {
      const parsed = parseJsonResponse<{
        visualPrompt?: string;
        cameraDirection?: EnhancedPrompt["cameraDirection"];
        qualityTags?: string[];
        scenePrompts?: string[];
        artStyle?: ArtStyle;
      }>(result);
      enhanced = {
        visualPrompt: parsed.visualPrompt ?? inputData.prompt,
        cameraDirection: parsed.cameraDirection ?? {
          shotType: "establishing-shot",
          lighting: "cinematic",
        },
        qualityTags: parsed.qualityTags ?? [],
        negativePrompt: "",
        scenePrompts: parsed.scenePrompts ?? [],
        artStyle: parsed.artStyle,
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
        artStyle: undefined,
      };
    }

    const contextData = {
      platform: context.platform,
      hasAvatar: !!context.avatar,
      avatarName: context.avatar?.name,
      avatarReferenceImageUrl: context.avatar?.referenceImageUrl,
    };

    const brandKitGuidance = renderBrandKitGuidance(context.brandKit);
    const brandKitJson = context.brandKit ? JSON.stringify(context.brandKit) : undefined;

    const avatarVisual = context.avatar
      ? renderAvatarForVisual(context.avatar)
      : undefined;

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
      avatarVisual,
      brandKitGuidance,
      brandKitJson,
      isFaceless,
      enhancedPrompt: enhanced,
      promptContext: contextData,
      templateSystemPrompt: inputData.templateSystemPrompt,
      templateVisualGuidance: inputData.templateVisualGuidance,
      templateNegativeAdditions: inputData.templateNegativeAdditions,
      templateScriptStructure: inputData.templateScriptStructure,
      templateNarrationGuidance: inputData.templateNarrationGuidance,
      templateInputs: inputData.templateInputs,
      templateFramework: inputData.templateFramework,
      templateCtaPattern: inputData.templateCtaPattern,
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
    avatarVisual: z.string().optional(),
    avatarContext: z.string().optional(),
    brandKitGuidance: z.string().optional(),
    brandKitJson: z.string().optional(),
    isFaceless: z.boolean(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
    templateSystemPrompt: z.string().optional(),
    templateVisualGuidance: z.string().optional(),
    templateNegativeAdditions: z.array(z.string()).optional(),
    templateScriptStructure: z.string().optional(),
    templateNarrationGuidance: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    templateFramework: z.string().optional(),
    templateCtaPattern: z.string().optional(),
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
    avatarVisual: z.string().optional(),
    enhancedPrompt: z.any(),
    promptContext: z.any(),
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
    sceneNarrations: z.array(z.string()),
    brandKitJson: z.string().optional(),
templateInputs: z.record(z.unknown()).optional(),
    templateFramework: z.string().optional(),
    templateCtaPattern: z.string().optional(),
    templateId: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const strategy = PLATFORM_STRATEGIES[inputData.platform as Platform] ?? PLATFORM_STRATEGIES.generic;

    const isFaceless = inputData.isFaceless;
    const avatarContext = inputData.avatarContext ?? "";

    const agent = mastra.getAgent("scriptWriter");

    const platform = inputData.platform as Platform;
    const framework: CopywritingFramework = (inputData.templateFramework ?? "aida") as CopywritingFramework;
    const headline: HeadlineFormula = "curiosity-gap" as HeadlineFormula;
    const cta: CtaPattern = (inputData.templateCtaPattern ?? "low-friction") as CtaPattern;

    const sections: string[] = [
      `Create a ${inputData.sceneCount}-scene video script for ${inputData.platform} about: ${inputData.prompt}`,
      `Language: ${inputData.language}`,
    ];

    if (framework === "aida") sections.push(renderAidaFramework());
    else if (framework === "pas") sections.push(renderPasFramework());

    sections.push(renderHeadlineFormula(headline));
    sections.push(renderCtaPattern(cta));
    sections.push(renderPersuasionPrinciple("social-proof"));

    if (inputData.brandKitGuidance) {
      sections.push(``, `Brand identity:`, inputData.brandKitGuidance);
    }

    if (inputData.templateScriptStructure) {
      sections.push(``, `Script structure: ${inputData.templateScriptStructure}`);
    }

    if (inputData.templateNarrationGuidance) {
      sections.push(``, `Narration: ${inputData.templateNarrationGuidance}`);
    }

    sections.push(
      ``,
      `Include a "narration" field with the full voiceover text for the entire video.`,
      `Each scene in the "scenes" array must also include its own "narration" field with the voiceover text for that specific scene.`,
      `Output format (JSON):
{
  "hook": string (attention-grabbing opening),
  "body": string (main script content),
  "scenes": array of { "narration": string, "visual_description": string, "camera_direction": object },
  "cta": string (call to action),
  "caption": string (with hashtags, required),
  "narration": string (full voiceover text),
  "visual_prompt"?: string
}
Return ONLY valid JSON — no markdown, no code fences, no explanation.`,
    );

    const userMessage = sections.join("\n");

    const response = await agent.generate(userMessage);
    const scriptResult = (response as { text: string }).text;

    let script = scriptResult;
    let caption = "";
    let narrationText = "";
    let sceneNarrations: string[] = [];

    try {
      const parsed = parseJsonResponse<{
        hook?: string;
        body?: string;
        cta?: string;
        caption?: string;
        narration?: string;
        scenes?: { narration?: string; visual_description?: string; camera_direction?: unknown }[];
      }>(scriptResult);
      script = `${parsed.hook ?? ""}\n\n${parsed.body ?? ""}\n\n${parsed.cta ?? ""}`;
      caption = parsed.caption ?? "";
      narrationText = parsed.narration ?? script;

      const parsedScenes = parsed.scenes ?? [];
      sceneNarrations = parsedScenes
        .map((s) => s.narration ?? "")
        .filter((n) => n.length > 0);

      if (sceneNarrations.length === 0 && narrationText) {
        sceneNarrations = [narrationText];
      }
    } catch {
      script = scriptResult;
      narrationText = scriptResult;
      sceneNarrations = narrationText ? [narrationText] : [];
    }

    await db
      .update(contents)
      .set({
        script,
        caption,
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
      avatarVisual: inputData.avatarVisual,
      enhancedPrompt: inputData.enhancedPrompt,
      promptContext: inputData.promptContext,
      script,
      caption,
      narrationText,
      sceneNarrations,
      brandKitJson: inputData.brandKitJson,
      templateInputs: inputData.templateInputs,
      templateFramework: inputData.templateFramework,
      templateCtaPattern: inputData.templateCtaPattern,
      templateId: inputData.templateId,
    };
  },
});

const videoScriptOutputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  aspectRatio: z.string(),
  sceneCount: z.number(),
  platform: z.string(),
  language: z.string(),
  avatarId: z.string().optional(),
  avatarVisual: z.string().optional(),
  enhancedPrompt: z.any(),
  promptContext: z.any(),
  script: z.string(),
  caption: z.string(),
  narrationText: z.string(),
  sceneNarrations: z.array(z.string()),
  brandKitJson: z.string().optional(),
templateInputs: z.record(z.unknown()).optional(),
    templateFramework: z.string().optional(),
    templateCtaPattern: z.string().optional(),
    templateId: z.string().optional(),
  });

const MAX_REVIEW_RETRIES = 2;
const MIN_ACCEPTABLE_SCORE = 6;

const reviewVideoScriptStep = createStep({
  id: "review-video-script",
  description: "Review video script quality and regenerate if score is below threshold",
  inputSchema: videoScriptOutputSchema,
  outputSchema: videoScriptOutputSchema,
  execute: async ({ inputData }) => {
    const reviewerAgent = mastra.getAgent("qualityReviewer");
    const writerAgent = mastra.getAgent("scriptWriter");

    const reviewMessage = `Review this social media video content:

Platform: ${inputData.platform}
Scenes: ${inputData.sceneCount}

Script:
${inputData.script}

Caption:
${inputData.caption}

Narration:
${inputData.narrationText}

Return ONLY valid JSON — no markdown, no code fences, no explanation.`;

    let bestScript = inputData.script;
    let bestCaption = inputData.caption;
    let bestNarration = inputData.narrationText;
    let bestSceneNarrations = inputData.sceneNarrations;
    let bestScore = 0;
    let bestFeedback: string[] = [];

    for (let attempt = 0; attempt <= MAX_REVIEW_RETRIES; attempt++) {
      try {
        const reviewResponse = await reviewerAgent.generate(reviewMessage);
        const reviewText = (reviewResponse as { text: string }).text;
        const review = parseJsonResponse<{
          approved?: boolean;
          score?: number;
          improvements?: string[];
        }>(reviewText);

        const score = review.score ?? 0;
        const feedback = review.improvements ?? [];

        if (score > bestScore) {
          bestScore = score;
          bestFeedback = feedback;
        }

        if (score >= MIN_ACCEPTABLE_SCORE) {
          break;
        }

        if (attempt < MAX_REVIEW_RETRIES) {
          const regenSections: string[] = [
            `Rewrite a ${inputData.sceneCount}-scene video script for ${inputData.platform} about: ${inputData.prompt}`,
            `Language: ${inputData.language}`,
            `Improve on these points:`,
            ...feedback.map((f) => `- ${f}`),
            ``,
            `Include a "narration" field with the full voiceover text.`,
            `Each scene in the "scenes" array must also include its own "narration" field with the voiceover text for that specific scene.`,
            `Return ONLY valid JSON with "hook", "body", "scenes" (array with "narration" per scene), "cta", "caption", "narration" — no markdown, no code fences, no explanation.`,
          ];

          const regenResponse = await writerAgent.generate(regenSections.join("\n"));
          const regenText = (regenResponse as { text: string }).text;

          try {
            const parsed = parseJsonResponse<{
              hook?: string;
              body?: string;
              cta?: string;
              caption?: string;
              narration?: string;
              scenes?: { narration?: string }[];
            }>(regenText);
            bestScript = `${parsed.hook ?? ""}\n\n${parsed.body ?? ""}\n\n${parsed.cta ?? ""}`;
            bestCaption = parsed.caption ?? bestCaption;
            bestNarration = parsed.narration ?? bestNarration;

            const parsedScenes = parsed.scenes ?? [];
            const extracted = parsedScenes
              .map((s) => s.narration ?? "")
              .filter((n) => n.length > 0);
            if (extracted.length > 0) {
              bestSceneNarrations = extracted;
            } else if (bestNarration) {
              bestSceneNarrations = [bestNarration];
            }
          } catch {
            bestScript = regenText;
            bestNarration = regenText;
            bestSceneNarrations = regenText ? [regenText] : [];
          }
        }
      } catch (error) {
        console.error(`[review-video-script] Review attempt ${attempt + 1} failed:`, error);
        break;
      }
    }

    if (bestScript !== inputData.script || bestCaption !== inputData.caption) {
      await db
        .update(contents)
        .set({
          script: bestScript,
          caption: bestCaption,
          metadata: {
            enhancedPrompt: inputData.enhancedPrompt,
            hasAvatar: !!inputData.avatarId,
            platform: inputData.platform,
            reviewScore: bestScore,
            reviewFeedback: bestFeedback,
          },
        })
        .where(eq(contents.id, inputData.contentId));
    }

    return {
      ...inputData,
      script: bestScript,
      caption: bestCaption,
      narrationText: bestNarration,
      sceneNarrations: bestSceneNarrations,
      reviewScore: bestScore,
      reviewFeedback: bestFeedback,
    };
  },
});

const storyBibleExtendedSchema = videoScriptOutputSchema.extend({
  storyBible: z.any(),
});

const buildStoryBibleStep = createStep({
  id: "build-story-bible",
  description: "Extract narrative story bible from generated script for scene continuity",
  inputSchema: videoScriptOutputSchema,
  outputSchema: storyBibleExtendedSchema,
  execute: async ({ inputData }) => {
    const agent = mastra.getAgent("scriptWriter");
    const contextData = inputData.promptContext as {
      platform: string;
      hasAvatar: boolean;
      avatarName?: string;
      avatarReferenceImageUrl?: string;
    } | undefined;

    const isFaceless = !contextData?.hasAvatar;
    const avatarContext = contextData?.avatarName
      ? `Avatar: ${contextData.avatarName}`
      : "";

    const userMessage = buildStoryBibleUserMessage(
      inputData.script,
      inputData.prompt,
      inputData.sceneCount,
      inputData.platform,
      avatarContext,
      isFaceless,
    );

    const response = await agent.generate(userMessage);
    const text = (response as { text: string }).text;

    const storyBible = parseStoryBibleResponse(text, {
      topic: inputData.prompt,
      totalScenes: inputData.sceneCount,
    });

    await db
      .update(contents)
      .set({
        metadata: {
          storyBible,
          hasAvatar: !!inputData.avatarId,
          platform: inputData.platform,
        },
      })
      .where(eq(contents.id, inputData.contentId));

    return {
      ...inputData,
      storyBible,
    };
  },
});

const scenePromptsExtendedSchema = storyBibleExtendedSchema.extend({
  scenePrompts: z.array(z.string()),
});

const enhanceScenePromptsStep = createStep({
  id: "enhance-scene-prompts",
  description: "Enhance each scene prompt with story bible context for narrative continuity",
  inputSchema: storyBibleExtendedSchema,
  outputSchema: scenePromptsExtendedSchema,
  execute: async ({ inputData }) => {
    const storyBible = inputData.storyBible;
    const enhanced = inputData.enhancedPrompt as EnhancedPrompt & { scenePrompts: string[] };
    const contextData = inputData.promptContext as {
      platform: string;
      hasAvatar: boolean;
      avatarName?: string;
    } | undefined;

    const isFaceless = !contextData?.hasAvatar;
    const platform = (inputData.platform || contextData?.platform || "generic") as Platform;
    const avatarVisual = inputData.avatarVisual;

    const scenePrompts: string[] = [];
    const previousSceneSummaries: import("../../lib/prompts/story-bible.js").SceneSummary[] = [];

    for (let i = 0; i < inputData.sceneCount; i++) {
      const visualPrompt = enhanced.scenePrompts?.[i] ?? enhanced.visualPrompt;

      const scenePrompt = assembleContinuityPrompt(
        visualPrompt,
        storyBible,
        i,
        inputData.sceneCount,
        previousSceneSummaries,
        enhanced.cameraDirection,
        enhanced.qualityTags,
        platform,
        inputData.aspectRatio,
        true,
        isFaceless,
        avatarVisual,
        enhanced.artStyle,
      );

      scenePrompts.push(scenePrompt);

      const sceneSummary = storyBible.sceneSummaries?.[i];
      if (sceneSummary) {
        previousSceneSummaries.push(sceneSummary);
      }
    }

    return {
      ...inputData,
      scenePrompts,
    };
  },
});

const continuityCheckExtendedSchema = scenePromptsExtendedSchema.extend({
  continuityCheckedPrompts: z.array(z.string()),
});

const continuityCheckStep = createStep({
  id: "continuity-check",
  description: "Review all scene prompts for narrative continuity, visual variety, and duplicate prevention",
  inputSchema: scenePromptsExtendedSchema,
  outputSchema: continuityCheckExtendedSchema,
  execute: async ({ inputData }) => {
    const agent = mastra.getAgent("continuityChecker");
    const storyBible = inputData.storyBible;

    if (inputData.sceneCount <= 1) {
      return {
        ...inputData,
        continuityCheckedPrompts: inputData.scenePrompts,
      };
    }

    const userMessage = buildContinuityCheckUserMessage(
      inputData.scenePrompts,
      storyBible,
    );

    let checkedPrompts = inputData.scenePrompts;

    try {
      const response = await agent.generate(userMessage);
      const text = (response as { text: string }).text;
      const result = parseContinuityCheckResponse(text, inputData.scenePrompts);

      if (!result.passes && result.rewrittenPrompts) {
        checkedPrompts = result.rewrittenPrompts;
        console.log(
          `[continuity-check] ${result.issues.length} issues found, prompts rewritten`,
        );
      } else if (!result.passes) {
        console.warn(
          `[continuity-check] ${result.issues.length} issues found but no rewrites provided, using originals`,
        );
      }
    } catch (error) {
      console.error("[continuity-check] Failed, using original prompts", error);
    }

    return {
      ...inputData,
      continuityCheckedPrompts: checkedPrompts,
    };
  },
});

const generateVideoImagesStep = createStep({
  id: "generate-video-images",
  description: "Generate key frame images for video scenes with enhanced prompts",
  inputSchema: continuityCheckExtendedSchema,
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
    sceneNarrations: z.array(z.string()),
    brandKitJson: z.string().optional(),
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

    const continuityCheckedPrompts = inputData.continuityCheckedPrompts;
    const scenePrompts = continuityCheckedPrompts ?? enhanced.scenePrompts;

    const sceneResults = await Promise.all(
      Array.from({ length: inputData.sceneCount }, async (_, i) => {
        const scenePrompt = scenePrompts[i] ?? enhanced.visualPrompt;

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
            hasAvatar: contextData.hasAvatar,
          },
        });

        return {
          url: imageUrl,
          description: `Scene ${i + 1}`,
          scenePrompt,
        };
      }),
    );

    scenes.push(...sceneResults);

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
      sceneNarrations: inputData.sceneNarrations,
      brandKitJson: inputData.brandKitJson,
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
    sceneNarrations: z.array(z.string()),
    brandKitJson: z.string().optional(),
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
    sceneNarrations: z.array(z.string()),
    aspectRatio: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { templateId, templateInputs, scenes, aspectRatio } = inputData;

    let resultScenes = scenes;

    if (templateId && templateInputs && scenes.length > 0) {
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

        case "pov": {
          compositedScenes = [];
          for (const scene of scenes) {
            const bgBuffer = await downloadImageAsBuffer(scene.url);
            const buffer = await renderPovOverlay(templateInputs, aspectRatio, bgBuffer);
            const url = await uploadFile(buffer, randomFilename("png"), "image/png");
            compositedScenes.push({
              url,
              description: scene.description,
              scenePrompt: scene.scenePrompt,
            });
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
          compositedScenes = scenes;
          break;
      }

      resultScenes = compositedScenes;
    }

    let brandKit: BrandKit | undefined;
    try {
      if (inputData.brandKitJson) {
        brandKit = JSON.parse(inputData.brandKitJson) as BrandKit;
      }
    } catch {}

    if (brandKit?.logoUrl && resultScenes.length > 0) {
      resultScenes = await Promise.all(
        resultScenes.map(async (scene) => {
          const response = await fetch(scene.url);
          const buffer = Buffer.from(await response.arrayBuffer());
          const watermarked = await applyWatermarkToBuffer(buffer, brandKit.logoUrl!);
          const newUrl = await uploadFile(watermarked, randomFilename("png"), "image/png");
          return { ...scene, url: newUrl };
        }),
      );
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      scenes: resultScenes,
      enhancedPrompt: inputData.enhancedPrompt,
      promptContext: inputData.promptContext,
      script: inputData.script,
      caption: inputData.caption,
      narrationText: inputData.narrationText,
      sceneNarrations: inputData.sceneNarrations,
      aspectRatio,
    };
  },
});

const generateVoiceoverStep = createStep({
  id: "generate-voiceover",
  description: "Generate per-scene TTS voiceover audio from scene narrations",
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
    sceneNarrations: z.array(z.string()),
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
    sceneNarrations: z.array(z.string()),
    aspectRatio: z.string(),
    sceneAudios: z.array(z.object({ url: z.string(), durationMs: z.number() })).optional(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  execute: async ({ inputData }) => {
    const audioProvider = getProviders().audio;

    if (inputData.sceneNarrations.length > 0) {
      const results = await Promise.all(
        inputData.sceneNarrations.map(async (narration) => {
          try {
            const audioResult = await audioProvider.generate(narration);
            return { ok: true as const, narration, audioResult };
          } catch (error) {
            console.warn(`[generateVoiceoverStep] TTS failed for narration: ${(error as Error).message}`);
            return { ok: false as const, narration };
          }
        }),
      );

      const sceneAudios: { url: string; durationMs: number }[] = [];
      for (const result of results) {
        if (!result.ok) continue;
        sceneAudios.push({ url: result.audioResult.url, durationMs: result.audioResult.durationMs });

        await insertMediaAsset({
          userId: inputData.userId,
          contentId: inputData.contentId,
          type: "audio",
          url: result.audioResult.url,
          provider: "dashscope",
          metadata: {
            durationMs: result.audioResult.durationMs,
            source: "cosyvoice-tts",
            scene: sceneAudios.length,
          },
        });
      }

      return {
        ...inputData,
        sceneAudios: sceneAudios.length > 0 ? sceneAudios : undefined,
        audioUrl: undefined,
        audioDurationMs: undefined,
      };
    }

    if (!inputData.narrationText) {
      return {
        ...inputData,
        sceneAudios: undefined,
        audioUrl: undefined,
        audioDurationMs: undefined,
      };
    }

    try {
      const audioResult = await audioProvider.generate(inputData.narrationText);

      await insertMediaAsset({
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
        ...inputData,
        sceneAudios: undefined,
        audioUrl: audioResult.url,
        audioDurationMs: audioResult.durationMs,
      };
    } catch (error) {
      console.warn(`[generateVoiceoverStep] TTS failed: ${(error as Error).message}`);
      return {
        ...inputData,
        sceneAudios: undefined,
        audioUrl: undefined,
        audioDurationMs: undefined,
      };
    }
  },
});

const generateVideoClipsStep = createStep({
  id: "generate-video-clips",
  description: "Generate video clips from scene images with per-scene durations",
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
    sceneNarrations: z.array(z.string()),
    aspectRatio: z.string(),
    sceneAudios: z.array(z.object({ url: z.string(), durationMs: z.number() })).optional(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
    sceneAudios: z.array(z.object({ url: z.string(), durationMs: z.number() })).optional(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  execute: async ({ inputData }) => {
    const contextData = inputData.promptContext as {
      platform: string;
      avatarReferenceImageUrl?: string;
    };

    const durations = inputData.sceneAudios
      ? inputData.sceneAudios.map((a) => Math.ceil(a.durationMs / 1000))
      : undefined;

    const videoUrls = await getProviders().video.generate(
      inputData.scenes.map((s) => ({ url: s.url, description: s.description })),
      inputData.prompt,
      contextData.avatarReferenceImageUrl,
      undefined,
      { aspectRatio: inputData.aspectRatio, durations },
    );

    for (const videoUrl of videoUrls) {
      await insertMediaAsset({
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
      sceneAudios: inputData.sceneAudios,
      audioUrl: inputData.audioUrl,
      audioDurationMs: inputData.audioDurationMs,
    };
  },
});

const composeVideoAudioStep = createStep({
  id: "compose-video-audio",
  description: "Merge video clips and overlay voiceover audio per-scene",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    narrationText: z.string(),
    sceneAudios: z.array(z.object({ url: z.string(), durationMs: z.number() })).optional(),
    audioUrl: z.string().optional(),
    audioDurationMs: z.number().optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    audioUrl: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.videoUrls.length === 0) {
      throw new Error("No video URLs generated — cannot compose video with audio");
    }

    let compositedUrl: string;

    if (inputData.sceneAudios && inputData.sceneAudios.length > 0) {
      const sceneAudioUrls = inputData.sceneAudios.map((a) => a.url);
      compositedUrl = await composeVideoWithAudio(
        inputData.videoUrls,
        undefined,
        sceneAudioUrls,
      );
    } else {
      compositedUrl = await composeVideoWithAudio(
        inputData.videoUrls,
        inputData.audioUrl,
      );
    }

    const finalAudioUrl = inputData.sceneAudios?.[0]?.url ?? inputData.audioUrl;

    await insertMediaAsset({
      userId: inputData.userId,
      contentId: inputData.contentId,
      type: "video",
      url: compositedUrl,
      provider: "composite",
      metadata: {
        source: "video-composer",
        originalVideoCount: inputData.videoUrls.length,
        hasAudio: !!(finalAudioUrl),
        perScene: !!(inputData.sceneAudios && inputData.sceneAudios.length > 0),
      },
    });

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      videoUrls: [compositedUrl],
      script: inputData.script,
      caption: inputData.caption,
      audioUrl: finalAudioUrl,
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
    if (inputData.videoUrls.length === 0 || !inputData.videoUrls[0]) {
      throw new Error("No video URLs to save — video generation produced no output");
    }

    const [maxVersion] = await db
      .select({ versionNumber: max(contentVersions.versionNumber) })
      .from(contentVersions)
      .where(eq(contentVersions.contentId, inputData.contentId));

    const versionNumber = (maxVersion?.versionNumber ?? 0) + 1;

    const [version] = await db
      .insert(contentVersions)
      .values({
        contentId: inputData.contentId,
        versionNumber,
        outputUrl: inputData.videoUrls[0],
        thumbnailUrl: null,
        metadata: {
          type: "video",
          videoUrls: inputData.videoUrls,
          caption: inputData.caption,
          script: inputData.script,
          audioUrl: inputData.audioUrl,
        },
      })
      .returning();

    await db
      .update(contents)
      .set({ status: "ready", caption: inputData.caption })
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
  .then(reviewVideoScriptStep)
  .then(buildStoryBibleStep)
  .then(enhanceScenePromptsStep)
  .then(continuityCheckStep)
  .then(generateVideoImagesStep)
  .then(compositeVideoSceneStep)
  .then(generateVoiceoverStep)
  .then(generateVideoClipsStep)
  .then(composeVideoAudioStep)
  .then(saveVideoVersionStep);

generateVideoWorkflow.commit();