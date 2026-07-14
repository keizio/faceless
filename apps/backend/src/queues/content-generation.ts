import { generationQueue } from "../lib/queue.js";
import type { GenerationJobPayload } from "../lib/queue.js";

export async function enqueueContentGeneration(
  data: Omit<GenerationJobPayload, "type">,
) {
  await generationQueue.add("content-generation", {
    ...data,
    type: "content-generation",
  });
}
