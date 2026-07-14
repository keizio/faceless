import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";

export const dashscopeImageTool = createTool({
  id: "dashscope-image",
  description: "Generate images using DashScope (Wan) or OpenRouter",
  inputSchema: z.object({
    prompt: z.string().describe("Image generation prompt"),
    aspectRatio: z
      .enum(["9:16", "16:9", "1:1", "4:5"])
      .default("9:16")
      .describe("Target aspect ratio"),
  }),
  outputSchema: z.object({
    url: z.string().describe("URL of generated image"),
  }),
  execute: async (ctx) => {
    const size = getImageSize(ctx.context.aspectRatio);
    const url = await getProviders().image.generate(ctx.context.prompt, size);
    return { url };
  },
});
