import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { buildPromptContext } from "../../lib/prompts/prompt-builder.js";
import { renderAvatarForText, renderNoAvatarGuidance } from "../../lib/prompts/avatar-injector.js";
import { PLATFORM_STRATEGIES } from "../../lib/prompts/platform-strategies.js";
import { db } from "../../db/index.js";
import { contents, contentVersions } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type { Platform, ContentType } from "@faceless/shared";

const contentInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  contentType: z.enum(["image", "slide", "video", "text"]),
  platform: z.string(),
  prompt: z.string(),
  language: z.string().default("en"),
  avatarId: z.string().optional(),
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
  }),
  execute: async ({ inputData }) => {
    const context = await buildPromptContext(
      inputData.contentId,
      inputData.prompt,
      inputData.platform as Platform,
      inputData.contentType as ContentType,
      inputData.language,
      "9:16",
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
  }),
  execute: async ({ inputData }) => {
    const textProvider = getProviders().text;

    const isFaceless = !inputData.avatarContext || inputData.avatarContext.includes("no human figures");

    const systemPrompt = `You are a professional script writer for faceless social media content.
Generate an engaging script for a ${inputData.contentType} on ${inputData.platform}.
The script should hook the viewer in the first 3 seconds.

Platform: ${inputData.platform}
${inputData.platformGuidance}

${isFaceless ? "FACELESS MODE: No human figures or faces. Focus on environment, objects, typography, and abstract visuals." : `AVATAR MODE: Write in this character's voice:\n${inputData.avatarContext}`}

Language: ${inputData.language}

Output format: JSON with "hook", "body", "cta", "caption" (with hashtags), and "visual_prompt" (a detailed visual description for AI image/video generation).`;

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
    };
  },
});

const generateTextContentStep = createStep({
  id: "generate-text-content",
  description: "Save text-only content as a version",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
    platform: z.string(),
    prompt: z.string(),
    script: z.string(),
    caption: z.string(),
    enhancedPrompt: z.string().optional(),
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

    const [version] = await db
      .insert(contentVersions)
      .values({
        contentId: inputData.contentId,
        versionNumber,
        metadata: {
          type: "text",
          script: inputData.script,
          caption: inputData.caption,
          enhancedPrompt: inputData.enhancedPrompt,
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
  .then(generateTextContentStep);

generateContentWorkflow.commit();