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
  renderFactCardTemplate,
  renderQuoteCardTemplate,
  renderSplitScreenTemplate,
  renderPovOverlay,
} from "../../lib/compositing/renderer.js";
import { uploadFile, randomFilename } from "../../lib/storage.js";
import { applyWatermarkToBuffer } from "../../lib/compositing/watermark.js";
import { mastra } from "../../mastra/index.js";
import { parseJsonResponse } from "../../lib/prompts/parse-json.js";
import {
  renderAidaFramework,
  renderHeadlineFormula,
  renderCtaPattern,
  renderToneByChannel,
} from "../../lib/prompts/copywriting-frameworks.js";
import {
  buildPromptEnhancerSystemPrompt,
  buildCaptionGeneratorSystemPrompt,
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

const imageInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  platform: z.string(),
  aspectRatio: z.string().default("9:16"),
  language: z.string().default("en"),
  avatarId: z.string().optional(),
  templateSystemPrompt: z.string().optional(),
  templateVisualGuidance: z.string().optional(),
  templateNegativeAdditions: z.array(z.string()).optional(),
  templateScriptStructure: z.string().optional(),
  templateNarrationGuidance: z.string().optional(),
  templateId: z.string().optional(),
  templateInputs: z.record(z.unknown()).optional(),
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
    platform: z.string(),
    prompt: z.string(),
    language: z.string(),
    avatarId: z.string().optional(),
    avatarContext: z.string().optional(),
    brandKitGuidance: z.string().optional(),
    brandKitJson: z.string().optional(),
    isFaceless: z.boolean(),
    promptMetadata: z.any(),
    templateVisualGuidance: z.string().optional(),
    templateNegativeAdditions: z.array(z.string()).optional(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
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

    const isFaceless = !context.avatar;

    const agent = mastra.getAgent("promptEnhancer");

    const userMessage = `Create a visual image generation prompt for ${inputData.platform}, aspect ratio ${inputData.aspectRatio}, about: ${inputData.prompt}

Return ONLY valid JSON — no markdown, no code fences, no explanation.`;

    const response = await agent.generate(userMessage);
    const result = (response as { text: string }).text;

    let enhanced: EnhancedPrompt;
    try {
      const parsed = parseJsonResponse<{
        visualPrompt?: string;
        cameraDirection?: EnhancedPrompt["cameraDirection"];
        qualityTags?: string[];
      }>(result);
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

    const finalPrompt = assembleFinalPrompt(enhanced, context, true);

    const brandKitGuidance = renderBrandKitGuidance(context.brandKit);
    const brandKitJson = context.brandKit ? JSON.stringify(context.brandKit) : undefined;

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      enhancedPrompt: finalPrompt,
      aspectRatio: inputData.aspectRatio,
      platform: inputData.platform,
      prompt: inputData.prompt,
      language: inputData.language,
      avatarId: inputData.avatarId,
      avatarContext: isFaceless ? renderNoAvatarGuidance() : renderAvatarForText(context.avatar!),
      brandKitGuidance,
      brandKitJson,
      isFaceless,
      promptMetadata: {
        enhanced,
        context: {
          platform: context.platform,
          hasAvatar: !!context.avatar,
          avatarName: context.avatar?.name,
        },
      },
      templateVisualGuidance: inputData.templateVisualGuidance,
      templateNegativeAdditions: inputData.templateNegativeAdditions,
      templateId: inputData.templateId,
      templateInputs: inputData.templateInputs,
    };
  },
});

const generateImageScriptStep = createStep({
  id: "generate-image-script",
  description: "Generate script and caption for the image",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    enhancedPrompt: z.string(),
    aspectRatio: z.string(),
    platform: z.string(),
    prompt: z.string(),
    language: z.string(),
    avatarId: z.string().optional(),
    avatarContext: z.string().optional(),
    brandKitGuidance: z.string().optional(),
    brandKitJson: z.string().optional(),
    isFaceless: z.boolean(),
    promptMetadata: z.any(),
    templateSystemPrompt: z.string().optional(),
    templateVisualGuidance: z.string().optional(),
    templateNegativeAdditions: z.array(z.string()).optional(),
    templateScriptStructure: z.string().optional(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    enhancedPrompt: z.string(),
    aspectRatio: z.string(),
    promptMetadata: z.any(),
    script: z.string(),
    caption: z.string(),
    brandKitJson: z.string().optional(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
  }),
  execute: async ({ inputData }) => {
    const strategy = PLATFORM_STRATEGIES[inputData.platform as Platform] ?? PLATFORM_STRATEGIES.generic;

    const isFaceless = inputData.isFaceless;
    const avatarContext = inputData.avatarContext ?? "";

    const agent = mastra.getAgent("scriptWriter");

    const platform = inputData.platform as Platform;
    const toneSection = renderToneByChannel(platform);
    const headline: HeadlineFormula = "curiosity-gap";
    const cta: CtaPattern = "low-friction";

    const sections: string[] = [
      `Write a social media caption for this ${inputData.platform} image post about: ${inputData.prompt}`,
      `Language: ${inputData.language}`,
      toneSection,
      renderHeadlineFormula(headline),
      renderCtaPattern(cta),
    ];

    if (inputData.brandKitGuidance) {
      sections.push(``, `Brand identity:`, inputData.brandKitGuidance);
    }

    sections.push(``, `Return ONLY valid JSON — no markdown, no code fences, no explanation.`);

    const userMessage = sections.join("\n");

    const response = await agent.generate(userMessage);
    const scriptResult = (response as { text: string }).text;

    let script = scriptResult;
    let caption = "";

    try {
      const parsed = parseJsonResponse<{
        hook?: string;
        body?: string;
        cta?: string;
        caption?: string;
      }>(scriptResult);
      script = `${parsed.hook ?? ""}\n\n${parsed.body ?? ""}\n\n${parsed.cta ?? ""}`;
      caption = parsed.caption ?? "";
    } catch {
      script = scriptResult;
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
      enhancedPrompt: inputData.enhancedPrompt,
      aspectRatio: inputData.aspectRatio,
      language: inputData.language,
      promptMetadata: inputData.promptMetadata,
      script,
      caption,
      brandKitJson: inputData.brandKitJson,
      templateId: inputData.templateId,
      templateInputs: inputData.templateInputs,
    };
  },
});

const imageScriptOutputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  enhancedPrompt: z.string(),
  aspectRatio: z.string(),
  language: z.string(),
  promptMetadata: z.any(),
  script: z.string(),
  caption: z.string(),
  brandKitJson: z.string().optional(),
  templateId: z.string().optional(),
  templateInputs: z.record(z.unknown()).optional(),
  reviewScore: z.number().optional(),
  reviewFeedback: z.array(z.string()).optional(),
});

const MAX_REVIEW_RETRIES = 2;
const MIN_ACCEPTABLE_SCORE = 6;

const reviewImageScriptStep = createStep({
  id: "review-image-script",
  description: "Review image script quality and regenerate if score is below threshold",
  inputSchema: imageScriptOutputSchema,
  outputSchema: imageScriptOutputSchema,
  execute: async ({ inputData }) => {
    const reviewerAgent = mastra.getAgent("qualityReviewer");
    const writerAgent = mastra.getAgent("scriptWriter");

    const reviewMessage = `Review this social media image content:

Platform: ${inputData.promptMetadata?.context?.platform ?? "generic"}

Script:
${inputData.script}

Caption:
${inputData.caption}

Return ONLY valid JSON — no markdown, no code fences, no explanation.`;

    let bestScript = inputData.script;
    let bestCaption = inputData.caption;
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
            `Rewrite a social media caption for a ${inputData.promptMetadata?.context?.platform ?? "generic"} image post about: ${inputData.promptMetadata?.context?.avatarName ?? "the topic"}`,
            `Language: ${inputData.language}`,
            `Improve on these points:`,
            ...feedback.map((f) => `- ${f}`),
            ``,
            `Return ONLY valid JSON with "hook", "body", "cta", "caption" — no markdown, no code fences, no explanation.`,
          ];

          const regenResponse = await writerAgent.generate(regenSections.join("\n"));
          const regenText = (regenResponse as { text: string }).text;

          try {
            const parsed = parseJsonResponse<{
              hook?: string;
              body?: string;
              cta?: string;
              caption?: string;
            }>(regenText);
            bestScript = `${parsed.hook ?? ""}\n\n${parsed.body ?? ""}\n\n${parsed.cta ?? ""}`;
            bestCaption = parsed.caption ?? bestCaption;
          } catch {
            bestScript = regenText;
          }
        }
      } catch (error) {
        console.error(`[review-image-script] Review attempt ${attempt + 1} failed:`, error);
        break;
      }
    }

    if (bestScript !== inputData.script || bestCaption !== inputData.caption) {
      await db
        .update(contents)
        .set({
          script: bestScript,
          metadata: {
            enhancedPrompt: inputData.enhancedPrompt,
            hasAvatar: !!inputData.promptMetadata?.context?.hasAvatar,
            platform: inputData.promptMetadata?.context?.platform,
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
      reviewScore: bestScore,
      reviewFeedback: bestFeedback,
    };
  },
});

const generateImageStep = createStep({
  id: "generate-image",
  description: "Generate AI image(s) from enhanced prompt — supports split-screen (2 images) and fake-chat (0 images)",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    enhancedPrompt: z.string(),
    aspectRatio: z.string(),
    language: z.string(),
    promptMetadata: z.any(),
    script: z.string(),
    caption: z.string(),
    brandKitJson: z.string().optional(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    reviewScore: z.number().optional(),
    reviewFeedback: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    imageUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
    brandKitJson: z.string().optional(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
    aspectRatio: z.string(),
  }),
  execute: async ({ inputData }) => {
    const size = getImageSize(inputData.aspectRatio);
    const platform = inputData.promptMetadata?.context?.platform as Platform | undefined;
    const negativePrompt = platform ? getNegativePrompt(platform) : "";
    const qualityTags = (inputData.promptMetadata?.enhanced as EnhancedPrompt | undefined)?.qualityTags;

    const templateId = inputData.templateId;

    if (templateId === "fake-chat") {
      await db
        .update(contents)
        .set({
          metadata: {
            templateId: "fake-chat",
            hasAvatar: !!inputData.promptMetadata?.context?.hasAvatar,
            platform,
          },
        })
        .where(eq(contents.id, inputData.contentId));

      return {
        contentId: inputData.contentId,
        userId: inputData.userId,
        imageUrls: [],
        script: inputData.script,
        caption: inputData.caption,
        brandKitJson: inputData.brandKitJson,
        templateId: inputData.templateId,
        templateInputs: inputData.templateInputs,
        aspectRatio: inputData.aspectRatio,
      };
    }

    const imageUrls: string[] = [];

    if (templateId === "split-screen" && inputData.templateInputs) {
      const leftDescription = (inputData.templateInputs.leftDescription as string) ?? inputData.enhancedPrompt;
      const rightDescription = (inputData.templateInputs.rightDescription as string) ?? inputData.enhancedPrompt;

      const leftUrl = await getProviders().image.generate(leftDescription, size, undefined, { negativePrompt, qualityTags });
      await insertMediaAsset({
        userId: inputData.userId,
        contentId: inputData.contentId,
        type: "image",
        url: leftUrl,
        provider: process.env.AI_IMAGE_PROVIDER ?? "dashscope",
        metadata: { panel: "left", prompt: leftDescription, size, ...inputData.promptMetadata },
      });
      imageUrls.push(leftUrl);

      const rightUrl = await getProviders().image.generate(rightDescription, size, undefined, { negativePrompt, qualityTags });
      await insertMediaAsset({
        userId: inputData.userId,
        contentId: inputData.contentId,
        type: "image",
        url: rightUrl,
        provider: process.env.AI_IMAGE_PROVIDER ?? "dashscope",
        metadata: { panel: "right", prompt: rightDescription, size, ...inputData.promptMetadata },
      });
      imageUrls.push(rightUrl);
    } else {
      const imageUrl = await getProviders().image.generate(inputData.enhancedPrompt, size, undefined, { negativePrompt, qualityTags });

      await insertMediaAsset({
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

      imageUrls.push(imageUrl);
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      imageUrls,
      script: inputData.script,
      caption: inputData.caption,
      brandKitJson: inputData.brandKitJson,
      templateId: inputData.templateId,
      templateInputs: inputData.templateInputs,
      aspectRatio: inputData.aspectRatio,
    };
  },
});

const compositeImageStep = createStep({
  id: "composite-image",
  description: "Composite template overlays onto generated images (chat UI, split-screen, fact/quote cards)",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    imageUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
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
  }),
  execute: async ({ inputData }) => {
    const { templateId, templateInputs, imageUrls, aspectRatio } = inputData;

    let resultUrls: string[] = imageUrls;

    if (!templateId || !templateInputs) {
      resultUrls = imageUrls;
    } else {
      const compositedUrls: string[] = [];

      switch (templateId) {
        case "fake-chat": {
          const buffer = await renderChatTemplate(templateInputs, aspectRatio);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedUrls.push(url);
          break;
        }

        case "fact-card": {
          let bgBuffer: Buffer | undefined;
          if (imageUrls.length > 0) {
            bgBuffer = await downloadImageAsBuffer(imageUrls[0]);
          }
          const buffer = await renderFactCardTemplate(templateInputs, aspectRatio, bgBuffer);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedUrls.push(url);
          break;
        }

        case "quote-card": {
          let bgBuffer: Buffer | undefined;
          if (imageUrls.length > 0) {
            bgBuffer = await downloadImageAsBuffer(imageUrls[0]);
          }
          const buffer = await renderQuoteCardTemplate(templateInputs, aspectRatio, bgBuffer);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedUrls.push(url);
          break;
        }

        case "split-screen": {
          if (imageUrls.length < 2) {
            throw new Error("Split screen template requires 2 generated images");
          }
          const leftBuffer = await downloadImageAsBuffer(imageUrls[0]);
          const rightBuffer = await downloadImageAsBuffer(imageUrls[1]);
          const buffer = await renderSplitScreenTemplate(templateInputs, aspectRatio, leftBuffer, rightBuffer);
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedUrls.push(url);
          break;
        }

        case "pov": {
          for (const imageUrl of imageUrls) {
            const bgBuffer = await downloadImageAsBuffer(imageUrl);
            const buffer = await renderPovOverlay(templateInputs, aspectRatio, bgBuffer);
            const url = await uploadFile(buffer, randomFilename("png"), "image/png");
            compositedUrls.push(url);
          }
          break;
        }

        default:
          resultUrls = imageUrls;
          break;
      }

      if (compositedUrls.length > 0) {
        resultUrls = compositedUrls;
      } else if (!resultUrls) {
        resultUrls = imageUrls;
      }
    }

    let brandKit: BrandKit | undefined;
    try {
      if (inputData.brandKitJson) {
        brandKit = JSON.parse(inputData.brandKitJson) as BrandKit;
      }
    } catch {}

    if (brandKit?.logoUrl && resultUrls.length > 0) {
      const watermarkedUrls: string[] = [];
      for (const url of resultUrls) {
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const watermarked = await applyWatermarkToBuffer(buffer, brandKit.logoUrl);
        const newUrl = await uploadFile(watermarked, randomFilename("png"), "image/png");
        watermarkedUrls.push(newUrl);
      }
      resultUrls = watermarkedUrls;
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      compositedImageUrls: resultUrls,
      script: inputData.script,
      caption: inputData.caption,
    };
  },
});

const saveImageVersionStep = createStep({
  id: "save-image-version",
  description: "Save generated image as a content version",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    compositedImageUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    imageUrl: z.string(),
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
    const outputUrl = inputData.compositedImageUrls[0] ?? null;

    const [version] = await db
      .insert(contentVersions)
      .values({
        contentId: inputData.contentId,
        versionNumber,
        outputUrl,
        thumbnailUrl: outputUrl,
        metadata: {
          type: "image",
          caption: inputData.caption,
          script: inputData.script,
          ...(inputData.compositedImageUrls.length > 0 ? { images: inputData.compositedImageUrls } : {}),
        },
      })
      .returning();

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

    await db
      .update(contents)
      .set({ status: "ready" })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      versionId: version.id,
      imageUrl: outputUrl ?? "",
      script: inputData.script,
      caption: inputData.caption,
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
    script: z.string(),
    caption: z.string(),
  }),
})
  .then(enhanceImagePromptStep)
  .then(generateImageScriptStep)
  .then(reviewImageScriptStep)
  .then(generateImageStep)
  .then(compositeImageStep)
  .then(saveImageVersionStep);

generateImageWorkflow.commit();