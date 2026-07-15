import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import { buildPromptContext, assembleFinalPrompt } from "../../lib/prompts/prompt-builder.js";
import { getNegativePrompt } from "../../lib/prompts/negative-prompts.js";
import { renderAvatarForText, renderNoAvatarGuidance } from "../../lib/prompts/avatar-injector.js";
import { PLATFORM_STRATEGIES } from "../../lib/prompts/platform-strategies.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type { Platform, ContentType } from "@faceless/shared";
import type { EnhancedPrompt } from "../../lib/prompts/types.js";

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
    platformGuidance: z.string(),
    slideCount: z.number().optional(),
    aspectRatio: z.string(),
    templateSystemPrompt: z.string().optional(),
    templateVisualGuidance: z.string().optional(),
    templateNegativeAdditions: z.array(z.string()).optional(),
    templateScriptStructure: z.string().optional(),
    templateNarrationGuidance: z.string().optional(),
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

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      contentType: inputData.contentType,
      platform: inputData.platform,
      prompt: inputData.prompt,
      language: inputData.language,
      avatarContext,
      platformGuidance: strategy.visualStyleGuidance,
      slideCount: inputData.slideCount,
      aspectRatio: inputData.aspectRatio,
      templateSystemPrompt: inputData.templateSystemPrompt,
      templateVisualGuidance: inputData.templateVisualGuidance,
      templateNegativeAdditions: inputData.templateNegativeAdditions,
      templateScriptStructure: inputData.templateScriptStructure,
      templateNarrationGuidance: inputData.templateNarrationGuidance,
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
    platformGuidance: z.string(),
    slideCount: z.number().optional(),
    aspectRatio: z.string(),
    templateSystemPrompt: z.string().optional(),
    templateVisualGuidance: z.string().optional(),
    templateNegativeAdditions: z.array(z.string()).optional(),
    templateScriptStructure: z.string().optional(),
    templateNarrationGuidance: z.string().optional(),
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
    slideCount: z.number().optional(),
    aspectRatio: z.string(),
  }),
  execute: async ({ inputData }) => {
    const textProvider = getProviders().text;

    const isFaceless = !inputData.avatarContext || inputData.avatarContext.includes("no human figures");

    const baseSystemPrompt = `You are a professional script writer for faceless social media content.
Generate an engaging script for a ${inputData.contentType} on ${inputData.platform}.
The script should hook the viewer in the first 3 seconds.

Platform: ${inputData.platform}
${inputData.platformGuidance}

${isFaceless ? "FACELESS MODE: No human figures or faces. Focus on environment, objects, typography, and abstract visuals." : `AVATAR MODE: Write in this character's voice:\n${inputData.avatarContext}`}

Language: ${inputData.language}

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
      slideCount: inputData.slideCount,
      aspectRatio: inputData.aspectRatio,
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
    slideCount: z.number().optional(),
    aspectRatio: z.string(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    script: z.string(),
    caption: z.string(),
    imageUrls: z.array(z.string()),
    contentType: z.enum(["image", "slide", "video", "text"]),
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
      };
    }

    const slideCount = inputData.slideCount ?? 3;
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
    imageUrls: z.array(z.string()),
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
    });

    const versionNumber = existingVersions.length + 1;

    const isText = inputData.contentType === "text";

    const [version] = await db
      .insert(contentVersions)
      .values({
        contentId: inputData.contentId,
        versionNumber,
        outputUrl: inputData.imageUrls[0] ?? null,
        thumbnailUrl: inputData.imageUrls[0] ?? null,
        metadata: {
          type: inputData.contentType,
          script: inputData.script,
          caption: inputData.caption,
          ...(inputData.imageUrls.length > 0 ? { images: inputData.imageUrls } : {}),
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
  .then(saveSlideVersionStep);

generateContentWorkflow.commit();