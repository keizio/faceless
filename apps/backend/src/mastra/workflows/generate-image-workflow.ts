import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const imageInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  platform: z.string(),
  aspectRatio: z.string().default("9:16"),
});

const generateImageStep = createStep({
  id: "generate-image",
  description: "Generate a single AI image from prompt",
  inputSchema: imageInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    imageUrl: z.string(),
  }),
  execute: async ({ inputData }) => {
    const size = getImageSize(inputData.aspectRatio);
    const imageUrl = await getProviders().image.generate(inputData.prompt, size);

    await db.insert(mediaAssets).values({
      userId: inputData.userId,
      contentId: inputData.contentId,
      type: "image",
      url: imageUrl,
      provider: process.env.AI_IMAGE_PROVIDER ?? "dashscope",
      metadata: { prompt: inputData.prompt, size },
    });

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      imageUrl,
    };
  },
});

const saveImageVersionStep = createStep({
  id: "save-image-version",
  description: "Save generated image as a content version",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    imageUrl: z.string(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    imageUrl: z.string(),
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
        outputUrl: inputData.imageUrl,
        thumbnailUrl: inputData.imageUrl,
        metadata: { type: "image" },
      })
      .returning();

    await db
      .update(contents)
      .set({ status: "ready" })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      versionId: version.id,
      imageUrl: inputData.imageUrl,
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
  }),
})
  .then(generateImageStep)
  .then(saveImageVersionStep);

generateImageWorkflow.commit();
