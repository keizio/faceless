import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";

export const dashscopeVideoTool = createTool({
  id: "dashscope-video",
  description: "Generate videos using DashScope (HappyHorse) or OpenRouter",
  inputSchema: z.object({
    scenes: z.array(
      z.object({
        url: z.string(),
        description: z.string(),
      }),
    ),
    storyboard: z.string().describe("Overall storyboard context"),
  }),
  outputSchema: z.object({
    videoUrls: z.array(z.string()),
  }),
  execute: async (ctx) => {
    const videoUrls = await getProviders().video.generate(
      ctx.context.scenes,
      ctx.context.storyboard,
    );
    return { videoUrls };
  },
});
