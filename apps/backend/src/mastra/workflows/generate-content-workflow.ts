import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { db } from "../../db/index.js";
import { contents, contentVersions } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const contentInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  contentType: z.enum(["image", "slide", "video", "text"]),
  platform: z.string(),
  prompt: z.string(),
});

const generateScriptStep = createStep({
  id: "generate-script",
  description: "Generate script/caption from prompt",
  inputSchema: contentInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    contentType: z.enum(["image", "slide", "video", "text"]),
    platform: z.string(),
    prompt: z.string(),
    script: z.string(),
    caption: z.string(),
  }),
  execute: async ({ inputData }) => {
    const textProvider = getProviders().text;

    const scriptResult = await textProvider.generate({
      system: `You are a professional script writer for faceless social media content.
Generate an engaging script for a ${inputData.contentType} on ${inputData.platform}.
The script should hook the viewer in the first 3 seconds.
Output format: JSON with "hook", "body", "cta", and "caption" (with hashtags).`,
      prompt: `Create a ${inputData.contentType} script for ${inputData.platform} about: ${inputData.prompt}`,
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
      .set({ script })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      contentType: inputData.contentType,
      platform: inputData.platform,
      prompt: inputData.prompt,
      script,
      caption,
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
  .then(generateScriptStep)
  .then(generateTextContentStep);

generateContentWorkflow.commit();
