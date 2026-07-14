import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getProviders } from "../../lib/providers/factory.js";
import { getImageSize } from "../../lib/providers/dashscope.js";

export const dashscopeImageTool = createTool({
  id: "dashscope-image",
  description: "Generate images using DashScope (Wan) or OpenRouter with enhanced prompt support",
  inputSchema: z.object({
    prompt: z.string().describe("Image generation prompt (can be enhanced with camera direction)"),
    aspectRatio: z
      .enum(["9:16", "16:9", "1:1", "4:5"])
      .default("9:16")
      .describe("Target aspect ratio"),
    negativePrompt: z.string().optional().describe("Negative prompt (what to avoid)"),
    qualityTags: z.array(z.string()).optional().describe("Quality boosters to append"),
  }),
  outputSchema: z.object({
    url: z.string().describe("URL of generated image"),
  }),
  execute: async (ctx) => {
    const size = getImageSize(ctx.context.aspectRatio);

    let prompt = ctx.context.prompt;
    if (ctx.context.qualityTags?.length) {
      prompt += `, ${ctx.context.qualityTags.join(", ")}`;
    }
    if (ctx.context.negativePrompt) {
      prompt += ` --neg ${ctx.context.negativePrompt}`;
    }

    const url = await getProviders().image.generate(prompt, size);
    return { url };
  },
});