import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  renderChatTemplate,
  renderFactCardTemplate,
  renderQuoteCardTemplate,
  renderSplitScreenTemplate,
  renderListicleCardTemplate,
} from "../../../lib/compositing/renderer.js";
import { uploadFile, randomFilename } from "../../../lib/storage.js";

async function downloadImageAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export const compositeStep = createStep({
  id: "composite-template",
  description: "Post-generation compositing for template-based content",
  inputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    templateId: z.string(),
    templateInputs: z.record(z.unknown()),
    aspectRatio: z.string(),
    generatedImageUrls: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    contentId: z.string(),
    userId: z.string(),
    compositedImageUrls: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { templateId, templateInputs, aspectRatio, generatedImageUrls } = inputData;
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
        if (generatedImageUrls && generatedImageUrls.length > 0) {
          bgBuffer = await downloadImageAsBuffer(generatedImageUrls[0]);
        }
        const buffer = await renderFactCardTemplate(templateInputs, aspectRatio, bgBuffer);
        const url = await uploadFile(buffer, randomFilename("png"), "image/png");
        compositedUrls.push(url);
        break;
      }

      case "quote-card": {
        let bgBuffer: Buffer | undefined;
        if (generatedImageUrls && generatedImageUrls.length > 0) {
          bgBuffer = await downloadImageAsBuffer(generatedImageUrls[0]);
        }
        const buffer = await renderQuoteCardTemplate(templateInputs, aspectRatio, bgBuffer);
        const url = await uploadFile(buffer, randomFilename("png"), "image/png");
        compositedUrls.push(url);
        break;
      }

      case "split-screen": {
        if (!generatedImageUrls || generatedImageUrls.length < 2) {
          throw new Error("Split screen template requires 2 generated images");
        }
        const leftBuffer = await downloadImageAsBuffer(generatedImageUrls[0]);
        const rightBuffer = await downloadImageAsBuffer(generatedImageUrls[1]);
        const buffer = await renderSplitScreenTemplate(templateInputs, aspectRatio, leftBuffer, rightBuffer);
        const url = await uploadFile(buffer, randomFilename("png"), "image/png");
        compositedUrls.push(url);
        break;
      }

      case "listicle": {
        const items = (templateInputs.items as string[]) ?? [];
        const itemCount = (templateInputs.itemCount as number) ?? items.length ?? 5;
        const topic = (templateInputs.topic as string) ?? "";

        for (let i = 0; i < itemCount; i++) {
          const itemTitle = items[i] ?? `Item ${i + 1}`;
          const itemDescription = `Description for ${itemTitle}`;
          const bgBuffer = generatedImageUrls?.[i]
            ? await downloadImageAsBuffer(generatedImageUrls[i])
            : undefined;
          const buffer = await renderListicleCardTemplate(
            templateInputs,
            aspectRatio,
            i + 1,
            itemTitle,
            itemDescription,
            itemCount,
            bgBuffer,
          );
          const url = await uploadFile(buffer, randomFilename("png"), "image/png");
          compositedUrls.push(url);
        }
        break;
      }

      default:
        throw new Error(`No composite renderer for template: ${templateId}`);
    }

    return {
      contentId: inputData.contentId,
      userId: inputData.userId,
      compositedImageUrls: compositedUrls,
    };
  },
});
