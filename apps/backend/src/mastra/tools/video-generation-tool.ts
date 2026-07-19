import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";

export const videoGenerationTool = createTool({
  id: "video-generation",
  description: "Generate videos using the configured AI provider with avatar reference and camera direction",
  inputSchema: z.object({
    scenes: z.array(
      z.object({
        url: z.string(),
        description: z.string(),
        cameraDirection: z
          .object({
            shotType: z.string().optional(),
            movement: z.string().optional(),
            lighting: z.string().optional(),
            composition: z.string().optional(),
            style: z.string().optional(),
          })
          .optional(),
      }),
    ),
    storyboard: z.string().describe("Overall storyboard context"),
    avatarReferenceImage: z.string().optional().describe("Reference image URL for avatar consistency"),
    negativePrompt: z.string().optional().describe("Negative prompt"),
  }),
  outputSchema: z.object({
    videoUrls: z.array(z.string()),
  }),
  execute: async (ctx) => {
    const videoUrls = await getProviders().video.generate(
      ctx.context.scenes,
      ctx.context.storyboard,
      ctx.context.avatarReferenceImage,
    );
    return { videoUrls };
  },
});