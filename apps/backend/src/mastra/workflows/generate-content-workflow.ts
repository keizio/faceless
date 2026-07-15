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

const generateScriptStep = createStep({
  id: "generate-script",
  description: "Generate script/caption from prompt with avatar and platform context",
  inputSchema: z.object({
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
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
    platform: z.string(),
    prompt: z.string(),
    script: z.string(),
    caption: z.string(),
    enhancedPrompt: z.string().optional(),
    brandKitJson: z.string().optional(),
    slideCount: z.number().optional(),
    aspectRatio: z.string(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
  }),
  execute: async ({ inputData }) => {
    const textProvider = getProviders().text;

    const isFaceless = !inputData.avatarContext || inputData.avatarContext.includes("no human figures");

    const brandSection = inputData.brandKitGuidance ? `\n\nBrand identity:\n${inputData.brandKitGuidance}\n\nIncorporate the brand identity naturally into the content.` : "";

    const baseSystemPrompt = `You are a professional script writer for faceless social media content.
Generate an engaging script for a ${inputData.contentType} on ${inputData.platform}.
The script should hook the viewer in the first 3 seconds.

Platform: ${inputData.platform}
${inputData.platformGuidance}

${isFaceless ? "FACELESS MODE: No human figures or faces. Focus on environment, objects, typography, and abstract visuals." : `AVATAR MODE: Write in this character's voice:\n${inputData.avatarContext}`}

Language: ${inputData.language}
${brandSection}
Output format: JSON with "hook", "body", "cta", "caption" (with hashtags), and "visual_prompt" (a detailed visual description for AI image/video generation).

CRITICAL: Never include fake social media statistics, follower counts, like counts, or social media account handles (@username, @handle) in the caption or script. Never include slide numbers or scene numbering in the visual description.`;

    const systemPrompt = inputData.templateSystemPrompt
      ? `${inputData.templateSystemPrompt}\n\n${inputData.templateScriptStructure ? `Script structure: ${inputData.templateScriptStructure}` : ""}\n\nLanguage: ${inputData.language}\n\nOutput format: JSON with "hook", "body", "cta", "caption" (with hashtags), and "visual_prompt" (a detailed visual description for AI image/video generation).\n\nCRITICAL: Never include fake social media statistics, follower counts, like counts, or social media account handles (@username, @handle) in the caption or script. Never include slide numbers or scene numbering in the visual description.`
      : baseSystemPrompt;

    const scriptResult = await textProvider.generate({
      system: systemPrompt,
      prompt: `Create a ${inputData.contentType} script for ${inputData.platform} about: ${inputData.prompt}`,
      temperature: 0.8,
    });

    let script = scriptResult;
    let caption = "";
    let enhancedPrompt = "";

    try {
      const parsed = JSON.parse(scriptResult);
      script = `${parsed.hook}\n\n${parsed.body}\n\n${parsed.cta}`;
      caption = parsed.caption ?? "";
      enhancedPrompt = parsed.visual_prompt ?? "";
    } catch {
      script = scriptResult;
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

const generateSlideImagesStep = createStep({
  id: "generate-slide-images",
  description: "Generate multiple images for slide carousel content",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
    platform: z.string(),
    prompt: z.string(),
    script: z.string(),
    caption: z.string(),
    enhancedPrompt: z.string().optional(),
    brandKitJson: z.string().optional(),
    slideCount: z.number().optional(),
    aspectRatio: z.string(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
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

      await db.insert(mediaAssets).values({
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
        await db.insert(mediaAssets).values({
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
  .then(generateSlideImagesStep)
  .then(compositeSlideStep)
  .then(saveSlideVersionStep);

generateContentWorkflow.commit();