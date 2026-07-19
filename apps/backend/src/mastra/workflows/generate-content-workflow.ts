import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import { buildPromptContext, assembleFinalPrompt, renderBrandKitGuidance } from "../../lib/prompts/prompt-builder.js";
import { getNegativePrompt } from "../../lib/prompts/negative-prompts.js";
import { renderAvatarForText, renderNoAvatarGuidance } from "../../lib/prompts/avatar-injector.js";
import { PLATFORM_STRATEGIES } from "../../lib/prompts/platform-strategies.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { insertMediaAsset } from "../../lib/media.js";
import { eq } from "drizzle-orm";
import type { Platform, ContentType, BrandKit } from "@faceless/shared";
import type { EnhancedPrompt } from "../../lib/prompts/types.js";
import {
  renderChatTemplate,
  renderSplitScreenTemplate,
  renderFactCardTemplate,
  renderQuoteCardTemplate,
  renderListicleCardTemplate,
} from "../../lib/compositing/renderer.js";
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
import {
  buildScriptWriterSystemPrompt,
  buildQualityReviewerSystemPrompt,
} from "../../lib/prompts/system-prompts.js";
import type { CopywritingFramework, HeadlineFormula, CtaPattern } from "../../lib/prompts/types.js";

async function downloadImageAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
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
  brandKitJson: z.string().optional(),
  slideCount: z.number().optional(),
  aspectRatio: z.string(),
  templateId: z.string().optional(),
  templateInputs: z.record(z.unknown()).optional(),
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
});

function buildScriptUserMessage(params: {
  prompt: string;
  contentType: string;
  platform: string;
  language: string;
  templateScriptStructure?: string;
  reviewFeedback?: string[];
}): string {
  const { prompt, contentType, platform, language, templateScriptStructure, reviewFeedback } = params;

  const framework = "aida" as CopywritingFramework;
  const headline = "curiosity-gap" as HeadlineFormula;
  const cta = "low-friction" as CtaPattern;

  const sections: string[] = [
    `Create a ${contentType} script for ${platform} about: ${prompt}`,
    `Language: ${language}`,
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

  sections.push(``, `Return ONLY valid JSON — no markdown, no code fences, no explanation.`);

  return sections.join("\n");
}

const generateScriptStep = createStep({
  id: "generate-script",
  description: "Generate script/caption from prompt using scriptWriter agent",
  inputSchema: scriptInputSchema,
  outputSchema: scriptOutputSchema,
  execute: async ({ inputData }) => {
    const isFaceless = !inputData.avatarContext || inputData.avatarContext.includes("no human figures");

    const agent = mastra.getAgent("scriptWriter");

    const userMessage = buildScriptUserMessage({
      prompt: inputData.prompt,
      contentType: inputData.contentType,
      platform: inputData.platform,
      language: inputData.language,
      templateScriptStructure: inputData.templateScriptStructure,
    });

    const response = await agent.generate(userMessage);
    const text = (response as { text: string }).text;

    let script = text;
    let caption = "";
    let enhancedPrompt = "";

    try {
      const parsed = parseJsonResponse<{
        hook?: string;
        body?: string;
        cta?: string;
        caption?: string;
        visual_prompt?: string;
      }>(text);
      script = `${parsed.hook ?? ""}\n\n${parsed.body ?? ""}\n\n${parsed.cta ?? ""}`;
      caption = parsed.caption ?? "";
      enhancedPrompt = parsed.visual_prompt ?? "";
    } catch {
      script = text;
    }

    await db
      .update(contents)
      .set({
        script,
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
      brandKitJson: inputData.brandKitJson,
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
            }>(regenText);
            bestScript = `${parsed.hook ?? ""}\n\n${parsed.body ?? ""}\n\n${parsed.cta ?? ""}`;
            bestCaption = parsed.caption ?? bestCaption;
            bestEnhancedPrompt = parsed.visual_prompt ?? bestEnhancedPrompt;
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
      reviewScore: bestScore,
      reviewFeedback: bestFeedback,
    };
  },
});

const generateSlideImagesStep = createStep({
  id: "generate-slide-images",
  description: "Generate multiple images for slide carousel content",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
    platform: z.string(),
    prompt: z.string(),
    language: z.string(),
    script: z.string(),
    caption: z.string(),
    enhancedPrompt: z.string().optional(),
    brandKitJson: z.string().optional(),
    slideCount: z.number().optional(),
    aspectRatio: z.string(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    reviewScore: z.number().optional(),
    reviewFeedback: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
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
  }),
  execute: async ({ inputData }) => {
    if (inputData.contentType !== "slide") {
      return {
        contentId: inputData.contentId,
        userId: inputData.userId,
        script: inputData.script,
        caption: inputData.caption,
        imageUrls: [],
        contentType: inputData.contentType,
        brandKitJson: inputData.brandKitJson,
        templateId: inputData.templateId,
        templateInputs: inputData.templateInputs,
        aspectRatio: inputData.aspectRatio,
      };
    }

    const slideCount =
      inputData.templateId === "listicle"
        ? (inputData.templateInputs?.itemCount as number) ?? inputData.slideCount ?? 5
        : inputData.slideCount ?? 3;
    const size = getImageSize(inputData.aspectRatio);
    const imageUrls: string[] = [];

    for (let i = 0; i < slideCount; i++) {
      const slidePrompt = inputData.enhancedPrompt
        ? inputData.enhancedPrompt
        : `${inputData.prompt} for a ${inputData.platform} carousel post`;

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

      imageUrls.push(imageUrl);
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      script: inputData.script,
      caption: inputData.caption,
      imageUrls,
      contentType: inputData.contentType,
      brandKitJson: inputData.brandKitJson,
      templateId: inputData.templateId,
      templateInputs: inputData.templateInputs,
      aspectRatio: inputData.aspectRatio,
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
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    compositedImageUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
  }),
  execute: async ({ inputData }) => {
    const { templateId, templateInputs, imageUrls, aspectRatio } = inputData;

    if (!templateId || !templateInputs || imageUrls.length === 0) {
      return {
        contentId: inputData.contentId,
        userId: inputData.userId,
        compositedImageUrls: imageUrls,
        script: inputData.script,
        caption: inputData.caption,
        contentType: inputData.contentType,
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
        break;
      }

      case "listicle": {
        const items = (templateInputs.items as string[]) ?? [];
        const itemCount = (templateInputs.itemCount as number) ?? (items.length || imageUrls.length);
        const topic = (templateInputs.topic as string) ?? "";

        for (let i = 0; i < itemCount; i++) {
          const itemTitle = items[i] ?? `Item ${i + 1}`;
          const itemDescription = `Description for ${itemTitle}`;
          const bgBuffer = imageUrls[i]
            ? await downloadImageAsBuffer(imageUrls[i])
            : undefined;
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
          compositedUrls.push(url);
        }
        break;
      }

      case "fact-card": {
        for (let i = 0; i < imageUrls.length; i++) {
          const bgBuffer = await downloadImageAsBuffer(imageUrls[i]);
          const buffer = await renderFactCardTemplate(templateInputs, aspectRatio, bgBuffer);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedUrls.push(url);
        }
        break;
      }

      case "quote-card": {
        for (let i = 0; i < imageUrls.length; i++) {
          const bgBuffer = await downloadImageAsBuffer(imageUrls[i]);
          const buffer = await renderQuoteCardTemplate(templateInputs, aspectRatio, bgBuffer);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedUrls.push(url);
        }
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
        };
    }

    let brandKit: BrandKit | undefined;
    try {
      if (inputData.brandKitJson) {
        brandKit = JSON.parse(inputData.brandKitJson) as BrandKit;
      }
    } catch {}

    if (brandKit?.logoUrl && compositedUrls.length > 0) {
      const watermarkedUrls: string[] = [];
      for (const url of compositedUrls) {
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const watermarked = await applyWatermarkToBuffer(buffer, brandKit.logoUrl);
        const newUrl = await uploadFile(watermarked, randomFilename("png"), "image/png");
        watermarkedUrls.push(newUrl);
      }
      return {
        contentId: inputData.contentId,
        userId: inputData.userId,
        compositedImageUrls: watermarkedUrls,
        script: inputData.script,
        caption: inputData.caption,
        contentType: inputData.contentType,
      };
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      compositedImageUrls: compositedUrls,
      script: inputData.script,
      caption: inputData.caption,
      contentType: inputData.contentType,
    };
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
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    script: z.string(),
    caption: z.string(),
  }),
  execute: async ({ inputData }) => {
    const existingVersions = await db.query.contentVersions.findMany({
      where: eq(contentVersions.contentId, inputData.contentId),
      columns: { versionNumber: true },
    });

    const versionNumber = existingVersions.length > 0
      ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
      : 1;

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
      .set({ status: "ready" })
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
  .then(generateSlideImagesStep)
  .then(compositeSlideStep)
  .then(saveSlideVersionStep);

generateContentWorkflow.commit();