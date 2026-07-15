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
import {
  renderChatTemplate,
  renderFactCardTemplate,
  renderQuoteCardTemplate,
  renderSplitScreenTemplate,
} from "../../lib/compositing/renderer.js";
import { uploadFile, randomFilename } from "../../lib/storage.js";

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

    const textProvider = getProviders().text;

    const isFaceless = !context.avatar;

    const baseSystemPrompt = `You are a visual prompt engineer. Transform a user's content idea into a detailed image generation prompt.

Platform: ${inputData.platform}
${isFaceless ? "FACELESS MODE: Generate content with NO human figures, NO faces. Focus on environment, objects, typography, and abstract visuals." : `AVATAR MODE: Include the character in the visual description. Avatar: ${context.avatar!.name}, ${context.avatar!.age ?? ""} years old, ${context.avatar!.gender ?? ""}, speech style: ${context.avatar!.speechStyle ?? "neutral"}.`}

Output format: JSON with {
  "visualPrompt": string (rich visual description 200-400 words),
  "cameraDirection": {
    "shotType": "close-up" | "medium-shot" | "wide-shot" | "establishing-shot" | "pov" | "over-the-shoulder" | "dutch-angle" | "aerial",
    "movement"?: "static" | "pan" | "tilt" | "zoom" | "tracking" | "dolly" | "handheld" | "drone",
    "lighting": "natural" | "golden-hour" | "studio" | "neon" | "low-key" | "high-key" | "backlit" | "rim-light" | "cinematic" | "soft-diffused",
    "composition"?: "rule-of-thirds" | "center-frame" | "leading-lines" | "symmetry" | "negative-space" | "depth-of-field-shallow",
    "style"?: "cinematic" | "documentary" | "social-media-native" | "stop-motion" | "timelapse" | "macro"
  },
  "qualityTags": string[]
}`;

    const systemPrompt = inputData.templateSystemPrompt
      ? `${inputData.templateSystemPrompt}\n\n${inputData.templateVisualGuidance ? `Visual guidance: ${inputData.templateVisualGuidance}` : ""}\n\nPlatform: ${inputData.platform}\n${isFaceless ? "FACELESS MODE: NO human figures, NO faces." : `AVATAR MODE: Character: ${context.avatar!.name}.`}\n\nOutput format: JSON with {\n  "visualPrompt": string (rich visual description 200-400 words),\n  "cameraDirection": { "shotType": string, "movement"?: string, "lighting": string, "composition"?: string, "style"?: string },\n  "qualityTags": string[]\n}`
      : baseSystemPrompt;

    const result = await textProvider.generate({
      system: systemPrompt,
      prompt: `Create a visual image generation prompt for ${inputData.platform}, aspect ratio ${inputData.aspectRatio}, about: ${inputData.prompt}`,
      temperature: 0.7,
    });

    let enhanced: EnhancedPrompt;
    try {
      const parsed = JSON.parse(result);
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
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
  }),
  execute: async ({ inputData }) => {
    const textProvider = getProviders().text;
    const strategy = PLATFORM_STRATEGIES[inputData.platform as Platform] ?? PLATFORM_STRATEGIES.generic;

    const isFaceless = inputData.isFaceless;
    const avatarContext = inputData.avatarContext ?? "";

    const baseSystemPrompt = `You are a professional social media caption writer for faceless content.
Generate an engaging caption for a ${inputData.platform} image post.

Platform: ${inputData.platform}
${strategy.visualStyleGuidance}

${isFaceless ? "FACELESS MODE: No human figures or faces. Focus on the visual theme." : `AVATAR MODE: Write in this character's voice:\n${avatarContext}`}

Language: ${inputData.language}

Output format: JSON with "hook", "body", "cta", "caption" (with hashtags).

CRITICAL: Never include fake social media statistics, follower counts, like counts, or social media account handles (@username, @handle) in the caption or script. Never include slide numbers or scene numbering in the visual description.`;

    const systemPrompt = inputData.templateSystemPrompt
      ? `${inputData.templateSystemPrompt}\n\nLanguage: ${inputData.language}\n\nOutput format: JSON with "hook", "body", "cta", "caption" (with hashtags).\n\nCRITICAL: Never include fake social media statistics, follower counts, like counts, or social media account handles (@username, @handle) in the caption or script.`
      : baseSystemPrompt;

    const scriptResult = await textProvider.generate({
      system: systemPrompt,
      prompt: `Write a social media caption for this image post about: ${inputData.prompt}`,
      temperature: 0.8,
    });

    let script = scriptResult;
    let caption = "";

    try {
      const parsed = JSON.parse(scriptResult);
      script = `${parsed.hook}\n\n${parsed.body}\n\n${parsed.cta}`;
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
      promptMetadata: inputData.promptMetadata,
      script,
      caption,
      templateId: inputData.templateId,
      templateInputs: inputData.templateInputs,
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
    promptMetadata: z.any(),
    script: z.string(),
    caption: z.string(),
    templateId: z.string().optional(),
    templateInputs: z.record(z.unknown()).optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    imageUrls: z.array(z.string()),
    script: z.string(),
    caption: z.string(),
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
      await db.insert(mediaAssets).values({
        userId: inputData.userId,
        contentId: inputData.contentId,
        type: "image",
        url: leftUrl,
        provider: process.env.AI_IMAGE_PROVIDER ?? "dashscope",
        metadata: { panel: "left", prompt: leftDescription, size, ...inputData.promptMetadata },
      });
      imageUrls.push(leftUrl);

      const rightUrl = await getProviders().image.generate(rightDescription, size, undefined, { negativePrompt, qualityTags });
      await db.insert(mediaAssets).values({
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

      await db.insert(mediaAssets).values({
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

    if (!templateId || !templateInputs) {
      return {
        contentId: inputData.contentId,
        userId: inputData.userId,
        compositedImageUrls: imageUrls,
        script: inputData.script,
        caption: inputData.caption,
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

      default:
        return {
          contentId: inputData.contentId,
          userId: inputData.userId,
          compositedImageUrls: imageUrls,
          script: inputData.script,
          caption: inputData.caption,
        };
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      compositedImageUrls: compositedUrls,
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
      await db.insert(mediaAssets).values({
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
  .then(generateImageStep)
  .then(compositeImageStep)
  .then(saveImageVersionStep);

generateImageWorkflow.commit();