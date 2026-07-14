import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";
import { db } from "../../db/index.js";
import { contents, contentVersions, mediaAssets } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const videoInputSchema = z.object({
  contentId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  platform: z.string(),
  aspectRatio: z.string().default("9:16"),
  sceneCount: z.number().default(3),
});

const generateVideoImagesStep = createStep({
  id: "generate-video-images",
  description: "Generate key frame images for video scenes",
  inputSchema: videoInputSchema,
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    scenes: z.array(
      z.object({
        url: z.string(),
        description: z.string(),
      }),
    ),
  }),
  execute: async ({ inputData }) => {
    const size = getImageSize(inputData.aspectRatio);
    const scenes: { url: string; description: string }[] = [];

    for (let i = 0; i < inputData.sceneCount; i++) {
      const scenePrompt = `${inputData.prompt}\n\nScene ${i + 1} of ${inputData.sceneCount}. ${
        i === 0
          ? "Opening scene — establish the setting with a wide shot"
          : i === inputData.sceneCount - 1
            ? "Final scene — climactic moment with dramatic framing"
            : "Middle scene — maintain narrative momentum"
      }`;

      const imageUrl = await getProviders().image.generate(scenePrompt, size);

      await db.insert(mediaAssets).values({
        userId: inputData.userId,
        contentId: inputData.contentId,
        type: "image",
        url: imageUrl,
        provider: process.env.AI_IMAGE_PROVIDER ?? "dashscope",
        metadata: { prompt: scenePrompt, size, scene: i + 1 },
      });

      scenes.push({
        url: imageUrl,
        description: `Scene ${i + 1}`,
      });
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      prompt: inputData.prompt,
      scenes,
    };
  },
});

const generateVideoClipsStep = createStep({
  id: "generate-video-clips",
  description: "Generate video clips from scene images",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    prompt: z.string(),
    scenes: z.array(
      z.object({
        url: z.string(),
        description: z.string(),
      }),
    ),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    videoUrls: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const storyboard = inputData.prompt;

    const videoUrls = await getProviders().video.generate(
      inputData.scenes,
      storyboard,
    );

    for (const videoUrl of videoUrls) {
      await db.insert(mediaAssets).values({
        userId: inputData.userId,
        contentId: inputData.contentId,
        type: "video",
        url: videoUrl,
        provider: process.env.AI_VIDEO_PROVIDER ?? "dashscope",
      });
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      videoUrls,
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
  }),
  outputSchema: z.object({
    contentId: z.string(),
    versionId: z.string(),
    videoUrls: z.array(z.string()),
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
        outputUrl: inputData.videoUrls[0] ?? null,
        metadata: { type: "video", videoUrls: inputData.videoUrls },
      })
      .returning();

    await db
      .update(contents)
      .set({ status: "ready" })
      .where(eq(contents.id, inputData.contentId));

    return {
      contentId: inputData.contentId,
      versionId: version.id,
      videoUrls: inputData.videoUrls,
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
  }),
})
  .then(generateVideoImagesStep)
  .then(generateVideoClipsStep)
  .then(saveVideoVersionStep);

generateVideoWorkflow.commit();
