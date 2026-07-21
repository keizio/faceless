import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import { buildPromptContext, assembleFinalPrompt, renderBrandKitGuidance } from "../../lib/prompts/prompt-builder.js";
import { getNegativePrompt } from "../../lib/prompts/negative-prompts.js";
import { renderAvatarForText, renderNoAvatarGuidance } from "../../lib/prompts/avatar-injector.js";
import { cameraDirectionForPlatform } from "../../lib/prompts/camera-dsl.js";
import { PLATFORM_STRATEGIES } from "../../lib/prompts/platform-strategies.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { insertMediaAsset } from "../../lib/media.js";
import { eq, max } from "drizzle-orm";
import type { Platform, ContentType, BrandKit, TextLayer } from "@faceless/shared";
import type { EnhancedPrompt, ArtStyle } from "../../lib/prompts/types.js";
import {
  renderChatTemplate,
  renderSplitScreenTemplate,
} from "../../lib/compositing/renderer.js";
import {
  templateOverlayToTextLayers,
  TEMPLATE_LAYER_DESCRIPTIONS,
  mergeStylesIntoTextLayers,
} from "../../lib/compositing/overlay-to-layers.js";
import type { TextLayerFormatting } from "../../lib/compositing/overlay-to-layers.js";
import { uploadFile, randomFilename } from "../../lib/storage.js";
import { applyWatermarkToBuffer } from "../../lib/compositing/watermark.js";
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
import { assembleContinuityPrompt, buildSlideStoryboardUserMessage, parseSlideStoryboardResponse } from "../../lib/prompts/continuity-prompt-builder.js";

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

const contentInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  contentType: z.enum(["image", "slide", "video", "text"]),
  platform: z.string(),
  prompt: z.string(),
  language: z.string().default("en"),
  avatarId: z.string().optional(),
  slideCount: z.number().int().min(1).max(10).optional().default(3),
  aspectRatio: z.string().default("16:9"),
  templateSystemPrompt: z.string().optional(),
  templateVisualGuidance: z.string().optional(),
  templateNegativeAdditions: z.array(z.string()).optional(),
  templateScriptStructure: z.string().optional(),
  templateNarrationGuidance: z.string().optional(),
  templateId: z.string().optional(),
  templateInputs: z.record(z.unknown()).optional(),
  templateFramework: z.string().optional(),
  templateCtaPattern: z.string().optional(),
});

const buildPromptContextStep = createStep({
  id: "build-prompt-context",
  description: "Fetch avatar and build prompt context",
  inputSchema: contentInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
    platform: z.string(),
    prompt: z.string(),
    language: z.string(),
    avatarContext: z.string().optional(),
    brandKitGuidance: z.string().optional(),
    brandKitJson: z.string().optional(),
    platformGuidance: z.string(),
    slideCount: z.number().optional(),
    aspectRatio: z.string(),
    templateSystemPrompt: z.string().optional(),
    templateVisualGuidance: z.string().optional(),
    templateNegativeAdditions: z.array(z.string()).optional(),
    templateScriptStructure: z.string().optional(),
    templateNarrationGuidance: z.string().optional(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    templateFramework: z.string().optional(),
    templateCtaPattern: z.string().optional(),
    isFaceless: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const context = await buildPromptContext(
      inputData.contentId,
      inputData.prompt,
      inputData.platform as Platform,
      inputData.contentType as ContentType,
      inputData.language,
      inputData.aspectRatio,
    );

    const isFaceless = !context.avatar;

    const strategy = PLATFORM_STRATEGIES[inputData.platform as Platform] ?? PLATFORM_STRATEGIES.generic;

    let avatarContext = "";
    if (context.avatar) {
      avatarContext = renderAvatarForText(context.avatar);
    } else {
      avatarContext = renderNoAvatarGuidance();
    }

    const brandKitGuidance = renderBrandKitGuidance(context.brandKit);
    const brandKitJson = context.brandKit ? JSON.stringify(context.brandKit) : undefined;

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      contentType: inputData.contentType,
      platform: inputData.platform,
      prompt: inputData.prompt,
      language: inputData.language,
      avatarContext,
      brandKitGuidance,
      brandKitJson,
      platformGuidance: strategy.visualStyleGuidance,
      slideCount: inputData.slideCount,
      aspectRatio: inputData.aspectRatio,
      isFaceless,
      templateSystemPrompt: inputData.templateSystemPrompt,
      templateVisualGuidance: inputData.templateVisualGuidance,
      templateNegativeAdditions: inputData.templateNegativeAdditions,
      templateScriptStructure: inputData.templateScriptStructure,
      templateNarrationGuidance: inputData.templateNarrationGuidance,
      templateId: inputData.templateId,
      templateInputs: inputData.templateInputs,
    };
  },
});

const scriptOutputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  contentType: z.enum(["image", "slide", "video", "text"]),
  platform: z.string(),
  prompt: z.string(),
  language: z.string(),
  script: z.string(),
  caption: z.string(),
  enhancedPrompt: z.string().optional(),
  artStyle: z.string().optional(),
  brandKitJson: z.string().optional(),
  avatarContext: z.string().optional(),
  isFaceless: z.boolean(),
  slideCount: z.number().optional(),
  aspectRatio: z.string(),
templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    templateFramework: z.string().optional(),
    templateCtaPattern: z.string().optional(),
    reviewScore: z.number().optional(),
    reviewFeedback: z.array(z.string()).optional(),
  });

const scriptInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  contentType: z.enum(["image", "slide", "video", "text"]),
  platform: z.string(),
  prompt: z.string(),
  language: z.string(),
  avatarContext: z.string().optional(),
  brandKitGuidance: z.string().optional(),
  brandKitJson: z.string().optional(),
  platformGuidance: z.string(),
  slideCount: z.number().optional(),
  aspectRatio: z.string(),
  templateSystemPrompt: z.string().optional(),
  templateVisualGuidance: z.string().optional(),
  templateNegativeAdditions: z.array(z.string()).optional(),
  templateScriptStructure: z.string().optional(),
  templateNarrationGuidance: z.string().optional(),
  templateId: z.string().optional(),
  templateInputs: z.record(z.unknown()).optional(),
  templateFramework: z.string().optional(),
  templateCtaPattern: z.string().optional(),
  isFaceless: z.boolean(),
});

function buildScriptUserMessage(params: {
  prompt: string;
  contentType: string;
  platform: string;
  language: string;
  templateScriptStructure?: string;
  templateFramework?: string;
  templateCtaPattern?: string;
  reviewFeedback?: string[];
}): string {
  const { prompt, contentType, platform, language, templateScriptStructure, templateFramework, templateCtaPattern, reviewFeedback } = params;

  const framework = (templateFramework ?? "aida") as CopywritingFramework;
  const headline = "curiosity-gap" as HeadlineFormula;
  const cta = (templateCtaPattern ?? "low-friction") as CtaPattern;

  const sections: string[] = [
    `CRITICAL: You MUST write ALL content in ${language}. The hook, body, cta, caption, and all text MUST be in ${language}.`,
    `Create a ${contentType} script for ${platform} about: ${prompt}`,
  ];

  if (framework !== "none") {
    if (framework === "aida") sections.push(renderAidaFramework());
    else if (framework === "pas") sections.push(renderPasFramework());
  }

  sections.push(renderHeadlineFormula(headline));
  sections.push(renderCtaPattern(cta));
  sections.push(renderPersuasionPrinciple("social-proof"));

  if (templateScriptStructure) {
    sections.push(`Script structure: ${templateScriptStructure}`);
  }

  if (reviewFeedback && reviewFeedback.length > 0) {
    sections.push(``, `PREVIOUS VERSION FEEDBACK — improve on these points:`, ...reviewFeedback.map((f) => `- ${f}`));
  }

  sections.push(``, `Output format (JSON):
{
  "hook": string (attention-grabbing opening),
  "body": string (main script content),
  "cta": string (call to action),
  "caption": string (with hashtags, required),
  "visual_prompt"?: string (visual description for AI image generation),
  "artStyle"?: string
}`);
  sections.push(``, `Return ONLY valid JSON — no markdown, no code fences, no explanation.`);

  return sections.join("\n");
}

const generateScriptStep = createStep({
  id: "generate-script",
  description: "Generate script/caption from prompt using scriptWriter agent",
  inputSchema: scriptInputSchema,
  outputSchema: scriptOutputSchema,
  execute: async ({ inputData }) => {
    const isFaceless = inputData.isFaceless ?? (!inputData.avatarContext || inputData.avatarContext.includes("no human figures"));

    const agent = mastra.getAgent("scriptWriter");

    const userMessage = buildScriptUserMessage({
      prompt: inputData.prompt,
      contentType: inputData.contentType,
      platform: inputData.platform,
      language: inputData.language,
      templateScriptStructure: inputData.templateScriptStructure,
      templateFramework: inputData.templateFramework,
      templateCtaPattern: inputData.templateCtaPattern,
    });

    const response = await agent.generate(userMessage);
    const text = (response as { text: string }).text;

    let script = text;
    let caption = "";
    let enhancedPrompt = "";
    let artStyle: ArtStyle | undefined;

    try {
      const parsed = parseJsonResponse<{
        hook?: string;
        body?: string;
        cta?: string;
        caption?: string;
        visual_prompt?: string;
        artStyle?: ArtStyle;
      }>(text);
      script = `${parsed.hook ?? ""}\n\n${parsed.body ?? ""}\n\n${parsed.cta ?? ""}`;
      caption = parsed.caption ?? "";
      enhancedPrompt = parsed.visual_prompt ?? "";
      artStyle = parsed.artStyle;
    } catch {
      script = text;
    }

    await db
      .update(contents)
      .set({
        script,
        caption,
        metadata: {
          enhancedPrompt,
          hasAvatar: !isFaceless,
          platform: inputData.platform,
        },
      })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      contentType: inputData.contentType,
      platform: inputData.platform,
      prompt: inputData.prompt,
      language: inputData.language,
      script,
      caption,
      enhancedPrompt,
      artStyle,
      brandKitJson: inputData.brandKitJson,
      avatarContext: inputData.avatarContext,
      isFaceless,
      slideCount: inputData.slideCount,
      aspectRatio: inputData.aspectRatio,
      templateId: inputData.templateId,
      templateInputs: inputData.templateInputs,
    };
  },
});

const MAX_REVIEW_RETRIES = 2;
const MIN_ACCEPTABLE_SCORE = 6;

const reviewScriptStep = createStep({
  id: "review-script",
  description: "Review script quality and regenerate if score is below threshold",
  inputSchema: scriptOutputSchema,
  outputSchema: scriptOutputSchema,
  execute: async ({ inputData }) => {
    const reviewerAgent = mastra.getAgent("qualityReviewer");
    const writerAgent = mastra.getAgent("scriptWriter");

    const reviewMessage = `Review this social media content script:

Platform: ${inputData.platform}
Content type: ${inputData.contentType}

Script:
${inputData.script}

Caption:
${inputData.caption}

Return ONLY valid JSON — no markdown, no code fences, no explanation.`;

    let bestScript = inputData.script;
    let bestCaption = inputData.caption;
    let bestEnhancedPrompt = inputData.enhancedPrompt;
    let bestArtStyle = inputData.artStyle;
    let bestScore = 0;
    let bestFeedback: string[] = [];

    for (let attempt = 0; attempt <= MAX_REVIEW_RETRIES; attempt++) {
      try {
        const reviewResponse = await reviewerAgent.generate(reviewMessage);
        const reviewText = (reviewResponse as { text: string }).text;
        const review = parseJsonResponse<{
          approved?: boolean;
          score?: number;
          hookScore?: number;
          ctaScore?: number;
          issues?: Array<{ severity: string; description: string }>;
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
          const regenMessage = buildScriptUserMessage({
            prompt: inputData.prompt,
            contentType: inputData.contentType,
            platform: inputData.platform,
            language: inputData.language,
            templateFramework: inputData.templateFramework,
            templateCtaPattern: inputData.templateCtaPattern,
            reviewFeedback: feedback,
          });

          const regenResponse = await writerAgent.generate(regenMessage);
          const regenText = (regenResponse as { text: string }).text;

          try {
            const parsed = parseJsonResponse<{
              hook?: string;
              body?: string;
              cta?: string;
              caption?: string;
              visual_prompt?: string;
              artStyle?: ArtStyle;
            }>(regenText);
            bestScript = `${parsed.hook ?? ""}\n\n${parsed.body ?? ""}\n\n${parsed.cta ?? ""}`;
            bestCaption = parsed.caption ?? bestCaption;
            bestEnhancedPrompt = parsed.visual_prompt ?? bestEnhancedPrompt;
            bestArtStyle = parsed.artStyle ?? bestArtStyle;
          } catch {
            bestScript = regenText;
          }
        }
      } catch (error) {
        console.error(`[review-script] Review attempt ${attempt + 1} failed:`, error);
        break;
      }
    }

    if (bestScript !== inputData.script || bestCaption !== inputData.caption) {
      const isFaceless = !inputData.prompt.includes("avatar");
      await db
        .update(contents)
        .set({
          script: bestScript,
          caption: bestCaption,
          metadata: {
            enhancedPrompt: bestEnhancedPrompt,
            hasAvatar: !isFaceless,
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
      enhancedPrompt: bestEnhancedPrompt,
      artStyle: bestArtStyle,
      reviewScore: bestScore,
      reviewFeedback: bestFeedback,
    };
  },
});

const slideStoryboardSchema = scriptOutputSchema.extend({
  slideStoryboard: z.array(z.object({
    slideIndex: z.number(),
    title: z.string(),
    description: z.string(),
    visualDirection: z.string(),
  })),
  storyBible: z.any(),
  scenePrompts: z.array(z.string()),
  continuityCheckedPrompts: z.array(z.string()),
});

const buildSlideStoryboardStep = createStep({
  id: "build-slide-storyboard",
  description: "Generate per-slide visual prompts from the script for slide carousel content",
  inputSchema: scriptOutputSchema,
  outputSchema: slideStoryboardSchema.pick({
    contentId: true,
    userId: true,
    contentType: true,
    platform: true,
    prompt: true,
    language: true,
    script: true,
    caption: true,
    enhancedPrompt: true,
    artStyle: true,
    brandKitJson: true,
    avatarContext: true,
    isFaceless: true,
    slideCount: true,
    aspectRatio: true,
    templateId: true,
    templateInputs: true,
    templateFramework: true,
    templateCtaPattern: true,
    reviewScore: true,
    reviewFeedback: true,
    slideStoryboard: true,
    storyBible: true,
    scenePrompts: true,
    continuityCheckedPrompts: true,
  }),
  execute: async ({ inputData }) => {
    if (inputData.contentType !== "slide") {
      return {
        ...inputData,
        slideStoryboard: [],
        storyBible: null,
        scenePrompts: [],
        continuityCheckedPrompts: [],
      };
    }

    const agent = mastra.getAgent("scriptWriter");

    const slideCount =
      inputData.templateId === "listicle"
        ? (inputData.templateInputs?.itemCount as number) ?? inputData.slideCount ?? 5
        : inputData.slideCount ?? 3;

    const userMessage = buildSlideStoryboardUserMessage(
      inputData.script,
      slideCount,
      inputData.platform,
      inputData.prompt,
    );

    const response = await agent.generate(userMessage);
    const text = (response as { text: string }).text;

    const storyboard = parseSlideStoryboardResponse(
      text,
      slideCount,
      inputData.enhancedPrompt || `${inputData.prompt} for a ${inputData.platform} carousel post`,
    );

    const isFaceless = inputData.isFaceless ?? true;
    const avatarContext = inputData.avatarContext ?? "";

    const storyBibleMessage = buildStoryBibleUserMessage(
      inputData.script,
      inputData.prompt,
      slideCount,
      inputData.platform,
      avatarContext,
      isFaceless,
    );

    const bibleResponse = await agent.generate(storyBibleMessage);
    const bibleText = (bibleResponse as { text: string }).text;
    const storyBible = parseStoryBibleResponse(bibleText, {
      topic: inputData.prompt,
      totalScenes: slideCount,
    });

    const platform = inputData.platform as Platform;
    const cameraDir = cameraDirectionForPlatform(platform);
    const qualityTags = PLATFORM_STRATEGIES[platform]?.qualityTagSuffixes ?? ["high quality", "professional"];
    const avatarVisual = !isFaceless && avatarContext
      ? avatarContext
      : undefined;

    const scenePrompts: string[] = [];
    const previousSceneSummaries: import("../../lib/prompts/story-bible.js").SceneSummary[] = [];

    for (let i = 0; i < storyboard.length; i++) {
      const slide = storyboard[i];
      const scenePrompt = assembleContinuityPrompt(
        slide.visualDirection,
        storyBible,
        i,
        storyboard.length,
        previousSceneSummaries,
        cameraDir as import("../../lib/prompts/types.js").CameraDirection,
        qualityTags,
        platform,
        inputData.aspectRatio,
        true,
        isFaceless,
        avatarVisual,
        inputData.artStyle as ArtStyle | undefined,
      );

      scenePrompts.push(scenePrompt);

      const sceneSummary = storyBible.sceneSummaries?.[i];
      if (sceneSummary) {
        previousSceneSummaries.push(sceneSummary);
      }
    }

    if (storyBible.topic) {
      await db
        .update(contents)
        .set({ metadata: { storyBible, hasAvatar: !isFaceless, platform: inputData.platform } })
        .where(eq(contents.id, inputData.contentId));
    }

    return {
      ...inputData,
      slideStoryboard: storyboard,
      storyBible,
      scenePrompts,
      continuityCheckedPrompts: scenePrompts,
    };
  },
});

const buildSlideContinuityCheckStep = createStep({
  id: "build-slide-continuity-check",
  description: "Review all slide scene prompts for narrative continuity, visual variety, and duplicate prevention",
  inputSchema: slideStoryboardSchema,
  outputSchema: slideStoryboardSchema,
  execute: async ({ inputData }) => {
    if (inputData.contentType !== "slide" || inputData.scenePrompts.length <= 1) {
      return inputData;
    }

    const agent = mastra.getAgent("continuityChecker");

    const userMessage = buildContinuityCheckUserMessage(
      inputData.scenePrompts,
      inputData.storyBible,
    );

    let checkedPrompts = inputData.scenePrompts;

    try {
      const response = await agent.generate(userMessage);
      const text = (response as { text: string }).text;
      const result = parseContinuityCheckResponse(text, inputData.scenePrompts);

      if (!result.passes && result.rewrittenPrompts) {
        checkedPrompts = result.rewrittenPrompts;
      }
    } catch (error) {
      console.error("[build-slide-continuity-check] Failed, using original prompts", error);
    }

    return {
      ...inputData,
      continuityCheckedPrompts: checkedPrompts,
    };
  },
});

const generateSlideImagesStep = createStep({
  id: "generate-slide-images",
  description: "Generate multiple images for slide carousel content with continuity-checked prompts",
  inputSchema: slideStoryboardSchema,
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    script: z.string(),
    caption: z.string(),
    imageUrls: z.array(z.string()),
    contentType: z.enum(["image", "slide", "video", "text"]),
    platform: z.string(),
    prompt: z.string(),
    language: z.string(),
    enhancedPrompt: z.string().optional(),
    artStyle: z.string().optional(),
    brandKitJson: z.string().optional(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    aspectRatio: z.string(),
    reviewScore: z.number().optional(),
    reviewFeedback: z.array(z.string()).optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.contentType !== "slide") {
      return {
        ...inputData,
        imageUrls: [],
        continuityCheckedPrompts: [],
      };
    }

    const slideCount =
      inputData.templateId === "listicle"
        ? (inputData.templateInputs?.itemCount as number) ?? inputData.slideCount ?? 5
        : inputData.slideCount ?? 3;
    const size = getImageSize(inputData.aspectRatio);
    const imageUrls: string[] = [];

    const prompts = inputData.continuityCheckedPrompts.length > 0
      ? inputData.continuityCheckedPrompts
      : Array.from({ length: slideCount }, () =>
          inputData.enhancedPrompt || `${inputData.prompt} for a ${inputData.platform} carousel post`,
        );

    const imageResults = await Promise.all(
      Array.from({ length: slideCount }, async (_, i) => {
        const slidePrompt = prompts[i] ?? prompts[0];

        const negativePrompt = getNegativePrompt(inputData.platform as Platform);
        const imageUrl = await getProviders().image.generate(slidePrompt, size, undefined, { negativePrompt });

        await insertMediaAsset({
          userId: inputData.userId,
          contentId: inputData.contentId,
          type: "image",
          url: imageUrl,
          provider: process.env.AI_IMAGE_PROVIDER ?? "dashscope",
          metadata: {
            slide: i + 1,
            totalSlides: slideCount,
            prompt: slidePrompt,
            size,
          },
        });

        return imageUrl;
      }),
    );

    imageUrls.push(...imageResults);

    return {
      ...inputData,
      imageUrls,
      continuityCheckedPrompts: inputData.continuityCheckedPrompts,
    };
  },
});

const compositeSlideStep = createStep({
  id: "composite-slide",
  description: "Composite template overlays onto slide images (listicle, fact-card, quote-card)",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    script: z.string(),
    caption: z.string(),
    imageUrls: z.array(z.string()),
    contentType: z.enum(["image", "slide", "video", "text"]),
    brandKitJson: z.string().optional(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    aspectRatio: z.string(),
    language: z.string(),
    textLayers: z.record(z.array(z.any())).optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    compositedImageUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
    language: z.string(),
    textLayers: z.record(z.array(z.any())).optional(),
  }),
  execute: async ({ inputData }) => {
    const { templateId, templateInputs, imageUrls, aspectRatio } = inputData;

    let resultUrls: string[] = imageUrls;
    let textLayers: Record<string, unknown[]> | undefined;

    // If style step already produced text layers, use them directly
    if (inputData.textLayers && Object.keys(inputData.textLayers).length > 0) {
      textLayers = inputData.textLayers;
    }

    if (!templateId || !templateInputs || Object.keys(templateInputs).length === 0 || imageUrls.length === 0) {
      return {
        contentId: inputData.contentId,
        userId: inputData.userId,
        compositedImageUrls: imageUrls,
        script: inputData.script,
        caption: inputData.caption,
        contentType: inputData.contentType,
        language: inputData.language,
      };
    }

    const compositedUrls: string[] = [];

    switch (templateId) {
      case "fake-chat": {
        const buffer = await renderChatTemplate(templateInputs, aspectRatio);
        const url = await uploadFile(buffer, randomFilename("png"), "image/png");
        compositedUrls.push(url);
        break;
      }

      case "split-screen": {
        if (imageUrls.length < 2) {
          const singleBuffer = await downloadImageAsBuffer(imageUrls[0]);
          const buffer = await renderSplitScreenTemplate(templateInputs, aspectRatio, singleBuffer, singleBuffer);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedUrls.push(url);
        } else {
          const leftBuffer = await downloadImageAsBuffer(imageUrls[0]);
          const rightBuffer = await downloadImageAsBuffer(imageUrls[1]);
          const buffer = await renderSplitScreenTemplate(templateInputs, aspectRatio, leftBuffer, rightBuffer);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedUrls.push(url);
        }
        const labelLayers = templateOverlayToTextLayers(templateId, templateInputs, aspectRatio);
        if (Object.keys(labelLayers).length > 0) {
          textLayers = labelLayers as unknown as Record<string, unknown[]>;
        }
        break;
      }

      case "listicle": {
        if (!textLayers) {
          const count = (templateInputs.itemCount as number) ?? (imageUrls.length || 5);
          textLayers = templateOverlayToTextLayers(templateId, templateInputs, aspectRatio, count) as unknown as Record<string, unknown[]>;
        }
        resultUrls = imageUrls;
        break;
      }

      case "fact-card":
      case "quote-card":
      case "pov": {
        if (!textLayers) {
          textLayers = templateOverlayToTextLayers(templateId, templateInputs, aspectRatio) as unknown as Record<string, unknown[]>;
        }
        resultUrls = imageUrls;
        break;
      }

      default:
        return {
          contentId: inputData.contentId,
          userId: inputData.userId,
          compositedImageUrls: imageUrls,
          script: inputData.script,
          caption: inputData.caption,
          contentType: inputData.contentType,
          language: inputData.language,
        };
    }

    if (compositedUrls.length > 0) {
      resultUrls = compositedUrls;
    }

    let brandKit: BrandKit | undefined;
    try {
      if (inputData.brandKitJson) {
        brandKit = JSON.parse(inputData.brandKitJson) as BrandKit;
      }
    } catch {}

    if (brandKit?.logoUrl && resultUrls.length > 0) {
      const watermarkedUrls = await Promise.all(
        resultUrls.map(async (url) => {
          const response = await fetch(url);
          const buffer = Buffer.from(await response.arrayBuffer());
          const watermarked = await applyWatermarkToBuffer(buffer, brandKit.logoUrl!);
          return await uploadFile(watermarked, randomFilename("png"), "image/png");
        }),
      );
      return {
        contentId: inputData.contentId,
        userId: inputData.userId,
        compositedImageUrls: watermarkedUrls,
        script: inputData.script,
        caption: inputData.caption,
        contentType: inputData.contentType,
        language: inputData.language,
        textLayers,
      };
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      compositedImageUrls: resultUrls,
      script: inputData.script,
      caption: inputData.caption,
      contentType: inputData.contentType,
      language: inputData.language,
      textLayers,
    };
  },
});

const styleSlideTextLayersStep = createStep({
  id: "style-slide-text-layers",
  description: "Generate AI-chosen formatting for text overlay layers on slides",
inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    aspectRatio: z.string(),
    imageUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
    platform: z.string(),
    prompt: z.string(),
    brandKitJson: z.string().optional(),
    language: z.string(),
    enhancedPrompt: z.string().optional(),
    artStyle: z.string().optional(),
    reviewScore: z.number().optional(),
    reviewFeedback: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    aspectRatio: z.string(),
    imageUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
    brandKitJson: z.string().optional(),
    language: z.string(),
    textLayers: z.record(z.array(z.any())).optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.contentType !== "slide" && inputData.contentType !== "image") {
      return inputData;
    }

    const { templateId, templateInputs, aspectRatio } = inputData;

    if (!templateId || !templateInputs || Object.keys(templateInputs).length === 0) {
      return inputData;
    }

    const layerDescriptions = TEMPLATE_LAYER_DESCRIPTIONS[templateId];
    if (!layerDescriptions) return inputData;

    const textLayers = templateOverlayToTextLayers(templateId, templateInputs, aspectRatio);
    if (Object.keys(textLayers).length === 0) return inputData;

    const firstSlideLayers = Object.values(textLayers)[0] ?? [];
    const textContents = firstSlideLayers.map((l) => `- "${(l as TextLayer).text}"`).join("\n");

    const agent = mastra.getAgent("textStyler");
    const languageHint = inputData.language ? `Language: ${inputData.language}` : "";
    const userMessage = `${layerDescriptions}

Text content for each layer (in order):
${textContents || "See templateInputs"}
Aspect ratio: ${aspectRatio}
${languageHint}

Return ONLY valid JSON array of styling objects, one per layer in order — no markdown, no code fences, no explanation.`;

    const response = await agent.generate(userMessage);
    const responseText = (response as { text: string }).text;

    try {
      const parsed = JSON.parse(responseText);
      const styles = Array.isArray(parsed) ? parsed as TextLayerFormatting[] : [];
      const styledLayers = mergeStylesIntoTextLayers(textLayers, styles);
      return { ...inputData, textLayers: styledLayers as unknown as Record<string, unknown[]> };
    } catch {
      return { ...inputData, textLayers };
    }
  },
});

const saveSlideVersionStep = createStep({
  id: "save-slide-version",
  description: "Save slide content as a version with images",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    script: z.string(),
    caption: z.string(),
    compositedImageUrls: z.array(z.string()),
    contentType: z.enum(["image", "slide", "video", "text"]),
    language: z.string(),
    textLayers: z.record(z.array(z.any())).optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    script: z.string(),
    caption: z.string(),
  }),
  execute: async ({ inputData }) => {
    const [maxVersion] = await db
      .select({ versionNumber: max(contentVersions.versionNumber) })
      .from(contentVersions)
      .where(eq(contentVersions.contentId, inputData.contentId));

    const versionNumber = (maxVersion?.versionNumber ?? 0) + 1;

    const isTextContent = inputData.contentType === "text";

    const [version] = await db
      .insert(contentVersions)
      .values({
        contentId: inputData.contentId,
        versionNumber,
        outputUrl: isTextContent ? null : (inputData.compositedImageUrls[0] ?? null),
        thumbnailUrl: isTextContent ? null : (inputData.compositedImageUrls[0] ?? null),
        metadata: {
          type: inputData.contentType,
          script: inputData.script,
          caption: inputData.caption,
          ...(inputData.compositedImageUrls.length > 0 ? { images: inputData.compositedImageUrls } : {}),
          ...(inputData.textLayers ? { textLayers: inputData.textLayers } : {}),
        },
      })
      .returning();

    if (!isTextContent) {
      for (const url of inputData.compositedImageUrls) {
        await insertMediaAsset({
          userId: inputData.userId,
          contentId: inputData.contentId,
          type: "image",
          url,
          provider: "composite",
          metadata: { source: "composite-template" },
        });
      }
    }

    await db
      .update(contents)
      .set({ status: "ready", script: inputData.script, caption: inputData.caption })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      versionId: version.id,
      script: inputData.script,
      caption: inputData.caption,
    };
  },
});

export const generateContentWorkflow = createWorkflow({
  id: "generate-content-workflow",
  inputSchema: contentInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    script: z.string(),
    caption: z.string(),
  }),
})
  .then(buildPromptContextStep)
  .then(generateScriptStep)
  .then(reviewScriptStep)
  .then(buildSlideStoryboardStep)
  .then(buildSlideContinuityCheckStep)
  .then(generateSlideImagesStep)
  .then(styleSlideTextLayersStep)
  .then(compositeSlideStep)
  .then(saveSlideVersionStep);

generateContentWorkflow.commit();